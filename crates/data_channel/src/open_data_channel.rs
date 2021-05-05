use std::{pin::Pin, sync::{Arc, atomic::{ AtomicU64, Ordering }}};
use eyre::{
    eyre,
    Result,
    // Context as _,
};
use async_std::task::block_on;
use datachannel::{
    RtcConfig,
    ConnectionState,
    DataChannelHandler,
    GatheringState,
    IceCandidate,
    PeerConnectionHandler,
    RtcDataChannel,
    RtcPeerConnection,
    SessionDescription
};
use futures_util::{
    future,
    future::Future,
    FutureExt,
    stream::{
        Stream,
        StreamExt,
        TryStreamExt,
    },
};
use teg_auth::Signal;

use crate::saltyrtc_chunk::InMemoryMessage;

static NEXT_ID: AtomicU64 = AtomicU64::new(0);

// Enable verbose per-chunk performance logging - not enabled by default because measuring
// performance on every chunk received could itself lead to performance problems.
const LOG_CHUNK_TIMINGS: bool = false;

#[derive(Clone)]
pub struct GraphQLChannel {
    output: async_std::channel::Sender<Vec<u8>>,
}


impl DataChannelHandler for GraphQLChannel {
    // fn on_open(&mut self) {
    //     if let Channel::Outgoing(channel) = self {
    //         let ready = channel.ready.clone();
    //         block_on(|| async {
    //             ready.send(()).await
    //         });
    //     }
    // }

    fn on_message(&mut self, msg: &[u8]) {
        // trace!("Received {:?}", msg);
        let start = if LOG_CHUNK_TIMINGS {
            Some(std::time::Instant::now())
        } else {
            None
        };

        let msg = msg.to_vec();
        let length = msg.len();
        let output = self.output.clone();
        block_on(async move {
            output.send(msg)
                .await
                .expect("Unable to receive DataChannel message");
        });

        if let Some(start) = start {
            let elapsed = start.elapsed();
            info!(
                "Processed {:.1} KB message in: {:?} ({:.1} MB/s)",
                length as f32 / 1024f32,
                elapsed,
                (length as f32 / elapsed.as_secs_f32()) / (1024f32 * 1024f32),
            );
        }
    }
}

pub struct Conn {
    id: u64,
    sdp_answer_sender: async_std::channel::Sender<SessionDescription>,
    ice_candidate_sender: Option<async_std::channel::Sender<IceCandidate>>,
    data_channel_sender: async_std::channel::Sender<Box<RtcDataChannel<GraphQLChannel>>>,
    dc: GraphQLChannel,
}

impl PeerConnectionHandler for Conn {
    type DCH = GraphQLChannel;

    fn on_description(&mut self, sess_desc: SessionDescription) {
        let sdp_answer_sender = self.sdp_answer_sender.clone();
        block_on(async move {
            sdp_answer_sender
                .send(sess_desc)
                .await
                .expect("Unable to send SDP Answer")
        });
    }

    fn on_candidate(&mut self, cand: IceCandidate) {
        trace!("Candidate {}: {} {}", self.id, &cand.candidate, &cand.mid);

        let ice_candidate_sender = if let
            Some(sender) = &self.ice_candidate_sender
        {
            sender.clone()
        } else {
            warn!("Ice Candidate received after gathering ended: {:?}", cand);
            return
        };

        block_on(async move {
            ice_candidate_sender
                .send(cand)
                .await
                .expect("Unable to send SDP Answer")
        });
    }

    fn on_connection_state_change(&mut self, state: ConnectionState) {
        trace!("State {}: {:?}", self.id, state);
    }

    fn on_gathering_state_change(&mut self, state: GatheringState) {
        trace!("Gathering state {}: {:?}", self.id, state);
        if let GatheringState::Complete = state {
            // drop the ice candidate sender once the ice candidates have been gathered
            self.ice_candidate_sender = None;
        }
    }

    fn on_data_channel(&mut self, dc: Box<RtcDataChannel<GraphQLChannel>>) {
        trace!(
            "Channel {} Received Datachannel with: label={}, protocol={:?}, reliability={:?}",
            self.id,
            dc.label(),
            dc.protocol(),
            dc.reliability()
        );

        block_on(
            self.data_channel_sender.send(dc),
        )
            .expect("Unable to send data channel");
    }

    fn data_channel_handler(&mut self) -> Self::DCH {
        self.dc.clone()
    }
}

pub async fn open_data_channel<F, Fut, S>(
    signal: Signal,
    // remote_description: SessionDescription,
    // signalling_user_id: String,
    handle_data_channel: Arc<F>,
) -> Result<(
    u64,
    Box<RtcPeerConnection<Conn>>,
    SessionDescription,
    impl Stream<Item = IceCandidate>,
)>
where
    F: Fn(
        Signal,
        Pin<Box<dyn Stream<Item = InMemoryMessage> + 'static + Send + Send>>,
    ) -> Fut + Send + Sync + 'static,
    Fut: Future<Output = Result<S>> + Send + 'static,
    S: Stream<Item = Vec<u8>> + Send + 'static,
{
    use crate::saltyrtc_chunk::{
        ReliabilityMode,
        ChunkDecoder,
        ChunkEncoder,
    };

    let id = NEXT_ID.fetch_add(1, Ordering::SeqCst);
    let mode = ReliabilityMode::UnreliableUnordered;

    let ice_servers: Vec<String> = signal.ice_servers
        .iter()
        .map(|ice_server| {
            ice_server.urls.iter().map(move |url| {
                let url = match (&ice_server.username, &ice_server.credential) {
                    (Some(username), Some(credential)) => {
                       url.replacen(":", &format!(":{}:{}@", username, credential), 1)
                    },
                    (Some(username), None) => {
                        url.replacen(":", &format!(":{}@", username), 1)
                     },
                     (None, None) => {
                        url.clone()
                     },
                     _ => Err(eyre!("credential received without username"))?,
                 };
                 Ok(url)
            })
        })
        .flatten()
        .collect::<Result<_>>()?;

    // let ice_servers = vec![
    //     "stun:stun.l.google.com:19302".to_string(),
    //     "stun:global.stun.twilio.com:3478?transport=udp".to_string(),
    // ];
    debug!("ice servers: {:?}", ice_servers);

    let conf = RtcConfig::new(&ice_servers[..]);

    let (
        sdp_answer_sender,
        mut sdp_answer_receiver,
    ) = async_std::channel::unbounded::<SessionDescription>();

    let (
        ice_candidate_sender,
        ice_candidate_receiver,
    ) = async_std::channel::unbounded::<IceCandidate>();

    let (
        dc_output_sender,
        dc_output_receiver,
    ) = async_std::channel::unbounded::<Vec<u8>>();

    let (
        data_channel_sender,
        mut data_channel_receiver,
    ) = async_std::channel::unbounded::<Box<RtcDataChannel<GraphQLChannel>>>();

    let dc_output_receiver = ChunkDecoder::new(mode)
        .decode_stream(dc_output_receiver)
        .inspect_err(|err| {
            error!("Datachannel Cunk Decoding Error: {:?}", err);
        })
        .take_while(|result| {
            future::ready(result.is_ok())
        })
        .filter_map(|result| async move {
            result.ok()
        });

    let dc = GraphQLChannel {
        output: dc_output_sender,
    };
    let conn = Conn {
        id,
        sdp_answer_sender,
        ice_candidate_sender: Some(ice_candidate_sender),
        data_channel_sender,
        dc,
    };

    // let channel = Channel::Outgoing(OutgoingChannel {
    //     output: dc_output_sender,
    // });

    let mut pc = RtcPeerConnection::new(
        &conf,
        conn,
    )?;

    pc.set_remote_description(&signal.offer)?;

    // let mut dc = pc.create_data_channel("graphql", channel)?;

    // Run the datachannel in a detached task
    async_std::task::Builder::new()
        .name(format!("data_channel_{}", id))
        .spawn(async move {
            let mut dc = data_channel_receiver
                .next()
                .await
                .ok_or_else(|| eyre!("Datachannel recevier closed before connection"))?;

            let dc_input_msgs = handle_data_channel(
                signal,
                Box::pin(dc_output_receiver)
            )
                .await?;

            let mut dc_input_chunks = ChunkEncoder::new(mode)
                .encode_stream(dc_input_msgs)
                .boxed();

            while let Some(msg) = dc_input_chunks.next().await {
                if let Err(err) = dc.send(&msg) {
                    error!("Data Channel {} Exited with Error: {:?}", id, err)
                }
            }

            warn!("Data channel stream ended");
            eyre::Result::<()>::Ok(())
        }.then(|result| {
            if let Err(err) = result {
                warn!("Data Channel task error: {:?}", err);
            };
            future::pending::<()>()
        }))?;

    let sdp_answer = sdp_answer_receiver.next()
        .await
        .ok_or_else(|| eyre!("SDP answer not received"))?;

    Ok((
        id,
        pc,
        sdp_answer,
        ice_candidate_receiver,
    ))
}
