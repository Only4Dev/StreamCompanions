import assert from 'node:assert/strict'
import test from 'node:test'
import { arenaBaseStats, createBattle, formAtLevel, moveOptions, moves, movesFor, hpColor, ultimateOptions } from './battle.js'
import { nationalStats } from './national-stats.js'

const example = (id, level = 20) => {
  const [, stats, types, final] = nationalStats[id - 1]
  return { id, stats, types, final, level }
}
const run = (battle, seconds) => {
  for (let i = 0; i < seconds * 30; i++) battle.step(1 / 30)
}

test('Toxic Orb poisons eligible holders and Poison Heal restores HP on its ticks', () => {
  const entries = [285, 19, 81].map(id => ({ ...example(id), heldItem: 'toxic-orb' }))
  const battle = createBattle(entries, { auto: false, random: () => .5 })
  const [shroomish, rattata, magnemite] = battle.actors
  shroomish.hp = Math.floor(shroomish.maxHp / 2)
  const before = shroomish.hp
  run(battle, 3.2)
  assert.equal(shroomish.status.kind, 'poison')
  assert.equal(shroomish.hp - before, Math.round(shroomish.maxHp * .04))
  assert.equal(rattata.status.kind, 'poison')
  assert.ok(rattata.hp < rattata.maxHp)
  assert.equal(magnemite.status, null)
})

test('Damp Rock keeps rain active five extra seconds', () => {
  const battle = createBattle([{ ...example(131), heldItem: 'damp-rock' }, example(19)], { auto: false })
  assert.ok(battle.manual(0, 'rain'))
  run(battle, 10)
  assert.equal(battle.field.kind, 'rain')
  run(battle, 5)
  assert.equal(battle.field, null)
})

test('signature moves unlock and reward once per completed cast even with multiple targets', () => {
  const entries = [example(1000), example(19), example(20), example(52)]
  const rewards = []
  const battle = createBattle(entries, { auto: false, random: () => .5, onMoveReward: (actor, amount) => rewards.push([actor.id, amount]) })
  assert.ok(battle.actors[0].kit.includes('makeitrain'))
  assert.ok(battle.actors[3].kit.includes('payday'))
  battle.actors.forEach((actor, index) => { actor.x = 500 + index * 75 })
  assert.ok(battle.manual(0, 'makeitrain'))
  run(battle, 1)
  assert.deepEqual(rewards, [[1000, 100]])
  run(battle, 1)
  assert.ok(battle.manual(3, 'payday'))
  run(battle, 1)
  assert.deepEqual(rewards, [[1000, 100], [52, 50]])
})

test('Dragon Darts emits two separate Dreepy shots', () => {
  const battle = createBattle([example(887), example(19)], { auto: false, random: () => .5 })
  assert.ok(battle.actors[0].kit.includes('dragondarts'))
  assert.ok(battle.manual(0, 'dragondarts'))
  run(battle, .5)
  assert.equal(battle.projectiles.length, 1)
  run(battle, .2)
  assert.equal(battle.projectiles.length, 2)
  assert.ok(battle.projectiles.every(shot => shot.move.visual === 'dreepy'))
})

test('Minior switches in place at half HP and Castform follows changing weather', () => {
  const battle = createBattle([example(774), example(351), example(19)], { auto: false })
  const [minior, castform] = battle.actors
  const { x, maxHp } = minior
  minior.hp = Math.floor(maxHp / 2)
  run(battle, .1)
  assert.equal(minior.form, 'core')
  assert.equal(minior.x, x)
  assert.equal(minior.hp, Math.floor(maxHp / 2))
  assert.equal(battle.actors.length, 3)
  assert.ok(battle.manual(1, 'rain'))
  run(battle, 1)
  assert.equal(castform.form, 'rain')
  assert.deepEqual(castform.types, ['water'])
  run(battle, 10)
  assert.equal(castform.form, null)
  assert.deepEqual(castform.types, ['normal'])
})

test('Leppa Berry adds two regular PP and Leftovers improves Recover', () => {
  const entries = [{ ...example(120), heldItem: 'leftovers' }, { ...example(19), heldItem: 'leppa-berry' }]
  const battle = createBattle(entries, { auto: false })
  const [, basic] = battle.actors
  const unboosted = createBattle([example(120), example(19)], { auto: false })
  for (const key of Object.keys(basic.pp)) assert.equal(basic.pp[key], unboosted.actors[1].pp[key] + 2)
  const [holder] = battle.actors
  holder.hp = Math.floor(holder.maxHp * .1)
  const before = holder.hp
  assert.ok(battle.manual(0, 'recover'))
  run(battle, 1)
  assert.equal(holder.hp - before, Math.round(holder.maxHp * .5))
})

test('hail chips non-Ice Pokémon on three-second ticks and Sun launches Solar Beam immediately', () => {
  const battle = createBattle([example(131), example(1)], { auto: false, random: () => .5 })
  battle.manual(0, 'hail')
  run(battle, 3.6)
  assert.equal(battle.field.kind, 'hail')
  assert.equal(battle.actors[0].hp, battle.actors[0].maxHp)
  assert.ok(battle.actors[1].hp < battle.actors[1].maxHp)
  assert.ok(battle.manual(1, 'sun'))
  run(battle, .6)
  assert.equal(battle.field.kind, 'sun')
  assert.ok(battle.manual(1, 'solar'))
  assert.equal(battle.projectiles.length, 1)
})

test('Dig is untargetable while approaching, then damages the target', () => {
  const battle = createBattle([example(28), example(19)], { auto: false, random: () => .5 })
  const [digger, target] = battle.actors
  digger.x = 620
  target.x = 760
  assert.ok(battle.manual(0, 'dig'))
  assert.ok(battle.manual(1, 'tackle'))
  run(battle, 1.8)
  assert.equal(digger.hp, digger.maxHp)
  assert.ok(target.hp < target.maxHp)
})

test('Recover is limited to low HP, with the configured battle HP multiplier', () => {
  const entries = [example(120), example(19)]
  const base = createBattle(entries).actors[0].maxHp
  const battle = createBattle(entries, { auto: false, hpMultiplier: 2, random: () => .5 })
  const [actor] = battle.actors
  assert.equal(actor.maxHp, base * 2)
  assert.equal(moves.recover.pp, 1)
  assert.equal(moves.guard.pp, 5)
  assert.equal(battle.manual(0, 'recover'), false)
  actor.hp = Math.floor(actor.maxHp * .2)
  const before = actor.hp
  assert.equal(battle.manual(0, 'recover'), true)
  run(battle, 1)
  assert.equal(actor.hp - before, Math.round(actor.maxHp * .4))
})

test('Fisura damages distant grounded enemies and leaves flying enemies unharmed', () => {
  const battle = createBattle([example(28, 31), example(19), example(16)], { auto: false, random: () => .5 })
  const [caster, grounded, flying] = battle.actors
  caster.x = 180
  grounded.x = 1710
  assert.equal(battle.manual(0, 'ultimate-ground'), true)
  run(battle, 1.5)
  assert.ok(grounded.hp > 0 && grounded.hp < grounded.maxHp)
  assert.equal(flying.hp, flying.maxHp)
})

test('walking contact is harmless, but tackle hits once and pushes the opponent', () => {
  const battle = createBattle([example(1), example(25)], { auto: false, random: () => .5 })
  const [actor, opponent] = battle.actors
  actor.x = opponent.x = 1000
  run(battle, .2)
  assert.equal(opponent.hp, opponent.maxHp)
  actor.x = 880
  assert.equal(battle.manual(0, 'tackle'), true)
  run(battle, .4)
  assert.ok(opponent.hp < opponent.maxHp)
  assert.ok(opponent.x > 1000)
  assert.equal(battle.effects.filter(effect => effect.kind === 'hit').length, 1)
})

test('a normal attack applies type immunity and an active ultimate blocks a second cast', () => {
  const battle = createBattle([example(3, 31), example(74)], { auto: false, random: () => .5 })
  const [actor, opponent] = battle.actors
  actor.x = 700
  opponent.x = 900
  assert.equal(battle.manual(0, 'ultimate-grass'), true)
  assert.equal(battle.manual(1, 'ultimate-rock'), false)
  run(battle, 1)
  assert.equal(battle.manual(0, 'ultimate-grass'), false)
  const immune = createBattle([example(25), example(74)], { auto: false })
  immune.actors[0].x = 700
  immune.actors[1].x = 900
  assert.equal(immune.manual(0, 'pulse'), true)
  run(immune, 1)
  assert.equal(immune.actors[1].hp, immune.actors[1].maxHp)
  assert.deepEqual(movesFor(3, ['grass'], true), ['tackle', 'leaf', 'spores', 'solar', 'ultimate-grass'])
  assert.deepEqual(movesFor(2, ['grass'], false), ['tackle', 'leaf', 'spores', 'solar', 'ultimate-grass'])
})

test('level increases stats, and the HP colors change at the intended thresholds', () => {
  const battle = createBattle([example(1, 10), example(1, 30)], { auto: false })
  assert.ok(battle.actors[1].maxHp > battle.actors[0].maxHp)
  assert.ok(battle.actors[1].attack > battle.actors[0].attack)
  assert.notEqual(hpColor(.51), hpColor(.50))
  assert.notEqual(hpColor(.21), hpColor(.20))
  assert.equal(nationalStats.filter(([, stats]) => stats.length === 6).length, 1025)
})

test('automatic rounds terminate with the sole survivor when there is one', () => {
  const battle = createBattle([example(6), example(10)], { random: () => .5 })
  run(battle, 60.1)
  assert.equal(battle.over, true)
  assert.ok(battle.winner)
  assert.equal(battle.actors.filter(actor => actor.hp > 0).length, 1)
})

test('Slowbro backs away during cooldown and favors water against a fire Pokémon', () => {
  const battle = createBattle([example(80), example(4)], { random: () => .5 })
  const [slowbro, opponent] = battle.actors
  slowbro.x = 800
  opponent.x = 960
  opponent.next = 60
  battle.step(1 / 30)
  assert.ok(slowbro.x < 800)
  slowbro.next = 0
  battle.step(1 / 30)
  assert.equal(slowbro.cast.move.type, 'water')
})

test('Impactrueno rolls its status and freeze prevents actions for five seconds', () => {
  const rolls = [.5, .09]
  const battle = createBattle([example(25), example(19)], { auto: false, random: () => rolls.shift() ?? .5 })
  const [actor, target] = battle.actors
  actor.x = 800
  target.x = 950
  battle.manual(0, 'thunder')
  run(battle, .7)
  assert.equal(target.status.kind, 'paralysis')
  const frozen = createBattle([example(131), example(19)], { auto: false, random: () => .08 })
  frozen.actors[0].x = 800
  frozen.actors[1].x = 950
  frozen.manual(0, 'ice')
  run(frozen, .7)
  assert.equal(frozen.actors[1].status.kind, 'freeze')
  assert.equal(frozen.manual(1, 'tackle'), false)
  run(frozen, 5)
  assert.equal(frozen.actors[1].status, null)
  assert.equal(frozen.manual(1, 'tackle'), true)
})

test('sleep can break on a hit and poison ramps up', () => {
  const battle = createBattle([example(46), example(19)], { auto: false, random: () => .29 })
  const [actor, target] = battle.actors
  actor.x = 800
  target.x = 950
  battle.manual(0, 'spores')
  run(battle, .7)
  assert.equal(target.status.kind, 'sleep')
  battle.manual(0, 'leaf')
  run(battle, .7)
  assert.equal(target.status, null)
  battle.manual(0, 'poison')
  run(battle, .8)
  const initial = target.hp
  run(battle, 2)
  const lightDamage = initial - target.hp
  run(battle, 2)
  assert.ok(initial - target.hp - lightDamage > lightDamage)
})

test('rain heals its caster for nine ticks and sunny day replaces it immediately', () => {
  const battle = createBattle([example(131), example(37)], { auto: false, random: () => .5 })
  const [caster, rival] = battle.actors
  caster.hp = caster.maxHp * .5
  rival.hp = rival.maxHp * .5
  assert.equal(battle.manual(0, 'rain'), true)
  run(battle, .5)
  assert.equal(battle.field.kind, 'rain')
  assert.equal(battle.field.ends - battle.field.start, 9)
  run(battle, 10)
  assert.ok(Math.abs(caster.hp / caster.maxHp - .59) < 1e-7)
  assert.equal(rival.hp / rival.maxHp, .5)
  assert.equal(battle.field, null)
  battle.manual(0, 'rain')
  run(battle, .5)
  battle.manual(1, 'sun')
  run(battle, .5)
  assert.equal(battle.field.kind, 'sun')
  const unchanged = caster.hp
  run(battle, 3)
  assert.equal(caster.hp, unchanged)
})

test('fields apply their damage multipliers and Electric Terrain prevents sleep', () => {
  const attack = (move, field) => {
    const battle = createBattle([example(151), example(143)], { auto: false, random: () => .25 })
    const [actor, target] = battle.actors
    actor.x = 800
    target.x = 970
    if (field) {
      battle.manual(0, field)
      run(battle, .5)
    }
    battle.manual(0, move)
    run(battle, 1)
    return { damage: target.maxHp - target.hp, status: target.status?.kind }
  }
  for (const [move, field, multiplier] of [
    ['water', 'rain', 1.5], ['ember', 'rain', .5], ['ember', 'sun', 1.5], ['water', 'sun', .5],
    ['thunder', 'electricField', 1.2], ['leaf', 'grassField', 1.2]
  ]) {
    assert.ok(Math.abs(attack(move, field).damage - attack(move).damage * multiplier) <= 1, move + ' ' + field)
  }
  assert.equal(attack('hypnosis').status, 'sleep')
  assert.equal(attack('hypnosis', 'electricField').status, undefined)
})

test('Grassy Terrain heals only Grass types, even when someone else casts it', () => {
  const battle = createBattle([example(151), example(1), example(143)], { auto: false, random: () => .5 })
  for (const actor of battle.actors) actor.hp = actor.maxHp * .5
  battle.manual(0, 'grassField')
  run(battle, 10.6)
  const ratios = battle.actors.map(actor => actor.hp / actor.maxHp)
  assert.equal(ratios[0], .5)
  assert.ok(Math.abs(ratios[1] - .6) < 1e-7)
  assert.equal(ratios[2], .5)
})

test('every National Pokédex species learns four distinct moves progressively, and ultimates unlock at 31', () => {
  for (const [id, , types, final] of nationalStats) {
    for (const [level, count] of [[1, 1], [5, 2], [10, 3], [20, 4]]) {
      assert.equal(new Set(movesFor(id, types, final, level).filter(key => !moves[key].ultimate)).size, count)
    }
    assert.ok(moveOptions(id, types, final, 20).every(key => moves[key]))
  }
  assert.equal(movesFor(3, ['grass'], true, 30).includes('ultimate-grass'), false)
  assert.equal(movesFor(3, ['grass'], true, 31).includes('ultimate-grass'), true)
})

test('individual Ascuas rolls for burn rather than applying it automatically', () => {
  for (const [roll, expected] of [[.09, 'burn'], [.11, undefined]]) {
    const battle = createBattle([example(4), example(19)], { auto: false, random: () => roll })
    battle.actors[0].x = 800
    battle.actors[1].x = 950
    battle.manual(0, 'ember')
    run(battle, .8)
    assert.equal(battle.actors[1].status?.kind, expected)
  }
})

test('random preview picks stages at 16 and 31 while retaining the family learnset', () => {
  assert.deepEqual([1, 15, 16, 30, 31].map(level => formAtLevel(4, level)), [4, 4, 5, 5, 6])
  assert.deepEqual([1, 16, 31].map(level => formAtLevel(6, level)), [4, 5, 6])
  assert.equal(formAtLevel(133, 31), 133)
  assert.equal(formAtLevel(134, 16), 134)
  assert.deepEqual(movesFor(4, ['fire'], false, 20), movesFor(6, ['fire', 'flying'], true, 20))
  assert.deepEqual(movesFor(123, ['bug', 'flying'], false, 31), ['quick', 'air', 'agility', 'lunge', 'ultimate-bug'])
})

test('a timeout starts one sudden-death rematch between the survivors', () => {
  const battle = createBattle([example(19, 1), example(19, 1)], { random: () => 0 })
  battle.actors.forEach(actor => { actor.next = 100 })
  run(battle, 60.1)
  assert.equal(battle.suddenDeath, true)
  assert.equal(battle.over, false)
  assert.ok(battle.actors.every(actor => actor.hp === Math.ceil(actor.maxHp * .25)))
  run(battle, 25.1)
  assert.equal(battle.over, true)
})

test('timeout awards the round to the healthier Pokémon and actor margins stop movement', () => {
  const battle = createBattle([{ ...example(19, 1), margin: 155 }, example(19, 1)], { random: () => .5 })
  const [leader, rival] = battle.actors
  leader.knockback = -2700
  leader.next = rival.next = 200
  rival.hp -= 5
  run(battle, .1)
  assert.ok(leader.x >= 155 && leader.x < 165)
  run(battle, 60.1)
  assert.equal(battle.winner, leader)
})

test('empty PP forces fixed-damage Struggle past immunities with recoil damage', () => {
  const battle = createBattle([example(19, 1), example(92, 1)], { random: () => .5 })
  const [actor, ghost] = battle.actors
  actor.x = 800
  ghost.x = 910
  ghost.next = 100
  assert.equal(actor.pp.tackle, 20)
  actor.pp.tackle = 0
  run(battle, .95)
  assert.equal(ghost.hp, ghost.maxHp - Math.ceil(ghost.maxHp * .2))
  assert.equal(actor.hp, actor.maxHp - Math.ceil(actor.maxHp * .1))
})

test('all 18 ultimate scenes complete and cannot overlap', () => {
  const keys = Object.keys(moves).filter(key => moves[key].ultimate)
  assert.equal(keys.length, 18)
  for (const key of keys) {
    const battle = createBattle([example(143, 31), example(3, 31), example(9, 31)], { auto: false, random: () => .5 })
    assert.equal(battle.manual(0, key), true, key)
    assert.equal(battle.manual(1, 'ultimate-grass'), false, key)
    run(battle, 8)
    assert.equal(battle.ultimate, null, key)
    assert.equal(battle.actors[0].ultimatePp, 1, key)
  }
})

test('ultimates charge from combat time, hits dealt and hits received before they can fire', () => {
  const battle = createBattle([example(9, 31), example(143, 31)], { random: () => .5 })
  const [actor, rival] = battle.actors
  actor.x = 800
  rival.x = 1000
  actor.next = 0
  rival.next = 99
  assert.equal(actor.ultimateCharge, 0)
  assert.equal(battle.manual(0, 'ultimate-water'), false)
  assert.equal(battle.manual(0, 'water'), true)
  run(battle, .85)
  assert.ok(actor.ultimateCharge > 4.6 * .85 + 5)
  assert.ok(rival.ultimateCharge > 4.6 * .85 + 4)
  actor.next = 0
  actor.ultimateCharge = 100
  assert.equal(battle.manual(0, 'ultimate-water'), true)
  assert.equal(actor.ultimateCharge, 0)
})

test('Triple Oleaje has three damaging waves and respects resistance and weakness', () => {
  const assess = types => {
    const battle = createBattle([example(99, 31), { ...example(143, 31), types }], { auto: false, random: () => .5 })
    const rival = battle.actors[1]
    const stages = new Set()
    const hits = new Set()
    assert.equal(battle.manual(0, 'ultimate-water'), true)
    for (let i = 0; i < 105; i++) {
      battle.step(1 / 30)
      for (const effect of battle.effects) {
        if (effect.kind === 'ultimate') stages.add(effect.pulse)
        if (effect.kind === 'hit') hits.add(effect.at)
      }
    }
    assert.equal(stages.size, 3)
    assert.equal(hits.size, 3)
    assert.equal(battle.actors[0].ultimatePp, 1)
    return (rival.maxHp - rival.hp) / rival.maxHp
  }
  const neutral = assess(['normal'])
  assert.ok(assess(['water']) < neutral)
  assert.ok(neutral > 0)
  assert.ok(assess(['fire']) > neutral)
})

test('Lanzamugre visits every rival once in nearest order and leaves one spike patch per bounce', () => {
  const battle = createBattle([example(89, 31), ...Array.from({ length: 7 }, () => example(143, 31))],
    { auto: false, random: () => .9 })
  const positions = [240, 810, 460, 1250, 630, 1480, 1050, 1700]
  battle.actors.forEach((actor, index) => { actor.x = positions[index] })
  const visited = []
  let fell = false
  battle.manual(0, 'ultimate-poison')
  for (let i = 0; i < 140; i++) {
    battle.step(1 / 30)
    for (const effect of battle.effects) {
      if (effect.kind === 'hazard' && !visited.includes(effect.x)) visited.push(effect.x)
      if (effect.falling) fell = true
    }
  }
  assert.deepEqual(visited, positions.slice(1).sort((a, b) => a - b))
  assert.ok(fell)
  assert.equal(battle.ultimate, null)
  assert.ok(battle.actors.slice(1).every(actor => actor.hp < actor.maxHp && actor.hp > 0))
})

test('Espinas deals four damage once per patch and starts severe poison unless the species is immune', () => {
  for (const species of [19, 23]) {
    const battle = createBattle([example(91), example(species)], { auto: false, random: () => .5 })
    const [caster, rival] = battle.actors
    caster.x = 800
    rival.x = 1070
    assert.equal(battle.manual(0, 'spikes'), true)
    run(battle, .7)
    assert.equal(rival.hp, rival.maxHp)
    const hazard = battle.effects.find(effect => effect.kind === 'hazard')
    rival.x = hazard.x
    battle.step(1 / 30)
    assert.equal(rival.hp, rival.maxHp - 4)
    assert.equal(rival.status?.severe, species === 19 ? true : undefined)
    rival.x = 1070
    battle.step(1 / 30)
    rival.x = hazard.x
    run(battle, .5)
    assert.equal(rival.hp, rival.maxHp - 4)
    if (species === 19) {
      run(battle, .55)
      assert.ok(rival.hp < rival.maxHp - 5)
    }
  }
  assert.ok(moveOptions(91, ['water', 'ice'], true, 10).includes('spikes'))
  assert.ok(!moveOptions(91, ['water', 'ice'], true, 9).includes('spikes'))
})

test('arena stat tuning targets final nonlegendary forms and preserves speed, defenses and source stats', () => {
  for (const [id, original, , final, , legendary] of nationalStats) {
    const tuned = arenaBaseStats(id, original)
    if (!final || legendary) assert.deepEqual(tuned, original)
    for (const index of [2, 4, 5]) assert.equal(tuned[index], original[index])
  }
  const shedinja = example(292, 20)
  assert.equal(shedinja.stats[0], 1)
  assert.equal(arenaBaseStats(shedinja.id, shedinja.stats)[0], 28)
  assert.ok(arenaBaseStats(12, example(12).stats)[3] >= example(12).stats[3])
})

test('both type ultimates unlock together, while only the selected one is equipped in battle', () => {
  const dual = example(6, 31)
  assert.deepEqual(ultimateOptions(dual.types, 30), [])
  assert.deepEqual(ultimateOptions(dual.types, 31), ['ultimate-fire', 'ultimate-flying'])
  const battle = createBattle([{ ...dual, selectedUltimate: 'ultimate-flying' }, example(143)], { random: () => .5 })
  const actor = battle.actors[0]
  actor.next = 0
  actor.ultimateCharge = 100
  assert.deepEqual(actor.kit.filter(key => moves[key].ultimate), ['ultimate-flying'])
  assert.equal(battle.manual(0, 'ultimate-fire'), false)
  assert.equal(battle.manual(0, 'ultimate-flying'), true)
  assert.equal(createBattle([{ ...dual, selectedUltimate: 'ultimate-ice' }, example(143)]).actors[0].equippedUltimate, 'ultimate-fire')
})

test('STAB increases damage and an ultimate can be charged again for a second PP only', () => {
  const damage = types => {
    const battle = createBattle([{ ...example(7), types }, example(143)], { auto: false, random: () => .5 })
    battle.actors[0].x = 800
    const target = battle.actors[1]
    target.x = 980
    battle.manual(0, 'water')
    run(battle, .85)
    return target.maxHp - target.hp
  }
  assert.ok(damage(['water']) > damage(['normal']))
  const battle = createBattle([example(89, 31), example(143, 31)], { random: () => .5 })
  const [actor, rival] = battle.actors
  rival.next = 99
  // Use a durable test target so both casts can complete in the same round.
  for (let i = 0; i < 2; i++) {
    actor.ultimateCharge = 100
    actor.next = 0
    assert.equal(battle.manual(0, 'ultimate-poison'), true)
    assert.equal(actor.ultimateCharge, 0)
    actor.next = 99
    run(battle, 1.65)
    rival.hp = rival.maxHp
  }
  actor.next = 0
  actor.ultimateCharge = 100
  assert.equal(actor.ultimatePp, 0)
  assert.equal(battle.manual(0, 'ultimate-poison'), false)
})

test('bodies separate at rest but a dash can cross another Pokémon', () => {
  const battle = createBattle([example(19, 1), example(143, 1)], { random: () => .5 })
  const [runner, rival] = battle.actors
  runner.x = rival.x = 950
  runner.next = rival.next = 99
  battle.step(1 / 30)
  assert.ok(rival.x - runner.x >= 44)
  runner.dashDirection = 1
  runner.dashUntil = battle.time + .24
  run(battle, .2)
  assert.ok(runner.x > rival.x)
})

test('Triple Oleaje sweeps both rivals toward the same wall while the ultimate is still active', () => {
  const battle = createBattle([example(99, 31), example(143, 31), example(143, 31)], { auto: false, random: () => .5 })
  const [caster, near, far] = battle.actors
  caster.x = 450
  near.x = 1500
  far.x = 1740
  battle.manual(0, 'ultimate-water')
  run(battle, 1.65)
  assert.ok(battle.ultimate)
  assert.ok(near.x > 1500 && far.x > 1740)
  run(battle, 1.7)
  assert.ok(far.x - near.x < 100)
  assert.ok(near.x > 1750 && far.x <= 1845)
})

test('Double Team raises evasion above the base five percent', () => {
  const battle = createBattle([example(19), example(26)], { auto: false, random: () => .15 })
  const [actor, target] = battle.actors
  actor.x = 800
  target.x = 950
  battle.manual(1, 'double')
  run(battle, .5)
  battle.manual(0, 'water')
  run(battle, .7)
  assert.equal(target.hp, target.maxHp)
  assert.ok(battle.effects.some(effect => effect.dodged))
})

test('a melee dash closes the gap and then waits five seconds to recharge', () => {
  const battle = createBattle([example(19, 1), example(80)], { random: () => .5 })
  const [melee, ranged] = battle.actors
  melee.x = 700
  ranged.x = 975
  ranged.next = 99
  battle.step(1 / 30)
  assert.equal(melee.motion, 'Run')
  assert.equal(melee.dashReady, battle.time + 5)
  run(battle, .2)
  assert.ok(melee.x > 845)
})

test('a targeted strike lands after casting without creating a projectile', () => {
  const battle = createBattle([example(131), example(19)], { auto: false, random: () => .5 })
  const [actor, target] = battle.actors
  actor.x = 700
  target.x = 970
  assert.equal(battle.manual(0, 'frost'), true)
  run(battle, .4)
  assert.equal(target.hp, target.maxHp)
  run(battle, .25)
  assert.ok(target.hp < target.maxHp)
  assert.equal(battle.projectiles.length, 0)
  assert.ok(battle.effects.some(effect => effect.kind === 'target'))
})

test('Hiperrayo pierces multiple enemies, respects Ghost immunity and exhausts the caster', () => {
  const battle = createBattle([example(143, 31), example(19), example(92), example(25), example(16)], { auto: false, random: () => .5 })
  const [caster, near, immune, behind, far] = battle.actors
  caster.x = 600
  near.x = 870
  far.x = 1750
  behind.x = 130
  assert.equal(battle.manual(0, 'ultimate-normal'), true)
  run(battle, .9)
  assert.ok(near.hp < near.maxHp && far.hp < far.maxHp)
  assert.equal(immune.hp, immune.maxHp)
  assert.equal(behind.hp, behind.maxHp)
  assert.equal(battle.projectiles.length, 0)
  assert.ok(battle.ultimate)
  assert.equal(battle.manual(0, 'tackle'), false)
  run(battle, .4)
  assert.ok(caster.exhaustedUntil - battle.time > 2.8)
  run(battle, 3)
  assert.equal(battle.manual(0, 'tackle'), true)
})

test('simultaneous melee lunges clash and push both combatants without damage', () => {
  const battle = createBattle([example(19), example(66)], { auto: false, random: () => .5 })
  const [left, right] = battle.actors
  left.x = 800
  right.x = 930
  battle.manual(0, 'quick')
  battle.manual(1, 'kick')
  run(battle, .25)
  assert.ok(battle.effects.some(effect => effect.kind === 'clash'))
  assert.equal(left.hp, left.maxHp)
  assert.equal(right.hp, right.maxHp)
  assert.ok(left.knockback < 0 && right.knockback > 0)
})

test('water pierces a colliding fire shot while neutral projectiles pass through each other', () => {
  for (const [leftMove, expected] of [['ember', ['water']], ['water', ['water', 'water']]]) {
    const battle = createBattle([example(4), example(7)], { auto: false, random: () => .5 })
    battle.actors[0].x = 720
    battle.actors[1].x = 1200
    battle.manual(0, leftMove)
    battle.manual(1, 'water')
    run(battle, .8)
    assert.deepEqual(battle.projectiles.map(shot => shot.move.type), expected)
  }
})

test('flying and fairy types are immune to ground and dragon damage respectively', () => {
  for (const [defender, attack] of [[16, 'quake'], [35, 'dragon']]) {
    const battle = createBattle([example(149), example(defender)], { auto: false, random: () => .5 })
    battle.actors[0].x = 800
    battle.actors[1].x = 1000
    battle.manual(0, attack)
    run(battle, 1)
    assert.equal(battle.actors[1].hp, battle.actors[1].maxHp)
  }
})

test('a channel continues after taking damage and a saved set is validated against level', () => {
  const battle = createBattle([{ ...example(3, 31), selectedMoves: ['giga', 'hydro'] }, example(19)], {
    auto: false, random: () => .5
  })
  const [caster, opponent] = battle.actors
  caster.x = 800
  opponent.x = 905
  assert.deepEqual(caster.kit, ['giga', 'ultimate-grass'])
  battle.manual(0, 'solar')
  battle.manual(1, 'tackle')
  run(battle, .4)
  assert.ok(caster.hp < caster.maxHp)
  assert.ok(caster.cast)
  assert.equal(caster.x, 800)
  run(battle, 1.4)
  assert.ok(opponent.hp < opponent.maxHp)
})

