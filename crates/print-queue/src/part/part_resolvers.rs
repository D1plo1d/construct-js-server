use async_graphql::{
    ID,
    FieldResult,
    Context,
};
use eyre::{
    // eyre,
    Result,
    // Context as _,
};
use teg_machine::task::Task;
use teg_json_store::{ Record as _, JsonRow };

use crate::{
    part::Part,
};


#[derive(async_graphql::InputObject, Debug)]
pub struct PartTasksInput {
    /// Include pending tasks in the result (default: true)
    #[graphql(default=true)]
    pending: bool,
    /// Include settled tasks in the result (default: false)
    #[graphql(default)]
    settled: bool,
}

impl Default for PartTasksInput {
    fn default() -> Self {
        Self {
            pending: true,
            settled: false,
        }
    }
}

#[async_graphql::Object]
impl Part {
    async fn id(&self) -> ID { (&self.id).into() }
    async fn name(&self) -> &String { &self.name }
    async fn quantity(&self) -> i32 { self.quantity }
    async fn position(&self) -> u64 { self.position }

    /// The number of prints running or paused. Specifically this counts the tasks with a status of
    /// spooled, started, or paused.
    async fn prints_in_progress<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<i32> {
        let db: &crate::Db = ctx.data()?;

        Self::query_prints_in_progress(
            db,
            &self.id,
        false,
        )
            .await
            .map_err(|err| {
                warn!("{:?}", err);
                err.into()
            })
    }

    /// The number of prints that have finished printing successfully.
    async fn prints_completed<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<i32> {
        let db: &crate::Db = ctx.data()?;

        Self::query_prints_completed(db, &self.id)
            .await
            .map_err(|err| {
                warn!("{:?}", err);
                err.into()
            })
    }

    /// The quantity of this part times the quantity of it's containing package.
    async fn total_prints_<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<i64> {
        let db: &crate::Db = ctx.data()?;

        Self::query_total_prints(db, &self.id)
            .await
            .map_err(|err| {
                warn!("{:?}", err);
                err.into()
            })
    }

    #[graphql(name="startedFinalPrint")]
    async fn started_final_print_<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<bool> {
        let db: &crate::Db = ctx.data()?;

        async move {
            Result::<_>::Ok(Self::started_final_print(db, &self.id).await?)
        }
        // log the backtrace which is otherwise lost by FieldResult
        .await
        .map_err(|err| {
            warn!("{:?}", err);
            err.into()
        })
    }

    async fn tasks<'ctx>(
        &self,
        ctx: &'ctx Context<'_>,
        #[graphql(default)]
        input: PartTasksInput,
    ) -> FieldResult<Vec<Task>> {
        let db: &crate::Db = ctx.data()?;

        async move {
            let tasks = sqlx::query_as!(
                JsonRow,
                r#"
                    SELECT props FROM tasks
                    WHERE
                        part_id = ?
                        AND (? IS TRUE OR tasks.status NOT IN ('spooled', 'started', 'paused'))
                        AND (? IS TRUE OR tasks.status IN ('spooled', 'started', 'paused'))
                "#,
                self.id,
                input.pending,
                input.settled,
            )
                .fetch_all(db)
                .await?;

            let tasks = Task::from_rows(tasks)?;
            Result::<_>::Ok(tasks)
        }
        // log the backtrace which is otherwise lost by FieldResult
        .await
        .map_err(|err| {
            warn!("{:?}", err);
            err.into()
        })
    }
}
