CREATE TABLE project_bot_pairings (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE project_bots (
  provider TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  encrypted_tokens TEXT NOT NULL
);
