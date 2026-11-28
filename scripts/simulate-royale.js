import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createBattle } from '../dev/battle.js'
import { simEntry } from '../desktop/balance-sim.js'

const scenarios = [
  { name: '1x, foco libre', hpMultiplier: 1 },
  { name: '1.5x, foco libre', hpMultiplier: 1.5 },
  { name: '2x, foco libre', hpMultiplier: 2 },
  { name: '1x, foco distribuido', hpMultiplier: 1, spreadFocus: true },
  { name: '1.5x, foco distribuido', hpMultiplier: 1.5, spreadFocus: true },
  { name: '2x, foco distribuido', hpMultiplier: 2, spreadFocus: true }
]
const layouts = [
  { name: 'Combate abierto', positions: [260, 350, 480, 640, 725, 840, 1030, 1115, 1250, 1430, 1515, 1650] },
  { name: 'Choque agrupado', positions: [700, 760, 820, 850, 910, 970, 1000, 1060, 1120, 1150, 1210, 1270] }
]
const pool = [6, 19, 122, 9, 25, 242, 149, 94, 131, 376, 248, 448]
const support = { 122: ['reflect', 'lightscreen', 'psychic'], 242: ['helpinghand', 'healbeam', 'headbutt'], 131: ['auroraveil', 'surf', 'ice'] }
const trials = 24
const report = []
for (const layout of layouts) for (const withSupport of [false, true]) for (const setup of scenarios) {
  const totals = { firstKo: 0, earlyKo: 0, duration: 0, focusBursts: 0, absorbed: 0, dodges: 0, hits: 0 }
  for (let trial = 0; trial < trials; trial++) {
    let seed = (260211 + trial * 139) >>> 0
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
    const entries = pool.map((_, index) => {
      const id = pool[(index + trial * 3) % pool.length]
      return { ...simEntry(id, 45, 0), team: 'team-' + Math.floor(index / 3), selectedMoves: withSupport ? support[id] : undefined }
    })
    const windows = new Map()
    let firstKo
    const battle = createBattle(entries, { ...setup, random, onCombatEvent(event) {
      if (event.kind === 'absorbed') totals.absorbed += event.amount
      if (event.kind === 'dodge') totals.dodges++
      if (event.kind !== 'damage' || event.source === null) return
      totals.hits++
      const recent = (windows.get(event.target) ?? []).filter(({ time }) => event.time - time <= .55)
      const attackers = new Set(recent.map(({ source }) => source))
      if (attackers.size === 2 && !attackers.has(event.source)) totals.focusBursts++
      windows.set(event.target, [...recent, event])
    } })
    battle.actors.forEach((actor, index) => { actor.x = layout.positions[index] })
    while (!battle.over) {
      battle.step(1 / 60)
      if (firstKo === undefined && battle.actors.some(actor => !actor.hp)) firstKo = battle.time
    }
    totals.firstKo += firstKo ?? battle.time
    totals.earlyKo += Number(firstKo < 10)
    totals.duration += battle.time
  }
  report.push({ layout: layout.name, withSupport, ...setup, trials, firstKoSeconds: +(totals.firstKo / trials).toFixed(1),
    earlyKo: totals.earlyKo, durationSeconds: +(totals.duration / trials).toFixed(1),
    focusBurstsPerBattle: +(totals.focusBursts / trials).toFixed(2), focusBurstsPerMinute: +(60 * totals.focusBursts / totals.duration).toFixed(2),
    absorbedPerBattle: Math.round(totals.absorbed / trials),
    dodgePercent: +(100 * totals.dodges / (totals.hits + totals.dodges)).toFixed(1) })
}
assert.equal(report.length, layouts.length * 2 * scenarios.length)
writeFileSync(resolve(process.argv[2] ?? 'balance-royale.json'), JSON.stringify({ trialsPerScenario: trials, turns: report }, null, 2) + '\n')
console.table(report)
