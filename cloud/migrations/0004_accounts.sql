CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE account_identities (
  viewer_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  login TEXT NOT NULL DEFAULT ''
);
CREATE INDEX account_identities_by_account ON account_identities(account_id);

CREATE TABLE existing_identities (viewer_id TEXT PRIMARY KEY, account_id TEXT NOT NULL);
INSERT INTO existing_identities
SELECT viewer_id, lower(hex(randomblob(16)))
FROM (SELECT viewer_id FROM viewer_progress UNION SELECT viewer_id FROM web_sessions);
INSERT INTO accounts SELECT account_id, unixepoch() * 1000 FROM existing_identities;
INSERT INTO account_identities
SELECT viewer_id, account_id, coalesce((
  SELECT login FROM web_sessions WHERE web_sessions.viewer_id = existing_identities.viewer_id
  ORDER BY expires_at DESC LIMIT 1
), '') FROM existing_identities;
DROP TABLE existing_identities;
