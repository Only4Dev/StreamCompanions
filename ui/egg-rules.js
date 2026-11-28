import pool from './egg-pool.json' with { type: 'json' }
import { catchRates } from './capture-rates.js'
import { isFirstStage } from './evolution.js'

export const eggPool = pool
export const eggRarities = ['common', 'rare', 'epic', 'legendary']

export function parseEggPool(input) {
  const byId = new Map()
  const weights = { common: 0, rare: 0, epic: 0, legendary: 0 }
  // Keep older custom pools usable by folding their retired tier into rare.
  const tiers = Object.hasOwn(input?.tiers ?? {}, 'uncommon') ? [...eggRarities, 'uncommon'] : eggRarities
  for (const tier of tiers) {
    const { percent, species } = input?.tiers?.[tier] ?? {}
    if (!Number.isFinite(percent) || percent < 0 || percent > 100 || !species || typeof species !== 'object' || Array.isArray(species)) {
      throw new Error('Invalid egg tier: ' + tier)
    }
    const rarity = tier === 'uncommon' ? 'rare' : tier
    weights[rarity] += percent
    for (const value of Object.keys(species)) {
      const id = Number(value)
      if (!Object.hasOwn(catchRates.species, value) || !isFirstStage(id) || byId.has(id)) throw new Error('Invalid or duplicated egg species: ' + value)
      byId.set(id, rarity)
    }
  }
  const expected = Object.values(weights).reduce((total, percent) => total + percent, 0)
  if (Math.abs(expected - 100) > 1e-8 || weights.legendary === 100) throw new Error('Egg tier percentages must sum to 100')
  return { weights, tierFor: id => byId.get(id) }
}

export function eggProbabilities(weights, pity = {}) {
  const chances = { ...weights }
  const originalTotal = Object.values(chances).reduce((sum, chance) => sum + chance, 0)
  if (!originalTotal) return chances

  const guarantee = [
    [(pity.legendary ?? 0) >= 199, ['legendary']],
    [(pity.epic ?? 0) >= 19, ['epic', 'legendary']],
    [(pity.rare ?? 0) >= 4, ['rare', 'epic', 'legendary']]
  ].find(([due, tiers]) => due && tiers.some(rarity => chances[rarity] > 0))
  if (guarantee) {
    const [, tiers] = guarantee
    for (const rarity of eggRarities) if (!tiers.includes(rarity)) chances[rarity] = 0
  } else {
    const higherWeight = chances.rare + chances.epic
    if (higherWeight > 0) {
      const shift = Math.min(chances.common, (pity.rare ?? 0) * 10 * originalTotal / 100)
      chances.common -= shift
      chances.rare += shift * chances.rare / higherWeight
      chances.epic += shift * chances.epic / higherWeight
    }
  }

  const regular = ['common', 'rare', 'epic']
  const regularTotal = regular.reduce((sum, rarity) => sum + chances[rarity], 0)
  const legendary = chances.legendary / originalTotal
  const boost = legendary > 0 && pity.legendary >= 100 ? (pity.legendary - 99) / 100 : 0
  chances.legendary = regularTotal ? legendary + (1 - legendary) * boost : 1
  if (regularTotal) for (const rarity of regular) chances[rarity] *= (1 - chances.legendary) / regularTotal
  return chances
}

export function nextEggPity(pity = {}, rarity) {
  const rank = eggRarities.indexOf(rarity)
  return {
    rare: rank >= 1 ? 0 : (pity.rare ?? 0) + 1,
    epic: rank >= 2 ? 0 : (pity.epic ?? 0) + 1,
    legendary: rank >= 3 ? 0 : (pity.legendary ?? 0) + 1
  }
}

export const legendaryEggChance = parseEggPool(pool).weights.legendary / 100
