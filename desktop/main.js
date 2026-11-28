import { parseTrainingCommand } from '../ui/training.js'
import { app, BrowserWindow, dialog, safeStorage, session, shell } from 'electron'
import { createHash, randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { appendFileSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { cueType, maxCueBytes } from '../ui/shiny-cue.js'
import { normalizeCommand } from './commands.js'
import { connectTwitch } from './twitch.js'
import { startCloudSync } from './cloud-sync.js'
import { openProgress } from './progress.js'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { botCategory, chatBotEnabled, botCopy, botResponse, botSignature, defaultBot, formatBotReply, validateBot } from '../ui/bot-copy.js'
import { createEncounterNotices } from './notices.js'
import { createGame, creatures } from './game.js'
import { level } from '../ui/levels.js'
import { spriteScale } from '../ui/sprites.js'
import { specialEncounterTag } from '../ui/capture-rates.js'
import { projectLinks } from '../ui/about.js'
import { hasAppArchive, stageUpdate } from './install-update.js'
import { checkForUpdate } from './update-check.js'
import { evolutionParent, isFirstStage } from '../ui/evolution.js'

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
const battleStats = battleRules.battleSpecies
const { applyAbilities } = await import('../ui/abilities.js')
const { simEntry, simulateMatchup } = await import('./balance-sim.js')
let simulating = false
const defaultRaidBosses = JSON.parse(await readFile(new URL('../ui/raid-bosses.json', import.meta.url)))
function validateRaidBosses(data) {
  if (!Array.isArray(data?.bosses) || !data.bosses.length || data.bosses.length > 100 ||
      data.bosses.some(boss => !battleStats(boss?.species) || !manifest.species.some(item => Number(item.id) === boss.species) ||
        !['easy', 'medium', 'hard', 'expert'].includes(boss.difficulty))) throw new Error('Invalid raid boss roster')
  const bosses = data.bosses.map(boss => ({ ...defaultRaidBosses.bosses.find(entry => entry.species === boss.species), ...boss }))
  for (const gmax of defaultRaidBosses.bosses.filter(boss => boss.gigantamax)) {
    if (!bosses.some(boss => boss.species === gmax.species)) bosses.push(gmax)
  }
  if (bosses.some(boss => (boss.moves && (!Array.isArray(boss.moves) || !boss.moves.length || boss.moves.length > 7 ||
      new Set(boss.moves).size !== boss.moves.length || boss.moves.some(id => !Object.hasOwn(battleRules.moves, id) || battleRules.moves[id].ultimate))) ||
      (boss.ultimate && !battleRules.moves[boss.ultimate]?.ultimate) ||
      (boss.ultimatePp !== undefined && (!Number.isInteger(boss.ultimatePp) || boss.ultimatePp < 1 || boss.ultimatePp > 10)))) throw new Error('Invalid boss moveset')
  return { ...data, bosses }
}
let raidBosses = defaultRaidBosses
let queuedRaid
let lastRaidRoll = 0
const raidDifficulties = { easy: ['Fácil', 'Easy'], medium: ['Media', 'Medium'], hard: ['Difícil', 'Hard'], expert: ['Experta', 'Expert'] }
let communityBattle
let lastTeamWinner
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
const botTestStatus = {}
const lastBotTest = new Map()
const liveChannels = new Map()
const activityLog = []
let diagnosticsFile
let lastOverlayRoster = ''
function logDiagnostic(event, fields = {}) {
  if (!diagnosticsFile) return
  try {
    if ((statSync(diagnosticsFile, { throwIfNoEntry: false })?.size ?? 0) >= 2_000_000) {
      rmSync(diagnosticsFile + '.previous', { force: true })
      renameSync(diagnosticsFile, diagnosticsFile + '.previous')
    }
    appendFileSync(diagnosticsFile, JSON.stringify({ at: new Date().toISOString(), event, ...fields }) + '\n')
  } catch (error) { console.warn('Could not write game diagnostics:', error.code ?? error.name) }
}
const localChat = []
const commandTimes = new Map()
let lastWild = null
const remember = (list, entry) => { list.push({ ...entry, at: Date.now() }); if (list.length > 100) list.shift() }
const rememberChat = (platform, name, message) => remember(localChat, { platform, name, message: message.slice(0, 500) })
const isLive = provider => liveChannels.get(provider)?.live === true
function publicCommunityLink() {
  const portal = new URL(setup.webUrl || syncDevice?.url || publicPortal)
  portal.username = ''
  portal.password = ''
  portal.search = ''
  portal.hash = ''
  if (syncDevice?.community) portal.searchParams.set('community', syncDevice.community)
  return portal.href
}

function chatAction(viewer, displayName, text, platform, save = true, sharedSummon = false) {
  if (pendingReset || !isLive(platform)) return ''
  const [action, ball = 'normal'] = normalizeCommand(text).split(' ')
  if (action.startsWith('!') && action !== '!balls') {
    if (!['!poke', '!catch', '!summon', '!summonshiny', '!evolve', '!candy', '!balls', '!legendaryticket', '!shiny'].includes(action)) return ''
    const now = Date.now()
    for (const [id, at] of commandTimes) if (now - at >= 5000) commandTimes.delete(id)
    if (commandTimes.has(viewer)) return ''
    commandTimes.set(viewer, now)
  }
  const balls = game.ballInventory(viewer)
  const en = bot.language === 'en'
  const names = { normal: 'Poké Ball', great: en ? 'Great Ball' : 'Super Ball', ultra: 'Ultra Ball', master: 'Master Ball' }
  if (action === '!balls') {
    if (!balls) return { code: 'joinFirst', viewer: displayName }
    game.recordAction(viewer, { platform, action: '!inventory', result: 'ballInventory' })
    if (save) persistGame()
    const inventory = Object.entries(names).filter(([key]) => balls[key] > 0)
      .map(([key, name]) => name + ' ×' + balls[key]).join(' · ')
    return { code: 'ballInventory', viewer: displayName, inventory: inventory || (en ? 'No Poké Balls' : 'Sin Poké Balls') }
  }
  const result = game.chat(viewer, text, displayName, platform)
  if (action.startsWith('!')) logDiagnostic('game_command', { source: sharedSummon ? 'web' : 'chat', platform, command: action, result,
    ...(result === 'missingCreature' ? { viewerId: viewer, requested: normalizeCommand(text).slice(0, 100) } : {}) })
  const balance = { ball: names[ball], remaining: balls?.[ball] }
  if (action.startsWith('!')) {
    remember(activityLog, { platform, name: displayName, message: text.slice(0, 120), result })
    const capture = ['caught', 'duplicateReward', 'escaped'].includes(result) ? {
      ball, remaining: balance.remaining, ...(result !== 'escaped' ? { pokemon: game.latestCapture()?.pokemon } : {})
    } : undefined
    game.recordAction(viewer, { platform, action: normalizeCommand(text).slice(0, 120), result, ...(capture ? { capture } : {}) })
    if (save) persistGame()
  }
  if (result === 'caught' || result === 'duplicateReward') return { code: 'catchSuccess', ...game.latestCapture(), ...balance }
  if (result === 'escaped' || result === 'noBalls') return { code: result, viewer: displayName, ...balance }
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

let shinyCue
let syncedShinyCue
let syncingShinyCue = false
const shinyCueFile = () => join(app.getPath('userData'), 'shiny-cue')

async function syncShinyCue() {
  if (!syncDevice || syncingShinyCue) return
  const device = syncDevice
  const cue = shinyCue
  const key = cue?.key ?? 'default'
  if (syncedShinyCue?.device === device && syncedShinyCue.key === key) return
  syncingShinyCue = true
  try {
    const response = await fetch(new URL('/api/shiny-cue', device.url), {
      method: cue ? 'PUT' : 'DELETE',
      headers: { Authorization: 'Bearer ' + device.token, ...(cue ? { 'Content-Type': cue.type } : {}) },
      body: cue?.bytes, signal: AbortSignal.timeout(5000), redirect: 'error'
    })
    if (response.ok) syncedShinyCue = { device, key }
  } finally {
    syncingShinyCue = false
    if (device !== syncDevice || cue !== shinyCue) void syncShinyCue().catch(() => {})
  }
}

function setShinyCue(bytes) {
  const type = cueType(bytes)
  if (!type || bytes.length > maxCueBytes) return false
  shinyCue = { bytes, type, key: createHash('sha256').update(bytes).digest('hex') }
  return true
}

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
const catalogVersion = createHash('sha256').update(JSON.stringify(manifest.species))
  .update(await readFile(new URL('../ui/ui.js', import.meta.url)))
  .update(await readFile(new URL('../ui/sprites.js', import.meta.url))).digest('hex').slice(0, 16)
let game
let progress
let checkpoint
let stopSync
let shopTimer
let nextShopMaintenance = 0
let publishedEncounter
let nextIdentitySync = 0
let nextAdminPoll = 0
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
  progress.save({ ...game.progress(), kickCursor, activityLog, lastTeamWinner })
}

function applyPrivacy(erasures) {
  const changed = []
  for (const entry of erasures) {
    if (!/^(twitch|kick):\d{1,24}$/.test(entry?.viewer_id) || !Number.isSafeInteger(entry.generation) ||
        entry.generation < 1 || ![0, 1].includes(entry.active)) continue
    if (game.applyErasure(entry)) changed.push(entry.viewer_id)
  }
  if (!changed.length) return
  if (changed.includes(lastTeamWinner?.id)) lastTeamWinner = undefined
  if (communityBattle?.battle.actors.some(actor => changed.includes(actor.viewerId))) {
    clearInterval(battleTimer)
    game.setBattleActive(false)
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
    if (Date.now() >= nextShopMaintenance) {
      nextShopMaintenance = Date.now() + 30_000
      await refreshLiveChannels()
      void syncShinyCue().catch(() => {})
      if (!stopSync) return
      const privacy = await fetch(new URL('/api/privacy', syncDevice.url), {
        headers: { Authorization: 'Bearer ' + syncDevice.token }, redirect: 'error',
        signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(6000)])
      }).catch(() => null)
      if (privacy?.ok && !kickAbort.signal.aborted) {
        const { erasures } = await privacy.json()
        if (!kickAbort.signal.aborted && Array.isArray(erasures)) applyPrivacy(erasures)
      }
    }
    if (!stopSync) return
    if (kickAbort.signal.aborted || game.config.running === false) return
    const encounter = game.currentEncounter()
    const webGame = encounter ? { id: encounter.id, speciesId: game.encounterSpecies(encounter.name), rarity: encounter.rarity, shiny: Boolean(encounter.shiny), en: game.encounterDifficulty(encounter.name, 'en'), es: game.encounterDifficulty(encounter.name, 'es') } : {}
    const endpoint = new URL('/api/shop', syncDevice.url)
    const encounterSignal = endpoint.href + ':' + JSON.stringify(webGame)
    const fetchLinks = Date.now() >= nextIdentitySync
    const fetchAdmin = Date.now() >= nextAdminPoll
    const request = body => fetch(endpoint, {
      method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { Authorization: 'Bearer ' + syncDevice.token, 'Content-Type': 'application/json',
        ...(!body ? { 'X-Shop-Prices': JSON.stringify(game.config.shopPrices), 'X-Shop-Family-Dna': '3', 'X-Shop-Quantity': '1', 'X-Web-Game': 'v2:' + Buffer.from(JSON.stringify(webGame)).toString('base64url'), 'X-Identity-Orders': '1', ...(publishedEncounter !== encounterSignal ? { 'X-Encounter-Changed': '1' } : {}), ...(fetchAdmin ? { 'X-Admin-Actions': '1' } : {}), ...(fetchLinks ? { 'X-Identity-Links': '1' } : {}) } : {}) },
      body: body && JSON.stringify({ viewers: body }),
      signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(8000)])
    })
    const response = await request()
    if (!response.ok || pendingReset || kickAbort.signal.aborted || game.config.running === false) return
    publishedEncounter = encounterSignal
    const { orders, webActions, links, adminActions } = await response.json()
    if (pendingReset || kickAbort.signal.aborted || game.config.running === false) return
    const linkedKickAccounts = new Map()
    if (Array.isArray(links)) {
      for (const link of links.filter(link => /^kick:\d{1,24}$/.test(link?.kickId ?? '') && /^twitch:\d{1,24}$/.test(link?.twitchId ?? ''))) linkedKickAccounts.set(link.kickId, link.twitchId)
      nextIdentitySync = Date.now() + 10_000
      let changed = false
      for (const [kickId, twitchId] of linkedKickAccounts) changed = mergeLinkedViewers(kickId, twitchId) || changed
      if (changed) persistGame()
    }
    if (Array.isArray(adminActions)) {
      nextAdminPoll = Date.now() + 3000
      if (adminActions.length) await processAdminActions(adminActions)
    }
    if (Array.isArray(webActions) && webActions.length) await processWebGame(webActions)
    if (!Array.isArray(orders) || !orders.length || orders.length > 10 || orders.some(order =>
      !/^[a-f0-9-]{36}$/.test(order?.id ?? '') || !/^(twitch|kick):\d{1,24}$/.test(order?.viewerId ?? ''))) return
    const uniqueOrders = [...new Set(orders.map(order => order.id))].map(id => {
      const order = orders.find(candidate => candidate.id === id)
      return { ...order, viewerId: linkedKickAccounts.get(order.viewerId) ?? order.viewerId }
    })
    const receipts = uniqueOrders.map(order => ({ id: order.id, result: game.fulfillOrder(order), hatch: game.shopHatch(order.id) }))
    receipts.forEach(({ id, result }, index) => logDiagnostic('shop_order_result', {
      requestId: id, result, item: uniqueOrders[index].item, quantity: uniqueOrders[index].quantity ?? 1
    }))
    persistGame()
    const acknowledgement = await request(receipts.map((receipt, index) => ({ ...receipt,
      ...(receipt.result === 'purchased' ? { viewer: progress.viewer(uniqueOrders[index].viewerId) } : {})
    })))
    if (!acknowledgement.ok) logDiagnostic('shop_ack_error', { status: acknowledgement.status, count: receipts.length })
    if (!acknowledgement.ok || kickAbort.signal.aborted) return
    const { received } = await acknowledgement.json()
    if (kickAbort.signal.aborted) return
    if (Array.isArray(received) && received.some(id => receipts.some(receipt => receipt.id === id))) {
      logDiagnostic('shop_ack', { requestIds: received })
      game.acknowledgeOrders(receipts.filter(receipt => received.includes(receipt.id)).map(({ id }) => id))
      persistGame()
    }
  } catch (error) {
    if (!kickAbort.signal.aborted) console.warn('Could not sync shop:', error.message)
  } finally {
    if (!kickAbort.signal.aborted) shopTimer = setTimeout(pollShop, 1_000)
  }
}

function mergeLinkedViewers(kickId, twitchId) {
  const changed = game.linkKickViewer(kickId, twitchId)
  if (commandTimes.has(kickId)) {
    commandTimes.set(twitchId, Math.max(commandTimes.get(twitchId) ?? 0, commandTimes.get(kickId)))
    commandTimes.delete(kickId)
  }
  return changed
}

function queueManualBattle() {
  if (!game.config.battleEnabled || game.config.running === false || battleDueAt || battleStarting ||
      (communityBattle && !communityBattle.battle.over)) return 409
  const active = Object.keys(game.overlay('companions').viewers).filter(id => /^(twitch|kick):\d+$/.test(id))
  if (active.length < 2) return 422
  battleDueAt = Date.now() + 60_000
  game.setWildPaused(true)
  const message = botSignature(bot, bot.language === 'en' ? 'Battle royale starts in 1 minute!' : '¡La batalla campal empieza en 1 minuto!')
  void announceInLiveChats(message)
  return 204
}

async function processAdminActions(actions) {
  const receipts = []
  for (const action of actions.slice(0, 5)) {
    const id = action?.id
    if (!/^[a-f0-9-]{36}$/.test(id ?? '')) continue
    const key = 'admin:' + id
    let result = game.webReceipt(key)
    if (!result) {
      let done = false
      try {
        if (action.type === 'speciesRules') {
          game.setSpeciesRules(action.kind, action.rules)
          done = true
        }
        if (action.type === 'grant') done = game.grantAdmin(action)
        if (action.type === 'spawn' && game.config.running !== false && !game.trackerPending()) {
          game.spawn(action.pokemon)
          done = true
        }
        if (action.type === 'battle') done = queueManualBattle() === 204
      } catch { /* Tournament and encounter rules can reject an action. */ }
      result = done ? 'done' : 'rejected'
      game.rememberWebReceipt(key, result)
      persistGame()
      logDiagnostic('web_admin_action', { id, type: action.type, result })
    }
    receipts.push({ id, result })
  }
  if (!receipts.length) return
  const response = await deviceRequest('/api/admin-actions', { viewers: receipts }).catch(() => null)
  if (!response?.ok) return
  const { received } = await response.json()
  if (!Array.isArray(received)) return
  game.acknowledgeOrders(receipts.filter(receipt => received.includes(receipt.id)).map(receipt => 'web:admin:' + receipt.id))
  persistGame()
}

async function processWebGame(actions) {
  const receipts = []
  const trainingViewers = new Map()
  const announcements = []
  for (const action of actions.slice(0, 10)) {
    const { id, viewerId, platform, command, encounterId, twitchId, kickId } = action
    const training = parseTrainingCommand(command)
    if (!/^[a-f0-9-]{36}$/.test(id) || !/^(twitch|kick):\d{1,24}$/.test(viewerId) ||
        !['twitch', 'kick'].includes(platform) || typeof command !== 'string' || command.length > 120 ||
        (!training && !/^!(?:catch (?:normal|great|ultra|master)|summon .+|summonshiny .+|candy \d{1,2}|legendaryticket|shiny)$/.test(command))) continue
    let result = game.webReceipt(id)
    const replay = Boolean(result)
    const linked = /^twitch:\d{1,24}$/.test(twitchId ?? '') && /^kick:\d{1,24}$/.test(kickId ?? '') &&
        [twitchId, kickId].includes(viewerId)
    const owner = linked ? twitchId : viewerId
    if (training) trainingViewers.set(id, owner)
    if (!result) {
      if (linked) mergeLinkedViewers(kickId, twitchId)
      if (training) result = game.train(owner, training.pokemon, training.operation, training.value)
      else if (!isLive(platform)) result = 'offline'
      else if (encounterId && game.currentEncounter()?.id !== encounterId) result = 'expired'
      else {
        const response = chatAction(owner, undefined, command, platform, false, true)
        result = response?.code || 'cooldown'
        if (result === 'catchSuccess') announcements.push([platform, botSignature(bot, formatBotReply(bot, result, response))])
      }
      game.rememberWebReceipt(id, result)
    }
    logDiagnostic('web_game_result', { requestId: id, platform, command: command.split(' ')[0], result, replay })
    receipts.push({ id, result })
  }
  if (!receipts.length) return
  persistGame()
  for (const [platform, message] of announcements) {
    if (!message) continue
    publishPortalMessage(message)
    if (!chatBotEnabled(bot, 'capture')) continue
    if (platform === 'kick') sendKickMessage(message).catch(() => {})
    else disconnectTwitch?.announce(message)
  }
  const response = await fetch(new URL('/api/web-game', syncDevice.url), {
    method: 'POST', redirect: 'error', headers: { Authorization: 'Bearer ' + syncDevice.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewers: receipts.map(receipt => trainingViewers.has(receipt.id) ?
      { ...receipt, viewer: progress.viewer(trainingViewers.get(receipt.id)) } : receipt) }), signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(8000)])
  })
  if (!response.ok) {
    logDiagnostic('web_game_ack_error', { status: response.status, count: receipts.length })
    return
  }
  const { received } = await response.json()
  if (Array.isArray(received)) {
    logDiagnostic('web_game_ack', { requestIds: received })
    game.acknowledgeOrders(receipts.filter(receipt => received.includes(receipt.id)).map(receipt => 'web:' + receipt.id))
    persistGame()
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
      game.setBattleActive(false)
      communityBattle = undefined
      battleDueAt = battleBannerUntil = 0
      game.resetCommunity()
      lastTeamWinner = undefined
      activityLog.length = 0
      progress.save({ ...game.progress(), kickCursor, activityLog, lastTeamWinner }, { clearQueue: true })
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
  return deviceRequest('/api/kick/' + path, body)
}

function deviceRequest(path, body) {
  return fetch(new URL(path, syncDevice.url), {
    method: body ? 'POST' : 'GET', redirect: 'error',
    headers: { Authorization: 'Bearer ' + syncDevice.token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(path === '/api/kick/reply' ? 15_000 : 6500)])
  })
}

function publishPortalMessage(message) {
  if (message) logDiagnostic('bot_message', { message })
}

function announceInLiveChats(message) {
  if (!message) return
  publishPortalMessage(message)
  if (!chatBotEnabled(bot, 'announcement')) return
  return Promise.allSettled([
    twitchAllowed() && isLive('twitch') ? disconnectTwitch?.announce(message) : undefined,
    kickConnected && isLive('kick') ? sendKickMessage(message) : undefined
  ])
}

async function sendKickMessage(message, test = false) {
  const response = await kickRequest('reply', { message: message.slice(0, 500), projectBotOnly: true })
  if (!response.ok) {
    if (!test) return false
    const { reason } = await response.json().catch(() => ({}))
    return ['kickPermission', 'kickRateLimited', 'kickRejected', 'kickSameAccount', 'kickUnavailable'].includes(reason) ? reason : false
  }
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
      if (event.twitch_id) mergeLinkedViewers(event.viewer_id, event.twitch_id)
      const viewer = event.twitch_id || event.viewer_id
      const text = event.content
      rememberChat('kick', event.display_name, event.display_text ?? text)
      if (!isLive('kick') || game.config.running === false) continue
      if (['!web', '!poke web'].includes(text.trim().toLowerCase().replace(/\s+/g, ' '))) {
        if (Date.now() - lastKickLink >= 60_000) {
          replies.push(formatBotReply(bot, 'web', { url: publicCommunityLink() }))
          lastKickLink = Date.now()
        }
      } else {
        const result = chatAction(viewer, event.display_name, text, 'kick')
        if (text.startsWith('!') && result?.code) {
          const reply = formatBotReply(bot, result.code, result)
          if (result.code === 'catchSuccess' && reply) publishPortalMessage(botSignature(bot, reply))
          if (chatBotEnabled(bot, botCategory(result.code, normalizeCommand(text)))) replies.push(reply)
        }
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
function battleTicker(battle, onFrame) {
  const step = 1 / 60
  let previous = performance.now()
  let pending = 0
  return setInterval(() => {
    const now = performance.now()
    pending = Math.min(.25, pending + (now - previous) / 1000)
    previous = now
    while (!battle.over && pending >= step) {
      battle.step(step)
      pending -= step
    }
    onFrame()
  }, 1000 / 60)
}

function makeRaidBoss(boss, party) {
  const config = game.config
  const levels = party.map(entry => entry.level)
  const level = config.raidLevelMode === 'average' ? Math.round(levels.reduce((sum, rank) => sum + rank, 0) / levels.length) : Math.max(...levels)
  const viewers = new Set(party.map((entry, index) => entry.viewerId ?? index)).size
  const partyScale = 1 + viewers * config.raidViewerHpPercent / 100
  const art = manifest.species.find(entry => Number(entry.id) === boss.species)
  return { ...simEntry(boss.species, level, 0), name: art.name, team: 'raid-boss', boss: true,
    bossForm: art.battleForms?.gigantamax ? 'gigantamax' : null, bossScale: config.raidSizePercent / 100,
    hpBoost: config.raidHpMultiplier * partyScale, statBoost: config.raidStatMultiplier,
    bossMoves: boss.moves, bossUltimate: boss.ultimate, bossUltimatePp: boss.ultimatePp, margin: 230 }
}

function launchBattlePreview(mode, species) {
  if (!['raid', 'team'].includes(mode)) return 400
  if (battleStarting || communityBattle && !communityBattle.battle.over) return 409
  const names = new Map(manifest.species.map(item => [Number(item.id), item.name]))
  const info = (id, rank, team, extras) => ({ ...simEntry(id, rank, 2), name: names.get(id), team, ...extras })
  const party = [3, 6, 9, 149].map((id,index) => info(id, 45, mode === 'raid' ? 'party' : 'a', { support: index === 0 ? 'healpulse' : null }))
  let entries = party
  if (mode === 'raid') {
    const boss = raidBosses.bosses.find(item => item.species === species && names.has(item.species))
    if (!boss) return 404
    entries = [...party, makeRaidBoss(boss, party)]
  } else entries = [...party.slice(0,3), ...[94, 130, 65].map((id,index) => info(id, 45, 'b', { support: index === 1 ? 'pollenpuff' : null }))]
  const battle = battleRules.createBattle(entries, { raid: mode === 'raid', duration: mode === 'raid' ? game.config.raidDuration : 60 })
  const current = { battle, finishedAt: 0 }
  communityBattle = current
  battleTimer = battleTicker(battle, () => {
    if (communityBattle !== current) { clearInterval(battleTimer); return }
    if (!battle.over) return
    clearInterval(battleTimer)
    current.finishedAt = Date.now()
  })
  return 204
}

function publicBattle(battle) {
  const teams = [...new Set(battle.actors.map(actor => actor.team).filter(Boolean))]
  return { over: battle.over, winner: battle.winner?.ownerName || battle.winner?.name,
    time: battle.time, raid: battle.raid, remaining: battle.remaining, field: battle.field, effects: battle.effects,
    projectiles: battle.projectiles.map(({ x, origin, end, move, direction, actor }) => ({ x, origin, end, move: { type: move.type, effect: move.effect, visual: move.visual }, direction, actor: { types: actor.types } })),
    actors: battle.actors.map(actor => {
      const { name, ownerName, shiny, hp, maxHp, x, direction, motion, level, types, status, ongoing, boosts, flinchUntil } = actor
      return { name, ownerName, shiny, teamIndex: actor.boss ? 0 : teams.indexOf(actor.team) + 1, bossHop: actor.boss && actor.dashUntil > battle.time ? Math.sin(Math.PI * Math.min(1, (actor.dashUntil - battle.time) / .24)) * 62 : 0, boss: Boolean(actor.boss), bossScale: actor.bossScale, form: actor.bossForm ?? actor.form, appearance: actor.appearance, hp, maxHp, x, direction, motion, level, flying: types.includes('flying'), status: status?.kind,
        ongoing: ongoing?.kind, maneuver: battleRules.battleManeuver(actor, battle.time),
        evasion: boosts.evasion > battle.time, flinched: flinchUntil > battle.time }
    }) }
}

const sheets = new Set(manifest.species.flatMap(item => [item, ...Object.values(item.battleForms ?? {})]).flatMap(item => [
  item.portrait, item.shinyPortrait,
  ...[item.normal, item.shiny].filter(Boolean).flatMap(variant => Object.values(variant.animations).map(animation => animation.url))
].filter(path => /^\/pmd\/[a-z0-9-]+\/[a-z0-9_-]+\.(?:png|webp)$/i.test(path))))
async function startCommunityBattle(waitForBanner = false, raidBoss, manual = false) {
  if (battleStarting || !manual && !raidBoss && !game.config.battleEnabled) return 409
  battleStarting = true
  try { return await runCommunityBattle(waitForBanner, raidBoss, manual) } finally { battleStarting = false }
}

async function runCommunityBattle(waitForBanner, raidBoss, manual) {
  if (!battleRules || (!twitchClientId && !syncDevice) || game.config.running === false || (communityBattle && !communityBattle.battle.over)) {
    return 409
  }
  const byName = new Map(manifest.species.map(species => [species.name.toLowerCase(), species]))
  const viewers = game.snapshot().viewers
  const activeIds = Object.keys(viewers).filter(id => viewers[id].active && /^(twitch|kick):\d{1,24}$/.test(id))
  const teamMode = !raidBoss
  if (teamMode) activeIds.splice(12)
  let savedTeams = {}
  if (syncDevice && stopSync) {
    for (let offset = 0; offset < activeIds.length; offset += 12) {
      try {
        const response = await deviceRequest('/api/movesets', { teams: activeIds.slice(offset, offset + 12) })
        if (response.ok) Object.assign(savedTeams, await response.json())
      } catch { /* single summon fallback for this batch */ }
    }
  }
  const entriesForViewer = (viewerId, pokemon) => {
    const viewer = viewers[viewerId]
    if (!Object.hasOwn(viewer.collection, pokemon)) return null
    const species = byName.get(pokemon.replace(/ ✦$/, '').toLowerCase())
    if (!species) return null
    const rank = level(viewer.collection[pokemon])
    const id = Number(species.id)
    const row = battleStats(id)
    if (!row) return null
    const [, stats, types, final] = row
    const form = manifest.species.find(item => Number(item.id) === id) ?? species
    const variant = pokemon.endsWith(' ✦') ? form.shiny ?? form.normal : form.normal
    return { viewerId, speciesKey: pokemon, team: teamMode ? viewerId : 'raid-party', id, stats, types, final, level: rank,
      training: game.battleTraining(viewer, pokemon, id),
      ownedHeldItems: viewer.heldItems ?? [],
      name: form.name, margin: Math.max(75, ...Object.values(variant?.animations ?? {}).map(clip => clip.width * spriteScale(clip, 3) / 2 + 18)),
      ownerName: viewer.displayName,
      shiny: pokemon.endsWith(' ✦') }
  }
  let entries = activeIds.flatMap(viewerId => {
    const team = savedTeams[viewerId]?.slice(0, 3).map(slot => entriesForViewer(viewerId, slot.pokemon)).filter(Boolean)
    return team?.length ? team : [entriesForViewer(viewerId, viewers[viewerId].active.key)].filter(Boolean)
  })
  if (new Set(entries.map(entry => entry.viewerId)).size < (raidBoss ? 1 : 2)) {
    return 422
  }
  if (syncDevice && stopSync) {
    for (let offset = 0; offset < entries.length; offset += 36) {
      const batch = entries.slice(offset, offset + 36)
      try {
        const response = await fetch(new URL('/api/movesets', syncDevice.url), {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2500),
          headers: { Authorization: 'Bearer ' + syncDevice.token, 'Content-Type': 'application/json' },
          body: JSON.stringify(batch.map(({ viewerId, speciesKey }) => ({ viewerId, speciesKey })))
        })
        if (!response.ok) continue
        const results = await response.json()
        for (const entry of batch) {
          const loadout = results.find(item => item.viewerId === entry.viewerId && item.speciesKey === entry.speciesKey)
          entry.selectedMoves = loadout?.moves
          entry.selectedAt = loadout?.selectedAt
          entry.selectedUltimate = loadout?.ultimate
          if (entry.ownedHeldItems.includes(loadout?.heldItem)) entry.heldItem = loadout.heldItem
        }
      } catch (error) { console.warn('Could not load community movesets:', error.message) }
    }
  }
  if (waitForBanner) {
    battleBannerUntil = Date.now() + 2000
    await new Promise(resolve => setTimeout(resolve, 2000))
    battleBannerUntil = 0
  }
  if (kickAbort.signal.aborted || !manual && !raidBoss && !game.config.battleEnabled || game.config.running === false || (communityBattle && !communityBattle.battle.over)) return 409
  const active = game.overlay('companions').viewers
  const currentViewers = game.snapshot().viewers
  entries = entries.filter(entry => active[entry.viewerId] && Object.hasOwn(currentViewers[entry.viewerId].collection, entry.speciesKey))
  if (new Set(entries.map(entry => entry.viewerId)).size < (raidBoss ? 1 : 2)) return 422
  if (raidBoss) entries.push(makeRaidBoss(raidBoss, entries))
  const battle = battleRules.createBattle(entries, {
    hpMultiplier: game.config.battleHpMultiplier,
    ...(raidBoss ? { raid: true, duration: game.config.raidDuration } : {}),
    onMoveReward(actor, amount) {
      if (game.creditBattleMove(actor.viewerId, amount)) {
        logDiagnostic('battle_move_reward', { species: actor.id, amount })
        persistGame()
      }
    }
  })
  game.setBattleActive(true)
  const boss = battle.actors.find(actor => actor.boss)
  const viewerCount = new Set(entries.filter(entry => !entry.boss).map(entry => entry.viewerId)).size
  logDiagnostic('battle_started', { participants: entries.length - Number(Boolean(boss)), viewers: viewerCount,
    ...(boss ? { boss: boss.id, baseHp: boss.raidBaseHp, maxHp: boss.maxHp, hpMultiplier: boss.hpBoost,
      duration: game.config.raidDuration } : {}) })
  communityBattle = { battle, finishedAt: 0 }
  battleTimer = battleTicker(battle, () => {
    if (!battle.over || communityBattle.finishedAt) return
    communityBattle.finishedAt = Date.now()
    clearInterval(battleTimer)
    game.setBattleActive(false)
    if (raidBoss) {
      const boss = entries.find(entry => entry.boss)
      if (battle.winner && !battle.winner.boss) {
        const participants = [...new Set(entries.filter(entry => !entry.boss).map(entry => entry.viewerId))]
        for (const viewerId of participants) for (const reward of game.config.raidRewards) game.grantAdmin({ ...reward, viewerId })
        if (game.config.raidCatch) {
          game.setWildPaused(false)
          game.spawnRaidPrize(boss.name, participants)
          lastRaidRoll = game.encounterCount()
        }
        announceInLiveChats(botSignature(bot, bot.language === 'en' ? 'The Dynamax boss was defeated!' : '¡Derrotaron al jefe Dinamax!'))
      } else {
        announceInLiveChats(botSignature(bot, bot.language === 'en' ? 'The Dynamax boss raid ended.' : 'Terminó la incursión Dinamax.'))
      }
      persistGame()
      return
    }
    if (teamMode && battle.winner?.viewerId) {
      lastTeamWinner = { id: battle.winner.viewerId, name: battle.winner.ownerName || battle.winner.name }
    }
    const money = game.recordBattle(entries.map(entry => entry.viewerId), battle.winner?.viewerId, battle.winner?.speciesKey, battle.actors)
    logDiagnostic('battle_finished', { winner: Boolean(battle.winner), money })
    persistGame()
  })
  lastBattleEncounter = game.encounterCount()
  return 204
}

function tickBattleSchedule() {
  const every = game.config.battleEveryEncounters
  if (game.config.running === false || (queuedRaid ? !game.config.raidEnabled || !game.config.raidChance : !game.config.battleEnabled)) {
    battleDueAt = 0
    queuedRaid = undefined
  }
  game.setWildPaused(Boolean(battleDueAt || battleStarting || (communityBattle && !communityBattle.battle.over)))
  if (game.config.running === false || battleStarting || (communityBattle && !communityBattle.battle.over)) return
  if (battleDueAt) {
    if (Date.now() < battleDueAt || game.hasEncounter()) return
    battleDueAt = 0
    const raid = queuedRaid
    queuedRaid = undefined
    startCommunityBattle(true, raid).catch(() => {})
    return
  }
  if (game.hasEncounter()) return
  const active = Object.keys(game.overlay('companions').viewers).filter(id => /^(twitch|kick):\d+$/.test(id))
  const count = game.encounterCount()
  if (count > lastRaidRoll) {
    lastRaidRoll = count
    if (game.config.raidEnabled && active.length > 0 && Math.random() * 100 < game.config.raidChance) {
      const pool = raidBosses.bosses.filter(boss => manifest.species.some(item => Number(item.id) === boss.species))
      queuedRaid = pool[Math.floor(Math.random() * pool.length)]
      if (queuedRaid) {
        const english = bot.language === 'en'
        const difficulty = raidDifficulties[queuedRaid.difficulty][Number(english)]
        const name = manifest.species.find(item => Number(item.id) === queuedRaid.species).name
        battleDueAt = Date.now() + 60_000
        game.setWildPaused(true)
        announceInLiveChats(botSignature(bot, english ? 'A Dynamax boss approaches! ' + name + ' · ' + difficulty
          : '¡Se aproxima un jefe Dinamax! ' + name + ' · dificultad ' + difficulty))
        return
      }
    }
  }
  if (!game.config.battleEnabled || active.length < 2 || !every || count - lastBattleEncounter < every) return
  battleDueAt = Date.now() + 300_000
  game.setWildPaused(true)
  const message = botSignature(bot, bot.language === 'en' ? 'Battle royale starts in 5 minutes!' : '¡La batalla campal empieza en 5 minutos!')
  announceInLiveChats(message)
}

const feedSpecies = new Map(manifest.species.map(entry => [entry.name, entry]))
const routes = new Map([
  ['/', ['index.html', 'text/html']],
  ['/sprites.js', ['sprites.js', 'text/javascript']],
  ['/sfx/shiny.wav', ['sfx/shiny.wav', 'audio/wav']],
  ['/bot-copy.js', ['bot-copy.js', 'text/javascript']],
  ['/levels.js', ['levels.js', 'text/javascript']],
  ['/ui/levels.js', ['levels.js', 'text/javascript']],
  ['/ui/held-items.js', ['held-items.js', 'text/javascript']],
  ['/ui/egg-rules.js', ['egg-rules.js', 'text/javascript']],
  ['/ui/egg-pool.json', ['egg-pool.json', 'application/json']],
  ['/ui/learnsets.json', ['learnsets.json', 'application/json']],
  ['/ui/training.js', ['training.js', 'text/javascript']],
  ['/ui/training.json', ['training.json', 'application/json']],
  ['/ui/shop.js', ['shop.js', 'text/javascript']],
  ['/ui/catch-rates.json', ['catch-rates.json', 'application/json']],
  ['/ui/encounter-rarities.json', ['encounter-rarities.json', 'application/json']],
  ['/ui/capture-rates.js', ['capture-rates.js', 'text/javascript']],
  ['/ui/pokemon-abilities.json', ['pokemon-abilities.json', 'application/json']],
  ['/ui/base-stats.json', ['base-stats.json', 'application/json']],
  ['/ui/raid-bosses.json', ['raid-bosses.json', 'application/json']],
  ['/ui/abilities.js', ['abilities.js', 'text/javascript']],
  ['/ui/about.js', ['about.js', 'text/javascript']],
  ['/ui/evolution.js', ['evolution.js', 'text/javascript']],
  ['/ui/regional-species.js', ['regional-species.js', 'text/javascript']],
  ['/ui/evolution-data.js', ['evolution-data.js', 'text/javascript']],
  ['/ui.js', ['ui.js', 'text/javascript']],
  ['/style.css', ['style.css', 'text/css']],
  ['/encounter', ['index.html', 'text/html']],
  ['/companions', ['index.html', 'text/html']],
  ['/knockouts', ['knockouts.html', 'text/html']],
  ['/knockouts.css', ['knockouts.css', 'text/css']],
  ['/knockouts.js', ['knockouts.js', 'text/javascript']]
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
    if (req.method === 'GET' && pathname === '/knockouts/state') {
      const current = communityBattle
      const battle = current?.battle
      const preview = searchParams.get('preview') === '1'
      const now = Date.now()
      const clock = battle ? battle.time + (current.finishedAt ? (now - current.finishedAt) / 1000 : 0) : 0
      const portrait = fighter => {
        const appearance = fighter.appearance ?? fighter
        const entry = feedSpecies.get(appearance.name)
        return {
          sprite: appearance.shiny ? entry?.shinyPortrait ?? entry?.portrait : entry?.portrait,
          name: appearance.name, viewer: fighter.ownerName || fighter.name, boss: Boolean(fighter.boss)
        }
      }
      const samples = [
        [{ name: 'Pikachu' }, { name: 'Blastoise', boss: true }],
        [{ name: 'Charizard' }, { name: 'Venusaur', ownerName: 'Viewer 1' }],
        [{ name: 'Blastoise' }, { name: 'Dragonite', ownerName: 'Viewer 2' }]
      ]
      const rows = preview ? samples.map(([target, killer], i) => ({
        id: String(i), target: portrait(target), killer: portrait(killer)
      })) : (battle?.knockouts ?? []).flatMap(({ killer, target, at }) => {
        const remaining = 5 - (clock - at)
        if (remaining <= 0) return []
        return [{ id: target + ':' + at, target: portrait(battle.actors[target]), killer: portrait(battle.actors[killer]), expiresAt: now + remaining * 1000 }]
      }).reverse()
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      const active = battleStarting || battleBannerUntil > now || Boolean(battle && !battle.over)
      res.end(JSON.stringify({ rows, language: bot.language, active,
        winner: preview ? 'Viewer 1' : active ? undefined : lastTeamWinner?.name }))
      return
    }
    if (req.method === 'GET' && pathname === '/state') {
      const overlay = searchParams.get('overlay')
      if (!['encounter', 'companions'].includes(overlay) && !hasLocalControl(req)) { res.writeHead(403).end(); return }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      const state = ['encounter', 'companions'].includes(overlay)
        ? { ...game.overlay(overlay), catalogVersion, bot: { language: bot.language } }
        : { ...game.snapshot(), twitchStatus, kickStatus, syncStatus, setup, bot, setupComplete, version: app.getVersion(), updateStatus,
          twitchConnected: twitchAllowed() && Boolean(disconnectTwitch?.connected()), kickConnected: Boolean(kickConnected), battleLab: !app.isPackaged, canInstallUpdate: app.isPackaged && process.platform === 'win32', activityLog, localChat, botTestStatus, canReset: syncDevice?.url === publicPortal, resettingCommunity: Boolean(pendingReset), raidBosses: raidBosses.bosses.map(boss => ({ ...boss, name: manifest.species.find(item => Number(item.id) === boss.species)?.name ?? boss.name })), live: setup.platform !== 'demo' }
      if (overlay === 'encounter' && state.encounter) state.encounter = { ...state.encounter,
        difficulty: game.encounterDifficulty(state.encounter.name, bot.language) }
      if (overlay === 'companions' && ['summon', 'battle'].includes(searchParams.get('preview'))) {
        const demo = searchParams.get('preview')
        const samples = demo === 'battle'
          ? [132, 774, 6].map(id => manifest.species.find(entry => Number(entry.id) === id)).filter(Boolean)
          : manifest.species.filter(entry => entry.normal && !evolutionParent(Number(entry.id))).slice(0, 3)
        state.viewers = Object.fromEntries(samples.map(({ name }, index) => [index, {
          displayName: 'Preview ' + (index + 1), active: { key: name, layer: index + 1, expires: Date.now() + 60_000 },
          collection: { [name]: 0 }
        }]))
        if (demo === 'battle' && samples.length > 1) {
          const now = Date.now()
          if (!previewBattle || now - previewBattle.last > 5000 || previewBattle.finished && now - previewBattle.finished > 4000) {
            const entries = samples.map(({name, id}, index) => {
              const [, stats, types, final] = battleStats(Number(id))
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
        const roster = Object.values(state.viewers).map(({ active }) => ({ layer: active.layer, species: active.key }))
        const packed = JSON.stringify(roster)
        if (packed !== lastOverlayRoster) {
          lastOverlayRoster = packed
          logDiagnostic('overlay_roster', { summons: roster })
        }
        state.viewers = Object.fromEntries(Object.values(state.viewers).map(viewer => [viewer.active.layer, { ...viewer, displayName: viewer.displayName || 'Viewer' }]))
        state.battleStart = battleBannerUntil > Date.now()
        const current = communityBattle
        if (current && (!current.finishedAt || Date.now() - current.finishedAt < 4500)) {
          const battle = current.battle
          state.battle = publicBattle(battle)
        }
      }
      if (!overlay && communityBattle && (!communityBattle.finishedAt || Date.now() - communityBattle.finishedAt < 4500)) {
        state.battle = publicBattle(communityBattle.battle)
        state.battleStart = battleBannerUntil > Date.now()
      }
      res.end(JSON.stringify(state))
      return
    }
    if (req.method === 'GET' && pathname === '/sfx/shiny.wav' && shinyCue) {
      res.writeHead(200, { 'Content-Type': shinyCue.type, 'Cache-Control': 'no-store' })
      res.end(shinyCue.bytes)
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
      if (action.shinyCue === 'choose' || action.shinyCue === 'reset') {
        if (action.shinyCue === 'reset') {
          rmSync(shinyCueFile(), { force: true })
          shinyCue = undefined
        } else {
          const selection = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'], filters: [{ name: 'MP3 / WAV', extensions: ['mp3', 'wav'] }]
          })
          if (selection.canceled) { res.writeHead(204).end(); return }
          const file = selection.filePaths[0]
          if (statSync(file).size > maxCueBytes || !setShinyCue(await readFile(file))) {
            res.writeHead(422).end()
            return
          }
          writeFileSync(shinyCueFile(), shinyCue.bytes)
        }
        void syncShinyCue().catch(() => {})
        res.writeHead(204).end()
        return
      }
      if (action.adminGrant) {
        if (!game.grantAdmin(action.adminGrant)) { res.writeHead(422).end(); return }
        persistGame()
        const { viewerId, kind, item, amount } = action.adminGrant
        logDiagnostic('admin_grant', { viewerId, kind, item, amount })
        res.writeHead(204).end()
        return
      }
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
          const latest = await checkForUpdate(app.getVersion(), kickAbort.signal)
          const selected = latest.status === 'available' && latest.archive ? latest : update
          const exe = await stageUpdate(app.getPath('userData'), selected, kickAbort.signal)
          res.once('finish', () => { app.relaunch({ execPath: exe, args: [...process.argv.slice(1), '--sc-activate-update'] }); app.quit() })
          res.writeHead(204).end()
        } catch (error) {
          if (!kickAbort.signal.aborted) {
            const failure = { at: new Date().toISOString(), from: app.getVersion(), to: update.version,
              error: error.name, code: error.code ?? error.cause?.code,
              detail: typeof error.exitCode === 'number' || error.cmd ? 'Archive utility failed' : error.message }
            try { writeFileSync(join(app.getPath('userData'), 'update-error.json'), JSON.stringify(failure, null, 2)) } catch {}
            updateStatus = { ...update, status: 'installFailed' }
          }
          res.writeHead(503).end()
        } finally { installingUpdate = false }
        return
      }
      if (action.startRaid) {
        const boss = raidBosses.bosses.find(item => item.species === action.startRaid && manifest.species.some(entry => Number(entry.id) === item.species))
        if (!boss) return res.writeHead(404).end()
        const result = await startCommunityBattle(false, boss)
        if (result === 204) { battleDueAt = 0; queuedRaid = undefined }
        return res.writeHead(result).end()
      }
      if (action.forceBattle) return res.writeHead(launchBattlePreview(action.forceBattle, action.species)).end()
      if (action.balanceSimulation) {
        if (simulating) { res.writeHead(409).end(); return }
        simulating = true
        try {
          const report = await simulateMatchup(action.balanceSimulation)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(report))
        } finally { simulating = false }
        return
      }
      if (action.startEventBattle === true) {
        const result = await startCommunityBattle(false, undefined, true)
        if (result === 204) { battleDueAt = 0; queuedRaid = undefined }
        return res.writeHead(result).end()
      }
      if (action.startCommunityBattle === true) return res.writeHead(queueManualBattle()).end()
      if (action.bot || Object.hasOwn(action, 'language')) {
        const edited = validateBot(action.bot
          ? { ...action.bot, language: bot.language }
          : { ...bot, language: action.language })
        if (!edited) { res.writeHead(400).end(); return }
        writeFileSync(botFile + '.tmp', JSON.stringify(edited))
        renameSync(botFile + '.tmp', botFile)
        bot = { ...edited, nickname: "" }
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
        if (Date.now() - (lastBotTest.get(platform) ?? 0) < 5000) { res.writeHead(429).end(); return }
        lastBotTest.set(platform, Date.now())
        const connected = platform === 'kick' ? kickConnected : twitchAllowed() && disconnectTwitch?.connected()
        if (!connected) {
          botTestStatus[platform] = 'offline'
        } else {
          const message = bot.language === 'es' ? 'Stream Companions: mensaje de prueba.' : 'Stream Companions: test message.'
          try {
            const sent = platform === 'kick' ? await sendKickMessage(botSignature(bot, message), true) :
              await disconnectTwitch.testChat(botSignature(bot, message))
            botTestStatus[platform] = sent || 'failed'
          } catch { botTestStatus[platform] = 'failed' }
        }
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
          game.setBattleActive(false)
          communityBattle = undefined
          battleDueAt = 0
          battleBannerUntil = 0
          lastBattleEncounter = game.encounterCount()
        }
      }
      else if (action.queueLegendary) {
        if (game.queueLegendary(action.queueLegendary) === false) { res.writeHead(409).end(); return }
      }
      else if (action.demoMasterBall && !app.isPackaged && !twitchClientId && !syncDevice) {
        if (!game.grantDemoMasterBall(String(action.demoMasterBall))) { res.writeHead(404).end(); return }
      }
      else if (action.spawn) {
        if (game.config.running === false || game.trackerPending()) { res.writeHead(409).end(); return }
        game.spawn(action.spawn)
      }
      else if (action.clearStatistics === true) game.clearStatistics()
      else if (['catch', 'rarity'].includes(action.speciesRules)) {
        if (action.reset === true) game.setSpeciesRules(action.speciesRules, null)
        else {
          const selected = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }]
          })
          if (selected.canceled) { res.writeHead(204).end(); return }
          const [file] = selected.filePaths
          const bytes = await readFile(file)
          if (bytes.length > 256_000) throw new Error('Species rules exceed size limit')
          game.setSpeciesRules(action.speciesRules, JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')))
        }
      }
      else if (['base-stats', 'pokemon-abilities', 'egg-pool'].includes(action.balanceData)) {
        const selection = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
        if (selection.canceled) { res.writeHead(204).end(); return }
        const bytes = await readFile(selection.filePaths[0])
        if (bytes.length > 1_000_000 || simulating || communityBattle && !communityBattle.battle.over) throw new Error('Balance settings unavailable')
        const data = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''))
        const apply = { 'base-stats': battleRules.applyBaseStats, 'pokemon-abilities': applyAbilities, 'egg-pool': game.setEggPool }
        apply[action.balanceData](data)
        writeFileSync(join(app.getPath('userData'), action.balanceData + '.json'), JSON.stringify(data))
      }
      else if (action.learnsets === 'choose') {
        const selection = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
        if (selection.canceled) { res.writeHead(204).end(); return }
        const bytes = await readFile(selection.filePaths[0])
        if (bytes.length > 1_000_000 || simulating || communityBattle && !communityBattle.battle.over) throw new Error('Learnsets unavailable')
        const data = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''))
        battleRules.applyLearnsets(data)
        writeFileSync(join(app.getPath('userData'), 'learnsets.json'), JSON.stringify(data))
      }
      else if (action.raidBosses === 'choose') {
        const selection = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
        if (selection.canceled) { res.writeHead(204).end(); return }
        const bytes = await readFile(selection.filePaths[0])
        if (bytes.length > 128_000) throw new Error('Raid roster too large')
        const bosses = validateRaidBosses(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')))
        writeFileSync(join(app.getPath('userData'), 'raid-bosses.json'), JSON.stringify(bosses))
        raidBosses = bosses
      }
      else if (action.capturePercentages) game.setCapturePercentages(action.capturePercentages)
      else if (action.shopPrices) game.setShopPrices(action.shopPrices)
      else if (action.config) {
        const enabled = game.config.battleEnabled
        if (action.raidRewards) game.setRaidRewards(action.raidRewards)
        game.configure({ ...game.config, ...action.config })
        if (enabled !== game.config.battleEnabled && !queuedRaid) {
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
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ ...manifest, catalogVersion, species: manifest.species.map(item => {
        const id = Number(item.id)
        const legendary = Boolean(battleStats(id)?.[5])
        const specialTag = specialEncounterTag(id, legendary)
        return { ...item, legendary, specialTag, wildEligible: Boolean(specialTag) || isFirstStage(id) }
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
    res.writeHead(200, { 'Content-Type': route[1], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' })
    res.end(file)
  } catch {
    res.writeHead(400).end()
  }
})

app.whenReady().then(() => {
  const profile = app.getPath('userData')
  mkdirSync(profile, { recursive: true })
  try { battleRules.applyBaseStats(JSON.parse(readFileSync(join(profile, 'base-stats.json'), 'utf8'))) } catch { /* bundled stats */ }
  try { applyAbilities(JSON.parse(readFileSync(join(profile, 'pokemon-abilities.json'), 'utf8'))) } catch { /* bundled abilities */ }
  try { battleRules.applyLearnsets(JSON.parse(readFileSync(join(profile, 'learnsets.json'), 'utf8'))) } catch { /* use bundled learnsets */ }
  try { raidBosses = validateRaidBosses(JSON.parse(readFileSync(join(profile, 'raid-bosses.json'), 'utf8'))) } catch { /* use the bundled lineup */ }
  try { setShinyCue(readFileSync(shinyCueFile())) } catch { /* use the built-in cue */ }
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
    bot = { ...(validateBot(JSON.parse(readFileSync(botFile, 'utf8'))) ?? defaultBot), nickname: '' }
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
    legendary: Boolean(battleStats(Number(item.id))?.[5]) }))
  const savedProgress = progress.load()
  activityLog.push(...(savedProgress?.activityLog ?? []).slice(-100))
  kickCursor = savedProgress?.kickCursor ?? 0
  lastTeamWinner = savedProgress?.lastTeamWinner
  diagnosticsFile = join(profile, 'game-diagnostics.jsonl')
  logDiagnostic('app_started', { version: app.getVersion() })
  game = createGame({ catalog, progress: savedProgress, streamStarters: setup.platform !== 'demo',
    onSummonChange(change) { logDiagnostic('summon_change', { change }) },
    onEvolution(viewer, forms) {
      for (const pokemon of forms) {
        const command = pokemon.endsWith(' ✦') ? '!summonshiny ' + pokemon.slice(0, -2) : '!summon ' + pokemon
        const message = bot.language === 'en' ? 'You unlocked ' + pokemon + '. Summon it with ' + command :
          'Desbloqueaste a ' + pokemon + '. Invócalo con ' + command
        announceInLiveChats(botSignature(bot, (viewer ? '@' + viewer + ' · ' : '') + message))
      }
    } })
  try { game.setEggPool(JSON.parse(readFileSync(join(profile, 'egg-pool.json'), 'utf8'))) } catch { /* bundled eggs */ }
  if (savedProgress) persistGame()
  else game.setRunning(false)
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
      webUrl: publicCommunityLink,
      onAuthorized(identity, token) {
        pairNewCommunity(profile, identity, token).catch(() => {
          if (!kickAbort.signal.aborted) syncStatus = 'No se pudo vincular la comunidad'
        })
      },
      getBot: () => bot,
      isRunning: () => twitchAllowed() && isLive('twitch') && game.config.running !== false,
      allowOwner: true,
      onChat: (name, message) => rememberChat('twitch', name, message),
      onBotMessage: publishPortalMessage,
      botOnly: true,
      async sendReply(_broadcaster, message) {
        if (!syncDevice || syncDevice.url !== publicPortal) return false
        return deviceRequest('/api/twitch/bot-reply', { message: message.slice(0, 500) })
          .then(response => response.ok, () => false)
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
      async command(viewer, displayName, message) {
        if (!twitchAllowed()) return
        if (syncDevice && normalizeCommand(message) === '!poke join' && isLive('twitch')) {
          const url = new URL('/api/identity-link', syncDevice.url)
          url.searchParams.set('viewer', viewer)
          try {
            const response = await fetch(url, { headers: { Authorization: 'Bearer ' + syncDevice.token }, redirect: 'error',
              signal: AbortSignal.any([kickAbort.signal, AbortSignal.timeout(1500)]) })
            if (response.ok) {
              const { kickId } = await response.json()
              if (/^kick:\d{1,24}$/.test(kickId ?? '')) mergeLinkedViewers(kickId, viewer)
            }
          } catch { /* The local Twitch profile remains available during a sync outage. */ }
        }
        return chatAction(viewer, displayName, message, 'twitch')
      }
    })
  }
  if (disconnectTwitch || syncDevice) {
    const notices = createEncounterNotices(message => announceInLiveChats(botSignature(bot, message)))
    noticeTimer = setInterval(() => {
      if (game.config.running === false) return
      tickBattleSchedule()
      const wild = game.overlay('encounter').encounter
      if (wild && wild.id !== lastWild) {
        lastWild = wild.id
        const pokemon = wild.name + (wild.shiny ? ' ✦' : '')
        const difficulty = game.encounterDifficulty(wild.name, bot.language)
        remember(activityLog, { name: pokemon, message: wild.specialTag ? 'Ultra-rare encounter' : 'Wild encounter', result: difficulty })
        const encounterReply = formatBotReply(bot, 'wildAppeared', { pokemon, difficulty, chance: difficulty })
        const specialPrefix = wild.specialTag ? (bot.language === 'en' ? 'Ultra-rare encounter · ' : 'Aparición ultrarrara · ') : ''
        const message = botSignature(bot, encounterReply && specialPrefix + encounterReply)
        if (message) announceInLiveChats(message)
      }
      notices(game.schedule(), botResponse(bot, 'notice'), bot.language).catch(error => {
        console.warn('Could not send encounter notice:', error.message)
      })
    }, 1000)
  }
  checkpoint = setInterval(persistGame, 5_000)
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
