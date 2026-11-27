export function expireShopOrders(db, community, now) {
  return db.prepare("UPDATE shop_orders SET result = CASE WHEN dispatched_at IS NULL THEN 'expired' ELSE 'review' END " +
    'WHERE community_id = ? AND result IS NULL AND created_at <= ? AND (dispatched_at IS NULL OR dispatched_at <= ?)')
    .bind(community, now - 120_000, now - 600_000)
}
