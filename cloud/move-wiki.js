import { activeLearnsets, battleMovePp, moveBaseReach, moveCooldown, moveDamageClass, moveElement, movePp, moves } from '../dev/battle.js'
import combatBalance from '../ui/combat-balance.json' with { type: 'json' }

const languagePair = {
  normal:['Normal','Normal'], fighting:['Lucha','Fighting'], flying:['Volador','Flying'], poison:['Veneno','Poison'],
  ground:['Tierra','Ground'], rock:['Roca','Rock'], bug:['Bicho','Bug'], ghost:['Fantasma','Ghost'], steel:['Acero','Steel'],
  fire:['Fuego','Fire'], water:['Agua','Water'], grass:['Planta','Grass'], electric:['Eléctrico','Electric'], psychic:['Psíquico','Psychic'],
  ice:['Hielo','Ice'], dragon:['Dragón','Dragon'], dark:['Siniestro','Dark'], fairy:['Hada','Fairy']
}
const categories = {
  physical:['Físico','Physical'], special:['Especial','Special'], status:['Estado','Status'], adaptive:['Adaptativo','Adaptive'],
  support:['Apoyo','Support'], ultimate:['Definitivo','Ultimate']
}
const techniques = {
  projectile:['Dispara un proyectil que recorre la distancia indicada.','Fires a projectile that travels up to the listed range.'],
  rush:['Se abalanza sobre el rival para golpear al contacto.','Rushes the opponent and strikes on contact.'],
  area:['Golpea a rivales dentro del área de impacto.','Hits opponents within the impact area.'],
  target:['Apunta a un rival dentro del alcance.','Targets one opponent within range.'],
  pierce:['Barre a los rivales en línea dentro del alcance.','Sweeps opponents in a line within range.'],
  support:['Actúa sobre Pokémon del equipo del mismo viewer.','Affects Pokémon on the same viewer’s team.'],
  guard:['Activa un efecto defensivo, de campo o de apoyo.','Activates a defensive, field or support effect.'],
  maneuver:['Se reposiciona antes de atacar al objetivo.','Repositions before striking its target.']
}
const states = {
  paralysis:['Parálisis','Paralysis'], sleep:['Sueño','Sleep'], burn:['Quemadura','Burn'], freeze:['Congelación','Freeze'], poison:['Veneno','Poison']
}
const get = (record, key, index) => record[key]?.[index] ?? key
const stageLabels = {
  attack:['Ataque','Attack'], defense:['Defensa','Defense'], specialAttack:['Ataque Especial','Special Attack'],
  specialDefense:['Defensa Especial','Special Defense'], speed:['Velocidad','Speed']
}

export function renderMovesWiki(url, language, escape) {
  const en = language === 'en'
  const index = Number(en)
  const l = (es, english) => en ? english : es
  const number = new Intl.NumberFormat(en ? 'en' : 'es', { maximumFractionDigits: 2 })
  const pct = fraction => number.format(fraction * 100) + '%'
  const seconds = time => number.format(time) + ' s'
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 80)
  const type = url.searchParams.get('tipo') ?? ''
  const category = url.searchParams.get('categoria') ?? ''
  const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  const options = (items, active) => '<option value="">' + l('Todos', 'All') + '</option>' +
    Object.entries(items).map(([id, labels]) => '<option value="' + id + '"' + (id === active ? ' selected' : '') + '>' + labels[index] + '</option>').join('')
  const source = activeLearnsets().moves
  const cards = Object.entries(moves).filter(([id, move]) =>
    (!Object.hasOwn(languagePair, type) || moveElement(move) === type) &&
    (!Object.hasOwn(categories, category) || (category === 'support' ? move.tags?.includes('support') :
      category === 'ultimate' ? move.ultimate : moveDamageClass(move) === category)) &&
    (!query || normalize(move.name + ' ' + id).includes(normalize(query))))
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, language))
    .map(([id, move]) => {
      const element = moveElement(move)
      const labels = [get(languagePair, element, index), get(categories, moveDamageClass(move), index)]
      if (move.tags?.includes('support')) labels.push(get(categories, 'support', index))
      if (move.ultimate) labels.push(get(categories, 'ultimate', index))
      const stats = []
      const stat = (es, english, value) => stats.push('<div><dt>' + l(es, english) + '</dt><dd>' + escape(String(value)) + '</dd></div>')
      stat('Potencia base (BP)', 'Base power (BP)', move.power + (move.count ? ' × ' + move.count : ''))
      if (!move.struggle) stat('PP', 'PP', movePp(move))
      if (!move.struggle && battleMovePp(move, true, false) !== movePp(move)) {
        stat('PP del jugador en incursión', 'Player raid PP', battleMovePp(move, true, false))
      }
      if (!move.ultimate) stat('Recarga', 'Cooldown', seconds(moveCooldown(move)))
      else stat('Activación', 'Activation', l('Medidor de carga', 'Charge meter'))
      if (moveBaseReach(move) > 0) stat('Alcance', 'Range', number.format(moveBaseReach(move)))
      if (move.channel) stat('Canalización', 'Channel time', seconds(move.channel))
      if (move.duration) stat('Duración', 'Duration', seconds(move.duration))
      if (move.pulses > 1) stat('Pulsos', 'Pulses', move.pulses)
      const effects = []
      if (move.effect) effects.push(get(states, move.effect, index) + ' · ' + pct(move.chance ?? 0))
      if (move.flinch) effects.push(l('Amedrentar', 'Flinch') + ' · ' + pct(move.flinch))
      if (move.healAlly) effects.push(l('Cura a un aliado herido', 'Heals one injured ally') + ' · ' + pct(move.healAlly))
      if (move.healTeam) effects.push(l('Cura a los aliados heridos en el área', 'Heals injured allies in the area') + ' · ' + pct(move.healTeam))
      if (move.teamBarrier) effects.push(l('Escudo por aliado: 20% de sus PS máximos', 'Shield per ally: 20% of maximum HP') + ' · ' +
        get(categories, move.teamBarrier, index).replace('both', l('Ambas clases', 'Both classes')))
      if (move.teamBoost) effects.push(l('Daño del equipo', 'Team damage') + ' +' + pct(move.teamBoost))
      if (move.teamCleanse) effects.push(l('Quita estados a los aliados del equipo', 'Clears statuses from teammates'))
      if (move.reviveAlly) effects.push(l('Revive al último compañero caído', 'Revives the last fainted teammate') + ' · ' + pct(move.reviveAlly))
      if (move.heal) effects.push(l('Cura al usuario', 'Heals the user') + ' · ' + pct(move.heal))
      if (move.drain) effects.push(l('Recupera PS según el daño causado', 'Restores HP based on damage dealt') + ' · ' + pct(move.drain))
      if (move.leech) effects.push(l('Drena PS con el tiempo', 'Drains HP over time'))
      if (move.ongoing) effects.push(l('Inflige daño periódico', 'Deals damage over time'))
      if (move.protect) effects.push(l('Bloquea ataques normales brevemente', 'Briefly blocks standard attacks'))
      if (move.slow) effects.push(l('Ralentiza al objetivo', 'Slows the target'))
      if (move.push || move.displace) effects.push(l('Desplaza al objetivo', 'Displaces the target'))
      if (move.hazard) effects.push(move.hazard === 'web' ? l('Coloca redes que inmovilizan', 'Places webs that root targets') : l('Coloca una trampa venenosa', 'Places a poison trap'))
      if (move.field) effects.push(l('Cambia el campo:', 'Changes the field:') + ' ' + move.field)
      if (move.boost) effects.push(l('Aumenta una estadística del usuario:', 'Raises a user stat:') + ' ' + move.boost)
      if (move.stages) {
        effects.push(Object.entries(move.stages).map(([key, value]) => get(stageLabels, key, index) + ' +' + value).join(' · '))
        effects.push(pct(combatBalance.stages.perStage) + l(' por nivel hasta un máximo de ', ' per stage up to ') + combatBalance.stages.max)
      }
      if (move.blink || move.teleportBehind) effects.push(l('Teletransporta al usuario', 'Teleports the user'))
      if (move.chain) effects.push(l('Puede encadenarse a otros rivales:', 'Can chain to additional opponents:') + ' ' + move.chain)
      if (move.tags?.includes('cut')) effects.push(l('Ataque de corte', 'Cutting move'))
      if (move.tags?.includes('bite')) effects.push(l('Ataque de mordida', 'Biting move'))
      if (move.struggle) effects.push(l('Hace un 20% de los PS de referencia del rival y provoca retroceso al usuario.', 'Deals 20% of the opponent’s reference HP and causes recoil to the user.'))
      if (move.tags?.includes('support')) effects.push(l('Solo afecta al equipo del mismo viewer.', 'Only affects the same viewer’s team.'))
      const info = move.ultimate ? l('Ataque definitivo. Requiere carga y puede tener varias fases.', 'Ultimate move. Requires charge and may have multiple phases.') :
        get(techniques, move.kind, index)
      return '<details class="wiki-move"><summary><strong>' + escape(move.name) + '</strong><span>' + labels.join(' · ') + '</span></summary>' +
        '<p>' + escape(info) + '</p><dl class="wiki-move-stats">' + stats.join('') + '</dl>' +
        (effects.length ? '<ul>' + effects.map(effect => '<li>' + escape(effect) + '</li>').join('') + '</ul>' : '') +
        (source[id]?.notes ? '<p class="meta">' + escape(source[id].notes) + '</p>' : '') + '</details>'
    })
  const filters = new URLSearchParams()
  for (const key of ['community', 'region', 'theme', 'lang']) {
    if (url.searchParams.has(key)) filters.set(key, url.searchParams.get(key))
  }
  filters.set('lang', language)
  const context = [...filters].map(([key, value]) => '<input type="hidden" name="' + key + '" value="' + escape(value) + '">').join('')
  return '<section class="sheet wiki"><h1>Wiki</h1><nav class="tabs" aria-label="Wiki"><a href="/wiki/movimientos?' + escape(filters.toString()) + '" aria-current="page">' +
    l('Movimientos', 'Moves') + '</a></nav><h2>' + l('Movimientos', 'Moves') + '</h2><p class="meta">' +
    l('La potencia base no es daño fijo. El daño real depende de las estadísticas, el tipo y los efectos activos.',
      'Base power is not fixed damage. Actual damage depends on stats, type and active effects.') +
    ' ' + l('Los proyectiles de jefes pueden tener alcance adicional.', 'Boss projectiles may have additional range.') +
    ' <a href="/data/moves.json" download="moves.json">' + l('Descargar catálogo JSON', 'Download JSON catalog') + '</a></p>' +
    '<form class="wiki-filters" method="get" action="/wiki/movimientos">' + context +
    '<label>' + l('Buscar movimiento', 'Search moves') + '<input type="search" name="q" maxlength="80" value="' + escape(query) + '"></label>' +
    '<label>' + l('Tipo elemental', 'Elemental type') + '<select name="tipo">' + options(languagePair, type) + '</select></label>' +
    '<label>' + l('Categoría', 'Category') + '<select name="categoria">' + options(categories, category) + '</select></label>' +
    '<button>' + l('Filtrar', 'Filter') + '</button></form><p role="status">' +
    (cards.length ? cards.length + l(' movimientos', ' moves') : l('Sin coincidencias', 'No matches')) + '</p>' + cards.join('') + '</section>'
}
