-- Contact attached files table
CREATE TABLE IF NOT EXISTS contact_files (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);
