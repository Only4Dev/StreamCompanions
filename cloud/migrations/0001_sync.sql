CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
INSERT INTO schema_version VALUES (1);
CREATE TABLE devices (key_hash TEXT PRIMARY KEY, community_id TEXT NOT NULL, revoked_at INTEGER);
CREATE TABLE viewer_progress (
  community_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (community_id, viewer_id)
);
