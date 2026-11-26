const actionId = /^[a-f0-9-]{36}$/
const encounterId = /^\d{1,16}:\d{1,12}$/
const viewerId = /^(twitch|kick):\d{1,24}$/
const isPlatform = value => value === 'twitch' || value === 'kick'

export async function deviceWebGame(db, device, header) {
  let runtime
  try { runtime = JSON.parse(header) } catch { return [] }
  const id = encounterId.test(runtime?.id ?? '') ? runtime.id : null
  const difficulty = language => id && typeof runtime[language] === 'string' ? runtime[language].slice(0, 40) : null
  const now = Date.now()
  const [, pending] = await db.batch([
    db.prepare(
      'INSERT INTO web_game_runtime VALUES (?, ?, ?, ?, ?) ON CONFLICT (community_id) DO UPDATE SET ' +
      'seen_at = excluded.seen_at, encounter_id = excluded.encounter_id, difficulty_en = excluded.difficulty_en, ' +
      'difficulty_es = excluded.difficulty_es WHERE web_game_runtime.seen_at <= excluded.seen_at - 10000 OR ' +
      'web_game_runtime.encounter_id IS NOT excluded.encounter_id'
    ).bind(device.community_id, now, id, difficulty('en'), difficulty('es')),
    db.prepare('SELECT id, viewer_id AS viewerId, platform, command, encounter_id AS encounterId, created_at AS createdAt ' +
      'FROM web_game_actions WHERE community_id = ? AND result IS NULL AND created_at > ? ORDER BY created_at, id LIMIT 10')
      .bind(device.community_id, now - 15000)
  ])
  return pending.results
}

export async function finishWebGame(request, db, device, receipts) {
  if (request.method !== 'POST' || !Array.isArray(receipts) || !receipts.length || receipts.length > 10 ||
      receipts.some(receipt => !actionId.test(receipt?.id ?? '') || !/^[a-zA-Z]{1,40}$/.test(receipt?.result ?? ''))) return null
  await db.batch(receipts.map(({ id, result }) => db.prepare(
    'UPDATE web_game_actions SET result = ? WHERE community_id = ? AND id = ? AND result IS NULL ' +
    'AND EXISTS (SELECT 1 FROM devices WHERE key_hash = ? AND revoked_at IS NULL)'
  ).bind(result, device.community_id, id, device.key_hash)))
  return receipts.map(({ id }) => id)
}

export async function webGameViewer(db, account, community, platform) {
  if (!isPlatform(platform)) return null
  return db.prepare(
    'SELECT p.viewer_id, p.payload FROM viewer_progress p JOIN account_identities i ON i.viewer_id = p.viewer_id ' +
    "WHERE p.community_id = ? AND i.account_id = ? AND (? = 'kick' OR p.viewer_id LIKE 'twitch:%') AND EXISTS" +
    ' (SELECT 1 FROM account_identities a ' +
    "WHERE a.account_id = i.account_id AND a.detached_at IS NULL AND a.viewer_id LIKE ?) " +
    "ORDER BY CASE WHEN p.viewer_id LIKE 'twitch:%' AND ? = 'kick' THEN 0 WHEN p.viewer_id LIKE ? THEN 1 ELSE 2 END, " +
    'p.updated_at DESC, p.viewer_id LIMIT 1'
  ).bind(community, account, platform, platform + ':%', platform, platform + ':%').first()
}

export async function enqueueWebGame(db, account, community, platform, form) {
  const id = form.get('id')
  const action = form.get('action')
  if (!actionId.test(id ?? '') || !isPlatform(platform)) return null
  const viewer = await webGameViewer(db, account, community, platform)
  if (!viewerId.test(viewer?.viewer_id ?? '')) return null
  const progress = JSON.parse(viewer.payload)
  const runtime = await db.prepare('SELECT seen_at, encounter_id FROM web_game_runtime WHERE community_id = ?')
    .bind(community).first()
  if (!runtime || runtime.seen_at <= Date.now() - 20000) return 'offline'
  const stream = await db.prepare('SELECT platforms, seen_at FROM community_stream_status WHERE community_id = ?')
    .bind(community).first()
  if (!(stream?.seen_at > Date.now() - 90000 && JSON.parse(stream.platforms).some(channel => channel.live && channel.provider === platform))) {
    return 'offline'
  }
  let command
  let encounter = null
  if (action === 'catch' && ['normal', 'great', 'ultra', 'master'].includes(form.get('ball'))) {
    encounter = form.get('encounter')
    if (!encounter || encounter !== runtime.encounter_id) return 'expired'
    command = '!catch ' + form.get('ball')
  } else if (action === 'summon' && Object.hasOwn(progress.collection, form.get('pokemon') ?? '')) {
    const pokemon = form.get('pokemon')
    command = pokemon.endsWith(' ✦') ? '!summonshiny ' + pokemon.slice(0, -2) : '!summon ' + pokemon
  } else if (action === 'withdraw') {
    command = '!summon out'
  } else if (action === 'candy' && /^\d{1,2}$/.test(form.get('quantity') ?? '') && Number(form.get('quantity')) > 0) {
    command = '!candy ' + form.get('quantity')
  } else return null
  await db.batch([
    db.prepare('DELETE FROM web_game_actions WHERE community_id = ? AND created_at < ?').bind(community, Date.now() - 3600000),
    db.prepare('INSERT OR IGNORE INTO web_game_actions (id, community_id, viewer_id, platform, command, encounter_id, created_at) ' +
      'SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM web_game_actions WHERE community_id = ? AND viewer_id = ? ' +
      'AND platform = ? AND result IS NULL AND created_at > ?)')
      .bind(id, community, viewer.viewer_id, platform, command, encounter, Date.now(), community, viewer.viewer_id, platform, Date.now() - 15000)
  ])
  const order = await webGameStatus(db, account, community, id)
  return order?.id ? id : 'pending'
}

export async function webGameStatus(db, account, community, id) {
  if (!actionId.test(id ?? '')) return null
  return db.prepare(
    'SELECT a.id, a.result, a.created_at FROM web_game_actions a JOIN account_identities i ON i.viewer_id = a.viewer_id ' +
    'WHERE a.id = ? AND a.community_id = ? AND i.account_id = ?'
  ).bind(id, community, account).first()
}
