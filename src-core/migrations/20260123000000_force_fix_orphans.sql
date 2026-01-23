-- Force Fix Orphan Contacts - New Migration
-- This migration will definitely run and fix any contacts with NULL or invalid status_id

-- Step 1: Ensure the required statuses exist (idempotent)
INSERT OR IGNORE INTO statuses (id, label, color, position, is_default) VALUES 
('stat-new', 'New', '#3b82f6', 0, 1),
('stat-contacted', 'Contacted', '#eab308', 1, 0),
('stat-replied', 'Replied', '#a855f7', 2, 0),
('stat-interested', 'Interested', '#22c55e', 3, 0),
('stat-not-interested', 'Not Interested', '#ef4444', 4, 0);

-- Step 2: Fix contacts with NULL status_id
UPDATE contacts SET status_id = 'stat-new' WHERE status_id IS NULL;

-- Step 3: Fix contacts with legacy def-stat-* IDs
UPDATE contacts SET status_id = 'stat-new' WHERE status_id LIKE 'def-stat-%';

-- Step 4: Fix any other invalid status_id (not in valid set)
UPDATE contacts SET status_id = 'stat-new' 
WHERE status_id IS NOT NULL 
  AND status_id NOT IN ('stat-new', 'stat-contacted', 'stat-replied', 'stat-interested', 'stat-not-interested');

-- Step 5: Delete the merged status if it exists
DELETE FROM statuses WHERE id = 'stat-int-ni';

-- Step 6: Delete legacy statuses
DELETE FROM statuses WHERE id LIKE 'def-stat-%';
DELETE FROM statuses WHERE label LIKE '%_legacy';
