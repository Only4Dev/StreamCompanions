CREATE TABLE community_owners (
  twitch_id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE
);
