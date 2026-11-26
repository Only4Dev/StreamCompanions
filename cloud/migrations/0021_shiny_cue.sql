ALTER TABLE web_game_runtime ADD COLUMN shiny INTEGER NOT NULL DEFAULT 0;

CREATE TABLE shiny_cues (
  community_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  audio BLOB NOT NULL
);
