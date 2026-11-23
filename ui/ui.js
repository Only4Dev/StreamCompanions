import { botCopy } from './bot-copy.js'
import { level, showScene } from './sprites.js'
import { shopItems } from '/ui/shop.js'
import { aboutCopy } from '/ui/about.js'

const $ = id => document.getElementById(id)
const panel = location.pathname === '/'
const botActions = Object.keys(botCopy.es).filter(action =>
  !['noEncounter', 'noBalls', 'invalidBall', 'alreadyCaught', 'escaped'].includes(action))
const labels = {
  es: { duplicateMode: 'Capturas repetidas', duplicateXpPercent: 'XP del siguiente nivel (%)', duplicateOff: 'Desactivado', duplicateReward: 'Captura repetida. El compañero ganó XP.', config: 'Configuración', interval: 'Intervalo (min)', duration: 'Duración (min)', catchGraceSeconds: 'Compensar delay (s)', invalidBall: 'Tipo de bola desconocido', shiny: 'Shiny (1 entre)', nameLimit: 'Ocultar nombres sobre', visibleLimit: 'Máx. en pantalla', spriteScale: 'Tamaño de sprites', testSummon: 'Probar invocación', clearPreview: 'Quitar prueba', save: 'Guardar', preview: 'Vista previa', spawn: 'Aparición manual', viewer: 'Probar como viewer', send: 'Enviar', next: 'Próxima aparición', joined: 'Registro listo. Recibiste 5 Poké Balls.', caught: 'Captura exitosa', escaped: 'Se escapó', summoned: 'Compañero invocado', removed: 'Compañero retirado', alreadyJoined: 'Ya estás registrado', alreadyCaught: 'Ya tienes esta captura', joinFirst: 'Escribe !poke join', noBalls: 'Sin bolas de ese tipo', noEncounter: 'Sin encuentro activo', missingCreature: 'No tienes esa variante' },
  en: { duplicateMode: 'Repeat catches', duplicateXpPercent: 'XP toward next level (%)', duplicateOff: 'Off', duplicateReward: 'Repeat catch. The companion gained XP.', config: 'Settings', interval: 'Interval (min)', duration: 'Duration (min)', catchGraceSeconds: 'Stream delay grace (s)', invalidBall: 'Unknown ball type', shiny: 'Shiny (1 in)', nameLimit: 'Hide names above', visibleLimit: 'Max on screen', spriteScale: 'Sprite size', testSummon: 'Test summon', clearPreview: 'Clear preview', save: 'Save', preview: 'Preview', spawn: 'Spawn manually', viewer: 'Test as viewer', send: 'Send', next: 'Next encounter', joined: 'Joined. You received 5 Poké Balls.', caught: 'Caught', escaped: 'Escaped', summoned: 'Companion summoned', removed: 'Companion removed', alreadyJoined: 'Already joined', alreadyCaught: 'Already caught', joinFirst: 'Type !poke join', noBalls: 'No balls of that type', noEncounter: 'No active encounter', missingCreature: 'You do not own that variant' }
}
Object.assign(labels.es, {
  language: 'Idioma', gameTab: 'Juego', previewTab: 'Pruebas', botTab: 'Bot', connectionsTab: 'Conexiones',
  linkKick: 'Vincular Kick en el portal', connectTwitch: 'Conectar Twitch', twitchReady: 'Chat conectado', twitchDisconnected: 'Chat sin conectar',
  connectKick: 'Conectar Kick', kickStatus: 'Chat sin conectar', kickPairing: 'Termina la autorización que ya tienes abierta.', kickAuthorize: 'Autoriza el canal en Kick y vuelve a la app.',
  mode: 'Modo', demoMode: 'Demo local', clientId: 'Client ID de Twitch', webUrl: 'URL del portal',
  nickname: 'Apodo del bot', advanced: 'Configuración avanzada', clientHint: 'Identificador público de la aplicación de Twitch. El valor incluido funciona para iniciar sesión con tu cuenta.', resetReply: 'Restaurar',
  botHelp: 'Los mensajes predeterminados siguen el idioma de la app. Tus ediciones se mantienen al cambiarlo. Para enviar ambos idiomas, escribe las dos frases en un mismo campo, separadas por «|». Un campo vacío desactiva el mensaje. Conserva {url} en !web y usa {min} y {unidad} en los avisos.',
  saved: 'Cambios guardados.', invalidSetup: 'Revisa el Client ID o la URL HTTPS.', restarting: 'Reiniciando la conexión.',
  invalidBot: 'Revisa los textos. La respuesta de !web debe incluir {url}.', unavailable: 'No se pudieron guardar los cambios.',
  action: 'Acción', defaults: 'Respuesta predeterminada', edit: 'Respuesta personalizada',
  noticeAction: 'Aviso (10, 5 y 1 minuto)', followAction: 'Falta seguir al canal', joinFirstAction: 'Viewer sin registrar',
  noEncounterAction: 'Sin encuentro', noBallsAction: 'Sin bolas', invalidBallAction: 'Bola inválida',
  alreadyCaughtAction: 'Captura no disponible', escapedAction: 'El Pokémon escapó', webAction: 'Comando !web',
  automaticEvolutionAction: 'Evoluciones automáticas', catchSuccessAction: 'Captura exitosa en chat',
  summonOtherChannelAction: 'Compañero activo en otro chat',
  invalidSettings: 'Revisa los valores de la configuración.', creature: 'Criatura', command: 'Comando o mensaje', encounter: 'Encuentro', companions: 'Compañeros'
})
Object.assign(labels.en, {
  language: 'Language', gameTab: 'Game', previewTab: 'Testing', botTab: 'Bot', connectionsTab: 'Connections',
  linkKick: 'Link Kick in the portal', connectTwitch: 'Connect Twitch', twitchReady: 'Chat connected', twitchDisconnected: 'Chat not connected',
  connectKick: 'Connect Kick', kickStatus: 'Chat not connected', kickPairing: 'Finish the authorization you have already started.', kickAuthorize: 'Authorize your channel in Kick, then return to the app.',
  mode: 'Mode', demoMode: 'Local demo', clientId: 'Twitch Client ID', webUrl: 'Portal URL',
  nickname: 'Bot nickname', advanced: 'Advanced settings', clientHint: 'Public identifier for the Twitch application. Use the included value to sign in with your account.', resetReply: 'Reset',
  botHelp: 'Default messages follow the app language. Your edits stay as written. To send both languages, enter both phrases in the same field, separated by “|”. Leave a field empty to disable it. Keep {url} in !web and use {min} and {unidad} in countdowns.',
  saved: 'Changes saved.', invalidSetup: 'Check the Client ID or HTTPS URL.', restarting: 'Reconnecting the app.',
  invalidBot: 'Check the messages. The !web reply must include {url}.', unavailable: 'Could not save the changes.',
  action: 'Action', defaults: 'Default reply', edit: 'Custom reply',
  noticeAction: 'Countdown (10, 5 and 1 minute)', followAction: 'Must follow the channel', joinFirstAction: 'Viewer not registered',
  noEncounterAction: 'No encounter', noBallsAction: 'Out of balls', invalidBallAction: 'Invalid ball',
  alreadyCaughtAction: 'Catch unavailable', escapedAction: 'Pokémon escaped', webAction: '!web command',
  automaticEvolutionAction: 'Automatic evolutions', catchSuccessAction: 'Successful catch in chat',
  summonOtherChannelAction: 'Companion active in another chat',
  invalidSettings: 'Check the settings values.', creature: 'Creature', command: 'Command or message', encounter: 'Encounter', companions: 'Companions'
})

Object.assign(labels.es, { obsTitle: 'Fuentes de navegador para OBS', obsHelp: 'Añade una fuente de navegador por cada enlace. Para compañeros usa 1920 × 1080.',
  obsEncounter: 'Encuentros salvajes', obsCompanions: 'Compañeros invocados', obsCopy: 'Copiar enlace', obsCopied: 'Enlace copiado.', obsCopyError: 'Selecciona el enlace y cópialo manualmente.' })
Object.assign(labels.en, { obsTitle: 'OBS browser sources', obsHelp: 'Add one browser source per link. Set the companions source to 1920 × 1080.',
  obsEncounter: 'Wild encounters', obsCompanions: 'Summoned companions', obsCopy: 'Copy link', obsCopied: 'Link copied.', obsCopyError: 'Select the link and copy it manually.' })

Object.assign(labels.es, { summonXpPerSecond: 'XP por segundo invocado', battleXpPerOpponent: 'XP de victoria por rival' })
Object.assign(labels.en, { summonXpPerSecond: 'Summon XP per second', battleXpPerOpponent: 'Victory XP per opponent' })
Object.assign(labels.es, { battleEveryEncounters: 'Salvajes por batalla (0 = manual)', startBattle: 'Iniciar batalla', battleNeedsPlayers: 'Necesitas dos compañeros activos.', battleUnavailable: 'Inicia el juego y espera a que termine la batalla anterior.', battleStarted: 'Batalla iniciada.' })
Object.assign(labels.en, { battleEveryEncounters: 'Wild encounters per battle (0 = manual)', startBattle: 'Start battle', battleNeedsPlayers: 'At least two companions must be active.', battleUnavailable: 'Start the game and wait for the current battle to finish.', battleStarted: 'Battle started.' })

Object.assign(labels.es, { battleEnabled: 'Batallas', battleOff: 'Deshabilitadas', battleOn: 'Habilitadas', battleHpMultiplier: 'Multiplicador de PS', battleUnavailable: 'Habilita las batallas, inicia el juego y espera a que termine la ronda anterior.' })
Object.assign(labels.en, { battleEnabled: 'Battles', battleOff: 'Disabled', battleOn: 'Enabled', battleHpMultiplier: 'HP multiplier', battleUnavailable: 'Enable battles, start the game, and wait for the previous round to finish.' })

Object.assign(labels.es, { queueLegendary: 'Programar próximo legendario', queuedLegendary: 'Próximo legendario', demoMaster: 'Dar Master Ball de prueba', candyUsed: 'Caramelo usado. El Pokémon subió un nivel.', noCandy: 'No tienes Caramelos Raros.', candyMaxLevel: 'Ese Pokémon alcanzó el nivel máximo.' })
Object.assign(labels.en, { queueLegendary: 'Queue next legendary encounter', queuedLegendary: 'Next legendary', demoMaster: 'Give test Master Ball', candyUsed: 'Candy used. The Pokémon gained a level.', noCandy: 'You have no Rare Candies.', candyMaxLevel: 'That Pokémon is already at the level cap.' })

Object.assign(labels.es, { shopTab: 'Tienda', shopPricesHelp: 'Edita los precios en Pokédólares. Se publican en la siguiente conexión de la tienda con el juego activo.', publishShopPrices: 'Guardar y publicar precios', shopPricesSaved: 'Precios guardados. Se publicarán en la próxima sincronización de la tienda.' })
Object.assign(labels.en, { shopTab: 'Shop', shopPricesHelp: 'Edit prices in Pokédollars. They go live on the next shop sync while the game is running.', publishShopPrices: 'Save and publish prices', shopPricesSaved: 'Prices saved. They will go live on the next shop sync.' })

Object.assign(labels.es, { homeTab: 'Inicio', sourcesTab: 'Fuentes', next: 'Próximo encuentro', wildCount: 'Encuentros de esta sesión', caughtCount: 'Capturas de esta sesión',
  encounterSettings: 'Encuentros salvajes', companionSettings: 'Compañeros en pantalla', battleSettings: 'Batallas', interval: 'Cada cuántos minutos aparece un salvaje', duration: 'Minutos para capturar', catchGraceSeconds: 'Margen por retraso (s)',
  nameLimit: 'Ocultar nombres a partir de', visibleLimit: 'Compañeros visibles', battleEveryEncounters: 'Encuentros entre batallas', previewEncounter: 'Probar encuentro salvaje', previewLocal: 'Simular en la app', spawn: 'Lanzar en directo',
  obsTitle: 'Fuentes de navegador', obsHelp: 'Copia cada enlace a una fuente de navegador en OBS, Streamlabs o tu programa de directo. Usa 1920 × 1080 para la fuente de compañeros y batallas.',
  connectionHelp: 'Conecta Twitch primero para activar tu comunidad. Después puedes añadir Kick. El portal de viewers se configura automáticamente.', connected: 'Conectado', disconnected: 'Desconectado', editBotReplies: 'Personalizar respuestas del chat' })
Object.assign(labels.en, { homeTab: 'Home', sourcesTab: 'Sources', next: 'Next encounter', wildCount: 'Encounters this session', caughtCount: 'Catches this session',
  encounterSettings: 'Wild encounters', companionSettings: 'On-screen companions', battleSettings: 'Battles', interval: 'Minutes between wild encounters', duration: 'Minutes to catch', catchGraceSeconds: 'Stream delay grace (s)',
  nameLimit: 'Hide names above this count', visibleLimit: 'Visible companions', battleEveryEncounters: 'Encounters between battles', previewEncounter: 'Wild encounter preview', previewLocal: 'Simulate in app', spawn: 'Spawn on stream',
  obsTitle: 'Browser sources', obsHelp: 'Copy each link into a browser source in OBS, Streamlabs, or your streaming software. Set the companions and battles source to 1920 × 1080.',
  connectionHelp: 'Connect Twitch first to activate your community. Then you can add Kick. The viewer portal is set automatically.', connected: 'Connected', disconnected: 'Disconnected', editBotReplies: 'Customize chat replies' })

const tips = {
  encounterSettings: ['Controla cuándo aparecen salvajes y cuánto duran.', 'Controls when wild Pokémon appear and how long they stay.'],
  companionSettings: ['Ajusta la escala, las etiquetas y la XP de las invocaciones.', 'Adjusts summon size, labels, and XP.'],
  battleSettings: ['Las batallas usan la misma fuente que las invocaciones.', 'Battles use the same source as summoned companions.'],
  interval: ['Tiempo entre apariciones automáticas.', 'Time between automatic wild spawns.'],
  duration: ['Tiempo visible para intentar capturar un salvaje normal.', 'How long a normal wild encounter is visible for catches.'],
  catchGraceSeconds: ['Segundos extra para capturar después de que desaparece el retrato.', 'Extra seconds to catch after the portrait disappears.'],
  shiny: ['1 entre este número de apariciones, si existe variante shiny.', 'One in this many encounters, when a shiny variant exists.'],
  duplicateMode: ['Premio si el viewer vuelve a capturar una variante que ya tiene.', 'Reward for catching a variant the viewer already owns.'],
  duplicateXpPercent: ['Solo en modo XP. Porcentaje de lo que cuesta subir un nivel.', 'XP mode only. Percentage of the XP needed for one level.'],
  spriteScale: ['Escala general de los compañeros en la fuente.', 'Overall companion size in the browser source.'],
  nameLimit: ['Oculta las etiquetas cuando hay más compañeros que este número.', 'Hides name labels when more companions are on screen than this number.'],
  visibleLimit: ['Máximo a la vez. Tienen prioridad las invocaciones recientes.', 'Maximum at once. Most recent summons appear first.'],
  summonXpPerSecond: ['XP por segundo de invocación activa.', 'XP per second while summoned and active.'],
  battleXpPerOpponent: ['El Pokémon ganador recibe esta XP por cada rival.', 'The winner receives this much XP for each opponent.'],
  battleEveryEncounters: ['Intenta iniciar tras este número de encuentros si hay dos compañeros. Usa 0 para inicio manual.', 'Tries to start after this many encounters with two companions. Use 0 for manual only.'],
  battleEnabled: ['Habilita el inicio manual y la programación de batallas.', 'Enables manual and scheduled battles.'],
  battleHpMultiplier: ['Multiplica los PS iniciales de todos los participantes.', 'Multiplies starting HP for all fighters.'],
  gameToggle: ['Activa encuentros automáticos y comandos del chat. Al detenerlo se limpian los overlays.', 'Enables automatic encounters and gameplay chat. Stopping clears the overlays.'],
  previewLocal: ['Solo aparece en este panel. No modifica el directo ni el progreso.', 'Only shown in this panel. Does not affect the stream or progress.'],
  obsTitle: ['Encuentros muestra el retrato y el reloj. Compañeros también muestra las batallas.', 'Encounters shows the portrait and timer. Companions also shows battles.'],
  connectionsTab: ['En verde cuando la app tiene acceso al chat del canal vinculado.', 'Green when the app has a live chat connection to the linked channel.'],
  botTab: ['Puedes editar las respuestas sin cambiar los comandos del chat.', 'Edit bot replies without changing chat commands.'],
  shopTab: ['Cada comunidad tiene su propio precio y saldo.', 'Prices and balances are separate for each community.']
}

Object.assign(labels.es, { totalEncounters: 'Encuentros históricos', totalCaptures: 'Capturas históricas', clearStatistics: 'Borrar estadísticas',
  confirmStatistics: '¿Poner a cero los contadores de Inicio? Tus Pokémon y el progreso de los viewers se conservan.', statisticsCleared: 'Estadísticas borradas.' })
Object.assign(labels.en, { totalEncounters: 'All-time encounters', totalCaptures: 'All-time catches', clearStatistics: 'Clear statistics',
  confirmStatistics: 'Reset the Home counters? Your Pokémon and viewer progress will be kept.', statisticsCleared: 'Statistics cleared.' })

labels.es.openPortal = 'Abrir portal web'
labels.en.openPortal = 'Open web portal'

function showPane(name) {
  for (const pane of document.querySelectorAll('[data-pane]')) pane.hidden = pane.dataset.pane !== name
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-pressed', String(button.dataset.view === name))
  }
}

function loadBotEditor(bot) {
  const form = $('bot-form')
  form.elements.nickname.value = bot.nickname
  for (const action of botActions) {
    const row = document.createElement('div')
    row.className = 'bot-row'
    const name = document.createElement('label')
    name.htmlFor = 'reply-' + action
    name.dataset.copy = action + 'Action'
    const defaultText = document.createElement('small')
    defaultText.dataset.defaultFor = action
    const input = document.createElement('input')
    input.id = name.htmlFor
    input.name = action
    input.maxLength = 300
    input.dataset.custom = String(Object.hasOwn(bot.responses, action))
    input.value = bot.responses[action] ?? botCopy[bot.language][action]
    input.addEventListener('input', () => { input.dataset.custom = 'true' })
    const reset = document.createElement('button')
    reset.type = 'button'
    reset.dataset.copy = 'resetReply'
    reset.addEventListener('click', () => {
      input.dataset.custom = 'false'
      input.value = botCopy[$('language').value][action]
    })
    const controls = document.createElement('div')
    controls.className = 'reply-controls'
    controls.append(input, reset)
    row.append(name, defaultText, controls)
    $('bot-responses').append(row)
  }
}

const remaining = time => {
  const seconds = Math.max(0, Math.ceil((time - Date.now()) / 1000))
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
}

function renderUpdateStatus() {
  if (!state?.updateStatus) return
  const copy = aboutCopy[$('language').value]
  const { status, version } = state.updateStatus
  $('app-version').textContent = state.version
  $('update-status').textContent = (copy[status] ?? '') + (version ? ' · ' + version : '')
  $('check-updates').disabled = status === 'checking'
  $('view-releases').hidden = status !== 'available'
}
let viewer = 'Demo'
let state
let lastEncounter
let settingsLoaded = false
let setupLoaded = false
let translateLab
const catalog = (await (await fetch('/catalog')).json()).species
if (panel) {
  for (const [id, product] of Object.entries(shopItems)) {
    const label = document.createElement('label')
    const name = document.createElement('span')
    name.dataset.shopItem = id
    const icon = document.createElement('img')
    icon.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/' + (product.icon ?? id) + '.png'
    icon.width = 30
    icon.height = 30
    icon.loading = 'lazy'
    icon.alt = ''
    const input = document.createElement('input')
    Object.assign(input, { name: id, type: 'number', min: '1', max: '100000', required: true, value: product.price })
    const heading = document.createElement('span')
    heading.className = 'shop-item-name'
    heading.append(icon, name)
    label.append(heading, input)
    $('shop-price-fields').append(label)
  }
  const legendary = $('legendary-event')
  for (const entry of catalog.filter(item => item.legendary && item.wildEligible)) {
    legendary.elements.creature.add(new Option(entry.name, entry.name))
  }
  legendary.hidden = !legendary.elements.creature.options.length
  for (const form of ['spawn', 'summon-preview']) {
    const select = $(form).elements.namedItem('creature')
    for (const entry of catalog) if (form !== 'spawn' || entry.wildEligible) select.add(new Option(entry.name, entry.name))
  }
  let preview
  let encounterPreview
  $('preview-encounter').addEventListener('click', () => {
    const name = $('spawn').elements.creature.value
    if (name) encounterPreview = { id: 'preview:' + Date.now(), name, level: 1, endsAt: Date.now() + 12_000 }
  })
  let previewLayer = 0
  const testForm = $('summon-preview')
  const updateShiny = () => {
    const entry = catalog.find(item => item.name === testForm.elements.creature.value)
    testForm.elements.shiny.disabled = !entry?.shiny
    if (!entry?.shiny) testForm.elements.shiny.checked = false
  }
  testForm.elements.creature.addEventListener('change', updateShiny)
  updateShiny()
  testForm.addEventListener('submit', event => {
    event.preventDefault()
    const key = testForm.elements.creature.value + (testForm.elements.shiny.checked ? ' ✦' : '')
    preview = {
      Preview: { active: { key, expires: Infinity, layer: ++previewLayer }, collection: { [key]: 0 } }
    }
  })
  $('clear-preview').addEventListener('click', () => { preview = undefined })
  $('sprite-scale').addEventListener('input', updateScaleLabel)
  for (const kind of ['encounter', 'companions']) {
    showScene($(kind), kind, catalog, () => state && ({
      ...state,
      encounter: kind === 'encounter' && encounterPreview?.endsAt > Date.now() ? encounterPreview : state.encounter,
      config: { ...state.config, spriteScale: Number($('sprite-scale').value) },
      viewers: kind === 'companions' && preview ? preview : state.viewers
    }), remaining)
  }
} else {
  document.getElementById('overlay').hidden = false
  showScene(document.getElementById('overlay'), location.pathname.slice(1), catalog, () => state, remaining)
}
function updateScaleLabel() {
  document.getElementById('sprite-scale-value').value = document.getElementById('sprite-scale').value + '%'
}
function connectionMessage(message) {
  if (!message || $('language').value !== 'en') return message
  return message
    .replace('Twitch: conectado como ', 'Twitch: connected as ')
    .replace('Twitch: esperando autorización', 'Twitch: waiting for authorization')
    .replace('Twitch: reconectando', 'Twitch: reconnecting')
    .replace('Twitch: código ', 'Twitch: code ')
    .replace('Kick · reconectando', 'Kick · reconnecting')
    .replace('Sincronización al día', 'Sync up to date')
    .replace('Hay cambios pendientes', 'Changes pending')
    .replace('Cambios pendientes de sincronizar', 'Changes pending sync')
}

async function refresh() {
  const response = await fetch(panel ? '/state' : '/state?overlay=' + location.pathname.slice(1))
  state = await response.json()
  if (!panel) {
    if (location.pathname === '/encounter') {
      const encounter = state.encounter
      const id = encounter?.id ?? encounter?.endsAt ?? null
      if (lastEncounter !== undefined && id !== lastEncounter && encounter?.shiny && encounter.endsAt > Date.now()) {
        const cue = new Audio('/sfx/shiny.wav')
        cue.volume = .55
        cue.play().catch(error => console.warn('Could not play shiny cue', error))
      }
      lastEncounter = id
    }
    return
  }
  $('connection').textContent = connectionMessage(state.syncStatus) || ''
  $('chat').closest('section').hidden = state.live || !state.battleLab
  if (!setupLoaded && state.setup) {
    setupLoaded = true
    const form = document.getElementById('startup-form')
    for (const [field, value] of Object.entries(state.setup)) {
      const input = form.elements.namedItem(field)
      if (input) input.value = value
    }
    try {
      const { mountBattleLab } = await import('/dev/battle-ui.js')
      translateLab = mountBattleLab({ catalog, mount: $('battle-preview-mount'), language: () => $('language').value })
    } catch (error) {
      console.warn('Battle preview unavailable', error)
    }
    if (state.bot) {
      $('language').value = state.bot.language
      loadBotEditor(state.bot)
    }
    translate()
  }
  if (!settingsLoaded) {
    for (const [id, price] of Object.entries(state.config.shopPrices ?? {})) $('shop-prices').elements.namedItem(id).value = price
    for (const [name, value] of Object.entries(state.config)) {
      const field = document.getElementById("settings").elements.namedItem(name)
      if (field) field.value = value
    }
    updateScaleLabel()
    settingsLoaded = true
  }
  const copy = labels[$('language').value]
  $('legendary-status').textContent = state.nextLegendary ? copy.queuedLegendary + ' · ' + state.nextLegendary : ''
  $('demo-master').hidden = !state.battleLab || state.live
  $('twitch-card-status').textContent = connectionMessage(state.twitchStatus) || copy.twitchDisconnected
  $('kick-card-status').textContent = connectionMessage(state.kickStatus) || copy.kickStatus
  for (const [provider, name] of [['twitch', 'Twitch'], ['kick', 'Kick']]) {
    const chip = $('status-' + provider)
    chip.dataset.connected = String(state[provider + 'Connected'])
    chip.setAttribute('aria-label', name + ' · ' + copy[state[provider + 'Connected'] ? 'connected' : 'disconnected'])
    chip.title = chip.getAttribute('aria-label')
  }
  const running = state.config.running !== false
  const english = $('language').value === 'en'
  const toggle = $('game-toggle')
  toggle.dataset.running = String(running)
  toggle.textContent = running ? (english ? 'Stop game' : 'Detener juego') : (english ? 'Start game' : 'Iniciar juego')
  toggle.disabled = toggle.dataset.pending === 'true'
  $('spawn').querySelector('button').disabled = !running
  $('game-status').textContent = running
    ? (english ? 'Game active. Stopping ends current encounters and summons.' : 'Juego activo. Detenerlo termina el encuentro y las invocaciones actuales.')
    : (english ? 'Game stopped. Your connected accounts stay linked.' : 'Juego detenido. Las cuentas siguen vinculadas.')
  $('next').textContent = running ? remaining(state.nextAt) : '—'
  $('wild-count').textContent = state.encounterCount
  $('caught-count').textContent = state.captureCount
  $('total-encounters').textContent = state.statistics.encounters
  $('total-captures').textContent = state.statistics.captures
  renderUpdateStatus()
  $('start-battle').hidden = !state.config.battleEnabled || !running
  $('notice').textContent = copy[state.notice] || botCopy[$('language').value][state.notice]?.replace(/\{\w+\}/g, '…') || ''
  const data = state.viewers[viewer]
  $('inventory').textContent = data ? [
    Object.entries(data.balls).map(([name, count]) => name + ' ×' + count).join(' · '),
    ...Object.entries(data.collection).map(([name, xp]) => name + ' · Lv. ' + level(xp))
  ].join('\n') : ''
}
if (panel) {
  $('panel').hidden = false
  $('start-battle').addEventListener('click', async event => {
    const button = event.currentTarget
    const copy = labels[$('language').value]
    button.disabled = true
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startCommunityBattle: true }) })
      $('battle-status').textContent = response.ok ? copy.battleStarted : response.status === 422 ? copy.battleNeedsPlayers : copy.battleUnavailable
    } catch {
      $('battle-status').textContent = copy.battleUnavailable
    } finally { button.disabled = false }
  })
  $('game-toggle').addEventListener('click', async event => {
    const button = event.currentTarget
    button.dataset.pending = 'true'
    button.disabled = true
    try {
      const response = await fetch('/demo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ running: button.dataset.running !== 'true' })
      })
      if (!response.ok) throw new Error('Could not change game status')
      await refresh()
    } catch {
      $('notice').textContent = $('language').value === 'en' ? 'Could not change game status.' : 'No se pudo cambiar el estado del juego.'
    } finally {
      delete button.dataset.pending
      button.disabled = false
    }
  })
  showPane('home')
  $('check-updates').addEventListener('click', async () => {
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checkUpdates: true }) })
      if (!response.ok) throw new Error('Could not check updates')
      await refresh()
    } catch { $('update-status').textContent = aboutCopy[$('language').value].unavailable }
  })
  for (const button of document.querySelectorAll('[data-project-link]')) button.addEventListener('click', async () => {
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectLink: button.dataset.projectLink }) })
      if (!response.ok) throw new Error('Could not open link')
    } catch { $('about-link-status').textContent = labels[$('language').value].unavailable }
  })
  $('open-portal').addEventListener('click', async () => {
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openPortal: true }) })
      if (!response.ok) throw new Error('Could not open portal')
      $('portal-status').textContent = ''
    } catch { $('portal-status').textContent = labels[$('language').value].unavailable }
  })
  $('clear-statistics').addEventListener('click', async event => {
    const button = event.currentTarget
    const copy = labels[$('language').value]
    if (!window.confirm(copy.confirmStatistics)) return
    button.disabled = true
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearStatistics: true }) })
      if (!response.ok) throw new Error('Could not clear statistics')
      await refresh()
      $('statistics-status').textContent = copy.statisticsCleared
    } catch { $('statistics-status').textContent = copy.unavailable }
    finally { button.disabled = false }
  })
  for (const provider of ['twitch', 'kick']) $('status-' + provider).addEventListener('click', () => showPane('connections'))
  for (const button of document.querySelectorAll('[data-view]')) {
    button.addEventListener('click', () => showPane(button.dataset.view))
  }
}
function translate() {
  for (const element of document.querySelectorAll('[data-about]')) element.textContent = aboutCopy[$('language').value][element.dataset.about]
  renderUpdateStatus()
  for (const item of document.querySelectorAll('[data-shop-item]')) {
    item.textContent = shopItems[item.dataset.shopItem].names[Number($('language').value === 'en')]
  }
  translateLab?.()
  document.documentElement.lang = $('language').value
  const copy = labels[$('language').value]
  for (const item of document.querySelectorAll('[data-copy]')) item.textContent =
    copy[item.dataset.copy] ?? item.dataset.copy.replace(/Action$/, '')
  const helpLanguage = Number($('language').value === 'en')
  const targets = [...document.querySelectorAll('#settings label > [data-copy], h2[data-copy], .connection-strip > strong')]
  for (const target of targets) {
    const tip = tips[target.dataset.copy]?.[helpLanguage]
    if (!tip) continue
    const hint = document.createElement('span')
    hint.className = 'help-tip'
    hint.tabIndex = 0
    hint.setAttribute('aria-label', tip)
    hint.dataset.tip = tip
    hint.textContent = 'i'
    target.append(' ', hint)
  }
  $('game-toggle').title = tips.gameToggle[helpLanguage]
  $('preview-encounter').title = tips.previewLocal[helpLanguage]
  for (const item of document.querySelectorAll('[data-aria]')) item.setAttribute('aria-label', copy[item.dataset.aria])
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === $('language').value))
  }
  for (const item of document.querySelectorAll('[data-default-for]')) {
    const key = item.dataset.defaultFor
    const fallback = botCopy[$('language').value][key]
    item.textContent = copy.defaults + ' · ' + fallback
    const input = $('bot-form').elements.namedItem(key)
    if (input.dataset.custom === 'false') input.value = fallback
  }
}

if (panel) {
  $('shop-prices').addEventListener('submit', async event => {
    event.preventDefault()
    const copy = labels[$('language').value]
    const prices = Object.fromEntries([...new FormData(event.currentTarget)].map(([id, price]) => [id, Number(price)]))
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopPrices: prices }) })
      $('shop-price-status').textContent = response.ok ? copy.shopPricesSaved : copy.invalidSettings
    } catch { $('shop-price-status').textContent = copy.invalidSettings }
  })
  const buttons = [...document.querySelectorAll('[data-lang]')]
  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const language = button.dataset.lang
      for (const option of buttons) option.disabled = true
      try {
        const result = await fetch('/demo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language })
        })
        if (!result.ok) throw new Error('Language not saved')
        $('language').value = language
        $('language-status').textContent = ''
        translate()
      } catch {
        $('language-status').textContent = labels[$('language').value].unavailable
      } finally {
        for (const option of buttons) option.disabled = false
      }
    })
  }
  translate()
  for (const [path, name] of [['/encounter', 'obsEncounter'], ['/companions', 'obsCompanions']]) {
    const row = document.createElement('section')
    const label = document.createElement('label')
    const title = document.createElement('strong')
    title.dataset.copy = name
    const address = document.createElement('input')
    address.readOnly = true
    address.value = location.origin + path
    label.append(title, address)
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.copy = 'obsCopy'
    button.addEventListener('click', async () => {
      const copy = labels[$('language').value]
      try {
        await navigator.clipboard.writeText(address.value)
        $('obs-status').textContent = copy.obsCopied
      } catch {
        address.focus()
        address.select()
        $('obs-status').textContent = copy.obsCopyError
      }
    })
    row.append(label, button)
    $('sources').append(row)
  }
  translate()
  $('connect-kick').addEventListener('click', async () => {
    const copy = labels[$('language').value]
    try {
      const response = await fetch('/demo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ connectKick: true })
      })
      if (response.status === 409) { $('setup-status').textContent = copy.kickPairing; return }
      if (!response.ok) throw new Error('Could not open accounts')
      $('setup-status').textContent = copy.kickAuthorize
    } catch {
      $('setup-status').textContent = copy.unavailable
    }
  })
  $('startup-form').addEventListener('submit', async event => {
    event.preventDefault()
    const setup = Object.fromEntries(new FormData(event.target))
    const platform = event.submitter?.value
    if (platform) setup.platform = platform
    for (const key of Object.keys(setup)) setup[key] = setup[key].trim()
    const status = $('setup-status')
    try {
      const result = await fetch('/demo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setup, connectTwitch: platform === 'twitch' })
      })
      if (result.status === 409) { status.textContent = labels[$('language').value].kickPairing; return }
      if (result.ok) event.target.elements.platform.value = setup.platform
      status.textContent = result.ok ? labels[document.getElementById('language').value].saved : labels[document.getElementById('language').value].invalidSetup
    } catch {
      status.textContent = labels[document.getElementById('language').value].restarting
    }
  })
  $('bot-form').addEventListener('submit', async event => {
    event.preventDefault()
    const form = event.target
    const bot = { nickname: form.elements.nickname.value, responses: {} }
    for (const key of botActions) {
      const input = form.elements.namedItem(key)
      if (input.dataset.custom === 'true') bot.responses[key] = input.value
    }
    const copy = labels[$('language').value]
    try {
      const result = await fetch('/demo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bot })
      })
      $('bot-status').textContent = result.ok ? copy.saved : copy.invalidBot
    } catch {
      $('bot-status').textContent = copy.unavailable
    }
  })
  $('demo-master').addEventListener('click', async () => {
    const id = $('chat').elements.viewer.value
    viewer = id
    const result = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ demoMasterBall: id }) })
    if (result.ok) await refresh()
    else $('notice').textContent = labels[$('language').value].joinFirst
  })
  for (const id of ['settings', 'spawn', 'chat', 'legendary-event']) {
    $(id).addEventListener('submit', async event => {
      event.preventDefault()
      const form = Object.fromEntries(new FormData(event.target))
      const action = id === 'settings' ? { config: Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)])) } :
        id === 'spawn' ? { spawn: form.creature } : id === 'legendary-event' ? { queueLegendary: form.creature } : form
      if (id === 'chat') viewer = form.viewer
      const result = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) })
      const copy = labels[$('language').value]
      if (result.ok) await refresh()
      if (id === 'settings') $('settings-status').textContent = result.ok ? copy.saved : copy.invalidSettings
      else if (!result.ok) $(id === 'chat' ? 'notice' : 'legendary-status').textContent = copy.invalidSettings
    })
  }
}
async function update() {
  try {
    await refresh()
  } finally {
    setTimeout(update, !panel && state?.battle && !state.battle.over ? 100 : 500)
  }
}
update()
