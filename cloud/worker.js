export { EncounterEvents } from './encounter-events.js'
import { completeProjectBot, projectBotAuthorization, twitchProjectReply } from './project-bots.js'
import { cueType, maxCueBytes } from '../ui/shiny-cue.js'
import { deviceWebGame, finishWebGame } from './web-game.js'
import { expireShopOrders } from './shop-queue.js'
import { finishAdminActions, pendingAdminActions } from './admin.js'
import { portal } from './portal.js'
import { readBattleTeams, readMovesets } from './movesets.js'
import { completeKickLink, kickDevice, kickWebhook, seal, startKickLink } from './kick.js'
import { arenaShopItems, heldItems } from '../ui/held-items.js'
import { isFirstStage } from '../ui/evolution.js'
import { battleSpecies } from '../dev/battle.js'
import { eggRarities } from '../ui/egg-rules.js'
import { eggRarity, specialEncounterTag } from '../ui/capture-rates.js'
import { validTraining } from '../ui/training.js'
import { featuredShopItems, normalizeShopPrices, shopItems, validShopQuantity } from '../ui/shop.js'

const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' }
})
const types = ['normal', 'great', 'ultra', 'master']
const activeIdentityPairs = "FROM account_identities t JOIN account_identities k USING (account_id) WHERE t.viewer_id LIKE 'twitch:%' AND t.detached_at IS NULL AND k.detached_at IS NULL AND k.viewer_id LIKE 'kick:%' AND EXISTS (SELECT 1 FROM viewer_progress p WHERE p.community_id = ? AND p.viewer_id IN (t.viewer_id, k.viewer_id))"

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
  const linkedToken = request.headers.get('X-Community-Device')
  if (linkedToken) {
    const linked = await authorizedDevice(request, db, 'Bearer ' + linkedToken)
    if (!linked || linked.key_hash !== hash) return json({ error: 'unauthorized' }, 401)
    await db.prepare('INSERT OR IGNORE INTO community_owners SELECT ?, community_id, key_hash FROM devices WHERE key_hash = ? AND revoked_at IS NULL')
      .bind(id, hash).run()
  }
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO community_owners SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM devices WHERE community_id = ? OR key_hash = ?)')
      .bind(id, login, hash, login, hash),
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

async function authorizedDevice(request, db, authorization = request.headers.get('Authorization')) {
  const token = authorization?.match(/^Bearer ([0-9a-f]{64})$/)?.[1]
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
  const writes = viewerWrites(db, device, viewers)
  if (writes instanceof Response) return writes
  await db.batch(writes)
  return json({ received: viewers.map(({ id, revision }) => ({ id, revision })) })
}

function viewerWrites(db, device, viewers) {
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
    const legendaryTrackers = viewer.legendaryTrackers ?? 0
    const shinyDust = viewer.shinyDust ?? 0
    const vitamins = viewer.vitamins ?? 0
    const eggPity = viewer.eggPity
    if (eggPity !== undefined && (!eggPity || Array.isArray(eggPity) || Object.keys(eggPity).length !== 3 ||
        !['rare', 'epic', 'legendary'].every(tier => Number.isSafeInteger(eggPity[tier]) && eggPity[tier] >= 0))) {
      return json({ error: 'invalid egg pity' }, 400)
    }
    const training = viewer.training ?? {}
    if (!training || Array.isArray(training) || typeof training !== 'object' || Object.entries(training).some(([id,row]) => !/^\d{1,5}$/.test(id) || !validTraining(row))) return json({error:'invalid training'},400)
    const pokeDollars = viewer.pokeDollars ?? 0
    const dnaBoosters = viewer.dnaBoosters ?? {}
    const dexAcquired = viewer.dexAcquired ?? {}
    if (!dexAcquired || typeof dexAcquired !== 'object' || Array.isArray(dexAcquired) || Object.entries(dexAcquired).some(([name, at]) =>
      !Object.hasOwn(viewer.collection, name) || !Number.isSafeInteger(at) || at < 0)) return json({ error: 'invalid dex acquisitions' }, 400)
    if (typeof dnaBoosters !== 'object' || Array.isArray(dnaBoosters) || Object.entries(dnaBoosters).some(([key, count]) =>
      !Object.hasOwn(viewer.collection, key) || !Number.isInteger(count) || count < 0 || count > 10)) return json({ error: 'invalid DNA boosters' }, 400)
    if (![rareCandies, legendaryTrackers, shinyDust, vitamins, pokeDollars].every(value => Number.isSafeInteger(value) && value >= 0)) return json({ error: 'invalid rewards' }, 400)
    if (!Array.isArray(items) || items.length > Object.keys(heldItems).length ||
        items.some(item => typeof item !== 'string' || !Object.hasOwn(heldItems, item))) return json({ error: 'invalid items' }, 400)
    const generation = viewer.generation ?? 0
    if (!Number.isSafeInteger(generation) || generation < 0) return json({ error: 'invalid generation' }, 400)
    const log = viewer.log ?? []
    const validCapture = ({ capture, result, action }) => capture === undefined ||
      (capture !== null && typeof capture === 'object' && !Array.isArray(capture) &&
       ['caught', 'duplicateReward', 'escaped'].includes(result) && /^!catch(?: |$)/.test(action) &&
       types.includes(capture.ball) && Number.isSafeInteger(capture.remaining) && capture.remaining >= 0 &&
       (capture.pokemon === undefined || (typeof capture.pokemon === 'string' && capture.pokemon.length <= 80)))
    if (!Array.isArray(log) || log.length > 30 || log.some(entry => !entry || !['kick', 'twitch'].includes(entry.platform) ||
        typeof entry.action !== 'string' || !entry.action.startsWith('!') || entry.action.length > 120 ||
        typeof entry.result !== 'string' || entry.result.length > 50 || !Number.isSafeInteger(entry.at) || entry.at < 0 || entry.at > 8.64e15 || !validCapture(entry))) {
      return json({ error: 'invalid activity log' }, 400)
    }
    ids.add(viewer.id)
    const balls = Object.fromEntries(types.map(type => [type, viewer.balls[type]]))
    writes.push(db.prepare(
      'INSERT INTO viewer_progress (community_id, viewer_id, revision, payload, updated_at) SELECT ?, ?, ?, ?, ? ' +
      'WHERE COALESCE((SELECT generation FROM erased_viewers WHERE viewer_id = ?), 0) = ? ' +
      'AND (? = 0 OR EXISTS (SELECT 1 FROM account_identities WHERE viewer_id = ?)) ' +
      'AND EXISTS (SELECT 1 FROM devices WHERE key_hash = ? AND revoked_at IS NULL) ' +
      'ON CONFLICT(community_id, viewer_id) DO UPDATE SET revision = excluded.revision, payload = excluded.payload, updated_at = excluded.updated_at ' +
      'WHERE excluded.revision > viewer_progress.revision'
    ).bind(device.community_id, viewer.id, viewer.revision,
        JSON.stringify({ displayName: viewer.displayName, balls, collection: viewer.collection, heldItems: [...new Set(items)], rareCandies, pokeDollars, dnaBoosters, ...(legendaryTrackers ? { legendaryTrackers } : {}), ...(shinyDust ? { shinyDust } : {}), ...(vitamins ? { vitamins } : {}), ...(Object.keys(training).length ? { training } : {}),
          ...(eggPity ? { eggPity } : {}), ...(Object.keys(dexAcquired).length ? { dexAcquired } : {}), log: log.slice(-8).map(({ at, platform, action, result, capture }) => ({
            at, platform, action, result, ...(capture ? { capture: { ball: capture.ball, remaining: capture.remaining, pokemon: capture.pokemon } } : {})
          })), metrics: { wins: metrics.wins, losses: metrics.losses, summonMinutes: metrics.summonMinutes } }), Date.now(), viewer.id, generation, generation, viewer.id, device.key_hash))
    writes.push(db.prepare('INSERT OR IGNORE INTO erasure_devices SELECT ?, viewer_id FROM erased_viewers WHERE viewer_id = ?')
      .bind(device.community_id, viewer.id))
  }
  return writes
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
    if (body.length > 6000) return json({ error: 'invalid roster' }, 400)
    candidates = JSON.parse(body)
  } catch { return json({ error: 'invalid roster' }, 400) }
  if (Array.isArray(candidates?.teams) && candidates.teams.length >= 1 && candidates.teams.length <= 12 &&
      candidates.teams.every(id => /^(twitch|kick):\d{1,24}$/.test(id))) return json(await readBattleTeams(db, device.community_id, candidates.teams))
  if (!Array.isArray(candidates) || !candidates.length || candidates.length > 36 || candidates.some(entry =>
    !/^(twitch|kick):\d{1,24}$/.test(entry?.viewerId ?? '') || typeof entry.speciesKey !== 'string' ||
    !entry.speciesKey.length || entry.speciesKey.length > 64)) return json({ error: 'invalid roster' }, 400)
  return json(await readMovesets(db, device.community_id, candidates))
}

async function deviceShop(request, db, events) {
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
        for (const item of ['master-ball', ...arenaShopItems, ...featuredShopItems]) {
          if (prices && !Object.hasOwn(raw, item)) delete prices[item]
        }
      } catch { /* invalid header */ }
      if (!prices) return json({ error: 'invalid prices' }, 400)
    }
    const packed = prices ? JSON.stringify(prices) : null
    const familyDna = request.headers.get('X-Shop-Family-Dna')
    const quantityVersion = request.headers.get('X-Shop-Quantity')
    const supportsQuantity = quantityVersion === '2' ? 2 : Number(quantityVersion === '1')
    const dnaLevel = dna ? (familyDna === '3' ? 4 : familyDna === '2' ? 3 : familyDna === '1' ? 2 : 1) : 0
    const now = Date.now()
    const eligible = 'FROM shop_orders WHERE community_id = ? AND result IS NULL ' +
      "AND (? IS NOT NULL OR price IS NULL) AND (? >= 3 OR species_key IS NULL) AND (quantity = 1 OR ? >= CASE WHEN item = 'poke-egg' THEN 2 ELSE 1 END) " +
      "AND (item NOT IN (SELECT value FROM json_each(?)) OR item IN (SELECT key FROM json_each(?))) " +
      'ORDER BY created_at, id LIMIT 10'
    const queue = [community, packed, dnaLevel, supportsQuantity, JSON.stringify(['master-ball', ...arenaShopItems, ...featuredShopItems]), packed]
    const [, , , pending] = await db.batch([
      expireShopOrders(db, community, now),
      db.prepare('UPDATE shop_orders SET dispatched_at = COALESCE(dispatched_at, ?) WHERE id IN (SELECT id ' + eligible + ') AND dispatched_at IS NULL').bind(now, ...queue),
      db.prepare('INSERT INTO shop_online (community_id, seen_at, prices, supports_dna, supports_quantity) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT (community_id) DO UPDATE SET seen_at = excluded.seen_at, prices = excluded.prices, supports_dna = excluded.supports_dna, supports_quantity = excluded.supports_quantity ' +
        'WHERE (excluded.prices IS NOT NULL OR shop_online.prices IS NULL) AND ' +
        '(shop_online.seen_at <= excluded.seen_at - 15000 OR shop_online.prices IS NOT excluded.prices OR ' +
        'shop_online.supports_dna != excluded.supports_dna OR shop_online.supports_quantity != excluded.supports_quantity)').bind(community, Date.now(), packed, dnaLevel, supportsQuantity),
      db.prepare('SELECT id, viewer_id AS viewerId, item, price, species_key AS speciesKey, quantity ' + eligible).bind(...queue)
    ])
    const state = request.headers.get('X-Web-Game')
    const broadcast = events && request.headers.get('X-Encounter-Changed') === '1' ? async encounter => {
      try {
        await events.getByName(community).fetch('https://encounters.internal/', {
          method: 'POST', body: JSON.stringify(encounter)
        })
      } catch (error) {
        console.warn('Encounter broadcast failed:', error.message)
      }
    } : undefined
    const webActions = state === null ? undefined : await deviceWebGame(db, device, state, broadcast)
    const linksRequested = request.headers.get('X-Identity-Links') === '1' ||
      request.headers.get('X-Identity-Orders') === '1' && pending.results.some(order => order.viewerId.startsWith('kick:'))
    const links = linksRequested ? (await db.prepare('SELECT k.viewer_id AS kickId, t.viewer_id AS twitchId ' + activeIdentityPairs).bind(community).all()).results : undefined
    const adminActions = request.headers.get('X-Admin-Actions') === '1' ? await pendingAdminActions(db, device) : undefined
    return json({ webActions, links, adminActions, orders: pending.results.map(({ price, speciesKey, quantity, ...order }) => ({ ...order,
      ...(quantity === 1 ? {} : { quantity }), ...(price === null ? {} : { price }), ...(speciesKey === null ? {} : { speciesKey }) })) })
  }
  if (request.method !== 'POST') return json({ error: 'invalid method' }, 405)
  let receipts
  try { receipts = (await readBatch(request)) } catch { return json({ error: 'invalid receipts' }, 400) }
  if (!Array.isArray(receipts) || receipts.length < 1 || receipts.length > 10) {
    return json({ error: 'invalid receipts' }, 400)
  }
  const received = []
  const reject = (receipt, reason) => console.warn(JSON.stringify({ event: 'shop_receipt_rejected', receipt: receipt.id, reason }))
  const seenReceipts = new Set()
  for (const receipt of receipts) {
    if (seenReceipts.has(receipt?.id) || !/^[a-f0-9-]{36}$/.test(receipt?.id ?? '') ||
        !['unavailable', 'owned', 'funds', 'purchased', 'maxed', 'repriced', 'battleLocked'].includes(receipt?.result)) continue
    seenReceipts.add(receipt.id)
    const order = await db.prepare('SELECT viewer_id, result, item, quantity FROM shop_orders WHERE community_id = ? AND id = ?')
      .bind(community, receipt.id).first()
    const submittedViewer = receipt.viewer?.id
    const linkedOwner = order && submittedViewer && submittedViewer !== order.viewer_id &&
      await db.prepare('SELECT 1 AS linked ' + activeIdentityPairs + ' AND k.viewer_id = ? AND t.viewer_id = ?').bind(community, order.viewer_id, submittedViewer).first()
    if (!order || (receipt.viewer !== undefined && (receipt.result !== 'purchased' || (submittedViewer !== order.viewer_id && !linkedOwner)))) {
      reject(receipt, 'viewer')
      continue
    }
    if (order.result !== null && order.result !== 'review') { received.push(receipt.id); continue }
    const hatch = receipt.hatch
    const hatches = Array.isArray(hatch) ? hatch : hatch ? [hatch] : []
    const expectedCount = receipt.result === 'purchased' && order.item === 'poke-egg' ? Number(order.quantity ?? 1) : 0
    if (expectedCount !== hatches.length ||
        (Array.isArray(hatch) && (hatches.length < 2 || !validShopQuantity(shopItems['poke-egg'], hatches.length)))) {
      reject(receipt, 'hatch quantity')
      continue
    }
    const invalidHatch = hatches.some(hatch => {
      const row = battleSpecies(hatch?.id)
      const special = row && specialEncounterTag(hatch.id, Boolean(row[5]))
      let expected
      if (hatch?.rules === 5) {
        if (row && isFirstStage(hatch.id) && eggRarities.includes(hatch.rarity)) expected = hatch.rarity
      } else if (hatch?.rules === 3 || hatch?.rules === 4) {
        if (row && isFirstStage(hatch.id)) {
          if (special === 'legendary') expected = 'legendary'
          else if (!special && ['common', 'uncommon', 'rare', 'epic'].includes(hatch.rarity)) expected = hatch.rarity
        }
      } else expected = special === 'legendary' ? 'legendary' : !special && row ? eggRarity(hatch.id) : null
      return !row || row[0] !== hatch.id || !expected ||
          ((hatch.rules === 2 || special === 'legendary') && !isFirstStage(hatch.id)) ||
          typeof hatch.name !== 'string' || !Object.hasOwn(receipt.viewer?.collection ?? {}, hatch.name) ||
          hatch.rarity !== expected ||
          typeof hatch.duplicate !== 'boolean' || !Number.isFinite(hatch.xp) || hatch.xp < 0 || hatch.xp > Number.MAX_SAFE_INTEGER
    })
    if (invalidHatch) { reject(receipt, 'hatch'); continue }
    const results = hatches.map(hatch => ({ id: hatch.id, name: hatch.name, rarity: hatch.rarity,
      duplicate: hatch.duplicate, xp: Math.floor(hatch.xp), ...(hatch.levelUp === true && hatch.duplicate && hatch.xp > 0 ? { levelUp: true } : {}) }))
    const writes = viewerWrites(db, device, receipt.viewer ? [receipt.viewer] : [])
    if (writes instanceof Response) { reject(receipt, 'progress'); continue }
    const { id, result } = receipt
    await db.batch([...writes, db.prepare(
      "UPDATE shop_orders SET result = ?, hatch = ? WHERE community_id = ? AND id = ? AND (result IS NULL OR result = 'review') AND " +
      'EXISTS (SELECT 1 FROM devices WHERE key_hash = ? AND revoked_at IS NULL)'
    ).bind(result, results.length ? JSON.stringify(results.length === 1 ? results[0] : results) : null, community, id, device.key_hash)])
    received.push(id)
  }
  return received.length ? json({ received }) : json({ error: 'no valid shop receipts' }, 400)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const setupProvider = /^\/api\/project-bot\/(kick|twitch)$/.exec(path)?.[1]
    if (setupProvider && request.method === 'POST') return projectBotAuthorization(request, url, env, setupProvider)
    const callbackProvider = /^\/auth\/(kick|twitch)\/callback$/.exec(path)?.[1]
    if (callbackProvider && request.method === 'GET' && url.searchParams.get('state')?.startsWith('sc-project-bot-')) {
      return completeProjectBot(url, env, callbackProvider, seal)
    }
    if (path === '/api/twitch/bot-reply' && request.method === 'POST') return twitchProjectReply(request, env, await authorizedDevice(request, env.DB))
    if (path === '/webhooks/kick' && request.method === 'POST') return kickWebhook(request, env.DB)
    if (path === '/webhooks/kick' && request.method === 'GET') return json({ status: 'ready' })
    if (path === '/auth/kick/callback' && request.method === 'GET' && url.searchParams.get('state')?.startsWith('sc-kick-')) {
      return completeKickLink(url, env)
    }
    if (path === '/api/kick/register' && request.method === 'POST') {
      const hash = request.headers.get('X-Device-Fingerprint')
      if (!/^[0-9a-f]{64}$/.test(hash ?? '')) return json({ error: 'invalid device' }, 400)
      return startKickLink(url, env, hash)
    }
    if (path === '/api/devices/reset' && request.method === 'POST') {
      const device = await authorizedDevice(request, env.DB)
      const replacement = request.headers.get('X-Device-Fingerprint')
      if (!device || !/^[0-9a-f]{64}$/.test(replacement ?? '') || replacement === device.key_hash) return json({ error: 'invalid reset' }, 400)
      const db = env.DB
      const active = 'EXISTS (SELECT 1 FROM devices WHERE key_hash = ? AND revoked_at IS NULL)'
      const statements = [
        db.prepare('INSERT INTO devices (key_hash, community_id) SELECT ?, ? WHERE ' + active)
          .bind(replacement, device.community_id, device.key_hash),
        ...['viewer_progress', 'viewer_movesets', 'viewer_held_items', 'viewer_battle_teams', 'shop_orders', 'kick_messages', 'shop_online', 'community_stream_status', 'web_game_runtime', 'web_game_actions', 'portal_announcements']
          .map(table => db.prepare('DELETE FROM ' + table + ' WHERE community_id = ? AND ' + active).bind(device.community_id, device.key_hash)),
        db.prepare('UPDATE community_owners SET key_hash = ? WHERE key_hash = ? AND ' + active).bind(replacement, device.key_hash, device.key_hash),
        db.prepare('UPDATE devices SET revoked_at = ? WHERE key_hash = ? AND revoked_at IS NULL').bind(Date.now(), device.key_hash)
      ]
      const results = await db.batch(statements)
      return results[0].meta.changes ? new Response(null, { status: 204 }) : json({ error: 'device changed' }, 409)
    }
    if (path === '/api/devices/status' && request.method === 'GET') {
      const device = await authorizedDevice(request, env.DB)
      return device ? json({ community: device.community_id }) : json({ error: 'not paired' }, 404)
    }
    if (path.startsWith('/api/kick/')) return kickDevice(request, url, env, await authorizedDevice(request, env.DB))
    if (request.method === 'GET' && path === '/api/health') {
      const migration = await env.DB.prepare('SELECT version FROM schema_version WHERE version = 1').first()
      return json({ status: migration ? 'ok' : 'unavailable' }, migration ? 200 : 503)
    }
    if (request.method === 'POST' && path === '/api/stream-status') {
      const device = await authorizedDevice(request, env.DB)
      if (!device) return json({ error: 'unauthorized' }, 401)
      let platforms
      try { platforms = await readBatch(request) } catch { return json({ error: 'invalid status' }, 400) }
      if (!Array.isArray(platforms) || platforms.length > 2 || new Set(platforms.map(item => item?.provider)).size !== platforms.length ||
          platforms.some(item => !['twitch', 'kick'].includes(item?.provider) || !/^[a-z0-9_-]{1,30}$/i.test(item.login ?? '') ||
            typeof item.live !== 'boolean' || typeof item.thumbnail !== 'string' || item.thumbnail.length > 500)) return json({ error: 'invalid status' }, 400)
      await env.DB.prepare('INSERT INTO community_stream_status VALUES (?, ?, ?) ON CONFLICT(community_id) DO UPDATE SET ' +
        'seen_at = excluded.seen_at, platforms = excluded.platforms')
        .bind(device.community_id, Date.now(), JSON.stringify(platforms)).run()
      return new Response(null, { status: 204 })
    }
    if (request.method === 'POST' && path === '/api/announcements') {
      const device = await authorizedDevice(request, env.DB)
      if (!device) return json({ error: 'unauthorized' }, 401)
      let events
      try { events = await readBatch(request) } catch { return json({ error: 'invalid announcements' }, 400) }
      if (!Array.isArray(events) || !events.length || events.length > 12 || events.some(event =>
        !/^[a-f0-9]{32}$/.test(event?.id ?? '') || typeof event.message !== 'string' ||
        !event.message.trim() || event.message.length > 500)) return json({ error: 'invalid announcements' }, 400)
      return json({ received: events.length })
    }
    if (path === '/api/shiny-cue') {
      const device = await authorizedDevice(request, env.DB)
      if (!device) return json({ error: 'unauthorized' }, 401)
      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM shiny_cues WHERE community_id = ?').bind(device.community_id).run()
        return new Response(null, { status: 204 })
      }
      if (request.method !== 'PUT') return new Response(null, { status: 405 })
      const reader = request.body?.getReader()
      if (!reader) return new Response(null, { status: 400 })
      const bytes = new Uint8Array(maxCueBytes)
      let count = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (count + value.length > maxCueBytes) {
          await reader.cancel()
          return new Response(null, { status: 413 })
        }
        bytes.set(value, count)
        count += value.length
      }
      const audio = bytes.slice(0, count)
      const type = cueType(audio)
      if (!type) return new Response(null, { status: 415 })
      await env.DB.prepare('INSERT INTO shiny_cues VALUES (?, ?, ?) ON CONFLICT (community_id) DO UPDATE SET type = excluded.type, audio = excluded.audio')
        .bind(device.community_id, type, audio.buffer).run()
      return new Response(null, { status: 204 })
    }
    if (path === '/api/web-game') {
      const device = await authorizedDevice(request, env.DB)
      if (!device) return json({ error: 'unauthorized' }, 401)
      let receipts
      try { receipts = await readBatch(request) } catch { return json({ error: 'invalid receipts' }, 400) }
      const updates = Array.isArray(receipts) ? receipts.flatMap(receipt => receipt?.viewer ? [receipt.viewer] : []) : []
      const writes = viewerWrites(env.DB, device, updates)
      if (writes instanceof Response) return writes
      const received = await finishWebGame(request, env.DB, device, receipts, writes)
      return received ? json({ received }) : json({ error: 'invalid receipts' }, 400)
    }
    if (request.method === 'POST' && path === '/api/sync') return synchronize(request, env.DB)
    if (request.method === 'POST' && path === '/api/devices/register') return registerDevice(request, env.DB)
    if (request.method === 'POST' && path === '/api/movesets') return movesets(request, env.DB)
    if (path === '/api/identity-link' && request.method === 'GET') {
      const device = await authorizedDevice(request, env.DB)
      if (!device) return json({ error: 'unauthorized' }, 401)
      const viewer = url.searchParams.get('viewer') ?? ''
      if (!/^twitch:\d{1,24}$/.test(viewer)) return json({ error: 'invalid viewer' }, 400)
      const linked = await env.DB.prepare('SELECT k.viewer_id ' + activeIdentityPairs + ' AND t.viewer_id = ? LIMIT 1')
        .bind(device.community_id, viewer).first()
      return json({ kickId: linked?.viewer_id ?? null })
    }
    if (path === '/api/admin-actions' && request.method === 'POST') {
      const device = await authorizedDevice(request, env.DB)
      if (!device) return json({ error: 'unauthorized' }, 401)
      let receipts
      try { receipts = await readBatch(request) } catch { return json({ error: 'invalid admin receipts' }, 400) }
      const received = await finishAdminActions(env.DB, device, receipts)
      return received ? json({ received }) : json({ error: 'invalid admin receipts' }, 400)
    }
    if (path === '/api/shop') return deviceShop(request, env.DB, env.ENCOUNTER_EVENTS)
    if (request.method === 'GET' && path === '/api/privacy') return deviceErasure(request, env.DB)
    return await portal(request, new URL(request.url), env) ?? json({ error: 'not found' }, 404)
  }
}
