import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import worker from './worker.js'
import { createHash } from 'node:crypto'

test('a verified Twitch owner can retry their device registration without replacing another device', async t => {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  for (const name of ['0001_sync', '0008_community_owners']) {
    db.exec(await readFile(new URL('./migrations/' + name + '.sql', import.meta.url), 'utf8'))
  }
  const D1 = {
    prepare(sql) {
      return { bind(...params) { return {
        run: () => db.prepare(sql).run(...params), first: () => db.prepare(sql).get(...params)
      } } }
    },
    async batch(statements) { return statements.map(statement => statement.run()) }
  }
  const client_id = 'm2vfvdba9flbjxhbq3nndyqx4tsdar'
  let identity = { client_id, user_id: '1', login: 'host' }
  t.mock.method(globalThis, 'fetch', async () => Response.json(identity))
  const register = key => worker.fetch(new Request('https://example.test/api/devices/register', {
    method: 'POST', headers: { Authorization: 'OAuth ' + 'a'.repeat(30), 'X-Device-Fingerprint': key.repeat(64) }
  }), { DB: D1 })
  assert.deepEqual(await (await register('a')).json(), { community: 'host' })
  identity = { client_id, user_id: '1', login: 'renamed' }
  assert.deepEqual(await (await register('a')).json(), { community: 'host' })
  assert.equal((await register('b')).status, 409)
  identity = { client_id, user_id: '2', login: 'host' }
  assert.equal((await register('c')).status, 409)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM devices').get().count, 1)
})

test('Kick can create a community and Twitch can join it with the same device', async t => {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  for (const name of ['0001_sync', '0006_kick', '0008_community_owners']) {
    db.exec(await readFile(new URL('./migrations/' + name + '.sql', import.meta.url), 'utf8'))
  }
  const env = {
    KICK_WEB_CLIENT_ID: 'test-client', KICK_WEB_CLIENT_SECRET: 'test-secret', KICK_TOKEN_KEY: Buffer.alloc(32).toString('base64'),
    DB: {
      prepare(sql) { return { bind(...args) { return {
        run: () => ({ meta: db.prepare(sql).run(...args) }),
        first: () => db.prepare(sql).get(...args), all: () => ({ results: db.prepare(sql).all(...args) })
      } } } },
      async batch(statements) { return statements.map(statement => statement.run()) }
    }
  }
  t.mock.method(globalThis, 'fetch', async url => {
    if (url === 'https://id.kick.com/oauth/token') return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 })
    if (url === 'https://api.kick.com/public/v1/users') return Response.json({ data: [{ user_id: 55, name: 'host-kick' }] })
    if (url === 'https://api.kick.com/public/v1/events/subscriptions') return Response.json({ data: [{ name: 'chat.message.sent' }] })
    if (url === 'https://id.twitch.tv/oauth2/validate') return Response.json({ client_id: 'm2vfvdba9flbjxhbq3nndyqx4tsdar', user_id: '12', login: 'host_twitch' })
    throw new Error('Unexpected provider URL')
  })
  const token = 'a'.repeat(64)
  const hash = createHash('sha256').update(token).digest('hex')
  const request = (path, options) => worker.fetch(new Request('https://example.test' + path, options), env)
  const pairing = async fingerprint => {
    const response = await request('/api/kick/register', { method: 'POST', headers: { 'X-Device-Fingerprint': fingerprint } })
    const state = new URL((await response.json()).url).searchParams.get('state')
    return '/auth/kick/callback?code=code&state=' + state
  }
  const status = () => request('/api/devices/status', { headers: { Authorization: 'Bearer ' + token } })
  assert.equal((await status()).status, 404)
  const callback = await pairing(hash)
  assert.equal((await request(callback)).status, 200)
  assert.equal((await request(callback)).status, 400)
  assert.deepEqual(await (await status()).json(), { community: 'kick-55' })
  assert.equal((await request(await pairing('b'.repeat(64)))).status, 409)
  const twitch = device => request('/api/devices/register', { method: 'POST', headers: {
    Authorization: 'OAuth ' + 't'.repeat(30), 'X-Device-Fingerprint': hash, ...(device ? { 'X-Community-Device': device } : {})
  } })
  assert.equal((await twitch()).status, 409)
  assert.equal((await twitch('c'.repeat(64))).status, 401)
  assert.deepEqual(await (await twitch(token)).json(), { community: 'kick-55' })
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM devices').get().count, 1)
})
