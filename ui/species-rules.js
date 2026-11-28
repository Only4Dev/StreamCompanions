import encounterRarities from './encounter-rarities.json' with { type: 'json' }
import { catchRates, specialEncounterTag } from './capture-rates.js'

export { encounterRarities }
export const specialRarities = new Set(['legendary', 'mythical', 'ultraBeast', 'paradox'])
const regular = Object.keys(encounterRarities.weights)
const allowed = new Set([...regular, ...specialRarities])

export function rarityFor(id, legendary, overrides) {
  return overrides?.species[id]?.rarity ?? encounterRarities.species[id]?.rarity ?? specialEncounterTag(id, legendary) ?? 'common'
}

export function normalizeSpeciesRules(kind, input) {
  if (!input?.species || typeof input.species !== 'object' || Array.isArray(input.species)) return null
  const species = {}
  if (kind === 'catch') {
    for (const [id, entry] of Object.entries(input.species)) {
      if (!Object.hasOwn(catchRates.species, id) || !Number.isInteger(entry?.rate) || entry.rate < 0 || entry.rate > 255) return null
      const values = entry.percentages
      if (values !== undefined && (!Array.isArray(values) || values.length !== 3 || values.some(value => !Number.isFinite(value) || value < 0 || value > 100))) return null
      species[id] = { rate: entry.rate, ...(values ? { percentages: [...values] } : {}) }
    }
    return { species }
  }
  if (kind !== 'rarity') return null
  const weights = { ...encounterRarities.weights }
  for (const key of regular) {
    const weight = input.weights?.[key] ?? weights[key]
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) return null
    weights[key] = weight
  }
  for (const [id, entry] of Object.entries(input.species)) {
    const base = encounterRarities.species[id]?.rarity
    if (!base || !allowed.has(entry?.rarity) || (specialRarities.has(base) && !specialRarities.has(entry.rarity))) return null
    species[id] = { rarity: entry.rarity }
  }
  return { species, weights }
}
