import abilitiesData from './pokemon-abilities.json' with { type: 'json' }

const indexedTypes = types => Object.fromEntries(types.split(' ').map((type, index) => [type, index + 1]))

export const battleFormAssets = {
  493: indexedTypes('bug dark dragon electric fighting fire flying ghost grass ground ice poison psychic rock steel water fairy'),
  649: { water: 1, electric: 2, fire: 3, ice: 4 },
  773: indexedTypes('fighting flying poison ground rock bug ghost steel fire water grass electric psychic ice dragon dark fairy'),
  888: { crowned: 1 },
  889: { crowned: 1 },
  351: { sun: 1, rain: 2, hail: 3 },
  421: { sunshine: 1 },
  555: { zen: 1 },
  10177: { zen: 3 },
  648: { pirouette: 1 },
  658: { ash: 1 },
  681: { blade: 1 },
  718: { complete: 2 },
  746: { school: 1 },
  774: { core: 1 },
  778: { busted: 1 },
  845: { gulping: 1, gorging: 2 },
  875: { noice: 1 },
  877: { hangry: 1 },
  964: { hero: 1 },
  1024: { terastal: 1, stellar: 2 }
}

export const battleFormFallbacks = {
  10177: { zen: 10178 }, 658: { ash: 10117 }, 774: { core: 10136 },
  845: { gulping: 10182, gorging: 10183 }, 1024: { terastal: 10276, stellar: 10277 }
}

export { abilitiesData }

for (const [id, entry] of Object.entries(abilitiesData.species)) {
  if (!Array.isArray(entry.abilities) || entry.abilities.some(key => {
    const definition = abilitiesData.definitions[key]
    return !definition || (definition.exclusiveTo && !definition.exclusiveTo.includes(Number(id)))
  })) throw new Error('Invalid abilities for species ' + id)
}

let customAbilities = abilitiesData.species
export function applyAbilities(data) {
  if (!data?.species || Object.keys(data.species).length !== Object.keys(abilitiesData.species).length) throw new Error('Invalid ability file')
  for (const id of Object.keys(abilitiesData.species)) {
    const list = data.species[id]?.abilities
    if (!Array.isArray(list) || list.length > 8 || new Set(list).size !== list.length || list.some(key => {
      const ability = Object.hasOwn(abilitiesData.definitions, key) && abilitiesData.definitions[key]
      return !ability || ability.exclusiveTo && !ability.exclusiveTo.includes(Number(id))
    })) throw new Error('Invalid abilities for species ' + id)
  }
  customAbilities = data.species
}
export const abilitiesFor = id => customAbilities[id]?.abilities ?? ['steadfast']
export const hasPickup = id => abilitiesFor(id).includes('pickup')
export const hasPoisonHeal = id => abilitiesFor(id).includes('poison-heal')

export function abilityDetails(id, english) {
  const position = Number(english)
  const entries = [abilitiesData.innate[id], ...abilitiesFor(id).map(key => abilitiesData.definitions[key])].filter(Boolean)
  return entries.map(entry => ({ name: entry.names[position], effect: entry.effects[position] }))
}
