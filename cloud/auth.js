const randomId = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
const duration = 86_400_000

export async function sessionKey(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return 'sha256:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function providerConfig(env, provider) {
  const prefix = provider === 'twitch' ? 'TWITCH_WEB' : 'KICK_WEB'
  const id = env[prefix + '_CLIENT_ID']
  const secret = env[prefix + '_CLIENT_SECRET']
  return id && secret ? { id, secret } : null
}

async function oauthJson(url, options) {
  try {
    const response = await fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(8000) })
    return response.ok ? await response.json() : null
  } catch { return null }
}

export async function platformIdentity(provider, config, code, redirect, verifier, includeToken = false) {
  const isKick = provider === 'kick'
  const token = await oauthJson(isKick ? 'https://id.kick.com/oauth/token' : 'https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: config.id, client_secret: config.secret, code, grant_type: 'authorization_code',
      redirect_uri: redirect, ...(isKick ? { code_verifier: verifier } : {})
    })
  })
  if (typeof token?.access_token !== 'string' || !token.access_token) return null
  const data = await oauthJson(isKick ? 'https://api.kick.com/public/v1/users' : 'https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: (isKick ? 'Bearer ' : 'OAuth ') + token.access_token }
  })
  if (!data) return null
  if (!isKick && data.client_id !== config.id) return null
  const user = isKick ? data.data?.[0] : data
  const id = String(user?.user_id ?? '')
  return /^\d{1,24}$/.test(id) ? { viewerId: provider + ':' + id, login: String(user.name ?? user.login ?? ''),
    ...(includeToken ? { token } : {}) } : null
}

export async function signIn(db, identity, linkedAccountId) {
  const { viewerId, login } = identity
  const accountId = linkedAccountId || randomId()
  const providerPrefix = viewerId.split(':', 1)[0] + ':'
  const now = Date.now()
  const session = randomId()
  const statements = []
  if (!linkedAccountId) {
    statements.push(db.prepare(
      'INSERT INTO accounts SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM account_identities WHERE viewer_id = ?)'
    ).bind(accountId, now, viewerId))
  }
  statements.push(
    db.prepare('INSERT INTO account_identities (viewer_id, account_id, login) SELECT ?, ?, ? ' +
      'WHERE NOT EXISTS (SELECT 1 FROM account_identities WHERE account_id = ? AND viewer_id != ? AND substr(viewer_id, 1, ?) = ?) ' +
      'AND EXISTS (SELECT 1 FROM accounts WHERE id = ?) ' +
      'ON CONFLICT(viewer_id) DO UPDATE SET login = excluded.login, ' +
      'detached_at = CASE WHEN account_id = excluded.account_id THEN NULL ELSE detached_at END ' +
      'WHERE account_id = excluded.account_id OR (? IS NULL AND detached_at IS NULL)')
      .bind(viewerId, accountId, login, accountId, viewerId, providerPrefix.length, providerPrefix, accountId, linkedAccountId ?? null),
    db.prepare('DELETE FROM web_sessions WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO web_sessions (id, viewer_id, expires_at, login) ' +
      'SELECT ?, viewer_id, ?, login FROM account_identities WHERE viewer_id = ? AND detached_at IS NULL AND (? IS NULL OR account_id = ?)')
      .bind(await sessionKey(session), now + duration, viewerId, linkedAccountId ?? null, linkedAccountId ?? null)
  )
  // A fresh link must never share a generation with the deleted identity.
  statements.push(db.prepare('UPDATE erased_viewers SET generation = generation + 1 WHERE viewer_id = ? ' +
    'AND EXISTS (SELECT 1 FROM web_sessions WHERE id = ? AND viewer_id = ?) ' +
    'AND generation % 2 = 1').bind(viewerId, await sessionKey(session), viewerId))
  const result = await db.batch(statements)
  return result.at(-2).meta.changes === 1 ? session : null
}

export async function unlinkIdentity(db, accountId, viewerId) {
  const [update] = await db.batch([
    db.prepare('UPDATE account_identities SET detached_at = ? WHERE account_id = ? AND viewer_id = ? AND detached_at IS NULL ' +
      'AND EXISTS (SELECT 1 FROM account_identities other WHERE other.account_id = ? AND other.viewer_id != ? AND other.detached_at IS NULL)')
      .bind(Date.now(), accountId, viewerId, accountId, viewerId),
    db.prepare('DELETE FROM web_sessions WHERE viewer_id = ? AND EXISTS ' +
      '(SELECT 1 FROM account_identities WHERE account_id = ? AND viewer_id = ? AND detached_at IS NOT NULL)').bind(viewerId, accountId, viewerId)
  ])
  return update.meta.changes === 1
}

export async function eraseAccount(db, accountId) {
  const identities = 'SELECT viewer_id FROM account_identities WHERE account_id = ?'
  const statements = [
    db.prepare('INSERT INTO erased_viewers (viewer_id) ' + identities +
      ' ON CONFLICT(viewer_id) DO UPDATE SET generation = generation + 1').bind(accountId),
    db.prepare('INSERT OR IGNORE INTO erasure_devices SELECT community_id, viewer_id FROM viewer_progress WHERE viewer_id IN (' + identities + ')').bind(accountId),
    ...['viewer_progress', 'viewer_movesets', 'viewer_held_items', 'shop_orders', 'web_game_actions', 'web_sessions', 'kick_messages']
      .map(table => db.prepare('DELETE FROM ' + table + ' WHERE viewer_id IN (' + identities + ')').bind(accountId)),
    db.prepare('DELETE FROM account_identities WHERE account_id = ?').bind(accountId),
    db.prepare('DELETE FROM accounts WHERE id = ?').bind(accountId)
  ]
  await db.batch(statements)
}

export async function authorizeUrl(provider, config, redirect, state, verifier, scope = 'user:read') {
  const isKick = provider === 'kick'
  const url = new URL(isKick ? 'https://id.kick.com/oauth/authorize' : 'https://id.twitch.tv/oauth2/authorize')
  const params = new URLSearchParams({
    client_id: config.id, redirect_uri: redirect, response_type: 'code', scope: isKick ? scope : '', state
  })
  if (isKick) {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    params.set('code_challenge', btoa(String.fromCharCode(...hash)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''))
    params.set('code_challenge_method', 'S256')
  }
  url.search = params
  return url.href
}

