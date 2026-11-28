import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import worker from './worker.js'
import { signIn } from './auth.js'

test('a signed-in viewer can submit one shop order while their device is online', async t => {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  for (const migration of ['0001_sync', '0002_portal', '0003_viewer_login', '0004_accounts', '0005_movesets', '0006_kick',
    '0007_held_items', '0008_community_owners', '0009_shop', '0010_shop_prices', '0011_unlink', '0012_account_erasure', '0013_dna_boosters', '0014_viewer_generations', '0015_stream_status', '0018_shop_quantity', '0019_web_game', '0020_portal_announcements', '0021_shiny_cue', '0022_shop_hatch', '0023_shop_expiry', '0024_dex_seen', '0025_admin', '0026_web_encounter_portrait', '0027_web_action_cooldown', '0028_battle_teams']) {
    db.exec(await readFile(new URL('./migrations/' + migration + '.sql', import.meta.url), 'utf8'))
  }
  const D1 = {
    prepare(sql) {
      return { all: () => ({ results: db.prepare(sql).all() }), bind(...values) {
        const args = values.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) : value)
        return {
        all: () => ({ results: db.prepare(sql).all(...args) }),
        first: () => db.prepare(sql).get(...args),
        run: () => ({ meta: db.prepare(sql).run(...args) }), sql
      } } }
    },
    async batch(items) { return items.map(item => item.sql.startsWith('SELECT') ? item.all() : item.run()) }
  }
  const session = 'b'.repeat(64)
  const token = 'a'.repeat(64)
  const hash = createHash('sha256').update(token).digest('hex')
  db.exec("INSERT INTO accounts VALUES ('viewer-account', 0); INSERT INTO account_identities (viewer_id, account_id, login) VALUES ('twitch:1', 'viewer-account', 'viewer');")
  db.prepare('INSERT INTO web_sessions (id, viewer_id, expires_at, login) VALUES (?, ?, ?, ?)').run(session, 'twitch:1', Date.now() + 60_000, 'viewer')
  db.prepare('INSERT INTO devices (key_hash, community_id) VALUES (?, ?)').run(hash, 'stream')
  db.prepare('INSERT INTO viewer_progress VALUES (?, ?, ?, ?, ?)').run('stream', 'twitch:1', 1, JSON.stringify({ collection: {}, balls: { normal: 5, great: 0, ultra: 0, master: 0 }, pokeDollars: 500 }), 0)
  const base = 'https://example.test'
  const device = (method, body, prices, bulk = false) => worker.fetch(new Request(base + '/api/shop', {
    method, headers: { Authorization: 'Bearer ' + token, ...(prices && { 'X-Shop-Prices': JSON.stringify(prices) }), ...(bulk && { 'X-Shop-Quantity': bulk === 2 ? '2' : '1' }) }, body: body && JSON.stringify(body)
  }), { DB: D1 })
  const order = (id, price, quantity, item = 'poke-ball') => worker.fetch(new Request(base + '/shop/buy?community=stream&item=' + item + '&order=' + id + (price ? '&price=' + price : ''), {
    method: 'POST', headers: { Origin: base, Cookie: 'sc_session=' + session },
    body: quantity === undefined ? null : new URLSearchParams({ quantity })
  }), { DB: D1 })
  const first = crypto.randomUUID()
  const second = crypto.randomUUID()
  const offlineShop = await worker.fetch(new Request(base + '/?community=stream&tab=shop', {
    headers: { Cookie: 'sc_session=' + session }
  }), { DB: D1 })
  const offlineHtml = await offlineShop.text()
  assert.match(offlineHtml, /name="quantity"/)
  assert.match(offlineHtml, /<a href="\/">Inicio<\/a>/)
  assert.match(offlineHtml, /data-shop-availability/)
  assert.match((await order(first)).headers.get('Location'), /reason=offline/)
  assert.deepEqual(await (await device('GET')).json(), { orders: [] })
  assert.equal((await order(first)).status, 303)
  assert.match((await order(second)).headers.get('Location'), /retry=1/)
  assert.deepEqual(await (await device('GET')).json(), { orders: [{ id: first, viewerId: 'twitch:1', item: 'poke-ball' }] })
  assert.equal((await device('POST', { viewers: [{ id: first, result: 'purchased' }] })).status, 200)
  assert.deepEqual(await (await device('GET')).json(), { orders: [] })
  await device('GET', null, { 'poke-ball': 600 })
  const insufficient = await order(crypto.randomUUID(), 600)
  assert.match(insufficient.headers.get('Location'), /reason=funds/)
  const shop = await worker.fetch(new Request(base + insufficient.headers.get('Location'), { headers: { Cookie: 'sc_session=' + session } }), { DB: D1 })
  assert.match(await shop.text(), /No tienes suficientes Pokédólares.*Saldo actual: \$500/)
  const master = crypto.randomUUID()
  assert.match((await order(master, 500_000, 1, 'master-ball')).headers.get('Location'), /reason=master/)
  db.prepare("UPDATE viewer_progress SET payload = json_set(payload, '$.pokeDollars', 500000)").run()
  await device('GET', null, { 'master-ball': 500_000 }, true)
  assert.match((await order(master, 500_000, 1, 'master-ball')).headers.get('Location'), new RegExp('purchase=' + master))
  assert.deepEqual(await (await device('GET', null, { 'poke-ball': 100 }, true)).json(), { orders: [] })
  assert.deepEqual(await (await device('GET', null, { 'master-ball': 500_000 }, true)).json(), {
    orders: [{ id: master, viewerId: 'twitch:1', item: 'master-ball', price: 500_000 }]
  })
  await device('POST', { viewers: [{ id: master, result: 'purchased' }] })
  db.prepare("UPDATE viewer_progress SET payload = json_set(payload, '$.pokeDollars', 500)").run()
  const priced = crypto.randomUUID()
  await device('GET', null, { 'poke-ball': 150 })
  assert.match((await order(priced, 100)).headers.get('Location'), /repriced=1/)
  assert.equal((await order(priced, 150)).status, 303)
  assert.deepEqual(await (await device('GET')).json(), { orders: [] })
  assert.deepEqual(await (await device('GET', null, { 'poke-ball': 200 })).json(), {
    orders: [{ id: priced, viewerId: 'twitch:1', item: 'poke-ball', price: 150 }]
  })
  await device('POST', { viewers: [{ id: priced, result: 'repriced' }] })
  const bulk = crypto.randomUUID()
  assert.match((await order(bulk, 200, 2)).headers.get('Location'), /reason=quantity/)
  await device('GET', null, { 'poke-ball': 100 }, true)
  const bulkShop = await worker.fetch(new Request(base + '/?community=stream&tab=shop', {
    headers: { Cookie: 'sc_session=' + session }
  }), { DB: D1 })
  assert.match(await bulkShop.text(), /name="quantity" data-shop-quantity="100" min="1" max="5"/)
  assert.equal((await order(bulk, 100, 0)).status, 400)
  assert.match((await order(bulk, 100, 6)).headers.get('Location'), /reason=funds/)
  assert.match((await order(bulk, 100, 3)).headers.get('Location'), new RegExp('purchase=' + bulk))
  assert.match((await order(bulk, 100, 3)).headers.get('Location'), new RegExp('purchase=' + bulk))
  assert.deepEqual(await (await device('GET', null, { 'poke-ball': 100 })).json(), { orders: [] })
  assert.deepEqual(await (await device('GET', null, { 'poke-ball': 100 }, true)).json(), {
    orders: [{ id: bulk, viewerId: 'twitch:1', item: 'poke-ball', price: 100, quantity: 3 }]
  })
  const status = new URL(base + '/shop/status?community=stream&purchase=' + bulk)
  assert.equal((await worker.fetch(new Request(status), { DB: D1 })).status, 401)
  const readStatus = async () => (await worker.fetch(new Request(status, {
    headers: { Cookie: 'sc_session=' + session }
  }), { DB: D1 })).json()
  assert.deepEqual(await readStatus(), {
    balance: 500, balls: { normal: 5, great: 0, ultra: 0, master: 0 }, heldItems: [], pending: true, online: true, bulk: true, message: ''
  })
  const updatedViewer = { id: 'twitch:1', revision: 2, displayName: 'viewer', collection: {},
    balls: { normal: 8, great: 0, ultra: 0, master: 0 }, pokeDollars: 200 }
  const receipt = { id: bulk, result: 'purchased', viewer: updatedViewer }
  assert.equal((await device('POST', { viewers: [{ ...receipt, viewer: { ...updatedViewer, id: 'twitch:2' } }] })).status, 400)
  assert.equal((await readStatus()).pending, true)
  assert.equal((await device('POST', { viewers: [receipt] })).status, 200)
  assert.equal((await device('POST', { viewers: [receipt] })).status, 200)
  assert.deepEqual(await readStatus(), {
    balance: 200, balls: updatedViewer.balls, heldItems: [], pending: false, online: true, bulk: true, message: 'Compra realizada.'
  })
  const runtimeHeaders = { Authorization: 'Bearer ' + token, 'X-Web-Game': JSON.stringify({ id: '100:1', shiny: true, en: 'Easy', es: 'F?cil' }) }
  db.prepare('INSERT INTO community_stream_status VALUES (?, ?, ?)').run('stream', Date.now(), JSON.stringify([
    { provider: 'twitch', login: 'streamer', live: true },
    { provider: 'kick', login: 'streamer', live: true }
  ]))
  const pollWeb = async () => (await (await worker.fetch(new Request(base + '/api/shop', { headers: runtimeHeaders }), { DB: D1 })).json()).webActions
  assert.deepEqual(await pollWeb(), [])
  assert.equal(db.prepare('SELECT difficulty_es FROM web_game_runtime').get().difficulty_es, 'Fácil')
  runtimeHeaders['X-Web-Game'] = 'v2:' + Buffer.from(JSON.stringify({ id: '100:1', speciesId: 10114, shiny: true, es: 'Pokémon' })).toString('base64url')
  await pollWeb()
  assert.equal(db.prepare('SELECT species_id FROM web_game_runtime').get().species_id, 10114)
  const liveUrl = base + '/?tab=live&community=stream&platform=twitch'
  const livePage = await worker.fetch(new Request(liveUrl, { headers: { Cookie: 'sc_session=' + session } }), { DB: D1 })
  assert.match(livePage.headers.get('Content-Security-Policy'), /connect-src 'self'/)
  const liveHtml = await livePage.text()
  assert.match(liveHtml, /player\.twitch\.tv\/\?channel=streamer&amp;parent=example\.test/)
  assert.match(liveHtml, /data-capture-form/)
  assert.match(liveHtml, /class="capture-heading"[^]*class="capture-portrait-frame"/)
  assert.match(liveHtml, /data-encounter-portrait[^>]+shiny\/10114\.png/)
  assert.doesNotMatch(liveHtml, /Comunidades de streaming|Ver directo/)
  assert.match(liveHtml, /<a href="\/">Inicio<\/a>/)
  const cueUrl = base + '/live/shiny-cue?community=stream&platform=twitch'
  const cookie = { Cookie: 'sc_session=' + session }
  const cueRequest = () => worker.fetch(new Request(cueUrl, { headers: cookie }), { DB: D1 })
  assert.equal((await worker.fetch(new Request(cueUrl), { DB: D1 })).status, 401)
  const defaultCue = await cueRequest()
  assert.equal(defaultCue.headers.get('Content-Type'), 'audio/wav')
  assert.equal(Buffer.from(await defaultCue.arrayBuffer()).subarray(0, 4).toString(), 'RIFF')
  const customCue = Buffer.from('ID3fixture-audio')
  const uploadCue = (method, body) => worker.fetch(new Request(base + '/api/shiny-cue', {
    method, body, headers: { Authorization: 'Bearer ' + token }
  }), { DB: D1 })
  assert.equal((await uploadCue('PUT', new Uint8Array(512 * 1024 + 1))).status, 413)
  assert.equal((await uploadCue('PUT', Buffer.from('invalid'))).status, 415)
  assert.equal((await uploadCue('PUT', customCue)).status, 204)
  assert.equal(Buffer.from(await (await cueRequest()).arrayBuffer()).toString(), customCue.toString())
  const shinyStatus = await worker.fetch(new Request(base + '/live/status?community=stream&platform=twitch', { headers: cookie }), { DB: D1 })
  assert.equal((await shinyStatus.json()).shiny, true)
  assert.equal((await uploadCue('DELETE')).status, 204)
  assert.equal((await cueRequest()).headers.get('Content-Type'), 'audio/wav')
  const feed = base + '/live/announcements?community=stream'
  const event = { id: 'c'.repeat(32), message: '¡Aparecerá un Pokémon en 2 minutos!' }
  const announce = (headers = {}) => worker.fetch(new Request(base + '/api/announcements', {
    method: 'POST', headers, body: JSON.stringify({ viewers: [event] })
  }), { DB: D1 })
  assert.equal((await announce()).status, 401)
  assert.equal((await announce({ Authorization: 'Bearer ' + token })).status, 200)
  assert.equal((await announce({ Authorization: 'Bearer ' + token })).status, 200)
  assert.deepEqual(await (await worker.fetch(new Request(feed), { DB: D1 })).json(), { events: [] })
  assert.doesNotMatch(liveHtml, /data-announcements="stream"|tab=log/)
  assert.doesNotMatch(liveHtml, /src="\/assets\/announcements\.js"/)
  const combined = await worker.fetch(new Request(base + '/live/status?community=stream&platform=twitch&announcements=1', { headers: cookie }), { DB: D1 })
  assert.equal((await combined.json()).events, undefined)
  const trainingRequest = await worker.fetch(new Request(base + '/live/action?community=stream&platform=twitch', {
    method:'POST',headers:{ ...cookie, Origin:base },body:new URLSearchParams({id:crypto.randomUUID(),action:'train',pokemon:'not-owned',operation:'apply'})
  }),{DB:D1})
  assert.equal(trainingRequest.status,400)
  const actionId = crypto.randomUUID()
  const webAction = (encounter, origin = base, json = false) => worker.fetch(new Request(base + '/live/action?community=stream&platform=twitch', {
    method: 'POST', headers: { Origin: origin, Cookie: 'sc_session=' + session, ...(json && { Accept: 'application/json' }) },
    body: new URLSearchParams({ id: actionId, action: 'catch', encounter, ball: 'normal' })
  }), { DB: D1 })
  assert.equal((await webAction('100:1', 'https://other.test')).status, 403)
  assert.match((await webAction('100:0')).headers.get('Location'), /game=expired/)
  assert.match((await webAction('100:1')).headers.get('Location'), new RegExp('game=' + actionId))
  const submitted = await webAction('100:1', base, true)
  assert.equal(submitted.status, 200)
  assert.equal((await submitted.json()).id, actionId)
  const parallel = await worker.fetch(new Request(base + '/live/action?community=stream&platform=kick', {
    method: 'POST', headers: { Origin: base, Cookie: 'sc_session=' + session },
    body: new URLSearchParams({ id: crypto.randomUUID(), action: 'withdraw' })
  }), { DB: D1 })
  assert.match(parallel.headers.get('Location'), /game=pending/)
  assert.match(liveHtml, /<div class="live-layout">[\s\S]*<iframe[\s\S]*id="play-web"/)
  assert.match(liveHtml, /Jugar en web/)
  assert.match(liveHtml, /name="ball" value="master"/)
  const [queued] = await pollWeb()
  assert.equal(queued.command, '!catch normal')
  assert.equal(queued.twitchId, 'twitch:1')
  assert.equal(queued.kickId, null)
  assert.equal(queued.encounterId, '100:1')
  const actionStatus = new URL(base + '/live/status?community=stream&platform=twitch&game=' + actionId)
  assert.equal((await worker.fetch(new Request(actionStatus), { DB: D1 })).status, 401)
  const finish = await worker.fetch(new Request(base + '/api/web-game', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token },
    body: JSON.stringify({ viewers: [{ id: actionId, result: 'catchSuccess' }] })
  }), { DB: D1 })
  assert.deepEqual(await finish.json(), { received: [actionId] })
  assert.deepEqual(await pollWeb(), [])
  const kickStatus = await worker.fetch(new Request(base + '/live/status?community=stream&platform=kick', {
    headers: { Cookie: 'sc_session=' + session }
  }), { DB: D1 })
  assert.equal(kickStatus.status, 200)
  assert.equal((await kickStatus.json()).balls.normal, 8)
  const complete = await worker.fetch(new Request(actionStatus, { headers: { Cookie: 'sc_session=' + session } }), { DB: D1 })
  const captureFeedback = await complete.json()
  assert.equal(captureFeedback.result, 'catchSuccess')
  assert.match(captureFeedback.message, /Capturaste/)
  assert.match(liveHtml, /data-live-reaction/)
  const syncCapture = capture => worker.fetch(new Request(base + '/api/sync', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token },
    body: JSON.stringify({ viewers: [{ id: 'twitch:1', revision: 3, displayName: 'viewer',
      balls: { normal: 5, great: 0, ultra: 0, master: 0 }, collection: {},
      log: [{ at: 1, platform: 'twitch', action: '!catch great', result: 'escaped', capture }] }] })
  }), { DB: D1 })
  assert.equal((await syncCapture({ ball: 'great', remaining: -1 })).status, 400)
  assert.equal((await syncCapture({ ball: 'great', remaining: 0 })).status, 200)
  db.prepare("UPDATE viewer_progress SET payload = json_set(payload, '$.pokeDollars', 200, '$.balls.normal', 8) WHERE community_id = ? AND viewer_id = ?").run('stream', 'twitch:1')
  const updated = await readStatus()
  assert.equal(updated.balance, 200)
  assert.equal(updated.balls.normal, 8)
  const logPage = await worker.fetch(new Request(base + '/?community=stream&tab=log', {
    headers: { Cookie: 'sc_session=' + session }
  }), { DB: D1 })
  assert.doesNotMatch(await logPage.text(), /Registro de actividad/)
  db.prepare("UPDATE viewer_progress SET payload = json_set(payload, '$.pokeDollars', 120000, '$.rareCandies', 3) WHERE viewer_id = ?").run('twitch:1')
  await device('GET', undefined, { 'poke-egg': 5000, 'legendary-tracker': 100000 })
  const channels = db.prepare('SELECT platforms FROM community_stream_status WHERE community_id = ?').get('stream').platforms
  db.prepare('UPDATE community_stream_status SET platforms = ? WHERE community_id = ?').run(JSON.stringify([{ provider: 'twitch', login: 'streamer', live: false }]), 'stream')
  const eggPage = await worker.fetch(new Request(base + '/?community=stream&tab=shop&section=eggs', { headers: cookie }), { DB: D1 })
  assert.match(await eggPage.text(), /sprites\/pokemon\/egg\.png[^]*data-shop-product="poke-egg"/)
  assert.equal((await readStatus()).online, true)
  const egg = crypto.randomUUID()
  const ticket = crypto.randomUUID()
  assert.match((await order(egg, 5000, 1, 'poke-egg')).headers.get('Location'), new RegExp('section=eggs&purchase=' + egg))
  const orderViewer = { id: 'twitch:1', revision: 4, displayName: 'viewer', pokeDollars: 115000, rareCandies: 3,
    collection: { Rattata: 0 }, balls: { normal: 8, great: 0, ultra: 0, master: 0 } }
  const hatch = { id: 19, name: 'Rattata', rarity: 'common', duplicate: true, xp: 15.75 }
  assert.equal((await device('POST', { viewers: [{ id: egg, result: 'purchased', viewer: orderViewer,
    hatch: { ...hatch, id: 150, name: 'Mewtwo', rarity: 'epic' } }] })).status, 400)
  const newReceipt = await device('POST', { viewers: [{ id: egg, result: 'purchased', viewer: orderViewer, hatch }] })
  assert.equal(newReceipt.status, 200, await newReceipt.text())
  status.searchParams.set('purchase', egg)
  assert.deepEqual((await readStatus()).hatch, { ...hatch, xp: 15 })
  assert.match((await order(crypto.randomUUID(), 5000, 1, 'poke-egg')).headers.get('Location'), /retry=1/)
  const acquired = Date.now()
  db.prepare("UPDATE viewer_progress SET payload = json_set(payload, '$.dexAcquired.Rattata', ?) WHERE viewer_id = 'twitch:1'").run(acquired)
  const dexUrl = base + '/?community=stream&tab=dex'
  const readDex = async () => (await worker.fetch(new Request(dexUrl, { headers: cookie }), { DB: D1 })).text()
  assert.match(await readDex(), /data-dex-new="19"/)
  const markSeen = await worker.fetch(new Request(base + '/dex/seen?community=stream&species=19&at=' + acquired, { method: 'POST', headers: { ...cookie, Origin: base } }), { DB: D1 })
  assert.equal(markSeen.status, 204)
  assert.doesNotMatch(await readDex(), /data-dex-new="19"/)
  assert.match((await order(ticket, 100000, 1, 'legendary-tracker')).headers.get('Location'), new RegExp('section=keys&purchase=' + ticket))
  assert.equal((await device('POST', { viewers: [{ id: ticket, result: 'purchased', viewer: { ...orderViewer, revision: 5, pokeDollars: 15000, legendaryTrackers: 1 } }] })).status, 200)
  const legendaryEgg = crypto.randomUUID()
  db.prepare("INSERT INTO shop_orders (id, community_id, viewer_id, item, created_at) VALUES (?, 'stream', 'twitch:1', 'poke-egg', ?)").run(legendaryEgg, Date.now())
  const hatchedLegend = { id: 150, name: 'Mewtwo', rarity: 'legendary', duplicate: false, xp: 0, rules: 5 }
  const legendaryViewer = { ...orderViewer, revision: 6, pokeDollars: 10000, legendaryTrackers: 1,
    collection: { Rattata: 0, Mewtwo: 0, Raticate: 0 }, eggPity: { rare: 0, epic: 0, legendary: 0 } }
  const finishEgg = hatch => device('POST', { viewers: [{ id: legendaryEgg, result: 'purchased', viewer: legendaryViewer, hatch }] })
  assert.equal((await finishEgg({ id: 20, name: 'Raticate', rarity: 'uncommon', duplicate: false, xp: 0, rules: 2 })).status, 400)
  assert.equal((await finishEgg(hatchedLegend)).status, 200)
  assert.deepEqual(JSON.parse(db.prepare("SELECT payload FROM viewer_progress WHERE viewer_id = 'twitch:1'").get().payload).eggPity, legendaryViewer.eggPity)
  const selectTeam = (pokemon1) => worker.fetch(new Request(base + '/battle-team?community=stream', {
    method: 'POST', headers: { ...cookie, Origin: base },
    body: new URLSearchParams({ pokemon0: 'Rattata', support0: 'pollenpuff', pokemon1 })
  }), { DB: D1 })
  assert.match((await selectTeam('Raticate')).headers.get('Location'), /team=invalid/)
  assert.match((await selectTeam('Mewtwo')).headers.get('Location'), /team=saved/)
  const loadTeams = await worker.fetch(new Request(base + '/api/movesets', {method:'POST',
    headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ teams: ['twitch:1'] })
  }), { DB: D1 })
  const authTeamPage = () => worker.fetch(new Request(base + '/?community=stream&tab=team', { headers: cookie }), { DB: D1 })
  const teamHtml = await (await authTeamPage()).text()
  assert.match(teamHtml, /class="team-portrait"[^>]*><img[^>]*pokemon\/19\.png/)
  assert.doesNotMatch(teamHtml, /name="support[0-9]/)
  assert.deepEqual(await loadTeams.json(), { 'twitch:1': [{pokemon:'Rattata'}, {pokemon:'Mewtwo'}] })
  assert.equal(JSON.parse(db.prepare('SELECT hatch FROM shop_orders WHERE id = ?').get(legendaryEgg).hatch).rarity, 'legendary')
  assert.match((await order(egg, 5000, 1, 'poke-egg')).headers.get('Location'), new RegExp('purchase=' + egg))
  const consumables = await worker.fetch(new Request(base + '/?community=stream&tab=inventory&pocket=key', { headers: cookie }), { DB: D1 })
  const bag = await consumables.text()
  assert.match(bag, /rare-candy\.png[^]*Caramelo Raro[^]*×3/)
  assert.match(bag, /dowsing-machine\.png[^]*Legendary Tracker[^]*×1/)
  const eggPrices = { 'poke-egg': 5000, 'legendary-tracker': 100000 }
  await device('GET', undefined, eggPrices, true)
  assert.match((await order(crypto.randomUUID(), 5000, 5, 'poke-egg')).headers.get('Location'), /reason=quantity/)
  await device('GET', undefined, eggPrices, 2)
  db.prepare("UPDATE viewer_progress SET payload = json_set(payload, '$.pokeDollars', 55000) WHERE viewer_id = 'twitch:1'").run()
  const batchId = crypto.randomUUID()
  assert.equal((await order(crypto.randomUUID(), 5000, 2, 'poke-egg')).status, 400)
  assert.match((await order(batchId, 5000, 5, 'poke-egg')).headers.get('Location'), new RegExp('purchase=' + batchId))
  assert.ok(!(await (await device('GET', undefined, eggPrices, true)).json()).orders.some(entry => entry.id === batchId))
  assert.equal((await (await device('GET', undefined, eggPrices, 2)).json()).orders.find(entry => entry.id === batchId).quantity, 5)
  const batch = Array.from({ length: 5 }, () => ({ ...hatchedLegend, duplicate: true }))
  const batchViewer = { ...legendaryViewer, revision: 7, pokeDollars: 30000 }
  const finishBatch = hatch => device('POST', { viewers: [{ id: batchId, result: 'purchased', viewer: batchViewer, hatch }] })
  assert.equal((await finishBatch(batch.slice(1))).status, 400)
  assert.equal((await finishBatch(batch)).status, 200)
  status.searchParams.set('purchase', batchId)
  assert.deepEqual((await readStatus()).hatch, batch.map(({ rules, ...entry }) => entry))
  db.prepare('UPDATE community_stream_status SET platforms = ? WHERE community_id = ?').run(channels, 'stream')
  const requestTracker = () => worker.fetch(new Request(base + '/live/action?community=stream&platform=twitch', {
    method: 'POST', headers: { ...cookie, Origin: base },
    body: new URLSearchParams({ id: crypto.randomUUID(), action: 'tracker' })
  }), { DB: D1 })
  assert.match((await requestTracker()).headers.get('Location'), /game=cooldown/)
  db.prepare('UPDATE web_game_actions SET finished_at = ? WHERE finished_at IS NOT NULL').run(Date.now() - 6000)
  const trackerAction = await requestTracker()
  assert.equal(trackerAction.status, 303)
  assert.ok((await pollWeb()).some(action => action.command === '!legendaryticket'))
  db.prepare('UPDATE shop_orders SET created_at = 1 WHERE result IS NOT NULL').run()
  const oldPending = crypto.randomUUID()
  const oldDispatched = crypto.randomUUID()
  const insertOld = db.prepare('INSERT INTO shop_orders (id, community_id, viewer_id, item, created_at, dispatched_at) VALUES (?, ?, ?, ?, ?, ?)')
  insertOld.run(oldPending, 'stream', 'twitch:1', 'poke-ball', Date.now() - 121000, null)
  insertOld.run(oldDispatched, 'stream', 'kick:999', 'poke-ball', Date.now() - 700000, Date.now() - 610000)
  const recoveredOrder = crypto.randomUUID()
  assert.match((await order(recoveredOrder, 100, 1)).headers.get('Location'), new RegExp('purchase=' + recoveredOrder))
  assert.equal(db.prepare('SELECT result FROM shop_orders WHERE id = ?').get(oldPending).result, 'expired')
  assert.equal(db.prepare('SELECT result FROM shop_orders WHERE id = ?').get(oldDispatched).result, 'review')
  await device('GET', undefined, { 'poke-ball': 100 })
  assert.ok(db.prepare('SELECT dispatched_at FROM shop_orders WHERE id = ?').get(recoveredOrder).dispatched_at)
  const mixed = await device('POST', { viewers: [
    { id: recoveredOrder, result: 'purchased', viewer: { ...orderViewer, id: 'twitch:9' } },
    { id: oldDispatched, result: 'funds' }
  ] })
  assert.deepEqual(await mixed.json(), { received: [oldDispatched] })
  assert.equal(db.prepare('SELECT result FROM shop_orders WHERE id = ?').get(recoveredOrder).result, null)
  assert.equal(db.prepare('SELECT result FROM shop_orders WHERE id = ?').get(oldDispatched).result, 'funds')
  db.prepare('DELETE FROM shop_orders WHERE id = ?').run(oldDispatched)
  await device('POST', { viewers: [{ id: recoveredOrder, result: 'funds' }] })
  const burst = db.prepare("INSERT INTO shop_orders (id, community_id, viewer_id, item, created_at, result) VALUES (?, 'stream', 'twitch:1', 'poke-ball', ?, 'funds')")
  for (let index = 0; index < 8; index++) burst.run(crypto.randomUUID(), Date.now())
  assert.match((await order(crypto.randomUUID(), 100, 1)).headers.get('Location'), /retry=1/)
  const adminUrl = base + '/admin?community=stream'
  const authAdmin = (url, headers = cookie) => worker.fetch(new Request(url, { headers }), { DB: D1 })
  assert.equal((await authAdmin(adminUrl, {})).status, 401)
  assert.equal((await authAdmin(adminUrl)).status, 403)
  db.prepare('INSERT INTO community_owners VALUES (?, ?, ?)').run('1', 'stream', hash)
  assert.equal((await authAdmin(base + '/admin?community=another')).status, 403)
  assert.equal((await authAdmin(adminUrl)).status, 200)
  const pollAdmin = async () => (await (await worker.fetch(new Request(base + '/api/shop', {
    headers: { Authorization: 'Bearer ' + token, 'X-Admin-Actions': '1' }
  }), { DB: D1 })).json()).adminActions
  assert.deepEqual(await pollAdmin(), [])
  const adminId = crypto.randomUUID()
  const adminPost = origin => worker.fetch(new Request(adminUrl, { method: 'POST',
    headers: { ...cookie, Origin: origin }, body: new URLSearchParams({ id: adminId, type: 'grant', viewer: 'twitch:1', kind: 'money', amount: '5000' })
  }), { DB: D1 })
  assert.equal((await adminPost('https://other.test')).status, 403)
  assert.match((await adminPost(base)).headers.get('Location'), /status=queued/)
  assert.deepEqual(await pollAdmin(), [{ id: adminId, type: 'grant', viewerId: 'twitch:1', kind: 'money', item: '', amount: 5000 }])
  const ackAdmin = await worker.fetch(new Request(base + '/api/admin-actions', { method: 'POST',
    headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ viewers: [{ id: adminId, result: 'done' }] })
  }), { DB: D1 })
  assert.deepEqual(await ackAdmin.json(), { received: [adminId] })
  assert.deepEqual(await pollAdmin(), [])
  const ruleForm = new FormData()
  const rulesId = crypto.randomUUID()
  for (const [key, value] of Object.entries({ id: rulesId, type: 'speciesRules', kind: 'catch' })) ruleForm.set(key, value)
  ruleForm.set('rules', new Blob([JSON.stringify({ species: { 19: { rate: 120, percentages: [40, 60, 90] } } })]), 'catch-rates.json')
  const rulesRequest = headers => worker.fetch(new Request(adminUrl, { method: 'POST', headers, body: ruleForm }), { DB: D1 })
  assert.equal((await rulesRequest({ Origin: base })).status, 401)
  assert.equal((await rulesRequest({ ...cookie, Origin: 'https://other.test' })).status, 403)
  assert.match((await rulesRequest({ ...cookie, Origin: base })).headers.get('Location'), /status=queued/)
  assert.deepEqual(await pollAdmin(), [{ id: rulesId, type: 'speciesRules', kind: 'catch', rules: { species: { 19: { rate: 120, percentages: [40, 60, 90] } } } }])
  db.prepare('DELETE FROM community_owners WHERE community_id = ?').run('stream')
  const confirmPage = await worker.fetch(new Request(base + '/auth/delete', { headers: { Cookie: 'sc_session=' + session } }), { DB: D1 })
  const confirmationCookie = confirmPage.headers.getSetCookie().find(item => item.startsWith('sc_delete=')).split(';')[0]
  const nonce = confirmationCookie.slice('sc_delete='.length).split('.')[0]
  const deleteWith = body => worker.fetch(new Request(base + '/auth/delete', {
    method: 'POST', headers: { Origin: base, Cookie: 'sc_session=' + session + '; ' + confirmationCookie }, body: new URLSearchParams(body)
  }), { DB: D1 })
  assert.match((await deleteWith({ nonce, confirm: 'incorrect' })).headers.get('Location'), /auth\/delete/)
  assert.match((await deleteWith({ nonce, confirm: 'ELIMINAR' })).headers.get('Location'), /deleted=1/)
  const upload = (generation, revision = 30) => worker.fetch(new Request(base + '/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + token },
    body: JSON.stringify({ viewers: [{ id: 'twitch:1', revision, generation, displayName: 'viewer', balls: { normal: 5, great: 0, ultra: 0, master: 0 }, collection: {} }] })
  }), { DB: D1 })
  assert.equal((await upload()).status, 200)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM viewer_progress').get().count, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM shop_orders').get().count, 0)
  const privacy = await worker.fetch(new Request(base + '/api/privacy', { headers: { Authorization: 'Bearer ' + token } }), { DB: D1 })
  assert.deepEqual(await privacy.json(), { viewers: ['twitch:1'], erasures: [{ viewer_id: 'twitch:1', generation: 1, active: 0 }] })
  await signIn(D1, { viewerId: 'kick:2', login: 'viewer' })
  const account = db.prepare("SELECT account_id FROM account_identities WHERE viewer_id = 'kick:2'").get().account_id
  assert.ok(await signIn(D1, { viewerId: 'twitch:1', login: 'viewer' }, account))
  assert.equal(db.prepare("SELECT generation FROM erased_viewers WHERE viewer_id = 'twitch:1'").get().generation, 2)
  assert.equal(db.prepare("SELECT account_id FROM account_identities WHERE viewer_id = 'twitch:1'").get().account_id, account)
  assert.equal((await upload()).status, 200)
  assert.equal((await upload(1)).status, 200)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM viewer_progress').get().count, 0)
  assert.equal((await upload(2, 1)).status, 200)
  assert.equal((await upload(undefined, 99)).status, 200)
  assert.equal(db.prepare('SELECT revision FROM viewer_progress').get().revision, 1)
  const newToken = 'c'.repeat(64)
  const newHash = createHash('sha256').update(newToken).digest('hex')
  const reset = await worker.fetch(new Request(base + '/api/devices/reset', { method: 'POST', headers: {
    Authorization: 'Bearer ' + token, 'X-Device-Fingerprint': newHash
  } }), { DB: D1 })
  assert.equal(reset.status, 204)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM viewer_progress').get().count, 0)
  assert.equal((await upload(2, 99)).status, 401)
  const recovery = await worker.fetch(new Request(base + '/api/devices/status', {
    headers: { Authorization: 'Bearer ' + newToken }
  }), { DB: D1 })
  assert.deepEqual(await recovery.json(), { community: 'stream' })
})
