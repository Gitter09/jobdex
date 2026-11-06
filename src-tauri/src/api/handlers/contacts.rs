use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashMap;

use crate::api::error::{ApiError, ApiResponse};
use crate::api::scope::{self, Scope};
use crate::api::AppState;

/// Re-export the shared SQL query base from src-core.
const CONTACT_SELECT_BASE: &str = jobdex_core::contacts::CONTACT_SELECT_BASE;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ContactWithTags {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub linkedin_url: Option<String>,
    pub title: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub company_website: Option<String>,
    pub status_id: Option<String>,
    pub status_label: Option<String>,
    pub status_color: Option<String>,
    #[serde(rename = "summary")]
    pub intelligence_summary: Option<String>,
    pub last_contacted_date: Option<chrono::DateTime<chrono::Utc>>,
    pub next_contact_date: Option<chrono::DateTime<chrono::Utc>>,
    pub effective_next_date: Option<chrono::DateTime<chrono::Utc>>,
    pub next_contact_event: Option<String>,
    pub cadence_stage: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    #[sqlx(skip)]
    pub tags: Vec<TagBrief>,
}

#[derive(Debug, Serialize, Clone, sqlx::FromRow)]
pub struct TagBrief {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TagAssignmentRow {
    pub contact_id: String,
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Deserialize)]
pub struct ListContactsQuery {
    pub status_id: Option<String>,
    pub tag: Option<String>,
    pub search: Option<String>,
}

pub async fn list_contacts(
    State(state): State<AppState>,
    Query(params): Query<ListContactsQuery>,
) -> Result<Json<ApiResponse<Vec<ContactWithTags>>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;

    let mut sql = format!("{} ", CONTACT_SELECT_BASE);
    let mut conditions: Vec<&str> = Vec::new();

    let tag = params.tag.as_deref().filter(|t| !t.is_empty());
    let search = params.search.as_deref().filter(|s| !s.is_empty());
    let status_id = params.status_id.as_deref().filter(|s| !s.is_empty());

    if tag.is_some() {
        sql.push_str(
            "LEFT JOIN contact_tags ct ON c.id = ct.contact_id LEFT JOIN tags tg ON ct.tag_id = tg.id ",
        );
        conditions.push("tg.name = ?");
    }
    if search.is_some() {
        conditions.push("(c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.company LIKE ? OR c.title LIKE ?)");
    }
    if status_id.is_some() {
        conditions.push("c.status_id = ?");
    }

    // Scope lives in the WHERE clause so out-of-scope rows are never selected.
    sql.push_str(&format!("WHERE 1=1 {} ", scope.contact_filter("c")));
    if !conditions.is_empty() {
        sql.push_str(&format!("AND {} ", conditions.join(" AND ")));
    }
    sql.push_str("ORDER BY c.updated_at DESC");

    // Bindings must follow placeholder order, not builder order.
    let mut query = scope.bind_as(sqlx::query_as::<_, ContactWithTags>(&sql));
    if let Some(tag) = tag {
        query = query.bind(tag.to_string());
    }
    if let Some(search) = search {
        let pattern = format!("%{}%", search);
        query = query
            .bind(pattern.clone())
            .bind(pattern.clone())
            .bind(pattern.clone())
            .bind(pattern.clone())
            .bind(pattern);
    }
    if let Some(status_id) = status_id {
        query = query.bind(status_id.to_string());
    }

    let contacts = query.fetch_all(pool).await?;
    let enriched = enrich_with_tags(pool, contacts).await?;
    Ok(Json(ApiResponse::ok(enriched)))
}

pub async fn get_contact(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<ContactWithTags>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;
    ensure_in_scope(&scope, &id)?;

    let sql = format!(
        "{} WHERE c.id = ? ORDER BY c.updated_at DESC",
        CONTACT_SELECT_BASE
    );
    let contact = sqlx::query_as::<_, ContactWithTags>(&sql)
        .bind(&id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("Contact '{}' not found", id)))?;

    let enriched = enrich_with_tags(pool, vec![contact]).await?;
    Ok(Json(ApiResponse::ok(enriched.into_iter().next().unwrap())))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateContactBody {
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub linkedin_url: Option<String>,
    pub status_id: Option<String>,
    pub title: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub company_website: Option<String>,
}

pub async fn create_contact(
    State(state): State<AppState>,
    Json(body): Json<CreateContactBody>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;
    scope.require_create()?;

    let email = body.email.as_deref().map(str::trim).filter(|e| !e.is_empty());

    // Duplicate detection by normalized email, without revealing the other row.
    if let Some(email) = email {
        let duplicate: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM contacts WHERE lower(trim(email)) = lower(trim(?)))",
        )
        .bind(email)
        .fetch_one(pool)
        .await?;
        if duplicate {
            return Err(ApiError::Validation(
                "A contact with this email already exists.".into(),
            ));
        }
    }

    let id = uuid::Uuid::new_v4().to_string();

    let provided_status_id = body.status_id.filter(|s| !s.trim().is_empty());
    let final_status_id = if let Some(sid) = &provided_status_id {
        let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM statuses WHERE id = ?)")
            .bind(sid)
            .fetch_one(pool)
            .await?;
        if !exists {
            return Err(ApiError::Validation(format!(
                "Status '{}' does not exist.",
                sid
            )));
        }
        sid.clone()
    } else {
        sqlx::query_scalar("SELECT id FROM statuses ORDER BY position ASC LIMIT 1")
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| {
                ApiError::Validation("No statuses found. Create a status first.".into())
            })?
    };

    let mut tx = pool.begin().await?;
    sqlx::query("INSERT INTO contacts (id, first_name, last_name, email, linkedin_url, status_id, title, company, location, company_website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&body.first_name)
        .bind(&body.last_name)
        .bind(email)
        .bind(&body.linkedin_url)
        .bind(&final_status_id)
        .bind(&body.title)
        .bind(&body.company)
        .bind(&body.location)
        .bind(&body.company_website)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    // Externally created contacts join API scope only, never model consent.
    jobdex_core::relationship_agent::store::add_to_api_scope(pool, &id)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;
    jobdex_core::relationship_agent::store::log_activity(
        pool,
        None,
        None,
        &id,
        "contact_created_externally",
        serde_json::json!({ "origin": "api" }),
    )
    .await
    .map_err(|e| ApiError::Internal(e.to_string()))?;

    #[cfg(debug_assertions)]
    println!(
        "[API] Created contact {} '{} {}'",
        id, body.first_name, body.last_name
    );

    Ok(Json(ApiResponse::ok(serde_json::json!({ "id": id }))))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateContactBody {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub linkedin_url: Option<String>,
    pub status_id: Option<String>,
    pub last_contacted_date: Option<chrono::DateTime<chrono::Utc>>,
    pub next_contact_date: Option<chrono::DateTime<chrono::Utc>>,
    pub cadence_stage: Option<i32>,
    pub title: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub company_website: Option<String>,
    /// The user-written summary is native-only. Accepted for an explicit rejection,
    /// never applied.
    #[serde(rename = "summary", alias = "intelligenceSummary")]
    pub intelligence_summary: Option<String>,
}

pub async fn update_contact(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateContactBody>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;
    scope.require_organize()?;
    ensure_in_scope(&scope, &id)?;

    if body.intelligence_summary.is_some() {
        return Err(ApiError::Forbidden(
            "The user-written summary can only be changed in the JobDex app.".into(),
        ));
    }

    let before = sqlx::query_as::<_, ContactSnapshot>(
        "SELECT first_name, last_name, email, linkedin_url, status_id, last_contacted_date, next_contact_date, cadence_stage, title, company, location, company_website FROM contacts WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::NotFound(format!("Contact '{}' not found", id)))?;

    if let Some(sid) = &body.status_id {
        let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM statuses WHERE id = ?)")
            .bind(sid)
            .fetch_one(pool)
            .await?;
        if !exists {
            return Err(ApiError::Validation(format!(
                "Status '{}' does not exist.",
                sid
            )));
        }
    }

    sqlx::query(
        r#"
        UPDATE contacts SET
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            email = COALESCE(?, email),
            linkedin_url = COALESCE(?, linkedin_url),
            status_id = COALESCE(?, status_id),
            last_contacted_date = COALESCE(?, last_contacted_date),
            next_contact_date = COALESCE(?, next_contact_date),
            cadence_stage = COALESCE(?, cadence_stage),
            title = COALESCE(?, title),
            company = COALESCE(?, company),
            location = COALESCE(?, location),
            company_website = COALESCE(?, company_website),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&body.first_name)
    .bind(&body.last_name)
    .bind(&body.email)
    .bind(&body.linkedin_url)
    .bind(&body.status_id)
    .bind(body.last_contacted_date)
    .bind(body.next_contact_date)
    .bind(body.cadence_stage)
    .bind(&body.title)
    .bind(&body.company)
    .bind(&body.location)
    .bind(&body.company_website)
    .bind(&id)
    .execute(pool)
    .await?;

    if let Some(sid) = &body.status_id {
        let label: Option<String> = sqlx::query_scalar("SELECT label FROM statuses WHERE id = ?")
            .bind(sid)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();
        if let Some(lbl) = &label {
            let event_id = uuid::Uuid::new_v4().to_string();
            let _ = sqlx::query(
                "INSERT INTO contact_events (id, contact_id, title, description, event_at, event_type) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'user_event')",
            )
            .bind(&event_id)
            .bind(&id)
            .bind(format!("Moved to {}", lbl))
            .bind(Option::<String>::None)
            .execute(pool)
            .await;
        }
    }

    let changed = before.changed_fields(&body);
    jobdex_core::relationship_agent::store::log_activity(
        pool,
        None,
        None,
        &id,
        "contact_updated_externally",
        serde_json::json!({ "origin": "api", "changedFields": changed }),
    )
    .await
    .map_err(|e| ApiError::Internal(e.to_string()))?;

    #[cfg(debug_assertions)]
    println!("[API] Updated contact {}", id);

    Ok(Json(ApiResponse::ok(serde_json::json!({ "id": id }))))
}

#[derive(sqlx::FromRow)]
struct ContactSnapshot {
    first_name: String,
    last_name: String,
    email: Option<String>,
    linkedin_url: Option<String>,
    status_id: Option<String>,
    last_contacted_date: Option<chrono::DateTime<chrono::Utc>>,
    next_contact_date: Option<chrono::DateTime<chrono::Utc>>,
    cadence_stage: Option<i32>,
    title: Option<String>,
    company: Option<String>,
    location: Option<String>,
    company_website: Option<String>,
}

impl ContactSnapshot {
    fn changed_fields(&self, body: &UpdateContactBody) -> Vec<&'static str> {
        let flags: [(&'static str, bool); 12] = [
            (
                "firstName",
                body.first_name.is_some() && body.first_name.as_ref() != Some(&self.first_name),
            ),
            (
                "lastName",
                body.last_name.is_some() && body.last_name.as_ref() != Some(&self.last_name),
            ),
            ("email", body.email.is_some() && body.email != self.email),
            (
                "linkedinUrl",
                body.linkedin_url.is_some() && body.linkedin_url != self.linkedin_url,
            ),
            (
                "statusId",
                body.status_id.is_some() && body.status_id != self.status_id,
            ),
            (
                "lastContactedDate",
                body.last_contacted_date.is_some()
                    && body.last_contacted_date != self.last_contacted_date,
            ),
            (
                "nextContactDate",
                body.next_contact_date.is_some() && body.next_contact_date != self.next_contact_date,
            ),
            (
                "cadenceStage",
                body.cadence_stage.is_some() && body.cadence_stage != self.cadence_stage,
            ),
            ("title", body.title.is_some() && body.title != self.title),
            ("company", body.company.is_some() && body.company != self.company),
            ("location", body.location.is_some() && body.location != self.location),
            (
                "companyWebsite",
                body.company_website.is_some() && body.company_website != self.company_website,
            ),
        ];
        flags
            .into_iter()
            .filter_map(|(name, changed)| changed.then_some(name))
            .collect()
    }
}

#[derive(Deserialize)]
pub struct BulkStatusBody {
    pub ids: Vec<String>,
    pub status_id: String,
}

pub async fn bulk_update_status(
    State(state): State<AppState>,
    Json(body): Json<BulkStatusBody>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;
    scope.require_organize()?;

    if body.ids.is_empty() {
        return Err(ApiError::Validation("No contact IDs supplied.".into()));
    }
    for id in &body.ids {
        if !scope.allows(id) {
            return Err(ApiError::Forbidden(
                "One or more contacts are not in this API key's scope.".into(),
            ));
        }
    }

    let status_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM statuses WHERE id = ?)")
            .bind(&body.status_id)
            .fetch_one(pool)
            .await?;
    if !status_exists {
        return Err(ApiError::Validation(format!(
            "Status '{}' does not exist.",
            body.status_id
        )));
    }

    let mut tx = pool.begin().await?;
    let mut count: u64 = 0;
    for id in &body.ids {
        let result = sqlx::query("UPDATE contacts SET status_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(&body.status_id)
            .bind(id)
            .execute(&mut *tx)
            .await?;
        count += result.rows_affected();
    }
    tx.commit().await?;

    #[cfg(debug_assertions)]
    println!("[API] Bulk updated status for {} contacts", count);

    Ok(Json(ApiResponse::ok(
        serde_json::json!({ "updated": count }),
    )))
}

/// Out-of-scope IDs are indistinguishable from missing ones.
pub fn ensure_in_scope(scope: &Scope, contact_id: &str) -> Result<(), ApiError> {
    if scope.allows(contact_id) {
        Ok(())
    } else {
        Err(ApiError::NotFound("Contact not found.".into()))
    }
}

pub async fn enrich_with_tags(
    pool: &SqlitePool,
    contacts: Vec<ContactWithTags>,
) -> Result<Vec<ContactWithTags>, ApiError> {
    let assignments = sqlx::query_as::<_, TagAssignmentRow>(
        "SELECT ct.contact_id, t.id, t.name, t.color FROM tags t JOIN contact_tags ct ON t.id = ct.tag_id",
    )
    .fetch_all(pool)
    .await?;

    let mut tags_by_contact: HashMap<String, Vec<TagBrief>> = HashMap::new();
    for a in assignments {
        tags_by_contact
            .entry(a.contact_id)
            .or_default()
            .push(TagBrief {
                id: a.id,
                name: a.name,
                color: a.color,
            });
    }

    let result: Vec<ContactWithTags> = contacts
        .into_iter()
        .map(|mut c| {
            c.tags = tags_by_contact.remove(&c.id).unwrap_or_default();
            c
        })
        .collect();

    Ok(result)
}
