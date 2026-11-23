const aliases = new Map([
  ['!captura', '!catch'], ['!capturar', '!catch'],
  ['!invocar', '!summon'], ['!invocarshiny', '!summonshiny'],
  ['!retirar', '!summon out'], ['!registrar', '!poke join'],
  ['!caramelo', '!candy'],
  ['!evolución', '!evolve'], ['!evolucion', '!evolve'], ['!evolucionar', '!evolve']
])
const ballAliases = { normal: 'normal', super: 'great', 'súper': 'great', ultra: 'ultra', maestra: 'master' }

export function normalizeCommand(raw) {
  const text = raw.trim()
  if (!text.startsWith('!')) return text
  const [command, ...args] = text.toLowerCase().split(/\s+/)
  let name = aliases.get(command) ?? command
  let argument = args.join(' ')
  if (name === '!poke' && argument === 'unir') argument = 'join'
  if (name === '!summon' && argument === 'fuera') argument = 'out'
  if (name === '!summon' && argument.startsWith('shiny ')) {
    name = '!summonshiny'
    argument = argument.slice(6)
  }
  if (name === '!catch' && Object.hasOwn(ballAliases, argument)) argument = ballAliases[argument]
  return argument ? name + ' ' + argument : name
}
