CREATE TABLE viewer_movesets (
  community_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  species_key TEXT NOT NULL,
  moves TEXT NOT NULL,
  PRIMARY KEY (community_id, viewer_id, species_key)
);
