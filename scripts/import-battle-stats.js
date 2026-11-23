import { writeFile } from 'node:fs/promises'
const revision = process.argv[2]
if (!/^[a-f0-9]{40}$/.test(revision ?? '')) throw Error('Provide a PokéAPI Git revision')
const base = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/' + revision + '/data/v2/csv/'
async function rows(file) {
  const response = await fetch(base + file + '.csv')
  if (!response.ok) throw Error(file + ': ' + response.status)
  return (await response.text()).trim().split(/\r?\n/).slice(1).map(row => row.split(','))
}
const [stats, typing, species, types, efficacy, sourceMoves, sourceLearnsets] = await Promise.all(
  ['pokemon_stats', 'pokemon_types', 'pokemon_species', 'types', 'type_efficacy', 'moves', 'pokemon_moves'].map(rows))
const names = Object.fromEntries(types.map(([id, name]) => [id, name]))
const evolves = new Set(species.map(([, , , parent]) => Number(parent)))
const parents = new Map(species.map(([id, , , parent]) => [Number(id), Number(parent)]))
const specialSpecies = new Set(species.filter(row => row[16] === '1' || row[17] === '1').map(([id]) => Number(id)))
const roster = Array.from({ length: 1025 }, (_, index) => {
  const id = index + 1
  const baseStats = stats.filter(([speciesId, stat]) => Number(speciesId) === id && Number(stat) <= 6)
    .sort((a, b) => Number(a[1]) - Number(b[1])).map(row => Number(row[2]))
  const types = typing.filter(([speciesId]) => Number(speciesId) === id).map(([, type]) => names[type])
  if (baseStats.length !== 6 || !types.length) throw Error('Incomplete data: ' + id)
  return [id, baseStats, types, !evolves.has(id), parents.get(id) || null, specialSpecies.has(id)]
})
const matchups = Object.fromEntries(efficacy.filter(([, , factor]) => factor !== '100')
  .map(([attack, defense, factor]) => [names[attack] + ':' + names[defense], Number(factor) / 100]))
const supported = {
  tackle: 'tackle', 'quick-attack': 'quick', bite: 'bite', headbutt: 'headbutt', slash: 'slash',
  swift: 'swift', 'hyper-voice': 'pulse', ember: 'ember', 'will-o-wisp': 'wisp', 'heat-wave': 'heat', 'fire-blast': 'fireblast',
  'water-gun': 'water', 'bubble-beam': 'bubbles', surf: 'surf', 'hydro-pump': 'hydro', 'rain-dance': 'rain',
  'razor-leaf': 'leaf', 'bullet-seed': 'bullet', 'leech-seed': 'seed', 'giga-drain': 'giga',
  'sleep-powder': 'spores', spore: 'spores', 'solar-beam': 'solar', 'ice-beam': 'ice', 'frost-breath': 'frost',
  blizzard: 'blizzard', 'icicle-spear': 'spear', 'thunder-shock': 'thunder', discharge: 'discharge', thunder: 'lightning',
  confusion: 'confusion', psychic: 'psychic', 'dream-eater': 'dream', hypnosis: 'hypnosis', teleport: 'teleport',
  amnesia: 'amnesia', agility: 'agility', 'double-team': 'double', protect: 'guard',
  'poison-sting': 'sting', acid: 'acid', sludge: 'poison', 'poison-jab': 'jab', 'toxic-spikes': 'spikes',
  'mud-shot': 'mud', bulldoze: 'bulldoze', earthquake: 'quake', 'rock-throw': 'rocks', rollout: 'roll',
  'low-kick': 'kick', 'focus-punch': 'focus', 'dynamic-punch': 'punch', 'drain-punch': 'drainpunch', 'aura-sphere': 'aura',
  'wing-attack': 'wing', peck: 'peck', gust: 'gust', 'air-slash': 'air', 'horn-attack': 'horn',
  'x-scissor': 'lunge', 'bug-buzz': 'buzz', 'string-shot': 'string', 'shadow-ball': 'shadow',
  'dragon-breath': 'dragon', 'dragon-claw': 'claw', 'meteor-mash': 'meteor',
  'draining-kiss': 'kiss', 'disarming-voice': 'fairy'
}
const moveIds = new Map(sourceMoves.filter(([, slug]) => supported[slug]).map(([id, slug]) => [Number(id), supported[slug]]))
const learned = roster.map(() => new Map())
for (const [speciesId, , moveId, method, sourceLevel] of sourceLearnsets) {
  const source = learned[Number(speciesId) - 1]
  const key = moveIds.get(Number(moveId))
  if (!source || !key) continue
  const at = method === '1' ? Math.max(1, Math.min(20, Math.ceil(Number(sourceLevel) / 2))) : 15
  if (!source.has(key) || at < source.get(key)) source.set(key, at)
}
await writeFile('dev/national-stats.js', '// PokéAPI CSV revision ' + revision + '\nexport const nationalStats = [\n' +
  roster.map(row => '  ' + JSON.stringify(row)).join(',\n') + '\n]\nexport const typeChart = ' + JSON.stringify(matchups, null, 2) +
  '\nexport const nationalLearnsets = [\n' + learned.map(map => '  ' +
    JSON.stringify([...map].sort(([a], [b]) => a.localeCompare(b)))).join(',\n') + '\n]\n')
await writeFile('ui/evolution-data.js', '// Evolution parents from the same PokéAPI data as the battle roster.\n' +
  'export const evolutionParents = [\n' + Array.from({ length: Math.ceil(roster.length / 25) }, (_, index) =>
    '  ' + roster.slice(index * 25, index * 25 + 25).map(row => row[4] ?? 0).join(', ')).join(',\n') + '\n]\n')
