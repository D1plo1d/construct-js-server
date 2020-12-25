use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

use super::ComponentInner;
use super::HeaterEphemeral;

/// # Build Platform
#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BuildPlatformConfig {
    /// # Name
    // TODO: validate: #[schemars(min_length = 1)]
    pub name: String,

    /// # GCode Address
    // TODO: validate: #[schemars(min_length = 1)]
    pub address: String,

    /// # Heated Build Platform
    pub heater: bool,
}

pub type BuildPlatform = ComponentInner<BuildPlatformConfig, HeaterEphemeral>;