import assert from 'node:assert/strict'
import test from 'node:test'
import { battleSpecies, arenaBaseStats, createBattle, formAtLevel, moveOptions, moves, movesFor, hpColor, ultimateOptions } from './battle.js'
import { nationalStats } from './national-stats.js'

const example = (id, level = 20) => {
  const [, stats, types, final] = battleSpecies(id)
  return { id, stats, types, final, level }
}
const run = (battle, seconds) => {
  for (let i = 0; i < seconds * 30; i++) battle.step(1 / 30)
}

test('a team’s damaging weather cannot hurt its own side', () => {
  for (const weather of ['hail', 'sandstorm']) {
    const battle = createBattle([{ ...example(6), team: 'a' }, { ...example(19), team: 'a' },
      { ...example(52), team: 'b' }], { auto:false, random: () => .5 })
    assert.ok(battle.manual(0, weather))
    run(battle, 4)
    const [caster, ally, rival] = battle.actors
    assert.equal(caster.hp, caster.maxHp)
    assert.equal(ally.hp, ally.maxHp)
    assert.ok(rival.hp < rival.maxHp)
  }
})

test('allies and raid bosses do not create movement barriers', () => {
  const battle = createBattle([{...example(6),team:'party'},{...example(9),team:'party'},
    {...example(149),team:'boss',boss:true}], {auto:false,raid:true})
  const positions = [521, 534, 548]
  battle.actors.forEach((actor,index)=>{actor.x=positions[index]})
  battle.step(1/30)
  assert.deepEqual(battle.actors.map(actor=>actor.x),positions)
})

test('team support heals allies and area attacks cannot hurt them', () => {
  const battle = createBattle([{ ...example(6), team: 'a', support: 'healpulse' }, { ...example(7), team: 'a' },
    { ...example(19), team: 'b' }], { auto:false, random: () => .5 })
  const [healer, ally, enemy] = battle.actors
  healer.x = 500
  ally.x = 580
  enemy.x = 650
  ally.hp = Math.floor(ally.maxHp / 2)
  const hp = ally.hp
  assert.equal(healer.pp.healpulse, 2)
  assert.ok(battle.manual(0, 'healpulse'))
  run(battle, 1)
  assert.ok(ally.hp > hp)
  const healed = ally.hp
  assert.ok(battle.manual(0, 'quake'))
  run(battle, 1)
  assert.equal(ally.hp, healed)
  assert.ok(enemy.hp < enemy.maxHp)
})

test('boss-specific moves can hit a group and have their own ultimate PP', () => {
  const battle = createBattle([{...example(9, 22), boss:true, team:'boss', bossMoves:['raidshellslam'], bossUltimate:'ultimate-water', bossUltimatePp:4},
    {...example(19),team:'party'},{...example(20),team:'party'}], {auto:false,raid:true,random:()=>.5})
  const [boss, ...party] = battle.actors
  assert.deepEqual(boss.kit,['raidshellslam','ultimate-water'])
  assert.equal(boss.ultimatePp,4)
  boss.x = 500
  party[0].x = 650
  party[1].x = 740
  assert.ok(battle.manual(0,'raidshellslam'))
  run(battle,1)
  assert.ok(party.every(actor=>actor.hp < actor.maxHp))
})

test('boss health and other stats scale independently from the global battle HP setting', () => {
  const normal = createBattle([example(9)], {auto:false}).actors[0]
  const boss = createBattle([{...example(9), boss:true, hpBoost:5, statBoost:1.2}], {auto:false,hpMultiplier:2}).actors[0]
  assert.equal(boss.maxHp, normal.maxHp * 5)
  for (const key of ['attack','defense','specialAttack','specialDefense','speed']) assert.equal(boss[key], normal[key] * 1.2)
})

test('raid HP multiplier and timeout yield a boss win without sudden death', () => {
  const bossEntry = {...example(9), team: 'boss', boss: true, hpBoost: 8}
  const battle = createBattle([{ ...example(19), team: 'party' }, bossEntry], { raid: true, duration: 1 })
  const [,boss] = battle.actors
  assert.ok(boss.maxHp > 500)
  run(battle, 1.1)
  assert.equal(battle.over, true)
  assert.equal(battle.winner, boss)
  assert.equal(battle.suddenDeath, false)
})

test('Intimidate reduces physical Attack once and Skill Link fires twice as many shots', () => {
  const entries = [example(90), example(23), example(24)]
  const battle = createBattle(entries, { auto:false, random: () => .5 })
  const [shellder] = battle.actors
  const base = createBattle([example(90), example(19)], {auto:false}).actors[0].attack
  assert.equal(shellder.attack, base * .9)
  assert.ok(battle.manual(0, 'spear'))
  const shots = new Set()
  for (let step = 0; step < 160; step++) {
    battle.step(1 / 120)
    for (const projectile of battle.projectiles) shots.add(projectile)
  }
  assert.equal(shots.size, 6)
})

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

test('regional forms have independent types, stats and battle kits', () => {
  const regional = battleSpecies(10091)
  const base = battleSpecies(19)
  assert.deepEqual(regional[2], ['dark', 'normal'])
  assert.notDeepEqual(battleSpecies(10100)[1], battleSpecies(26)[1])
  assert.notDeepEqual(moveOptions(regional[0], regional[2], regional[3], 20), moveOptions(base[0], base[2], base[3], 20))
  assert.deepEqual(battleSpecies(10175)[2], ['dark', 'normal'])
  assert.equal(battleSpecies(862)[4], 10175)
})

test('Ditto copies the strongest eligible rival in place with its own HP and five PP at most', () => {
  const entries = [example(132), example(570), example(52), example(6, 31)]
  const battle = createBattle(entries, { auto: false })
  const [ditto, zorua, , charizard] = battle.actors
  const original = createBattle([example(132), example(132)], { auto: false }).actors[0]
  assert.equal(ditto.id, 132)
  assert.equal(ditto.maxHp, original.maxHp)
  assert.equal(ditto.x, original.x)
  assert.equal(ditto.appearance.id, 6)
  assert.equal(ditto.attack, charizard.attack)
  assert.deepEqual(ditto.types, charizard.types)
  assert.notEqual(ditto.pp, charizard.pp)
  assert.ok(Object.values(ditto.pp).every(pp => pp <= 5))
  assert.equal(zorua.appearance, undefined)
  assert.ok(zorua.abilities.has('ambush'))
})

test('Zorua keeps its appearance while equipment changes the form and signature type', () => {
  const battle = createBattle([example(570), { ...example(649), heldItem: 'burn-drive' },
    { ...example(493), heldItem: 'mystic-water' }, { ...example(888), heldItem: 'rusted-sword' }], { auto: false, random: () => .5 })
  const [zorua, genesect, arceus, zacian] = battle.actors
  assert.equal(zorua.appearance, undefined)
  assert.equal(genesect.form, 'fire')
  assert.deepEqual(arceus.types, ['water'])
  assert.ok(zacian.types.includes('steel'))
  assert.equal(zacian.form, 'crowned')
  zorua.x = 500
  genesect.x = 700
  assert.ok(battle.manual(1, 'technoblast'))
  run(battle, .5)
  assert.equal(battle.projectiles[0].move.type, 'fire')
  run(battle, .5)
  assert.equal(zorua.appearance, undefined)
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

test('Mimikyu and Eiscue absorb their first five qualifying attacks', () => {
  for (const [id, form] of [[778, 'busted'], [875, 'noice']]) {
    const battle = createBattle([example(130), example(id)], { auto: false, random: () => .5 })
    const [attacker, defender] = battle.actors
    for (let hit = 1; hit <= 6; hit++) {
      attacker.x = 500
      defender.x = 700
      assert.ok(battle.manual(0, 'rocks'))
      run(battle, 1)
      assert.equal(defender.form, hit >= 5 ? form : null)
      if (hit <= 5) assert.equal(defender.hp, defender.maxHp)
      else assert.ok(defender.hp < defender.maxHp)
    }
  }
})

test('Palafin changes at ten seconds and Galarian Darmanitan enters Zen Mode below half HP', () => {
  const battle = createBattle([example(964), example(10177)], { auto: false })
  const [palafin, darmanitan] = battle.actors
  palafin.hp = 1
  darmanitan.hp = 1
  run(battle, 9.9)
  assert.equal(palafin.form, null)
  assert.equal(darmanitan.form, 'zen')
  assert.deepEqual(darmanitan.types, ['ice', 'fire'])
  run(battle, .2)
  assert.equal(palafin.form, 'hero')
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

test('projectiles, damage and other fighters keep moving during an ultimate', () => {
  const battle = createBattle([example(3, 45), example(9, 45), example(6, 45)], { auto: false, random: () => .5 })
  const [caster, shooter, target] = battle.actors
  caster.x = 150
  shooter.x = 850
  target.x = 1350
  assert.ok(battle.manual(1, 'hydro'))
  run(battle, .45)
  assert.equal(battle.projectiles.length, 1)
  const shot = battle.projectiles[0]
  const origin = shot.x
  assert.ok(battle.manual(0, 'ultimate-grass'))
  assert.ok(battle.manual(2, 'ember'))
  run(battle, .25)
  assert.ok(shot.x > origin)
  run(battle, .54)
  assert.ok(battle.ultimate?.charging)
  assert.ok(target.hp < target.maxHp)
  assert.ok(!battle.projectiles.includes(shot))
})

test('raid HP extends survival against percentage damage and bosses ignore knockback', () => {
  const damageAgainst = hpBoost => {
    const battle = createBattle([{ ...example(25, 45), team: 'players' },
      { ...example(9, 45), team: 'boss', boss: true, hpBoost }], { auto: false, raid: true, random: () => .5 })
    const [viewer, boss] = battle.actors
    viewer.x = 900
    boss.x = 975
    assert.ok(battle.manual(0, 'struggle'))
    run(battle, .5)
    assert.equal(boss.x, 975)
    assert.ok(boss.hp < boss.maxHp)
    return { hp: boss.maxHp, damage: boss.maxHp - boss.hp }
  }
  const normal = damageAgainst(1)
  const boosted = damageAgainst(5.3)
  assert.equal(boosted.hp, Math.round(normal.hp * 5.3))
  assert.equal(boosted.damage, normal.damage)
})

test('a raid boss at the arena edge can fire at extended range while under attack', () => {
  const battle = createBattle([{ ...example(6, 45), team: 'players' },
    { ...example(9, 45), team: 'boss', boss: true, margin: 230, hpBoost: 5, bossMoves: ['raidcannons'] }],
  { raid: true, random: () => .5 })
  const [player, boss] = battle.actors
  player.x = boss.x - 850
  player.next = 10
  player.dashReady = 10
  boss.dashReady = 10
  boss.hurtUntil = 10
  run(battle, 1.2)
  assert.equal(boss.lastMove, 'raidcannons')
  assert.ok(battle.projectiles.some(shot => shot.actor === boss))
  run(battle, 1.3)
  assert.ok(player.hp < player.maxHp)
})

test('a cornered Alcremie relocates and raid allies separate without blocking dash movement', () => {
  const battle = createBattle([
    ...[6, 9, 25].map(id => ({ ...example(id, 45), team: 'party' })),
    { ...example(869, 45), team: 'boss', boss: true, margin: 230, hpBoost: 10 }
  ], { raid: true, random: () => .5 })
  const boss = battle.actors.at(-1)
  const corner = boss.x
  boss.blinkReady = 0
  boss.dashReady = 30
  battle.actors.slice(0, -1).forEach(actor => {
    actor.x = corner - 4
    actor.next = 20
    actor.dashReady = 20
  })
  battle.step(1 / 60)
  assert.equal(boss.x, corner - 550)
  assert.ok(battle.effects.some(effect => effect.kind === 'boss-blink'))
  assert.ok(new Set(battle.actors.slice(0, -1).map(actor => actor.x)).size > 1)
})

test('the knockout feed keeps only the last three rival defeats with the responsible fighter', () => {
  const battle = createBattle([{ ...example(9, 45), team: 'attackers' },
    ...Array.from({ length: 4 }, () => ({ ...example(19), team: 'viewers' }))],
  { auto: false, raid: true, random: () => .5 })
  battle.actors[0].x = 700
  battle.actors.slice(1).forEach((actor, index) => {
    actor.x = 760 + index * 35
    actor.hp = 1
  })
  assert.ok(battle.manual(0, 'surf'))
  run(battle, 1)
  assert.deepEqual(battle.knockouts.map(({ killer, target }) => [killer, target]), [[0, 2], [0, 3], [0, 4]])
})

test('boss areas, geysers and multihit ultimates damage at most three distinct opponents per cast', () => {
  for (const [move, positions, duration] of [
    ['raidshellslam', [690, 730, 770, 810, 850], 1],
    ['raidgeysers', [700, 790, 920, 1050, 1180], 3],
    ['ultimate-water', [690, 730, 770, 810, 850], 4]
  ]) {
    const battle = createBattle([{ ...example(9, 45), team: 'boss', boss: true, bossMoves: [move] },
      ...positions.map(() => ({ ...example(19, 100), team: 'party' }))],
    { auto: false, raid: true, random: () => .5 })
    battle.actors[0].x = 600
    positions.forEach((x, i) => { battle.actors[i + 1].x = x })
    assert.ok(battle.manual(0, move), move)
    run(battle, duration)
    assert.equal(battle.actors.slice(1).filter(actor => actor.hp < actor.maxHp).length, 3, move)
  }
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

test('Double Team can dodge at a roll above the three percent baseline', () => {
  const battle = createBattle([example(19), example(26)], { auto: false, random: () => .12 })
  const [actor, target] = battle.actors
  actor.x = 800
  target.x = 950
  battle.manual(1, 'double')
  run(battle, .5)
  battle.manual(0, 'water')
  run(battle, .7)
  assert.equal(target.hp, target.maxHp)
  assert.ok(battle.effects.some(effect => effect.dodged && effect.target === target.index))
})

test('a projectile reports one effective dash dodge and does not damage the dodger', () => {
  const events = []
  const battle = createBattle([example(9), example(19)], { auto: false, random: () => .5,
    onCombatEvent: event => events.push(event) })
  const [attacker, target] = battle.actors
  attacker.x = 700
  target.x = 840
  target.dodgeUntil = 1
  assert.ok(battle.manual(0, 'water'))
  run(battle, .9)
  assert.equal(target.hp, target.maxHp)
  assert.deepEqual(events.filter(event => event.kind === 'dodge').map(({ target, reason }) => [target, reason]), [[1, 'dash']])
  assert.ok(battle.effects.some(effect => effect.dodged && effect.target === 1))
  assert.ok(target.dodgeReady > battle.time + 7)
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


test('team screens have two PP, absorb damage by class, and cannot overlap', () => {
  const log = []
  const battle = createBattle([{ ...example(122), team: 'a' }, { ...example(19), team: 'a' },
    { ...example(6), team: 'b' }], { auto: false, random: () => .5, onCombatEvent: event => log.push(event) })
  const [caster, ally, rival] = battle.actors
  Object.assign(caster, { x: 580 })
  Object.assign(ally, { x: 550 })
  Object.assign(rival, { x: 650 })
  assert.equal(moves.reflect.pp, 2)
  assert.ok(battle.manual(0, 'reflect'))
  assert.equal(battle.manual(1, 'lightscreen'), false)
  run(battle, 1)
  assert.equal(caster.teamShield.hp, Math.ceil(caster.maxHp * .2))
  assert.equal(ally.teamShield.hp, Math.ceil(ally.maxHp * .2))
  assert.equal(rival.teamShield, undefined)
  assert.ok(battle.manual(2, 'tackle'))
  run(battle, 1)
  assert.ok(log.some(event => event.kind === 'absorbed' && event.target === caster.index))
  assert.equal(battle.manual(1, 'lightscreen'), false)
  run(battle, 5)
  assert.ok(battle.manual(1, 'lightscreen'))
})

test('Helping Hand boosts attacks from other viewers on the same raid team', () => {
  function damage(withBoost) {
    const log = []
    const battle = createBattle([{ ...example(242), team: 'party', viewerId: 'a' }, { ...example(19), team: 'party', viewerId: 'b' },
      { ...example(9), team: 'boss', boss: true }], { raid: true, auto: false, random: () => .5, onCombatEvent: event => log.push(event) })
    battle.actors.forEach((actor, index) => { actor.x = [280, 630, 690][index] })
    if (withBoost) assert.ok(battle.manual(0, 'helpinghand'))
    run(battle, 1)
    assert.ok(battle.manual(1, 'tackle'))
    run(battle, 1)
    return log.find(event => event.kind === 'damage' && event.source === 1).amount
  }
  assert.ok(damage(true) > damage(false))
})

test('a custom raid boss ignores HP multipliers and deals more damage once enraged', () => {
  function attack(hp) {
    const events = []
    const stats = { maxHp: 100000, attack: 130, defense: 158, specialAttack: 130, specialDefense: 158,
      speed: 145, damageScale: .55, damageReceivedScale: 4.25, chipHp: 1300 }
    const battle = createBattle([{ ...example(9, 50), team: 'boss', boss: true, raidStats: stats, hpBoost: 40 },
      { ...example(19, 80), team: 'party' }], { raid: true, auto: false, hpMultiplier: 2, random: () => .5,
      onCombatEvent: event => events.push(event) })
    const [boss, enemy] = battle.actors
    assert.equal(boss.maxHp, 100000)
    assert.equal(boss.attack, 130)
    Object.assign(boss, { hp, x: 600 })
    enemy.x = 670
    assert.ok(battle.manual(0, 'tackle'))
    run(battle, 1)
    return { damage: events.find(event => event.kind === 'damage').amount, phase: events.some(event => event.kind === 'enrage') }
  }
  const normal = attack(20001)
  const enraged = attack(20000)
  assert.equal(normal.phase, false)
  assert.equal(enraged.phase, true)
  assert.ok(enraged.damage > normal.damage)
})

test('revival returns the last fainted teammate and Heal Beam targets an injured ally', () => {
  const battle = createBattle([{ ...example(122), team: 'a' }, { ...example(19), team: 'a' },
    { ...example(52), team: 'a' }, { ...example(6), team: 'b' }], { auto: false, random: () => .5 })
  const [, first, last] = battle.actors
  Object.assign(first, { x: 190, hp: 0, faintedAt: 0 })
  Object.assign(last, { x: 240, hp: 0, faintedAt: .1 })
  assert.ok(battle.manual(0, 'revivebeam'))
  run(battle, 1)
  assert.equal(first.hp, 0)
  const revivedHp = last.hp
  assert.ok(revivedHp > 0)
  assert.ok(battle.manual(0, 'healbeam'))
  run(battle, 1)
  assert.ok(last.hp > revivedHp)
  assert.equal(moves.revivebeam.pp, 1)
})

test('Sticky Web roots a grounded rival but never roots a raid boss', () => {
  const battle = createBattle([{ ...example(12), team: 'a' }, { ...example(19), team: 'b' },
    { ...example(9), team: 'b', boss: true }], { auto: false, raid: true, random: () => .5 })
  const [caster, victim, boss] = battle.actors
  caster.x = 400
  victim.x = boss.x = 510
  assert.ok(battle.manual(0, 'stickyweb'))
  run(battle, 1)
  assert.ok(victim.rootedUntil > battle.time)
  assert.equal(boss.rootedUntil, undefined)
  assert.equal(battle.manual(1, 'tackle'), false)
})

test('raid bosses keep casting through hits and reject incapacitating status', () => {
  const battle = createBattle([{ ...example(6), team: 'party' }, { ...example(9), team: 'boss', boss: true }],
    { auto: false, raid: true, random: () => .5 })
  const [attacker, boss] = battle.actors
  attacker.x = 500
  boss.x = 570
  assert.ok(battle.manual(0, 'tackle'))
  assert.ok(battle.manual(1, 'raidgeysers'))
  run(battle, .5)
  assert.equal(boss.cast?.moveId, 'raidgeysers')
  run(battle, 1.5)
  assert.ok(attacker.hp < attacker.maxHp)
  assert.ok(battle.manual(0, 'hypnosis'))
  run(battle, 1.5)
  assert.equal(boss.status, null)
  assert.ok(battle.manual(0, 'wisp'))
  run(battle, 1.5)
  assert.equal(boss.status?.kind, 'burn')
})
