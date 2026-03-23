CREATE TABLE IF NOT EXISTS email_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_size INTEGER NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_message_id ON email_attachments(message_id);
