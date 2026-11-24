CREATE TABLE kick_bots (
  community_id TEXT PRIMARY KEY REFERENCES kick_channels(community_id) ON DELETE CASCADE,
  broadcaster_id TEXT NOT NULL,
  bot_id TEXT NOT NULL CHECK (bot_id <> broadcaster_id),
  login TEXT NOT NULL,
  encrypted_tokens TEXT NOT NULL
);
