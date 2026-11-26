import { botCopy } from './bot-copy.js'
import { level, showScene } from './sprites.js?v=blue-xp'
import { captureCategories } from '/ui/capture-rates.js'
import { maxShopPrice, shopItems } from '/ui/shop.js'
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
  advanced: 'Configuración avanzada', clientHint: 'Identificador público de la aplicación de Twitch. El valor incluido funciona para iniciar sesión con tu cuenta.', resetReply: 'Restaurar',
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
  advanced: 'Advanced settings', clientHint: 'Public identifier for the Twitch application. Use the included value to sign in with your account.', resetReply: 'Reset',
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

Object.assign(labels.es, { obsTitle: 'Fuentes de navegador para OBS', obsHelp: 'Añade una fuente de navegador por cada enlace. Para compañeros usa 1920 × 550.',
  obsEncounter: 'Encuentros salvajes', obsCompanions: 'Compañeros invocados', obsCopy: 'Copiar enlace', obsCopied: 'Enlace copiado.', obsCopyError: 'Selecciona el enlace y cópialo manualmente.' })
Object.assign(labels.en, { obsTitle: 'OBS browser sources', obsHelp: 'Add one browser source per link. Set the companions source to 1920 × 550.',
  obsEncounter: 'Wild encounters', obsCompanions: 'Summoned companions', obsCopy: 'Copy link', obsCopied: 'Link copied.', obsCopyError: 'Select the link and copy it manually.' })

Object.assign(labels.es, { summonMoneyPerMinute: 'Pokédólares por minuto invocado', summonXpPerSecond: 'XP por segundo invocado', battleXpPerOpponent: 'XP de victoria por rival' })
Object.assign(labels.en, { summonMoneyPerMinute: 'Pokédollars per summon minute', summonXpPerSecond: 'Summon XP per second', battleXpPerOpponent: 'Victory XP per opponent' })
Object.assign(labels.es, { battleEveryEncounters: 'Salvajes por batalla (0 = manual)', startBattle: 'Iniciar batalla', battleNeedsPlayers: 'Necesitas dos compañeros activos.', battleUnavailable: 'Inicia el juego y espera a que termine la batalla anterior.', battleStarted: 'Batalla programada. Se esperará a que termine cualquier encuentro activo.' })
Object.assign(labels.en, { battleEveryEncounters: 'Wild encounters per battle (0 = manual)', startBattle: 'Start battle', battleNeedsPlayers: 'At least two companions must be active.', battleUnavailable: 'Start the game and wait for the current battle to finish.', battleStarted: 'Battle queued. Any active encounter will finish first.' })

Object.assign(labels.es, { battleEnabled: 'Batallas', battleOff: 'Deshabilitadas', battleOn: 'Habilitadas', battleHpMultiplier: 'Multiplicador de PS', battleMoneyPerWin: 'Pokédólares por victoria', battleUnavailable: 'Habilita las batallas, inicia el juego y espera a que termine la ronda anterior.' })
Object.assign(labels.en, { battleEnabled: 'Battles', battleOff: 'Disabled', battleOn: 'Enabled', battleHpMultiplier: 'HP multiplier', battleMoneyPerWin: 'Pokédollars per win', battleUnavailable: 'Enable battles, start the game, and wait for the previous round to finish.' })

Object.assign(labels.es, { queueLegendary: 'Programar próxima aparición especial', queuedLegendary: 'Próxima aparición especial', demoMaster: 'Dar Master Ball de prueba', candyUsed: 'Caramelo usado. El Pokémon subió un nivel.', noCandy: 'No tienes Caramelos Raros.', candyMaxLevel: 'Ese Pokémon alcanzó el nivel máximo.' })
Object.assign(labels.en, { queueLegendary: 'Queue next special encounter', queuedLegendary: 'Next special encounter', demoMaster: 'Give test Master Ball', candyUsed: 'Candy used. The Pokémon gained a level.', noCandy: 'You have no Rare Candies.', candyMaxLevel: 'That Pokémon is already at the level cap.' })

Object.assign(labels.es, { botAnnounceInChat: 'Mostrar avisos automáticos en el chat', botCaptureInChat: 'Mostrar capturas en el chat', botActionInChat: 'Mostrar respuestas a acciones en el chat', botAnnouncementHelp: 'Los avisos siguen apareciendo en En directo del portal.' })
Object.assign(labels.en, { botAnnounceInChat: 'Show automatic announcements in chat', botCaptureInChat: 'Show catches in chat', botActionInChat: 'Show action replies in chat', botAnnouncementHelp: 'Announcements still appear in the portal’s Live tab.' })
Object.assign(labels.es, { captureTab: 'Captura', captureDifficulty: 'Dificultad', captureGreatBall: 'Super Ball',
  captureHelp: 'Ajusta los porcentajes por lanzamiento para tu comunidad. La Master Ball mantiene el 100 %.',
  captureDefaults: 'Cargar valores iniciales', captureSaved: 'Porcentajes guardados.' })
Object.assign(labels.en, { captureTab: 'Capture', captureDifficulty: 'Difficulty', captureGreatBall: 'Great Ball',
  captureHelp: 'Set the percentage per throw for your community. The Master Ball always catches.',
  captureDefaults: 'Load defaults', captureSaved: 'Capture rates saved.' })
Object.assign(labels.es, { shopTab: 'Tienda', shopPricesHelp: 'Edita los precios en Pokédólares. Se publican en la siguiente conexión de la tienda con el juego activo.', publishShopPrices: 'Guardar y publicar precios', shopPricesSaved: 'Precios guardados. Se publicarán en la próxima sincronización de la tienda.' })
Object.assign(labels.en, { shopTab: 'Shop', shopPricesHelp: 'Edit prices in Pokédollars. They go live on the next shop sync while the game is running.', publishShopPrices: 'Save and publish prices', shopPricesSaved: 'Prices saved. They will go live on the next shop sync.' })

Object.assign(labels.es, { homeTab: 'Inicio', sourcesTab: 'Fuentes', next: 'Próximo encuentro', wildCount: 'Encuentros de esta sesión', caughtCount: 'Capturas de esta sesión',
  encounterSettings: 'Encuentros salvajes', companionSettings: 'Compañeros en pantalla', battleSettings: 'Batallas', interval: 'Cada cuántos minutos aparece un salvaje', duration: 'Minutos para capturar', catchGraceSeconds: 'Margen por retraso (s)',
  nameLimit: 'Ocultar nombres a partir de', visibleLimit: 'Compañeros visibles', battleEveryEncounters: 'Encuentros entre batallas', previewEncounter: 'Probar encuentro salvaje', previewLocal: 'Simular en la app', spawn: 'Lanzar en directo',
  obsTitle: 'Fuentes de navegador', obsHelp: 'Copia cada enlace a una fuente de navegador en OBS, Streamlabs o tu programa de directo. Usa 1920 × 550 para compañeros y batallas. Redimensiona la fuente en la escena desde una esquina para mantener la proporción.',
  connectionHelp: 'Conecta Twitch primero para activar tu comunidad. Después puedes añadir Kick. El portal de viewers se configura automáticamente.', connected: 'Conectado', disconnected: 'Desconectado', editBotReplies: 'Personalizar respuestas del chat' })
Object.assign(labels.en, { homeTab: 'Home', sourcesTab: 'Sources', next: 'Next encounter', wildCount: 'Encounters this session', caughtCount: 'Catches this session',
  encounterSettings: 'Wild encounters', companionSettings: 'On-screen companions', battleSettings: 'Battles', interval: 'Minutes between wild encounters', duration: 'Minutes to catch', catchGraceSeconds: 'Stream delay grace (s)',
  nameLimit: 'Hide names above this count', visibleLimit: 'Visible companions', battleEveryEncounters: 'Encounters between battles', previewEncounter: 'Wild encounter preview', previewLocal: 'Simulate in app', spawn: 'Spawn on stream',
  obsTitle: 'Browser sources', obsHelp: 'Copy each link into a browser source in OBS, Streamlabs, or your streaming software. Set the companion and battle source to 1920 × 550. Resize it from a corner in your scene to keep its proportions.',
  connectionHelp: 'Connect Twitch first to activate your community. Then you can add Kick. The viewer portal is set automatically.', connected: 'Connected', disconnected: 'Disconnected', editBotReplies: 'Customize chat replies' })

const tips = {
  encounterSettings: ['Controla cuándo aparecen salvajes y cuánto duran.', 'Controls when wild Pokémon appear and how long they stay.'],
  companionSettings: ['Ajusta la escala, las etiquetas y la XP de las invocaciones.', 'Adjusts summon size, labels, and XP.'],
  battleSettings: ['Las batallas usan la misma fuente que las invocaciones.', 'Battles use the same source as summoned companions.'],
  interval: ['Tiempo entre apariciones automáticas.', 'Time between automatic wild spawns.'],
  duration: ['Tiempo visible para intentar capturar un salvaje normal.', 'How long a normal wild encounter is visible for catches.'],
  legendaryChancePercent: ['Probabilidad por aparición automática. 0 desactiva las apariciones ultrarraras aleatorias.', 'Chance per automatic encounter. Set to 0 to disable random ultra-rare encounters.'],
  catchGraceSeconds: ['Segundos extra para capturar después de que desaparece el retrato.', 'Extra seconds to catch after the portrait disappears.'],
  shiny: ['1 entre este número de apariciones, si existe variante shiny.', 'One in this many encounters, when a shiny variant exists.'],
  duplicateMode: ['Premio si el viewer vuelve a capturar una variante que ya tiene.', 'Reward for catching a variant the viewer already owns.'],
  duplicateXpPercent: ['Solo en modo XP. Porcentaje de lo que cuesta subir un nivel.', 'XP mode only. Percentage of the XP needed for one level.'],
  spriteScale: ['Escala general de los compañeros en la fuente.', 'Overall companion size in the browser source.'],
  nameLimit: ['Oculta las etiquetas cuando hay más compañeros que este número.', 'Hides name labels when more companions are on screen than this number.'],
  visibleLimit: ['Máximo a la vez. Tienen prioridad las invocaciones recientes.', 'Maximum at once. Most recent summons appear first.'],
  summonMoneyPerMinute: ["Pokédólares por cada minuto con un compañero invocado.", "Pokédollars per minute with a summoned companion."],
  summonXpPerSecond: ['XP por segundo de invocación activa.', 'XP per second while summoned and active.'],
  battleXpPerOpponent: ['El Pokémon ganador recibe esta XP por cada rival.', 'The winner receives this much XP for each opponent.'],
  battleEveryEncounters: ['Intenta iniciar tras este número de encuentros si hay dos compañeros. Usa 0 para inicio manual.', 'Tries to start after this many encounters with two companions. Use 0 for manual only.'],
  battleEnabled: ['Habilita el inicio manual y la programación de batallas.', 'Enables manual and scheduled battles.'],
  battleMoneyPerWin: ['Premio para el ganador al cerrar la batalla. 0 desactiva el premio.', 'Paid to the winner when the battle ends. Set to 0 to disable.'],
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

Object.assign(labels.es, { legendaryChancePercent: 'Aparición ultrarrara (%)', resetCancel: 'Cancelar', resetCommunity: 'Borrar progreso de la comunidad', resetPrompt: 'Esto borra los registros y el progreso de todos los viewers de esta comunidad. Escribe RESET para confirmar.', resetDone: 'Progreso borrado. Los viewers deben registrarse de nuevo.', resetPending: 'Borrado pendiente. La app volverá a intentarlo.', summonSourcePreview: 'Vista previa de invocaciones (fuente)', battleSourcePreview: 'Vista previa de batalla (fuente)', activityTab: 'Registro', liveChatTab: 'Chat', liveChatHelp: 'Mensajes recientes de los chats conectados.', copyBotMod: 'Copiar comando de moderador', botModCopied: 'Comando copiado. Pégalo en el chat de tu canal de Twitch.', botAccountHelp: 'Twitch: copia el comando, pégalo en el chat de tu canal y pulsa Probar Twitch.' })
Object.assign(labels.en, { legendaryChancePercent: 'Ultra-rare encounter chance (%)', resetCancel: 'Cancel', resetCommunity: 'Reset community progress', resetPrompt: 'This deletes all viewer registrations and progress for this community. Type RESET to confirm.', resetDone: 'Progress deleted. Viewers must join again.', resetPending: 'Reset pending. The app will retry.', summonSourcePreview: 'Summon preview (source)', battleSourcePreview: 'Battle preview (source)', activityTab: 'Log', liveChatTab: 'Chat', liveChatHelp: 'Recent messages from connected chats.', copyBotMod: 'Copy moderator command', botModCopied: 'Command copied. Paste it in your Twitch channel chat.', botAccountHelp: 'Twitch: copy the command, run it in your channel chat, and click Test Twitch.' })

Object.assign(labels.es, { kickBotHelp: 'Conecta tu canal y pulsa Probar Kick. Si el chat restringe quién puede escribir, puedes añadir el bot como moderador.', testTwitchBot: 'Probar Twitch', testKickBot: 'Probar Kick', botTestOffline: 'El canal no está conectado.', botTestFailed: 'El bot no pudo enviar. Revisa su vinculación y permisos.', botTestChannel: 'Mensaje enviado desde la cuenta del canal.', botTestBot: 'Mensaje enviado desde el bot.' })
Object.assign(labels.en, { kickBotHelp: 'Connect your channel and click Test Kick. If your chat restricts who can post, you can add the bot as a moderator.', testTwitchBot: 'Test Twitch', testKickBot: 'Test Kick', botTestOffline: 'The channel is not connected.', botTestFailed: 'The bot could not send. Check its connection and permissions.', botTestChannel: 'Message sent from the channel account.', botTestBot: 'Message sent from the bot.' })
Object.assign(labels.es, { kickPermission: 'Kick rechazó el permiso del bot. Confirma que tu chat permite escribir a @streamcompanionsbot y prueba de nuevo.', kickRateLimited: 'Kick limitó los envíos. Espera un momento y vuelve a probar.', kickRejected: 'Kick rechazó el mensaje. Revisa las restricciones de tu chat y prueba de nuevo.', kickSameAccount: 'Conecta tu canal de streamer. @streamcompanionsbot es el remitente.', kickUnavailable: 'El bot compartido de Kick aún no está disponible.' })
Object.assign(labels.en, { kickPermission: 'Kick denied the bot permission. Check that @streamcompanionsbot can post in your chat and try again.', kickRateLimited: 'Kick rate-limited the message. Wait a moment and try again.', kickRejected: 'Kick rejected the message. Check your chat restrictions and try again.', kickSameAccount: 'Connect your streamer channel. @streamcompanionsbot is the sender.', kickUnavailable: 'The shared Kick bot is currently unavailable.' })
let botTestPlatform
function renderActivity(id, entries) {
  const node = document.getElementById(id)
  if (node.closest('[data-pane]').hidden) return
  node.replaceChildren(...[...(entries ?? [])].reverse().filter(entry => !String(entry.message).startsWith('activity:')).map(entry => {
    const row = document.createElement('li')
    row.textContent = [new Date(entry.at).toLocaleTimeString(), entry.platform, entry.name, entry.message, entry.result].filter(Boolean).join(' · ')
    return row
  }))
}

function showPane(name) {
  for (const pane of document.querySelectorAll('[data-pane]')) pane.hidden = pane.dataset.pane !== name
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-pressed', String(button.dataset.view === name))
  }
}

function loadBotEditor(bot) {
  const form = $('bot-form')
  $('announce-in-chat').checked = bot.announceInChat !== false
  $('capture-in-chat').checked = bot.captureInChat !== false
  $('action-in-chat').checked = bot.actionInChat !== false
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
  const available = ['available', 'installing', 'installFailed'].includes(status)
  const installable = available && state.canInstallUpdate && Boolean(state.updateStatus.archive)
  $('view-releases').hidden = !available
  $('update-banner').hidden = !available
  $('update-banner-status').textContent = $('update-status').textContent
  for (const id of ['update-home', 'update-about']) {
    $(id).hidden = !installable
    $(id).disabled = status === 'installing'
  }
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
    Object.assign(input, { name: id, type: 'number', min: '1', max: maxShopPrice(product), required: true, value: product.price })
    const heading = document.createElement('span')
    heading.className = 'shop-item-name'
    heading.append(icon, name)
    label.append(heading, input)
    $('shop-price-fields').append(label)
  }
  const legendary = $('legendary-event')
  for (const entry of catalog.filter(item => item.specialTag && item.wildEligible)) {
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
    }), remaining, { strip: kind === 'companions' })
  }
} else {
  document.getElementById('overlay').hidden = false
  showScene(document.getElementById('overlay'), location.pathname.slice(1), catalog, () => state, remaining, {
    strip: new URLSearchParams(location.search).get('layout') === 'strip'
  })
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
  const previewMode = new URLSearchParams(location.search).get('preview')
  const response = await fetch(panel ? '/state' : '/state?overlay=' + location.pathname.slice(1) + (previewMode ? '&preview=' + encodeURIComponent(previewMode) : ''))
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
    loadCapturePercentages(state.config.capturePercentages)
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
  $('reset-community').hidden = !state.canReset
  $('reset-community').disabled = Boolean(state.resettingCommunity)
  renderActivity('activity-list', state.activityLog)
  renderActivity('live-chat-list', state.localChat)
  $('test-twitch-bot').disabled = !state.twitchConnected
  $('test-kick-bot').disabled = !state.kickConnected
  const tested = state.botTestStatus?.[botTestPlatform]
  if (tested) {
    const result = { bot: 'botTestBot', channel: 'botTestChannel', offline: 'botTestOffline', failed: 'botTestFailed', kickPermission: 'kickPermission', kickRateLimited: 'kickRateLimited', kickRejected: 'kickRejected', kickSameAccount: 'kickSameAccount', kickUnavailable: 'kickUnavailable' }[tested]
    $('bot-test-result').textContent = copy[result] ?? ''
  }
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
  $('next').textContent = running && state.nextAt ? remaining(state.nextAt) : '—'
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
  for (const id of ['update-home', 'update-about', 'update-notes']) {
    $(id).addEventListener('click', async () => {
      const action = id === 'update-notes' ? { openUpdateNotes: true } : { installUpdate: true }
      await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action) }).catch(() => {})
    })
  }
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
function loadCapturePercentages(percentages) {
  for (const { id, defaults } of captureCategories) {
    for (let index = 0; index < defaults.length; index++) {
      $('capture-settings').elements.namedItem(id + '-' + index).value = percentages?.[id]?.[index] ?? defaults[index]
    }
  }
}

function translate() {
  for (const element of document.querySelectorAll('[data-about]')) element.textContent = aboutCopy[$('language').value][element.dataset.about]
  renderUpdateStatus()
  for (const item of document.querySelectorAll('[data-shop-item]')) {
    item.textContent = shopItems[item.dataset.shopItem].names[Number($('language').value === 'en')]
  }
  for (const item of document.querySelectorAll('[data-capture-category]')) {
    const category = captureCategories.find(({ id }) => id === item.dataset.captureCategory)
    item.textContent = category.names[Number($('language').value === 'en')]
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
  for (const { id, defaults } of captureCategories) {
    const row = $('capture-rows').insertRow()
    const heading = document.createElement('th')
    heading.scope = 'row'
    heading.id = 'capture-category-' + id
    heading.dataset.captureCategory = id
    row.append(heading)
    defaults.forEach((rate, index) => {
      const input = document.createElement('input')
      Object.assign(input, { name: id + '-' + index, type: 'number', min: '0', max: '100', step: '0.01', value: rate, required: true })
      input.setAttribute('aria-label', ['Poké Ball %', 'Great Ball / Super Ball %', 'Ultra Ball %'][index])
      input.setAttribute('aria-describedby', heading.id)
      row.insertCell().append(input)
    })
  }
  $('capture-defaults').addEventListener('click', () => {
    loadCapturePercentages()
    $('capture-status').textContent = ''
  })
  $('capture-settings').addEventListener('submit', async event => {
    event.preventDefault()
    const copy = labels[$('language').value]
    const form = event.currentTarget
    const capturePercentages = Object.fromEntries(captureCategories.map(({ id, defaults }) => [
      id, defaults.map((_, index) => form.elements.namedItem(id + '-' + index).valueAsNumber)
    ]))
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capturePercentages }) })
      $('capture-status').textContent = response.ok ? copy.captureSaved : copy.invalidSettings
    } catch { $('capture-status').textContent = copy.invalidSettings }
  })
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
  for (const [path, name] of [['/encounter', 'obsEncounter'], ['/companions?layout=strip', 'obsCompanions'],
    ['/companions?layout=strip&preview=summon', 'summonSourcePreview'], ['/companions?layout=strip&preview=battle', 'battleSourcePreview']]) {
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
  const resetConfirm = $('reset-community-confirm')
  $('reset-community').addEventListener('click', () => {
    resetConfirm.returnValue = ''
    resetConfirm.querySelector('form').reset()
    resetConfirm.showModal()
  })
  resetConfirm.addEventListener('close', async () => {
    const copy = labels[$('language').value]
    const confirmation = resetConfirm.querySelector('[name=confirmation]').value
    if (resetConfirm.returnValue !== 'confirm' || confirmation !== 'RESET') return
    const result = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetCommunity: confirmation }) }).catch(() => null)
    $('reset-community-status').textContent = result?.ok ? copy.resetDone : copy.resetPending
  })
  for (const platform of ['twitch', 'kick']) {
    $('test-' + platform + '-bot').addEventListener('click', async () => {
      botTestPlatform = platform
      const result = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testBot: platform }) }).catch(() => null)
      if (!result?.ok) $('bot-test-result').textContent = labels[$('language').value].botTestFailed
    })
  }
  for (const button of document.querySelectorAll('[data-copy-mod]')) button.addEventListener('click', async () => {
    const copy = labels[$('language').value]
    const command = '/mod streamcompanionsbot'
    try {
      await navigator.clipboard.writeText(command)
      $('bot-test-result').textContent = copy.botModCopied.replace('Twitch', button.dataset.copyMod === 'kick' ? 'Kick' : 'Twitch')
    } catch { $('bot-test-result').textContent = command }
  })
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
    const bot = { nickname: '', announceInChat: $('announce-in-chat').checked, captureInChat: $('capture-in-chat').checked,
      actionInChat: $('action-in-chat').checked, responses: {} }
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
