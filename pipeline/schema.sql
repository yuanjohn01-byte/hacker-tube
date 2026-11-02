PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS hn_items (
  id INTEGER PRIMARY KEY,
  author TEXT,
  created_at INTEGER,
  parent_id INTEGER,
  story_id INTEGER,
  raw_json TEXT NOT NULL,
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS repositories (
  repo_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS repo_aliases (
  normalized_name TEXT PRIMARY KEY,
  repo_id INTEGER NOT NULL REFERENCES repositories(repo_id)
);
CREATE TABLE IF NOT EXISTS mentions (
  hn_item_id INTEGER NOT NULL REFERENCES hn_items(id),
  normalized_name TEXT NOT NULL,
  raw_urls_json TEXT NOT NULL,
  extractor_version TEXT NOT NULL,
  PRIMARY KEY (hn_item_id, normalized_name)
);
CREATE TABLE IF NOT EXISTS judgements (
  hn_item_id INTEGER NOT NULL REFERENCES hn_items(id),
  repo_id INTEGER NOT NULL REFERENCES repositories(repo_id),
  input_hash TEXT NOT NULL,
  questions_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  response_json TEXT NOT NULL,
  judged_at TEXT NOT NULL,
  PRIMARY KEY (hn_item_id, repo_id, input_hash, questions_hash, model)
);
CREATE TABLE IF NOT EXISTS checkpoints (
  source TEXT PRIMARY KEY,
  cursor_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
