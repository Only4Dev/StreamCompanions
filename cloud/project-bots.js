import { authorizeUrl, platformIdentity, providerConfig } from './auth.js'

export const projectBotLogin = 'streamcompanionsbot'
const json = (body, status) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const callback = (url, provider) => url.origin + '/auth/' + provider + '/callback'
const random = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
let twitchAccess

export async function projectBotAuthorization(request, url, env, provider) {
  if (!env.PROJECT_BOT_SETUP_KEY || request.headers.get('Authorization') !== 'Bearer ' + env.PROJECT_BOT_SETUP_KEY) {
    return json({ error: 'unauthorized' }, 401)
  }
  const config = providerConfig(env, provider)
  if (!config || (provider === 'kick' && !env.KICK_TOKEN_KEY)) return json({ error: 'provider unavailable' }, 503)
  const state = 'sc-project-bot-' + random()
  const verifier = random()
  await env.DB.batch([
    env.DB.prepare('DELETE FROM project_bot_pairings WHERE provider = ? OR expires_at <= ?').bind(provider, Date.now()),
    env.DB.prepare('INSERT INTO project_bot_pairings VALUES (?, ?, ?, ?)').bind(state, provider, verifier, Date.now() + 600_000)
  ])
  const auth = new URL(await authorizeUrl(provider, config, callback(url, provider), state, verifier,
    provider === 'twitch' ? 'user:write:chat user:bot' : 'user:read chat:write'))
  if (provider === 'twitch') {
    auth.searchParams.set('scope', 'user:write:chat user:bot')
    auth.searchParams.set('force_verify', 'true')
  }
  return json({ url: auth.href }, 200)
}

export async function completeProjectBot(url, env, provider, store) {
  const config = providerConfig(env, provider)
  const code = url.searchParams.get('code')
  if (!config || !code) return json({ error: 'authorization cancelled' }, 400)
  const pairing = await env.DB.prepare('DELETE FROM project_bot_pairings WHERE state = ? AND provider = ? AND expires_at > ? RETURNING verifier')
    .bind(url.searchParams.get('state'), provider, Date.now()).first()
  if (!pairing) return json({ error: 'authorization expired' }, 400)
  const identity = await platformIdentity(provider, config, code, callback(url, provider), pairing.verifier, true)
  if (identity?.login.toLowerCase() !== projectBotLogin) return json({ error: 'authorize streamcompanionsbot' }, 403)
  const userId = identity.viewerId.split(':')[1]
  if (provider === 'kick' && !identity.token.refresh_token) return json({ error: 'Kick authorization cannot be renewed' }, 403)
  const encrypted = provider === 'kick' ? await store(env, 'project:kick', identity.token) : ''
  await env.DB.prepare('INSERT INTO project_bots VALUES (?, ?, ?) ON CONFLICT(provider) DO UPDATE SET user_id = excluded.user_id, encrypted_tokens = excluded.encrypted_tokens')
    .bind(provider, userId, encrypted).run()
  return new Response('Bot autorizado. Puedes cerrar esta pestaña.', { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } })
}

async function twitchAppToken(config) {
  if (twitchAccess?.client === config.id && twitchAccess.expires > Date.now()) return twitchAccess.token
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: config.id, client_secret: config.secret }),
    signal: AbortSignal.timeout(6000), redirect: 'manual'
  })
  if (!response.ok) return null
  const { access_token: token, expires_in: ttl } = await response.json()
  if (typeof token !== 'string' || !Number.isFinite(ttl)) return null
  twitchAccess = { client: config.id, token, expires: Date.now() + Math.max(0, ttl - 60) * 1000 }
  return token
}

export async function twitchProjectReply(request, env, device) {
  if (!device) return twitchFailure('deviceUnauthorized', 401)
  const { message } = await request.json().catch(() => ({})) ?? {}
  if (typeof message !== 'string' || !message.trim() || message.length > 500) return json({ error: 'invalid message' }, 400)
  const config = providerConfig(env, 'twitch')
  if (!config) return twitchFailure('twitchAppNotConfigured', 503)
  const identity = await env.DB.prepare("SELECT o.twitch_id AS broadcaster, b.user_id AS sender FROM community_owners o JOIN project_bots b ON b.provider = 'twitch' WHERE o.community_id = ? AND o.key_hash = ?")
    .bind(device.community_id, device.key_hash).first()
  if (!identity) return twitchFailure('twitchChannelNotPaired', 409)
  if (identity.broadcaster === identity.sender) return twitchFailure('twitchSameAccount', 409)
  let phase = 'token'
  try {
    const token = await twitchAppToken(config)
    if (!token) return twitchFailure('twitchAppTokenRejected', 503)
    phase = 'send'
    const response = await fetch('https://api.twitch.tv/helix/chat/messages', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Client-Id': config.id, 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcaster_id: identity.broadcaster, sender_id: identity.sender, message }),
      signal: AbortSignal.timeout(6000), redirect: 'manual'
    })
    const payload = await response.json().catch(() => ({}))
    const delivery = payload?.data?.[0]
    if (response.ok && delivery?.is_sent === true) return new Response(null, { status: 204 })
    const drop = delivery?.drop_reason?.code
    if (response.status === 401) {
      const detail = typeof payload?.message === 'string' ? payload.message.toLowerCase() : ''
      const reason = detail.includes('user:bot') || detail.includes('user:write:chat') ? 'twitchBotGrant' :
        detail.includes('channel:bot') ? 'twitchChannelGrant' : 'twitchUnauthorized'
      return twitchFailure(reason, 502, response.status)
    }
    return twitchFailure(response.status === 403 ? 'twitchChatRestricted' : response.status === 429 ? 'twitchRateLimited' :
      drop === 'automod_held' ? 'twitchAutoMod' : 'twitchMessageRejected', 502, response.status)
  } catch (error) {
    console.warn('Shared Twitch bot transport failed', phase, error.name, error.cause?.code ?? '')
    return twitchFailure('twitchUnavailable', 502)
  }
}

function twitchFailure(reason, status, providerStatus) {
  console.warn('Shared Twitch bot delivery failed', reason, providerStatus ?? '')
  return json({ error: 'Twitch bot delivery failed', reason, providerStatus }, status)
}
