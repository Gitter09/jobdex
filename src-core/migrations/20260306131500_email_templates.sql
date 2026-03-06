-- Update schema for Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster listing by name
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
