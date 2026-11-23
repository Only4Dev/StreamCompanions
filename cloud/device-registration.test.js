import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import worker from './worker.js'

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
