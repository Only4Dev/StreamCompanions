export const arenaShopItems = ['toxic-orb', 'quick-claw', 'damp-rock', 'heat-rock', 'grip-claw', 'wise-glasses', 'shell-bell', 'leppa-berry', 'leftovers', 'rusted-sword', 'rusted-shield', 'douse-drive', 'shock-drive', 'burn-drive', 'chill-drive']

const effects = {
  'shiny-dust': ['Convierte tu compañero invocado en shiny con !shiny.', 'Makes your summoned companion shiny with !shiny.'],
  'poke-ball': ['Poké Ball con probabilidad de captura básica.', 'Poké Ball with a basic catch chance.'],
  'great-ball': ['Mejora la probabilidad de captura de una Poké Ball.', 'Has a higher catch chance than a Poké Ball.'],
  'ultra-ball': ['Mejora la probabilidad de captura de una Super Ball.', 'Has a higher catch chance than a Great Ball.'],
  'master-ball': ['Garantiza la captura si el encuentro sigue activo.', 'Guarantees a catch while the encounter is active.'],
  'sitrus-berry': ['Recupera PS al bajar al 20%.', 'Restores HP at 20% HP or below.'],
  'toxic-orb': ['Envenena al portador.', 'Poisons the holder.'],
  'quick-claw': ['18% de probabilidad de reducir la espera tras atacar.', '18% chance to shorten the delay after an attack.'],
  'damp-rock': ['La lluvia dura 5 segundos más.', 'Rain lasts 5 seconds longer.'],
  'heat-rock': ['El sol dura 5 segundos más.', 'Sun lasts 5 seconds longer.'],
  'grip-claw': ['Extiende el efecto de los ataques que atrapan rivales.', 'Extends trapping effects.'],
  'wise-glasses': ['Aumenta un 10% el daño especial.', 'Increases special damage by 10%.'],
  'shell-bell': ['Cura un 12% del daño infligido.', 'Heals for 12% of damage dealt.'],
  'leppa-berry': ['Añade 2 PP a los movimientos normales.', 'Adds 2 PP to non-ultimate moves.'],
  leftovers: ['Recupera PS durante la batalla y refuerza los movimientos de curación.', 'Restores HP during battle and improves recovery moves.'],
  'rusted-sword': ['Activa la forma Espada Suprema de Zacian.', 'Activates Zacian’s Crowned Sword form.'],
  'rusted-shield': ['Activa la forma Escudo Supremo de Zamazenta.', 'Activates Zamazenta’s Crowned Shield form.'],
  'legendary-tracker': ['Hace que el próximo encuentro sea legendario. Se usa fuera de combate.', 'Makes the next wild encounter legendary. Use it outside battle.'],
  'rare-candy': ['Da experiencia al Pokémon invocado.', 'Gives experience to the summoned Pokémon.'],
  'poke-egg': ['Eclosiona al comprarlo y revela un Pokémon en su primera etapa.', 'Hatches on purchase and reveals a first-stage Pokémon.']
}

export function itemEffect(item, english) {
  if (effects[item]) return effects[item][Number(english)]
  if (item.endsWith('-drive')) return english ? 'Changes Genesect’s form and Techno Blast’s type.' : 'Cambia la forma de Genesect y el tipo de Tecno Shock.'
  if (heldItems[item]?.[2]) return english ? 'Boosts damage from moves of the matching type by 10%.' : 'Aumenta un 10% el daño de los movimientos del tipo correspondiente.'
  return ''
}

export const heldItems = {
  'sitrus-berry': ['Baya Zidra', 'Sitrus Berry'],
  'toxic-orb': ['Toxisfera', 'Toxic Orb'],
  'quick-claw': ['Garra Rápida', 'Quick Claw'],
  'damp-rock': ['Roca Lluvia', 'Damp Rock'],
  'heat-rock': ['Roca Calor', 'Heat Rock'],
  'grip-claw': ['Garra Garfio', 'Grip Claw'],
  'wise-glasses': ['Gafas Especiales', 'Wise Glasses'],
  'shell-bell': ['Cascabel Concha', 'Shell Bell'],
  'leppa-berry': ['Baya Zanama', 'Leppa Berry'],
  leftovers: ['Restos', 'Leftovers'],
  'rusted-sword': ['Espada Oxidada', 'Rusted Sword'],
  'rusted-shield': ['Escudo Oxidado', 'Rusted Shield'],
  'douse-drive': ['HidroROM', 'Douse Drive', 'water'],
  'shock-drive': ['FulgoROM', 'Shock Drive', 'electric'],
  'burn-drive': ['PiroROM', 'Burn Drive', 'fire'],
  'chill-drive': ['CrioROM', 'Chill Drive', 'ice'],
  'silk-scarf': ['Pañuelo Seda', 'Silk Scarf', 'normal'],
  'black-belt': ['Cinturón Negro', 'Black Belt', 'fighting'],
  'sharp-beak': ['Pico Afilado', 'Sharp Beak', 'flying'],
  'poison-barb': ['Flecha Venenosa', 'Poison Barb', 'poison'],
  'soft-sand': ['Arena Fina', 'Soft Sand', 'ground'],
  'hard-stone': ['Piedra Dura', 'Hard Stone', 'rock'],
  'silver-powder': ['Polvo Plata', 'Silver Powder', 'bug'],
  'spell-tag': ['Hechizo', 'Spell Tag', 'ghost'],
  'metal-coat': ['Revestimiento Metálico', 'Metal Coat', 'steel'],
  charcoal: ['Carbón', 'Charcoal', 'fire'],
  'mystic-water': ['Agua Mística', 'Mystic Water', 'water'],
  'miracle-seed': ['Semilla Milagro', 'Miracle Seed', 'grass'],
  magnet: ['Imán', 'Magnet', 'electric'],
  'twisted-spoon': ['Cuchara Torcida', 'Twisted Spoon', 'psychic'],
  'never-melt-ice': ['Antiderretir', 'Never-Melt Ice', 'ice'],
  'dragon-fang': ['Colmillo Dragón', 'Dragon Fang', 'dragon'],
  'black-glasses': ['Gafas de Sol', 'Black Glasses', 'dark'],
  'pixie-plate': ['Tabla Duende', 'Pixie Plate', 'fairy']
}
