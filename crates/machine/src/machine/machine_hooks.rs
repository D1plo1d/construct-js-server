use eyre::{
    // eyre,
    Result,
    // Context as _,
};

use crate::config::MachineConfig;

#[async_trait::async_trait]
pub trait MachineHooks {
    async fn before_create<'c>(
        &self,
        tx: &mut sqlx::Transaction<'c, sqlx::Sqlite>,
        machine_config: &mut MachineConfig,
    ) -> Result<()>;
}
