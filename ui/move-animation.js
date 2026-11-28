const specific = {
  aquatail: 'water-tail', avalanche: 'icefall', rockslide: 'rockfall', wing: 'wing-sweep',
  quick: 'speed-strike', agility: 'agility', amnesia: 'amnesia', kiss: 'heart-drain',
  drainingkiss: 'heart-drain', giga: 'life-drain', dream: 'life-drain', seed: 'sprout',
  dragondarts: 'darts', tackle: 'tackle', struggle: 'tackle',
  dragondance: 'dragon-dance', calmmind: 'meditate', cosmicpower: 'stars', nastyplot: 'scheme',
  growth: 'sprout', double: 'echo', recover: 'restore', synthesis: 'restore'
}

const named = [
  ['fangs', /bite|fang|crunch|jaw|mord|colmillo/],
  ['punch', /punch|hammer|jab|puño|machada/],
  ['kick', /kick|patada|pisot|stomp/],
  ['claw', /claw|slash|cutter|blade|scissor|scratch|cuchilla|garra|tajo|corte/],
  ['horn', /horn|drill|peck|beak|cuerno|picot|taladro/],
  ['tail', /tail|aqua cola|cola/],
  ['speed-strike', /dash|charge|volt.?switch|nitro|acua.?jet|veloc/],
  ['spin', /spin|roll|tornado|whirl|giro|rodar/],
  ['slam', /slam|headbutt|crash|drop|placaje|choque|golpe cabeza/],
  ['ripple', /voice|song|scream|roar|pulse|wave|voz|canto|pulso|onda|grito/],
  ['life-drain', /drain|absor|drena/],
  ['stars', /star|comet|meteor|cosmic|meteoro|cometa/],
  ['sprout', /pollen|seed|spore|powder|polvo|semilla|espora/],
  ['restore', /heal|wish|cure|cura|deseo/]
]

const defaults = {
  rush:'tackle', maneuver:'speed-strike', projectile:'bolt', area:'eruption', target:'mark',
  support:'restore', guard:'ward', pierce:'ripple', ultimate:'ultimate'
}

export function moveAnimation(id, move) {
  return specific[id] ?? (move.teamBarrier || move.protect ? 'ward' : move.heal ? 'restore' :
    named.find(([, pattern]) => pattern.test(id + ' ' + move.name))?.[0] ?? defaults[move.kind] ?? 'mark')
}
