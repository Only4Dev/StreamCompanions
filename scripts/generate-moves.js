import { writeFileSync, readFileSync } from 'node:fs'
import { activeLearnsets, battleMovePp, moveBaseReach, moveCooldown, moveDamageClass, moveElement, movePp, moves } from '../dev/battle.js'
import { tmLearn } from '../ui/tm.js'
import raidBosses from '../ui/raid-bosses.json' with { type: 'json' }
import combatBalance from '../ui/combat-balance.json' with { type: 'json' }

const techniques = {
  projectile: 'Dispara un proyectil hacia el rival.',
  rush: 'Se abalanza sobre el rival y golpea al contacto.',
  area: 'Ataca dentro del área de impacto.',
  target: 'Apunta a un rival dentro del alcance.',
  pierce: 'Golpea a los rivales en línea.',
  support: 'Afecta a compañeros del mismo viewer.',
  guard: 'Activa un efecto de campo, defensa o mejora.',
  maneuver: 'Se reposiciona antes de infligir daño.'
}
const stats = { attack: 'Ataque', defense: 'Defensa', specialAttack: 'Ataque Especial', specialDefense: 'Defensa Especial', speed: 'Velocidad' }
const states = { paralysis: 'parálisis', sleep: 'sueño', burn: 'quemadura', freeze: 'congelación', poison: 'veneno' }
const pct = amount => (Math.round(amount * 10000) / 100) + '%'
const learnsets = activeLearnsets()
const species = Object.values(learnsets.species)
const normal = new Set(species.flatMap(entry => entry.moves.map(([id]) => id)))
const signatures = new Set(species.flatMap(entry => entry.signature?.[0] ?? []))
const bosses = [...(learnsets.raidBosses?.bosses ?? []), ...raidBosses.bosses]
const assignedBossMoves = new Set(bosses.flatMap(boss => [...(boss.moves ?? []), boss.ultimate]))
const families = Object.values(tmLearn.families)
const tm = new Set(families.flatMap(family => family.standard))
const ancestral = new Set(families.flatMap(family => family.ancestral))

function describe(move) {
  const text = [move.ultimate ? 'Ataque definitivo que requiere llenar el medidor de carga.' : techniques[move.kind]]
  if (move.count > 1) text.push('Ejecuta ' + move.count + ' golpes.')
  if (move.pulses > 1) text.push('Se desarrolla en ' + move.pulses + ' pulsos.')
  if (move.effect && move.chance) text.push('Puede causar ' + states[move.effect] + ' con probabilidad de ' + pct(move.chance) + '.')
  if (move.flinch) text.push('Puede amedrentar con probabilidad de ' + pct(move.flinch) + '.')
  if (move.stages) {
    text.push('Sube ' + Object.entries(move.stages).map(([stat, value]) => stats[stat] + ' +' + value).join(' y ') +
      ' (' + pct(combatBalance.stages.perStage) + ' por nivel).')
  } else if (move.boost) {
    text.push('Mejora temporalmente ' + ({ mind: 'la Defensa Especial', speed: 'la Velocidad', evasion: 'la evasión' })[move.boost] + '.')
  }
  if (move.healAlly) text.push('Cura al aliado seleccionado un ' + pct(move.healAlly) + ' de sus PS máximos.')
  if (move.healTeam) text.push('Cura a los aliados en el área un ' + pct(move.healTeam) + ' de sus PS máximos.')
  if (move.heal) text.push('Recupera el ' + pct(move.heal) + ' de los PS máximos del usuario.')
  if (move.reviveAlly) text.push('Revive al último compañero caído con ' + pct(move.reviveAlly) + ' de sus PS máximos.')
  if (move.teamCleanse) text.push('Quita los estados del equipo.')
  if (move.teamBoost) text.push('Aumenta el daño del equipo un ' + pct(move.teamBoost) + '.')
  if (move.teamBarrier) {
    const damage = { physical: 'físico', special: 'especial', both: 'físico y especial' }
    text.push('Escudo para el equipo. Absorbe daño ' + damage[move.teamBarrier] + ' hasta el 20% de los PS máximos de cada aliado.')
  }
  if (move.hazard) text.push(move.hazard === 'web' ? 'Coloca redes que inmovilizan.' : 'Coloca una trampa venenosa.')
  if (move.protect) text.push('Bloquea ataques normales brevemente.')
  if (move.field) text.push('Cambia el campo a ' + move.field + '.')
  if (move.drain) text.push('Recupera PS equivalentes al ' + pct(move.drain) + ' del daño causado.')
  if (move.ongoing || move.leech) text.push('Produce daño periódico.')
  if (move.slow) text.push('Ralentiza al objetivo.')
  if (move.push || move.displace) text.push('Desplaza al objetivo.')
  if (move.chain) text.push('Puede encadenarse a otros rivales.')
  if (move.struggle) return 'Inflige el 20% de los PS de referencia del rival y causa daño de retroceso al usuario.'
  return text.join(' ')
}

const categories = { normal: [], firma: [], jefe: [], tm: [], tmAncestral: [], definitivo: [], apoyo: [], mejora: [], sistema: [], sinAsignar: [] }
const attacks = {}
for (const [id, move] of Object.entries(moves).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  const category = []
  if (normal.has(id)) category.push('normal')
  if (signatures.has(id)) category.push('firma')
  if (assignedBossMoves.has(id)) category.push('jefe')
  if (tm.has(id)) category.push('tm')
  if (ancestral.has(id)) category.push('tmAncestral')
  if (move.ultimate) category.push('definitivo')
  if (move.tags?.includes('support')) category.push('apoyo')
  if (move.stages || move.boost) category.push('mejora')
  if (move.struggle) category.push('sistema')
  if (!category.some(key => ['normal', 'firma', 'jefe', 'tm', 'tmAncestral', 'definitivo', 'sistema'].includes(key))) category.push('sinAsignar')
  for (const key of category) categories[key].push(id)
  attacks[id] = {
    nombre: move.name, descripcion: describe(move), categorias: category, tipo: moveElement(move),
    clase: moveDamageClass(move), potenciaBase: move.power, pp: move.struggle ? null : movePp(move),
    ppJugadorIncursion: move.struggle ? null : battleMovePp(move, true, false),
    alcance: moveBaseReach(move), recargaSegundos: move.ultimate ? null : moveCooldown(move),
    estado: move.effect ?? null, probabilidadEstado: move.effect ? move.chance ?? 0 : 0,
    etiquetas: move.tags ?? [], niveles: move.stages, duracionSegundos: move.duration
  }
}

const output = new URL('../ui/moves.json', import.meta.url)
const catalog = {
  notas: 'Los índices usan IDs de ataques. Una entrada puede pertenecer a varias categorías. Los datos salen del motor y de los JSON incluidos en el repositorio. Regenera con npm run moves:generate.',
  total: Object.keys(attacks).length, categorias: categories, ataques: attacks
}
const json = JSON.stringify(catalog, null, 2) + '\n'
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8').replaceAll('\r\n', '\n') !== json) throw new Error('Ejecuta npm run moves:generate')
} else writeFileSync(output, json)
