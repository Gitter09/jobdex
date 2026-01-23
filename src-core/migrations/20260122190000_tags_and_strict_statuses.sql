-- Create Tags system
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#64748b', -- Slate-500 default
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (contact_id, tag_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Reset Statuses to Strict Workflow
-- 1. Rename existing statuses to avoid UNIQUE (label) constraint during new insert
UPDATE statuses SET label = label || '_legacy';

-- 2. Insert the canonical statuses with FIXED IDs
INSERT INTO statuses (id, label, color, position, is_default) VALUES 
('stat-new', 'New', '#3b82f6', 0, 1),
('stat-contacted', 'Contacted', '#eab308', 1, 0),
('stat-replied', 'Replied', '#a855f7', 2, 0),
('stat-int-ni', 'Interested / Not Interested', '#64748b', 3, 0);

-- 3. Migrate contacts from Legacy IDs to New IDs
-- Map 'New_legacy' -> 'stat-new'
UPDATE contacts SET status_id = 'stat-new' WHERE status_id IN (SELECT id FROM statuses WHERE label = 'New_legacy');

-- Map 'Contacted_legacy' -> 'stat-contacted'
UPDATE contacts SET status_id = 'stat-contacted' WHERE status_id IN (SELECT id FROM statuses WHERE label = 'Contacted_legacy');

-- Map 'Replied_legacy' -> 'stat-replied'
UPDATE contacts SET status_id = 'stat-replied' WHERE status_id IN (SELECT id FROM statuses WHERE label = 'Replied_legacy');

-- Map 'Interested_legacy' -> 'stat-int-ni' (Merged)
UPDATE contacts SET status_id = 'stat-int-ni' WHERE status_id IN (SELECT id FROM statuses WHERE label = 'Interested_legacy');

-- Map 'Not Interested_legacy' -> 'stat-int-ni' (Merged)
UPDATE contacts SET status_id = 'stat-int-ni' WHERE status_id IN (SELECT id FROM statuses WHERE label = 'Not Interested_legacy');

-- 4. Catch-all: Move everything else (Imported, unknown) to 'New'
UPDATE contacts SET status_id = 'stat-new' WHERE status_id NOT IN ('stat-new', 'stat-contacted', 'stat-replied', 'stat-int-ni');

-- 5. Delete all interactions/applications referencing old statuses? No, they don't ref statuses usually.
-- But we can now safely delete the old statuses because contacts no longer point to them.
DELETE FROM statuses WHERE id NOT IN ('stat-new', 'stat-contacted', 'stat-replied', 'stat-int-ni');
