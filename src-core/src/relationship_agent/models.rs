//! Wire types, enums and validation for the relationship agent.
//!
//! Database rows keep enum-ish columns as `TEXT`; the enums here own parsing and
//! serialization so that both the IPC boundary and the API boundary agree.

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

// ===== Limits =====

pub const MAX_TITLE_CHARS: usize = 200;
pub const MAX_TEXT_CHARS: usize = 4_000;
pub const MAX_SUBJECT_BYTES: usize = 998;
pub const MAX_BODY_BYTES: usize = 32 * 1024;
pub const MAX_RULES: usize = 5;
pub const MAX_CONTACTS: usize = 25;
pub const MAX_MODEL_INPUT_BYTES: usize = 32 * 1024;
pub const MAX_OUTPUT_TOKENS: u32 = 2_048;
pub const MAX_DAILY_REQUESTS: i64 = 100;
pub const MAX_ACTIVITY_ROWS: i64 = 100;
pub const SPEC_SCHEMA_VERSION: u32 = 1;

// ===== Enums =====

macro_rules! text_enum {
    ($name:ident { $($variant:ident => $text:literal),+ $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
        #[serde(rename_all = "snake_case")]
        pub enum $name {
            $($variant),+
        }

        impl $name {
            pub fn as_str(self) -> &'static str {
                match self { $(Self::$variant => $text),+ }
            }

            pub fn parse(value: &str) -> Result<Self> {
                match value {
                    $($text => Ok(Self::$variant),)+
                    other => bail!("Unsupported value: {}", other),
                }
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.write_str(self.as_str())
            }
        }
    };
}

text_enum!(GoalStatus {
    Active => "active",
    Paused => "paused",
    Archived => "archived",
});

text_enum!(WorkflowStatus {
    Draft => "draft",
    Active => "active",
    Paused => "paused",
    Archived => "archived",
});

text_enum!(MemoryKind {
    Context => "context",
    Commitment => "commitment",
    Boundary => "boundary",
});

text_enum!(MemoryOrigin {
    User => "user",
    Source => "source",
    Inference => "inference",
});

text_enum!(MemoryStatus {
    Suggested => "suggested",
    Confirmed => "confirmed",
    Dismissed => "dismissed",
    Superseded => "superseded",
});

text_enum!(ActionKind {
    Reminder => "reminder",
    EmailDraft => "email_draft",
});

text_enum!(ActionStatus {
    Preparing => "preparing",
    NeedsReview => "needs_review",
    Snoozed => "snoozed",
    Approved => "approved",
    Sending => "sending",
    Sent => "sent",
    DeliveryUnknown => "delivery_unknown",
    Blocked => "blocked",
    Dismissed => "dismissed",
    Done => "done",
});

text_enum!(ProcessingStatus {
    Pending => "pending",
    Complete => "complete",
    Failed => "failed",
});

text_enum!(RuleTrigger {
    Cadence => "cadence",
    CommitmentDue => "commitment_due",
    Unanswered => "unanswered",
});

text_enum!(RuleAction {
    Reminder => "reminder",
    EmailDraft => "email_draft",
});

text_enum!(ReviewDecision {
    Approve => "approve",
    Dismiss => "dismiss",
    Done => "done",
    Snooze => "snooze",
});

text_enum!(AccessMode {
    Read => "read",
    Organize => "organize",
});

// ===== Validation helpers =====

pub fn validate_id(value: &str, field: &str) -> Result<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        bail!("{} is required", field);
    }
    if trimmed.len() > 128 {
        bail!("{} is too long", field);
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        bail!("{} contains unsupported characters", field);
    }
    Ok(trimmed.to_string())
}

pub fn validate_title(value: &str) -> Result<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        bail!("Title is required");
    }
    if trimmed.chars().count() > MAX_TITLE_CHARS {
        bail!("Title must be at most {} characters", MAX_TITLE_CHARS);
    }
    Ok(trimmed.to_string())
}

/// Trims and enforces the 4,000-character bound used by intents, purpose and tone.
pub fn validate_long_text(value: &str, field: &str) -> Result<String> {
    let trimmed = value.trim();
    if trimmed.chars().count() > MAX_TEXT_CHARS {
        bail!("{} must be at most {} characters", field, MAX_TEXT_CHARS);
    }
    Ok(trimmed.to_string())
}

pub fn validate_subject(value: &str) -> Result<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        bail!("Subject is required");
    }
    if trimmed.contains('\r') || trimmed.contains('\n') {
        bail!("Subject must not contain line breaks");
    }
    if trimmed.len() > MAX_SUBJECT_BYTES {
        bail!("Subject must be at most {} bytes", MAX_SUBJECT_BYTES);
    }
    Ok(trimmed.to_string())
}

pub fn validate_recipient(value: &str) -> Result<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        bail!("Recipient is required");
    }
    if trimmed.contains('\r') || trimmed.contains('\n') {
        bail!("Recipient must not contain line breaks");
    }
    if !trimmed.contains('@') || trimmed.contains(' ') || trimmed.len() > 320 {
        bail!("Recipient is not a valid email address");
    }
    Ok(trimmed.to_lowercase())
}

pub fn validate_body(value: &str) -> Result<String> {
    if value.trim().is_empty() {
        bail!("Draft body is required");
    }
    if value.len() > MAX_BODY_BYTES {
        bail!("Draft body must be at most {} bytes", MAX_BODY_BYTES);
    }
    Ok(value.to_string())
}

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn parse_timestamp(value: &str, field: &str) -> Result<chrono::DateTime<chrono::Utc>> {
    chrono::DateTime::parse_from_rfc3339(value.trim())
        .map(|d| d.with_timezone(&chrono::Utc))
        .map_err(|_| anyhow::anyhow!("{} is not a valid timestamp", field))
}

/// Normalizes a timestamp string to the canonical RFC3339 UTC form used in storage.
pub fn normalize_timestamp(value: &str, field: &str) -> Result<String> {
    let parsed = parse_timestamp(value, field)?;
    Ok(parsed.to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
}

// ===== Workflow spec =====

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Rule {
    pub id: String,
    pub trigger: RuleTrigger,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub days: Option<i64>,
    pub action: RuleAction,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkflowSpec {
    pub schema_version: u32,
    pub contact_ids: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub account_id: Option<String>,
    pub purpose: String,
    pub tone: String,
    pub rules: Vec<Rule>,
}

impl WorkflowSpec {
    /// Validates structure, sizing and rule timing. Contact existence is checked
    /// against the database by the caller, not here.
    pub fn validate(&self) -> Result<()> {
        if self.schema_version != SPEC_SCHEMA_VERSION {
            bail!(
                "Unsupported workflow schema version: {}",
                self.schema_version
            );
        }

        if self.contact_ids.len() > MAX_CONTACTS {
            bail!("A workflow may cover at most {} contacts", MAX_CONTACTS);
        }
        let mut seen_contacts = HashSet::new();
        for id in &self.contact_ids {
            let normalized = validate_id(id, "contactIds")?;
            if !seen_contacts.insert(normalized) {
                bail!("contactIds contains a duplicate");
            }
        }

        validate_long_text(&self.purpose, "purpose")?;
        validate_long_text(&self.tone, "tone")?;

        if let Some(account) = &self.account_id {
            validate_id(account, "accountId")?;
        }

        if self.rules.len() > MAX_RULES {
            bail!("A workflow may contain at most {} rules", MAX_RULES);
        }

        let mut seen_rules = HashSet::new();
        for rule in &self.rules {
            let rule_id = validate_id(&rule.id, "rule.id")?;
            if !seen_rules.insert(rule_id) {
                bail!("Rule IDs must be unique");
            }
            match rule.trigger {
                RuleTrigger::Cadence | RuleTrigger::Unanswered => {
                    let days = rule
                        .days
                        .ok_or_else(|| anyhow::anyhow!("Rule '{}' requires days", rule.id))?;
                    if !(1..=365).contains(&days) {
                        bail!("Rule '{}' days must be between 1 and 365", rule.id);
                    }
                }
                RuleTrigger::CommitmentDue => {
                    if rule.days.is_some() {
                        bail!("Rule '{}' must not set days", rule.id);
                    }
                }
            }
        }

        Ok(())
    }

    pub fn requires_sending_account(&self) -> bool {
        self.rules
            .iter()
            .any(|r| r.action == RuleAction::EmailDraft)
    }
}

// ===== Payloads and evidence =====

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EmailDraftPayload {
    pub account_id: String,
    pub to: String,
    pub subject: String,
    pub body: String,
}

impl EmailDraftPayload {
    pub fn validate(&self) -> Result<()> {
        validate_id(&self.account_id, "accountId")?;
        validate_recipient(&self.to)?;
        validate_subject(&self.subject)?;
        validate_body(&self.body)?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReminderPayload {
    pub title: String,
    pub description: String,
}

impl ReminderPayload {
    pub fn validate(&self) -> Result<()> {
        validate_title(&self.title)?;
        validate_long_text(&self.description, "description")?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(untagged)]
pub enum ActionPayload {
    Email(EmailDraftPayload),
    Reminder(ReminderPayload),
}

impl ActionPayload {
    pub fn validate(&self) -> Result<()> {
        match self {
            Self::Email(p) => p.validate(),
            Self::Reminder(p) => p.validate(),
        }
    }
}

/// What the user sees as justification for a prepared action. Never model reasoning.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct ActionEvidence {
    pub source_message_ids: Vec<String>,
    pub source_quotes: Vec<String>,
    pub memory_ids: Vec<String>,
    pub rationale: String,
}

// ===== Row-backed wire records =====

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipGoal {
    pub id: String,
    pub title: String,
    pub intent: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipWorkflow {
    pub id: String,
    pub goal_id: Option<String>,
    pub title: String,
    pub intent: String,
    pub spec: WorkflowSpec,
    pub revision: i64,
    pub status: String,
    pub activated_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipMemory {
    pub id: String,
    pub contact_id: String,
    pub kind: String,
    pub text: String,
    pub origin: String,
    pub source_message_id: Option<String>,
    pub source_quote: Option<String>,
    pub due_at: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipAction {
    pub id: String,
    pub workflow_id: Option<String>,
    pub contact_id: String,
    pub kind: String,
    pub status: String,
    pub payload: Option<serde_json::Value>,
    pub evidence: ActionEvidence,
    pub context_hash: String,
    pub revision: i64,
    pub due_at: Option<String>,
    pub snoozed_until: Option<String>,
    pub approved_at: Option<String>,
    pub approved_revision: Option<i64>,
    pub send_started_at: Option<String>,
    pub provider_receipt: Option<String>,
    pub error_code: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl RelationshipAction {
    pub fn email_payload(&self) -> Result<EmailDraftPayload> {
        let value = self
            .payload
            .clone()
            .ok_or_else(|| anyhow::anyhow!("Action has no payload"))?;
        Ok(serde_json::from_value(value)?)
    }

    pub fn reminder_payload(&self) -> Result<ReminderPayload> {
        let value = self
            .payload
            .clone()
            .ok_or_else(|| anyhow::anyhow!("Action has no payload"))?;
        Ok(serde_json::from_value(value)?)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipActivity {
    pub id: String,
    pub action_id: Option<String>,
    pub workflow_id: Option<String>,
    pub contact_id: String,
    pub event_type: String,
    pub detail: serde_json::Value,
    pub created_at: String,
}

// ===== Proposal / model status =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowProposal {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spec: Option<WorkflowSpec>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    pub questions: Vec<String>,
    pub unsupported_requests: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipModelConfig {
    pub base_url: String,
    pub model: String,
    pub enabled: bool,
    pub daily_request_limit: i64,
    pub allowed_contact_ids: Vec<String>,
}

/// Native view of external-agent authority. Never includes the model key.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiRelationshipScope {
    pub access: String,
    pub allowed_contact_ids: Vec<String>,
    pub allow_contact_creation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub configured: bool,
    pub connection_verified: bool,
    pub enabled: bool,
    pub paused: bool,
    pub base_url: String,
    pub model: String,
    pub requests_today: i64,
    pub daily_request_limit: i64,
    pub allowed_contact_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn spec(rules: Vec<Rule>) -> WorkflowSpec {
        WorkflowSpec {
            schema_version: SPEC_SCHEMA_VERSION,
            contact_ids: vec!["contact-1".into()],
            account_id: None,
            purpose: "reconnect".into(),
            tone: "warm".into(),
            rules,
        }
    }

    #[test]
    fn cadence_requires_days_in_range() {
        let missing = spec(vec![Rule {
            id: "r1".into(),
            trigger: RuleTrigger::Cadence,
            days: None,
            action: RuleAction::Reminder,
        }]);
        assert!(missing.validate().is_err());

        let ok = spec(vec![Rule {
            id: "r1".into(),
            trigger: RuleTrigger::Cadence,
            days: Some(45),
            action: RuleAction::EmailDraft,
        }]);
        assert!(ok.validate().is_ok());

        let too_big = spec(vec![Rule {
            id: "r1".into(),
            trigger: RuleTrigger::Cadence,
            days: Some(400),
            action: RuleAction::Reminder,
        }]);
        assert!(too_big.validate().is_err());
    }

    #[test]
    fn commitment_due_rejects_days() {
        let invalid = spec(vec![Rule {
            id: "r1".into(),
            trigger: RuleTrigger::CommitmentDue,
            days: Some(3),
            action: RuleAction::Reminder,
        }]);
        assert!(invalid.validate().is_err());
    }

    #[test]
    fn unknown_fields_are_rejected() {
        let json = r#"{"schemaVersion":1,"contactIds":[],"purpose":"p","tone":"t","rules":[],"scripts":[]}"#;
        assert!(serde_json::from_str::<WorkflowSpec>(json).is_err());
    }

    #[test]
    fn duplicate_rule_ids_rejected() {
        let dup = spec(vec![
            Rule {
                id: "same".into(),
                trigger: RuleTrigger::Cadence,
                days: Some(7),
                action: RuleAction::Reminder,
            },
            Rule {
                id: "same".into(),
                trigger: RuleTrigger::Cadence,
                days: Some(9),
                action: RuleAction::Reminder,
            },
        ]);
        assert!(dup.validate().is_err());
    }

    #[test]
    fn subject_rejects_line_breaks() {
        assert!(validate_subject("hello\nBcc: evil@example.com").is_err());
        assert!(validate_subject("  hello  ").unwrap() == "hello");
    }
}
