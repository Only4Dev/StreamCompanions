import test from 'node:test'
import assert from 'node:assert/strict'
import { catchChance, createGame } from '../desktop/game.js'
import { captureCategories } from '../ui/capture-rates.js'
import { xpAtLevel } from '../ui/levels.js'

test('an existing viewer with no Pokémon can claim a starter without a community reset', () => {
  const catalog = [{ id: 1, name: 'Bulbasaur' }, { id: 150, name: 'Mewtwo', legendary: true }]
  const game = createGame({ catalog, streamStarters: true, random: () => 0, progress: { viewers: {
    'kick:1': { balls: { normal: 0 }, collection: {}, pokeDollars: 42 }
  } } })
  assert.equal(game.chat('kick:1', '!poke join', 'Viewer', 'kick'), 'joined')
  assert.equal(game.starterName('kick:1'), 'Bulbasaur')
  assert.equal(game.chat('kick:1', '!poke join', 'Viewer', 'kick'), 'alreadyJoined')
  assert.equal(game.progress().viewers['kick:1'].pokeDollars, 42)
  assert.equal(game.progress().viewers['kick:1'].balls.normal, 0)
})

test('the legendary encounter slider supports zero and guaranteed odds', () => {
  const catalog = [{ id: 1, name: 'Bulbasaur' }, { id: 150, name: 'Mewtwo', legendary: true }]
  for (const [legendaryChancePercent, expected] of [[0, 'Bulbasaur'], [100, 'Mewtwo']]) {
    let now = 0
    const game = createGame({ catalog, now: () => now, random: () => 0, progress: { config: { legendaryChancePercent } } })
    now += 30 * 60_000
    assert.equal(game.snapshot().encounter.name, expected)
  }
})

test('DNA Booster purchases affect both variants and use a shared cap', () => {
  const viewerId = 'twitch:4'
  const game = createGame({ progress: { viewers: { [viewerId]: { collection: { Brasa: 0, 'Brasa ✦': 0 },
    dnaBoosters: { Brasa: 9 }, pokeDollars: 30_000 } } } })
  const buy = (id, speciesKey) => game.fulfillOrder({ id, viewerId, item: 'dna-booster', speciesKey })
  assert.equal(buy('1', 'Brasa'), 'purchased')
  assert.equal(buy('1', 'Brasa'), 'purchased')
  assert.equal(buy('2', 'Brasa'), 'maxed')
  assert.equal(buy('3', 'Gota'), 'unavailable')
  assert.equal(buy('4', 'Brasa ✦'), 'maxed')
  const saved = game.progress().viewers[viewerId]
  assert.deepEqual(saved.dnaBoosters, { Brasa: 10 })
  assert.equal(saved.pokeDollars, 20_000)
})

test('DNA purchases share one cap across an evolution branch and survive reconnecting', () => {
  const id = 'kick:4'
  const catalog = [{ id: 79, name: 'Slowpoke', shiny: true }, { id: 80, name: 'Slowbro', shiny: true }, { id: 199, name: 'Slowking', shiny: true }]
  const game = createGame({ catalog, progress: { viewers: { [id]: {
    collection: { Slowpoke: xpAtLevel(16), 'Slowpoke ✦': 0 },
    dnaBoosters: { Slowpoke: 4, Slowbro: 3 }, pokeDollars: 50_000
  } } } })
  const buy = (idempotencyKey, speciesKey, quantity) => game.fulfillOrder({ id: idempotencyKey, viewerId: id, item: 'dna-booster', speciesKey, quantity })
  assert.equal(buy('too-many', 'Slowking', 4), 'maxed')
  assert.equal(buy('shared', 'Slowking', 3), 'purchased')
  assert.equal(buy('cap', 'Slowpoke'), 'maxed')
  const reopened = createGame({ catalog, progress: game.progress() })
  assert.equal(reopened.fulfillOrder({ id: 'shared', viewerId: id, item: 'dna-booster', speciesKey: 'Slowking', quantity: 3 }), 'purchased')
  const viewer = reopened.progress().viewers[id]
  for (const key of ['Slowpoke', 'Slowbro', 'Slowking']) assert.equal(reopened.dnaCount(viewer, key), 10)
  assert.equal(reopened.dnaCount(viewer, 'Slowpoke ✦'), 10)
  assert.equal(viewer.pokeDollars, 20_000)
})

test('an erased viewer cannot be recreated by chat after a restart', () => {
  const game = createGame({ progress: { viewers: { 'twitch:1': { collection: { Brasa: 120 } } } } })
  const erased = { viewer_id: 'twitch:1', generation: 1, active: 0 }
  assert.equal(game.applyErasure(erased), true)
  assert.equal(game.applyErasure(erased), false)
  const reopened = createGame({ progress: game.progress() })
  assert.equal(reopened.chat('twitch:1', '!poke join'), '')
  assert.equal(reopened.snapshot().viewers['twitch:1'], undefined)
  assert.equal(reopened.applyErasure({ ...erased, generation: 2, active: 1 }), true)
  reopened.chat('twitch:1', '!poke join')
  assert.equal(reopened.applyErasure(erased), false)
  assert.deepEqual(reopened.snapshot().viewers['twitch:1'].collection, {})
})

test('shop retry after restart neither charges nor delivers twice', () => {
  const order = { id: 'retry', viewerId: 'twitch:1', item: 'sitrus-berry' }
  const game = createGame({ progress: { viewers: { 'twitch:1': { collection: {}, pokeDollars: 8000 } } } })
  assert.equal(game.fulfillOrder(order), 'purchased')
  const reopened = createGame({ progress: game.progress() })
  assert.equal(reopened.fulfillOrder(order), 'purchased')
  assert.equal(reopened.fulfillOrder({ ...order, id: 'separate' }), 'owned')
  assert.deepEqual(reopened.progress().viewers['twitch:1'].heldItems, ['sitrus-berry'])
  assert.equal(reopened.progress().viewers['twitch:1'].pokeDollars, 5500)
})

test('the desktop shop denies insufficient funds and preserves inventory', () => {
  const viewerId = 'twitch:1'
  const game = createGame({ progress: { viewers: { [viewerId]: { collection: {}, balls: { normal: 5 }, pokeDollars: 99 } } } })
  assert.equal(game.fulfillOrder({ id: 'first', viewerId, item: 'poke-ball' }), 'funds')
  assert.equal(game.fulfillOrder({ id: 'second', viewerId, item: 'poke-ball', price: 0 }), 'unavailable')
  assert.equal(game.progress().viewers[viewerId].pokeDollars, 99)
  assert.equal(game.progress().viewers[viewerId].balls.normal, 5)
})

test('bulk purchases use the current unit price and deliver the entire order once', () => {
  const viewerId = 'twitch:1'
  const game = createGame({ progress: { viewers: { [viewerId]: { collection: {}, balls: { normal: 5 }, pokeDollars: 500 } } } })
  const order = { id: 'bulk', viewerId, item: 'poke-ball', price: 100, quantity: 3 }
  assert.equal(game.fulfillOrder({ ...order, id: 'stale', price: 90 }), 'repriced')
  assert.equal(game.fulfillOrder({ ...order, id: 'too-many', quantity: 6 }), 'funds')
  assert.equal(game.fulfillOrder({ ...order, id: 'unique', item: 'sitrus-berry' }), 'unavailable')
  assert.equal(game.fulfillOrder(order), 'purchased')
  assert.equal(createGame({ progress: game.progress() }).fulfillOrder(order), 'purchased')
  assert.equal(game.progress().viewers[viewerId].pokeDollars, 200)
  assert.equal(game.progress().viewers[viewerId].balls.normal, 8)
})

test('Master Balls cost 500,000 by default and use the configured purchase price', () => {
  const viewerId = 'twitch:1'
  const game = createGame({ progress: { viewers: { [viewerId]: {
    collection: {}, balls: { normal: 5, great: 0, ultra: 0, master: 0 }, pokeDollars: 1_000_000
  } } } })
  const order = { viewerId, item: 'master-ball', price: 500_000 }
  assert.equal(game.config.shopPrices['master-ball'], 500_000)
  assert.equal(game.fulfillOrder({ ...order, id: 'first' }), 'purchased')
  game.setShopPrices({ ...game.config.shopPrices, 'master-ball': 450_000 })
  assert.equal(game.fulfillOrder({ ...order, id: 'stale' }), 'repriced')
  assert.equal(game.fulfillOrder({ ...order, id: 'second', price: 450_000 }), 'purchased')
  assert.equal(game.ballInventory(viewerId).master, 2)
  assert.equal(game.progress().viewers[viewerId].pokeDollars, 50_000)
})

test('a configured battle prize pays only the winner of a completed contested round', () => {
  const game = createGame({ progress: { viewers: {
    A: { collection: { Brasa: 0 }, pokeDollars: 10 },
    B: { collection: { Gota: 0 }, pokeDollars: 10 }
  } } })
  assert.equal(game.config.battleMoneyPerWin, 0)
  assert.throws(() => game.configure({ ...game.config, battleMoneyPerWin: -1 }))
  game.configure({ ...game.config, battleMoneyPerWin: 250 })
  assert.equal(game.recordBattle(['A', 'B'], null), 0)
  assert.equal(game.recordBattle(['A'], 'A'), 0)
  assert.equal(game.recordBattle(['A', 'B', 'B'], 'A', 'Brasa'), 250)
  assert.equal(game.progress().viewers.A.pokeDollars, 260)
  assert.equal(game.progress().viewers.B.pokeDollars, 10)
  assert.equal(createGame({ progress: game.progress() }).config.battleMoneyPerWin, 250)
})

test('capture rates vary by species and ball, with guaranteed Master Ball', () => {
  assert.ok(catchChance('normal', 19) > catchChance('normal', 1))
  assert.ok(catchChance('ultra', 1) > catchChance('great', 1))
  assert.equal(catchChance('normal', 150, true), .01)
  assert.equal(catchChance('master', 150, true), 1)
})

test('streamer capture settings apply to throws and persist without changing Master Ball', () => {
  const percentages = Object.fromEntries(captureCategories.map(({ id, defaults }) => [id, [...defaults]]))
  percentages.superEasy[0] = 0
  const catalog = [{ id: 19, name: 'Rattata' }]
  const game = createGame({ catalog, random: () => 0 })
  game.setCapturePercentages(percentages)
  game.chat('player', '!poke join')
  game.spawn('Rattata')
  assert.equal(game.chat('player', '!catch'), 'escaped')
  assert.throws(() => game.setCapturePercentages({ ...percentages, superEasy: [101, 56, 75] }))
  assert.deepEqual(createGame({ catalog, progress: game.progress() }).config.capturePercentages, percentages)
  assert.equal(catchChance('master', 19, false, percentages), 1)
})

test('the regular pool excludes legendary, mythical, Ultra Beast, and Paradox species', () => {
  const catalog = [
    { id: 19, name: 'Rattata' }, { id: 150, name: 'Mewtwo', legendary: true },
    { id: 151, name: 'Mew' }, { id: 793, name: 'Nihilego' },
    { id: 804, name: 'Naganadel' }, { id: 984, name: 'Great Tusk' }
  ]
  let time = 0
  const game = createGame({ catalog, now: () => time, random: () => .999,
    progress: { config: { legendaryChancePercent: 0 } } })
  time = game.schedule()
  assert.equal(game.snapshot().encounter.name, 'Rattata')
  assert.equal(game.snapshot().encounter.specialTag, null)
  game.queueLegendary('Naganadel')
  time = game.schedule()
  assert.equal(game.snapshot().encounter.specialTag, 'ultraBeast')
  assert.equal(game.snapshot().encounter.endsAt - time, 300_000)
  game.spawn('Great Tusk')
  assert.equal(game.snapshot().encounter.specialTag, 'paradox')
  game.spawn('Mew')
  assert.equal(game.snapshot().encounter.specialTag, 'mythical')
})

test('a scheduled legendary survives restart and appears at level 1 for five minutes', () => {
  let time = 0
  const catalog = [{ id: 19, name: 'Rattata' }, { id: 20, name: 'Raticate' }, { id: 150, name: 'Mewtwo', legendary: true }]
  const first = createGame({ catalog, now: () => time })
  assert.throws(() => first.spawn('Raticate'))
  first.queueLegendary('Mewtwo')
  const game = createGame({ catalog, progress: first.progress(), now: () => time, random: () => .5 })
  time = game.schedule()
  const spawned = game.snapshot().encounter
  assert.equal(spawned.name, 'Mewtwo')
  assert.equal(spawned.level, 1)
  assert.equal(spawned.endsAt - time, 300_000)
  assert.equal(game.snapshot().nextLegendary, undefined)
})

test('linked accounts share one summon and candy evolution replaces the sprite in the same layer', () => {
  const twitch = 'twitch:1'
  const kick = 'kick:2'
  const catalog = [{ id: 884, name: 'Duraludon' }, { id: 1018, name: 'Archaludon' }]
  const diagnostics = []
  const game = createGame({ catalog, onSummonChange: change => diagnostics.push(change), progress: { viewers: {
    [twitch]: { collection: { Duraludon: xpAtLevel(30) }, rareCandies: 1 },
    [kick]: { collection: { Duraludon: xpAtLevel(30) }, rareCandies: 1 }
  } } })
  assert.equal(game.chat(twitch, '!summon duraludon', 'Viewer', 'twitch'), 'summoned')
  assert.equal(game.chat(kick, '!summon duraludon', 'Viewer', 'kick'), 'summoned')
  const before = game.overlay('companions').viewers[twitch].active.layer
  game.linkKickViewer(kick, twitch)
  const web = { sharedSummon: true }
  assert.equal(game.chat(twitch, '!candy', undefined, 'kick', web), 'candyUsed')
  const visible = game.overlay('companions').viewers
  assert.deepEqual(Object.keys(visible), [twitch])
  assert.equal(visible[twitch].active.key, 'Archaludon')
  assert.equal(visible[twitch].active.layer, before)
  assert.equal(game.chat(twitch, '!summon out', undefined, 'kick', web), 'removed')
  assert.deepEqual(game.overlay('companions').viewers, {})
  assert.equal(diagnostics.filter(change => change.event === 'evolved').length, 1)
})

test('Rare Candy levels the owned variant and preserves candy at the cap', () => {
  const game = createGame({ progress: { viewers: { a: { collection: { Brasa: xpAtLevel(49) }, rareCandies: 2 } } } })
  assert.equal(game.chat('a', '!candy'), 'candyNoSummon')
  assert.equal(game.chat('a', '!summon brasa'), 'summoned')
  assert.equal(game.chat('a', '!candy 0'), 'candyQuantity')
  assert.equal(game.chat('a', '!candy 2'), 'candyMaxLevel')
  assert.equal(game.chat('a', '!caramelo 1'), 'candyUsed')
  assert.equal(game.chat('a', '!candy'), 'candyMaxLevel')
  assert.equal(game.progress().viewers.a.rareCandies, 1)
})

test('a real battle blocks game commands and never catches up paused summon rewards', () => {
  let time = 0
  const game = createGame({ now: () => time, random: () => 0, progress: { viewers: {
    viewer: { collection: { Brasa: 0 }, rareCandies: 2 }
  } } })
  assert.equal(game.chat('viewer', '!summon brasa', 'Viewer', 'twitch'), 'summoned')
  game.setBattleActive(true)
  time = 120_000
  assert.equal(game.chat('viewer', '!candy 2', 'Viewer', 'twitch'), 'battleLocked')
  assert.equal(game.chat('viewer', '!summon out', 'Viewer', 'twitch'), 'battleLocked')
  assert.equal(game.snapshot().viewers.viewer.metrics.summonSeconds, 0)
  assert.equal(game.snapshot().viewers.viewer.rareCandies, 2)
  game.setBattleActive(false)
  time += 1000
  assert.equal(game.snapshot().viewers.viewer.metrics.summonSeconds, 1)
  assert.equal(game.chat('viewer', '!candy 2', 'Viewer', 'twitch'), 'candyUsed')
  assert.equal(game.snapshot().viewers.viewer.rareCandies, 0)
})

test('Master Ball drops use one 0.01 percent roll per active minute and persist in inventory', () => {
  for (const [roll, expected] of [[.000099, 1], [.0001, 0]]) {
    let time = 0
    const values = [.5, .5, roll]
    const game = createGame({ now: () => time, random: () => values.shift() ?? .5,
      progress: { viewers: { A: { collection: { Brasa: 0 }, balls: { normal: 5, great: 0, ultra: 0, master: 0 } } } } })
    game.chat('A', '!summon brasa')
    time = 59_999
    assert.equal(game.snapshot().viewers.A.balls.master, 0)
    time = 60_000
    assert.equal(game.snapshot().viewers.A.balls.master, expected)
    const restarted = createGame({ progress: game.progress(), random: () => .99 })
    assert.equal(restarted.ballInventory('A').master, expected)
    restarted.spawn('Gota')
    assert.equal(restarted.chat('A', '!catch master'), expected ? 'caught' : 'noBalls')
    assert.equal(restarted.ballInventory('A').master, 0)
  }
})

test('roaming rewards roll once per completed active minute and survive restart', () => {
  let time = 0
  const game = createGame({ now: () => time, random: () => 0,
    progress: { viewers: { A: { collection: { Brasa: 0 } } } } })
  game.chat('A', '!summon brasa')
  time = 59_000
  assert.equal(game.snapshot().viewers.A.rareCandies, undefined)
  time = 60_000
  const viewer = game.overlay('companions').viewers.A
  assert.deepEqual(viewer.active.pickup, { at: 60_000, candy: true, money: 50, masterBall: true })
  assert.equal(viewer.collection.Brasa, 480)
  const restarted = createGame({ progress: game.progress() })
  assert.equal(restarted.progress().viewers.A.rareCandies, 1)
  assert.equal(restarted.progress().viewers.A.pokeDollars, 50)
})

test('a community battle rewards the winning variant per unique opponent', () => {
  const game = createGame({ random: () => 0, progress: { viewers: {
    A: { collection: { Brasa: 5, 'Brasa ✦': 10 } },
    B: { collection: { Gota: 0 } }, C: { collection: { Musgo: 0 } }
  } } })
  game.recordBattle(['A', 'B', 'B', 'C'], 'A', 'Brasa ✦')
  const viewers = game.progress().viewers
  assert.deepEqual(viewers.A.collection, { Brasa: 5, 'Brasa ✦': 250 })
  assert.deepEqual(viewers.A.heldItems, ['sitrus-berry'])
  assert.equal(viewers.B.collection.Gota, 0)
})

test('stopping hides the encounter and summons, preserves XP and persists across restart', () => {
  let now = 0
  const game = createGame({ now: () => now, random: () => 0.02 })
  game.chat('viewer', '!poke join')
  game.spawn('Brasa')
  assert.equal(game.chat('viewer', '!catch'), 'caught')
  assert.equal(game.chat('viewer', '!summon brasa'), 'summoned')
  now = 5000
  game.setRunning(false)
  now = 60 * 60_000
  const saved = game.progress()
  const restarted = createGame({ now: () => now, progress: saved })
  assert.equal(game.snapshot().encounter, null)
  assert.equal(game.snapshot().viewers.viewer.active, null)
  assert.equal(saved.viewers.viewer.metrics.summonSeconds, 5)
  assert.equal(restarted.chat('viewer', '!summon brasa'), '')
  restarted.setRunning(true)
  assert.equal(restarted.schedule(), now + restarted.config.interval * 60_000)
  assert.equal(restarted.chat('viewer', '!summon brasa'), 'summoned')
})

test('evolution forms unlock at 16 and 31 and keep shared XP and evolve the active summon', () => {
  let now = 0
  const catalog = [{ id: 885, name: 'Dreepy' }, { id: 886, name: 'Drakloak' }, { id: 887, name: 'Dragapult' }]
  const saved = { config: { summonXpPerSecond: 1, summonXpTuned: true }, viewers: { owner: { collection: { Dreepy: xpAtLevel(16) - 1 } } } }
  const game = createGame({ catalog, progress: saved, now: () => now })
  assert.equal(game.chat('owner', '!summon drakloak'), 'missingCreature')
  assert.equal(game.chat('owner', '!summon dreepy'), 'summoned')
  now = 1000
  assert.equal(game.snapshot().viewers.owner.active.key, 'Drakloak')
  assert.equal(game.snapshot().viewers.owner.collection.Drakloak, xpAtLevel(16))
  assert.equal(game.chat('owner', '!summon drakloak'), 'summoned')
  now += 3000
  assert.deepEqual(game.snapshot().viewers.owner.collection, { Dreepy: xpAtLevel(16) + 3, Drakloak: xpAtLevel(16) + 3 })
  const high = createGame({ catalog, progress: { viewers: { owner: {
    collection: { Dreepy: xpAtLevel(31), Drakloak: xpAtLevel(17) }
  } } } })
  assert.deepEqual(high.snapshot().viewers.owner.collection, {
    Dreepy: xpAtLevel(31), Drakloak: xpAtLevel(31), Dragapult: xpAtLevel(31)
  })
  const evolvedSave = createGame({ catalog, progress: { viewers: { owner: { collection: { Drakloak: xpAtLevel(16) } } } } })
  assert.deepEqual(evolvedSave.snapshot().viewers.owner.collection, { Dreepy: xpAtLevel(16), Drakloak: xpAtLevel(16) })
})

test('branching forms unlock together at 16 and single direct evolutions unlock at 31', () => {
  const catalog = [{ id: 79, name: 'Slowpoke', shiny: true }, { id: 80, name: 'Slowbro', shiny: false },
    { id: 199, name: 'Slowking', shiny: true }, { id: 114, name: 'Tangela' }, { id: 465, name: 'Tangrowth' }]
  const game = createGame({ catalog, progress: { viewers: { owner: {
    collection: { Slowpoke: xpAtLevel(16), 'Slowpoke ✦': xpAtLevel(17), Tangela: xpAtLevel(30) },
  }, high: { collection: { Tangela: xpAtLevel(31) } } } } })
  const viewers = game.snapshot().viewers
  assert.equal(viewers.owner.collection.Slowbro, xpAtLevel(16))
  assert.equal(viewers.owner.collection.Slowking, xpAtLevel(16))
  assert.equal(viewers.owner.collection['Slowking ✦'], xpAtLevel(17))
  assert.equal(viewers.owner.collection['Slowbro ✦'], undefined)
  assert.equal(viewers.owner.collection.Tangrowth, undefined)
  assert.equal(viewers.high.collection.Tangrowth, xpAtLevel(31))
})

test('one account can catch once per channel and can summon from only one channel', () => {
  const game = createGame({ random: () => .25 })
  game.chat('linked-account', '!poke join', 'Viewer', 'twitch')
  game.spawn('Brasa')
  assert.equal(game.chat('linked-account', '!catch', 'Viewer', 'twitch'), 'caught')
  assert.equal(game.chat('linked-account', '!catch', 'Viewer', 'twitch'), 'alreadyCaught')
  assert.equal(game.chat('linked-account', '!catch', 'Viewer', 'kick'), 'duplicateReward')
  assert.equal(game.snapshot().recentCaptures.length, 2)
  assert.equal(game.chat('linked-account', '!summon brasa', 'Viewer', 'twitch'), 'summoned')
  assert.equal(game.chat('linked-account', '!summon brasa', 'Viewer', 'kick'), 'summoned')
  assert.equal(game.chat('linked-account', '!summon out', 'Viewer', 'twitch'), 'removed')
  assert.equal(game.chat('linked-account', '!summon brasa', 'Viewer', 'kick'), 'summoned')
})

test('a verified Kick link uses the Twitch record without doubling its inventory or active summon', () => {
  const game = createGame({ random: () => .25 })
  game.chat('twitch:22', '!poke join', 'Twitch viewer', 'twitch')
  game.chat('kick:87', '!poke join', 'Kick viewer', 'kick')
  game.spawn('Brasa')
  game.chat('twitch:22', '!catch', 'Twitch viewer', 'twitch')
  game.chat('kick:87', '!catch', 'Kick viewer', 'kick')
  game.chat('twitch:22', '!summon brasa', 'Twitch viewer', 'twitch')
  game.chat('kick:87', '!summon brasa', 'Kick viewer', 'kick')
  game.linkKickViewer('kick:87', 'twitch:22')
  const { viewers } = game.snapshot()
  assert.deepEqual(Object.keys(viewers), ['twitch:22'])
  assert.equal(viewers['twitch:22'].balls.normal, 4)
  assert.equal(viewers['twitch:22'].active.channel, 'twitch')
  assert.equal(game.chat('twitch:22', '!catch', 'Kick viewer', 'kick'), 'alreadyCaught')
  assert.equal(game.chat('twitch:22', '!summon brasa', 'Kick viewer', 'kick'), 'summoned')
})

test('manual spawn resets schedule and both viewers can catch', () => {
  let now = 0
  const game = createGame({ now: () => now, random: () => .25 })
  game.chat('A', '!poke join')
  game.chat('B', '!poke join')
  assert.equal(game.chat('A', '!poke join'), 'alreadyJoined')
  now = 28 * 60_000
  game.spawn('Brasa')
  assert.equal(game.snapshot().nextAt, 58 * 60_000)
  assert.equal(game.chat('A', '!catch'), 'caught')
  assert.equal(game.chat('B', '!catch'), 'caught')
  assert.equal(game.chat('A', '!catch'), 'alreadyCaught')
  assert.equal(game.snapshot().viewers.A.balls.normal, 4)
})

test('summons keep earning XP and money without chat activity', () => {
  let now = 0
  const game = createGame({ now: () => now, random: () => .25 })
  game.chat('A', '!poke join')
  game.spawn('Brasa')
  game.chat('A', '!catch')
  assert.equal(game.chat('A', '!summon brasa'), 'summoned')
  now = 1_100_000
  const viewer = game.snapshot().viewers.A
  assert.equal(viewer.active.key, 'Brasa')
  assert.equal(viewer.pokeDollars, 900)
  assert.equal(viewer.collection.Brasa, 8800)
  assert.equal(viewer.metrics.summonSeconds, 1100)
  game.chat('A', '!summon brasa')
  assert.equal(game.chat('A', '!summon out'), 'removed')
  assert.equal(game.snapshot().viewers.A.collection.Brasa, 8800)
})

test('a viewer battle records one result per participant and keeps it across restart', () => {
  const game = createGame()
  for (const id of ['A', 'B', 'C']) game.chat(id, '!poke join')
  game.recordBattle(['A', 'B', 'B'], null)
  game.recordBattle(['A', 'B', 'B'], 'A')
  const saved = createGame({ progress: game.progress() }).snapshot().viewers
  assert.deepEqual(saved.A.metrics, { wins: 1, losses: 0, summonSeconds: 0 })
  assert.deepEqual(saved.B.metrics, { wins: 0, losses: 1, summonSeconds: 0 })
  assert.deepEqual(saved.C.metrics, { wins: 0, losses: 0, summonSeconds: 0 })
})

test('sprite scale persists and rejects values outside the slider range', () => {
  const game = createGame()
  assert.equal(game.config.spriteScale, 100)
  game.configure({ ...game.config, spriteScale: 175 })
  const restored = createGame({ progress: game.progress() })
  assert.equal(restored.config.spriteScale, 175)
  assert.throws(() => restored.configure({ ...restored.config, spriteScale: 301 }))
  assert.equal(restored.config.spriteScale, 175)
})

test('a repeat catch grants XP once per encounter and can instead grant one level', () => {
  const game = createGame({ random: () => .25 })
  game.chat('a', '!poke join')
  game.spawn('Brasa')
  assert.equal(game.chat('a', '!catch'), 'caught')
  game.spawn('Brasa')
  assert.equal(game.chat('a', '!catch'), 'duplicateReward')
  assert.equal(game.chat('a', '!catch'), 'alreadyCaught')
  assert.equal(game.progress().viewers.a.collection.Brasa, 30)
  game.configure({ ...game.config, duplicateMode: 2 })
  game.spawn('Brasa')
  assert.equal(game.chat('a', '!catch'), 'duplicateReward')
  assert.equal(game.progress().viewers.a.collection.Brasa, 120)
  assert.equal(game.progress().viewers.a.balls.normal, 2)
  game.configure({ ...game.config, duplicateMode: 0 })
  game.spawn('Brasa')
  assert.equal(game.chat('a', '!catch'), 'alreadyCaught')
  assert.equal(game.progress().viewers.a.balls.normal, 2)
})

test('repeat catch XP scales with the current level and migrates old settings', () => {
  const xpAtLevel49 = xpAtLevel(49)
  const game = createGame({
    random: () => .25,
    progress: { config: { duplicateXp: 120 }, viewers: {
      a: { collection: { Brasa: xpAtLevel49 }, balls: { normal: 5 } }
    } }
  })
  assert.equal(game.config.duplicateXpPercent, 25)
  assert.equal(game.config.duplicateXp, undefined)
  game.spawn('Brasa')
  assert.equal(game.chat('a', '!catch'), 'duplicateReward')
  assert.equal(game.progress().viewers.a.collection.Brasa - xpAtLevel49, 2910)
})

test('capture grace hides the encounter immediately but still accepts late viewers', () => {
  let time = 0
  const game = createGame({ now: () => time, random: () => .25 })
  for (const id of ['a', 'b']) game.chat(id, '!poke join')
  game.spawn('Brasa')
  time = 180_000
  assert.equal(game.snapshot().encounter, null)
  assert.equal(game.chat('a', '!catch'), 'caught')
  assert.equal(game.chat('a', '!catch'), 'alreadyCaught')
  time = 190_000
  assert.equal(game.chat('b', '!catch'), 'noEncounter')
  assert.equal(game.progress().viewers.b.balls.normal, 5)
})

test('delay compensation can be disabled, and the next spawn cannot overlap an active grace window', () => {
  let time = 0
  const game = createGame({ now: () => time, random: () => .25 })
  game.chat('a', '!poke join')
  game.configure({ ...game.config, interval: 6, duration: 6, catchGraceSeconds: 10 })
  game.spawn('Brasa')
  time = 360_000
  assert.equal(game.snapshot().encounter, null)
  assert.equal(game.schedule(), 370_000)
  game.configure({ ...game.config, catchGraceSeconds: 0 })
  game.spawn('Musgo')
  time = 720_000
  assert.equal(game.snapshot().encounter.name, 'Brasa')
  assert.equal(game.progress().viewers.a.balls.normal, 5)
})

test('Spanish aliases register, catch, summon shiny and withdraw on the same state', () => {
  const game = createGame({ random: () => .25 })
  game.configure({ ...game.config, shiny: 1 })
  assert.equal(game.chat('a', '!poke unir'), 'joined')
  game.spawn('Brasa')
  assert.equal(game.chat('a', '!captura'), 'caught')
  assert.equal(game.chat('a', '!catch'), 'alreadyCaught')
  assert.equal(game.chat('a', '!invocar shiny Brasa'), 'summoned')
  assert.equal(game.snapshot().viewers.a.active.key, 'Brasa ✦')
  assert.equal(game.chat('a', '!retirar'), 'removed')
})

test('a battle pause keeps a live encounter catchable and resets the next spawn', () => {
  let now = 0
  const catalog = [{ id: 1, name: 'Bulbasaur' }]
  const game = createGame({ catalog, now: () => now, random: () => 0 })
  game.chat('viewer', '!poke join')
  game.spawn('Bulbasaur')
  game.setWildPaused(true)
  assert.equal(game.chat('viewer', '!catch ball'), 'caught')
  assert.equal(game.ballInventory('viewer').normal, 4)
  now += 31 * 60_000
  assert.equal(game.schedule(), null)
  assert.equal(game.hasEncounter(), false)
  assert.throws(() => game.spawn('Bulbasaur'), /paused/)
  game.setWildPaused(false)
  assert.equal(game.schedule(), now + 30 * 60_000)
})
