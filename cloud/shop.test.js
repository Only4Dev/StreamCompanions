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
    '0007_held_items', '0008_community_owners', '0009_shop', '0010_shop_prices', '0011_unlink', '0012_account_erasure', '0013_dna_boosters', '0014_viewer_generations', '0015_stream_status', '0018_shop_quantity', '0019_web_game', '0020_portal_announcements']) {
    db.exec(await readFile(new URL('./migrations/' + migration + '.sql', import.meta.url), 'utf8'))
  }
  const D1 = {
    prepare(sql) {
      return { all: () => ({ results: db.prepare(sql).all() }), bind(...args) { return {
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
    method, headers: { Authorization: 'Bearer ' + token, ...(prices && { 'X-Shop-Prices': JSON.stringify(prices) }), ...(bulk && { 'X-Shop-Quantity': '1' }) }, body: body && JSON.stringify(body)
  }), { DB: D1 })
  const order = (id, price, quantity) => worker.fetch(new Request(base + '/shop/buy?community=stream&item=poke-ball&order=' + id + (price ? '&price=' + price : ''), {
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
  const runtimeHeaders = { Authorization: 'Bearer ' + token, 'X-Web-Game': JSON.stringify({ id: '100:1', en: 'Easy', es: 'Fácil' }) }
  db.prepare('INSERT INTO community_stream_status VALUES (?, ?, ?)').run('stream', Date.now(), JSON.stringify([
    { provider: 'twitch', login: 'streamer', live: true }
  ]))
  const pollWeb = async () => (await (await worker.fetch(new Request(base + '/api/shop', { headers: runtimeHeaders }), { DB: D1 })).json()).webActions
  assert.deepEqual(await pollWeb(), [])
  const liveUrl = base + '/?tab=live&community=stream&platform=twitch'
  const livePage = await worker.fetch(new Request(liveUrl, { headers: { Cookie: 'sc_session=' + session } }), { DB: D1 })
  assert.match(livePage.headers.get('Content-Security-Policy'), /connect-src 'self'/)
  const liveHtml = await livePage.text()
  assert.match(liveHtml, /player\.twitch\.tv\/\?channel=streamer&amp;parent=example\.test/)
  assert.match(liveHtml, /data-capture-form/)
  assert.match(liveHtml, /<a href="\/">Inicio<\/a>/)
  const feed = base + '/live/announcements?community=stream'
  const event = { id: 'c'.repeat(32), message: '¡Aparecerá un Pokémon en 2 minutos!' }
  const announce = (headers = {}) => worker.fetch(new Request(base + '/api/announcements', {
    method: 'POST', headers, body: JSON.stringify({ viewers: [event] })
  }), { DB: D1 })
  assert.equal((await announce()).status, 401)
  assert.equal((await announce({ Authorization: 'Bearer ' + token })).status, 200)
  assert.equal((await announce({ Authorization: 'Bearer ' + token })).status, 200)
  assert.deepEqual(await (await worker.fetch(new Request(feed), { DB: D1 })).json(), { events: [event] })
  assert.match(liveHtml, /data-announcements="stream"/)
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
  assert.match(liveHtml, /<div class="live-layout">[\s\S]*<iframe[\s\S]*id="play-web"/)
  assert.match(liveHtml, /Jugar en web/)
  assert.match(liveHtml, /name="ball" value="master"/)
  const [queued] = await pollWeb()
  assert.equal(queued.command, '!catch normal')
  assert.equal(queued.encounterId, '100:1')
  const actionStatus = new URL(base + '/live/status?community=stream&platform=twitch&game=' + actionId)
  assert.equal((await worker.fetch(new Request(actionStatus), { DB: D1 })).status, 401)
  const finish = await worker.fetch(new Request(base + '/api/web-game', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token },
    body: JSON.stringify({ viewers: [{ id: actionId, result: 'catchSuccess' }] })
  }), { DB: D1 })
  assert.deepEqual(await finish.json(), { received: [actionId] })
  assert.deepEqual(await pollWeb(), [])
  const complete = await worker.fetch(new Request(actionStatus, { headers: { Cookie: 'sc_session=' + session } }), { DB: D1 })
  assert.match((await complete.json()).message, /Capturaste/)
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
  assert.match(await logPage.text(), /viewer lanzó una Super Ball · Se escapó · Restantes \(Super Ball\): 0/)
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
