import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { authorizeUrl, sessionKey, signIn, unlinkIdentity } from './auth.js'

test('existing progress keeps its account and Kick can be linked without stealing another identity', async () => {
  const db = new DatabaseSync(':memory:')
  try {
    for (const migration of ['0001_sync', '0002_portal', '0003_viewer_login']) {
      db.exec(await readFile(new URL('./migrations/' + migration + '.sql', import.meta.url), 'utf8'))
    }
    db.exec("INSERT INTO viewer_progress VALUES ('demo', 'twitch:1', 1, '{}', 0)")
    db.exec(await readFile(new URL('./migrations/0004_accounts.sql', import.meta.url), 'utf8'))
    db.exec(await readFile(new URL('./migrations/0011_unlink.sql', import.meta.url), 'utf8'))
    db.exec(await readFile(new URL('./migrations/0012_account_erasure.sql', import.meta.url), 'utf8'))
    db.exec(await readFile(new URL('./migrations/0014_viewer_generations.sql', import.meta.url), 'utf8'))
    const portable = {
      prepare(sql) { return { bind(...args) { return () => ({ meta: db.prepare(sql).run(...args) }) } } },
      async batch(items) {
        db.exec('BEGIN')
        try {
          const result = items.map(statement => statement())
          db.exec('COMMIT')
          return result
        } catch (error) {
          db.exec('ROLLBACK')
          throw error
        }
      }
    }
    const account = id => db.prepare('SELECT account_id FROM account_identities WHERE viewer_id = ?').get(id)?.account_id
    const original = account('twitch:1')
    assert.ok(original)
    const session = await signIn(portable, { viewerId: 'twitch:1', login: 'viewer' })
    assert.match(session, /^[0-9a-f]{64}$/)
    assert.equal(db.prepare('SELECT id FROM web_sessions').get().id, await sessionKey(session))
    assert.ok(await signIn(portable, { viewerId: 'kick:1', login: 'viewer' }, original))
    assert.equal(account('kick:1'), original)
    assert.equal(account('twitch:1'), original)
    assert.equal(await signIn(portable, { viewerId: 'kick:3', login: 'alternate' }, original), null)
    assert.equal(account('kick:3'), undefined)
    assert.ok(await signIn(portable, { viewerId: 'kick:2', login: 'other' }))
    assert.equal(await signIn(portable, { viewerId: 'kick:2', login: 'other' }, original), null)
    assert.notEqual(account('kick:2'), original)
    assert.equal(db.prepare('SELECT COUNT(*) AS rows FROM viewer_progress').get().rows, 1)
    assert.equal(await unlinkIdentity(portable, original, 'kick:2'), false)
    assert.equal(await unlinkIdentity(portable, original, 'kick:1'), true)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM web_sessions WHERE viewer_id = 'kick:1'").get().n, 0)
    assert.equal(await unlinkIdentity(portable, original, 'twitch:1'), false)
    assert.equal(await signIn(portable, { viewerId: 'kick:1', login: 'viewer' }), null)
    assert.equal(account('kick:1'), original)
    assert.ok(await signIn(portable, { viewerId: 'kick:1', login: 'viewer' }, original))
    assert.ok(await signIn(portable, { viewerId: 'twitch:2', login: 'other twitch' }))
    const second = account('twitch:2')
    assert.ok(await signIn(portable, { viewerId: 'kick:2', login: 'other' }, second))
    assert.equal(account('kick:2'), second)
    assert.equal(await unlinkIdentity(portable, second, 'kick:2'), true)
    assert.ok(await signIn(portable, { viewerId: 'twitch:3', login: 'third twitch' }))
    const third = account('twitch:3')
    assert.ok(await signIn(portable, { viewerId: 'kick:2', login: 'other' }, third))
    assert.equal(account('kick:2'), third)
  } finally {
    db.close()
  }
})

test('Kick authorization uses PKCE and the viewer identity scope', async () => {
  const url = new URL(await authorizeUrl('kick', { id: 'test' }, 'https://example.test/callback', 'state', 'verifier'))
  assert.equal(url.origin, 'https://id.kick.com')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.match(url.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/)
  assert.equal(url.searchParams.get('scope'), 'user:read')
})
