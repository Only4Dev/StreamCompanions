import { normalizeCommand } from './commands.js'
import { botResponse, botSignature, defaultBot, formatBotReply } from '../ui/bot-copy.js'

const oauth = 'https://id.twitch.tv/oauth2/'
const helix = 'https://api.twitch.tv/helix/'
const endpoint = 'wss://eventsub.wss.twitch.tv/ws'
const scopes = 'user:read:chat user:write:chat moderator:read:followers'

export function twitchChatHandler({ owner, follows, command, reply, webUrl, getBot = () => defaultBot, isRunning = () => true, now = Date.now }) {
  const seen = new Map()
  let lastLink = -Infinity
  let lastEvolutionReply = -Infinity
  return async event => {
    if (event.chatter_user_id === owner || event.broadcaster_user_id !== owner ||
        !event.message_id || seen.has(event.message_id)) return
    const time = now()
    seen.set(event.message_id, time)
    for (const [id, received] of seen) {
      if (time - received < 600_000 && seen.size <= 10_000) break
      seen.delete(id)
    }
    const text = normalizeCommand(event.message.text)
    const viewer = 'twitch:' + event.chatter_user_id
    const bot = getBot()
    const send = message => reply(botSignature(bot, message).slice(0, 500))
    if (text.toLowerCase() === '!web') {
      if (webUrl && time - lastLink >= 60_000) {
        lastLink = time
        const message = botResponse(bot, 'web')
        if (message) await send(message.replaceAll('{url}', () => webUrl))
      }
      return
    }
    if (!isRunning()) return
    if (text.toLowerCase() === '!poke join' && !(await follows(event.chatter_user_id))) {
      const hint = botResponse(bot, 'follow')
      if (hint) await send('@' + event.chatter_user_login + ' ' + hint)
      return
    }
    const result = await command(viewer, event.chatter_user_name, text)
    if (/^!(?:evolve|candy)(?:\s|$)/i.test(text) || result === 'summonOtherChannel') {
      const hint = formatBotReply(bot, result?.code ?? result, result ?? {})
      if (hint && time - lastEvolutionReply >= 3000) {
        lastEvolutionReply = time
        await send('@' + event.chatter_user_login + ' ' + hint)
      }
      return
    }
    if (result?.code !== 'catchSuccess') return
    const hint = formatBotReply(bot, result.code, result)
    if (hint) await send(hint)
  }
}

export function connectTwitch({ clientId, announceCode, onStatus, onAuthorized, command, webUrl, getBot, isRunning, savedToken, saveToken = () => {} }) {
  const stop = new AbortController()
  let socket
  let candidate
  let retry
  let validation
  let validationInFlight
  let validationGeneration = 0
  let retryDelay = 3000
  let watchdog
  let token = savedToken
  let identity
  let handleChat
  let chatConnected = false
  let incoming = Promise.resolve()
  const signal = stop.signal
  const requestSignal = () => AbortSignal.any([signal, AbortSignal.timeout(12_000)])
  const httpError = (message, status) => Object.assign(new Error(message + ' (HTTP ' + status + ')'), { status })
  const temporary = error => error instanceof TypeError || error.name === 'TimeoutError' ||
    error.status === 429 || error.status >= 500
  function retryConnection(resume) {
    if (signal.aborted) return
    onStatus('Twitch: reconectando…')
    clearTimeout(retry)
    retry = setTimeout(() => Promise.resolve().then(resume).catch(fail), retryDelay)
    retryDelay = Math.min(retryDelay * 2, 60_000)
  }
  const wait = ms => new Promise(resolve => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel)
      resolve()
    }, ms)
    function cancel() {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', cancel, { once: true })
    if (signal.aborted) cancel()
  })
  const form = (path, fields) => fetch(oauth + path, {
    method: 'POST', redirect: 'error', body: new URLSearchParams({ client_id: clientId, ...fields }), signal: requestSignal()
  })
  async function api(path, data) {
    const res = await fetch(helix + path, {
      method: data ? 'POST' : 'GET', redirect: 'error',
      headers: { 'Client-Id': clientId, Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined, signal: requestSignal()
    })
    if (!res.ok) throw httpError('Twitch API', res.status)
    return res.json()
  }
  async function validate() {
    const res = await fetch(oauth + 'validate', {
      headers: { Authorization: 'OAuth ' + token.access_token }, redirect: 'error', signal: requestSignal()
    })
    if (res.status === 401) return null
    if (!res.ok) throw httpError('Autorización de Twitch', res.status)
    const current = await res.json()
    if (current.client_id !== clientId || (identity && current.user_id !== identity.user_id)) {
      throw new Error('Identidad de Twitch inesperada')
    }
    identity = current
    return current
  }
  async function authorize() {
    const response = await form('device', { scopes })
    if (!response.ok) throw httpError('Registro de aplicación en Twitch', response.status)
    const device = await response.json()
    const verification = new URL(device.verification_uri)
    if (verification.origin !== 'https://www.twitch.tv') throw new Error('Destino de autorización inesperado')
    announceCode(verification.href, device.user_code)
    const deadline = Date.now() + device.expires_in * 1000
    let delay = Math.max(5, device.interval) * 1000
    while (!signal.aborted && Date.now() < deadline) {
      await wait(delay)
      if (signal.aborted) return
      const result = await form('token', { scope: scopes, device_code: device.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
      const data = await result.json()
      if (result.ok) {
        token = data
        saveToken(token)
        return
      }
      if (data.message === 'slow_down') delay += 5000
      else if (data.message !== 'authorization_pending') throw new Error('Autorización rechazada o vencida')
    }
    if (!signal.aborted) throw new Error('Código de Twitch vencido')
  }

  function fail(error) {
    if (signal.aborted) return
    onStatus(error.message)
    disconnect()
  }
  function disconnect() {
    stop.abort()
    clearTimeout(retry)
    clearTimeout(validation)
    clearTimeout(watchdog)
    socket?.close()
    candidate?.close()
  }
  function open(url = endpoint, migrating = false) {
    if (signal.aborted) return
    const target = new URL(url)
    if (target.origin !== new URL(endpoint).origin) throw new Error('Destino EventSub inesperado')
    const ws = new WebSocket(target)
    if (migrating) candidate = ws
    else socket = ws
    let welcomed = false
    let timeout = 15_000
    const heartbeat = () => {
      clearTimeout(watchdog)
      watchdog = setTimeout(() => ws.close(), timeout)
    }
    if (!migrating) heartbeat()
    ws.addEventListener('close', () => {
      if (signal.aborted) return
      if (candidate === ws) {
        candidate = undefined
        if (socket?.readyState !== WebSocket.CLOSED) return
      } else if (socket !== ws || candidate) return
      clearTimeout(watchdog)
      chatConnected = false
      retryConnection(start)
    })
    ws.addEventListener('error', () => ws.close())
    ws.addEventListener('message', ({ data }) => {
      if (signal.aborted || (socket !== ws && candidate !== ws)) return
      let frame
      try { frame = JSON.parse(data) } catch { return }
      const type = frame.metadata.message_type
      if (type === 'session_welcome' && !welcomed) {
        welcomed = true
        const session = frame.payload.session
        timeout = (session.keepalive_timeout_seconds || 10) * 1000 + 1000
        if (migrating) {
          const old = socket
          socket = ws
          candidate = undefined
          old.close()
          heartbeat()
          return
        }
        heartbeat()
        api('eventsub/subscriptions', {
          type: 'channel.chat.message', version: '1',
          condition: { broadcaster_user_id: identity.user_id, user_id: identity.user_id },
          transport: { method: 'websocket', session_id: session.id }
        }).then(() => {
          if (signal.aborted || socket !== ws || ws.readyState !== WebSocket.OPEN) return
          retryDelay = 3000
          chatConnected = true
          onStatus('Twitch: conectado como ' + identity.login)
        }, error => {
          if (signal.aborted || socket !== ws || ws.readyState !== WebSocket.OPEN) return
          if (temporary(error) || error.status === 401) ws.close()
          else fail(error)
        })
      } else if (socket === ws) {
        heartbeat()
        if (type === 'session_reconnect' && !candidate) {
          try { open(frame.payload.session.reconnect_url, true) } catch (error) { fail(error) }
        }
        if (type === 'revocation') fail(new Error('Twitch revocó el acceso al chat'))
        if (type === 'notification' && frame.metadata.subscription_type === 'channel.chat.message') {
          incoming = incoming.then(() => {
            if (!signal.aborted) return handleChat(frame.payload.event)
          }).catch(error => {
            if (!signal.aborted) onStatus(error.message)
          })
        }
      }
    })
  }
  async function refreshToken() {
    if (!token?.refresh_token) return false
    const result = await form('token', { grant_type: 'refresh_token', refresh_token: token.refresh_token })
    if ([400, 401].includes(result.status)) return false
    if (!result.ok) throw httpError('No se pudo renovar la sesión de Twitch', result.status)
    token = await result.json()
    saveToken(token)
    return true
  }

  async function establish() {
    let current = token ? await validate() : null
    if (!current && token && await refreshToken()) current = await validate()
    if (!current) {
      await authorize()
      if (signal.aborted) return
      current = await validate()
    }
    if (!current) throw new Error('Twitch rechazó la sesión')
    onAuthorized?.(current, token.access_token)
    handleChat = twitchChatHandler({
      owner: identity.user_id, command, webUrl, getBot, isRunning,
      follows: async viewer => (await api('channels/followers?' + new URLSearchParams({
        broadcaster_id: identity.user_id, user_id: viewer
      }))).data.length > 0,
      reply: message => api('chat/messages', {
        broadcaster_id: identity.user_id, sender_id: identity.user_id, message
      })
    })
    open()
  }
  async function start() {
    const generation = ++validationGeneration
    clearTimeout(validation)
    await validationInFlight
    if (signal.aborted) return
    try {
      await establish()
    } catch (error) {
      if (temporary(error)) retryConnection(start)
      else fail(error)
      return
    }
    if (signal.aborted) return
    scheduleValidation(60 * 60_000, generation)
  }
  function scheduleValidation(delay, generation) {
    validation = setTimeout(() => {
      validationInFlight = validateSession(generation)
    }, delay)
  }
  async function validateSession(generation) {
    try {
      const current = await validate()
      if (!current || current.expires_in < 3700) {
        if (!(await refreshToken()) || !(await validate())) throw new Error('Twitch requiere autorizar nuevamente')
      }
      if (!signal.aborted && generation === validationGeneration) scheduleValidation(60 * 60_000, generation)
    } catch (error) {
      if (signal.aborted || generation !== validationGeneration) return
      if (temporary(error)) scheduleValidation(60_000, generation)
      else fail(error)
    }
  }
  start().catch(fail)
  disconnect.announce = async message => {
    if (!chatConnected || signal.aborted) return false
    const streams = await api('streams?' + new URLSearchParams({ user_id: identity.user_id }))
    if (!streams.data.length || !chatConnected || signal.aborted) return false
    const sent = await api('chat/messages', {
      broadcaster_id: identity.user_id, sender_id: identity.user_id, message
    })
    if (!sent.data[0]?.is_sent) throw new Error('Twitch rechazó el aviso del encuentro')
    return true
  }
  disconnect.connected = () => chatConnected && !signal.aborted
  return disconnect
}
