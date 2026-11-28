import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGame } from '../desktop/game.js'
import { openProgress } from '../desktop/progress.js'
import { eggPool, eggProbabilities, nextEggPity, parseEggPool } from '../ui/egg-rules.js'
import { maxXp } from '../ui/levels.js'

const { weights, tierFor } = parseEggPool(eggPool)
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, actual + ' != ' + expected)

test('egg odds use the supplied four tiers and shift ten common points per miss', () => {
  assert.deepEqual(weights, { common: 82, rare: 14, epic: 3.5, legendary: 0.5 })
  assert.equal(tierFor(803), 'rare')
  assert.equal(tierFor(984), 'epic')
  assert.equal(tierFor(20), undefined)
  for (let misses = 0; misses < 4; misses++) {
    const odds = eggProbabilities(weights, { rare: misses })
    closeTo(odds.common, .82 - misses * .1)
    closeTo(odds.rare, .14 + misses * .08)
    closeTo(odds.epic, .035 + misses * .02)
    closeTo(odds.legendary, .005)
  }
  const reduced = eggProbabilities({ ...weights, rare: 0 })
  closeTo(Object.values(reduced).reduce((sum, chance) => sum + chance, 0), 1)
  assert.equal(reduced.rare, 0)
})

test('egg guarantees prioritize legendary, epic and then rare, with a linear legendary ramp', () => {
  const rare = eggProbabilities(weights, { rare: 4, epic: 18, legendary: 99 })
  assert.equal(rare.common, 0)
  closeTo(rare.rare / rare.epic, 4)
  closeTo(rare.legendary, .005)
  const epic = eggProbabilities(weights, { rare: 4, epic: 19, legendary: 99 })
  assert.equal(epic.common + epic.rare, 0)
  closeTo(epic.epic, .995)
  let last = .005
  for (let misses = 100; misses < 199; misses++) {
    const { legendary } = eggProbabilities(weights, { legendary: misses })
    assert.ok(legendary > last && legendary < 1)
    last = legendary
  }
  assert.deepEqual(eggProbabilities(weights, { rare: 4, epic: 19, legendary: 199 }),
    { common: 0, rare: 0, epic: 0, legendary: 1 })
})

test('higher egg rarities reset lower counters as well as their own', () => {
  const pity = { rare: 2, epic: 12, legendary: 31 }
  assert.deepEqual(nextEggPity(pity, 'common'), { rare: 3, epic: 13, legendary: 32 })
  assert.deepEqual(nextEggPity(pity, 'rare'), { rare: 0, epic: 13, legendary: 32 })
  assert.deepEqual(nextEggPity(pity, 'epic'), { rare: 0, epic: 0, legendary: 32 })
  assert.deepEqual(nextEggPity(pity, 'legendary'), { rare: 0, epic: 0, legendary: 0 })
})

test('SQLite persists player pity, charges and receipts across restart without replaying an egg', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sc-egg-pity-'))
  const file = join(directory, 'progress.sqlite')
  let db = openProgress(file)
  try {
    const catalog = [{ id: 19, name: 'Rattata' }, { id: 1, name: 'Bulbasaur' },
      { id: 984, name: 'Great Tusk' }, { id: 150, name: 'Mewtwo', legendary: true }]
    const options = { catalog, now: () => 0, random: () => .1 }
    const player = 'kick:1'
    const eggs = [{}, { rare: 4, epic: 18, legendary: 98 }, { rare: 4, epic: 19, legendary: 99 }, { rare: 4, epic: 19, legendary: 199 }]
    const viewers = Object.fromEntries(eggs.map((eggPity, i) => ['kick:' + (i + 1),
      { collection: {}, pokeDollars: 10000, eggPity, balls: { normal: 0, great: 0, ultra: 0, master: 0 } }]))
    const game = createGame({ ...options, progress: { viewers } })
    const order = { id: 'egg', viewerId: player, item: 'poke-egg' }
    assert.equal(game.fulfillOrder(order), 'purchased')
    db.save(game.progress())
    db.close()
    db = openProgress(file)
    const restarted = createGame({ ...options, progress: db.load() })
    assert.equal(restarted.fulfillOrder(order), 'purchased')
    assert.deepEqual(restarted.shopHatch(order.id), game.shopHatch(order.id))
    assert.equal(restarted.progress().viewers[player].pokeDollars, 5000)
    assert.deepEqual(db.viewer(player).eggPity, { rare: 1, epic: 1, legendary: 1 })
    for (const [i, rarity] of ['rare', 'epic', 'legendary'].entries()) {
      const id = 'guarantee-' + rarity
      assert.equal(restarted.fulfillOrder({ ...order, id, viewerId: 'kick:' + (i + 2) }), 'purchased')
      assert.equal(restarted.shopHatch(id).rarity, rarity)
    }
    db.save(restarted.progress())
    assert.deepEqual(db.viewer('kick:4').eggPity, { rare: 0, epic: 0, legendary: 0 })
  } finally {
    db.close()
    unlinkSync(file)
    rmdirSync(directory)
  }
})

test('egg lots apply pity sequentially and a retry keeps the same ordered receipt', () => {
  const catalog = [{ id: 19, name: 'Rattata' }, { id: 1, name: 'Bulbasaur' },
    { id: 984, name: 'Great Tusk' }, { id: 150, name: 'Mewtwo', legendary: true }]
  const options = { catalog, now: () => 0, random: () => .1 }
  const game = createGame({ ...options, progress: { viewers: { A: { collection: {}, pokeDollars: 50000 } } } })
  const order = { id: 'lot', viewerId: 'A', item: 'poke-egg', quantity: 10 }
  assert.equal(game.fulfillOrder({ ...order, id: 'invalid', quantity: 2 }), 'unavailable')
  assert.equal(game.fulfillOrder(order), 'purchased')
  const hatches = game.shopHatch(order.id)
  assert.deepEqual(hatches.map(hatch => hatch.rarity),
    ['common', 'common', 'common', 'common', 'rare', 'common', 'common', 'common', 'common', 'rare'])
  assert.equal(hatches[1].duplicate, true)
  const restarted = createGame({ ...options, progress: game.progress() })
  assert.equal(restarted.fulfillOrder(order), 'purchased')
  assert.deepEqual(restarted.shopHatch(order.id), hatches)
  assert.equal(restarted.progress().viewers.A.pokeDollars, 0)
  assert.deepEqual(restarted.progress().viewers.A.eggPity, { rare: 0, epic: 10, legendary: 10 })
})

test('each egg rolls independently at 1/200 and keeps the shiny result on retries', () => {
  const draws = [.1, .2, .00499, .1, .2, .005]
  const options = { catalog: [{ id: 19, name: 'Rattata' }], now: () => 0, random: () => draws.shift() }
  const game = createGame({ ...options, progress: { viewers: { A: { collection: {}, pokeDollars: 10000 } } } })
  const order = { id: 'first', viewerId: 'A', item: 'poke-egg' }
  assert.equal(game.fulfillOrder(order), 'purchased')
  assert.equal(game.shopHatch('first').shiny, true)
  assert.deepEqual(game.progress().viewers.A.collection, { 'Rattata ✦': 0 })
  const restarted = createGame({ ...options, progress: game.progress() })
  assert.equal(restarted.fulfillOrder(order), 'purchased')
  assert.equal(restarted.shopHatch('first').shiny, true)
  assert.equal(restarted.fulfillOrder({ ...order, id: 'second' }), 'purchased')
  assert.equal(restarted.shopHatch('second').shiny, undefined)
  assert.equal(restarted.shopHatch('second').duplicate, false)
  assert.equal(draws.length, 0)
})

test('twenty successful wild catches unlock the exact shiny even at max level', () => {
  const id = 'twitch:1'
  const options = { catalog: [{ id: 19, name: 'Rattata' }, { id: 1, name: 'Bulbasaur' }], now: () => 1, random: () => .9 }
  const dir = mkdtempSync(join(tmpdir(), 'sc-shiny-catches-'))
  const file = join(dir, 'progress.sqlite')
  const db = openProgress(file)
  try {
    const game = createGame({ ...options, progress: { viewers: { [id]: {
      collection: { Rattata: maxXp }, balls: { normal: 1, master: 24 }
    } } } })
    game.spawn('Rattata')
    assert.equal(game.chat(id, '!catch normal'), 'escaped')
    for (let i = 0; i < 19; i++) {
      game.spawn('Rattata')
      assert.equal(game.chat(id, '!catch master'), 'caught')
      assert.equal(game.chat(id, '!catch master'), 'alreadyCaught')
    }
    game.spawn('Bulbasaur')
    assert.equal(game.chat(id, '!catch master'), 'caught')
    db.save(game.progress())
    assert.deepEqual(db.viewer(id).shinyCaptures, { 19: 19, 1: 1 })
    const restarted = createGame({ ...options, progress: db.load() })
    assert.ok(!Object.hasOwn(restarted.progress().viewers[id].collection, 'Rattata ✦'))
    restarted.spawn('Rattata')
    assert.equal(restarted.chat(id, '!catch master'), 'caught')
    const viewer = restarted.progress().viewers[id]
    assert.equal(viewer.collection['Rattata ✦'], maxXp)
    assert.equal(viewer.shinyCaptures[19], 20)
    assert.ok(!Object.hasOwn(viewer.collection, 'Bulbasaur ✦'))
  } finally {
    db.close()
    unlinkSync(file)
    rmdirSync(dir)
  }
})
