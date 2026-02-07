DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  description TEXT,
  is_public INTEGER DEFAULT 0,
  is_encrypted INTEGER DEFAULT 0,
  passwords TEXT,
  related_link TEXT,
  extra_buttons TEXT,
  js_injections TEXT,
  remember_duration INTEGER DEFAULT 30,
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

INSERT OR IGNORE INTO config (key, value) VALUES ('items_per_page', '12');
INSERT OR IGNORE INTO config (key, value) VALUES ('site_title', '项目展示门户');
