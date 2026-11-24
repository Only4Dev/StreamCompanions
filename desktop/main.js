import { app, BrowserWindow, safeStorage, session, shell } from 'electron'
import { createHash, randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { normalizeCommand } from './commands.js'
import { connectTwitch } from './twitch.js'
import { startCloudSync } from './cloud-sync.js'
import { openProgress } from './progress.js'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { botCopy, botResponse, botSignature, defaultBot, formatBotReply, validateBot } from '../ui/bot-copy.js'
import { createEncounterNotices } from './notices.js'
import { createGame, creatures } from './game.js'
import { level } from '../ui/levels.js'
import { spriteScale } from '../ui/sprites.js'
import { projectLinks } from '../ui/about.js'
import { hasAppArchive, stageUpdate } from './install-update.js'
import { checkForUpdate } from './update-check.js'
import { evolutionParent } from '../ui/evolution.js'

if (!app.requestSingleInstanceLock()) app.exit(0)
let mainWindow
const localOrigin = 'http://127.0.0.1:43127'
const controlToken = randomBytes(32).toString('hex')
const hasLocalControl = req => (req.headers.cookie ?? '').split(';').some(part => part.trim() === 'sc_local_control=' + controlToken)
app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
})

const battleRules = await import('../dev/battle.js')
const battleStats = (await import('../dev/national-stats.js')).nationalStats
let communityBattle
let previewBattle
let battleTimer
let lastBattleEncounter = 0
let battleDueAt = 0
let battleBannerUntil = 0
let battleStarting = false
let syncDevice
let pendingReset
let resetRequest
let kickStatus = ''
let kickCursor = 0
const openedAt = Date.now()
let kickTimer
let twitchBot
let twitchBotStatus = ''
const botTestStatus = {}
let lastBotTest = 0
const liveChannels = new Map()
const activityLog = []
const localChat = []
const commandTimes = new Map()
let lastWild = null
const remember = (list, entry) => { list.push({ ...entry, at: Date.now() }); if (list.length > 100) list.shift() }
const rememberChat = (platform, name, message) => remember(localChat, { platform, name, message: message.slice(0, 500) })
const isLive = provider => liveChannels.get(provider)?.live === true
function chatAction(viewer, displayName, text, platform) {
  if (pendingReset || !isLive(platform)) return ''
  const action = normalizeCommand(text).split(' ')[0]
  if (action.startsWith('!')) {
    if (!['!poke', '!catch', '!summon', '!summonshiny', '!evolve', '!candy'].includes(action)) return ''
    const now = Date.now()
    for (const [id, at] of commandTimes) if (now - at >= 3000) commandTimes.delete(id)
    if (commandTimes.has(viewer)) return ''
    commandTimes.set(viewer, now)
  }
  const result = game.chat(viewer, text, displayName, platform)
  if (action.startsWith('!')) {
    remember(activityLog, { platform, name: displayName, message: text.slice(0, 120), result })
    game.recordAction(viewer, { platform, action: normalizeCommand(text).slice(0, 120), result })
    persistGame()
  }
  if (result === 'caught' || result === 'duplicateReward') return { code: 'catchSuccess', ...game.latestCapture() }
  if (result === 'joined' && game.starterName(viewer)) return { code: 'joined', viewer: displayName, pokemon: game.starterName(viewer) }
  return result === 'joined' ? '' : { code: result, viewer: displayName }
}
let kickConnected
let kickRegistration
let kickRegistrationTimer
let twitchPaired = false
const twitchAllowed = () => !syncDevice?.community.startsWith('kick-') || twitchPaired
let lastKickLink = 0
const kickAbort = new AbortController()

let spriteFolder = join(app.getAppPath(), 'pmd')
async function readSpriteManifest(folder) {
  return readFile(join(folder, 'manifest.json'), 'utf8').then(JSON.parse, error => {
    if (error.code !== 'ENOENT') throw error
    return null
  })
}
let manifest = await readSpriteManifest(spriteFolder)
if (!manifest && app.isPackaged) {
  spriteFolder = join(dirname(process.execPath), 'pmd')
  manifest = await readSpriteManifest(spriteFolder)
}
manifest ??= { species: creatures.map(name => ({ name, normal: null, shiny: null })) }
let game
let progress
let checkpoint
let stopSync
let shopTimer
let syncStatus = ''
let disconnectTwitch
let twitchStatus = ''
let twitchAuthorizationUrl
const defaultClientId = 'm2vfvdba9flbjxhbq3nndyqx4tsdar'
const publicPortal = 'https://stream-companions.developeronly4g.workers.dev'
let updateStatus = { status: 'checking' }
let installingUpdate = false
const updateMarker = profile => join(profile, 'app-updates', 'active.json')
const stageNamePattern = /^v(\d{1,8}\.\d{1,8}\.\d{1,8})-[a-z0-9]{6}$/i
function useInstalledUpdate(profile) {
  if (!app.isPackaged || process.platform !== 'win32') return false
  try {
    const { folder } = JSON.parse(readFileSync(updateMarker(profile), 'utf8'))
    const match = stageNamePattern.exec(folder)
    if (!match) return false
    const installed = match[1].split('.').map(Number)
    const current = app.getVersion().split('.').map(Number)
    const delta = installed.map((part, index) => part - current[index]).find(Boolean) ?? 0
    if (delta <= 0) return false
    const executable = join(profile, 'app-updates', folder, 'app', 'Stream Companions.exe')
    if (!statSync(executable).isFile() || !hasAppArchive(join(dirname(executable), 'resources', 'app.asar'))) return false
    app.relaunch({ execPath: executable })
    app.quit()
    return true
  } catch { return false }
}
function activateInstalledUpdate(profile) {
  if (!process.argv.includes('--sc-activate-update')) return
  const parent = dirname(dirname(process.execPath))
  if (dirname(parent) !== join(profile, 'app-updates')) return
  const folder = parent.slice(dirname(parent).length + 1)
  if (!stageNamePattern.test(folder)) return
  const marker = updateMarker(profile)
  writeFileSync(marker + '.tmp', JSON.stringify({ folder }))
  renameSync(marker + '.tmp', marker)
}
let updateRequest
let lastUpdateCheck = -Infinity
function refreshUpdateStatus() {
  if (installingUpdate || updateRequest || Date.now() - lastUpdateCheck < 10_000) return updateRequest
  lastUpdateCheck = Date.now()
  updateStatus = { status: 'checking' }
  updateRequest = checkForUpdate(app.getVersion(), kickAbort.signal).then(result => {
    updateStatus = result
    updateRequest = undefined
  })
  return updateRequest
}
let twitchClientId = process.env.STREAM_COMPANIONS_TWITCH_CLIENT_ID
let setup
let setupFile
let botFile
let bot = defaultBot
let setupComplete = false
let noticeTimer

function persistGame() {
  progress.save({ ...game.progress(), kickCursor, activityLog })
}

function applyPrivacy(erasures) {
  const changed = []
  for (const entry of erasures) {
    if (!/^(twitch|kick):\d{1,24}$/.test(entry?.viewer_id) || !Number.isSafeInteger(entry.generation) ||
        entry.generation < 1 || ![0, 1].includes(entry.active)) continue
    if (game.applyErasure(entry)) changed.push(entry.viewer_id)
  }
  if (!changed.length) return
  if (communityBattle?.battle.actors.some(actor => changed.includes(actor.viewerId))) {
    clearInterval(battleTimer)
    communityBattle = undefined
  }
  persistGame()
}

async function refreshLiveChannels() {
  const checks = await Promise.allSettled([
    twitchAllowed() ? disconnectTwitch?.live() : null,
    syncDevice ? kickRequest('live').then(response => response.ok ? response.json() : null).then(data => data?.channel) : null
  ])
  if (kickAbort.signal.aborted) return
  for (const [index, provider] of ['twitch', 'kick'].entries()) {
    const result = checks[index]
    if (result.status === 'fulfilled' && result.value) liveChannels.set(provider, { provider, ...result.value })
    else liveChannels.delete(provider)
  }
  if (!syncDevice) return
  await fetch(new URL('/api/stream-status', syncDevice.url), {
    method: 'POST', redirect: 'error',
    headers: { Authorization: 'Bearer ' + syncDevice.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewers: [...liveChannels.values()] }),
    signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(6000)])
  }).catch(() => {})
}

async function pollShop() {
  try {
    if (pendingReset) { await finishCommunityReset(); return }
    await refreshLiveChannels()
    if (!stopSync) return
    const privacy = await fetch(new URL('/api/privacy', syncDevice.url), {
      headers: { Authorization: 'Bearer ' + syncDevice.token }, redirect: 'error',
      signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(6000)])
    }).catch(() => null)
    if (privacy?.ok && !kickAbort.signal.aborted) {
      const { erasures } = await privacy.json()
      if (!kickAbort.signal.aborted && Array.isArray(erasures)) applyPrivacy(erasures)
    }
    if (kickAbort.signal.aborted || game.config.running === false) return
    const endpoint = new URL('/api/shop', syncDevice.url)
    const request = body => fetch(endpoint, {
      method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { Authorization: 'Bearer ' + syncDevice.token, 'Content-Type': 'application/json',
        ...(!body ? { 'X-Shop-Prices': JSON.stringify(game.config.shopPrices), 'X-Shop-Family-Dna': '2' } : {}) },
      body: body && JSON.stringify({ viewers: body }),
      signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(8000)])
    })
    const response = await request()
    if (!response.ok || pendingReset || kickAbort.signal.aborted || game.config.running === false) return
    const { orders } = await response.json()
    if (pendingReset || kickAbort.signal.aborted || game.config.running === false) return
    if (!Array.isArray(orders) || !orders.length || orders.length > 10 || orders.some(order =>
      !/^[a-f0-9-]{36}$/.test(order?.id ?? '') || !/^(twitch|kick):\d{1,24}$/.test(order?.viewerId ?? ''))) return
    const receipts = orders.map(order => ({ id: order.id, result: game.fulfillOrder(order) }))
    persistGame()
    const acknowledgement = await request(receipts)
    if (!acknowledgement.ok || kickAbort.signal.aborted) return
    const { received } = await acknowledgement.json()
    if (kickAbort.signal.aborted) return
    if (Array.isArray(received) && receipts.every(receipt => received.includes(receipt.id))) {
      game.acknowledgeOrders(receipts.map(({ id }) => id))
      persistGame()
    }
  } catch (error) {
    if (!kickAbort.signal.aborted) console.warn('Could not sync shop:', error.message)
  } finally {
    if (!kickAbort.signal.aborted) shopTimer = setTimeout(pollShop, 30_000)
  }
}

async function pairNewCommunity(profile, identity, accessToken) {
  if (identity.client_id !== defaultClientId || !safeStorage.isEncryptionAvailable()) return
  const existing = syncDevice
  if (existing?.owner === identity.user_id) {
    twitchPaired = true
    ensureCloudSync()
    return
  }
  if (existing && existing.url !== publicPortal) return
  if (kickRegistration?.expires > Date.now() && !existing) return
  const pending = join(profile, 'cloud-registration.enc')
  let registration = existing
  if (!existing) try { registration = JSON.parse(safeStorage.decryptString(readFileSync(pending))) } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (!existing && registration?.owner !== identity.user_id) {
    registration = { owner: identity.user_id, token: randomBytes(32).toString('hex') }
    writeFileSync(pending + '.tmp', safeStorage.encryptString(JSON.stringify(registration)))
    renameSync(pending + '.tmp', pending)
  }
  const response = await fetch(publicPortal + '/api/devices/register', {
    method: 'POST', redirect: 'error', signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(9000)]),
    headers: { Authorization: 'OAuth ' + accessToken,
      'X-Device-Fingerprint': createHash('sha256').update(registration.token).digest('hex'),
      ...(existing ? { 'X-Community-Device': existing.token } : {}) }
  })
  if (!response.ok) {
    syncStatus = response.status === 409 ? 'Comunidad ya vinculada a otro dispositivo' : 'No se pudo vincular la comunidad (HTTP ' + response.status + ')'
    return
  }
  const { community } = await response.json()
  if (!/^(?:[a-z0-9_]{2,25}|kick-\d{1,24})$/.test(community ?? '') || (existing && existing.community !== community)) throw new Error('Invalid community')
  const device = { ...registration, owner: identity.user_id, url: publicPortal, community }
  saveCloudDevice(profile, device)
  twitchPaired = true
  ensureCloudSync()
  if (!existing) kickTimer = setTimeout(pollKick, 100)
}

function finishCommunityReset() {
  if (resetRequest) return resetRequest
  resetRequest = (async () => {
    const reset = pendingReset
    if (!reset || !syncDevice || reset.community !== syncDevice.community) return false
    try {
      const endpoint = publicPortal + '/api/devices/'
      const fetchDevice = (path, token, options = {}) => fetch(endpoint + path, {
        method: options.method ?? 'GET', redirect: 'error',
        headers: { Authorization: 'Bearer ' + token, ...options.headers },
        signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(8000)])
      })
      const status = await fetchDevice('status', reset.token)
      if (status.ok) {
        if ((await status.json()).community !== reset.community) return false
      } else {
        const response = await fetchDevice('reset', reset.previous, { method: 'POST', headers: {
          'X-Device-Fingerprint': createHash('sha256').update(reset.token).digest('hex')
        } })
        if (!response.ok) return false
      }
      if (kickAbort.signal.aborted) return false
      const profile = app.getPath('userData')
      clearInterval(battleTimer)
      communityBattle = undefined
      battleDueAt = battleBannerUntil = 0
      game.resetCommunity()
      activityLog.length = 0
      progress.save({ ...game.progress(), kickCursor, activityLog }, { clearQueue: true })
      saveCloudDevice(profile, { ...syncDevice, token: reset.token })
      rmSync(join(profile, 'community-reset.enc'), { force: true })
      pendingReset = undefined
      ensureCloudSync()
      return true
    } catch { return false }
  })().finally(() => { resetRequest = undefined })
  return resetRequest
}

function saveCloudDevice(profile, device) {
  const file = join(profile, 'cloud-device.enc')
  writeFileSync(file + '.tmp', safeStorage.encryptString(JSON.stringify(device)))
  renameSync(file + '.tmp', file)
  syncDevice = device
}

async function checkKickRegistration(profile) {
  const pending = kickRegistration
  if (!pending || kickAbort.signal.aborted || syncDevice) return
  try {
    const result = await fetch(publicPortal + '/api/devices/status', {
      headers: { Authorization: 'Bearer ' + pending.token }, redirect: 'error',
      signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(6000)])
    })
    if (kickRegistration !== pending || kickAbort.signal.aborted) return
    if (result.ok) {
      const { community } = await result.json()
      if (kickRegistration !== pending || !/^kick-\d{1,24}$/.test(community ?? '') || syncDevice) return
      const nextSetup = { ...setup, platform: 'kick' }
      writeFileSync(setupFile + '.tmp', JSON.stringify(nextSetup))
      renameSync(setupFile + '.tmp', setupFile)
      saveCloudDevice(profile, { token: pending.token, url: publicPortal, community })
      app.relaunch()
      app.quit()
      return
    }
  } catch { /* retry while authorization is pending */ }
  if (kickRegistration === pending && pending.expires > Date.now() && !kickAbort.signal.aborted) {
    kickRegistrationTimer = setTimeout(() => checkKickRegistration(profile), 2500)
  }
}

async function startKickRegistration(profile) {
  if (!safeStorage.isEncryptionAvailable()) return new Response(null, { status: 503 })
  const pending = { token: kickRegistration?.token ?? randomBytes(32).toString('hex'), expires: Date.now() + 600_000 }
  const file = join(profile, 'kick-registration.enc')
  writeFileSync(file + '.tmp', safeStorage.encryptString(JSON.stringify(pending)))
  renameSync(file + '.tmp', file)
  kickRegistration = pending
  clearTimeout(kickRegistrationTimer)
  kickRegistrationTimer = setTimeout(() => checkKickRegistration(profile), 1500)
  return fetch(publicPortal + '/api/kick/register', {
    method: 'POST', redirect: 'error',
    headers: { 'X-Device-Fingerprint': createHash('sha256').update(pending.token).digest('hex') },
    signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(9000)])
  })
}

function ensureCloudSync() {
  if (!syncDevice || stopSync || pendingReset) return
  persistGame()
  try {
    stopSync = startCloudSync({ progress, url: syncDevice.url, token: syncDevice.token,
      onStatus: message => { syncStatus = message } })
  } catch (error) {
    syncStatus = error.message
  }
}

function kickRequest(path, body) {
  return fetch(new URL('/api/kick/' + path, syncDevice.url), {
    method: body ? 'POST' : 'GET', redirect: 'error',
    headers: { Authorization: 'Bearer ' + syncDevice.token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(6500)])
  })
}

async function sendKickMessage(message) {
  const response = await kickRequest('reply', { message: message.slice(0, 500) })
  if (!response.ok) return false
  return response.headers.get('X-Chat-Identity') || 'bot'
}

async function pollKick() {
  let next = 15_000
  try {
    if (pendingReset) return
    const response = await kickRequest('events?privacy=2&after=' + kickCursor)
    if (!response.ok) throw Error('Kick gateway HTTP ' + response.status)
    const data = await response.json()
    if (pendingReset) return
    kickConnected = data.connected === true
    if (!kickConnected) { kickStatus = ''; return }
    ensureCloudSync()
    kickStatus = 'Kick · ' + data.login
    next = 4000
    const replies = []
    if (Array.isArray(data.erasures)) applyPrivacy(data.erasures)
    for (const event of data.events) {
      if (!Number.isSafeInteger(event.sequence) || event.sequence <= kickCursor) continue
      kickCursor = event.sequence
      if (!(event.received_at >= openedAt)) continue
      if (game.viewerGeneration(event.viewer_id) !== event.kick_generation ||
          (event.twitch_id && game.viewerGeneration(event.twitch_id) !== event.twitch_generation)) continue
      if (event.twitch_id) game.linkKickViewer(event.viewer_id, event.twitch_id)
      const viewer = event.twitch_id || event.viewer_id
      const text = event.content
      rememberChat('kick', event.display_name, event.display_text ?? text)
      if (!isLive('kick') || game.config.running === false) continue
      if (text.trim().toLowerCase() === '!web') {
        if (Date.now() - lastKickLink >= 60_000) {
          replies.push(formatBotReply(bot, 'web', { url: setup.webUrl || syncDevice.url }))
          lastKickLink = Date.now()
        }
      } else {
        const result = chatAction(viewer, event.display_name, text, 'kick')
        if (text.startsWith('!') && result?.code) replies.push(formatBotReply(bot, result.code, result))
      }
      kickCursor = event.sequence
    }
    if (data.events.length) persistGame()
    for (const reply of replies.filter(Boolean)) await sendKickMessage(botSignature(bot, reply))
  } catch {
    kickConnected = false
    if (!kickAbort.signal.aborted) kickStatus = 'Kick · reconectando'
  } finally {
    if (!kickAbort.signal.aborted) kickTimer = setTimeout(pollKick, next)
  }
}
function publicBattle(battle) {
  return { over: battle.over, winner: battle.winner?.ownerName || battle.winner?.name,
    time: battle.time, field: battle.field, effects: battle.effects,
    projectiles: battle.projectiles.map(({ x, move, direction, actor }) => ({ x, move, direction, actor: { types: actor.types } })),
    actors: battle.actors.map(actor => {
      const { name, ownerName, shiny, hp, maxHp, x, direction, motion, level, types, status, ongoing, boosts, flinchUntil } = actor
      return { name, ownerName, shiny, hp, maxHp, x, direction, motion, level, flying: types.includes('flying'), status: status?.kind,
        ongoing: ongoing?.kind, maneuver: battleRules.battleManeuver(actor, battle.time),
        evasion: boosts.evasion > battle.time, flinched: flinchUntil > battle.time }
    }) }
}

const sheets = new Set(manifest.species.flatMap(item => [
  item.portrait, item.shinyPortrait,
  ...[item.normal, item.shiny].filter(Boolean).flatMap(variant => Object.values(variant.animations).map(animation => animation.url))
].filter(path => /^\/pmd\/[a-z0-9-]+\/[a-z0-9_-]+\.(?:png|webp)$/i.test(path))))
async function startCommunityBattle(waitForBanner = false) {
  if (battleStarting || !game.config.battleEnabled) return 409
  battleStarting = true
  try { return await runCommunityBattle(waitForBanner) } finally { battleStarting = false }
}

async function runCommunityBattle(waitForBanner) {
  if (!battleRules || (!twitchClientId && !syncDevice) || game.config.running === false || (communityBattle && !communityBattle.battle.over)) {
    return 409
  }
  const byName = new Map(manifest.species.map(species => [species.name.toLowerCase(), species]))
  const candidates = []
  for (const [viewerId, viewer] of Object.entries(game.snapshot().viewers)) {
    if (!viewer.active || !/^(twitch|kick):\d{1,24}$/.test(viewerId)) continue
    const species = byName.get(viewer.active.key.replace(/ ✦$/, '').toLowerCase())
    if (!species) continue
    const rank = level(viewer.collection[viewer.active.key])
    const id = Number(species.id)
    const row = battleStats[id - 1]
    if (!row) continue
    const [, stats, types, final] = row
    const form = manifest.species.find(item => Number(item.id) === id) ?? species
    const variant = viewer.active.key.endsWith(' ✦') ? form.shiny ?? form.normal : form.normal
    candidates.push({ viewerId, speciesKey: viewer.active.key, id, stats, types, final, level: rank,
      dna: game.dnaCount(viewer, viewer.active.key),
      ownedHeldItems: viewer.heldItems ?? [],
      name: form.name, margin: Math.max(75, ...Object.values(variant?.animations ?? {}).map(clip => clip.width * spriteScale(clip, 3) / 2 + 18)),
      ownerName: viewer.displayName,
      shiny: viewer.active.key.endsWith(' ✦') })
  }
  let entries = candidates.slice(0, 12)
  if (entries.length < 2) {
    return 422
  }
  if (syncDevice && stopSync) {
    try {
      const response = await fetch(new URL('/api/movesets', syncDevice.url), {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2500),
        headers: { Authorization: 'Bearer ' + syncDevice.token, 'Content-Type': 'application/json' },
        body: JSON.stringify(entries.map(({ viewerId, speciesKey }) => ({ viewerId, speciesKey })))
      })
      if (response.ok) {
        const results = await response.json()
        for (const entry of entries) {
          const loadout = results.find(item => item.viewerId === entry.viewerId && item.speciesKey === entry.speciesKey)
          entry.selectedMoves = loadout?.moves
          entry.selectedAt = loadout?.selectedAt
          entry.selectedUltimate = loadout?.ultimate
          if (entry.ownedHeldItems.includes(loadout?.heldItem)) entry.heldItem = loadout.heldItem
        }
      }
    } catch (error) { console.warn('Could not load community movesets:', error.message) }
  }
  if (waitForBanner) {
    battleBannerUntil = Date.now() + 2000
    await new Promise(resolve => setTimeout(resolve, 2000))
    battleBannerUntil = 0
  }
  if (kickAbort.signal.aborted || !game.config.battleEnabled || game.config.running === false || (communityBattle && !communityBattle.battle.over)) return 409
  const active = game.overlay('companions').viewers
  entries = entries.filter(entry => active[entry.viewerId]?.active.key === entry.speciesKey)
  if (entries.length < 2) return 422
  const battle = battleRules.createBattle(entries, { hpMultiplier: game.config.battleHpMultiplier })
  communityBattle = { battle, finishedAt: 0 }
  battleTimer = setInterval(() => {
    battle.step(1 / 30)
    if (!battle.over) return
    communityBattle.finishedAt = Date.now()
    clearInterval(battleTimer)
    game.recordBattle(entries.map(entry => entry.viewerId), battle.winner?.viewerId, battle.winner?.speciesKey)
    persistGame()
  }, 1000 / 30)
  lastBattleEncounter = game.encounterCount()
  return 204
}

function tickBattleSchedule() {
  const every = game.config.battleEveryEncounters
  if (!game.config.battleEnabled || !every) { battleDueAt = 0; return }
  if (!every || game.config.running === false || battleStarting || (communityBattle && !communityBattle.battle.over)) return
  if (battleDueAt) {
    if (Date.now() < battleDueAt) return
    battleDueAt = 0
    startCommunityBattle(true).catch(() => {})
    return
  }
  if (game.encounterCount() - lastBattleEncounter < every || game.hasEncounter()) return
  const active = Object.keys(game.overlay('companions').viewers).filter(id => /^(twitch|kick):\d+$/.test(id))
  if (active.length < 2) return
  battleDueAt = Date.now() + 300_000
  const message = botSignature(bot, bot.language === 'en' ? 'Battle royale starts in 5 minutes!' : '¡La batalla campal empieza en 5 minutos!')
  Promise.allSettled([disconnectTwitch?.announce(message), kickConnected ? sendKickMessage(message) : undefined])
}

const routes = new Map([
  ['/', ['index.html', 'text/html']],
  ['/sprites.js', ['sprites.js', 'text/javascript']],
  ['/sfx/shiny.wav', ['sfx/shiny.wav', 'audio/wav']],
  ['/bot-copy.js', ['bot-copy.js', 'text/javascript']],
  ['/levels.js', ['levels.js', 'text/javascript']],
  ['/ui/levels.js', ['levels.js', 'text/javascript']],
  ['/ui/held-items.js', ['held-items.js', 'text/javascript']],
  ['/ui/shop.js', ['shop.js', 'text/javascript']],
  ['/ui/about.js', ['about.js', 'text/javascript']],
  ['/ui/evolution.js', ['evolution.js', 'text/javascript']],
  ['/ui/evolution-data.js', ['evolution-data.js', 'text/javascript']],
  ['/ui.js', ['ui.js', 'text/javascript']],
  ['/style.css', ['style.css', 'text/css']],
  ['/encounter', ['index.html', 'text/html']],
  ['/companions', ['index.html', 'text/html']]
])
const server = createServer(async (req, res) => {
  try {
    if (req.headers.host !== new URL(localOrigin).host) { res.writeHead(403).end(); return }
    const { pathname, searchParams } = new URL(req.url, 'http://localhost')
    if (req.method === 'GET' && pathname === '/dev/community-battle' && battleRules) {
      if (!hasLocalControl(req)) { res.writeHead(403).end(); return }
      const data = communityBattle?.battle
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(data ? {
        time: data.time, actors: data.actors.map(({ cast, viewerId, ...actor }) => ({
          ...actor, cast: cast ? { move: cast.move } : null
        })), effects: data.effects, projectiles: data.projectiles.map(shot => ({
          ...shot, actor: { types: shot.actor.types }
        })), field: data.field, suddenDeath: data.suddenDeath, ultimate: data.ultimate, over: data.over,
        winner: data.winner ? { name: data.winner.ownerName || data.winner.name } : null
      } : null))
      return
    }
    if (req.method === 'GET' && pathname === '/state') {
      const overlay = searchParams.get('overlay')
      if (!['encounter', 'companions'].includes(overlay) && !hasLocalControl(req)) { res.writeHead(403).end(); return }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      const state = ['encounter', 'companions'].includes(overlay)
        ? { ...game.overlay(overlay), bot: { language: bot.language } }
        : { ...game.snapshot(), twitchStatus, kickStatus, syncStatus, setup, bot, setupComplete, version: app.getVersion(), updateStatus,
          twitchConnected: twitchAllowed() && Boolean(disconnectTwitch?.connected()), kickConnected: Boolean(kickConnected), battleLab: !app.isPackaged, canInstallUpdate: app.isPackaged && process.platform === 'win32', activityLog, localChat, twitchBotStatus, botTestStatus, canReset: syncDevice?.url === publicPortal, resettingCommunity: Boolean(pendingReset), live: setup.platform !== 'demo' }
      if (overlay === 'companions' && ['summon', 'battle'].includes(searchParams.get('preview'))) {
        const samples = manifest.species.filter(entry => entry.normal && !evolutionParent(Number(entry.id))).slice(0, 3)
        const demo = searchParams.get('preview')
        state.viewers = Object.fromEntries(samples.map(({ name }, index) => [index, {
          displayName: 'Preview ' + (index + 1), active: { key: name, layer: index + 1, expires: Date.now() + 60_000 },
          collection: { [name]: 0 }
        }]))
        if (demo === 'battle' && samples.length > 1) {
          const now = Date.now()
          if (!previewBattle || now - previewBattle.last > 5000 || previewBattle.finished && now - previewBattle.finished > 4000) {
            const entries = samples.map(({name, id}, index) => {
              const [, stats, types, final] = battleStats[Number(id) - 1]
              return { id: Number(id), name, stats, types, final, level: 16, ownerName: 'Preview ' + (index + 1) }
            })
            previewBattle = { battle: battleRules.createBattle(entries), last: now }
          }
          const preview = previewBattle
          const elapsed = Math.min(.25, Math.max(0, (now - preview.last) / 1000))
          preview.last = now
          if (elapsed) preview.battle.step(elapsed)
          if (preview.battle.over) preview.finished ??= now
          state.battle = publicBattle(preview.battle)
        }
      } else if (overlay === 'companions') {
        state.viewers = Object.fromEntries(Object.values(state.viewers).map(viewer => [viewer.active.layer, { ...viewer, displayName: viewer.displayName || 'Viewer' }]))
        state.battleStart = battleBannerUntil > Date.now()
        const current = communityBattle
        if (current && (!current.finishedAt || Date.now() - current.finishedAt < 4500)) {
          const battle = current.battle
          state.battle = publicBattle(battle)
        }
      }
      res.end(JSON.stringify(state))
      return
    }
    if (req.method === 'POST' && pathname === '/demo') {
      if (!hasLocalControl(req) || req.headers.origin !== localOrigin || req.headers['content-type'] !== 'application/json') {
        res.writeHead(403).end()
        return
      }
      let body = ''
      for await (const chunk of req) {
        body += chunk
        if (body.length > 16384) throw new Error('Request too large')
      }
      const action = JSON.parse(body)
      if (action.checkUpdates === true) {
        await refreshUpdateStatus()
        res.writeHead(204).end()
        return
      }
      if (typeof action.projectLink === 'string' && Object.hasOwn(projectLinks, action.projectLink)) {
        await shell.openExternal(projectLinks[action.projectLink])
        res.writeHead(204).end()
        return
      }
      if (action.openUpdateNotes === true && /^\d+\.\d+\.\d+$/.test(updateStatus.version ?? '')) {
        await shell.openExternal(projectLinks.releases + '/tag/v' + updateStatus.version)
        res.writeHead(204).end()
        return
      }
      if (action.installUpdate === true) {
        if (installingUpdate || pendingReset || !app.isPackaged || process.platform !== 'win32' ||
            !['available', 'installFailed'].includes(updateStatus.status) || !updateStatus.archive) { res.writeHead(409).end(); return }
        installingUpdate = true
        const update = updateStatus
        updateStatus = { ...update, status: 'installing' }
        try {
          const exe = await stageUpdate(app.getPath('userData'), update, kickAbort.signal)
          res.once('finish', () => { app.relaunch({ execPath: exe, args: [...process.argv.slice(1), '--sc-activate-update'] }); app.quit() })
          res.writeHead(204).end()
        } catch {
          if (!kickAbort.signal.aborted) updateStatus = { ...update, status: 'installFailed' }
          res.writeHead(503).end()
        } finally { installingUpdate = false }
        return
      }
      if (action.startCommunityBattle === true) {
        const status = await startCommunityBattle(true)
        if (status === 204) battleDueAt = 0
        res.writeHead(status).end()
        return
      }
      if (action.bot || Object.hasOwn(action, 'language')) {
        const edited = validateBot(action.bot
          ? { ...action.bot, language: bot.language }
          : { ...bot, language: action.language })
        if (!edited) { res.writeHead(400).end(); return }
        writeFileSync(botFile + '.tmp', JSON.stringify(edited))
        renameSync(botFile + '.tmp', botFile)
        bot = edited
        res.writeHead(204).end()
        return
      }
      if (action.openPortal === true) {
        await shell.openExternal(publicPortal)
        res.writeHead(204).end()
        return
      }
      if (action.openAccounts === true) {
        await shell.openExternal('https://stream-companions.developeronly4g.workers.dev/?account=1')
        res.writeHead(204).end()
        return
      }
      if (action.resetCommunity === 'RESET' && syncDevice && syncDevice.url === publicPortal) {
        if (!pendingReset) {
          const file = join(app.getPath('userData'), 'community-reset.enc')
          const reset = { previous: syncDevice.token, token: randomBytes(32).toString('hex'), community: syncDevice.community }
          writeFileSync(file + '.tmp', safeStorage.encryptString(JSON.stringify(reset)))
          renameSync(file + '.tmp', file)
          pendingReset = reset
          stopSync?.()
          stopSync = undefined
        }
        const result = await finishCommunityReset()
        res.writeHead(result ? 204 : 503).end()
        return
      }
      if (['twitch', 'kick'].includes(action.testBot)) {
        const platform = action.testBot
        if (Date.now() - lastBotTest < 5000) { res.writeHead(429).end(); return }
        lastBotTest = Date.now()
        const connected = platform === 'kick' ? kickConnected : twitchAllowed() && disconnectTwitch?.connected()
        if (!connected) {
          botTestStatus[platform] = 'offline'
        } else {
          const message = bot.language === 'es' ? 'Stream Companions: mensaje de prueba.' : 'Stream Companions: test message.'
          try {
            const sent = platform === 'kick' ? await sendKickMessage(botSignature(bot, message)) :
              await disconnectTwitch.testChat(botSignature(bot, message))
            botTestStatus[platform] = sent || 'failed'
          } catch { botTestStatus[platform] = 'failed' }
        }
        res.writeHead(204).end()
        return
      }
      if (action.connectTwitchBot === true && twitchClientId) {
        connectDesktopBot(app.getPath('userData'), true)
        res.writeHead(204).end()
        return
      }
      if (action.connectKick === true) {
        if (!syncDevice && twitchClientId) { res.writeHead(409).end(); return }
        const response = syncDevice ? await kickRequest('connect', {}) : await startKickRegistration(app.getPath('userData'))
        if (!response.ok) { res.writeHead(response.status).end(); return }
        const { url } = await response.json()
        const authorize = new URL(url)
        if (authorize.origin !== 'https://id.kick.com' || authorize.pathname !== '/oauth/authorize') { res.writeHead(502).end(); return }
        await shell.openExternal(authorize.href)
        res.writeHead(204).end()
        return
      }
      if (action.setup) {
        const { platform, clientId, webUrl } = action.setup
        if (!['demo', 'kick', 'twitch'].includes(platform) || typeof clientId !== 'string' ||
            (platform === 'twitch' && !/^[a-z0-9]{20,64}$/.test(clientId)) ||
            typeof webUrl !== 'string' || webUrl.length > 500 ||
            (webUrl && new URL(webUrl).protocol !== 'https:')) {
          res.writeHead(400).end()
          return
        }
        if (platform === 'twitch' && !syncDevice && kickRegistration?.expires > Date.now()) { res.writeHead(409).end(); return }
        writeFileSync(setupFile + '.tmp', JSON.stringify({ platform, clientId, webUrl }))
        renameSync(setupFile + '.tmp', setupFile)
        const changed = platform !== setup.platform || (platform === 'twitch' && clientId !== setup.clientId) || webUrl !== setup.webUrl
        const reconnect = changed || (action.connectTwitch === true && !twitchAuthorizationUrl &&
          !twitchStatus.startsWith('Twitch: conectado como '))
        if (!changed && action.connectTwitch === true && twitchAuthorizationUrl) {
          await shell.openExternal(twitchAuthorizationUrl)
        }
        setup = { platform, clientId, webUrl }
        setupComplete = true
        if (reconnect) res.once('finish', () => {
          app.relaunch()
          app.quit()
        })
        res.writeHead(204).end()
        return
      }
      if (typeof action.running === 'boolean') {
        game.setRunning(action.running)
        if (!action.running) {
          clearInterval(battleTimer)
          communityBattle = undefined
          battleDueAt = 0
          battleBannerUntil = 0
          lastBattleEncounter = game.encounterCount()
        }
      }
      else if (action.queueLegendary) game.queueLegendary(action.queueLegendary)
      else if (action.demoMasterBall && !app.isPackaged && !twitchClientId && !syncDevice) {
        if (!game.grantDemoMasterBall(String(action.demoMasterBall))) { res.writeHead(404).end(); return }
      }
      else if (action.spawn) {
        if (game.config.running === false) { res.writeHead(409).end(); return }
        game.spawn(action.spawn)
      }
      else if (action.clearStatistics === true) game.clearStatistics()
      else if (action.shopPrices) game.setShopPrices(action.shopPrices)
      else if (action.config) {
        const enabled = game.config.battleEnabled
        game.configure(action.config)
        if (enabled !== game.config.battleEnabled) {
          lastBattleEncounter = game.encounterCount()
          battleDueAt = 0
        }
      }
      else if (twitchClientId) {
        res.writeHead(403).end()
        return
      } else game.chat(String(action.viewer || 'Demo').slice(0, 32), String(action.message || ''))
      persistGame()
      res.writeHead(204).end()
      return
    }
    if (req.method === 'GET' && pathname === '/catalog') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ...manifest, species: manifest.species.map(item => {
        const id = Number(item.id)
        const legendary = Boolean(battleStats[id - 1]?.[5])
        return { ...item, legendary, wildEligible: legendary || !evolutionParent(id) }
      }) }))
      return
    }
    if (req.method === 'GET' && sheets.has(pathname)) {
      const image = await readFile(join(spriteFolder, pathname.slice('/pmd/'.length)))
      res.writeHead(200, { 'Content-Type': pathname.endsWith('.webp') ? 'image/webp' : 'image/png', 'Cache-Control': 'public, max-age=3600' })
      res.end(image)
      return
    }
    if (req.method === 'GET' && (pathname === '/dev/battle-vfx.js' || hasLocalControl(req) && ['/dev/battle.js', '/dev/battle-ui.js', '/dev/national-stats.js', '/dev/battle.css'].includes(pathname))) {
      const content = await readFile(new URL('..' + pathname, import.meta.url))
      res.writeHead(200, { 'Content-Type': pathname.endsWith('.css') ? 'text/css' : 'text/javascript', 'X-Content-Type-Options': 'nosniff' })
      res.end(content)
      return
    }
    const route = routes.get(pathname)
    if (req.method !== 'GET' || !route) {
      res.writeHead(404).end()
      return
    }
    const file = await readFile(new URL('../ui/' + route[0], import.meta.url))
    res.writeHead(200, { 'Content-Type': route[1], 'X-Content-Type-Options': 'nosniff' })
    res.end(file)
  } catch {
    res.writeHead(400).end()
  }
})

function connectDesktopBot(profile, authorize = false) {
  if (!safeStorage.isEncryptionAvailable()) return
  const file = join(profile, 'twitch-bot-session.enc')
  let savedToken
  if (!authorize) {
    try { savedToken = JSON.parse(safeStorage.decryptString(readFileSync(file))) } catch { return }
  }
  twitchBot?.()
  twitchBot = connectTwitch({
    clientId: twitchClientId, savedToken, sendOnly: true,
    saveToken(token) {
      writeFileSync(file + '.tmp', safeStorage.encryptString(JSON.stringify(token)))
      renameSync(file + '.tmp', file)
    },
    announceCode(url, code) {
      twitchBotStatus = 'Twitch bot · ' + code
      shell.openExternal(url).catch(() => {})
    },
    onStatus(status) { twitchBotStatus = status }
  })
}

app.whenReady().then(() => {
  const profile = app.getPath('userData')
  mkdirSync(profile, { recursive: true })
  if (useInstalledUpdate(profile)) return
  setupFile = join(profile, 'startup.json')
  setup = {
    platform: twitchClientId ? 'twitch' : 'demo', clientId: twitchClientId || defaultClientId,
    webUrl: process.env.STREAM_COMPANIONS_WEB_URL || ''
  }
  try {
    setup = { ...setup, ...JSON.parse(readFileSync(setupFile, 'utf8')) }
    setupComplete = true
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Could not read startup configuration')
  }
  botFile = join(profile, 'bot.json')
  try {
    bot = validateBot(JSON.parse(readFileSync(botFile, 'utf8'))) ?? defaultBot
  } catch (error) {
    if (error.code === 'ENOENT' && typeof setup.template === 'string' && setup.template !== botCopy.es.notice) {
      bot = { ...defaultBot, responses: { notice: setup.template } }
      writeFileSync(botFile, JSON.stringify(bot))
    }
  }
  delete setup.template
  twitchClientId = setup.platform === 'twitch' ? setup.clientId : undefined
  progress = openProgress(join(profile, setup.platform === 'demo' ? 'demo-progress.sqlite' : 'twitch-progress.sqlite'))
  const catalog = manifest.species.map(item => ({ id: Number(item.id), name: item.name, shiny: !item.normal || Boolean(item.shiny),
    legendary: Boolean(battleStats[Number(item.id) - 1]?.[5]) }))
  const savedProgress = progress.load()
  activityLog.push(...(savedProgress?.activityLog ?? []).slice(-100))
  kickCursor = savedProgress?.kickCursor ?? 0
  game = createGame({ catalog, progress: savedProgress, streamStarters: setup.platform !== 'demo' })
  if (!savedProgress) game.setRunning(false)
  if (setup.platform !== 'demo' && safeStorage.isEncryptionAvailable()) {
    const file = join(profile, 'cloud-device.enc')
    try {
      syncDevice = JSON.parse(safeStorage.decryptString(readFileSync(file)))
    } catch (error) {
      if (error.code !== 'ENOENT') syncStatus = 'No se pudo recuperar la vinculación'
    }
    let settings
    try {
      settings = JSON.parse(readFileSync(join(profile, 'cloud-pairing.json'), 'utf8'))
    } catch (error) {
      if (error.code !== 'ENOENT') syncStatus = 'Configuración de vinculación inválida'
    }
    const { community, url } = settings ?? {}
    if (!syncDevice && community && url) {
      syncDevice = { community, url, token: randomBytes(32).toString('hex') }
      writeFileSync(file + '.tmp', safeStorage.encryptString(JSON.stringify(syncDevice)))
      renameSync(file + '.tmp', file)
    }
    if (syncDevice && community === syncDevice.community) {
      const fingerprint = createHash('sha256').update(syncDevice.token).digest('hex')
      writeFileSync(join(profile, 'cloud-device.fingerprint'), fingerprint)
    }
  }
  if (!syncDevice && !twitchClientId && safeStorage.isEncryptionAvailable()) {
    try {
      kickRegistration = JSON.parse(safeStorage.decryptString(readFileSync(join(profile, 'kick-registration.enc'))))
      if (/^[0-9a-f]{64}$/.test(kickRegistration?.token ?? '')) {
        kickRegistrationTimer = setTimeout(() => checkKickRegistration(profile), 500)
      }
    } catch { /* the app may never have started Kick setup */ }
  }
  if (syncDevice?.url === publicPortal && safeStorage.isEncryptionAvailable()) {
    try {
      const reset = JSON.parse(safeStorage.decryptString(readFileSync(join(profile, 'community-reset.enc'))))
      if (reset.community === syncDevice.community && /^[0-9a-f]{64}$/.test(reset.previous) && /^[0-9a-f]{64}$/.test(reset.token)) pendingReset = reset
    } catch { /* no pending reset */ }
  }
  if (syncDevice) kickTimer = setTimeout(pollKick, 1500)
  if (twitchClientId) {
    twitchStatus = 'Twitch: esperando autorización…'
    const sessionFile = join(profile, 'twitch-session.enc')
    let savedToken
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const session = JSON.parse(safeStorage.decryptString(readFileSync(sessionFile)))
        if (session.clientId === twitchClientId) savedToken = session.token
      } catch (error) {
        if (error.code !== 'ENOENT') console.warn('Could not restore Twitch session')
      }
    }
    disconnectTwitch = connectTwitch({
      savedToken,
      saveToken(token) {
        if (!safeStorage.isEncryptionAvailable()) return
        const encrypted = safeStorage.encryptString(JSON.stringify({ clientId: twitchClientId, token }))
        writeFileSync(sessionFile + '.tmp', encrypted)
        renameSync(sessionFile + '.tmp', sessionFile)
      },
      clientId: twitchClientId,
      webUrl: setup.webUrl || syncDevice?.url || publicPortal,
      onAuthorized(identity, token) {
        pairNewCommunity(profile, identity, token).catch(() => {
          if (!kickAbort.signal.aborted) syncStatus = 'No se pudo vincular la comunidad'
        })
      },
      getBot: () => bot,
      isRunning: () => twitchAllowed() && isLive('twitch') && game.config.running !== false,
      allowOwner: true,
      onChat: (name, message) => rememberChat('twitch', name, message),
      async sendReply(broadcaster, message) {
        try { return await twitchBot?.sendTo(broadcaster, message) }
        catch (error) {
          if ([401, 403].includes(error.status)) return false
          throw error
        }
      },
      announceCode(url, code) {
        twitchAuthorizationUrl = url
        twitchStatus = 'Twitch: código ' + code
        shell.openExternal(url).catch(() => {})
      },
      onStatus(status) {
        twitchStatus = status
        twitchAuthorizationUrl = undefined
        if (syncDevice && status === 'Twitch: conectado como ' + syncDevice.community) ensureCloudSync()
      },
      command(viewer, displayName, message) {
        if (!twitchAllowed()) return
        return chatAction(viewer, displayName, message, 'twitch')
      }
    })
  }
  if (twitchClientId) connectDesktopBot(profile)
  if (disconnectTwitch || syncDevice) {
    const notices = createEncounterNotices(async message => {
      const text = botSignature(bot, message)
      await Promise.all([
        disconnectTwitch?.announce(text),
        kickConnected && isLive('kick') ? sendKickMessage(text) : undefined
      ])
    })
    noticeTimer = setInterval(() => {
      if (game.config.running === false) return
      const wild = game.overlay('encounter').encounter
      if (wild && wild.id !== lastWild) {
        lastWild = wild.id
        const pokemon = wild.name + (wild.shiny ? ' ✦' : '')
        const chance = Math.round(game.encounterChance(wild.name) * 100)
        remember(activityLog, { name: pokemon, message: 'Wild encounter', result: chance + '%' })
        const message = botSignature(bot, formatBotReply(bot, 'wildAppeared', { pokemon, chance }))
        if (message) Promise.allSettled([
          isLive('twitch') ? disconnectTwitch?.announce(message) : null,
          isLive('kick') ? sendKickMessage(message) : null
        ])
      }
      notices(game.schedule(), botResponse(bot, 'notice'), bot.language).catch(error => {
        console.warn('Could not send encounter notice:', error.message)
      })
      tickBattleSchedule()
    }, 1000)
  }
  checkpoint = setInterval(persistGame, 15_000)
  shopTimer = setTimeout(pollShop, 1000)
  server.once('error', error => {
    console.error(error.code === 'EADDRINUSE' ? 'El puerto 43127 está ocupado. Cierra la otra instancia de Stream Companions.' : error.message)
    app.quit()
  })
  server.listen(43127, '127.0.0.1', async () => {
    try {
      await session.defaultSession.cookies.set({ url: localOrigin, name: 'sc_local_control', value: controlToken, httpOnly: true, sameSite: 'strict' })
    } catch (error) {
      console.error('No se pudo iniciar el panel local:', error.message)
      app.quit()
      return
    }
    if (kickAbort.signal.aborted) return
    mainWindow = new BrowserWindow({ width: 1040, height: 780, webPreferences: { sandbox: true } })
    mainWindow.removeMenu()
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (new URL(url).origin !== localOrigin) event.preventDefault()
    })
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    mainWindow.on('closed', () => { mainWindow = undefined })
    try { activateInstalledUpdate(profile) } catch { /* current build still runs */ }
    mainWindow.loadURL(localOrigin)
    refreshUpdateStatus()
  })
})
app.on('before-quit', () => {
  clearInterval(battleTimer)
  kickAbort.abort()
  twitchBot?.()
  clearTimeout(kickRegistrationTimer)
  clearTimeout(kickTimer)
  clearTimeout(shopTimer)
  disconnectTwitch?.()
  stopSync?.()
  clearInterval(checkpoint)
  clearInterval(noticeTimer)
  server.close()
  server.closeAllConnections()
  if (progress) {
    try { persistGame() } catch (error) { console.error('No se pudo guardar el progreso al cerrar:', error.message) }
    finally { progress.close() }
  }
})
app.on('window-all-closed', () => app.quit())
