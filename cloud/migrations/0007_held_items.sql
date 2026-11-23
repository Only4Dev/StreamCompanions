CREATE TABLE viewer_held_items (
  community_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  species_key TEXT NOT NULL,
  item TEXT NOT NULL,
  PRIMARY KEY (community_id, viewer_id, species_key)
);
