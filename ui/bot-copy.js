export const botCopy = {
  es: {
    notice: '¡Aparecerá un Pokémon salvaje en {min} {unidad}!',
    alreadyJoined: 'Ya estás registrado en esta comunidad.',
    joined: '¡{viewer} se registró! Su inicial es {pokemon}. Usa !summon {pokemon}.',
    wildAppeared: '¡Apareció {pokemon}! Dificultad: {difficulty}.',
    summoned: '¡{viewer} invocó a su compañero!',
    removed: 'Compañero retirado.',
    missingCreature: 'No tienes ese Pokémon o esa variante.',
    follow: 'Sigue el canal antes de usar !poke join.',
    joinFirst: 'Regístrate con !poke join antes de capturar.',
    noEncounter: 'No hay un Pokémon disponible para capturar ahora.',
    noBalls: '{viewer}, no tienes {ball}.',
    invalidBall: 'Usa !catch, !catch great, !catch ultra o !catch master.',
    alreadyCaught: 'Esta captura ya no está disponible para ti.',
    escaped: 'El Pokémon se escapó.',
    automaticEvolution: 'Las evoluciones se desbloquean al subir de nivel. Usa !invocar seguido de la forma que quieras.',
    summonOtherChannel: 'Ya tienes un compañero invocado en el otro chat. Retíralo allí para cambiar de canal.',
    ballInventory: '{viewer} · {inventory}',
    catchSuccess: '¡{viewer} capturó a {pokemon}!',
    trackerUsed: 'Legendary Tracker activado. El próximo encuentro será legendario.',
    trackerQueued: 'Ya hay un encuentro especial programado. Conservaste el Tracker.',
    trackerMissing: 'No tienes un Legendary Tracker.',
    candyUsed: '¡Tu Pokémon ganó niveles!',
    candyMaxLevel: 'Esa cantidad supera los niveles que le faltan a tu Pokémon.',
    candyNoSummon: 'Invoca un Pokémon en este canal primero.',
    candyQuantity: 'Indica una cantidad entera mayor que cero.',
    battleLocked: 'Espera a que termine la batalla para hacer eso.',
    noCandy: 'No tienes Caramelos Raros.',
    web: '{url}'
  },
  en: {
    notice: 'A wild Pokémon will appear in {min} {unidad}!',
    alreadyJoined: 'You have already joined this community.',
    joined: '{viewer} joined! Their starter is {pokemon}. Use !summon {pokemon}.',
    wildAppeared: 'A wild {pokemon} appeared! Catch difficulty: {difficulty}.',
    summoned: '{viewer} summoned their companion!',
    removed: 'Companion withdrawn.',
    missingCreature: 'You do not own that Pokémon or variant.',
    follow: 'Follow the channel before using !poke join.',
    joinFirst: 'Use !poke join before catching a Pokémon.',
    noEncounter: 'There is no Pokémon available to catch right now.',
    noBalls: '{viewer}, you are out of {ball}.',
    invalidBall: 'Use !catch, !catch great, !catch ultra, or !catch master.',
    alreadyCaught: 'This catch is no longer available to you.',
    escaped: 'The Pokémon escaped.',
    automaticEvolution: 'Evolutions unlock as your family levels up. Use !summon and the form you want.',
    summonOtherChannel: 'You already have a companion summoned in the other chat. Withdraw it there to switch channels.',
    ballInventory: '{viewer} · {inventory}',
    catchSuccess: '{viewer} caught {pokemon}!',
    trackerUsed: 'Legendary Tracker activated. The next encounter will be legendary.',
    trackerQueued: 'A special encounter is already scheduled. You kept your Tracker.',
    trackerMissing: 'You do not have a Legendary Tracker.',
    candyUsed: 'Your Pokémon gained levels!',
    candyMaxLevel: 'That amount exceeds the Pokémon’s remaining levels.',
    candyNoSummon: 'Summon a Pokémon in this channel first.',
    candyQuantity: 'Enter a positive whole number.',
    battleLocked: 'Wait until the battle ends to do that.',
    noCandy: 'You do not have any Rare Candies.',
    web: '{url}'
  }
}

export const defaultBot = { nickname: '', language: 'es', announceInChat: true, captureInChat: true, actionInChat: true, responses: {} }
export const botCategory = (code, command) => ['web', 'ballInventory', 'follow'].includes(code) || command === '!balls' ? 'info' :
  ['catchSuccess', 'escaped', 'noBalls', 'invalidBall', 'alreadyCaught', 'noEncounter'].includes(code) ? 'capture' : 'action'
export const chatBotEnabled = (bot, category) => category === 'info' ||
  bot[category === 'capture' ? 'captureInChat' : category === 'action' ? 'actionInChat' : 'announceInChat'] !== false
export const botResponse = (bot, action) => bot.responses?.[action] ?? botCopy[bot.language]?.[action] ?? ''
export const botSignature = (bot, text) => text && (bot.nickname ? '[' + bot.nickname + '] ' + text : text)
export const formatBotReply = (bot, action, values) => {
  const result = botResponse(bot, action).replace(/\{(\w+)\}/g, (token, key) => Object.hasOwn(values, key) ? String(values[key]) : token)
  if (!result || !['catchSuccess', 'escaped'].includes(action) || !values.ball || values.remaining === undefined) return result
  return result + ' · ' + values.ball + ' ×' + values.remaining + (bot.language === 'en' ? ' left' : ' restantes')
}

export function validateBot(value) {
  if (!value || typeof value.nickname !== 'string' || value.nickname.length > 32 ||
      /[\r\n]/.test(value.nickname) || !Object.hasOwn(botCopy, value.language)) return null
  if (['announceInChat', 'captureInChat', 'actionInChat'].some(key => value[key] !== undefined && typeof value[key] !== 'boolean')) return null
  const responses = {}
  const hasLegacyReplies = value.responses?.es || value.responses?.en
  const alternate = value.language === 'es' ? 'en' : 'es'
  for (const key of Object.keys(botCopy.es)) {
    let text = value.responses?.[key]
    if (hasLegacyReplies) {
      for (const language of [value.language, alternate]) {
        const custom = value.responses?.[language]?.[key]
        if (custom !== undefined && custom !== botCopy[language][key]) {
          text = custom
          break
        }
      }
    }
    if (text === undefined) continue
    if (typeof text !== 'string' || text.length > 300 || /[\r\n]/.test(text)) return null
    if (text && key === 'web' && !text.includes('{url}')) return null
    responses[key] = text.trim()
  }
  return { nickname: value.nickname.trim(), language: value.language, announceInChat: value.announceInChat ?? true, captureInChat: value.captureInChat ?? value.announceInChat ?? true,
    actionInChat: value.actionInChat ?? value.announceInChat ?? true, responses }
}
