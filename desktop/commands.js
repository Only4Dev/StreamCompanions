const aliases = new Map([
  ['!captura', '!catch'], ['!capturar', '!catch'],
  ['!invocar', '!summon'], ['!invocarshiny', '!summonshiny'],
  ['!retirar', '!summon out'], ['!registrar', '!poke join'],
  ['!caramelo', '!candy'], ['!bolas', '!balls'], ['!inventory', '!balls'], ['!inventario', '!balls'],
  ['!evolución', '!evolve'], ['!evolucion', '!evolve'], ['!evolucionar', '!evolve']
])
const ballAliases = { ball: 'normal', normal: 'normal', super: 'great', 'súper': 'great', ultra: 'ultra', maestra: 'master' }

export function normalizeCommand(raw) {
  const text = raw.trim()
  if (!text.startsWith('!')) return text
  const [command, ...args] = text.toLowerCase().split(/\s+/)
  let name = aliases.get(command) ?? command
  let argument = args.join(' ')
  if (name === '!poke' && argument === 'bag') { name = '!balls'; argument = '' }
  if (name === '!poke' && argument === 'unir') argument = 'join'
  if (name === '!summon' && argument === 'fuera') argument = 'out'
  if (name === '!summon' && (argument.startsWith('shiny ') || argument.endsWith(' shiny'))) {
    name = '!summonshiny'
    argument = argument.startsWith('shiny ') ? argument.slice(6) : argument.slice(0, -6)
  }
  if (name === '!catch' && Object.hasOwn(ballAliases, argument)) argument = ballAliases[argument]
  return argument ? name + ' ' + argument : name
}
