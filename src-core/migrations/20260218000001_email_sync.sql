-- Email Sync Phase: Add sync tracking and deduplication

-- Add last_synced_at to email_accounts for incremental sync
ALTER TABLE email_accounts ADD COLUMN last_synced_at DATETIME;

-- Add provider_message_id to email_messages for deduplication
ALTER TABLE email_messages ADD COLUMN provider_message_id TEXT;

-- Unique index to prevent duplicate messages from repeated syncs
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_messages_provider_id 
    ON email_messages(provider_message_id) 
    WHERE provider_message_id IS NOT NULL;

-- Flag for manually reassigned messages (future drag-drop feature)
ALTER TABLE email_messages ADD COLUMN manually_assigned INTEGER DEFAULT 0;
