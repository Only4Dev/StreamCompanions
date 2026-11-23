import { portal } from './portal.js'
import { readMovesets } from './movesets.js'
import { completeKickLink, kickDevice, kickWebhook } from './kick.js'
import { heldItems } from '../ui/held-items.js'
import { normalizeShopPrices } from '../ui/shop.js'

const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' }
})
const types = ['normal', 'great', 'ultra', 'master']

async function registerDevice(request, db) {
  const token = request.headers.get('Authorization')?.match(/^OAuth ([a-zA-Z0-9]{20,128})$/)?.[1]
  const hash = request.headers.get('X-Device-Fingerprint')
  if (!token || !/^[0-9a-f]{64}$/.test(hash ?? '')) return json({ error: 'unauthorized' }, 401)
  let identity
  try {
    const result = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: 'OAuth ' + token }, redirect: 'manual', signal: AbortSignal.timeout(6000)
    })
    if (result.status === 401) return json({ error: 'unauthorized' }, 401)
    if (!result.ok) return json({ error: 'provider unavailable' }, 503)
    identity = await result.json()
  } catch { return json({ error: 'provider unavailable' }, 503) }
  const { client_id: client, user_id: id, login } = identity
  if (client !== 'm2vfvdba9flbjxhbq3nndyqx4tsdar' || !/^\d{1,24}$/.test(id ?? '') || !/^[a-z0-9_]{2,25}$/.test(login ?? '')) {
    return json({ error: 'unauthorized' }, 401)
  }
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO community_owners SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM devices WHERE community_id = ?)')
      .bind(id, login, hash, login),
    db.prepare('INSERT OR IGNORE INTO devices (key_hash, community_id) SELECT key_hash, community_id FROM community_owners WHERE twitch_id = ? AND key_hash = ?')
      .bind(id, hash)
  ])
  const device = await db.prepare('SELECT o.community_id FROM community_owners o JOIN devices d USING (key_hash) WHERE o.twitch_id = ? AND o.key_hash = ? AND d.community_id = o.community_id AND d.revoked_at IS NULL')
    .bind(id, hash).first()
  return device ? json({ community: device.community_id }) : json({ error: 'community already paired' }, 409)
}

async function readBatch(request) {
  const reader = request.body?.getReader()
  if (!reader) return null
  const decoder = new TextDecoder()
  let text = ''
  let bytes = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > 1_600_000) {
      await reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }
  return JSON.parse(text + decoder.decode())?.viewers
}

async function authorizedDevice(request, db) {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([0-9a-f]{64})$/)?.[1]
  if (!token) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return db.prepare('SELECT community_id, key_hash FROM devices WHERE key_hash = ? AND revoked_at IS NULL').bind(hash).first()
}

async function synchronize(request, db) {
  const device = await authorizedDevice(request, db)
  if (!device) return json({ error: 'unauthorized' }, 401)
  let viewers
  try { viewers = await readBatch(request) } catch { return json({ error: 'invalid batch' }, 400) }
  if (!Array.isArray(viewers) || viewers.length < 1 || viewers.length > 10) return json({ error: 'invalid batch' }, 400)

  const ids = new Set()
  const writes = []
  for (const viewer of viewers) {
    if (typeof viewer?.id !== 'string' || !/^(twitch|kick):\d{1,24}$/.test(viewer.id) || ids.has(viewer.id) ||
        !Number.isSafeInteger(viewer.revision) || viewer.revision < 1 ||
        typeof viewer.displayName !== 'string' || viewer.displayName.length > 100 ||
        !types.every(type => Number.isSafeInteger(viewer.balls?.[type]) && viewer.balls[type] >= 0) ||
        !viewer.collection || typeof viewer.collection !== 'object' || Array.isArray(viewer.collection)) {
      return json({ error: 'invalid viewer' }, 400)
    }
    const collection = Object.entries(viewer.collection)
    if (collection.length > 2050 || collection.some(([name, xp]) =>
      !name || name.length > 64 || !Number.isSafeInteger(xp) || xp < 0)) {
      return json({ error: 'invalid collection' }, 400)
    }
      const metrics = viewer.metrics ?? { wins: 0, losses: 0, summonMinutes: 0 }
      if (!['wins', 'losses', 'summonMinutes'].every(key => Number.isSafeInteger(metrics[key]) && metrics[key] >= 0)) {
        return json({ error: 'invalid metrics' }, 400)
      }
    const items = viewer.heldItems ?? []
    const rareCandies = viewer.rareCandies ?? 0
    const pokeDollars = viewer.pokeDollars ?? 0
    const dnaBoosters = viewer.dnaBoosters ?? {}
    if (typeof dnaBoosters !== 'object' || Array.isArray(dnaBoosters) || Object.entries(dnaBoosters).some(([key, count]) =>
      !Object.hasOwn(viewer.collection, key) || !Number.isInteger(count) || count < 0 || count > 10)) return json({ error: 'invalid DNA boosters' }, 400)
    if (![rareCandies, pokeDollars].every(value => Number.isSafeInteger(value) && value >= 0)) return json({ error: 'invalid rewards' }, 400)
    if (!Array.isArray(items) || items.length > Object.keys(heldItems).length ||
        items.some(item => typeof item !== 'string' || !Object.hasOwn(heldItems, item))) return json({ error: 'invalid items' }, 400)
    const generation = viewer.generation ?? 0
    if (!Number.isSafeInteger(generation) || generation < 0) return json({ error: 'invalid generation' }, 400)
    ids.add(viewer.id)
    const balls = Object.fromEntries(types.map(type => [type, viewer.balls[type]]))
    writes.push(db.prepare(
      'INSERT INTO viewer_progress (community_id, viewer_id, revision, payload, updated_at) SELECT ?, ?, ?, ?, ? ' +
      'WHERE COALESCE((SELECT generation FROM erased_viewers WHERE viewer_id = ?), 0) = ? ' +
      'AND (? = 0 OR EXISTS (SELECT 1 FROM account_identities WHERE viewer_id = ?)) ' +
      'ON CONFLICT(community_id, viewer_id) DO UPDATE SET revision = excluded.revision, payload = excluded.payload, updated_at = excluded.updated_at ' +
      'WHERE excluded.revision > viewer_progress.revision'
    ).bind(device.community_id, viewer.id, viewer.revision,
        JSON.stringify({ displayName: viewer.displayName, balls, collection: viewer.collection, heldItems: [...new Set(items)], rareCandies, pokeDollars, dnaBoosters,
          metrics: { wins: metrics.wins, losses: metrics.losses, summonMinutes: metrics.summonMinutes } }), Date.now(), viewer.id, generation, generation, viewer.id))
    writes.push(db.prepare('INSERT OR IGNORE INTO erasure_devices SELECT ?, viewer_id FROM erased_viewers WHERE viewer_id = ?')
      .bind(device.community_id, viewer.id))
  }
  await db.batch(writes)
  return json({ received: viewers.map(({ id, revision }) => ({ id, revision })) })
}

async function deviceErasure(request, db) {
  const device = await authorizedDevice(request, db)
  if (!device) return json({ error: 'unauthorized' }, 401)
  const { results } = await db.prepare('SELECT e.viewer_id, v.generation, EXISTS (SELECT 1 FROM account_identities i WHERE i.viewer_id = e.viewer_id) AS active ' +
    'FROM erasure_devices e JOIN erased_viewers v ON v.viewer_id = e.viewer_id WHERE e.community_id = ?')
    .bind(device.community_id).all()
  return json({ viewers: results.map(row => row.viewer_id), erasures: results })
}

async function movesets(request, db) {
  const device = await authorizedDevice(request, db)
  if (!device) return json({ error: 'unauthorized' }, 401)
  let candidates
  try {
    const body = await request.text()
    if (body.length > 2500) return json({ error: 'invalid roster' }, 400)
    candidates = JSON.parse(body)
  } catch { return json({ error: 'invalid roster' }, 400) }
  if (!Array.isArray(candidates) || !candidates.length || candidates.length > 12 || candidates.some(entry =>
    !/^(twitch|kick):\d{1,24}$/.test(entry?.viewerId ?? '') || typeof entry.speciesKey !== 'string' ||
    !entry.speciesKey.length || entry.speciesKey.length > 64)) return json({ error: 'invalid roster' }, 400)
  return json(await readMovesets(db, device.community_id, candidates))
}

async function deviceShop(request, db) {
  const device = await authorizedDevice(request, db)
  if (!device) return json({ error: 'unauthorized' }, 401)
  const community = device.community_id
  if (request.method === 'GET') {
    const header = request.headers.get('X-Shop-Prices')
    let prices = null
    let dna = false
    if (header !== null) {
      try {
        const raw = header.length <= 2048 ? JSON.parse(header) : null
        prices = normalizeShopPrices(raw)
        dna = Boolean(prices && Object.hasOwn(raw, 'dna-booster'))
      } catch { /* invalid header */ }
      if (!prices) return json({ error: 'invalid prices' }, 400)
    }
    const packed = prices ? JSON.stringify(prices) : null
    const [, pending] = await db.batch([
      db.prepare('INSERT INTO shop_online (community_id, seen_at, prices, supports_dna) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT (community_id) DO UPDATE SET seen_at = excluded.seen_at, prices = excluded.prices, supports_dna = excluded.supports_dna ' +
        'WHERE excluded.prices IS NOT NULL OR shop_online.prices IS NULL').bind(community, Date.now(), packed, Number(dna)),
      db.prepare('SELECT id, viewer_id AS viewerId, item, price, species_key AS speciesKey FROM shop_orders WHERE community_id = ? AND result IS NULL ' +
        'AND (? IS NOT NULL OR price IS NULL) AND (? = 1 OR species_key IS NULL) ORDER BY created_at LIMIT 10').bind(community, packed, Number(dna))
    ])
    return json({ orders: pending.results.map(({ price, speciesKey, ...order }) => ({ ...order,
      ...(price === null ? {} : { price }), ...(speciesKey === null ? {} : { speciesKey }) })) })
  }
  if (request.method !== 'POST') return json({ error: 'invalid method' }, 405)
  let receipts
  try { receipts = (await readBatch(request)) } catch { return json({ error: 'invalid receipts' }, 400) }
  if (!Array.isArray(receipts) || receipts.length < 1 || receipts.length > 10 || receipts.some(row =>
    !/^[a-f0-9-]{36}$/.test(row?.id ?? '') || !['unavailable', 'owned', 'funds', 'purchased', 'maxed'].includes(row?.result))) {
    return json({ error: 'invalid receipts' }, 400)
  }
  await db.batch(receipts.map(({ id, result }) => db.prepare('UPDATE shop_orders SET result = ? WHERE community_id = ? AND id = ? AND result IS NULL')
    .bind(result, community, id)))
  return json({ received: receipts.map(({ id }) => id) })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    if (path === '/webhooks/kick' && request.method === 'POST') return kickWebhook(request, env.DB)
    if (path === '/webhooks/kick' && request.method === 'GET') return json({ status: 'ready' })
    if (path === '/auth/kick/callback' && request.method === 'GET' && url.searchParams.get('state')?.startsWith('sc-kick-')) {
      return completeKickLink(url, env)
    }
    if (path.startsWith('/api/kick/')) return kickDevice(request, url, env, await authorizedDevice(request, env.DB))
    if (request.method === 'GET' && path === '/api/health') {
      const migration = await env.DB.prepare('SELECT version FROM schema_version WHERE version = 1').first()
      return json({ status: migration ? 'ok' : 'unavailable' }, migration ? 200 : 503)
    }
    if (request.method === 'POST' && path === '/api/sync') return synchronize(request, env.DB)
    if (request.method === 'POST' && path === '/api/devices/register') return registerDevice(request, env.DB)
    if (request.method === 'POST' && path === '/api/movesets') return movesets(request, env.DB)
    if (path === '/api/shop') return deviceShop(request, env.DB)
    if (request.method === 'GET' && path === '/api/privacy') return deviceErasure(request, env.DB)
    return await portal(request, new URL(request.url), env) ?? json({ error: 'not found' }, 404)
  }
}
