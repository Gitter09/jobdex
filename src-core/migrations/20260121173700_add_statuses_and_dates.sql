-- Create statuses table
CREATE TABLE IF NOT EXISTS statuses (
    id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default statuses
INSERT INTO statuses (id, label, color, is_default, position) VALUES 
('def-stat-001', 'New', 'bg-blue-100 text-blue-800', 1, 0),
('def-stat-002', 'Contacted', 'bg-yellow-100 text-yellow-800', 0, 1),
('def-stat-003', 'Replied', 'bg-purple-100 text-purple-800', 0, 2),
('def-stat-004', 'Interested', 'bg-green-100 text-green-800', 0, 3),
('def-stat-005', 'Not Interested', 'bg-red-100 text-red-800', 0, 4),
('def-stat-006', 'Imported', 'bg-gray-100 text-gray-800', 0, 5);

-- Add new columns to contacts
-- Note: We add next_contact_date and last_contacted_date.
-- We kept status string previously, we will now try to backfill status_id based on status string.

ALTER TABLE contacts ADD COLUMN status_id TEXT REFERENCES statuses(id);
ALTER TABLE contacts ADD COLUMN last_contacted_date DATETIME;
ALTER TABLE contacts ADD COLUMN next_contact_date DATETIME;
ALTER TABLE contacts ADD COLUMN cadence_stage INTEGER DEFAULT 0;

-- Backfill status_id based on existing text status
UPDATE contacts SET status_id = 'def-stat-001' WHERE status = 'New';
UPDATE contacts SET status_id = 'def-stat-002' WHERE status = 'Contacted';
UPDATE contacts SET status_id = 'def-stat-003' WHERE status = 'Replied';
UPDATE contacts SET status_id = 'def-stat-004' WHERE status = 'Interested';
UPDATE contacts SET status_id = 'def-stat-005' WHERE status = 'Not Interested';
UPDATE contacts SET status_id = 'def-stat-006' WHERE status = 'Imported';

-- Fallback for any unknown status to 'New'
UPDATE contacts SET status_id = 'def-stat-001' WHERE status_id IS NULL;
