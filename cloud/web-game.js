import { decodeAllocation, trainingRules } from '../ui/training.js'
import { captureCategories, catchDifficulty } from '../ui/capture-rates.js'
import { encounterRarities, rarityFor, specialRarities } from '../ui/species-rules.js'
import { battleSpecies } from '../dev/battle.js'

const pendingMs = 15_000
const cooldownMs = 5_000
const accountActions = ' FROM web_game_actions a JOIN account_identities i ON i.viewer_id = a.viewer_id WHERE a.community_id = ? AND i.account_id = ? '

export async function webActionLock(db, account, community) {
  const now = Date.now()
  const row = await db.prepare('SELECT MAX(CASE WHEN a.result IS NULL AND a.created_at > ? THEN 1 ELSE 0 END) AS pending, MAX(a.finished_at) AS finished' +
    accountActions + 'AND a.created_at > ?').bind(now - pendingMs, community, account, now - pendingMs - cooldownMs).first()
  return { pending: Boolean(row?.pending), cooldown: Math.max(0, (row?.finished ?? 0) + cooldownMs - now) }
}

const actionId = /^[a-f0-9-]{36}$/
const encounterId = /^\d{1,16}:\d{1,12}$/
const viewerId = /^(twitch|kick):\d{1,24}$/
const isPlatform = value => value === 'twitch' || value === 'kick'

export async function deviceWebGame(db, device, header) {
  if (header.length > 2048) return []
  let runtime
  try {
    const data = header.startsWith('v2:')
      ? new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(header.slice(3).replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0)))
      : header
    runtime = JSON.parse(data)
  } catch { return [] }
  const id = encounterId.test(runtime?.id ?? '') ? runtime.id : null
  const species = id && Number.isSafeInteger(runtime.speciesId) ? battleSpecies(runtime.speciesId) : null
  const speciesId = species ? runtime.speciesId : null
  const rarity = speciesId ? (specialRarities.has(runtime.rarity) || Object.hasOwn(encounterRarities.weights, runtime.rarity)
    ? runtime.rarity : rarityFor(speciesId, species[5])) : null
  const category = captureCategories.find(entry => entry.names[1] === runtime?.en)
  const difficulty = language => {
    if (!id) return null
    if (category) return category.names[Number(language === 'en')]
    return speciesId ? catchDifficulty(speciesId, specialRarities.has(rarity), language) :
      typeof runtime[language] === 'string' ? runtime[language].slice(0, 40) : null
  }
  const now = Date.now()
  const [, pending] = await db.batch([
    db.prepare(
      'INSERT INTO web_game_runtime (community_id, seen_at, encounter_id, difficulty_en, difficulty_es, shiny, species_id, rarity) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (community_id) DO UPDATE SET ' +
      'seen_at = excluded.seen_at, encounter_id = excluded.encounter_id, difficulty_en = excluded.difficulty_en, ' +
      'difficulty_es = excluded.difficulty_es, shiny = excluded.shiny, species_id = excluded.species_id, rarity = excluded.rarity WHERE web_game_runtime.seen_at <= excluded.seen_at - 10000 OR ' +
      'web_game_runtime.encounter_id IS NOT excluded.encounter_id OR web_game_runtime.species_id IS NOT excluded.species_id OR web_game_runtime.rarity IS NOT excluded.rarity OR web_game_runtime.difficulty_en IS NOT excluded.difficulty_en'
    ).bind(device.community_id, now, id, difficulty('en'), difficulty('es'), Number(Boolean(id && runtime.shiny === true)), speciesId, rarity),
    db.prepare('SELECT a.id, a.viewer_id AS viewerId, a.platform, a.command, a.encounter_id AS encounterId, ' +
      "(SELECT linked.viewer_id FROM account_identities linked WHERE linked.account_id = i.account_id AND linked.detached_at IS NULL " +
      "AND linked.viewer_id LIKE 'twitch:%' ORDER BY linked.viewer_id LIMIT 1) AS twitchId, " +
      "(SELECT linked.viewer_id FROM account_identities linked WHERE linked.account_id = i.account_id AND linked.detached_at IS NULL " +
      "AND linked.viewer_id LIKE 'kick:%' ORDER BY linked.viewer_id LIMIT 1) AS kickId " +
      'FROM web_game_actions a JOIN account_identities i ON i.viewer_id = a.viewer_id ' +
      'WHERE a.community_id = ? AND a.result IS NULL AND a.created_at > ? ORDER BY a.created_at, a.id LIMIT 10')
      .bind(device.community_id, now - 15000)
  ])
  return pending.results
}

export async function finishWebGame(request, db, device, receipts, writes = []) {
  if (request.method !== 'POST' || !Array.isArray(receipts) || !receipts.length || receipts.length > 10 ||
      receipts.some(receipt => !actionId.test(receipt?.id ?? '') || !/^[a-zA-Z]{1,40}$/.test(receipt?.result ?? ''))) return null
  await db.batch([...writes, ...receipts.map(({ id, result }) => db.prepare(
    'UPDATE web_game_actions SET result = ?, finished_at = ? WHERE community_id = ? AND id = ? AND result IS NULL ' +
    'AND EXISTS (SELECT 1 FROM devices WHERE key_hash = ? AND revoked_at IS NULL)'
  ).bind(result, Date.now(), device.community_id, id, device.key_hash))])
  for (const { id, result } of receipts) console.info(JSON.stringify({ event: 'web_game_receipt', requestId: id, result }))
  return receipts.map(({ id }) => id)
}

export async function webGameViewer(db, account, community, platform) {
  if (!isPlatform(platform)) return null
  return db.prepare(
    'SELECT p.viewer_id, p.payload FROM viewer_progress p JOIN account_identities i ON i.viewer_id = p.viewer_id ' +
    'WHERE p.community_id = ? AND i.account_id = ? AND i.detached_at IS NULL ' +
    "ORDER BY CASE WHEN p.viewer_id LIKE 'twitch:%' THEN 0 ELSE 1 END, p.updated_at DESC, p.viewer_id LIMIT 1"
  ).bind(community, account).first()
}

export async function enqueueWebGame(db, account, community, platform, form) {
  const id = form.get('id')
  const action = form.get('action')
  if (!actionId.test(id ?? '') || !isPlatform(platform)) return null
  const viewer = await webGameViewer(db, account, community, platform)
  if (!viewerId.test(viewer?.viewer_id ?? '')) return null
  const progress = JSON.parse(viewer.payload)
  const training = action === 'train'
  const runtime = await db.prepare('SELECT seen_at, encounter_id FROM web_game_runtime WHERE community_id = ?')
    .bind(community).first()
  if (!runtime || runtime.seen_at <= Date.now() - 20000) return 'offline'
  const stream = await db.prepare('SELECT platforms, seen_at FROM community_stream_status WHERE community_id = ?')
    .bind(community).first()
  if (!training && !(stream?.seen_at > Date.now() - 90000 && JSON.parse(stream.platforms).some(channel => channel.live && channel.provider === platform))) {
    return 'offline'
  }
  let command
  let encounter = null
  if (training) {
    const pokemon = form.get('pokemon') ?? ''
    const operation = form.get('operation')
    let stat = form.get('stat') ?? '-'
    if (!Object.hasOwn(progress.collection, pokemon) || !['apply','plus','minus','reset','save'].includes(operation) ||
        (['plus','minus'].includes(operation) && !trainingRules.stats.includes(stat))) return null
    if (operation === 'save' || (operation === 'apply' && form.has('quantity'))) {
      const client = await db.prepare('SELECT supports_dna FROM shop_online WHERE community_id = ?').bind(community).first()
      if (!(client?.supports_dna >= 4)) return 'offline'
      stat = form.get(operation === 'save' ? 'allocation' : 'quantity')
      if (operation === 'save' ? !decodeAllocation(stat) :
        !/^\d{1,2}$/.test(stat ?? '') || Number(stat) < 1 || Number(stat) > trainingRules.maxPoints) return null
    } else if (operation === 'apply' || operation === 'reset') stat = '-'
    command = '!training ' + operation + ' ' + stat + ' ' + pokemon
  } else if (action === 'catch' && ['normal', 'great', 'ultra', 'master'].includes(form.get('ball'))) {
    encounter = form.get('encounter')
    if (!encounter || encounter !== runtime.encounter_id) return 'expired'
    command = '!catch ' + form.get('ball')
  } else if (action === 'summon' && Object.hasOwn(progress.collection, form.get('pokemon') ?? '')) {
    const pokemon = form.get('pokemon')
    command = pokemon.endsWith(' ✦') ? '!summonshiny ' + pokemon.slice(0, -2) : '!summon ' + pokemon
  } else if (action === 'shiny' && progress.shinyDust > 0) {
    command = '!shiny'
  } else if (action === 'tracker') {
    command = '!legendaryticket'
  } else if (action === 'withdraw') {
    command = '!summon out'
  } else if (action === 'candy' && /^\d{1,2}$/.test(form.get('quantity') ?? '') && Number(form.get('quantity')) > 0) {
    command = '!candy ' + form.get('quantity')
  } else return null
  const now = Date.now()
  await db.batch([
    db.prepare('DELETE FROM web_game_actions WHERE community_id = ? AND created_at < ?').bind(community, Date.now() - 3600000),
    db.prepare('INSERT OR IGNORE INTO web_game_actions (id, community_id, viewer_id, platform, command, encounter_id, created_at) ' +
      'SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM web_game_actions a JOIN account_identities i ON i.viewer_id = a.viewer_id ' +
      'WHERE a.community_id = ? AND i.account_id = ? AND ((a.result IS NULL AND a.created_at > ?) OR (? = 0 AND a.finished_at > ?)))')
      .bind(id, community, viewer.viewer_id, platform, command, encounter, now, community, account, now - pendingMs, Number(training), now - cooldownMs)
  ])
  const order = await webGameStatus(db, account, community, id)
  console.info(JSON.stringify({ event: 'web_game_queue', requestId: id, platform, action, result: order?.id ? 'accepted' : 'pending' }))
  return order?.id ? id : (await webActionLock(db, account, community)).cooldown ? 'cooldown' : 'pending'
}

export async function webGameStatus(db, account, community, id) {
  if (!actionId.test(id ?? '')) return null
  return db.prepare(
    'SELECT a.id, a.result, a.created_at FROM web_game_actions a JOIN account_identities i ON i.viewer_id = a.viewer_id ' +
    'WHERE a.id = ? AND a.community_id = ? AND i.account_id = ?'
  ).bind(id, community, account).first()
}
