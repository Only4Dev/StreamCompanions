import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyKickMessage, kickWebhook, kickDevice } from './kick.js'

test('Kick signatures cover message id, timestamp and the exact request body', async () => {
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }
  const { privateKey, publicKey } = await crypto.subtle.generateKey(algorithm, false, ['sign', 'verify'])
  const id = 'example-delivery'
  const timestamp = new Date().toISOString()
  const raw = '{"content":"!catch"}'
  const payload = new TextEncoder().encode(id + '.' + timestamp + '.' + raw)
  const signature = Buffer.from(await crypto.subtle.sign(algorithm.name, privateKey, payload)).toString('base64')
  assert.equal(await verifyKickMessage(publicKey, id, timestamp, raw, signature), true)
  assert.equal(await verifyKickMessage(publicKey, id, timestamp, raw + ' ', signature), false)
  assert.equal(await verifyKickMessage(publicKey, id + '2', timestamp, raw, signature), false)
  const request = new Request('https://example.com/webhooks/kick', {
    method: 'POST', body: raw, headers: { 'Kick-Event-Message-Id': id,
      'Kick-Event-Message-Timestamp': '2000-01-01T00:00:00Z', 'Kick-Event-Signature': signature }
  })
  assert.equal((await kickWebhook(request, null)).status, 401)
})

test('desktop Kick pairing demands a device and requests chat permissions only for the broadcaster', async () => {
  const url = new URL('https://example.com/api/kick/connect')
  const req = new Request(url, { method: 'POST' })
  assert.equal((await kickDevice(req, url, {}, null)).status, 401)
  const commands = []
  const env = { KICK_WEB_CLIENT_ID: 'id', KICK_WEB_CLIENT_SECRET: 'secret', KICK_TOKEN_KEY: 'configured',
    DB: { prepare(sql) { return { bind(...args) { commands.push({ sql, args }); return this } } }, async batch() {} } }
  const result = await kickDevice(req, url, env, { community_id: 'community', key_hash: 'device' })
  const authorization = new URL((await result.json()).url)
  assert.equal(authorization.origin, 'https://id.kick.com')
  assert.equal(authorization.searchParams.get('scope'), 'user:read events:subscribe chat:write')
  assert.equal(authorization.searchParams.get('redirect_uri'), 'https://example.com/auth/kick/callback')
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(commands[1].args[1], 'community')
})
