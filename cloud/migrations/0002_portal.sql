CREATE INDEX viewer_progress_by_viewer ON viewer_progress (viewer_id);
CREATE TABLE web_sessions (
  id TEXT PRIMARY KEY,
  viewer_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX web_sessions_by_expiry ON web_sessions (expires_at);
