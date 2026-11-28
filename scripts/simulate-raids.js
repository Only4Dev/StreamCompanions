import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { once } from 'node:events'
import { join, resolve } from 'node:path'
import { createBattle } from '../dev/battle.js'
import { raidBossEntry, simEntry } from '../desktop/balance-sim.js'
import roster from '../ui/raid-bosses.json' with { type: 'json' }
import learnsets from '../ui/learnsets.json' with { type: 'json' }

const destination = resolve(process.argv[2] ?? 'raid-balance')
const rounds = Number(process.argv[3] ?? 8)
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100) throw Error('Rounds must be between 1 and 100')
mkdirSync(destination, { recursive: true })
const stream = createWriteStream(join(destination, 'combates.jsonl'))
async function log(event) {
  if (!stream.write(JSON.stringify(event) + '\n')) await once(stream, 'drain')
}

const attackers = [6, 9, 25, 149, 94, 376, 248, 448, 635, 445, 130, 282]
const support = [[122, ['reflect', 'lightscreen', 'psychic']], [242, ['helpinghand', 'healbeam', 'headbutt']], [131, ['auroraveil', 'surf', 'ice']]]
const scenarios = [
  { name: '4 sin apoyo', count: 4, utilitySlots: 0 },
  { name: '8 sin apoyo', count: 8, utilitySlots: 2 },
  { name: '8 con apoyo', count: 8, utilitySlots: 2, useSupport: true },
  { name: '12 con apoyo', count: 12, utilitySlots: 3, useSupport: true }
]
function entry(id, selectedMoves) {
  return { ...simEntry(id, 60, 2), name: learnsets.species[id].name, team: 'raid-party', selectedMoves }
}
const average = (rows, field) => Math.round(rows.reduce((sum, row) => sum + row[field], 0) / rows.length)
const results = []
for (const boss of roster.bosses) for (const scenario of scenarios) {
  const samples = []
  for (let run = 0; run < rounds; run++) {
    const seed = (20261128 + boss.species * 101 + run) >>> 0
    let state = seed
    const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296)
    const party = attackers.slice(0, scenario.count - scenario.utilitySlots).map(id => entry(id))
    const supports = support.slice(0, scenario.utilitySlots).map(([id, selected]) => entry(id, scenario.useSupport ? selected : undefined))
    const entries = [...supports, ...party, raidBossEntry(boss)]
    const fighter = entries.length - 1
    const events = []
    const damageByPokemon = entries.slice(0, fighter).map((member, index) => ({ index, name: member.name, fromBoss: 0, toBoss: 0, absorbed: 0 }))
    let bossDamage = 0, partyDamage = 0, absorbed = 0, distance = 0, enragedAt = null
    const battle = createBattle(entries, { raid: true, duration: 120, random, onCombatEvent(event) {
      if (event.kind === 'damage') {
        if (event.source === fighter) {
          bossDamage += event.amount
          damageByPokemon[event.target].fromBoss += event.amount
        } else if (event.target === fighter && event.source !== null) {
          partyDamage += event.amount
          damageByPokemon[event.source].toBoss += event.amount
        }
      }
      if (event.kind === 'absorbed' && event.source === fighter) {
        absorbed += event.amount
        damageByPokemon[event.target].absorbed += event.amount
      }
      if (run === 0) events.push(event)
    } })
    const actor = battle.actors[fighter]
    let prior = actor.x
    while (!battle.over) {
      battle.step(1 / 60)
      distance += Math.abs(actor.x - prior)
      prior = actor.x
      if (enragedAt === null && actor.hp <= actor.maxHp * .2) enragedAt = Math.round(battle.time * 10) / 10
    }
    const sample = { win: actor.hp === 0, bossDamage, partyDamage, absorbed, bossHp: actor.hp,
      distance: Math.round(distance), seconds: Math.round(battle.time * 10) / 10,
      survivors: battle.actors.slice(0, fighter).filter(member => member.hp > 0).length, enragedAt, damageByPokemon }
    samples.push(sample)
    if (run === 0) {
      const tags = { boss: boss.name, scenario: scenario.name, seed }
      await log({ ...tags, kind: 'start', config: boss.stats, roster: entries.map((item, index) => ({ index, name: item.name, moves: battle.actors[index].kit })) })
      for (const event of events) await log({ ...tags, ...event, time: Math.round(event.time * 100) / 100 })
      await log({ ...tags, kind: 'result', ...sample })
    }
  }
  results.push({ boss: boss.name, scenario: scenario.name, wins: samples.filter(row => row.win).length, rounds,
    enrage: samples.filter(row => row.enragedAt !== null).length,
    ...Object.fromEntries(['bossDamage','partyDamage','absorbed','bossHp','distance','seconds','survivors'].map(field => [field, average(samples, field)])),
    samples })
}
stream.end()
await once(stream, 'finish')
writeFileSync(join(destination, 'resumen.json'), JSON.stringify({ duration: 120, rounds, results }, null, 2) + '\n')
console.table(results.map(({ samples, ...summary }) => summary))
