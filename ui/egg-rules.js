import pool from './egg-pool.json' with { type: 'json' }
import { catchRates } from './capture-rates.js'
import { isFirstStage } from './evolution.js'

export const eggPool = pool

export function parseEggPool(input) {
  const byId = new Map()
  const weights = {}
  for (const tier of ['common', 'uncommon', 'rare', 'epic', 'legendary']) {
    const { percent, species } = input?.tiers?.[tier] ?? {}
    if (!Number.isFinite(percent) || percent < 0 || percent > 100 || !species || typeof species !== 'object' || Array.isArray(species)) {
      throw new Error('Invalid egg tier: ' + tier)
    }
    weights[tier] = percent
    for (const value of Object.keys(species)) {
      const id = Number(value)
      if (!Object.hasOwn(catchRates.species, value) || !isFirstStage(id) || byId.has(id)) throw new Error('Invalid or duplicated egg species: ' + value)
      byId.set(id, tier)
    }
  }
  const expected = Object.values(weights).reduce((total, percent) => total + percent, 0)
  if (Math.abs(expected - 100) > 1e-8 || weights.legendary === 100) throw new Error('Egg tier percentages must sum to 100')
  const tierFor = (id, special) => {
    const tier = byId.get(id)
    return special ? special === 'legendary' && tier === 'legendary' ? tier : null : tier === 'legendary' ? null : tier
  }
  return { weights, tierFor, legendaryChance: weights.legendary / 100 }
}
const defaults = parseEggPool(pool)
export const eggWeights = defaults.weights
export const eggPoolTier = defaults.tierFor
export const legendaryEggChance = defaults.legendaryChance
