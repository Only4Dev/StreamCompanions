CREATE TABLE community_admin_online (
  community_id TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL
);

CREATE TABLE community_admin_actions (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  result TEXT
);

CREATE INDEX community_admin_pending ON community_admin_actions(community_id, result, created_at);
