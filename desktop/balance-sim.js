import { setImmediate } from 'node:timers/promises'
import { battleSpecies, battleStatsAtLevel, createBattle } from '../dev/battle.js'

export function simEntry(id, level, dna) {
  const entry = battleSpecies(id)
  if (!entry || !Number.isInteger(level) || level < 1 || level > 100 || !Number.isInteger(dna) || dna < 0 || dna > 10) throw new Error('Invalid simulation fighter')
  const [, stats, types, final] = entry
  return { id, stats, types, final, level, dna }
}

export async function simulateMatchup({ fighters, rounds = 100, seed = 2026 }) {
  if (!Array.isArray(fighters) || fighters.length !== 2 || !Number.isInteger(rounds) || rounds < 1 || rounds > 10_000 ||
      !Number.isInteger(seed)) throw new Error('Invalid simulation settings')
  const entries = fighters.map(({id, level, dna}) => simEntry(id, level, dna))
  let generator = seed >>> 0
  const random = () => {
    generator = (Math.imul(1664525, generator) + 1013904223) >>> 0
    return generator / 4294967296
  }
  const stats = entries.map(entry => ({
    id: entry.id, level: entry.level, dna: entry.dna,
    effective: battleStatsAtLevel(entry.id, entry.stats, entry.level, entry.dna),
    wins: 0, winPercent: 0, remainingHpPercent: 0, damagePercent: 0, knockouts: 0
  }))
  let draws = 0
  let seconds = 0
  for (let index = 0; index < rounds; index++) {
    const swapped = index % 2
    const battle = createBattle(swapped ? [...entries].reverse() : entries, {random})
    while (!battle.over && battle.time < 90) battle.step(1 / 30)
    seconds += battle.time
    const winner = battle.winner
    if (winner) stats[winner.index ^ swapped].wins++
    else draws++
    for (const actor of battle.actors) {
      const summary = stats[actor.index ^ swapped]
      summary.remainingHpPercent += actor.hp / actor.maxHp * 100
      summary.damagePercent += (actor.damageFraction ?? 0) * 100
      summary.knockouts += actor.knockouts ?? 0
    }
    if (index % 8 === 7) await setImmediate()
  }
  for (const summary of stats) {
    summary.winPercent = summary.wins / rounds * 100
    summary.remainingHpPercent /= rounds
    summary.damagePercent /= rounds
  }
  return { rounds, seed, draws, meanSeconds: seconds / rounds, fighters: stats }
}
