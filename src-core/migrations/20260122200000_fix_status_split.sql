-- Fix Statuses: Split Interested/Not Interested and Fix Orphans

-- 1. Ensure new split statuses exist
INSERT OR IGNORE INTO statuses (id, label, color, position, is_default) VALUES 
('stat-interested', 'Interested', '#22c55e', 3, 0), -- Green
('stat-not-interested', 'Not Interested', '#ef4444', 4, 0); -- Red

-- 2. Migrate from Merged 'stat-int-ni' if it exists (Default to Interested)
UPDATE contacts SET status_id = 'stat-interested' WHERE status_id = 'stat-int-ni';

-- 3. Delete Merged status
DELETE FROM statuses WHERE id = 'stat-int-ni';

-- 4. Fix Orphans (NULLs)
UPDATE contacts SET status_id = 'stat-new' WHERE status_id IS NULL;

-- 5. Fix Orphans (Any ID not in the valid set)
-- Valid Set: stat-new, stat-contacted, stat-replied, stat-interested, stat-not-interested
UPDATE contacts SET status_id = 'stat-new' WHERE status_id NOT IN (
    'stat-new', 
    'stat-contacted', 
    'stat-replied', 
    'stat-interested', 
    'stat-not-interested'
);
