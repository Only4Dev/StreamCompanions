import assert from 'node:assert/strict'
import test from 'node:test'
import { projectBotAuthorization, twitchProjectReply } from './project-bots.js'

test('only the project operator can request authorization for the shared Twitch bot', async () => {
  const url = new URL('https://example.test/api/project-bot/twitch')
  const env = { PROJECT_BOT_SETUP_KEY: 'operator', TWITCH_WEB_CLIENT_ID: 'app', TWITCH_WEB_CLIENT_SECRET: 'secret',
    DB: { prepare() { return { bind() {} } }, async batch() {} } }
  assert.equal((await projectBotAuthorization(new Request(url), url, env, 'twitch')).status, 401)
  const request = new Request(url, { headers: { Authorization: 'Bearer operator' } })
  const response = await projectBotAuthorization(request, url, env, 'twitch')
  const authorization = new URL((await response.json()).url)
  assert.equal(authorization.searchParams.get('scope'), 'user:write:chat user:bot')
  assert.equal(authorization.searchParams.get('redirect_uri'), 'https://example.test/auth/twitch/callback')
})

test('Twitch sends as the shared bot to the channel bound to the authenticated device', async t => {
  const device = { community_id: 'community', key_hash: 'device' }
  let sender = '22'
  const env = { TWITCH_WEB_CLIENT_ID: 'app', TWITCH_WEB_CLIENT_SECRET: 'secret',
    DB: { prepare() { return { bind(...keys) {
      assert.deepEqual(keys, ['community', 'device'])
      return { first: async () => ({ broadcaster: '11', sender }) }
    } } } } }
  const sent = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.includes('oauth2/token')) return Response.json({ access_token: 'app-token', expires_in: 3600 })
    sent.push(JSON.parse(options.body))
    return Response.json({ data: [{ is_sent: true }] })
  })
  const request = () => new Request('https://example.test/api/twitch/bot-reply', {
    method: 'POST', body: JSON.stringify({ message: 'Hello', broadcaster_id: '33', sender_id: '44' })
  })
  assert.equal((await twitchProjectReply(request(), env, null)).status, 401)
  assert.equal((await twitchProjectReply(request(), env, device)).status, 204)
  sender = '11'
  assert.equal((await twitchProjectReply(request(), env, device)).status, 409)
  assert.deepEqual(sent, [{ broadcaster_id: '11', sender_id: '22', message: 'Hello' }])
})
