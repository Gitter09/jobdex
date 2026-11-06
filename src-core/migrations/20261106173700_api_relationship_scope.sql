-- External API relationship scope.
-- Bearer keys carry no implicit access: an existing key sees nothing until the user
-- selects a mode and a contact scope in native settings.

INSERT OR IGNORE INTO settings (key, value) VALUES ('api.relationship_access', 'read');
INSERT OR IGNORE INTO settings (key, value) VALUES ('api.allowed_contact_ids', '[]');
INSERT OR IGNORE INTO settings (key, value) VALUES ('api.allow_contact_creation', 'false');
