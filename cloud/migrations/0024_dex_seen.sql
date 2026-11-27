CREATE TABLE dex_seen (
  account_id TEXT NOT NULL,
  community_id TEXT NOT NULL,
  species_id INTEGER NOT NULL,
  seen_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, community_id, species_id)
);
