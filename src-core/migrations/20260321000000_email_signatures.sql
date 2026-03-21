-- Email signatures table
CREATE TABLE IF NOT EXISTS email_signatures (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS update_email_signatures_updated_at
AFTER UPDATE ON email_signatures
FOR EACH ROW
BEGIN
    UPDATE email_signatures SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
