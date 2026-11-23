ALTER TABLE shop_orders ADD COLUMN species_key TEXT;
ALTER TABLE shop_online ADD COLUMN supports_dna INTEGER NOT NULL DEFAULT 0;
