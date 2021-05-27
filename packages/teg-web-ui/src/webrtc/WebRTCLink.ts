import { ApolloLink, Operation, FetchResult, Observable, ApolloClientOptions } from '@apollo/client'
import { print, GraphQLError } from 'graphql'
import { createClient, Client } from 'graphql-ws/src/index.ts'

import WebRTCSocket from './WebRTCSocket'

export const INSECURE_LOCAL_CONNECTION = (
  process.env.INSECURE_LOCAL_CONNECTION === '1'
  // @ts-ignore
  && localStorage.getItem('INSECURE_LOCAL_CONNECTION') === '1'
)

// const randomisedExponentialBackoff = async (retries) => {
//   let retryDelay = 60_000; // start with 3s delay
//   for (let i = 0; i < retries; i++) {
//       retryDelay *= 2;
//   }
//   await new Promise((resolve) => setTimeout(resolve, retryDelay +
//       // add random timeout from 300ms to 3s
//       Math.floor(Math.random() * (3000 - 300) + 300)));
// }

export default class WebRTCLink extends ApolloLink {
  private client: Client
  // public closed: boolean = false

  public constructor(options?: any) {
    super()

    if (INSECURE_LOCAL_CONNECTION) {
      this.client = createClient({
        url: process.env.INSECURE_LOCAL_WS_URL,
        keepAlive: Number.MAX_SAFE_INTEGER,
      })
    } else {
      this.client = createClient({
        retryAttempts: Number.MAX_SAFE_INTEGER,
        lazy: false,
        onNonLazyError: (e) => console.log('Non-Lazy Error', e),
        // The URL is unused but it is required by ClientOptions
        url: 'webrtc://',
        // WebRTC connections are expensive to create
        keepAlive: Number.MAX_SAFE_INTEGER,
        // retryWait: randomisedExponentialBackoff,
        webSocketImpl: WebRTCSocket(options as any),
        sendMessage: (socket: any, message, files) => socket.sendMessageAndFiles(message, files)
      })
    }
    // this.client.on('connected', (socket, payload) => {
    //   console.log('connected?', { payload })
    // })
    // this.client.on('closed', (e) => {
    //   this.closed = true
    //   options.onClose?.(e)
    // })
  }

  request(operation: Operation): Observable<FetchResult> {
    const name = operation.operationName
    const logRequests = false
    if (logRequests && name) {
      console.log('REQUEST', name)
    }

    return new Observable((sink) => {
      return this.client.subscribe<FetchResult>(
        { ...operation, query: print(operation.query as any) },
        {
          next: (...args) => {
            // if (logRequests && name) {
            //   console.log('NEXT', name, ...args)
            // }
            return sink.next(...args)
          },
          complete: (...args) => {
            if (logRequests && name) {
              console.log('COMPLETE', name, ...args)
            }
            return sink.complete(...args)
          },
          error: (err) => {
            if (logRequests && name) {
              console.log('ERROR!', name)
            }
            if (err instanceof Error) {
              sink.error(err)
            } else if (err instanceof CloseEvent) {
              sink.error(
                new Error(
                  `Socket closed with event ${err.code}` + err.reason
                    ? `: ${err.reason}` // reason will be available on clean closes
                    : '',
                ),
              )
            } else {
              sink.error(
                new Error(
                  (err as GraphQLError[])
                    .map(({ message }) => message)
                    .join(', '),
                ),
              )
            }
          },
        },
      )
    })
  }
}
