CREATE TABLE portal_announcements (
  community_id TEXT NOT NULL,
  id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (community_id, id)
);
CREATE INDEX portal_announcements_recent ON portal_announcements (community_id, created_at DESC);
