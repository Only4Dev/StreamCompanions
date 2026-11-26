import { botCopy, botResponse, validateBot } from '../ui/bot-copy.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { connectTwitch, twitchChatHandler } from '../desktop/twitch.js'

test('chat mute keeps inventory replies and still forwards catches to the portal', async () => {
  const replies = []
  const portal = []
  const bot = validateBot({ nickname: '', language: 'en', announceInChat: false, responses: {} })
  const handler = twitchChatHandler({ owner: '1', getBot: () => bot, commandFeedback: true,
    command: (_, viewer, text) => text === '!balls' ? { code: 'ballInventory', viewer, inventory: 'Poké Ball ×5' } :
      { code: 'catchSuccess', viewer, pokemon: 'Eevee' },
    onBotMessage: message => portal.push(message), reply: message => replies.push(message)
  })
  const event = (id, text) => ({ message_id: id, broadcaster_user_id: '1', chatter_user_id: '2',
    chatter_user_name: 'Viewer', message: { text } })
  await handler(event('1', '!catch'))
  await handler(event('2', '!inventory'))
  await handler(event('3', '!poke bag'))
  assert.equal(portal.length, 1)
  assert.match(portal[0], /caught Eevee/)
  assert.equal(replies.length, 2)
  assert.ok(replies.every(reply => reply.includes('Poké Ball ×5')))
})

test('the Twitch bot passes the stable owner identity to evolution and explains automatic unlocks', async () => {
  const replies = []
  const handler = twitchChatHandler({ owner: '1', command: (id, _, text) => {
    assert.equal(id, 'twitch:2')
    assert.equal(text, '!evolve slowpoke slowking')
    return 'automaticEvolution'
  }, reply: value => replies.push(value) })
  await handler({ message_id: 'evolve-1', broadcaster_user_id: '1', chatter_user_id: '2',
    chatter_user_login: 'viewer', chatter_user_name: 'Viewer', message: { text: '!evolución slowpoke slowking' } })
  assert.match(replies[0], /@viewer Las evoluciones se desbloquean/)
})

test('Twitch events validate follows, deduplicate messages, and use stable identity', async () => {
  const commands = []
  const replies = []
  const followChecks = []
  const handle = twitchChatHandler({
    owner: '1', webUrl: 'https://example.com/channel',
    follows: async id => { followChecks.push(id); return id === '2' },
    command: (...args) => commands.push(args),
    reply: message => replies.push(message)
  })
  const event = (id, user, text) => ({
    message_id: id, broadcaster_user_id: '1', chatter_user_id: user,
    chatter_user_name: 'Viewer', chatter_user_login: 'viewer', message: { text }
  })
  await handle(event('a', '2', '!poke join'))
  await handle(event('a', '2', '!poke join'))
  await handle(event('b', '3', '!poke join'))
  await handle(event('c', '1', '!catch'))
  await handle(event('d', '2', '!catch'))
  await handle(event('e', '2', '!web'))
  await handle(event('f', '3', '!web'))
  assert.deepEqual(followChecks, ['2', '3'])
  assert.deepEqual(commands, [['twitch:2', 'Viewer', '!poke join'], ['twitch:2', 'Viewer', '!catch']])
  assert.equal(replies.length, 2)
  assert.equal(replies[1], 'https://example.com/channel')
})


test('an expired saved Twitch session refreshes without requesting a device code', async t => {
  const requests = []
  const renewed = { access_token: 'new', refresh_token: 'rotated' }
  t.mock.method(globalThis, 'fetch', async url => {
    requests.push(new URL(url).pathname)
    if (requests.length === 1) return new Response(null, { status: 401 })
    if (requests.length === 2) return Response.json(renewed)
    return Response.json({ client_id: 'test', user_id: '1', login: 'owner' })
  })
  const originalSocket = globalThis.WebSocket
  globalThis.WebSocket = class extends EventTarget {
    close() {}
    constructor() { super(); opened() }
  }
  let opened
  const connected = new Promise(resolve => { opened = resolve })
  let saved
  const disconnect = connectTwitch({
    clientId: 'test',
    savedToken: { access_token: 'old', refresh_token: 'old-refresh' },
    saveToken: token => { saved = token },
    announceCode: () => assert.fail('unexpected authorization'),
    onStatus: status => assert.fail(status)
  })
  try {
    await connected
    assert.deepEqual(requests, ['/oauth2/validate', '/oauth2/token', '/oauth2/validate'])
    assert.deepEqual(saved, renewed)
  } finally {
    disconnect()
    globalThis.WebSocket = originalSocket
  }
})

test('a network failure on startup retries the same Twitch session', async t => {
  let requests = 0
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.mock.method(globalThis, 'fetch', async () => {
    if (++requests === 1) throw new TypeError('offline')
    return Response.json({ client_id: 'test', user_id: '1', login: 'owner' })
  })
  const originalSocket = globalThis.WebSocket
  let opened
  let retrying
  const connected = new Promise(resolve => { opened = resolve })
  const waiting = new Promise(resolve => { retrying = resolve })
  globalThis.WebSocket = class extends EventTarget {
    close() {}
    constructor() { super(); opened() }
  }
  const disconnect = connectTwitch({
    clientId: 'test', savedToken: { access_token: 'saved' },
    announceCode: () => assert.fail('unexpected authorization'),
    onStatus: retrying
  })
  try {
    assert.match(await waiting, /reconectando/)
    t.mock.timers.tick(3000)
    await connected
    assert.equal(requests, 2)
  } finally {
    disconnect()
    globalThis.WebSocket = originalSocket
  }
})

test('only successful catches are announced in Twitch chat', async () => {
  let time = 0
  let result = 'noBalls'
  let nextId = 0
  const replies = []
  const handler = twitchChatHandler({
    owner: '1', command: () => result, reply: text => replies.push(text), now: () => time
  })
  const catchFrom = id => handler({
    message_id: String(++nextId), broadcaster_user_id: '1', chatter_user_id: id,
    chatter_user_name: 'Viewer', chatter_user_login: 'viewer' + id, message: { text: '!catch' }
  })
  await catchFrom('2')
  await catchFrom('3')
  time = 3000
  await catchFrom('2')
  await catchFrom('3')
  time = 12_000
  result = 'noEncounter'
  await catchFrom('2')
  time = 24_000
  result = { code: 'catchSuccess', viewer: 'Viewer', pokemon: 'Dreepy' }
  await catchFrom('2')
  assert.deepEqual(replies, ['¡Viewer capturó a Dreepy!'])
})

test('Twitch bot signs custom English responses and honors disabled replies', async () => {
  const replies = []
  let current = { language: 'en', nickname: 'PokéGuide', responses: { catchSuccess: 'Well done, {viewer}.' } }
  const handle = twitchChatHandler({ owner: '1', command: () => ({ code: 'catchSuccess', viewer: 'Viewer', pokemon: 'Dreepy' }), reply: text => replies.push(text),
    now: () => replies.length * 15_000, getBot: () => current })
  const event = { broadcaster_user_id: '1', chatter_user_id: '2', chatter_user_name: 'Viewer',
    chatter_user_login: 'viewer', message: { text: '!catch' } }
  await handle({ ...event, message_id: 'a' })
  current = { ...current, responses: { catchSuccess: '' } }
  await handle({ ...event, message_id: 'b' })
  assert.deepEqual(replies, ['[PokéGuide] Well done, Viewer.'])
})

test('changing the app language only translates stock bot messages', () => {
  const bot = validateBot({ nickname: 'Pika', language: 'es', responses: {
    es: { noBalls: botCopy.es.noBalls, noEncounter: 'Texto personalizado' },
    en: { noBalls: botCopy.en.noBalls, escaped: '' }
  } })
  const english = validateBot({ ...bot, language: 'en' })
  assert.equal(botResponse(english, 'noBalls'), botCopy.en.noBalls)
  assert.equal(botResponse(english, 'noEncounter'), 'Texto personalizado')
  assert.equal(botResponse(english, 'escaped'), '')
})

test('Spanish Twitch aliases use the same follower and catch feedback gates', async () => {
  let checks = 0
  const replies = []
  const handler = twitchChatHandler({
    owner: '1', now: () => 10_000,
    follows: async () => { checks++; return false },
    command: (_viewer, _name, text) => { assert.equal(text, '!catch master'); return 'noBalls' },
    reply: text => replies.push(text)
  })
  const event = { broadcaster_user_id: '1', chatter_user_id: '2', chatter_user_name: 'Viewer', chatter_user_login: 'viewer' }
  await handler({ ...event, message_id: '1', message: { text: '!registrar' } })
  await handler({ ...event, message_id: '2', message: { text: '!captura maestra' } })
  assert.equal(checks, 1)
  assert.match(replies[0], /Sigue el canal/)
  assert.equal(replies.length, 1)
})
