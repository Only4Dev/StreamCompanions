export const maxLevel = 50

export function level(xp) {
  return Math.min(maxLevel, 1 + Math.floor(Math.sqrt(xp / 120)))
}

export const xpAtLevel = value => (value - 1) ** 2 * 120
export const maxXp = xpAtLevel(maxLevel)
export const defaultSummonXpPerSecond = 8
export const ultimateLevel = 31
