-- Delivery ambiguity tracking for manually scheduled email.
-- Blind retries after an uncertain delivery could send the same message twice, so
-- each row now records when the provider call started and what it returned.

ALTER TABLE scheduled_emails ADD COLUMN send_started_at TEXT;
ALTER TABLE scheduled_emails ADD COLUMN provider_receipt TEXT;
