DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT 0,
  is_encrypted BOOLEAN DEFAULT 0,
  passwords TEXT, -- JSON array of strings
  related_link TEXT,
  extra_buttons TEXT, -- JSON array of objects {label, content, type}
  js_injections TEXT, -- JSON array of library IDs
  created_at INTEGER,
  updated_at INTEGER
);

DROP TABLE IF EXISTS js_library;
CREATE TABLE js_library (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

DROP TABLE IF EXISTS config;
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Initial Config
INSERT INTO config (key, value) VALUES ('items_per_page', '12');
INSERT INTO config (key, value) VALUES ('site_title', 'Project Portal');
