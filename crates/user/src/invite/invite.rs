use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use anyhow::{
    // anyhow,
    Result,
    // Context as _,
};

use crate::user::User;
use super::InviteConfig;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Invite {
    pub id: crate::DbId,
    pub version: crate::DbId,
    pub created_at: DateTime<Utc>,

    pub config: InviteConfig,

    pub public_key: String,
    pub private_key: Option<String>,
    pub slug: Option<String>,
}

impl Invite {
    pub async fn generate_and_display(
        db: &crate::Db,
        is_admin: bool,
    ) -> Result<Self> {
        let invite = Self::new(db, is_admin)?;
        invite.print_welcome_text()?;

        Ok(invite)
    }

    pub async fn generate_or_display_initial_invite(
        db: &crate::Db,
    ) -> Result<()> {
        let have_any_admins = User::get_all(db).await?
            .iter()
            .any(|user| user.config.is_admin);

        if !have_any_admins {
            let initial_invite = Self::get_all(db).await?
                .into_iter()
                .find(|invite| {
                    invite.config.is_admin && invite.slug.is_some()
                });

            let initial_invite = match initial_invite {
                Some(invite) => invite,
                None => Self::new(db, true)?,
            };

            initial_invite.print_welcome_text()?;
        };

        Ok(())
    }

    pub async fn new(
        db: &crate::Db,
        is_admin: bool,
    ) -> Result<Self> {
        use secp256k1::{
            rand::rngs::OsRng,
            Secp256k1,
        };

        let secp = Secp256k1::new();
        let mut rng = OsRng::new().expect("OsRng");
        let (binary_private_key, binary_public_key) = secp.generate_keypair(&mut rng);

        use hex::ToHex;

        let private_key = format!("{:x}", binary_private_key);
        let public_key = binary_public_key
            .serialize_uncompressed()
            .to_vec()
            .encode_hex::<String>();

        let slug = Self::generate_slug(private_key.clone())?;

        let invite = UnsavedInvite {
            private_key: Some(private_key),
            public_key,
            slug: Some(slug),
            config: InviteConfig {
                is_admin,
            },
        };

        let invite = invite.insert(db).await?;

        Ok(invite)
    }
}

// TODO: Create a macro to generate this JSON Store code
// -------------------------------------------------------------
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UnsavedInvite {
    pub config: InviteConfig,

    pub public_key: String,
    pub private_key: Option<String>,
    pub slug: Option<String>,
}

struct JsonRow {
    pub props: String,
}

struct IdRow {
    pub id: crate::DbId,
}

impl UnsavedInvite {
    pub async fn insert(
        &self,
        db: &crate::Db,
    ) -> Result<Invite> {
        let mut db = db.begin().await?;

        // Generate an ID for the row
        let IdRow { id } = sqlx::query_as!(
            IdRow,
            r#"
                INSERT INTO invites
                (props)
                VALUES ("{}")
            "#,
        )
            .fetch_one(&mut db)
            .await?;

        // Add the sqlite-generated monotonic ID and other default fields in to the json
        let json = serde_json::to_value(self)?;
        let map = json
            .as_object_mut()
            .expect("Struct incorrectly serialized for JsonRow insert");

        map.insert("id".to_string(), id.into());
        map.insert("version".to_string(), 0.into());
        map.insert("created_at".to_string(), serde_json::to_value(Utc::now())?);

        // Update Sqlite - adding the modified JSON including the ID
        let row = sqlx::query_as!(
            JsonRow,
            r#"
                UPDATE invites
                SET props=?
                WHERE id=?
            "#,
            json.to_string(),
            id,
        )
            .fetch_one(&mut db)
            .await?;

        let entry: Invite = serde_json::from_value(json)?;

        db.commit().await?;
        Ok(entry)
    }
}

impl Invite {
    pub async fn get(
        db: &crate::Db,
        id: crate::DbId,
    ) -> Result<Self> {
        let row = sqlx::query_as!(
            JsonRow,
            "SELECT props FROM invites WHERE id = ?",
            id
        )
            .fetch_one(db)
            .await?;

        let entry: Self = serde_json::from_str(&row.props)?;
        Ok(entry)
    }

    pub async fn get_by_pk<'e, 'c, E>(
        db: E,
        public_key: String,
    ) -> Result<Self>
    where
        E: 'e + sqlx::Executor<'c, Database = sqlx::Sqlite>,
    {
        let row = sqlx::query_as!(
            JsonRow,
            "SELECT props FROM invites WHERE public_key = ?",
            public_key,
        )
            .fetch_one(db)
            .await?;

        let entry: Self = serde_json::from_str(&row.props)?;
        Ok(entry)
    }

    pub async fn get_all(
        db: &crate::Db,
    ) -> Result<Vec<Self>> {
        let rows = sqlx::query_as!(
            JsonRow,
            "SELECT props FROM invites",
        )
            .fetch_all(db)
            .await?;

        let rows = rows.into_iter()
            .map(|row| serde_json::from_str(&row.props))
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(rows)
    }

    pub async fn update<'e, 'c, E>(
        &mut self,
        db: E,
    ) -> Result<()>
    where
        E: 'e + sqlx::Executor<'c, Database = sqlx::Sqlite>,
    {
        let previous_version = self.version;
        self.version = self.version + 1;

        let json = serde_json::to_string(self)?;

        sqlx::query!(
            r#"
                UPDATE invites
                SET props=?, version=?
                WHERE id=? AND version=?
            "#,
            json,
            self.version,
            self.id,
            previous_version,
        )
            .fetch_one(db)
            .await?;

        Ok(())
    }

    pub async fn remove<'e, 'c, E>(
        db: E,
        id: crate::DbId,
    ) -> Result<()>
    where
        E: 'e + sqlx::Executor<'c, Database = sqlx::Sqlite>,
    {
        sqlx::query!(
            r#"
                DELETE FROM invites WHERE id=?
            "#,
            id,
        )
            .fetch_one(db)
            .await?;

        Ok(())
    }
}
