import { dexEntries, speciesName } from './movesets.js'
import { battleSpecies } from '../dev/battle.js'
import { isFirstStage } from '../ui/evolution.js'
import { level } from '../ui/levels.js'
import { heldItems } from '../ui/held-items.js'
import { specialEncounterTag } from '../ui/capture-rates.js'

const scope = "(SELECT o.community_id FROM community_owners o JOIN devices d ON d.key_hash = o.key_hash AND d.community_id = o.community_id " +
  "JOIN account_identities i ON i.viewer_id = 'twitch:' || o.twitch_id WHERE i.account_id = ? AND i.detached_at IS NULL AND d.revoked_at IS NULL " +
  "UNION SELECT k.community_id FROM kick_channels k JOIN account_identities i ON i.viewer_id = 'kick:' || k.broadcaster_id " +
  "WHERE i.account_id = ? AND i.detached_at IS NULL AND EXISTS (SELECT 1 FROM devices d WHERE d.community_id = k.community_id AND d.revoked_at IS NULL))"
const ttl = 120_000
const pokemon = new Map(dexEntries.map(([id]) => [speciesName(id), id]))
const wild = name => {
  const id = pokemon.get(name)
  return id && (specialEncounterTag(id, battleSpecies(id)?.[5]) || isFirstStage(id))
}
const option = (value, label, escape) => '<option value="' + escape(value) + '">' + escape(label) + '</option>'

export async function adminCommunities(db, account) {
  const { results } = await db.prepare('SELECT community_id FROM ' + scope + ' ORDER BY community_id').bind(account, account).all()
  return results.map(row => row.community_id)
}

export async function pendingAdminActions(db, device, now = Date.now()) {
  await db.prepare('INSERT INTO community_admin_online VALUES (?, ?) ON CONFLICT (community_id) DO UPDATE SET seen_at = excluded.seen_at WHERE seen_at <= excluded.seen_at - 10000')
    .bind(device.community_id, now).run()
  const { results } = await db.prepare('SELECT id, action FROM community_admin_actions WHERE community_id = ? AND result IS NULL AND created_at > ? AND community_id IN ' +
    scope.replaceAll('i.account_id = ?', 'i.account_id = community_admin_actions.account_id') + ' ORDER BY created_at, id LIMIT 5')
    .bind(device.community_id, now - ttl).all()
  return results.map(row => ({ id: row.id, ...JSON.parse(row.action) }))
}

export async function finishAdminActions(db, device, receipts) {
  if (!Array.isArray(receipts) || !receipts.length || receipts.length > 5 || receipts.some(row =>
    !/^[a-f0-9-]{36}$/.test(row?.id ?? '') || !['done', 'rejected'].includes(row?.result))) return null
  await db.batch(receipts.map(({ id, result }) => db.prepare(
    'UPDATE community_admin_actions SET result = ? WHERE id = ? AND community_id = ? AND result IS NULL'
  ).bind(result, id, device.community_id)))
  return receipts.map(row => row.id)
}

export async function adminPortal(request, url, db, identity, en, escape, page) {
  if (!identity) return new Response(null, { status: 401 })
  const communities = await adminCommunities(db, identity.account_id)
  if (!communities.length) return new Response(null, { status: 403 })
  const community = url.searchParams.get('community') ?? communities[0]
  if (!communities.includes(community)) return new Response(null, { status: 403 })
  const destination = '/admin?' + new URLSearchParams({ community })

  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 })
    const reader = request.body?.getReader()
    if (!reader) return new Response(null, { status: 400 })
    const decoder = new TextDecoder()
    let text = ''
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 2048) { await reader.cancel(); return new Response(null, { status: 413 }) }
      text += decoder.decode(value, { stream: true })
    }
    const form = new URLSearchParams(text + decoder.decode())
    const id = form.get('id') ?? ''
    const type = form.get('type')
    if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 400 })
    let action
    if (type === 'battle') action = { type }
    if (type === 'spawn' && wild(form.get('pokemon'))) action = { type, pokemon: form.get('pokemon') }
    if (type === 'grant') {
      const viewerId = form.get('viewer') ?? ''
      const kind = form.get('kind')
      const item = form.get('item') ?? ''
      const amount = Number(form.get('amount'))
      const valid = Number.isSafeInteger(amount) && amount > 0 && amount <= (kind === 'money' ? 1_000_000 : 999) &&
        (['money', 'candy', 'tracker'].includes(kind) || kind === 'pokemon' && amount === 1 && pokemon.has(item.replace(/ ✦$/, '')) ||
          kind === 'held' && amount === 1 && Object.hasOwn(heldItems, item) ||
          kind === 'balls' && ['normal', 'great', 'ultra', 'master'].includes(item))
      if (valid && /^(twitch|kick):\d{1,24}$/.test(viewerId) &&
          await db.prepare('SELECT 1 AS available FROM viewer_progress WHERE community_id = ? AND viewer_id = ?').bind(community, viewerId).first()) {
        action = { type, viewerId, kind, item, amount }
      }
    }
    if (!action) return new Response(null, { status: 400 })
    const time = Date.now()
    const result = await db.prepare('INSERT OR IGNORE INTO community_admin_actions (id, community_id, account_id, action, created_at) ' +
      'SELECT ?, ?, ?, ?, ? WHERE ? IN ' + scope +
      ' AND EXISTS (SELECT 1 FROM community_admin_online WHERE community_id = ? AND seen_at > ?) ' +
      'AND (SELECT COUNT(*) FROM community_admin_actions WHERE community_id = ? AND created_at > ?) < 12')
      .bind(id, community, identity.account_id, JSON.stringify(action), time, community, identity.account_id, identity.account_id,
        community, time - 25_000, community, time - 60_000).run()
    const resultCode = result.meta.changes ? 'queued' : 'unavailable'
    return new Response(null, { status: 303, headers: { Location: destination + '&status=' + resultCode, 'Cache-Control': 'no-store' } })
  }
  if (request.method !== 'GET') return new Response(null, { status: 405 })
  const [roster, actions] = await db.batch([
    db.prepare('SELECT p.viewer_id, p.payload FROM viewer_progress p LEFT JOIN account_identities i ON i.viewer_id = p.viewer_id ' +
      'WHERE p.community_id = ? AND (i.account_id IS NULL OR p.viewer_id LIKE \'twitch:%\' OR NOT EXISTS (SELECT 1 FROM account_identities t JOIN viewer_progress tp ON tp.viewer_id=t.viewer_id AND tp.community_id=p.community_id WHERE t.account_id=i.account_id AND t.detached_at IS NULL AND t.viewer_id LIKE \'twitch:%\')) ' +
      'ORDER BY json_extract(p.payload, \'$.displayName\'), p.viewer_id LIMIT 200').bind(community),
    db.prepare('SELECT action, result, created_at FROM community_admin_actions WHERE community_id = ? ORDER BY created_at DESC LIMIT 12').bind(community)
  ])
  const online = await db.prepare('SELECT seen_at FROM community_admin_online WHERE community_id = ?').bind(community).first()
  const available = online?.seen_at > Date.now() - 25_000
  const title = en ? 'Administration' : 'Administración'
  const section = (type, fields, button, enabled = available) => '<form class="admin-command" method="post" action="' + escape(destination) + '">' +
    '<input type="hidden" name="id" value="' + crypto.randomUUID() + '"><input type="hidden" name="type" value="' + type + '">' +
    fields + '<button' + (enabled ? '' : ' disabled') + '>' + button + '</button></form>'
  const pokedex = [...pokemon.keys()].sort()
  const players = roster.results.map(row => [row.viewer_id, JSON.parse(row.payload)])
  const player = url.searchParams.get('player')
  const details = player ? await db.prepare('SELECT payload FROM viewer_progress WHERE community_id = ? AND viewer_id = ?').bind(community, player).first() : null
  const selected = details && JSON.parse(details.payload)
  const options = players.map(([id, p]) => option(id, (p.displayName || id) + ' · ' + id.split(':')[0] + ' · $' + (p.pokeDollars ?? 0), escape)).join('')
  const items = Object.entries(heldItems).map(([id, labels]) => option(id, labels[Number(en)], escape)).join('') +
    ['normal', 'great', 'ultra', 'master'].map(id => option(id, id, escape)).join('')
  const grantFields = '<label>' + (en ? 'Player' : 'Jugador') + '<select name="viewer" required>' + options + '</select></label>' +
    '<label>' + (en ? 'Reward' : 'Recompensa') + '<select name="kind"><option value="money">Pokédólares</option><option value="candy">' + (en ? 'Rare Candy' : 'Caramelo Raro') +
    '</option><option value="tracker">Legendary Tracker</option><option value="balls">Poké Balls</option><option value="held">' + (en ? 'Held item' : 'Objeto equipable') +
    '</option><option value="pokemon">Pokémon</option></select></label><label>' + (en ? 'Item or Pokémon, when needed' : 'Objeto o Pokémon, cuando corresponda') +
    '<input name="item" list="admin-items" maxlength="64"></label><datalist id="admin-items">' + items +
    pokedex.flatMap(name => [option(name, name, escape), option(name + ' ✦', name + ' ✦', escape)]).join('') +
    '</datalist><label>' + (en ? 'Quantity' : 'Cantidad') + '<input name="amount" type="number" min="1" max="1000000" value="1" required></label>'
  const records = actions.results.map(row => {
    const action = JSON.parse(row.action)
    const state = row.result ?? (row.created_at <= Date.now() - ttl ? 'expired' : 'pending')
    const labels = en ? { done: 'Done', rejected: 'Rejected', expired: 'Expired', pending: 'Pending' } :
      { done: 'Hecho', rejected: 'Rechazado', expired: 'Caducado', pending: 'Pendiente' }
    return '<li>' + escape([action.type, action.kind, action.item || action.pokemon, action.amount, labels[state]].filter(Boolean).join(' · ')) + '</li>'
  }).join('')
  const status = url.searchParams.get('status')
  return page('<section class="sheet"><h1>' + title + '</h1><nav class="tabs">' + communities.map(id =>
    '<a href="/admin?' + escape(new URLSearchParams({ community: id })) + '"' + (id === community ? ' aria-current="page"' : '') + '>' + escape(id) + '</a>').join('') +
    '</nav>' + (status ? '<p role="status">' + (status === 'queued' ? (en ? 'Action queued.' : 'Acción enviada.') : (en ? 'Could not queue the action.' : 'No se pudo enviar la acción.')) + '</p>' : '') +
    (available ? '' : '<p class="empty">' + (en ? 'Open the updated desktop app and start the game to send actions.' : 'Abre la app actualizada e inicia el juego para enviar acciones.') + '</p>') +
    '<div class="admin-grid"><section><h2>' + (en ? 'Grant or compensate' : 'Entregar o compensar') + '</h2>' +
    section('grant', grantFields, en ? 'Grant' : 'Entregar', available && players.length > 0) + '</section><section><h2>' + (en ? 'Game controls' : 'Controles del juego') + '</h2>' +
    section('spawn', '<label>Pokémon<select name="pokemon">' + pokedex.filter(wild).map(name => option(name, name, escape)).join('') + '</select></label>', en ? 'Spawn wild Pokémon' : 'Invocar salvaje') +
    section('battle', '', en ? 'Start battle' : 'Iniciar batalla') + '</section></div><section><h2>' + (en ? 'Player inventory' : 'Inventario del jugador') + '</h2><form class="toolbar" method="get" action="/admin"><input type="hidden" name="community" value="' + escape(community) + '"><select name="player" required aria-label="' + (en ? 'Player' : 'Jugador') + '">' + options + '</select><button>' + (en ? 'View inventory' : 'Ver inventario') + '</button></form>' +
    (selected ? '<h3>' + escape(selected.displayName || player) + '</h3><p>Pokédólares · $' + escape(selected.pokeDollars ?? 0) + ' · ' + (en ? 'Rare Candy' : 'Caramelo Raro') + ' ×' + escape(selected.rareCandies ?? 0) + ' · Legendary Tracker ×' + escape(selected.legendaryTrackers ?? 0) + '</p><p>' +
      escape(Object.entries(selected.balls ?? {}).map(([id, count]) => id + ' ×' + count).join(' · ')) + '</p><p>' + escape((selected.heldItems ?? []).map(id => heldItems[id]?.[Number(en)] ?? id).join(' · ')) + '</p><details><summary>Pokémon (' + Object.keys(selected.collection ?? {}).length + ')</summary><ul>' + Object.entries(selected.collection ?? {}).map(([name, xp]) => '<li>' + escape(name) + ' · Lv. ' + level(xp) + '</li>').join('') + '</ul></details>' : '') + '</section><h2>' + (en ? 'Recent actions' : 'Acciones recientes') + '</h2><ol>' + records + '</ol></section>')
}
