use serde::{Serialize, Deserialize};

fn default_serial_port_id() -> String {
    "/dev/null/no-serial-port".to_string()
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Controller {
    #[serde(rename = "serialPortID", default = "default_serial_port_id")]
    pub serial_port_id: String,

    automatic_baud_rate_detection: bool,
    pub baud_rate: u32,

    pub simulate: bool,
    pub await_greeting_from_firmware: bool,

    // delays
    pub delay_from_greeting_to_ready: u64,
    pub polling_interval: u64,
    pub fast_code_timeout: u64,
    pub long_running_code_timeout: u64,

    pub response_timeout_tickle_attempts: u32,
    pub long_running_codes: Vec<String>,
    pub checksum_tickles: bool,
}


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "model")]
pub enum Component {
    #[serde(rename = "CONTROLLER")]
    Controller(Controller),
    #[serde(rename = "AXIS", rename_all = "camelCase")]
    Axis {
        address: String,
    },
    #[serde(rename = "TOOLHEAD", rename_all = "camelCase")]
    Toolhead {
        address: String,
        heater: bool,
    },
    #[serde(rename = "FAN", rename_all = "camelCase")]
    Fan {
        address: String,
    },
    #[serde(rename = "BUILD_PLATFORM", rename_all = "camelCase")]
    BuildPlatform {
        address: String,
        heater: bool,
    }
}
