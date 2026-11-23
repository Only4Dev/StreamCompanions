export const botCopy = {
  es: {
    notice: '¡Aparecerá un Pokémon salvaje en {min} {unidad}!',
    follow: 'Sigue el canal antes de usar !poke join.',
    joinFirst: 'Regístrate con !poke join antes de capturar.',
    noEncounter: 'No hay un Pokémon disponible para capturar ahora.',
    noBalls: 'Te faltan Poké Balls del tipo que elegiste.',
    invalidBall: 'Usa !catch, !catch great, !catch ultra o !catch master.',
    alreadyCaught: 'Esta captura ya no está disponible para ti.',
    escaped: 'El Pokémon se escapó.',
    automaticEvolution: 'Las evoluciones se desbloquean al subir de nivel. Usa !invocar seguido de la forma que quieras.',
    summonOtherChannel: 'Ya tienes un compañero invocado en el otro chat. Retíralo allí para cambiar de canal.',
    catchSuccess: '¡{viewer} capturó a {pokemon}!',
    candyUsed: '¡Tu Pokémon subió un nivel!',
    candyMaxLevel: 'Ese Pokémon ya está al nivel máximo.',
    noCandy: 'No tienes Caramelos Raros.',
    web: '{url}'
  },
  en: {
    notice: 'A wild Pokémon will appear in {min} {unidad}!',
    follow: 'Follow the channel before using !poke join.',
    joinFirst: 'Use !poke join before catching a Pokémon.',
    noEncounter: 'There is no Pokémon available to catch right now.',
    noBalls: 'You do not have any Poké Balls of that type.',
    invalidBall: 'Use !catch, !catch great, !catch ultra, or !catch master.',
    alreadyCaught: 'This catch is no longer available to you.',
    escaped: 'The Pokémon escaped.',
    automaticEvolution: 'Evolutions unlock as your family levels up. Use !summon and the form you want.',
    summonOtherChannel: 'You already have a companion summoned in the other chat. Withdraw it there to switch channels.',
    catchSuccess: '{viewer} caught {pokemon}!',
    candyUsed: 'Your Pokémon gained a level!',
    candyMaxLevel: 'That Pokémon is already at the level cap.',
    noCandy: 'You do not have any Rare Candies.',
    web: '{url}'
  }
}

export const defaultBot = { nickname: '', language: 'es', responses: {} }
export const botResponse = (bot, action) => bot.responses?.[action] ?? botCopy[bot.language]?.[action] ?? ''
export const botSignature = (bot, text) => text && (bot.nickname ? '[' + bot.nickname + '] ' + text : text)
export const formatBotReply = (bot, action, values) =>
  botResponse(bot, action).replace(/\{(\w+)\}/g, (token, key) => Object.hasOwn(values, key) ? String(values[key]) : token)

export function validateBot(value) {
  if (!value || typeof value.nickname !== 'string' || value.nickname.length > 32 ||
      /[\r\n]/.test(value.nickname) || !Object.hasOwn(botCopy, value.language)) return null
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
  return { nickname: value.nickname.trim(), language: value.language, responses }
}
