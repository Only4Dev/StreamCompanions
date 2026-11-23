CREATE TABLE shop_online (
  community_id TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL
);

CREATE TABLE shop_orders (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  item TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  result TEXT
);
CREATE INDEX shop_orders_pending ON shop_orders(community_id, result, created_at);
CREATE INDEX shop_orders_viewer ON shop_orders(community_id, viewer_id, created_at DESC);
CREATE UNIQUE INDEX shop_one_pending ON shop_orders(community_id, viewer_id) WHERE result IS NULL;
