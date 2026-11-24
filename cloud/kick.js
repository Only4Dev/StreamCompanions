import { authorizeUrl, platformIdentity, providerConfig } from './auth.js'

const api = 'https://api.kick.com/public/v1/'
const chatEvent = 'chat.message.sent'
const text = new TextEncoder()
const decode = new TextDecoder()
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
const binary = value => Uint8Array.from(atob(value), character => character.charCodeAt(0))
const base64 = value => btoa(String.fromCharCode(...new Uint8Array(value)))
const tokenId = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
let keyCache
let appAccess

async function verificationKey(refresh = false) {
  if (!refresh && keyCache?.expires > Date.now()) return keyCache.key
  const response = await fetch(api + 'public-key')
  if (!response.ok) throw Error('Kick public key unavailable')
  const { data } = await response.json()
  const pem = data.public_key.replace(/-----[^-]+-----|\s/g, '')
  const key = await crypto.subtle.importKey('spki', binary(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  keyCache = { key, expires: Date.now() + 600_000 }
  return key
}

export async function verifyKickMessage(key, messageId, timestamp, body, signature) {
  try {
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, binary(signature), text.encode(messageId + '.' + timestamp + '.' + body))
  } catch { return false }
}

const settingsKey = env => crypto.subtle.importKey('raw', binary(env.KICK_TOKEN_KEY), 'AES-GCM', false, ['encrypt', 'decrypt'])
async function seal(env, community, token) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const packed = text.encode(JSON.stringify({
    access: token.access_token, refresh: token.refresh_token, expires: Date.now() + token.expires_in * 1000
  }))
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: text.encode(community) }, await settingsKey(env), packed)
  return base64(iv) + '.' + base64(sealed)
}

async function unseal(env, channel) {
  const [iv, packed] = channel.encrypted_tokens.split('.').map(binary)
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: text.encode(channel.community_id) }, await settingsKey(env), packed)
  return JSON.parse(decode.decode(data))
}

export async function kickWebhook(request, db) {
  const id = request.headers.get('Kick-Event-Message-Id')
  const stamp = request.headers.get('Kick-Event-Message-Timestamp')
  const signature = request.headers.get('Kick-Event-Signature')
  const age = Math.abs(Date.now() - Date.parse(stamp ?? ''))
  if (!id || id.length > 100 || !signature || signature.length > 1024 || !(age <= 300_000)) return json({ error: 'invalid signature' }, 401)
  const body = await request.text()
  if (body.length > 32_768) return json({ error: 'payload too large' }, 413)
  const verify = key => verifyKickMessage(key, id, stamp, body, signature)
  try {
    if (!(await verify(await verificationKey()))) {
      // Only force a refresh once per cache window to avoid sending a key request per bad signature.
      if (keyCache.expires - Date.now() > 570_000 || !(await verify(await verificationKey(true)))) {
        return json({ error: 'invalid signature' }, 401)
      }
    }
  } catch { return json({ error: 'verification unavailable' }, 503) }
  if (request.headers.get('Kick-Event-Type') !== chatEvent) return new Response(null, { status: 204 })
  let event
  try { event = JSON.parse(body) } catch { return json({ error: 'invalid event' }, 400) }
  const broadcaster = String(event.broadcaster?.user_id ?? '')
  const sender = String(event.sender?.user_id ?? '')
  if (!/^\d{1,24}$/.test(broadcaster) || !/^\d{1,24}$/.test(sender) || event.sender?.is_bot ||
      event.sender?.is_anonymous || typeof event.content !== 'string') return new Response(null, { status: 204 })
  let content = event.content.trim().slice(0, 500)
  if (!content) return new Response(null, { status: 204 })
  const displayText = content
  if (!content.startsWith('!')) {
    content = 'activity:' + base64(await crypto.subtle.digest('SHA-256', text.encode(content.toLowerCase())))
  }
  await db.prepare('INSERT OR IGNORE INTO kick_messages (message_id, community_id, viewer_id, display_name, content, received_at, display_text) ' +
    'SELECT ?, k.community_id, ?, ?, ?, ?, CASE WHEN EXISTS (SELECT 1 FROM community_stream_status s WHERE s.community_id = k.community_id AND s.seen_at > ?) THEN ? ELSE NULL END FROM kick_channels k WHERE broadcaster_id = ? ' +
    'AND (NOT EXISTS (SELECT 1 FROM erased_viewers WHERE viewer_id = ?) OR EXISTS (SELECT 1 FROM account_identities WHERE viewer_id = ?))')
    .bind(id, 'kick:' + sender, String(event.sender.username ?? 'Viewer').slice(0, 100), content, Date.now(), Date.now() - 90_000, displayText, broadcaster, 'kick:' + sender, 'kick:' + sender).run()
  await db.prepare('UPDATE kick_messages SET display_text = NULL WHERE display_text IS NOT NULL AND received_at < ?').bind(Date.now() - 90_000).run()
  return new Response(null, { status: 204 })
}

const callbackUrl = url => url.origin + '/auth/kick/callback'
const callbackPage = (message, status = 200) => new Response(
  '<!doctype html><html lang="es"><meta charset="UTF-8"><title>Stream Companions</title><main><h1>Kick</h1><p>' +
  message + '</p></main></html>', { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })

export async function startKickLink(url, env, hash, community = '') {
  const config = providerConfig(env, 'kick')
  if (!config || !env.KICK_TOKEN_KEY) return json({ error: 'Kick is not configured' }, 503)
  const state = 'sc-kick-' + tokenId()
  const verifier = tokenId()
  await env.DB.batch([
    env.DB.prepare('DELETE FROM kick_pairings WHERE expires_at <= ? OR device_hash = ?').bind(Date.now(), hash),
    env.DB.prepare('INSERT INTO kick_pairings VALUES (?, ?, ?, ?, ?)').bind(state, community, hash, verifier, Date.now() + 600_000)
  ])
  return json({ url: await authorizeUrl('kick', config, callbackUrl(url), state, verifier, 'user:read events:subscribe chat:write') })
}

export async function completeKickLink(url, env) {
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  const config = providerConfig(env, 'kick')
  if (!code || !config || !env.KICK_TOKEN_KEY) return callbackPage('La autorización no está disponible. Vuelve a la app para intentar de nuevo.', 400)
  const pairing = await env.DB.prepare('DELETE FROM kick_pairings WHERE state = ? AND expires_at > ? ' +
    "AND (community_id = '' OR EXISTS (SELECT 1 FROM devices WHERE key_hash = kick_pairings.device_hash AND revoked_at IS NULL)) " +
    'RETURNING community_id, device_hash, verifier').bind(state, Date.now()).first()
  if (!pairing) return callbackPage('El enlace venció. Pulsa Conectar Kick otra vez desde la app.', 400)
  const identity = await platformIdentity('kick', config, code, callbackUrl(url), pairing.verifier, true)
  if (!identity?.token.refresh_token) return callbackPage('Kick no autorizó el canal. Revisa los permisos e inténtalo de nuevo.', 403)
  const broadcaster = identity.viewerId.slice(5)
  const community = pairing.community_id || 'kick-' + broadcaster
  const linked = await env.DB.prepare('SELECT community_id FROM kick_channels WHERE broadcaster_id = ? OR community_id = ?')
    .bind(broadcaster, community).all()
  if (linked.results.some(item => item.community_id !== community) || !pairing.community_id && linked.results.length) {
    return callbackPage('Este canal ya está vinculado a otra comunidad.', 409)
  }
  const headers = { Authorization: 'Bearer ' + identity.token.access_token, 'Content-Type': 'application/json' }
  const subscription = await fetch(api + 'events/subscriptions', {
    method: 'POST', headers,
    body: JSON.stringify({ broadcaster_user_id: Number(broadcaster), events: [{ name: chatEvent, version: 1 }], method: 'webhook' })
  })
  const { data } = await subscription.json().catch(() => ({}))
  if (!subscription.ok || !data?.some(item => item.name === chatEvent && !item.error)) {
    const existing = await fetch(api + 'events/subscriptions?broadcaster_user_id=' + broadcaster, { headers })
    const { data: rows } = await existing.json().catch(() => ({}))
    if (!existing.ok || !rows?.some(item => (item.event ?? item.name) === chatEvent && String(item.broadcaster_user_id) === broadcaster)) {
      return callbackPage('Kick no pudo suscribir el chat. Comprueba que el webhook y los permisos estén activos.', 502)
    }
  }
  const statements = []
  if (!pairing.community_id) statements.push(env.DB.prepare(
    'INSERT OR IGNORE INTO devices (key_hash, community_id) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM devices WHERE community_id = ?) ' +
    'AND NOT EXISTS (SELECT 1 FROM kick_channels WHERE broadcaster_id = ?)').bind(pairing.device_hash, community, community, broadcaster))
  statements.push(env.DB.prepare('INSERT INTO kick_channels SELECT ?, ?, ?, ? WHERE EXISTS ' +
    '(SELECT 1 FROM devices WHERE key_hash = ? AND community_id = ? AND revoked_at IS NULL) ' +
    'AND NOT EXISTS (SELECT 1 FROM kick_channels WHERE broadcaster_id = ? AND community_id != ?) ' +
    'ON CONFLICT(community_id) DO UPDATE SET broadcaster_id = excluded.broadcaster_id, login = excluded.login, encrypted_tokens = excluded.encrypted_tokens')
    .bind(community, broadcaster, identity.login, await seal(env, community, identity.token), pairing.device_hash, community, broadcaster, community))
  const results = await env.DB.batch(statements)
  if (!results.at(-1).meta.changes) return callbackPage('Este canal ya está vinculado a otra comunidad.', 409)
  return callbackPage('Canal conectado. Puedes volver a Stream Companions.')
}

async function kickLive(env, channel) {
  if (!appAccess || appAccess.expires <= Date.now()) {
    const config = providerConfig(env, 'kick')
    if (!config) return null
    const response = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: config.id, client_secret: config.secret }),
      signal: AbortSignal.timeout(5000)
    })
    if (!response.ok) return null
    const token = await response.json()
    if (!token.access_token || !Number.isFinite(token.expires_in)) return null
    appAccess = { token: token.access_token, expires: Date.now() + Math.max(0, token.expires_in - 30) * 1000 }
  }
  const response = await fetch(api + 'channels?broadcaster_user_id=' + channel.broadcaster_id, {
    headers: { Authorization: 'Bearer ' + appAccess.token }, signal: AbortSignal.timeout(5000)
  })
  if (!response.ok) return null
  const { data } = await response.json()
  const found = data?.[0]
  if (!found || typeof found.stream?.is_live !== 'boolean') return null
  return { login: found.slug ?? channel.login, live: found.stream.is_live, thumbnail: found.stream.thumbnail ?? '' }
}

async function channelAccess(env, channel) {
  const token = await unseal(env, channel)
  if (token.expires > Date.now() + 90_000) return token.access
  const config = providerConfig(env, 'kick')
  const response = await fetch('https://id.kick.com/oauth/token', { method: 'POST', body: new URLSearchParams({
    grant_type: 'refresh_token', client_id: config.id, client_secret: config.secret, refresh_token: token.refresh
  }) })
  if (!response.ok) throw Error('Kick renewal failed')
  const renewed = await response.json()
  await env.DB.prepare('UPDATE kick_channels SET encrypted_tokens = ? WHERE community_id = ? AND encrypted_tokens = ?')
    .bind(await seal(env, channel.community_id, { ...renewed, refresh_token: renewed.refresh_token ?? token.refresh }),
      channel.community_id, channel.encrypted_tokens).run()
  return renewed.access_token
}

export async function kickDevice(request, url, env, device) {
  if (!device) return json({ error: 'unauthorized' }, 401)
  const { community_id: community, key_hash: hash } = device
  if (request.method === 'POST' && url.pathname === '/api/kick/connect') {
    return startKickLink(url, env, hash, community)
  }
  const channel = await env.DB.prepare('SELECT * FROM kick_channels WHERE community_id = ?').bind(community).first()
  if (!channel) return request.method === 'GET' ? json({ connected: false, events: [] }) : json({ error: 'channel not connected' }, 409)
  if (request.method === 'GET' && url.pathname === '/api/kick/live') {
    try { return json({ channel: await kickLive(env, channel) }) } catch { return json({ channel: null }) }
  }
  if (request.method === 'GET' && url.pathname === '/api/kick/events') {
    const cursor = Number(url.searchParams.get('after') ?? 0)
    if (!Number.isSafeInteger(cursor) || cursor < 0) return json({ error: 'invalid cursor' }, 400)
    const modern = url.searchParams.get('privacy') === '2'
    const { results } = await env.DB.prepare(
      "WITH messages AS (SELECT m.sequence, m.viewer_id, m.display_name, m.content, m.display_text, m.received_at, (SELECT i.viewer_id FROM account_identities k JOIN account_identities i ON i.account_id = k.account_id WHERE k.viewer_id = m.viewer_id AND k.detached_at IS NULL AND i.viewer_id LIKE 'twitch:%' AND i.detached_at IS NULL ORDER BY i.viewer_id LIMIT 1) AS twitch_id " +
      'FROM kick_messages m WHERE m.community_id = ? AND m.sequence > ? AND m.received_at > ?) ' +
      'SELECT m.*, COALESCE(k.generation, 0) AS kick_generation, COALESCE(t.generation, 0) AS twitch_generation ' +
      'FROM messages m LEFT JOIN erased_viewers k ON k.viewer_id = m.viewer_id LEFT JOIN erased_viewers t ON t.viewer_id = m.twitch_id ' +
      'WHERE (? = 1 OR (k.generation IS NULL AND t.generation IS NULL)) ' +
      'AND (k.generation IS NULL OR EXISTS (SELECT 1 FROM account_identities i WHERE i.viewer_id = m.viewer_id)) ORDER BY sequence LIMIT 50'
    ).bind(community, cursor, Date.now() - 90_000, Number(modern)).all()
    const erasures = new Map()
    for (const event of results) {
      if (event.kick_generation) erasures.set(event.viewer_id, { viewer_id: event.viewer_id, generation: event.kick_generation, active: 1 })
      if (event.twitch_generation) erasures.set(event.twitch_id, { viewer_id: event.twitch_id, generation: event.twitch_generation, active: 1 })
    }
    if (cursor || results.length) await env.DB.prepare('DELETE FROM kick_messages WHERE received_at < ?').bind(Date.now() - 600_000).run()
    return json({ connected: true, login: channel.login, events: results, erasures: [...erasures.values()] })
  }
  if (request.method === 'POST' && url.pathname === '/api/kick/reply') {
    const data = await request.json().catch(() => null)
    if (typeof data?.message !== 'string' || !data.message || data.message.length > 500) return json({ error: 'invalid message' }, 400)
    try {
      const headers = { Authorization: 'Bearer ' + await channelAccess(env, channel), 'Content-Type': 'application/json' }
      const send = async type => {
        const response = await fetch(api + 'chat', {
          method: 'POST', headers, signal: AbortSignal.timeout(6000),
          body: JSON.stringify({ broadcaster_user_id: Number(channel.broadcaster_id), content: data.message, type })
        })
        const payload = await response.json().catch(() => ({}))
        return { sent: response.ok && payload.data?.is_sent === true, rejected: [400, 401, 403, 404].includes(response.status) || (response.ok && payload.data?.is_sent === false) }
      }
      const bot = await send('bot')
      if (bot.sent) return new Response(null, { status: 204, headers: { 'X-Chat-Identity': 'bot' } })
      if (bot.rejected && (await send('user')).sent) return new Response(null, { status: 204, headers: { 'X-Chat-Identity': 'channel' } })
      return json({ error: 'Kick rejected reply' }, 502)
    } catch { return json({ error: 'Kick reply unavailable' }, 502) }
  }
  return json({ error: 'not found' }, 404)
}
