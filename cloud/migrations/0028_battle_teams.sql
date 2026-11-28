CREATE TABLE viewer_battle_teams (
  community_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slots TEXT NOT NULL,
  PRIMARY KEY (community_id, account_id)
);
