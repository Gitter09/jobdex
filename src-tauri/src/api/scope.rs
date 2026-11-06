//! External API authority: which contacts a bearer key may see, and whether it may
//! organize at all. Scope comes from the native-only settings written by validated
//! Tauri commands; this module only reads it.

use jobdex_core::relationship_agent::{store, AccessMode};
use sqlx::sqlite::SqliteArguments;
use sqlx::query::QueryAs;
use sqlx::{Sqlite, SqlitePool};

use super::error::ApiError;

#[derive(Debug, Clone)]
pub struct Scope {
    pub access: AccessMode,
    pub allowed: Vec<String>,
    pub allow_create: bool,
}

pub async fn load(pool: &SqlitePool) -> Result<Scope, ApiError> {
    let settings = store::load_api_scope(pool)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;
    Ok(Scope {
        access: settings.access,
        allowed: settings.allowed_contact_ids,
        allow_create: settings.allow_contact_creation,
    })
}

impl Scope {
    pub fn allows(&self, contact_id: &str) -> bool {
        self.allowed.iter().any(|id| id == contact_id)
    }

    pub fn organizes(&self) -> bool {
        matches!(self.access, AccessMode::Organize)
    }

    pub fn require_organize(&self) -> Result<(), ApiError> {
        if self.organizes() {
            Ok(())
        } else {
            Err(ApiError::Forbidden(
                "This API key is read-only. Enable organize access in JobDex settings.".into(),
            ))
        }
    }

    pub fn require_create(&self) -> Result<(), ApiError> {
        self.require_organize()?;
        if self.allow_create {
            Ok(())
        } else {
            Err(ApiError::Forbidden(
                "This API key may not create contacts.".into(),
            ))
        }
    }

    /// SQL fragment restricting `expr` to in-scope contacts. Empty scope matches nothing.
    pub fn column_filter(&self, expr: &str) -> String {
        if self.allowed.is_empty() {
            return "AND 0".to_string();
        }
        let placeholders = vec!["?"; self.allowed.len()].join(",");
        format!("AND {expr} IN ({placeholders})")
    }

    /// SQL fragment restricting a contacts alias (`c.id`) to in-scope contacts.
    pub fn contact_filter(&self, alias: &str) -> String {
        self.column_filter(&format!("{alias}.id"))
    }

    /// Binds the scope ids after the caller's earlier bindings, in SQL order.
    pub fn bind_as<'q, O>(
        &self,
        query: QueryAs<'q, Sqlite, O, SqliteArguments<'q>>,
    ) -> QueryAs<'q, Sqlite, O, SqliteArguments<'q>> {
        self.allowed
            .iter()
            .fold(query, |q, id| q.bind(id.clone()))
    }
}
