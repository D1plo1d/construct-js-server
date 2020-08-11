use std::sync::Arc;
use futures::prelude::*;
// use std::collections::HashMap;
use async_graphql::*;
use serde::{Deserialize, Serialize};
use anyhow::{
    anyhow,
    Context as _,
};

use crate::models::VersionedModel;
use crate::{
    Machine,
    // MachineStatus,
    print_queue::macros::AnyMacro,
    print_queue::macros::{
        compile_macros,
        AnnotatedGCode,
    },
};
use super::*;

#[InputObject]
struct ExecGCodesInput {
    #[field(name="machineID")]
    machine_config_id: ID,

    /// If true blocks the mutation until the GCodes have been spooled to the machine (default: false)
    ///
    /// This means that for example if you use execGCodes to run \`G1 X100\nM400\` the
    /// mutation will wait until the toolhead has moved 100mm and then return.
    ///
    /// This can be useful for informing users whether an action is in progress or
    /// completed.
    ///
    /// If the machine errors during the execution of a `sync = true` GCode the mutation will
    /// fail.
    sync: Option<bool>,

    /// If true allows this gcode to be sent during a print and inserted before the print gcodes. This can
    /// be used to override print settings such as extuder temperatures and fan speeds (default: false)

    /// override GCodes will not block. Cannot be used with sync = true.
    r#override: Option<bool>,

    /// Teg supports 3 formats of GCode:
    ///
    /// 1. Standard GCode Strings
    /// eg. \`gcodes: ["G1 X10", "G1 Y20"]\`
    /// and equivalently:
    /// \`gcodes: ["G1 X0\nG1 Y0"]\`
    /// 2. JSON GCode Objects - To make constructing GCode easier with modern languages Teg allows GCodes to be sent as JSON objects in the format { [GCODE|MACRO]: ARGS }.
    /// eg. \`gcodes: [{ g1: { x: 10 } }, { g1: { y: 20 } }]\`
    /// Macros can also be called using JSON GCode Objects.
    /// eg. \`gcodes: [{ g1: { x: 10 } }, { delay: { period: 5000 } }]\`
    /// 3. JSON GCode Strings - Teg allows GCodes to be serialized as JSON. JSON GCode Strings can also be Macro calls.
    /// GCode: \`gcodes: ["{ \"g1\": { \"x\": 10 } }", "{ \"delay\": { \"period\": 5000 } }"]\`
    gcodes: Vec<Json<GCodeLine>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(untagged)]
enum GCodeLine {
    String(String),
    Json(AnyMacro),
}

pub struct ExecGCodesMutation;

#[Object]
impl ExecGCodesMutation {
    /// Spools and executes GCode outside of the job queue.
    ///
    /// See ExecGCodesInput.gcodes for GCode formatting options.
    #[field(name="execGCodes")]
    async fn exec_gcodes<'ctx>(
        &self,
        ctx: &'ctx Context<'_>,
        input: ExecGCodesInput,
    ) -> FieldResult<Task> {
        let ctx: &Arc<crate::Context> = ctx.data()?;
        let machine_override = input.r#override.unwrap_or(false);

        let machine = Machine::find(&ctx.db, |m| {
            m.config_id == input.machine_config_id
        })
            .await
            .with_context(|| format!("No machine found for ID: {:?}", input.machine_config_id))?;

        // Normalize the JSON HashMaps into strings. Later JSON lines will be deserialized
        // the specific macro's input.
        let gcodes: Vec<String> = input.gcodes
            .iter()
            .flat_map(|line| {
                match &line.0 {
                    GCodeLine::String(lines) => {
                        // Split newlines
                        lines.split('\n')
                            .map(|line| Ok(line.to_string()))
                            .collect()
                    },
                    GCodeLine::Json(any_macro) => {
                        let result = serde_json::to_string(any_macro)
                            .with_context(|| "Unable to serialize execGCodes json gcode");

                        vec![result]
                    },
                }
            })
            .collect::<anyhow::Result<_>>()?;

        // Add annotations
        let annotated_gcodes = compile_macros(
            Arc::clone(ctx),
            gcodes,
        );

        let (gcodes, annotations) = annotated_gcodes
            .try_fold((vec![], vec![]), |mut acc, item| {
                let (gcodes, annotations) = &mut acc;

                match item {
                    AnnotatedGCode::GCode(gcode) => {
                        gcodes.push(gcode);
                    }
                    AnnotatedGCode::Annotation(annotation) => {
                        annotations.push(annotation);
                    }
                };

                future::ok(acc)
            })
            .await?;

        // Create the task
        let total_lines = gcodes.len() as u64;

        let mut task = Task::new(
            Task::generate_id(&ctx.db)?,
            machine.id,
            TaskContent::GCodes(gcodes),
            annotations,
            total_lines,
        );

        task.machine_override = machine_override;

        // TODO: Hol a lock that prevents other tasks from starting a print until this task is
        // added.
        if !machine.status.can_start_task(&task) {
            Err(anyhow!("Cannot start task when machine is: {:?}", machine.status))?;
        };

        let mut task = task.insert(&ctx.db).await?;

        // Sync Mode: Block until the task is settled
        if input.sync.unwrap_or(false) {
            let mut subscriber = task.watch(&ctx.db)?;
            loop {
                use sled::Event;
                use std::convert::TryInto;

                let event = (&mut subscriber).await;

                match event {
                    Some(Event::Insert{ value, .. }) => {
                        task = value.try_into()?;

                        if task.status.was_successful() {
                            return Ok(task)
                        } else if task.status.was_aborted() {
                            let err = task.error_message
                                .unwrap_or(format!("Task Aborted. Reason: {:?}", task.status));

                            return Err(anyhow!(err).into());
                        }
                    }
                    Some(Event::Remove { .. }) => {
                        Err(anyhow!("Task was deleted before it settled"))?;
                    }
                    None => {
                        Err(anyhow!("execGCodes subscriber unexpectedly ended"))?;
                    }
                }
            }
        };

        Ok(task)
    }
}