-- Remove all traces of email tracking
DROP TABLE IF EXISTS email_tracking;
ALTER TABLE email_messages DROP COLUMN tracking_id;
DELETE FROM settings WHERE key = 'tracking_secret';
