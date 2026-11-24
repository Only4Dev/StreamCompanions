CREATE TABLE community_stream_status (
  community_id TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL,
  platforms TEXT NOT NULL
);
ALTER TABLE kick_messages ADD COLUMN display_text TEXT;
