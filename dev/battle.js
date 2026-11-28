import baseStatsData from '../ui/base-stats.json' with { type: 'json' }
import bundledLearnsets from '../ui/learnsets.json' with { type: 'json' }
import { nationalStats, typeChart } from './national-stats.js'
import { ultimateLevel } from '../ui/levels.js'
import { regionalSpecies } from '../ui/regional-species.js'
import { evolutionChildren, evolutionParent, nextEvolutionLevel } from '../ui/evolution.js'

import { abilitiesFor, battleFormAssets, hasPoisonHeal } from '../ui/abilities.js'
import { heldItems } from '../ui/held-items.js'

export const arena = { width: 1920, height: 550, floor: 380 }
const ultimateSpecs = {
  normal: ['Hiperrayo', 'beam', 86],
  fire: ['Vórtice de Fuego', 'vortex', 22, 4],
  water: ['Triple Oleaje', 'waves', 29, 3],
  electric: ['Tormenta Bifurcada', 'thunder', 57, 2],
  ice: ['Rayo Glacial', 'ice', 57],
  grass: ['Rayo Solar Supremo', 'beam', 91],
  fighting: ['Combate Cercano', 'combo', 10, 10],
  poison: ['Lanzamugre', 'trash', 108],
  ground: ['Fisura', 'fissure', 75],
  flying: ['Tornado Ascendente', 'tornado', 15, 4],
  psychic: ['Caída Telequinética', 'telekinesis', 66, 2],
  bug: ['Red de Polen', 'web', 55, 2],
  rock: ['Lluvia de Meteoritos', 'meteors', 23, 4],
  ghost: ['Pesadilla Colectiva', 'nightmare', 0, 2],
  dragon: ['Cometa Draco', 'comets', 27, 4],
  dark: ['Pulso Nocturno', 'orbs', 19, 5],
  steel: ['Viga Colosal', 'girder', 32, 3],
  fairy: ['Bruma Explosiva', 'mist', 17, 5]
}
const ultimates = Object.fromEntries(Object.entries(ultimateSpecs).map(([type, [name, visual, power, pulses = 1]]) =>
  ['ultimate-' + type, { name, visual, power, pulses, type, kind: 'ultimate', ultimate: type, reach: arena.width }]))
let learnsets = bundledLearnsets
const moves = {
  raidvinewave: { name: 'Ola de Enredaderas', type: 'grass', kind: 'area', power: 54, reach: 300, pp: 12, cooldown: 5, visual: 'storm' },
  raidtorrent: { name: 'Marea Dinamax', type: 'water', kind: 'area', power: 57, reach: 330, pp: 12, cooldown: 5.3, visual: 'storm' },
  raidthunder: { name: 'Trueno de la Cumbre', type: 'electric', kind: 'area', power: 64, reach: 340, pp: 10, cooldown: 6.5, visual: 'electric' },
  raidshellslam: { name: 'Impacto de Caparazón', type: 'water', kind: 'area', damageClass: 'physical', power: 69, reach: 320, pp: 12, cooldown: 6, visual: 'storm' },
  raidwildfire: { name: 'Llamarada Gigamax', type: 'fire', kind: 'area', power: 72, reach: 370, pp: 12, cooldown: 7, effect: 'burn', chance: .18, visual: 'storm' },
  raiddragonstorm: { name: 'Tempestad Dragón', type: 'dragon', kind: 'area', power: 67, reach: 370, pp: 12, cooldown: 6.5, visual: 'storm' },
  raidmeteorcrash: { name: 'Colisión Meteórica', type: 'steel', kind: 'area', damageClass: 'physical', power: 74, reach: 345, pp: 11, cooldown: 6.4, visual: 'storm' },
  raidcreamwave: { name: 'Cascada de Crema Gigamax', type: 'fairy', kind: 'area', power: 67, reach: 355, pp: 11, cooldown: 6, visual: 'storm' },
  dragonclaw: { name: 'Garra Dragón', type: 'dragon', kind: 'rush', power: 52, reach: 145, pp: 10, cooldown: 2.8, animation: 'Scratch' },
  outrage: { name: 'Enfado', type: 'dragon', kind: 'rush', power: 76, reach: 165, pp: 5, cooldown: 7, selfConfuse: 2.4 },
  dragonpulse: { name: 'Pulso Dragón', type: 'dragon', kind: 'projectile', power: 54, reach: 550, pp: 10, cooldown: 3 },
  dracometeor: { name: 'Cometa Draco', type: 'dragon', kind: 'target', power: 75, reach: 490, pp: 5, cooldown: 7, visual: 'meteors' },
  dualchop: { name: 'Golpe Bis', type: 'dragon', kind: 'projectile', damageClass: 'physical', power: 21, count: 2, reach: 345, pp: 8, cooldown: 3.4 },
  rockblast: { name: 'Pedrada', type: 'rock', kind: 'projectile', damageClass: 'physical', power: 15, count: 3, reach: 430, pp: 8, cooldown: 3.5 },
  watershuriken: { name: 'Shuriken de Agua', type: 'water', kind: 'projectile', power: 15, count: 3, reach: 475, pp: 8, cooldown: 3.4 },
  bonemerang: { name: 'Huesomerang', type: 'ground', kind: 'projectile', damageClass: 'physical', power: 24, count: 2, reach: 420, pp: 8, cooldown: 3.4 },
  aquatail: { name: 'Acua Cola', type: 'water', kind: 'rush', power: 55, reach: 135, pp: 10, cooldown: 3 },
  flamecharge: { name: 'Nitrocarga', type: 'fire', kind: 'rush', power: 46, reach: 155, pp: 10, cooldown: 2.7 },
  thunderpunch: { name: 'Puño Trueno', type: 'electric', kind: 'rush', power: 48, reach: 145, pp: 10, cooldown: 2.8, effect: 'paralysis', chance: .12 },
  powergem: { name: 'Joya de Luz', type: 'rock', kind: 'projectile', power: 54, reach: 475, pp: 10, cooldown: 3.2 },
  earthpower: { name: 'Tierra Viva', type: 'ground', kind: 'target', power: 57, reach: 405, pp: 10, cooldown: 3.6 },
  pollenpuff: { name: 'Bola de Polen', type: 'bug', kind: 'support', healAlly: .25, power: 0, reach: 500, pp: 2, cooldown: 9 },
  healpulse: { name: 'Pulso Cura', type: 'psychic', kind: 'support', healAlly: .32, power: 0, reach: 500, pp: 2, cooldown: 11 },
  ...ultimates,
  struggle: { name: 'Forcejeo', type: 'normal', kind: 'rush', power: 1, reach: 160, cooldown: 1.15, struggle: true },
  judgment: { name: 'Sentencia', type: 'normal', kind: 'target', power: 56, reach: 430 },
  multiattack: { name: 'Multiataque', type: 'normal', kind: 'rush', power: 53, reach: 140 },
  technoblast: { name: 'Tecno Shock', type: 'normal', kind: 'projectile', power: 56, reach: 520 },
  relicsong: { name: 'Canto Arcaico', type: 'normal', kind: 'area', power: 36, reach: 350 },
  payday: { name: 'Día de Pago', type: 'normal', kind: 'projectile', power: 32, reach: 480, reward: 50 },
  makeitrain: { name: 'Fiebre Dorada', type: 'steel', kind: 'area', power: 45, reach: 375, reward: 100 },
  dragondarts: { name: 'Dracoflechas', type: 'dragon', kind: 'projectile', damageClass: 'physical', power: 26, reach: 510, count: 2, visual: 'dreepy' },
  tackle: { name: 'Placaje', type: 'normal', kind: 'rush', power: 34, reach: 110 },
  ember: { name: 'Ascuas', type: 'fire', kind: 'projectile', power: 28, reach: 510, effect: 'burn', chance: .1 },
  water: { name: 'Pistola Agua', type: 'water', kind: 'projectile', power: 28, reach: 510 },
  leaf: { name: 'Hoja Afilada', type: 'grass', kind: 'projectile', damageClass: 'physical', power: 28, reach: 510 },
  pulse: { name: 'Pulso', type: null, kind: 'projectile', power: 24, reach: 510 },
  guard: { name: 'Protección', type: 'normal', kind: 'guard', power: 0, reach: 0, protect: true, pp: 5, cooldown: 7 },
  recover: { name: 'Recuperación', type: 'normal', kind: 'guard', power: 0, reach: 0, heal: .4, pp: 1, cooldown: 10 },
  synthesis: { name: 'Síntesis', type: 'grass', kind: 'guard', power: 0, reach: 0, heal: .4, pp: 1, cooldown: 10 },
  saltcure: { name: 'Salazón', type: 'rock', kind: 'target', visual: 'salt', power: 28, reach: 350, ongoing: 'salt', cooldown: 7 },
  wrap: { name: 'Constricción', type: 'normal', kind: 'target', visual: 'wrap', power: 18, reach: 145, ongoing: 'wrap', cooldown: 6 },
  infestation: { name: 'Acoso', type: 'bug', kind: 'target', visual: 'infestation', power: 23, reach: 280, ongoing: 'infestation', cooldown: 7 },
  dig: { name: 'Excavar', type: 'ground', kind: 'maneuver', visual: 'dig', damageClass: 'physical', power: 66, reach: 430, cooldown: 10 },
  fly: { name: 'Vuelo', type: 'flying', kind: 'maneuver', visual: 'fly', damageClass: 'physical', power: 69, reach: 460, cooldown: 11 },
  pin: { name: 'Pin Misil', type: 'bug', kind: 'projectile', visual: 'bullet', damageClass: 'physical', power: 16, count: 3, reach: 390 },
  thunder: { name: 'Impactrueno', type: 'electric', kind: 'projectile', power: 27, reach: 510, effect: 'paralysis', chance: .1 },
  ice: { name: 'Rayo Hielo', type: 'ice', kind: 'projectile', power: 29, reach: 510, effect: 'freeze', chance: .1 },
  frost: { name: 'Vaho Gélido', type: 'ice', kind: 'target', visual: 'frost', power: 43, reach: 430, effect: 'freeze', chance: .15, cooldown: 3.2 },
  lightning: { name: 'Trueno', type: 'electric', kind: 'target', visual: 'lightning', power: 56, reach: 500, effect: 'paralysis', chance: .2, cooldown: 4.8 },
  hydro: { name: 'Hidrobomba', type: 'water', kind: 'projectile', visual: 'hydro', power: 62, reach: 590, recoil: 960, push: 900, cooldown: 4.5 },
  bubbles: { name: 'Rayo Burbuja', type: 'water', kind: 'projectile', visual: 'bubbles', power: 38, reach: 475, cooldown: 2.2 },
  fireblast: { name: 'Llamarada', type: 'fire', kind: 'projectile', visual: 'fireblast', power: 68, reach: 560,
    push: 620, effect: 'burn', chance: .1, cooldown: 5 },
  aura: { name: 'Esfera Aural', type: 'fighting', kind: 'projectile', visual: 'aura', power: 55, reach: 510, recoil: 300, cooldown: 3.6 },
  rain: { name: 'Danza Lluvia', kind: 'guard', field: 'rain', cooldown: 15 },
  sun: { name: 'Día Soleado', kind: 'guard', field: 'sun', cooldown: 15 },
  hail: { name: 'Granizo', type: 'ice', kind: 'guard', field: 'hail', cooldown: 15 },
  sandstorm: { name: 'Tormenta de Arena', type: 'rock', kind: 'guard', field: 'sandstorm', cooldown: 15 },
  electricField: { name: 'Campo Eléctrico', kind: 'guard', field: 'electric', cooldown: 15 },
  grassField: { name: 'Campo de Hierba', kind: 'guard', field: 'grass', cooldown: 15 },
  confusion: { name: 'Confusión', type: 'psychic', kind: 'projectile', power: 30, reach: 450 },
  poison: { name: 'Residuos', type: 'poison', kind: 'projectile', power: 25, reach: 420, effect: 'poison', chance: .3 },
  spikes: { name: 'Espinas', type: 'poison', kind: 'target', power: 0, reach: 330, hazard: true, cooldown: 8 },
  spores: { name: 'Somnífero', type: 'grass', kind: 'projectile', power: 0, reach: 330, effect: 'sleep', chance: .55 },
  agility: { name: 'Agilidad', kind: 'guard', boost: 'speed' },
  double: { name: 'Doble Equipo', kind: 'guard', boost: 'evasion' },
  amnesia: { name: 'Amnesia', kind: 'guard', boost: 'mind' },
  quick: { name: 'Ataque Rápido', type: 'normal', kind: 'rush', power: 41, reach: 145, animation: 'Charge' },
  bite: { name: 'Mordisco', type: 'dark', kind: 'rush', power: 47, reach: 110, animation: 'Bite', flinch: .1 },
  wing: { name: 'Ataque Ala', type: 'flying', kind: 'rush', power: 45, reach: 145 },
  claw: { name: 'Garra Dragón', type: 'dragon', kind: 'rush', power: 57, reach: 140, animation: 'Scratch' },
  kick: { name: 'Patada Baja', type: 'fighting', kind: 'rush', power: 49, reach: 130, animation: 'Kick' },
  punch: { name: 'Puño Dinámico', type: 'fighting', kind: 'rush', visual: 'punch', power: 61, reach: 128, animation: 'Strike', cooldown: 3.4 },
  roll: { name: 'Desenrollar', type: 'rock', kind: 'rush', power: 50, reach: 160, animation: 'Roll' },
  jab: { name: 'Puya Nociva', type: 'poison', kind: 'rush', power: 50, reach: 120, effect: 'poison', chance: .25 },
  lunge: { name: 'Tijera X', type: 'bug', kind: 'rush', power: 55, reach: 140 },
  meteor: { name: 'Puño Meteoro', type: 'steel', kind: 'rush', power: 55, reach: 130 },
  quake: { name: 'Terremoto', type: 'ground', kind: 'area', damageClass: 'physical', visual: 'quake', power: 62, reach: 380 },
  bulldoze: { name: 'Terratemblor', type: 'ground', kind: 'area', damageClass: 'physical', visual: 'quake', power: 37, reach: 170 },
  blizzard: { name: 'Ventisca', type: 'ice', kind: 'area', visual: 'storm', power: 62, reach: 355, effect: 'freeze', chance: .1 },
  discharge: { name: 'Chispazo', type: 'electric', kind: 'area', visual: 'electric', power: 53, reach: 290, effect: 'paralysis', chance: .2 },
  heat: { name: 'Onda Ígnea', type: 'fire', kind: 'area', visual: 'storm', power: 61, reach: 315, effect: 'burn', chance: .1 },
  surf: { name: 'Surf', type: 'water', kind: 'area', visual: 'storm', power: 59, reach: 330 },
  solar: { name: 'Rayo Solar', type: 'grass', kind: 'projectile', visual: 'beam', power: 60, reach: 610, channel: 1, cooldown: 5 },
  focus: { name: 'Puño Certero', type: 'fighting', kind: 'rush', visual: 'punch', power: 76, reach: 160, channel: .8, cooldown: 6 },
  swarm: { name: 'Enjambre de abejas', type: 'bug', kind: 'projectile', visual: 'swarm', power: 48, reach: 435, cooldown: 3.1 },
  seed: { name: 'Drenadoras', type: 'grass', kind: 'target', visual: 'seed', power: 0, reach: 375, cooldown: 9, leech: true },
  giga: { name: 'Gigadrenado', type: 'grass', kind: 'target', visual: 'drain', power: 44, reach: 410, drain: .5, cooldown: 4.1 },
  kiss: { name: 'Beso Drenaje', type: 'fairy', kind: 'target', visual: 'drain', power: 39, reach: 320, drain: .65, cooldown: 4.4 },
  drainpunch: { name: 'Puño Drenaje', type: 'fighting', kind: 'rush', visual: 'drain', power: 53, reach: 134, drain: .5, cooldown: 3.5 },
  wisp: { name: 'Fuego Fatuo', type: 'fire', kind: 'target', visual: 'wisp', power: 0, reach: 360, effect: 'burn', chance: .8, cooldown: 7 },
  teleport: { name: 'Teletransporte', type: 'psychic', kind: 'guard', blink: true, cooldown: 7 },
  dream: { name: 'Come Sueños', type: 'psychic', kind: 'target', visual: 'drain', power: 67, reach: 470, drain: .5, needsSleep: true, cooldown: 4.8 },
  hypnosis: { name: 'Hipnosis', type: 'psychic', kind: 'target', visual: 'psychic', power: 0, reach: 370, effect: 'sleep', chance: .6, cooldown: 7 },
  bullet: { name: 'Semilladora', type: 'grass', kind: 'projectile', damageClass: 'physical', visual: 'bullet', power: 15, reach: 435, count: 3, cooldown: 3.2 },
  spear: { name: 'Carámbano', type: 'ice', kind: 'projectile', damageClass: 'physical', power: 16, reach: 455, count: 3, cooldown: 3.4 },
  horn: { name: 'Cornada', type: 'normal', kind: 'rush', power: 46, reach: 126, cooldown: 1.8, flinch: .1 },
  peck: { name: 'Picotazo', type: 'flying', kind: 'rush', power: 34, reach: 115, animation: 'Strike' },
  sting: { name: 'Picotazo Veneno', type: 'poison', kind: 'projectile', damageClass: 'physical', visual: 'sting', power: 32,
    reach: 335, effect: 'poison', chance: .22, cooldown: 1.4 },
  slash: { name: 'Cuchillada', type: 'normal', kind: 'rush', power: 48, reach: 135, animation: 'Scratch', cooldown: 1.65 },
  swift: { name: 'Rapidez', type: 'normal', kind: 'projectile', visual: 'swift', power: 36, reach: 450 },
  acid: { name: 'Ácido', type: 'poison', kind: 'projectile', power: 29, reach: 395 },
  mud: { name: 'Disparo Lodo', type: 'ground', kind: 'projectile', power: 34, reach: 390 },
  rocks: { name: 'Lanzarrocas', type: 'rock', kind: 'projectile', damageClass: 'physical', power: 36, reach: 370 },
  string: { name: 'Disparo Demora', type: 'bug', kind: 'target', visual: 'string', power: 0, reach: 340, slow: true, cooldown: 5 },
  headbutt: { name: 'Golpe Cabeza', type: 'normal', kind: 'rush', power: 52, reach: 130, flinch: .1 },
  psychic: { name: 'Psíquico', type: 'psychic', kind: 'target', visual: 'psychic', power: 59, reach: 510, cooldown: 3.8 },
  shadow: { name: 'Bola Sombra', type: 'ghost', kind: 'projectile', power: 53, reach: 460, recoil: 630, push: 660, cooldown: 2.8 },
  buzz: { name: 'Zumbido', type: 'bug', kind: 'area', visual: 'storm', power: 51, reach: 230 },
  gust: { name: 'Tornado', type: 'flying', kind: 'projectile', power: 40, reach: 430 },
  air: { name: 'Tajo Aéreo', type: 'flying', kind: 'projectile', power: 43, reach: 465, animation: 'Strike', flinch: .1 },
  dragon: { name: 'Dragoaliento', type: 'dragon', kind: 'projectile', power: 44, reach: 490, effect: 'paralysis', chance: .15 },
  fairy: { name: 'Voz Cautivadora', type: 'fairy', kind: 'area', power: 46, reach: 240 },
}
const originalMoves = Object.fromEntries(Object.entries(moves).map(([key, move]) => [key, {...move}]))
export function applyLearnsets(data) {
  validateLearnsets(data)
  const adjusted = {}
  for (const [key, move] of Object.entries(originalMoves)) {
    const settings = data.moves[key]?.mechanics
    adjusted[key] = {...move}
    for (const [field, min, max] of [['power', 0, 200], ['pp', 1, 99], ['cooldown', .1, 60], ['reach', 0, 4000]]) {
      const value = settings?.[field]
      if (value === undefined) continue
      if (!Number.isFinite(value) || value < min || value > max || field === 'pp' && !Number.isInteger(value)) throw new Error('Invalid move setting: ' + key + '.' + field)
      adjusted[key][field] = value
    }
  }
  for (const [key, move] of Object.entries(moves)) {
    for (const field of ['power', 'pp', 'cooldown', 'reach']) if (!Object.hasOwn(adjusted[key], field)) delete move[field]
    Object.assign(move, adjusted[key])
  }
  learnsets = data
}

export { moves }
const loadouts = {
  1: ['tackle', 'leaf', 'spores', 'solar'],
  4: ['tackle', 'ember', 'claw', 'fireblast'],
  7: ['tackle', 'water', 'ice', 'hydro'],
  10: ['tackle', 'string', 'confusion', 'buzz'],
  13: ['sting', 'string', 'lunge', 'swarm'],
  16: ['tackle', 'gust', 'quick', 'air'],
  19: ['tackle', 'quick', 'bite', 'headbutt'],
  21: ['peck', 'quick', 'agility', 'wing'],
  23: ['bite', 'acid', 'poison', 'jab'],
  25: ['quick', 'thunder', 'agility', 'lightning'],
  27: ['tackle', 'roll', 'bulldoze', 'spikes'],
  29: ['tackle', 'acid', 'bite', 'jab'],
  32: ['peck', 'acid', 'horn', 'jab'],
  35: ['tackle', 'swift', 'kiss', 'fairy'],
  37: ['ember', 'wisp', 'sun', 'heat'],
  39: ['pulse', 'hypnosis', 'fairy', 'guard'],
  41: ['bite', 'wing', 'poison', 'air'],
  43: ['acid', 'spores', 'giga', 'solar'],
  46: ['tackle', 'leaf', 'spores', 'lunge'],
  48: ['tackle', 'confusion', 'spores', 'buzz'],
  50: ['tackle', 'mud', 'bulldoze', 'quake'],
  52: ['quick', 'bite', 'slash', 'swift'],
  54: ['water', 'confusion', 'bubbles', 'hydro'],
  56: ['kick', 'quick', 'bite', 'punch'],
  58: ['bite', 'ember', 'agility', 'heat'],
  60: ['water', 'hypnosis', 'drainpunch', 'surf'],
  63: ['confusion', 'teleport', 'amnesia', 'psychic'],
  66: ['tackle', 'kick', 'drainpunch', 'focus'],
  69: ['leaf', 'acid', 'seed', 'giga'],
  72: ['acid', 'water', 'poison', 'hydro'],
  74: ['tackle', 'roll', 'bulldoze', 'quake'],
  77: ['ember', 'kick', 'agility', 'fireblast'],
  79: ['water', 'confusion', 'amnesia', 'surf'],
  81: ['thunder', 'electricField', 'discharge', 'meteor'],
  83: ['peck', 'leaf', 'wing', 'lunge'],
  84: ['peck', 'quick', 'agility', 'headbutt'],
  86: ['tackle', 'water', 'ice', 'blizzard'],
  88: ['acid', 'poison', 'amnesia', 'jab'],
  90: ['tackle', 'water', 'guard', 'blizzard'],
  92: ['shadow', 'hypnosis', 'poison', 'dream'],
  95: ['rocks', 'bulldoze', 'spikes', 'quake'],
  96: ['confusion', 'hypnosis', 'dream', 'psychic'],
  98: ['tackle', 'bubbles', 'roll', 'surf'],
  100: ['thunder', 'roll', 'swift', 'discharge'],
  102: ['confusion', 'seed', 'bullet', 'psychic'],
  104: ['tackle', 'rocks', 'bulldoze', 'headbutt'],
  106: ['kick', 'agility', 'headbutt', 'focus'],
  107: ['tackle', 'drainpunch', 'agility', 'punch'],
  108: ['tackle', 'guard', 'roll', 'headbutt'],
  109: ['acid', 'poison', 'wisp', 'shadow'],
  111: ['tackle', 'rocks', 'horn', 'quake'],
  113: ['pulse', 'guard', 'kiss', 'swift'],
  114: ['leaf', 'seed', 'grassField', 'giga'],
  115: ['tackle', 'bite', 'drainpunch', 'punch'],
  116: ['water', 'bubbles', 'rain', 'hydro'],
  118: ['horn', 'bubbles', 'agility', 'hydro'],
  120: ['water', 'confusion', 'double', 'psychic'],
  122: ['confusion', 'guard', 'fairy', 'psychic'],
  123: ['quick', 'air', 'agility', 'lunge'],
  124: ['frost', 'kiss', 'hypnosis', 'blizzard'],
  125: ['thunder', 'kick', 'discharge', 'lightning'],
  126: ['ember', 'wisp', 'punch', 'fireblast'],
  127: ['tackle', 'lunge', 'horn', 'focus'],
  128: ['tackle', 'horn', 'agility', 'headbutt'],
  129: ['tackle', 'water', 'bite', 'surf'],
  131: ['water', 'frost', 'rain', 'blizzard'],
  132: ['tackle', 'double', 'swift', 'headbutt'],
  133: ['tackle', 'quick', 'bite', 'swift'],
  137: ['pulse', 'swift', 'agility', 'psychic'],
  138: ['rocks', 'bubbles', 'guard', 'hydro'],
  140: ['tackle', 'rocks', 'drainpunch', 'surf'],
  142: ['bite', 'rocks', 'wing', 'air'],
  143: ['tackle', 'guard', 'bulldoze', 'headbutt'],
  144: ['gust', 'ice', 'air', 'blizzard'],
  145: ['peck', 'thunder', 'air', 'lightning'],
  146: ['gust', 'ember', 'air', 'fireblast'],
  147: ['tackle', 'dragon', 'agility', 'claw'],
  150: ['confusion', 'shadow', 'aura', 'psychic'],
  151: ['confusion', 'swift', 'teleport', 'psychic'],
  201: ['pulse', 'confusion', 'amnesia', 'psychic'],
  235: ['tackle', 'swift', 'spikes', 'shadow']
}
const typeKits = {
  normal: ['tackle', 'quick'], grass: ['leaf', 'solar'], fire: ['ember', 'fireblast'], water: ['water', 'surf'],
  electric: ['thunder', 'discharge'], ice: ['ice', 'blizzard'], psychic: ['confusion', 'psychic'],
  poison: ['poison', 'jab'], rock: ['roll', 'bulldoze'], ground: ['bulldoze', 'quake'],
  fighting: ['kick', 'agility'], flying: ['gust', 'wing'], ghost: ['shadow', 'double'],
  bug: ['lunge', 'buzz'], dragon: ['dragon', 'claw'], steel: ['roll', 'meteor'],
  fairy: ['quick', 'fairy'], dark: ['bite', 'double']
}
export const battleRoster = [...nationalStats.map(([id, stats, types, final, , legendary]) => [id, stats, types, final, evolutionParent(id) || null, legendary]),
  ...regionalSpecies.map(form => [form.id, form.stats, form.types, !evolutionChildren(form.id).length, form.parent ?? null, form.legendary])]
const byId = new Map(battleRoster.map(row => [row[0], row]))
export const battleSpecies = id => byId.get(id)
function validateLearnsets(data) {
  if (!data?.species || !data?.moves) throw new Error('Invalid learnset file')
  const valid = record => Array.isArray(record) && record.length === 2 && Object.hasOwn(moves, record[0]) &&
    Number.isInteger(record[1]) && record[1] >= 0 && record[1] <= 100
  for (const [id] of battleRoster) {
    const entry = data.species[id]
    if (!Array.isArray(entry?.moves) || !entry.moves.every(valid) || (entry.signature && !valid(entry.signature))) {
      throw new Error('Invalid learnset for species ' + id)
    }
  }
}
applyLearnsets(bundledLearnsets)
const children = new Map()
for (const [id, , , , parent] of battleRoster) {
  if (!children.has(parent)) children.set(parent, [])
  children.get(parent).push(id)
}

function lineage(id) {
  const path = [id]
  while (byId.has(byId.get(path[0])?.[4])) path.unshift(byId.get(path[0])[4])
  return path
}

const legacyFamily = new Map()
for (const id of Object.keys(loadouts).map(Number)) {
  const root = lineage(id)[0]
  if (!legacyFamily.has(root)) legacyFamily.set(root, id)
}
const familyMembers = new Map()
for (const [id] of battleRoster) {
  const root = lineage(id)[0]
  if (!familyMembers.has(root)) familyMembers.set(root, [])
  familyMembers.get(root).push(id)
}

export function formAtLevel(id, level) {
  const path = lineage(id)
  let depth = 0
  while (level >= nextEvolutionLevel(path[depth])) {
    const options = children.get(path[depth])
    if (depth >= path.length - 1 && options.length !== 1) break
    if (depth >= path.length - 1) path.push(options[0])
    depth++
  }
  return path[depth]
}

const ultimateType = types => types.includes('steel') ? 'steel' :
  types[0] === 'normal' && types.includes('flying') ? 'flying' : types[0]

export function ultimateOptions(types, level) {
  if (level < ultimateLevel) return []
  return [...new Set([ultimateType(types), ...types])].map(type => 'ultimate-' + type).filter(key => moves[key])
}

function learnedFor(id) {
  const entries = new Map()
  const path = lineage(id)
  for (const member of path) {
    for (const [key, level] of learnsets.species[member]?.moves ?? []) {
      if (!entries.has(key) || entries.get(key) > level) entries.set(key, level)
    }
  }
  if (entries.size < 4) {
    for (const member of familyMembers.get(path[0]) ?? []) {
      for (const [key, level] of learnsets.species[member]?.moves ?? []) {
        if (!entries.has(key)) entries.set(key, Math.max(10, level))
      }
    }
  }
  return entries
}

const progressionCache = new Map()
function authoredProgression(id, types, family) {
  if (loadouts[family]) return loadouts[family]
  if (progressionCache.has(id)) return progressionCache.get(id)
  const row = byId.get(id)
  const stats = row?.[1] ?? [50, 50, 50, 50]
  const records = [...learnedFor(id)]
  const power = key => moves[key].power * (moves[key].count ?? 1)
  const score = ([key, at]) => {
    const move = moves[key]
    const physical = move.kind === 'rush' || move.damageClass === 'physical'
    return power(key) + (types.includes(move.type) ? 15 : 0) +
      (physical ? stats[1] - stats[3] : stats[3] - stats[1]) * .12 - at * .35
  }
  const attacks = records.filter(([key]) => power(key) > 0 && !moves[key].needsSleep).sort((a, b) => score(b) - score(a))
  const opener = (attacks.find(([key, at]) => at <= 7 && power(key) <= 47) ??
    attacks.find(([key]) => power(key) <= 47) ?? attacks[0])?.[0]
  const finisher = attacks.find(([key]) => key !== opener)?.[0]
  const coverage = attacks.find(([key]) => key !== opener && key !== finisher && moves[key].type !== moves[opener]?.type)?.[0]
  const utility = records.find(([key, at]) => at <= 15 && (moves[key].boost || moves[key].hazard ||
    moves[key].slow || moves[key].leech || !moves[key].power && moves[key].effect))?.[0]
  const [basic, strong] = typeKits[types[0]] ?? typeKits.normal
  const progression = [...new Set([opener ?? basic, coverage, utility, ...attacks.map(([key]) => key)
    .filter(key => key !== finisher), basic, strong, 'tackle', 'quick'].filter(key => key && key !== finisher))].slice(0, 3)
  progression.push(finisher ?? [...new Set([strong, 'tackle', 'quick', 'bite'])].find(key => !progression.includes(key)))
  progressionCache.set(id, progression)
  return progression
}


export function movesFor(id, types, final, level = 100) {
  const [signature] = ultimateOptions(types, level)
  const root = lineage(id)[0]
  const progression = [...authoredProgression(id, types, legacyFamily.get(root))]
  const personal = learnsets.species[id]?.signature
  if (personal && level >= personal[1]) {
    const slot = personal[1] <= 1 ? 0 : personal[1] < 5 ? 0 : personal[1] < 10 ? 1 : personal[1] < 20 ? 2 : 3
    progression[slot] = personal[0]
  }
  return [...progression.slice(0, level >= 20 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : 1),
    ...(signature ? [signature] : [])]
}

export function equippedMoves(id, types, final, level, selected, selectedAt) {
  const defaults = movesFor(id, types, final, level).filter(key => !moves[key].ultimate)
  if (!Array.isArray(selected)) return defaults
  const unlocked = moveOptions(id, types, final, level)
  const legal = [...new Set(selected)].filter(key => unlocked.includes(key) && !moves[key].ultimate)
  if (!legal.length) return defaults
  const known = Number.isInteger(selectedAt) ? moveOptions(id, types, final, selectedAt) : unlocked
  return [...legal, ...defaults.filter(key => !known.includes(key) && !legal.includes(key))].slice(0, 4)
}

const extrasByType = {
  grass: [[5, 'bullet'], [10, 'seed'], [15, 'giga'], [15, 'grassField'], [20, 'synthesis']], bug: [[5, 'swift'], [10, 'swarm'], [12, 'pin'], [16, 'agility'], [20, 'lunge'], [22, 'infestation']],
  fighting: [[10, 'drainpunch'], [20, 'focus']], fairy: [[10, 'kiss']],
  ghost: [[5, 'wisp'], [10, 'hypnosis'], [15, 'dream']], fire: [[10, 'wisp'], [15, 'sun']],
  electric: [[15, 'electricField']], water: [[15, 'rain']],
  psychic: [[5, 'teleport'], [10, 'hypnosis'], [15, 'dream']], ice: [[10, 'spear'], [16, 'hail']],
  flying: [[18, 'fly']], ground: [[16, 'dig'], [20, 'sandstorm']], rock: [[16, 'sandstorm']]
}
const hornFamilies = new Set([29, 32, 111, 118, 127])
const spikeFamilies = new Set([27, 29, 32, 90, 95])
export function moveOptions(id, types, final, level) {
  const root = lineage(id)[0]
  const family = legacyFamily.get(root) ?? root
  const familyTypes = byId.get(root)?.[2] ?? types
  const options = familyTypes.flatMap(type => extrasByType[type] ?? [])
  if ([23, 69, 72, 95, 108, 147, 336].includes(root)) options.push([12, 'wrap'])
  if (root === 932) options.push([12, 'saltcure'])
  if ([63, 79, 120, 137, 151, 251].includes(root)) options.push([15, 'recover'])
  if (family === 133) {
    if (types.includes('water')) options.push([10, 'bubbles'], [20, 'hydro'])
    if (types.includes('electric')) options.push([10, 'thunder'], [20, 'lightning'])
    if (types.includes('fire')) options.push([10, 'ember'], [20, 'fireblast'])
  }
  if (hornFamilies.has(family)) options.push([5, 'horn'])
  if (spikeFamilies.has(family)) options.push([10, 'spikes'])
  for (const [key, at] of learnedFor(id)) options.push([Math.max(key === 'spikes' ? 10 : 5, at), key])
  return [...new Set([...movesFor(id, types, final, level), ...options.filter(([at]) => level >= at).map(([, key]) => key),
    ...ultimateOptions(types, level)])]
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const bound = (x, actor) => {
  const margin = actor?.margin ?? 75
  return clamp(x, margin, arena.width - margin)
}
const bodyGap = 44
const extraReach = actor => actor.boss ? 42 : 0
const bodySpacing = (a, b) => bodyGap + extraReach(a) + extraReach(b)
const isRanged = move => ['projectile', 'target', 'pierce'].includes(move.kind)
const effectiveness = (actor, defender, move) => defender.types.reduce((factor, type) =>
  factor * (typeChart[(move.type ?? actor.types[0]) + ':' + type] ?? 1), 1)
const statusDuration = { paralysis: 7, freeze: 5, sleep: 7, poison: 12, burn: 9 }
const immune = { paralysis: ['electric'], freeze: ['ice'], sleep: ['grass'], poison: ['poison', 'steel'], burn: ['fire'] }
const fieldDamage = {
  rain: { water: 1.5, fire: .5 }, sun: { fire: 1.5, water: .5 },
  electric: { electric: 1.2 }, grass: { grass: 1.2 }
}
export { baseStatsData }
let customBaseStats = baseStatsData.species

export function applyBaseStats(data) {
  if (!data?.species || Object.keys(data.species).length !== battleRoster.length) throw new Error('Invalid base stats file')
  for (const [id] of battleRoster) {
    const stats = data.species[id]?.stats
    if (!Array.isArray(stats) || stats.length !== 6 || stats.some(stat => !Number.isInteger(stat) || stat < 1 || stat > 500)) {
      throw new Error('Invalid base stats for species ' + id)
    }
  }
  customBaseStats = data.species
}

export function arenaBaseStats(id, original) {
  original = customBaseStats[id]?.stats ?? original
  const [, , , final, , legendary] = byId.get(id) ?? []
  if (!final || legendary) return original
  const [hp, attack, defense, specialAttack, specialDefense, speed] = original
  const healthBonus = hp < 45 ? Math.min(id === 292 ? 27 : 14, Math.round((45 - hp) * .64)) : 0
  const dominant = Math.max(attack, specialAttack)
  const offenseBonus = dominant < 76 ? Math.min(13, Math.round((76 - dominant) * .52)) : 0
  const limitOffense = base => base > 140 ? 140 + (base - 140) * .75 : base
  return [hp + healthBonus, limitOffense(attack + (attack >= specialAttack ? offenseBonus : 0)), defense,
    limitOffense(specialAttack + (specialAttack > attack ? offenseBonus : 0)), specialDefense, speed]
}

export const moveCooldown = move => move.cooldown ?? (move.kind === 'area' ? 3.4 : move.kind === 'guard' ? 4.5 : 1.1)
export const movePp = move => move.ultimate ? 2 : (move.pp ?? 20)

export function battleStatsAtLevel(id, stats, level, dna = 0) {
  const [hp, attack, defense, specialAttack, specialDefense, speed] = arenaBaseStats(id, stats).map(stat => stat + dna * 10)
  const factor = 1 + (level - 1) * .02
  return { maxHp: Math.round((55 + hp) * factor), attack: attack * factor, defense: defense * factor,
    specialAttack: specialAttack * factor, specialDefense: specialDefense * factor, speed: speed * factor }
}

export function battleManeuver(actor, time) {
  const cast = actor.cast
  if (cast?.move.kind !== 'maneuver') return null
  return { kind: cast.move.visual, phase: clamp((time - cast.start) / (cast.resolve - cast.start), 0, 1) }
}

const typedSignatures = { judgment: 493, multiattack: 773, technoblast: 649 }

function heldForm(id, item) {
  const type = heldItems[item]?.[2]
  if (id === 493 || id === 773) return battleFormAssets[id][type] ? type : null
  if (id === 649 && item?.endsWith('-drive')) return type
  if (id === 888 && item === 'rusted-sword' || id === 889 && item === 'rusted-shield') return 'crowned'
  return null
}

export function createBattle(entries, { auto = true, random = Math.random, hpMultiplier = 1, duration = 60, raid = false, onMoveReward = () => {} } = {}) {
  let time = 0
  let winner = null
  let over = false
  let suddenDeath = false
  let roundEnd = duration
  let field = null
  let ultimate = null
  const projectiles = []
  const queuedShots = []
  const effects = []
  const hazards = []
  const actors = entries.map((entry, index) => {
    const stats = battleStatsAtLevel(entry.id, entry.stats, entry.level, entry.dna)
    stats.maxHp = Math.round(stats.maxHp * (entry.boss ? entry.hpBoost ?? 1 : hpMultiplier * (entry.hpBoost ?? 1)))
    if (entry.boss && entry.statBoost !== undefined) {
      for (const key of ['attack', 'defense', 'specialAttack', 'specialDefense', 'speed']) stats[key] *= entry.statBoost
    }
    const equipmentForm = heldForm(entry.id, entry.heldItem)
    const types = equipmentForm === 'crowned' ? [...new Set([...entry.types, 'steel'])] :
      equipmentForm && [493, 773].includes(entry.id) ? [equipmentForm] : entry.types
    const unlockedUltimates = ultimateOptions(types, entry.level)
    const equippedUltimate = entry.boss && moves[entry.bossUltimate]?.ultimate ? entry.bossUltimate :
      unlockedUltimates.includes(entry.selectedUltimate) ? entry.selectedUltimate : unlockedUltimates[0]
    const chosen = entry.boss && entry.bossMoves?.length ? entry.bossMoves : equippedMoves(entry.id, entry.types, entry.final, entry.level, entry.selectedMoves, entry.selectedAt)
    const support = entry.team != null && ['pollenpuff', 'healpulse'].includes(entry.support) ? entry.support : null
    const kit = [...chosen, ...(support ? [support] : []), ...(equippedUltimate ? [equippedUltimate] : [])]
    const margin = clamp(entry.margin ?? 75, 75, arena.width / 2)
    return {
      ...entry, ...stats, types, equipmentForm, index, hp: stats.maxHp, abilities: new Set(abilitiesFor(entry.id)),
      margin, x: clamp(150 + index * (arena.width - 300) / Math.max(1, entries.length - 1), margin, arena.width - margin),
      direction: index < entries.length / 2 ? 1 : -1, next: 0.5 + index * 0.12,
      shield: 0, boosts: {}, status: null, knockback: 0, hurtUntil: 0, motion: 'Idle', motionSince: 0,
      cast: null, dashUntil: 0, dashReady: 0, cooldowns: {}, ultimatePp: entry.boss ? entry.bossUltimatePp ?? 4 : movePp({ ultimate: true }), ultimateCharge: 0,
      hasUltimate: Boolean(equippedUltimate), equippedUltimate,
      kit, pp: Object.fromEntries(kit.filter(key => !moves[key].ultimate).map(key => [key, movePp(moves[key]) + (entry.heldItem === 'leppa-berry' && moves[key].kind !== 'support' ? 2 : 0)]))
    }
  })

  function updateForm(actor) {
    if (!battleFormAssets[actor.id]) return
    const half = actor.hp <= actor.maxHp / 2
    const prior = actor.form
    const forms = {
      351: ['sun', 'rain', 'hail'].includes(field?.kind) ? field.kind : null,
      421: field?.kind === 'sun' ? 'sunshine' : null,
      555: half ? 'zen' : null,
      10177: half ? 'zen' : null,
      648: actor.signatureChanged ? 'pirouette' : null,
      658: actor.ashForm ? 'ash' : null,
      681: actor.stanceBlade ? 'blade' : null,
      718: half || prior === 'complete' ? 'complete' : null,
      746: actor.level >= 20 && actor.hp > actor.maxHp / 4 ? 'school' : null,
      774: half ? 'core' : null,
      778: actor.disguiseUsed ? 'busted' : null,
      845: actor.gulped ? (half ? 'gorging' : 'gulping') : null,
      875: actor.iceFaceUsed ? 'noice' : null,
      877: Math.floor(time / 8) % 2 ? 'hangry' : null,
      964: time >= 10 ? 'hero' : null,
      1024: actor.usedStellar ? 'stellar' : actor.tookDamage ? 'terastal' : null
    }
    actor.form = actor.equipmentForm ?? forms[actor.id] ?? null
    if (actor.id === 351) actor.types = { sun: ['fire'], rain: ['water'], hail: ['ice'] }[actor.form] ?? ['normal']
    if (actor.id === 648) actor.types = ['normal', actor.form ? 'fighting' : 'psychic']
    if (actor.id === 10177) actor.types = actor.form ? ['ice', 'fire'] : ['ice']
    if (actor.id === 555) actor.types = actor.form ? ['fire', 'psychic'] : ['fire']
    if (prior !== actor.form && (prior || actor.form)) {
      effects.push({ kind: 'clash', x: actor.x, at: time, expires: time + .55 })
    }
  }

  for (const actor of actors) updateForm(actor)
  function combatStrength(actor) {
    return actor.maxHp + actor.attack + actor.defense + actor.specialAttack + actor.specialDefense + actor.speed
  }

  for (const actor of actors) {
    if (actor.id !== 132) continue
    const target = actors.filter(enemy => enemy.id !== 132 && enemy !== actor && (actor.team == null || actor.team !== enemy.team))
      .sort((a, b) => combatStrength(b) - combatStrength(a))[0]
    if (!target) continue
    actor.appearance = { id: target.id, name: target.name, form: target.form, shiny: target.shiny }
    const { attack, defense, specialAttack, specialDefense, speed, equipmentForm } = target
    const equippedUltimate = actor.level >= ultimateLevel ? target.equippedUltimate : undefined
    const kit = target.kit.filter(key => !moves[key].ultimate || key === equippedUltimate)
    Object.assign(actor, { copiedSpecies: target.id, attack, defense, specialAttack, specialDefense, speed, equipmentForm,
      types: [...target.types], abilities: new Set(target.abilities), equippedUltimate, hasUltimate: Boolean(equippedUltimate),
      kit, pp: Object.fromEntries(kit.filter(key => !moves[key].ultimate).map(key => [key, Math.min(5, movePp(moves[key]))])) })
    effects.push({ kind: 'clash', x: actor.x, at: time, expires: time + .6 })
  }

  function useBerry(actor) {
    if (actor.heldItem !== 'sitrus-berry' || actor.berryUsed || actor.hp <= 0 || actor.hp > actor.maxHp * .2) return
    const recovery = actor.kit.find(key => moves[key].heal && actor.pp[key] > 0)
    if (actor.cast?.move.heal || recovery && !actor.recovered && !immobilized(actor)) {
      if (!actor.cast && !ultimate && cast(actor, recovery, true)) actor.pp[recovery] = 0
      return
    }
    actor.berryUsed = true
    actor.hp = Math.min(actor.maxHp, actor.hp + Math.floor(actor.maxHp / 4))
  }

  const teams = entries.some(entry => entry.team != null)
  const teamOf = actor => actor.team ?? actor.index
  function rivals(a, b) { return a !== b && teamOf(a) !== teamOf(b) }
  function supportTarget(actor, move) {
    return actors.filter(ally => ally !== actor && !rivals(actor, ally) && ally.hp > 0 && ally.hp < ally.maxHp * .7 &&
      Math.abs(actor.x - ally.x) <= move.reach).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
  }
  for (const actor of actors) if (actors.some(enemy => rivals(actor, enemy) && enemy.abilities.has('intimidate'))) actor.attack *= .9

  function closest(actor, eligible) {
    let target
    for (const enemy of actors) {
      if (!rivals(actor, enemy) || enemy.hp <= 0 || eligible && !eligible(enemy)) continue
      if (!target || Math.abs(enemy.x - actor.x) < Math.abs(target.x - actor.x)) target = enemy
    }
    return target
  }

  function charge(actor, amount) {
    if (actor.hasUltimate && actor.ultimatePp > 0 && actor.hp > 0) {
      actor.ultimateCharge = Math.min(100, actor.ultimateCharge + amount)
    }
  }

  function tickField() {
    if (!field) return
    while (field.next <= time + 1e-7 && field.next <= field.ends) {
      for (const actor of actors) {
        if (actor.hp <= 0) continue
        if ((field.kind === 'rain' && field.owner === actor.index) ||
            (field.kind === 'grass' && actor.types.includes('grass'))) {
          actor.hp = Math.min(actor.maxHp, actor.hp + actor.maxHp * .01)
        }
        if (['hail', 'sandstorm'].includes(field.kind)) {
          const immuneTypes = field.kind === 'hail' ? ['ice'] : ['rock', 'ground']
          const owner = actors[field.owner]
          if (!actor.types.some(type => immuneTypes.includes(type)) && (!teams || rivals(owner, actor))) {
            dealChip(actor, .035, field.kind === 'hail' ? 'ice' : 'rock', undefined, owner === actor ? undefined : owner)
          }
        }
      }
      field.next += ['hail', 'sandstorm'].includes(field.kind) ? 3 : 1
    }
    if (field.ends <= time + 1e-7) field = null
  }

  const sleepBlocked = () => field?.kind === 'electric'

  const fieldSpeedAbility = { sun: 'chlorophyll', rain: 'swift-swim', sandstorm: 'sand-rush', hail: 'slush-rush', electric: 'surge-surfer' }
  const weatherSpeed = actor => actor.abilities.has(fieldSpeedAbility[field?.kind]) ? 1.3 : 1

  function abilityDamage(actor, defender, move, type, physical, matchup) {
    const has = key => actor.abilities.has(key)
    const def = key => defender.abilities.has(key)
    let amount = 1
    if (actor.hp <= actor.maxHp / 3 && has({ fire: 'blaze', water: 'torrent', grass: 'overgrow', bug: 'swarm' }[type])) amount *= 1.3
    if (has('strong-jaw') && /mord|colmillo|tritur/i.test(move.name)) amount *= 1.25
    if (has('ambush') && type === 'dark' && defender.hp > defender.maxHp * .75) amount *= 1.2
    if (!move.struggle && def('steadfast') && defender.hp <= defender.maxHp * .25) amount *= .95
    if (!move.struggle) {
      if (has('reserves') && !physical && actor.hp <= actor.maxHp * .25) amount *= 1.08
      if (has('pressure-strike') && physical && matchup > 1) amount *= 1.08
      if (def('storm-guard') && ['hail', 'sandstorm'].includes(field?.kind)) amount *= .92
      if (has('opening-strike') && time < 10) amount *= 1.06
      if (def('last-stand') && physical && defender.hp <= defender.maxHp * .3) amount *= .92
      if (has('patient-hunter') && ['burn', 'poison', 'sleep'].includes(defender.status?.kind)) amount *= 1.08
    }
    if (has('technician') && move.power <= 32) amount *= 1.2
    if (physical && (has('guts') && actor.status || has('huge-power'))) amount *= 1.2
    if (has('solar-power') && !physical && field?.kind === 'sun' || actor.flashFire && type === 'fire') amount *= 1.2
    if (def('thick-fat') && (type === 'fire' || type === 'ice') || def('filter') && matchup > 1) amount *= .8
    if (physical && (def('grass-pelt') && field?.kind === 'grass' || def('marvel-scale') && defender.status)) amount *= .8
    if (['blade', 'hero', 'complete', 'school', 'sunshine', 'core', 'terastal', 'pirouette', 'ash', 'stellar', 'crowned'].includes(actor.form)) amount *= 1.15
    if (actor.form === 'zen' && !physical || actor.form === 'hangry' && type === 'dark') amount *= 1.2
    if (['school', 'complete', 'sunshine', 'terastal'].includes(defender.form) || defender.id === 889 && defender.form === 'crowned' || defender.id === 681 && !defender.form) amount *= .88
    return amount
  }

  function hit(actor, defender, move, direction) {
    if (!rivals(actor, defender)) return
    if (battleManeuver(defender, time)) return
    if (!move.ultimate && !move.struggle && defender.shield > time) return
    if (move.needsSleep && defender.status?.kind !== 'sleep') return
    const type = move.type ?? actor.types[0]
    const multiplier = effectiveness(actor, defender, move)
    const matchup = multiplier
    if (!move.struggle && (move.power || move.effect)) {
      const absorbs = { fire: 'flash-fire', water: 'water-absorb', electric: 'volt-absorb' }[type]
      if (defender.abilities.has(absorbs)) {
        if (absorbs === 'flash-fire') defender.flashFire = true
        else defender.hp = Math.min(defender.maxHp, defender.hp + Math.round(defender.maxHp * .12))
        return
      }
    }
    const fieldEvasion = field?.kind === 'sandstorm' && defender.abilities.has('sand-veil') ||
      field?.kind === 'hail' && defender.abilities.has('snow-cloak')
    const accurate = field?.kind === 'rain' && move === moves.lightning || field?.kind === 'hail' && move === moves.blizzard
    if (!accurate && !move.ultimate && !move.struggle && matchup && random() < (defender.boosts.evasion > time ? .25 : fieldEvasion ? .15 : .05)) {
      effects.push({ kind: 'hit', type, x: defender.x, dodged: true, at: time, expires: time + .58 })
      return
    }
    const reduced = matchup === 0 ? 0 : clamp(matchup, 0.5, 1.6)
    const physical = move.damageClass === 'physical' || move.kind === 'rush'
    const usesPhysical = move.ultimate ? actor.attack > actor.specialAttack : physical
    const attack = usesPhysical ? actor.attack : actor.specialAttack
    const weatherDefense = usesPhysical && field?.kind === 'sandstorm' && defender.types.some(type => type === 'rock' || type === 'ground') ||
      !usesPhysical && field?.kind === 'hail' && defender.types.includes('ice')
    const defense = (usesPhysical ? defender.defense : defender.specialDefense * (defender.boosts.mind > time ? 1.65 : 1)) * (weatherDefense ? 1.5 : 1)
    const statRatio = clamp(attack / Math.max(1, defense), 0.55, 1.8) *
      (usesPhysical && actor.status?.kind === 'burn' && !actor.abilities.has('guts') ? .5 : 1)
    let sleepMultiplier = 1
    if (matchup && move.power && defender.status?.kind === 'sleep' && !move.needsSleep) {
      if (random() < .3) defender.status = null
      else sleepMultiplier += .1
    }
    const statusLands = matchup && move.effect && !defender.status && !(move.effect === 'sleep' && sleepBlocked()) &&
      !defender.types.some(type => immune[move.effect].includes(type)) && random() < move.chance
    const critical = !!(!move.ultimate && !move.struggle && matchup && move.power && random() < (actor.abilities.has('super-luck') ? .14 : .07))
    const fieldMultiplier = fieldDamage[field?.kind]?.[type] ?? 1
    const solarCharge = ultimate?.actor === defender && ultimate.move.type === 'grass' && ultimate.pulse === 0
    const stab = actor.types.includes(type) ? 1.25 : 1
    const itemMultiplier = type && heldItems[actor.heldItem]?.[2] === type || actor.heldItem === 'wise-glasses' && !usesPhysical ? 1.1 : 1
    const abilityMultiplier = abilityDamage(actor, defender, move, type, usesPhysical, matchup)
    const variance = move.power && matchup ? .9 + random() * .2 : 1
    const ultimateDamage = Math.min(move.power, 78) * (.65 + actor.level / 100) * statRatio *
      Math.min(matchup, 2) * stab * fieldMultiplier * itemMultiplier * abilityMultiplier * variance
    const damage = move.ultimate ? Math.min(Math.round(ultimateDamage), Math.floor(defender.maxHp * .6)) : move.struggle ? Math.ceil(defender.maxHp * .2) :
      Math.round(move.power * (0.5 + actor.level / 100) * statRatio * reduced * stab *
        (solarCharge ? .7 : 1) * sleepMultiplier * fieldMultiplier * (critical ? 1.45 : 1) * itemMultiplier * abilityMultiplier * variance)
    if (move.struggle) {
      actor.hp = Math.max(0, actor.hp - Math.ceil(actor.maxHp * .1))
      if (!actor.hp) actor.faintedAt = time
    }
    if (damage && !move.struggle && ((defender.id === 778 && !defender.disguiseUsed) ||
        (defender.id === 875 && usesPhysical && !defender.iceFaceUsed))) {
      defender.formShieldHits = (defender.formShieldHits ?? 0) + 1
      if (defender.id === 778) defender.disguiseUsed = defender.formShieldHits >= 5
      else defender.iceFaceUsed = defender.formShieldHits >= 5
      updateForm(defender)
      return
    }
    let dealt = 0
    if (damage) {
      defender.tookDamage = true
      const inflicted = Math.min(defender.hp, damage)
      dealt = inflicted
      defender.hp = Math.max(0, defender.hp - damage)
      const fraction = inflicted / defender.maxHp
      creditDamage(actor, defender, inflicted)
      const hitBonus = move.count ? .5 : 1
      if (!move.ultimate) charge(actor, 5 * hitBonus + fraction * 36)
      charge(defender, move.ultimate ? fraction * 14 : 4 * hitBonus + fraction * 26)
      if (actor.hp > 0 && (move.drain || actor.heldItem === 'shell-bell')) {
        actor.hp = Math.min(actor.maxHp, actor.hp + Math.round(inflicted * ((move.drain ?? 0) + (actor.heldItem === 'shell-bell' ? .12 : 0))))
      }
      const channeling = defender.cast?.move.channel && defender.cast.start + defender.cast.move.channel > time
      if (!immobilized(defender) && !channeling && !solarCharge) {
        const push = move.push ?? (move.count ? 95 : move.kind === 'rush' ? 430 : 270)
        defender.knockback = direction * push * (critical ? 1.25 : 1)
      }
      defender.hurtUntil = time + (move.count ? .12 : .35)
      if (!defender.hp) {
        defender.faintedAt = time
        if (actor.id === 658) {
          actor.ashForm = true
          updateForm(actor)
        }
      }
      if (defender.gulped && actor.hp) {
        defender.gulped = false
        updateForm(defender)
        dealChip(actor, .08, 'flying', 'dreepy', defender)
      }
      if (!channeling || !defender.hp) defender.cast = null
      defender.next = Math.max(defender.next, time + .42)
      if (defender.hp) updateForm(defender)
      if (move.flinch && !channeling && random() < move.flinch) defender.flinchUntil = time + 1.5
    }
    if (move.leech && matchup && defender.hp && !defender.types.includes('grass')) {
      defender.leech = { source: actor.index, next: time + 1, ends: time + 7 }
    }
    if (move.ongoing && matchup && defender.hp) {
      defender.ongoing = { source: actor.index, kind: move.ongoing, next: time + 1, ends: time + (actor.heldItem === 'grip-claw' ? 6.1 : 4.1) }
      if (move.ongoing === 'wrap') defender.slowUntil = defender.ongoing.ends
    }
    if (move.slow && matchup && defender.hp) defender.slowUntil = time + 4
    if (defender.hp && statusLands) {
      defender.status = { source: actor.index, kind: move.effect, ends: time + statusDuration[move.effect], tick: time + 1, severity: 0 }
      if (move.effect === 'freeze' || move.effect === 'sleep') {
        defender.cast = null
        defender.knockback = 0
      }
    }
    effects.push({ kind: 'hit', type, visual: move.visual, x: defender.x, target: defender.index, damage: dealt, critical, at: time, expires: time + .68 })
  }

  function cast(actor, moveId, force = false) {
    const species = actor.copiedSpecies ?? actor.id
    const move = moveId === 'solar' && field?.kind === 'sun' ? { ...moves.solar, channel: 0 } :
      species === typedSignatures[moveId] && actor.equipmentForm ? { ...moves[moveId], type: actor.equipmentForm } : moves[moveId]
    if (!move || over || ultimate || actor.hp <= 0 || actor.cast || actor.hurtUntil > time || immobilized(actor) ||
        actor.exhaustedUntil > time || actor.flinchUntil > time ||
        (!force && (actor.next > time || actor.cooldowns[moveId] > time)) ||
        (move.ultimate && ((!force && (moveId !== actor.equippedUltimate || actor.ultimateCharge < 100)) ||
          actor.ultimatePp <= 0 || (actor.level < ultimateLevel && !actor.boss))) ||
        (!force && actor.pp[moveId] === 0) || (move.heal && (actor.recovered || actor.hp > actor.maxHp * .2))) return false
    const target = move.kind === 'support' ? supportTarget(actor, move) : closest(actor)
    if (!target && move.kind !== 'guard') return false
    if (target) actor.direction = Math.sign(target.x - actor.x) || actor.direction
    if (move.ultimate) {
      if (actor.id === 1024) { actor.usedStellar = true; updateForm(actor) }
      actor.ultimatePp--
      actor.ultimateCharge = 0
      actor.motion = 'Special0'
      actor.motionSince = time
      const delay = move.type === 'grass' ? 1.15 : move.type === 'ground' ? 1 : .7
      ultimate = { actor, move, target, start: time, next: time + delay, pulse: 0,
        targets: new Set(), origin: actor.x, direction: actor.direction }
      return true
    }
    if (!force && actor.pp[moveId] > 0) {
      const pressure = move.kind !== 'support' && actors.some(enemy => rivals(actor, enemy) && enemy.hp > 0 && enemy.abilities.has('pressure'))
      actor.pp[moveId] = Math.max(0, actor.pp[moveId] - (pressure ? 2 : 1))
    }
    if (move.selfConfuse) actor.confuseAt = time + move.selfConfuse
    if (actor.confusion && !move.struggle) {
      if (random() < .1 + actor.confusion.attempts * .2) actor.confusion = null
      else {
        actor.confusion.attempts++
        if (random() < .33) {
          actor.hp = Math.max(0, actor.hp - Math.ceil(actor.maxHp * .08))
          if (!actor.hp) actor.faintedAt = time
          actor.next = time + .65
          effects.push({ kind: 'hit', type: 'psychic', x: actor.x, target: actor.index, damage: Math.ceil(actor.maxHp * .08), at: time, expires: time + .6 })
          return true
        }
      }
    }
    const duration = moveId === 'solar' && field?.kind === 'sun' ? 0 : (move.channel ?? 0) + (move.kind === 'pierce' ? .85 : move.kind === 'area' ? .75 :
      move.kind === 'maneuver' ? 1.6 : move.kind === 'rush' ? .36 : move.kind === 'target' ? .6 : .42)
    if (actor.id === 681) {
      actor.stanceBlade = move.kind !== 'guard'
      updateForm(actor)
    }
    actor.cast = { move, target, start: time, resolve: time + duration, origin: actor.x }
    actor.repeat = moveId === actor.lastMove ? actor.repeat + 1 : 1
    actor.lastMove = moveId
    actor.motionSince = time
    actor.motion = move.animation ?? (isRanged(move) ? 'Shoot' : move.kind === 'guard' ? 'Idle' :
      ['area', 'target'].includes(move.kind) ? 'Special0' : 'Attack')
    const quickClaw = actor.heldItem === 'quick-claw' && random() < .18
    actor.next = time + duration + clamp(1.4 - actor.speed / 140, .45, 1.2) * (quickClaw ? .5 : 1) / weatherSpeed(actor)
    actor.cooldowns[moveId] = time + duration + moveCooldown(move)
    if (move.kind === 'area') {
      effects.push({ kind: 'warning', type: move.type, visual: move.visual, x: actor.x, reach: move.reach, at: time, expires: time + duration })
    }
    if (move.kind === 'pierce') {
      effects.push({ kind: 'charge', visual: move.visual, x: actor.x, at: time, expires: time + duration })
    }
    if (move.channel) effects.push({ kind: 'charge', visual: 'channel', type: move.type,
      x: actor.x, at: time, expires: time + move.channel })
    if (!duration) resolve(actor, 0)
    return true
  }

  function resolve(actor, dt) {
    const cast = actor.cast
    const { move, origin } = cast
    if (move.kind === 'support') {
      if (time < cast.resolve) return
      actor.cast = null
      const ally = cast.target
      if (ally.hp) {
        ally.hp = Math.min(ally.maxHp, ally.hp + Math.round(ally.maxHp * move.healAlly))
        effects.push({ kind: 'target', visual: 'heal', x: ally.x, at: time, expires: time + .6 })
      }
      return
    }
    if (move.channel && time < cast.start + move.channel) return
    if (move.kind === 'maneuver') {
      const target = cast.target?.hp > 0 ? cast.target : closest(actor)
      if (target) {
        const direction = Math.sign(target.x - actor.x) || actor.direction
        actor.direction = direction
        actor.x = bound(actor.x + direction * Math.min(Math.max(0, Math.abs(target.x - actor.x) - 45), 480 * dt), actor)
        if (time >= cast.resolve && Math.abs(target.x - actor.x) <= 108) {
          hit(actor, target, move, direction)
          effects.push({ kind: 'target', visual: move.visual, x: target.x, at: time, expires: time + .55 })
        }
      }
      if (time >= cast.resolve) actor.cast = null
      return
    }
    if (move.kind === 'rush') {
      const prior = actor.x
      actor.x = bound(actor.x + actor.direction * 540 * dt, actor)
      const contact = actors.find(enemy => rivals(actor, enemy) && enemy.hp > 0 &&
        enemy.x >= Math.min(prior, actor.x) - 32 - extraReach(enemy) - extraReach(actor) &&
        enemy.x <= Math.max(prior, actor.x) + 32 + extraReach(enemy) + extraReach(actor))
      if (contact) {
        const rival = contact.cast
        if (!move.struggle && !rival?.move.struggle && rival?.move.kind === 'rush' && time >= rival.start + (rival.move.channel ?? 0) &&
            actor.direction !== contact.direction && Math.abs(cast.resolve - rival.resolve) <= .16) {
          const direction = actor.direction
          actor.knockback = -direction * 780
          contact.knockback = direction * 780
          contact.cast = null
          effects.push({ kind: 'clash', x: (actor.x + contact.x) / 2, at: time, expires: time + .42 })
          actor.cast = null
          return
        }
        hit(actor, contact, move, actor.direction)
        if (contact.hp && actor.abilities.has('parental-bond') && !move.struggle) {
          hit(actor, contact, { ...move, power: Math.round(move.power * .3), effect: undefined }, actor.direction)
        }
        actor.cast = null
        return
      }
    }
    if (time < cast.resolve) return
    actor.cast = null
    if (move.reward) onMoveReward(actor, move.reward)
    if (actor.id === 845 && move.type === 'water' && move.power) {
      actor.gulped = true
      updateForm(actor)
    }
    if (move === moves.relicsong && actor.id === 648) {
      actor.signatureChanged = !actor.signatureChanged
      updateForm(actor)
    }
    if (move.kind === 'guard') {
      if (move.blink && cast.target) {
        const away = -Math.sign(cast.target.x - actor.x) || -actor.direction
        actor.x = bound(actor.x + (Math.abs(bound(actor.x + away * 250, actor) - actor.x) >= 100 ? away : -away) * 250, actor)
        for (const x of [origin, actor.x]) effects.push({ kind: 'target', visual: 'psychic', x, at: time, expires: time + .45 })
      } else if (move.field) field = { kind: move.field, owner: actor.index, start: time,
        ends: time + (['grass', 'electric'].includes(move.field) ? 10 : 9) +
          (actor.heldItem === { rain: 'damp-rock', sun: 'heat-rock' }[move.field] && actor.heldItem ? 5 : 0) +
          (actor.abilities.has('weathercraft') && ['rain', 'sun', 'hail', 'sandstorm'].includes(move.field) ? 2 : 0),
        next: time + (['hail', 'sandstorm'].includes(move.field) ? 3 : 1) }
      else if (move.boost) actor.boosts[move.boost] = time + 7
      else if (move.heal) {
        actor.hp = Math.min(actor.maxHp, actor.hp + Math.round(actor.maxHp * move.heal * (actor.heldItem === 'leftovers' ? 1.25 : 1)))
        actor.recovered = true
      }
      else if (move.protect) actor.shield = time + .85
    } else if (move.kind === 'projectile') {
      if (move.recoil) actor.knockback = -actor.direction * move.recoil
      launch(actor, move, actor.direction)
      const bonusHit = !move.count && move.power && actor.abilities.has('parental-bond')
      const count = move.count ? move.count * (actor.abilities.has('skill-link') ? 2 : 1) : bonusHit ? 2 : 1
      const followUp = bonusHit ? { ...move, power: Math.round(move.power * .3) } : move
      for (let i = 1; i < count; i++) queuedShots.push({ actor, move: followUp, direction: actor.direction, at: time + i * .16 })
    } else if (move.kind === 'pierce') {
      const direction = actor.direction
      actor.knockback = -direction * move.recoil
      actor.exhaustedUntil = time + move.recovery
      actor.dashUntil = 0
      effects.push({ kind: 'pierce', visual: move.visual, x: actor.x, direction, at: time, expires: time + .68 })
      for (const enemy of actors) {
        if (rivals(actor, enemy) && enemy.hp > 0 && (enemy.x - actor.x) * direction >= -24) hit(actor, enemy, move, direction)
      }
    } else if (move.kind === 'target') {
      const target = cast.target
      if (target.hp > 0 && (move === moves.lightning && field?.kind === 'rain' || Math.abs(target.x - actor.x) <= move.reach + 40 + extraReach(target))) {
        if (move.hazard) {
          const x = bound(target.x - actor.direction * Math.min(135, Math.abs(target.x - actor.x) * .44))
          placeSpikes(actor, x, 8)
        } else {
          effects.push({ kind: 'target', visual: move.visual, type: move.type, origin: actor.x, x: target.x, at: time, expires: time + .52 })
          hit(actor, target, move, Math.sign(target.x - actor.x) || actor.direction)
        }
      }
    } else if (move.kind === 'area') {
      effects.push({ kind: 'area', type: move.type, visual: move.visual, x: origin, reach: move.reach, at: time, expires: time + .45 })
      for (const enemy of actors) {
        if (rivals(actor, enemy) && enemy.hp > 0 && Math.abs(enemy.x - origin) <= move.reach + extraReach(enemy)) {
          hit(actor, enemy, move, Math.sign(enemy.x - origin) || actor.direction)
        }
      }
    }
  }

  function launch(actor, move, direction) {
    projectiles.push({ actor, move, x: actor.x, origin: actor.x, direction, end: time + move.reach / 720 })
  }

  function placeSpikes(actor, x, seconds) {
    hazards.push({ x, owner: actor.index, expires: time + seconds, affected: new Set() })
    effects.push({ kind: 'hazard', x, at: time, expires: time + seconds })
  }

  function stepOnSpikes(actor) {
    for (const hazard of hazards) {
      if (hazard.expires <= time || !rivals(actors[hazard.owner], actor) || Math.abs(actor.x - hazard.x) > 85 ||
          hazard.affected.has(actor.index)) continue
      hazard.affected.add(actor.index)
      actor.hp = Math.max(0, actor.hp - 4)
      if (!actor.hp) actor.faintedAt = time
      effects.push({ kind: 'hit', type: 'poison', x: actor.x, target: actor.index, damage: 4, at: time, expires: time + .6 })
      if (actor.hp && (!actor.status || actor.status.kind === 'poison' && !actor.status.severe) &&
          !immune.poison.some(type => actor.types.includes(type))) {
        actor.status = { source: hazard.owner, kind: 'poison', severe: true, ends: time + statusDuration.poison, tick: time + 1, severity: 5 }
      }
      if (!actor.hp) break
    }
  }

  function advanceTrash(scene) {
    if (scene.landing) {
      const { target, x } = scene.landing
      if (target.hp > 0) hit(scene.actor, target, { ...scene.move, effect: 'poison', chance: .75, push: 340 },
        Math.sign(x - scene.anchor) || scene.direction)
      placeSpikes(scene.actor, x, 6)
      scene.anchor = x
      scene.landing = null
    }
    if (scene.falling) {
      ultimate = null
      return
    }
    const from = scene.anchor ?? scene.origin
  const target = actors.filter(actor => rivals(scene.actor, actor) && actor.hp > 0 && !scene.targets.has(actor.index) &&
    effectiveness(scene.actor, actor, scene.move) > 0)
      .sort((a, b) => Math.abs(a.x - from) - Math.abs(b.x - from))[0]
    const duration = target ? .34 : .42
    const x = target?.x ?? from
    if (target) {
      scene.targets.add(target.index)
      scene.landing = { target, x }
    } else scene.falling = true
    effects.push({ kind: 'ultimate', type: 'poison', visual: 'trash', x, origin: from, positions: [x],
      falling: scene.falling, pulse: scene.pulse++, at: time, expires: time + duration })
    scene.next = time + duration
  }

  function advanceUltimate() {
    const scene = ultimate
    if (scene.pending?.length) {
      scene.pending = scene.pending.filter(({ target, when, power, variant, pushDirection }) => {
        if (when > time) return true
        if (target.hp > 0) hit(scene.actor, target, { ...scene.move, ...variant, power, count: 1 },
          pushDirection ?? (Math.sign(target.x - scene.actor.x) || scene.direction))
        return false
      })
    }
    if (time < scene.next) return
    const { actor, move, origin, direction } = scene
    if (move.visual === 'trash') {
      advanceTrash(scene)
      return
    }
    if (scene.pulse >= move.pulses) {
      if (move.visual === 'nightmare') {
        for (const target of actors) if (target.ultimateSleep) {
          target.status = null
          target.ultimateSleep = false
        }
      }
      if (move.type === 'normal') actor.exhaustedUntil = time + 3
      ultimate = null
      return
    }

    const enemies = actors.filter(enemy => rivals(actor, enemy) && enemy.hp > 0 && effectiveness(actor, enemy, move) > 0)
    const pulse = scene.pulse++
    const positions = enemies.map(enemy => enemy.x)
    let targets = enemies
    let anchor = origin
    let power = move.power
    let variant = {}
    switch (move.visual) {
      case 'beam':
        targets = enemies.filter(enemy => (enemy.x - origin) * direction >= -24)
        break
      case 'ice':
        variant = { effect: 'freeze', chance: 1 }
        break
      case 'thunder':
        if (pulse) power = 24
        variant = { effect: 'paralysis', chance: pulse ? .2 : .4 }
        break
      case 'vortex':
        variant = { effect: 'burn', chance: .3 }
        break
      case 'waves':
        variant = { push: 880 + pulse * 125 }
        break
      case 'combo':
      case 'orbs':
        targets = enemies.length ? [enemies[pulse % enemies.length]] : []
        anchor = targets[0]?.x ?? origin
        if (move.visual === 'combo' && targets.length) actor.x = bound(anchor - direction * 65, actor)
        break
      case 'fissure':
        anchor = arena.width / 2
        break
      case 'tornado':
        if (pulse === move.pulses - 1) enemies.forEach(enemy => { enemy.knockback = (random() - .5) * 1600 })
        break
      case 'telekinesis':
      case 'web':
        if (!pulse) targets = []
        break
      case 'nightmare':
        if (!pulse) {
          for (const enemy of enemies) {
            if (sleepBlocked()) break
            enemy.status = { kind: 'sleep', ends: time + 5 }
            enemy.ultimateSleep = true
          }
          targets = []
        } else {
          power = 65
          const missing = actor.maxHp - actor.hp
          actor.hp = Math.min(actor.maxHp, actor.hp + Math.round(missing * .1 * enemies.length))
        }
        break
      case 'meteors':
        power = 17
        break
      case 'mist':
        variant = { effect: 'sleep', chance: .04 }
        break
    }
    const duration = move.visual === 'combo' ? .19 : move.visual === 'nightmare' ? (pulse ? 2 : .7) :
      ['waves', 'vortex', 'tornado', 'girder'].includes(move.visual) ? .62 : .46
    effects.push({ kind: 'ultimate', visual: move.visual, type: move.type, x: anchor, origin, direction,
      positions, pulse, at: time, expires: time + duration })
    const travel = ['waves', 'vortex'].includes(move.visual) || move.visual === 'thunder' && pulse || move.visual === 'meteors'
    if (travel) {
      scene.pending = targets.flatMap(target => {
        if (move.visual === 'meteors') return [
          { target, when: time + duration * .58, power, variant },
          { target, when: time + duration * .79, power: 7, variant }
        ]
        if (move.visual === 'thunder') {
          const branches = enemies.filter(other => other !== target)
          const landing = branches.length ? Math.min(...branches.map(other => Math.abs(other.x - target.x))) : 0
          return branches.length ? [{ target, when: time + duration * Math.max(.12, landing / arena.width),
            power: Math.min(34, power + (branches.length - 1) * 3), variant }] : []
        }
        const distance = direction > 0 ? target.x : arena.width - target.x
        return [{ target, when: time + duration * distance / arena.width, power, variant, pushDirection: direction }]
      })
      targets = []
    }
    for (const target of targets) {
      hit(actor, target, { ...move, ...variant, power, count: 1 }, Math.sign(target.x - actor.x) || direction)
      if (move.visual === 'telekinesis' && target.hp) target.confusion = { attempts: 0 }
      if (move.visual === 'web' && target.hp) target.next = Math.max(target.next, time + .85)
    }
    scene.next = time + duration
  }

  function advanceSolarThreats(dt) {
    const { actor } = ultimate
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const shot = projectiles[i]
      const gap = (actor.x - shot.x) * shot.direction
      if (shot.actor === actor || gap < 0 || gap > shot.move.reach) continue
      shot.x += shot.direction * 720 * dt
      if ((actor.x - shot.x) * shot.direction <= 25) {
        hit(shot.actor, actor, shot.move, shot.direction)
        projectiles.splice(i, 1)
        if (!actor.hp) { ultimate = null; return }
      } else if (time >= shot.end) projectiles.splice(i, 1)
    }
  }

  function immobilized(actor) {
    return actor.status?.kind === 'freeze' || actor.status?.kind === 'sleep'
  }

  function advanceKnockback(actor, dt) {
    if (!actor.hp || immobilized(actor) || Math.abs(actor.knockback) <= 3) return
    actor.x = bound(actor.x + actor.knockback * dt, actor)
    actor.knockback *= Math.exp(-8 * dt)
  }

  function creditDamage(source, target, amount) {
    if (!source || !rivals(source, target) || amount <= 0) return
    source.damageFraction = (source.damageFraction ?? 0) + amount / target.maxHp
    if (!target.hp) source.knockouts = (source.knockouts ?? 0) + 1
  }

  function dealChip(actor, fraction, type, visual, source) {
    if (source && !rivals(source, actor)) return
    const damage = Math.min(actor.hp, Math.max(1, Math.round(actor.maxHp * fraction)))
    actor.hp -= damage
    creditDamage(source, actor, damage)
    if (!actor.hp) actor.faintedAt = time
    effects.push({ kind: 'hit', type, visual, x: actor.x, target: actor.index, damage, at: time, expires: time + .55 })
  }

  function tickStatus(actor) {
    if (actor.heldItem === 'leftovers' && time >= (actor.nextLeftovers ?? 5)) {
      actor.nextLeftovers = time + 5
      actor.hp = Math.min(actor.maxHp, actor.hp + Math.max(1, Math.round(actor.maxHp * .02)))
    }
    if (actor.heldItem === 'toxic-orb' && !actor.orbActivated && !actor.status && time >= 2 &&
        !immune.poison.some(type => actor.types.includes(type))) {
      actor.orbActivated = true
      actor.status = { kind: 'poison', severe: true, ends: Infinity, tick: time + 1, severity: 0 }
    }
    const ongoing = actor.ongoing
    if (ongoing?.ends <= time) actor.ongoing = null
    else if (ongoing?.next <= time) {
      ongoing.next += 1
      const saltWeak = ongoing.kind === 'salt' && actor.types.some(type => ['steel', 'water'].includes(type))
      dealChip(actor, saltWeak ? .06 : .03, { salt: 'rock', wrap: 'normal', infestation: 'bug' }[ongoing.kind], ongoing.kind, actors[ongoing.source])
    }
    if (!actor.hp) return
    const leech = actor.leech
    if (leech?.ends <= time) actor.leech = null
    else if (leech?.next <= time) {
      leech.next += 1
      const source = actors[leech.source]
      if (source.hp > 0 && rivals(source, actor)) {
        const drained = Math.min(actor.hp, Math.max(1, Math.round(actor.maxHp * .035)))
        actor.hp -= drained
        creditDamage(source, actor, drained)
        source.hp = Math.min(source.maxHp, source.hp + drained)
        if (!actor.hp) actor.faintedAt = time
      }
    }
    const status = actor.status
    if (!status) return
    if (status.ends <= time || (status.source !== undefined && !rivals(actors[status.source], actor))) actor.status = null
    else if ((status.kind === 'burn' || status.kind === 'poison') && status.tick <= time) {
      status.tick += 1
      if (status.kind === 'poison' && hasPoisonHeal(actor.copiedSpecies ?? actor.id)) {
        actor.hp = Math.min(actor.maxHp, actor.hp + Math.max(1, Math.round(actor.maxHp * .04)))
        return
      }
      status.severity++
      const fraction = status.kind === 'burn' ? .025 : Math.min(.065, .01 + .005 * status.severity)
      const damage = Math.min(actor.hp, Math.max(1, Math.round(actor.maxHp * fraction)))
      actor.hp -= damage
      creditDamage(actors[status.source], actor, damage)
      if (!actor.hp) actor.faintedAt = time
    }
  }

  function walk(actor, direction, dt) {
    const speed = (120 + actor.speed * .65) * weatherSpeed(actor) * (actor.boosts.speed > time ? 1.5 : 1) *
      (actor.status?.kind === 'paralysis' ? .55 : 1) * (actor.slowUntil > time ? .65 : 1)
    let next = bound(actor.x + direction * speed * dt, actor)
    for (const other of actors) {
      if (actor.boss || other.boss || !rivals(actor, other) || !other.hp || other.dashUntil > time || (other.x - actor.x) * direction < 0) continue
      if (direction > 0) next = Math.min(next, Math.max(actor.x, other.x - bodySpacing(actor, other)))
      else next = Math.max(next, Math.min(actor.x, other.x + bodySpacing(actor, other)))
    }
    if (next === actor.x) return 'Idle'
    actor.x = next
    actor.direction = direction
    return 'Walk'
  }

  function separateBodies() {
    const solid = actors.filter(actor => !actor.boss && actor.hp > 0 && !(actor.dashUntil > time)).sort((a, b) => a.x - b.x)
    const anchored = actor => actor.cast?.move.channel && actor.cast.start + actor.cast.move.channel > time
    for (let i = 1; i < solid.length; i++) {
      const left = solid[i - 1]
      const right = solid[i]
      if (!rivals(left, right)) continue
      const gap = bodySpacing(left, right)
      const overlap = gap - (right.x - left.x)
      if (overlap <= 0) continue
      if (!anchored(left)) left.x = bound(left.x - overlap * (anchored(right) ? 1 : .5), left)
      if (!anchored(right)) right.x = bound(Math.max(right.x, left.x + gap), right)
    }
    for (let i = solid.length - 2; i >= 0; i--) {
      const left = solid[i]
      if (rivals(left, solid[i + 1]) && !anchored(left)) left.x = bound(Math.min(left.x, solid[i + 1].x - bodySpacing(left, solid[i + 1])), left)
    }
  }

  function act(actor, enemy, dt) {
    const distance = Math.max(0, Math.abs(enemy.x - actor.x) - extraReach(enemy))
    const toward = Math.sign(enemy.x - actor.x) || actor.direction
    let best
    let bestScore = 0
    let rangedScore = 0
    let meleeScore = 0
    let rangedReady = 0
    let meleeReady = 0
    const available = actor.kit.filter(id => moves[id].ultimate ? actor.ultimatePp > 0 && actor.ultimateCharge >= 100 : actor.pp[id] > 0)
    const choices = available.some(id => !moves[id].ultimate) ? available : [...available, 'struggle']
    let fallback
    for (const id of choices) {
      const move = moves[id]
      if (move.kind === 'support') {
        if (supportTarget(actor, move) && !(actor.cooldowns[id] > time) && bestScore < 140) { best = id; bestScore = 140 }
        continue
      }
      if (!move.ultimate && !move.heal && !move.protect && !fallback && !(actor.cooldowns[id] > time) &&
          (distance <= move.reach || move.kind === 'guard')) fallback = id
      if (move.kind === 'guard') {
        const active = move.field ? field?.kind === move.field : move.boost ? actor.boosts[move.boost] > time : actor.shield > time
        const score = move.field ? (actor.hp < actor.maxHp * .85 ? 41 : 31) :
          move.heal ? (actor.hp <= actor.maxHp * .2 ? 150 : 0) : move.protect ? (enemy.cast && distance < 170 ? 85 : 0) :
          move.blink ? (distance < 155 ? 58 : 0) : move.boost && actor.hp < actor.maxHp ? 38 : 23
        if (!active && !(actor.cooldowns[id] > time) && distance < 420 && bestScore < score) {
          best = id
          bestScore = score
        }
        continue
      }
      const matchup = move.ultimate || move.struggle ? 1 : effectiveness(actor, enemy, move)
      if (move.needsSleep && enemy.status?.kind !== 'sleep') continue
      const statusUseful = move.effect && !enemy.status && !(move.effect === 'sleep' && sleepBlocked()) &&
        !enemy.types.some(type => immune[move.effect].includes(type))
      const fatigue = actor.lastMove === id ? Math.max(.66, 1 - ((actor.repeat ?? 1) - 1) * .12) : 1
      const score = move.ultimate ? 125 : move.struggle ? 65 : move.hazard ?
        (enemy.status || immune.poison.some(type => enemy.types.includes(type)) ? 10 : 48) :
        (move.power * (move.count ?? 1) + (move.leech && !enemy.leech && !enemy.types.includes('grass') ? 44 : 0) +
        (move.slow && !(enemy.slowUntil > time) ? 24 : 0) +
        (statusUseful ? 60 * move.chance : 0)) * matchup * fatigue
      if (isRanged(move)) rangedScore = Math.max(rangedScore, score)
      if (move.kind === 'rush') meleeScore = Math.max(meleeScore, score)
      if (!(actor.cooldowns[id] > time)) {
        if (move.kind === 'rush') meleeReady = Math.max(meleeReady, score)
        if (isRanged(move)) rangedReady = Math.max(rangedReady, score)
      }
      if (distance <= move.reach && !(actor.cooldowns[id] > time) && score > bestScore) {
        best = id
        bestScore = score
      }
    }
    const pureRange = rangedScore > 0 && !meleeScore
    const prefersRange = pureRange || (rangedScore > 0 && rangedScore >= meleeScore * (distance < 135 ? 1.25 : .85) &&
      (rangedReady > 0 || !meleeReady || distance > 250))
    const threat = enemy.cast?.move.kind === 'rush' && distance < 195
    const incoming = projectiles.find(shot => rivals(shot.actor, actor) &&
      (actor.x - shot.x) * shot.direction > 0 && (actor.x - shot.x) * shot.direction < 115)
    const castArea = enemy.cast?.move.kind === 'area' && distance < enemy.cast.move.reach &&
      distance + 185 > enemy.cast.move.reach
    const enemyRanged = enemy.kit.some(id => isRanged(moves[id]))
    const closeGap = !prefersRange && meleeReady > rangedReady * .9 &&
      distance > 130 && distance < 345 && (enemyRanged || enemy.motion === 'Walk')
    const dashDirection = incoming ? (prefersRange ? incoming.direction : -incoming.direction) :
      castArea || (prefersRange && distance < 150 && (threat || !enemyRanged)) ? -toward :
      closeGap || actor.boss && distance > 180 && distance < 580 ? toward : 0
    const dashSpace = dashDirection < 0 ? actor.x - 75 : arena.width - 75 - actor.x
    if (dashDirection && dashSpace > 85 && actor.dashReady <= time &&
        actor.status?.kind !== 'paralysis' && (actor.boss || incoming || castArea || threat || !best || actor.next > time)) {
      actor.dashReady = time + (actor.boss ? 3.6 : 5)
      actor.dashUntil = time + .24
      actor.dodgeUntil = incoming ? actor.dashUntil : 0
      actor.dashDirection = dashDirection
      actor.direction = dashDirection
      return 'Run'
    }
    if (prefersRange && distance < 265 && (actor.next > time || distance < 125 && !best)) {
      const away = -toward
      const space = away < 0 ? actor.x - 75 : arena.width - 75 - actor.x
      if (space > 4) return walk(actor, away, dt)
    }
    if (best && actor.next <= time) {
      if (actor.status?.kind === 'paralysis' && random() < .25) actor.next = time + .55
      else if (cast(actor, best)) return actor.motion
    }
    if (!best && fallback && actor.next <= time && cast(actor, fallback)) return actor.motion
    if (distance > (actor.boss ? 115 : prefersRange ? 365 : 78)) return walk(actor, toward, dt)
    return 'Idle'
  }

  return {
    actors, projectiles, effects,
    get time() { return time },
    raid,
    get remaining() { return Math.max(0, roundEnd - time) },
    get winner() { return winner },
    get over() { return over },
    get suddenDeath() { return suddenDeath },
    get field() { return field ? { kind: field.kind, start: field.start, ends: field.ends } : null },
    get ultimate() { return ultimate ? { index: ultimate.actor.index, type: ultimate.move.type, visual: ultimate.move.visual,
      name: ultimate.move.name, charging: ultimate.pulse === 0, started: ultimate.start } : null },
    manual(index, moveId) {
      return actors[index] ? cast(actors[index], moveId, !auto) : false
    },
    step(dt) {
      if (over) return
      time += dt
      tickField()
      for (let i = effects.length - 1; i >= 0; i--) if (effects[i].expires <= time) effects.splice(i, 1)
      if (ultimate) {
        if (ultimate.move.type === 'grass' && ultimate.pulse === 0) advanceSolarThreats(dt)
        if (ultimate) advanceUltimate()
        if (ultimate) {
          if (ultimate.pulse > 0) {
            for (const actor of actors) advanceKnockback(actor, dt)
            separateBodies()
          }
          return
        }
      }
      for (const actor of actors) {
        if (actor.hp <= 0) continue
        if (auto) charge(actor, dt * 4.6)
        if (actor.confuseAt !== undefined && time >= actor.confuseAt) {
          actor.confuseAt = undefined
          actor.confusion = { attempts: 0 }
        }
        tickStatus(actor)
        useBerry(actor)
        if (!actor.hp) continue
        if (actor.id === 875 && field?.kind === 'hail' && actor.lastIceField !== field) {
          actor.lastIceField = field
          actor.iceFaceUsed = false
          actor.formShieldHits = 0
        }
        updateForm(actor)
        const locked = immobilized(actor)
        advanceKnockback(actor, dt)
        if (actor.cast) {
          resolve(actor, dt)
          continue
        }
        const exhausted = actor.exhaustedUntil > time
        const enemy = auto && !locked && !exhausted && !(actor.flinchUntil > time) && closest(actor)
        const dashing = enemy && actor.hurtUntil <= time && actor.dashUntil > time
        if (dashing) actor.x = bound(actor.x + actor.dashDirection * 850 * dt, actor)
        const motion = dashing ? 'Run' : exhausted || locked && actor.status.kind === 'sleep' ? 'Sleep' :
          enemy && actor.hurtUntil <= time ? act(actor, enemy, dt) : 'Idle'
        if (motion !== actor.motion) {
          actor.motion = motion
          actor.motionSince = time
        }
        if (ultimate) return
      }
      separateBodies()
      if (hazards.length) for (const actor of actors) if (actor.hp > 0) stepOnSpikes(actor)
      for (let i = hazards.length - 1; i >= 0; i--) if (hazards[i].expires <= time) hazards.splice(i, 1)
      for (let i = queuedShots.length - 1; i >= 0; i--) {
        const shot = queuedShots[i]
        if (shot.at > time) continue
        if (shot.actor.hp > 0) launch(shot.actor, shot.move, shot.direction)
        queuedShots.splice(i, 1)
      }
      const destroyed = new Set()
      for (let i = 0; i < projectiles.length; i++) {
        for (let j = i + 1; j < projectiles.length; j++) {
          const a = projectiles[i], b = projectiles[j]
          if (destroyed.has(a) || destroyed.has(b) || a.direction === b.direction || !rivals(a.actor, b.actor)) continue
          const gap = (b.x - a.x) * a.direction
          if (gap < 0 || gap > 1440 * dt || !a.move.type || !b.move.type) continue
          const left = typeChart[a.move.type + ':' + b.move.type] ?? 1
          const right = typeChart[b.move.type + ':' + a.move.type] ?? 1
          if (left === right) continue
          destroyed.add(left > right ? b : a)
          effects.push({ kind: 'clash', x: (a.x + b.x) / 2, at: time, expires: time + .3 })
        }
      }
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const shot = projectiles[i]
        if (destroyed.has(shot)) { projectiles.splice(i, 1); continue }
        const prior = shot.x
        shot.x += shot.direction * 720 * dt
        const enemy = actors.filter(actor => rivals(shot.actor, actor) && actor.hp > 0 && !(actor.dodgeUntil > time) &&
          actor.x >= Math.min(prior, shot.x) - 25 - extraReach(actor) && actor.x <= Math.max(prior, shot.x) + 25 + extraReach(actor))
          .sort((a, b) => Math.abs(a.x - prior) - Math.abs(b.x - prior))[0]
        if (enemy) hit(shot.actor, enemy, shot.move, shot.direction)
        if (enemy || time >= shot.end || shot.x < 0 || shot.x > arena.width) projectiles.splice(i, 1)
      }
      const alive = actors.filter(actor => actor.hp > 0)
      const timedOut = auto && time >= roundEnd
      if (teams) {
        const survivors = new Set(alive.map(teamOf))
        const boss = raid && actors.find(actor => actor.boss)
        if (survivors.size <= 1 || timedOut) {
          over = true
          if (boss) winner = boss.hp > 0 ? boss : alive[0] ?? null
          else if (survivors.size === 1) winner = alive[0]
          else {
            const scores = [...survivors].map(team => [team, actors.filter(actor => teamOf(actor) === team)
              .reduce((sum, actor) => sum + actor.hp / actor.maxHp, 0)]).sort((a, b) => b[1] - a[1])
            if (scores[0]?.[1] > (scores[1]?.[1] ?? 0)) winner = alive.find(actor => teamOf(actor) === scores[0][0])
          }
        }
        return
      }
      const ranked = timedOut ? [...alive].sort((a, b) => b.hp / b.maxHp - a.hp / a.maxHp) : alive
      const tied = timedOut ? ranked.filter(actor => Math.abs(actor.hp / actor.maxHp - ranked[0].hp / ranked[0].maxHp) < 1e-7) : []
      if (auto && !suddenDeath && (tied.length > 1 || alive.length === 0)) {
        suddenDeath = true
        roundEnd = time + 25
        const finalists = alive.length ? tied : actors.filter(actor => actor.faintedAt === time)
        for (const actor of alive) if (!finalists.includes(actor)) {
          actor.hp = 0
          actor.faintedAt = time
        }
        projectiles.length = 0
        queuedShots.length = 0
        effects.length = 0
        hazards.length = 0
        field = null
        finalists.forEach((actor, index) => {
          Object.assign(actor, { hp: Math.ceil(actor.maxHp * .25), x: bound(arena.width / 2 + (index - (finalists.length - 1) / 2) * 130, actor),
            status: null, leech: null, ongoing: null, orbActivated: false, boosts: {}, cast: null, shield: 0, knockback: 0, hurtUntil: 0, faintedAt: undefined,
            cooldowns: {}, confusion: null, flinchUntil: 0, slowUntil: 0, dashUntil: 0, dodgeUntil: 0, exhaustedUntil: 0, dashReady: time, next: time + .6 })
        })
      } else if (alive.length <= 1 || timedOut) {
        over = true
        winner = alive.length === 1 ? alive[0] : timedOut && tied.length === 1 ? ranked[0] : null
      }
    }
  }
}

export function hpColor(fraction) {
  return fraction <= .2 ? '#f35465' : fraction <= .5 ? '#ffd15a' : '#73e2a1'
}

