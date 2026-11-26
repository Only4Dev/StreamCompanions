CREATE TABLE web_game_runtime (
  community_id TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL,
  encounter_id TEXT,
  difficulty_en TEXT,
  difficulty_es TEXT
);

CREATE TABLE web_game_actions (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  command TEXT NOT NULL,
  encounter_id TEXT,
  created_at INTEGER NOT NULL,
  result TEXT
);
CREATE INDEX web_game_pending ON web_game_actions (community_id, result, created_at);
CREATE INDEX web_game_viewer ON web_game_actions (viewer_id);
