CREATE TABLE erased_viewers (viewer_id TEXT PRIMARY KEY);
CREATE TABLE erasure_devices (
  community_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  PRIMARY KEY (community_id, viewer_id)
);
