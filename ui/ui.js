import { botCopy } from './bot-copy.js'
import { level, showScene } from './sprites.js?v=1.2.6'
import { captureCategories } from '/ui/capture-rates.js'
import { maxShopPrice, shopIconUrl, shopItems } from '/ui/shop.js'
import { aboutCopy } from '/ui/about.js'

const $ = id => document.getElementById(id)
const panel = location.pathname === '/'
const botActions = Object.keys(botCopy.es).filter(action =>
  !['noEncounter', 'noBalls', 'invalidBall', 'alreadyCaught', 'escaped'].includes(action))
const labels = {
  es: { duplicateMode: 'Capturas repetidas', duplicateXpPercent: 'XP del siguiente nivel (%)', duplicateOff: 'Desactivado', duplicateReward: 'Captura repetida. El compañero subió un nivel.', config: 'Configuración', interval: 'Intervalo (min)', duration: 'Duración (min)', catchGraceSeconds: 'Compensar delay (s)', invalidBall: 'Tipo de bola desconocido', shiny: 'Shiny (1 entre)', nameLimit: 'Ocultar nombres sobre', visibleLimit: 'Máx. en pantalla', spriteScale: 'Tamaño de sprites', testSummon: 'Probar invocación', clearPreview: 'Quitar prueba', save: 'Guardar', preview: 'Vista previa', spawn: 'Aparición manual', viewer: 'Probar como viewer', send: 'Enviar', next: 'Próxima aparición', joined: 'Registro listo. Recibiste 5 Poké Balls.', caught: 'Captura exitosa', escaped: 'Se escapó', summoned: 'Compañero invocado', removed: 'Compañero retirado', alreadyJoined: 'Ya estás registrado', alreadyCaught: 'Ya tienes esta captura', joinFirst: 'Escribe !poke join', noBalls: 'Sin bolas de ese tipo', noEncounter: 'Sin encuentro activo', missingCreature: 'No tienes esa variante' },
  en: { duplicateMode: 'Repeat catches', duplicateXpPercent: 'XP toward next level (%)', duplicateOff: 'Off', duplicateReward: 'Repeat catch. The companion gained one level.', config: 'Settings', interval: 'Interval (min)', duration: 'Duration (min)', catchGraceSeconds: 'Stream delay grace (s)', invalidBall: 'Unknown ball type', shiny: 'Shiny (1 in)', nameLimit: 'Hide names above', visibleLimit: 'Max on screen', spriteScale: 'Sprite size', testSummon: 'Test summon', clearPreview: 'Clear preview', save: 'Save', preview: 'Preview', spawn: 'Spawn manually', viewer: 'Test as viewer', send: 'Send', next: 'Next encounter', joined: 'Joined. You received 5 Poké Balls.', caught: 'Caught', escaped: 'Escaped', summoned: 'Companion summoned', removed: 'Companion removed', alreadyJoined: 'Already joined', alreadyCaught: 'Already caught', joinFirst: 'Type !poke join', noBalls: 'No balls of that type', noEncounter: 'No active encounter', missingCreature: 'You do not own that variant' }
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
  obsEncounter: 'Encuentros salvajes', obsKnockouts: 'Registro de bajas', obsKnockoutScale: 'Tamaño del registro', obsKnockoutPreview: 'Abrir vista previa', obsPreviewTeam: 'Batalla por equipos', obsPreviewRaid: 'Incursión Dynamax', obsKnockoutHelp: 'Copia el enlace y usa al menos estas dimensiones en OBS:', obsCompanions: 'Compañeros invocados', obsCopy: 'Copiar enlace', obsCopied: 'Enlace copiado.', obsCopyError: 'Selecciona el enlace y cópialo manualmente.' })
Object.assign(labels.en, { obsTitle: 'OBS browser sources', obsHelp: 'Add one browser source per link. Set the companions source to 1920 × 550.',
  obsEncounter: 'Wild encounters', obsKnockouts: 'Knockout feed', obsKnockoutScale: 'Feed size', obsKnockoutPreview: 'Open preview', obsPreviewTeam: 'Team battle', obsPreviewRaid: 'Dynamax raid', obsKnockoutHelp: 'Copy the link and use at least these dimensions in OBS:', obsCompanions: 'Summoned companions', obsCopy: 'Copy link', obsCopied: 'Link copied.', obsCopyError: 'Select the link and copy it manually.' })

Object.assign(labels.es, { summonMoneyPerMinute: 'Pokédólares por minuto invocado', summonXpPerSecond: 'XP por segundo invocado', battleXpPercentPerWin: 'XP del siguiente nivel por victoria (%)' })
Object.assign(labels.en, { summonMoneyPerMinute: 'Pokédollars per summon minute', summonXpPerSecond: 'Summon XP per second', battleXpPercentPerWin: 'XP toward the next level per win (%)' })
Object.assign(labels.es, { battleEveryEncounters: 'Salvajes por batalla (0 = manual)', startBattle: 'Iniciar batalla', battleNeedsPlayers: 'Necesitas dos compañeros activos.', battleUnavailable: 'Inicia el juego y espera a que termine la batalla anterior.', battleStarted: 'Batalla programada. Se esperará a que termine cualquier encuentro activo.' })
Object.assign(labels.en, { battleEveryEncounters: 'Wild encounters per battle (0 = manual)', startBattle: 'Start battle', battleNeedsPlayers: 'At least two companions must be active.', battleUnavailable: 'Start the game and wait for the current battle to finish.', battleStarted: 'Battle queued. Any active encounter will finish first.' })

Object.assign(labels.es, { battleEnabled: 'Batallas automáticas', battleOff: 'Deshabilitadas', battleOn: 'Habilitadas', battleHpMultiplier: 'Multiplicador de PS', battleMoneyPerWin: 'Pokédólares por victoria', battleUnavailable: 'Habilita las batallas, inicia el juego y espera a que termine la ronda anterior.' })
Object.assign(labels.en, { battleEnabled: 'Automatic battles', battleOff: 'Disabled', battleOn: 'Enabled', battleHpMultiplier: 'HP multiplier', battleMoneyPerWin: 'Pokédollars per win', battleUnavailable: 'Enable battles, start the game, and wait for the previous round to finish.' })
labels.es.battleFocusSpread = 'Repartir el foco entre rivales cercanos'
labels.en.battleFocusSpread = 'Spread focus among nearby opponents'

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
labels.es.raidTmChance = 'Fragmento de TM ancestral por jugador (%)'
labels.en.raidTmChance = 'Ancestral TM Fragment per player (%)'

Object.assign(labels.es, { homeTab: 'Inicio', sourcesTab: 'Fuentes', next: 'Próximo encuentro', wildCount: 'Encuentros de esta sesión', caughtCount: 'Capturas de esta sesión',
  encounterSettings: 'Encuentros salvajes', companionSettings: 'Compañeros en pantalla', battleSettings: 'Batallas por equipos', teamBattleHelp: 'Cada viewer participa con su equipo guardado. Con el equipo vacío entra su Pokémon invocado.', raidHelp: 'Inicia una incursión con uno o más compañeros invocados o lanza una prueba sin premios. Ambas se ven en la fuente Compañeros de OBS o Streamlabs.', startRaidNow: 'Iniciar incursión ahora', interval: 'Cada cuántos minutos aparece un salvaje', duration: 'Minutos para capturar', catchGraceSeconds: 'Margen por retraso (s)',
  eventsTab: 'Eventos', dataTab: 'Data Config', liveEvents: 'Controles en directo', startBattleNow: 'Iniciar batalla ahora', saveEvents: 'Guardar programación y premios', wildEnabled: 'Apariciones automáticas', raidEnabled: 'Incursiones automáticas', dataHelp: 'Descarga una plantilla, edítala y cárgala para aplicar los cambios en esta app.', balanceLab: 'Pruebas y balance', forceRaid: 'Probar jefe en la fuente', forceTeam: 'Probar equipos en la fuente', simulationRounds: 'Simulaciones', runSimulation: 'Simular y descargar informe', raidSizePercent: 'Tamaño del jefe (%)', raidTitle: 'Jefes Dinamax', raidChance: 'Probabilidad por encuentro (%)', raidDuration: 'Tiempo límite (s)', raidCatch: 'Permitir capturar al jefe vencido', teamBattles: 'Activar equipos de tres en batalla', raidRewards: 'Drops por vencer al jefe', raidDropsHelp: 'Cada premio se sortea por separado para cada viewer. Con 100% está garantizado.', speciesRules: 'Reglas por Pokémon', importRules: 'Cargar JSON', showPokemonName: 'Mostrar nombre del Pokémon', showViewerName: 'Mostrar nombre del viewer', nameLimit: 'Ocultar nombres a partir de', visibleLimit: 'Compañeros visibles', battleEveryEncounters: 'Encuentros entre batallas', previewEncounter: 'Probar encuentro salvaje', previewLocal: 'Simular en la app', spawn: 'Lanzar en directo',
  obsTitle: 'Fuentes de navegador', obsHelp: 'Copia cada enlace a una fuente de navegador en OBS, Streamlabs o tu programa de directo. Usa 1920 × 550 para compañeros y batallas. Redimensiona la fuente en la escena desde una esquina para mantener la proporción.',
  connectionHelp: 'Conecta Twitch primero para activar tu comunidad. Después puedes añadir Kick. El portal de viewers se configura automáticamente.', connected: 'Conectado', disconnected: 'Desconectado', editBotReplies: 'Personalizar respuestas del chat' })
Object.assign(labels.en, { homeTab: 'Home', sourcesTab: 'Sources', next: 'Next encounter', wildCount: 'Encounters this session', caughtCount: 'Catches this session',
  encounterSettings: 'Wild encounters', companionSettings: 'On-screen companions', battleSettings: 'Team Battles', teamBattleHelp: 'Each viewer fights with their saved team. An empty team uses their summoned Pokémon.', raidHelp: 'Start a raid with one or more summoned companions or run a test without rewards. Both appear in the Companions source in OBS or Streamlabs.', startRaidNow: 'Start raid now', interval: 'Minutes between wild encounters', duration: 'Minutes to catch', catchGraceSeconds: 'Stream delay grace (s)',
  eventsTab: 'Events', dataTab: 'Data Config', liveEvents: 'Live controls', startBattleNow: 'Start battle now', saveEvents: 'Save scheduling and rewards', wildEnabled: 'Automatic wild encounters', raidEnabled: 'Automatic raids', dataHelp: 'Download a template, edit it, and load it to apply the changes in this app.', balanceLab: 'Testing and balance', forceRaid: 'Force a test raid', forceTeam: 'Force a team test', simulationRounds: 'Simulations', runSimulation: 'Simulate and download report', raidSizePercent: 'Boss size (%)', raidTitle: 'Dynamax bosses', raidChance: 'Chance per encounter (%)', raidDuration: 'Time limit (sec)', raidCatch: 'Open a catch after defeating a boss', teamBattles: 'Enable three-slot battle teams', raidRewards: 'Rewards for defeating a boss', speciesRules: 'Rules by Pokémon', importRules: 'Load JSON', showPokemonName: 'Show Pokémon name', showViewerName: 'Show viewer name', nameLimit: 'Hide names above this count', visibleLimit: 'Visible companions', battleEveryEncounters: 'Encounters between battles', previewEncounter: 'Wild encounter preview', previewLocal: 'Simulate in app', spawn: 'Spawn on stream',
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
  battleXpPercentPerWin: ['El ganador recibe este porcentaje del tramo al siguiente nivel. 0 desactiva la XP de victoria.', 'The winner receives this percentage of the XP needed for their next level. Set to 0 to disable.'],
  battleEveryEncounters: ['Intenta iniciar tras este número de encuentros si hay dos compañeros. Usa 0 para inicio manual.', 'Tries to start after this many encounters with two companions. Use 0 for manual only.'],
  battleEnabled: ['Programa batallas según el número de encuentros indicado.', 'Schedules battles based on the configured encounter count.'],
  battleMoneyPerWin: ['Premio para el ganador al cerrar la batalla. 0 desactiva el premio.', 'Paid to the winner when the battle ends. Set to 0 to disable.'],
  battleHpMultiplier: ['Multiplica los PS iniciales en batallas por equipos.', 'Multiplies starting HP in team battles.'],
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
Object.assign(labels.es, { shinyCue: 'Sonido shiny', chooseShinyCue: 'Elegir MP3 o WAV', resetShinyCue: 'Restablecer' })
Object.assign(labels.en, { shinyCue: 'Shiny sound', chooseShinyCue: 'Choose MP3 or WAV', resetShinyCue: 'Reset' })

Object.assign(labels.es, { adminTab: 'Administración', adminGrantType: 'Recompensa', adminCandy: 'Caramelo Raro', adminHeld: 'Objeto equipable', adminItem: 'Objeto o Pokémon', adminAmount: 'Cantidad', adminGrant: 'Entregar', adminGame: 'Controles del juego', adminGranted: 'Recompensa entregada.', adminRejected: 'No se pudo entregar. Revisa el jugador, la cantidad y su inventario.', adminSpawned: 'Encuentro iniciado.' })
Object.assign(labels.en, { adminTab: 'Administration', adminGrantType: 'Reward', adminCandy: 'Rare Candy', adminHeld: 'Held item', adminItem: 'Item or Pokémon', adminAmount: 'Quantity', adminGrant: 'Grant reward', adminGame: 'Game controls', adminGranted: 'Reward granted.', adminRejected: 'Could not grant the reward. Check the viewer, quantity and inventory.', adminSpawned: 'Encounter started.' })

let lastEncounter
function playShinyCue() {
  const cue = new Audio('/sfx/shiny.wav?play=' + Date.now())
  cue.volume = .55
  return cue.play()
}
let settingsLoaded = false
let setupLoaded = false
let translateLab
const { species: catalog, catalogVersion } = await (await fetch('/catalog', { cache: 'no-store' })).json()
if (panel) {
  const cueStatus = $('shiny-cue-status')
  const reportCueError = () => cueStatus.textContent = $('language').value === 'en' ?
    'Choose a valid MP3 or WAV up to 512 KB.' : 'Elige un MP3 o WAV válido de hasta 512 KB.'
  for (const action of ['choose', 'reset']) $(action + '-shiny-cue').addEventListener('click', async () => {
    cueStatus.textContent = ''
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shinyCue: action }) })
      if (!response.ok) reportCueError()
    } catch { reportCueError() }
  })
  $('preview-shiny-cue').addEventListener('click', () => playShinyCue().catch(reportCueError))
  for (const [id, product] of Object.entries(shopItems)) {
    const label = document.createElement('label')
    const name = document.createElement('span')
    name.dataset.shopItem = id
    const icon = document.createElement('img')
    icon.src = shopIconUrl(id)
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
  for (const form of ['spawn', 'encounter-preview-form', 'summon-preview']) {
    const select = $(form).elements.namedItem('creature')
    for (const entry of catalog) if (form === 'summon-preview' || entry.wildEligible) select.add(new Option(entry.name, entry.name))
  }
  let preview
  let encounterPreview
  $('preview-encounter').addEventListener('click', () => {
    const name = $('encounter-preview-form').elements.creature.value
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
  if (!panel && state.catalogVersion && state.catalogVersion !== catalogVersion) {
    location.reload()
    return
  }
  if (panel || location.pathname === '/encounter') {
    const encounter = state.encounter
    const id = encounter?.id ?? encounter?.endsAt ?? null
    if (lastEncounter !== undefined && id !== lastEncounter && encounter?.shiny && encounter.endsAt > Date.now()) {
      playShinyCue().catch(error => console.warn('Could not play shiny cue', error))
    }
    lastEncounter = id
  }
  if (!panel) return
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
  updateBossChoices(state.raidBosses)
  if (!settingsLoaded) {
    for (const reward of state.config.raidRewards ?? []) addRaidReward(reward)
    loadCapturePercentages(state.config.capturePercentages)
    for (const [id, price] of Object.entries(state.config.shopPrices ?? {})) $('shop-prices').elements.namedItem(id).value = price
    for (const [name, value] of Object.entries(state.config)) {
      const field = $('settings').elements.namedItem(name) ?? $('event-settings').elements.namedItem(name)
      if (field?.type === 'checkbox') field.checked = value
      else if (field) field.value = value
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
  updateAdminViewer()
  const data = state.viewers[viewer]
  $('inventory').textContent = data ? [
    Object.entries(data.balls).map(([name, count]) => name + ' ×' + count).join(' · '),
    ...Object.entries(data.collection).map(([name, xp]) => name + ' · Lv. ' + level(xp))
  ].join('\n') : ''
}
function updateAdminViewer() {
  if (document.querySelector('[data-pane=admin]').hidden) return
  const selector = $('admin-grant').elements.viewerId
  const selected = selector.value
  const en = $('language').value === 'en'
  const people = Object.entries(state.viewers).sort(([, a], [, b]) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
  const key = JSON.stringify(people.map(([id, data]) => [id, data.displayName]))
  if (selector.dataset.key !== key) {
    selector.dataset.key = key
    selector.replaceChildren(...people.map(([id, data]) => new Option(data.displayName ? data.displayName + ' · ' + id.split(':')[0] : id, id)))
    if (Object.hasOwn(state.viewers, selected)) selector.value = selected
  }
  const entry = state.viewers[selector.value]
  $('admin-viewer-summary').textContent = entry ? [
    '$' + (entry.pokeDollars ?? 0) + ' · ' + labels[$('language').value].adminCandy + ' ×' + (entry.rareCandies ?? 0) + ' · Legendary Tracker ×' + (entry.legendaryTrackers ?? 0),
    Object.entries(entry.balls ?? {}).map(([ball, count]) => ball + ' ×' + count).join(' · '),
    (entry.heldItems ?? []).map(id => shopItems[id]?.names[Number(en)] ?? id).join(' · '),
    Object.entries(entry.collection).map(([name, xp]) => name + ' · Lv. ' + level(xp)).join(' / ')
  ].filter(Boolean).join('\n') : ''
}

if (panel) {
  const adminGrant = $('admin-grant')
  const adminSpawn = $('admin-spawn')
  const replaceChoices = () => {
    const kind = adminGrant.elements.kind.value
    const en = $('language').value === 'en'
    const choices = kind === 'pokemon' ? catalog.flatMap(entry => entry.shiny ? [entry.name, entry.name + ' ✦'] : [entry.name]).map(name => [name, name]) :
      kind === 'balls' ? [['normal', 'Poké Ball'], ['great', en ? 'Great Ball' : 'Super Ball'], ['ultra', 'Ultra Ball'], ['master', 'Master Ball']] :
      kind === 'held' ? Object.entries(shopItems).filter(([, product]) => product.held).map(([id, product]) => [id, product.names[Number(en)]]) : []
    adminGrant.elements.namedItem('item').replaceChildren(...choices.map(([id, name]) => new Option(name, id)))
    $('admin-item-label').hidden = !choices.length
    const amount = adminGrant.elements.amount
    amount.max = kind === 'money' ? '1000000' : kind === 'held' || kind === 'pokemon' ? '1' : '999'
    if (Number(amount.value) > Number(amount.max)) amount.value = amount.max
  }
  adminGrant.elements.kind.addEventListener('change', replaceChoices)
  adminGrant.elements.viewerId.addEventListener('change', updateAdminViewer)
  adminSpawn.elements.creature.replaceChildren(...catalog.filter(entry => entry.wildEligible).map(entry => new Option(entry.name, entry.name)))
  const adminPost = async (button, action, success, failure) => {
    button.disabled = true
    const copy = labels[$('language').value]
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) })
      $('admin-status').textContent = copy[response.ok ? success : response.status === 422 && action.startCommunityBattle ? 'battleNeedsPlayers' : failure]
      if (response.ok) await refresh()
    } catch {
      $('admin-status').textContent = copy.unavailable
    } finally { button.disabled = false }
  }
  adminGrant.addEventListener('submit', event => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(adminGrant))
    if (event.submitter.disabled) return
    void adminPost(event.submitter, { adminGrant: { ...values, amount: Number(values.amount) } }, 'adminGranted', 'adminRejected')
  })
  adminSpawn.addEventListener('submit', event => {
    event.preventDefault()
    if (event.submitter.disabled) return
    void adminPost(event.submitter, { spawn: adminSpawn.elements.creature.value }, 'adminSpawned', 'unavailable')
  })
  $('admin-start-battle').addEventListener('click', event => {
    void adminPost(event.currentTarget, { startCommunityBattle: true }, 'battleStarted', 'battleUnavailable')
  })
  replaceChoices()
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
  for (const button of document.querySelectorAll('[data-species-rules]')) button.addEventListener('click', async () => {
    const status = $('species-rules-status')
    button.disabled = true
    try {
      const response = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speciesRules: button.dataset.speciesRules, reset: button.hasAttribute('data-reset') }) })
      status.textContent = response.ok ? ($('language').value === 'en' ? 'Rules updated or file selection closed.' : 'Reglas actualizadas o selección cerrada.') : copy.invalidSettings
    } catch {
      status.textContent = copy.invalidSettings
    } finally {
      button.disabled = false
    }
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
  for (const [path, name] of [['/encounter', 'obsEncounter'], ['/companions?layout=strip', 'obsCompanions'], ['/knockouts', 'obsKnockouts'],
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
    if (name === 'obsKnockouts') {
      const controls = document.createElement('div')
      const sliderLabel = document.createElement('label')
      const caption = document.createElement('strong')
      caption.dataset.copy = 'obsKnockoutScale'
      const slider = document.createElement('input')
      slider.type = 'range'
      slider.min = 100
      slider.max = 300
      slider.step = 5
      const value = document.createElement('output')
      sliderLabel.append(caption, slider, value)
      const details = document.createElement('details')
      const summary = document.createElement('summary')
      summary.dataset.copy = 'obsKnockoutPreview'
      const viewport = document.createElement('div')
      viewport.className = 'knockout-preview-viewport'
      const frame = document.createElement('iframe')
      frame.title = title.textContent || 'Knockout feed preview'
      viewport.append(frame)
      const mode = document.createElement('select')
      for (const [id, copy] of [['1', 'obsPreviewTeam'], ['raid', 'obsPreviewRaid']]) {
        const option = new Option('', id)
        option.dataset.copy = copy
        mode.add(option)
      }
      details.append(summary, mode, viewport)
      const help = document.createElement('p')
      const helpText = document.createElement('span')
      helpText.dataset.copy = 'obsKnockoutHelp'
      const dimensions = document.createElement('strong')
      help.append(helpText, ' ', dimensions)
      controls.className = 'knockout-source-controls'
      controls.append(sliderLabel, help, details)
      row.append(controls)
      slider.value = localStorage.getItem('knockout-source-scale') || 150
      function updateSource() {
        const percent = slider.valueAsNumber
        address.value = location.origin + path + '?scale=' + percent
        frame.width = Math.ceil(620 * percent / 100)
        frame.height = Math.ceil(174 * percent / 100)
        dimensions.textContent = frame.width + ' × ' + frame.height
        const preview = address.value + '&preview=' + mode.value
        if (details.open && frame.src !== preview) frame.src = preview
        localStorage.setItem('knockout-source-scale', String(percent))
      }
      slider.addEventListener('input', updateSource)
      details.addEventListener('toggle', updateSource)
      mode.addEventListener('change', updateSource)
      updateSource()
    }
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
  for (const [index, id, rank, dna] of [[0, 42, 22, 0], [1, 384, 25, 0]]) {
    const field = document.createElement('fieldset')
    const selector = document.createElement('select')
    selector.name = 'species' + index
    selector.setAttribute('aria-label', 'Pokémon ' + (index + 1))
    selector.replaceChildren(...catalog.filter(entry => Number(entry.id))
      .map(entry => new Option(entry.name, Number(entry.id))))
    selector.value = id
    field.append(selector)
    for (const [key, label, value, maximum] of [['level','Lv.',rank,100], ['dna','DNA',dna,10]]) {
      const wrapper = document.createElement('label')
      wrapper.textContent = label
      wrapper.append(Object.assign(document.createElement('input'), { name:key + index, type:'number', min:key === 'dna' ? 0 : 1, max:maximum, value, required:true }))
      field.append(wrapper)
    }
    $('simulation-fighters').append(field)
  }
  function testAction(action) {
    return fetch('/demo', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(action) })
  }
  for (const button of document.querySelectorAll('[data-force-battle], [data-balance-data], #start-raid-now, #start-event-battle')) button.addEventListener('click', async () => {
    button.disabled = true
    const english = $('language').value === 'en'
    try {
      const mode = button.dataset.forceBattle
      const species = Number($(mode === 'raid' ? 'preview-only-raid-species' : 'preview-raid-species').value)
      const real = button.id === 'start-raid-now'
      const team = button.id === 'start-event-battle'
      const status = $(team ? 'event-battle-status' : mode === 'team' ? 'team-test-status' : mode === 'raid' ? 'raid-preview-status' : real ? 'raid-test-status' : 'balance-status')
      const response = await testAction(team ? {startEventBattle:true} : real ? {startRaid:species} : mode ? {forceBattle:mode, species} : {balanceData:button.dataset.balanceData})
      status.textContent = response.ok ? (real || team || mode ? (english ? 'Started in the Companions source.' : 'Inició en la fuente Compañeros.') : (english ? 'Ready.' : 'Listo.')) :
        response.status === 422 ? team ? labels[$('language').value].battleNeedsPlayers : (english ? 'Summon a Pokémon to start a raid.' : 'Invoca un Pokémon para iniciar la incursión.') :
        response.status === 409 ? (english ? 'Wait for the current battle or start the game.' : 'Espera la batalla actual o inicia el juego.') :
        (english ? 'Could not start or import.' : 'No se pudo iniciar o importar.')
    } finally { button.disabled = false }
  })
  $('balance-simulation').addEventListener('submit', async event => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const button = form.querySelector('button')
    const english = $('language').value === 'en'
    button.disabled = true
    $('balance-status').textContent = english ? 'Simulating…' : 'Simulando…'
    try {
      const fighters = [0,1].map(index => ({id:Number(values.get('species'+index)), level:Number(values.get('level'+index)), dna:Number(values.get('dna'+index))}))
      const response = await testAction({balanceSimulation:{fighters, rounds:Number(values.get('rounds'))}})
      if (!response.ok) throw new Error('Simulation failed')
      const report = await response.json()
      const output = $('simulation-result')
      output.textContent = JSON.stringify(report, null, 2)
      output.hidden = false
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([output.textContent], {type:'application/json'}))
      link.download = 'balance-simulation.json'
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      $('balance-status').textContent = english ? 'Simulation complete.' : 'Simulación completa.'
    } catch { $('balance-status').textContent = english ? 'Simulation failed.' : 'No se pudo simular.' }
    finally { button.disabled = false }
  })
  $('add-raid-reward').addEventListener('click', () => addRaidReward({kind: 'money', amount: 2500}))
  for (const [button, key] of [['load-raid-bosses', 'raidBosses'], ['load-learnsets', 'learnsets']]) $(button).addEventListener('click', async () => {
    const result = await fetch('/demo', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({[key]:'choose'})})
    $('balance-status').textContent = result.ok ? labels[$('language').value].saved : labels[$('language').value].invalidSettings
  })
  for (const id of ['settings', 'event-settings', 'spawn', 'chat', 'legendary-event']) {
    $(id).addEventListener('submit', async event => {
      event.preventDefault()
      const form = Object.fromEntries(new FormData(event.target))
      const configForm = id === 'settings' || id === 'event-settings'
      const config = configForm ? Object.fromEntries([...event.target.elements].filter(field => field.name).map(field => [field.name, field.type === 'checkbox' ? field.checked : Number(field.value)])) : null
      const action = configForm ? { config } :
        id === 'spawn' ? { spawn: form.creature } : id === 'legendary-event' ? { queueLegendary: form.creature } : form
      if (id === 'event-settings') action.raidRewards = Array.from($('raid-rewards').children, row => ({
        kind: row.querySelector('[data-kind]').value, item: row.querySelector('[data-item]').value, amount: row.querySelector('[data-amount]').valueAsNumber, chance: row.querySelector('[data-drop-chance]').valueAsNumber
      }))
      if (id === 'chat') viewer = form.viewer
      const result = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) })
      const copy = labels[$('language').value]
      if (result.ok) await refresh()
      if (configForm) $(id === 'settings' ? 'settings-status' : 'event-settings-status').textContent = result.ok ? copy.saved : copy.invalidSettings
      else if (id === 'spawn') $('event-wild-status').textContent = result.ok ? copy.adminSpawned : copy.unavailable
      else if (!result.ok) $(id === 'chat' ? 'notice' : 'legendary-status').textContent = copy.invalidSettings
    })
  }
}
function updateBossChoices(roster = []) {
  const version = JSON.stringify(roster)
  for (const id of ['preview-raid-species', 'preview-only-raid-species']) {
    const field = $(id)
    if (version === field.dataset.version) continue
    const selected = field.value || '9'
    field.replaceChildren(...roster.map(boss => new Option(boss.name, boss.species)))
    if ([...field.options].some(option => option.value === selected)) field.value = selected
    field.dataset.version = version
  }
}
function addRaidReward(reward) {
  const list = $('raid-rewards')
  if (list.children.length >= 10) return
  const english = $('language').value === 'en'
  const row = document.createElement('div')
  row.className = 'raid-reward'
  const kind = document.createElement('select')
  kind.dataset.kind = ''
  const item = document.createElement('select')
  item.dataset.item = ''
  const amount = Object.assign(document.createElement('input'), { type: 'number', min: 1, required: true })
  amount.dataset.amount = ''
  const chanceLabel = document.createElement('label')
  chanceLabel.className = 'raid-drop-chance'
  const chance = Object.assign(document.createElement('input'), {
    type: 'number', min: 0, max: 100, step: 'any', required: true, value: reward.chance ?? 100
  })
  chance.dataset.dropChance = ''
  chanceLabel.append(english ? 'Drop %' : 'Probabilidad %', chance)
  const remove = Object.assign(document.createElement('button'), { type: 'button', textContent: '−' })
  kind.setAttribute('aria-label', english ? 'Reward' : 'Premio')
  amount.setAttribute('aria-label', english ? 'Amount' : 'Cantidad')
  item.setAttribute('aria-label', english ? 'Item' : 'Objeto')
  remove.setAttribute('aria-label', english ? 'Remove reward' : 'Quitar premio')
  for (const [id, es, en] of [['money','Pokédólares','Pokédollars'],['candy','Caramelo Raro','Rare Candy'],['tracker','Legendary Tracker','Legendary Tracker'],
    ['dust','Shiny Dust','Shiny Dust'],['balls','Poké Balls','Poké Balls'],['held','Objeto equipable','Held item']]) kind.add(new Option(english ? en : es, id))
  kind.value = reward.kind
  const updateItems = () => {
    const options = kind.value === 'held' ? Object.entries(shopItems).filter(([, product]) => product.held).map(([id, product]) => [id, product.names[Number(english)]]) :
      kind.value === 'balls' ? Object.values(shopItems).filter(product => product.ball).map(product => [product.ball, product.names[Number(english)]]) : []
    item.replaceChildren(...options.map(([id, name]) => new Option(name, id)))
    item.hidden = !options.length
    amount.max = kind.value === 'held' ? 1 : kind.value === 'money' ? 1000000 : 999
    if (amount.valueAsNumber > Number(amount.max)) amount.value = amount.max
  }
  updateItems()
  if (reward.item) item.value = reward.item
  amount.value = reward.amount
  kind.addEventListener('change', updateItems)
  remove.addEventListener('click', () => row.remove())
  row.append(kind, item, amount, chanceLabel, remove)
  list.append(row)
}
async function update() {
  try {
    await refresh()
  } finally {
    setTimeout(update, !panel && state?.battle && !state.battle.over ? 50 : 500)
  }
}
update()
