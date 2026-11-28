import trainingRules from './training.json' with { type: 'json' }
import { familyRoot } from './evolution.js'
export { trainingRules }
export const trainingKey = id => String(familyRoot(id))

export function normalizeTraining(row, dna = 0) {
  if (row) return { points: row.points, stats: { ...row.stats } }
  return { points: dna * trainingRules.dnaPointsPerBooster,
    stats: Object.fromEntries(trainingRules.stats.map(stat => [stat, dna])) }
}

export function validTraining(row) {
  if (!Number.isSafeInteger(row?.points) || row.points < 0 || row.points > trainingRules.maxPoints ||
      !row.stats || typeof row.stats !== 'object' || Array.isArray(row.stats)) return false
  let spent = 0
  for (const [stat, value] of Object.entries(row.stats)) {
    if (!trainingRules.stats.includes(stat) || !Number.isInteger(value) || value < 0 || value > trainingRules.maxPerStat) return false
    spent += value
  }
  return spent <= row.points
}

export function decodeAllocation(raw) {
  if (typeof raw !== 'string' || !/^\d{1,2}(,\d{1,2}){5}$/.test(raw)) return null
  const values = raw.split(',').map(Number)
  const stats = Object.fromEntries(trainingRules.stats.map((stat, index) => [stat, values[index]]))
  return validTraining({ points: trainingRules.maxPoints, stats }) ? stats : null
}

export function parseTrainingCommand(command) {
  if (typeof command !== 'string' || command.length > 120) return null
  const match = /^!training (apply|plus|minus|reset|save) (-|[A-Za-z]+|[0-9,]{1,17}) (.+)$/.exec(command)
  return match ? { operation: match[1], value: match[2], pokemon: match[3] } : null
}
