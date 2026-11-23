CREATE TABLE kick_pairings (
  state TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE kick_channels (
  community_id TEXT PRIMARY KEY,
  broadcaster_id TEXT NOT NULL UNIQUE,
  login TEXT NOT NULL,
  encrypted_tokens TEXT NOT NULL
);
CREATE TABLE kick_messages (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL UNIQUE,
  community_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE INDEX kick_messages_by_community ON kick_messages (community_id, sequence);
CREATE INDEX kick_messages_by_expiry ON kick_messages (received_at);
