-- Update default status colors from Tailwind classes to Hex codes
-- This migration fixes the issue where we want consistent hex colors for the UI

-- Update by ID to be precise
UPDATE statuses SET color = '#3b82f6' WHERE id = 'def-stat-001'; -- New
UPDATE statuses SET color = '#eab308' WHERE id = 'def-stat-002'; -- Contacted
UPDATE statuses SET color = '#a855f7' WHERE id = 'def-stat-003'; -- Replied
UPDATE statuses SET color = '#22c55e' WHERE id = 'def-stat-004'; -- Interested
UPDATE statuses SET color = '#ef4444' WHERE id = 'def-stat-005'; -- Not Interested
UPDATE statuses SET color = '#64748b' WHERE id = 'def-stat-006'; -- Imported

-- Fallbacks for any legacy strings in user-created statuses (if any match these patterns)
UPDATE statuses SET color = '#3b82f6' WHERE color = 'bg-blue-100 text-blue-800';
UPDATE statuses SET color = '#eab308' WHERE color = 'bg-yellow-100 text-yellow-800';
UPDATE statuses SET color = '#a855f7' WHERE color = 'bg-purple-100 text-purple-800';
UPDATE statuses SET color = '#22c55e' WHERE color = 'bg-green-100 text-green-800';
UPDATE statuses SET color = '#ef4444' WHERE color = 'bg-red-100 text-red-800';
UPDATE statuses SET color = '#64748b' WHERE color = 'bg-gray-100 text-gray-800';
