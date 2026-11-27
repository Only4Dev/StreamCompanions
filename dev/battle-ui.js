import { battleClip, sprite, spriteScale } from '/sprites.js'
import { arena, battleRoster, battleManeuver, createBattle, formAtLevel, hpColor, moveOptions, moves, movesFor, ultimateOptions } from './battle.js'
import { maxLevel, ultimateLevel } from '/levels.js'
import { drawArea, drawChannel, drawClash, drawDigMound, drawField, drawGraveyard, drawHeavyFireImpact, drawHyper, drawOngoing, drawPoisonHazard, drawProjectile, drawPunch, drawStatus, drawTarget, drawUltimate, drawWaterImpact } from './battle-vfx.js'

const colors = { fire: '#ff8754', water: '#63b5ff', grass: '#9af36b', normal: '#fff3c1',
  electric: '#ffd454', ice: '#b3f3ff', poison: '#d599ff', ground: '#e7b176', fairy: '#ffc5e6',
  rock: '#e4c7a0', fighting: '#ffad70', flying: '#b9e5fb', steel: '#c3d5e9', bug: '#d8f496' }
const auras = {
  sleep: ['Zzz', '#e1b5ff'],
  speed: ['↑', '#9af36b'], evasion: ['≋', '#e1b5ff'], mind: ['✦', '#f2b3ff']
}
const palette = type => colors[type] ?? '#e1b5ff'
const words = {
  es: { tab: 'Combate dev', title: 'Laboratorio de combate', random: 'Ronda aleatoria', test: 'Probar movimiento',
    level: 'Nivel', pokemon: 'Pokémon de prueba', move: 'Movimiento', idle: 'Elige una ronda o un movimiento.',
    over: 'Fin de la ronda sin ganador', wins: 'ganó', victory: 'Victoria', live: 'Ronda en curso', manual: 'Prueba de movimiento',
    sudden: 'Muerte súbita', kit: 'Ataques disponibles en la prueba', all: 'Probar cualquier ataque', community: 'Batalla de viewers',
    communityError: 'Conecta Twitch y reúne al menos dos summons activos. Solo puede haber una batalla en curso.',
    hint: 'Pokédex Nacional · Las pruebas usan las mismas probabilidades de estado que la ronda.' },
  en: { tab: 'Battle dev', title: 'Battle lab', random: 'Random round', test: 'Test move',
    level: 'Level', pokemon: 'Test Pokémon', move: 'Move', idle: 'Choose a round or a move.',
    over: 'Round ended without a winner', wins: 'wins', victory: 'Victory', live: 'Round in progress', manual: 'Move test',
    sudden: 'Sudden death', kit: 'Moves available for testing', all: 'Try any move', community: 'Viewer battle',
    communityError: 'Connect Twitch and gather at least two active summons. Only one battle can run at a time.',
    hint: 'National Pokédex · Move tests use the same status chances as random rounds.' }
}

export function mountBattleLab({ catalog, mount, language, advanced = false }) {
  const pane = document.createElement('div')
  pane.className = 'battle-preview'
  pane.innerHTML = '<section><h2></h2><p class="lab-hint"></p><form class="lab-controls">' +
    '<label><span></span><select name="pokemon"></select></label>' +
    '<label><span></span><select name="move"></select></label>' +
    '<label><span></span><input name="level" type="number" min="1" max="' + maxLevel + '" value="20" required></label>' +
    '<label><input type="checkbox" name="allMoves"> <span></span></label>' +
    '<button type="button" data-start="random"></button><button type="submit" data-start="test"></button>' +
    '<button type="button" data-start="community"></button></form><p class="lab-error" role="status"></p>' +
    '<p class="lab-learnset lab-hint"></p><p class="lab-status" role="status"></p><div class="lab-stage"><canvas width="1920" height="550"></canvas>' +
    '<div class="lab-victory" hidden aria-hidden="true"><span></span><strong></strong></div></div></section>'
  mount.append(pane)
  const css = document.createElement('link')
  css.rel = 'stylesheet'
  css.href = '/dev/battle.css'
  document.head.append(css)
  const form = pane.querySelector('form')
  const canvas = pane.querySelector('canvas')
  const ctx = canvas.getContext('2d')
  const flash = document.createElement('canvas')
  const flashCtx = flash.getContext('2d')
  const victory = pane.querySelector('.lab-victory')
  const status = pane.querySelector('.lab-status')
  const error = pane.querySelector('.lab-error')
  const communityButton = form.querySelector('[data-start="community"]')
  communityButton.hidden = true
  if (!advanced) {
    for (const label of form.querySelectorAll('label')) label.hidden = !label.querySelector('[name="level"]')
    form.querySelector('[data-start="test"]').hidden = true
    pane.querySelector('.lab-learnset').hidden = true
  }
  const learnset = pane.querySelector('.lab-learnset')
  const art = new Map(catalog.map(species => [Number(species.id), species]))
  const roster = battleRoster.filter(([id]) => art.has(id))
  const rosterById = new Map(roster.map(row => [row[0], row]))
  const importHint = { es: 'Importa el catálogo PMD para ver todos los sprites.', en: 'Import the PMD catalog to see every sprite.' }
  for (const [id] of roster) form.elements.pokemon.add(new Option(art.get(id).name, id))
  function showLearnset() {
    const species = roster.find(([id]) => id === Number(form.elements.pokemon.value))
    if (!species) return
    const combatant = build(species)
    const learned = movesFor(combatant.id, combatant.types, combatant.final, combatant.level)
    learnset.textContent = combatant.name + ' · ' + words[language()].kit + ' · ' + learned.map(key => moves[key].name).join(' / ')
    const selector = pane.querySelector('select[name="move"]')
    const options = pane.querySelector('input[name="allMoves"]').checked ? Object.keys(moves) :
      moveOptions(combatant.id, combatant.types, combatant.final, combatant.level)
    if (Array.from(selector.options, option => option.value).join() === options.join()) return
    const previous = selector.value
    selector.replaceChildren(...options.map(key => {
      const move = moves[key]
      const chance = move.chance ? ' · ' + Math.round(move.chance * 100) + '%' : ''
      return new Option(move.name + chance, key)
    }))
    if (options.includes(previous)) selector.value = previous
  }
  form.addEventListener('input', showLearnset)
  if (!roster.length) {
    for (const button of form.querySelectorAll('button')) button.disabled = true
  }

  let battle
  let isAuto
  let last
  let accumulated = 0
  let postRound = 0
  let decisive = false
  let healthBars = new Map()
  let remote = false
  let pollId = 0
  function build(species, previewEvolution = false) {
    const level = Number(form.elements.level.value)
    const evolvedId = previewEvolution ? formAtLevel(species[0], level) : species[0]
    const [id, stats, types, final] = rosterById.get(evolvedId) ?? species
    const pokemon = art.get(id)
    return { id, stats, types, final, name: pokemon.name, level,
      margin: Math.max(75, ...Object.values(pokemon.normal?.animations ?? {}).map(clip => clip.width * spriteScale(clip, 3) / 2 + 18)) }
  }
  function reset(entries, auto) {
    pollId++
    remote = !entries
    battle = entries ? createBattle(entries, { auto }) : null
    error.textContent = ''
    isAuto = auto
    learnset.hidden = auto
    last = undefined
    accumulated = 0
    postRound = 0
    decisive = false
    healthBars = new Map()
    victory.hidden = true
  }
  communityButton.addEventListener('click', async () => {
    communityButton.disabled = true
    try {
      const start = await fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startCommunityBattle: true }) })
      if (!start.ok && start.status !== 409) throw new Error('Battle unavailable')
      const response = await fetch('/dev/community-battle')
      const initial = await response.json()
      if (!initial || initial.over && !start.ok) throw new Error('Battle unavailable')
      reset(null, true)
      battle = initial
      const id = pollId
      const poll = async () => {
        if (id !== pollId || battle.over) return
        try {
          if (!pane.hidden) {
            const result = await fetch('/dev/community-battle')
            const next = await result.json()
            if (id === pollId && next) battle = next
          }
        } finally {
          if (id === pollId && !battle.over) setTimeout(() => poll().catch(console.warn), 65)
        }
      }
      void poll().catch(console.warn)
    } catch {
      error.textContent = words[language()].communityError
    } finally {
      communityButton.disabled = false
    }
  })
  form.querySelector('[data-start="random"]').addEventListener('click', () => {
    if (!form.reportValidity()) return
    const pool = [...new Map(roster.map(species => [build(species, true).id, species])).values()]
    const count = Math.min(pool.length, 4 + Math.floor(Math.random() * 3))
    const entries = Array.from({ length: count }, () => {
      const entry = build(pool.splice(Math.floor(Math.random() * pool.length), 1)[0], true)
      const options = moveOptions(entry.id, entry.types, entry.final, entry.level).filter(key => !moves[key].ultimate)
      entry.selectedMoves = Array.from({ length: Math.min(4, options.length) }, () =>
        options.splice(Math.floor(Math.random() * options.length), 1)[0])
      const ultimates = ultimateOptions(entry.types, entry.level)
      entry.selectedUltimate = ultimates[Math.floor(Math.random() * ultimates.length)]
      return entry
    })
    reset(entries, true)
  })
  form.addEventListener('submit', event => {
    event.preventDefault()
    const moveId = form.elements.move.value
    const move = moves[moveId]
    let source = roster.find(([id]) => id === Number(form.elements.pokemon.value))
    if (move.ultimate && source?.[2][0] !== move.ultimate) {
      source = roster.find(([, , types]) => types[0] === move.ultimate) ??
        roster.find(([, , types]) => types.includes(move.ultimate)) ?? source
    }
    if (!source) return
    const opponent = roster.find(([id]) => id === 19 && id !== source[0]) ?? roster.find(([id]) => id !== source[0])
    if (!opponent) return
    form.elements.pokemon.value = source[0]
    if (move.ultimate && Number(form.elements.level.value) < ultimateLevel) form.elements.level.value = ultimateLevel
    showLearnset()
    reset([build(source), build(opponent)], false)
    battle.actors[0].x = arena.width / 2 - 140
    battle.actors[1].x = battle.actors[0].x + (['projectile', 'target', 'pierce'].includes(move.kind) ? 270 : 100)
    battle.manual(0, moveId)
  })

  function text(value, x, y, size = 22, color = '#fff', border = 4) {
    ctx.font = 'bold ' + size + 'px system-ui'
    ctx.textAlign = 'center'
    ctx.lineWidth = border
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#17272c'
    ctx.strokeText(value, x, y)
    ctx.fillStyle = color
    ctx.fillText(value, x, y)
  }

  function drawHealth(actor, x, y, time, delta) {
    const health = actor.hp / actor.maxHp
    const bar = healthBars.get(actor.index) ?? { hp: 1, trail: 1, changed: -1 }
    if (health < bar.hp) bar.changed = time
    bar.hp = health
    if (time - bar.changed > .13) {
      bar.trail += (health - bar.trail) * (1 - Math.exp(-delta * 11))
    }
    healthBars.set(actor.index, bar)
    const age = time - bar.changed
    const jitter = age < .14 ? Math.sin(age * 170) * (1 - age / .14) * 4 : 0
    ctx.fillStyle = '#142229'
    ctx.fillRect(x - 55 + jitter, y - 66, 110, 12)
    ctx.fillStyle = '#fff7e2'
    ctx.fillRect(x - 53 + jitter, y - 64, 106 * bar.trail, 8)
    ctx.fillStyle = age < .055 ? '#fff' : hpColor(health)
    ctx.fillRect(x - 53 + jitter, y - 64, 106 * health, 8)
    if (actor.hasUltimate && actor.ultimatePp > 0 && actor.hp) {
      const amount = actor.ultimateCharge / 100
      ctx.fillStyle = '#142229'
      ctx.fillRect(x - 55 + jitter, y - 54, 110, 6)
      ctx.fillStyle = amount >= 1 ? '#ffef9b' : '#e9ad3b'
      ctx.fillRect(x - 53 + jitter, y - 53, 106 * amount, 4)
      for (let i = 0; i < actor.ultimatePp; i++) ctx.fillRect(x + 58 + i * 7, y - 53, 4, 4)
    }
  }

  function drawUltimateMarker(x, y, time) {
    const top = y - 112 + Math.sin(time * 9) * 3
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#142e45'
    ctx.fillStyle = '#86ecff'
    ctx.beginPath()
    ctx.moveTo(x - 11, top)
    ctx.lineTo(x + 11, top)
    ctx.lineTo(x, top + 13)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#d8fbff'
    ctx.fillRect(x - 5, top + 3, 10, 2)
    ctx.restore()
  }

  function flashSprite(clip, x, y, direction, elapsed, strength, color = '#fff0cc') {
    if (!clip || strength <= 0) return
    const width = clip.width * 3
    const height = clip.height * 3
    if (flash.width !== width || flash.height !== height) {
      flash.width = width
      flash.height = height
    }
    flashCtx.clearRect(0, 0, width, height)
    flashCtx.imageSmoothingEnabled = false
    if (!sprite(flashCtx, clip, width / 2, height / 2, direction, elapsed, false, 3, true)) return
    flashCtx.globalCompositeOperation = 'source-in'
    flashCtx.fillStyle = color
    flashCtx.fillRect(0, 0, width, height)
    flashCtx.globalCompositeOperation = 'source-over'
    ctx.save()
    ctx.globalAlpha *= strength
    ctx.drawImage(flash, Math.round(x - width / 2), Math.round(y - height / 2))
    ctx.restore()
  }

  function draw(now) {
    requestAnimationFrame(draw)
    if (mount.closest('[hidden]')) { last = undefined; return }
    if (!battle) return
    const delta = last === undefined ? 0 : Math.min(.1, (now - last) / 1000)
    last = now
    if (battle.over) {
      decisive = isAuto && !!battle.winner && battle.actors.some(actor => actor.faintedAt === battle.time)
      postRound += delta
    } else if (!remote) {
      accumulated += delta
      while (accumulated >= 1 / 30 && !battle.over) {
        battle.step(1 / 30)
        accumulated -= 1 / 30
      }
      decisive = isAuto && !!battle.winner && battle.actors.some(actor => actor.faintedAt === battle.time)
    }
    const slowWindow = decisive ? Math.min(postRound, .95) : 0
    const visualTime = battle.time + slowWindow * .28 + postRound - slowWindow
    const showWinner = !!battle.winner && postRound >= (decisive ? 1.35 : .65)
    ctx.clearRect(0, 0, arena.width, arena.height)
    ctx.imageSmoothingEnabled = false
    ctx.save()
    const recentHit = battle.effects.find(effect => effect.kind === 'hit' && effect.damage && visualTime - effect.at < .12)
    const release = battle.effects.find(effect => effect.kind === 'ultimate' && visualTime - effect.at < .11)
    if (recentHit) {
      const age = visualTime - recentHit.at
      ctx.translate(Math.sin(age * 155) * (1 - age / .12) * (release ? 11 : decisive ? 8 : 3),
        release ? Math.cos(age * 137) * (1 - age / .12) * 4 : 0)
    }
    if (battle.field) drawField(ctx, battle.field, arena.width, arena.height, arena.floor, visualTime)
    const ultimate = battle.ultimate
    if (ultimate) {
      ctx.fillStyle = '#0814247a'
      ctx.fillRect(0, 0, arena.width, arena.height)
      if (ultimate.visual === 'nightmare') drawGraveyard(ctx, arena.width, arena.floor, visualTime)
      const caster = battle.actors[ultimate.index]
      drawChannel(ctx, caster.x, arena.floor, visualTime, '#7ce9ff')
      if (release) {
        ctx.fillStyle = '#9adfff1c'
        ctx.fillRect(0, 0, arena.width, arena.height)
      }
    }
    for (const effect of battle.effects) {
      if (effect.expires <= visualTime || effect.kind === 'hit') continue
      if (effect.kind === 'ultimate') {
        drawUltimate(ctx, effect, arena.width, arena.floor, visualTime, palette(effect.type))
        continue
      }
      if (effect.kind === 'hazard') {
        drawPoisonHazard(ctx, effect, arena.floor, visualTime)
        continue
      }
      if (effect.kind === 'clash') {
        drawClash(ctx, effect.x, arena.floor, visualTime - effect.at)
        continue
      }
      if (effect.visual === 'channel') {
        drawChannel(ctx, effect.x, arena.floor, visualTime, palette(effect.type))
        continue
      }
      if (effect.visual === 'hyper') {
        drawHyper(ctx, effect, arena.width, arena.floor, visualTime)
        continue
      }
      if (effect.kind === 'target') {
        drawTarget(ctx, effect, arena.floor, visualTime)
        continue
      }
      drawArea(ctx, effect, arena.floor, palette(effect.type), visualTime)
    }
    for (const actor of battle.actors) {
      const faintAge = actor.hp ? 0 : visualTime - actor.faintedAt
      if (!actor.hp && (!Number.isFinite(faintAge) || faintAge >= .62)) continue
      const appearance = actor.appearance ?? actor
      const base = art.get(appearance.id)
      const form = base?.battleForms?.[appearance.form]
      const pokemon = form ? { ...base, normal: form.normal ?? base.normal, shiny: form.shiny ?? base.shiny } : base
      const animations = (appearance.shiny ? pokemon?.shiny ?? pokemon?.normal : pokemon?.normal)?.animations
      const hurt = actor.hurtUntil > battle.time
      const frozen = actor.status?.kind === 'freeze'
      const asleep = actor.status?.kind === 'sleep'
      const resting = asleep || actor.exhaustedUntil > battle.time
      const motion = !actor.hp ? 'Faint' :
        frozen ? 'Idle' : resting ? 'Sleep' : hurt ? 'Hurt' : actor.motion
      const clip = battleClip(animations, motion, actor.cast?.move.kind)
      const opacity = actor.hp ? 1 : Math.max(0, 1 - faintAge / .62)
      const drift = actor.hp ? 0 : 1 - Math.exp(-6 * faintAge)
      const scene = battle.effects.find(effect => effect.kind === 'ultimate' && effect.expires > visualTime)
      const lifted = ultimate && ultimate.index !== actor.index && scene &&
        (scene.visual === 'tornado' || scene.visual === 'telekinesis' && !scene.pulse)
      const orbit = lifted && scene.visual === 'tornado' ? arena.width / 2 + Math.cos(visualTime * 8 + actor.index) * 185 : actor.x
      const x = Math.min(arena.width - actor.margin, Math.max(actor.margin, orbit + drift * actor.knockback * .11))
      const maneuver = battleManeuver(actor, battle.time)
      const y = arena.floor + drift * 19 - (lifted ? 64 + Math.sin(visualTime * 12 + actor.index) * 23 : 0) -
        (maneuver?.kind === 'fly' ? Math.sin(Math.PI * maneuver.phase) * 130 : 0)
      ctx.save()
      ctx.globalAlpha = opacity
      if (actor.motion === 'Run' && actor.dashUntil > battle.time) {
        ctx.fillStyle = '#d8f3e4'
        for (let i = 1; i <= 5; i++) {
          ctx.globalAlpha = opacity * (.58 - i * .08)
          ctx.fillRect(x - actor.direction * (30 + i * 15), y + (i % 3 - 1) * 11, 22 + i * 4, 3)
        }
        ctx.globalAlpha = opacity
      }
      const hurtAge = visualTime - (actor.hurtUntil - .35)
      const elapsed = !actor.hp ? faintAge * 1000 :
        frozen ? 0 : Math.max(0, visualTime - (hurt ? actor.hurtUntil - .35 : actor.motionSince)) * 1000
      const frameTime = motion === 'Run' && !animations?.Run ? elapsed * 1.8 : elapsed
      if (maneuver?.kind === 'dig') drawDigMound(ctx, x, y, battle.time)
      else if (!sprite(ctx, clip, x, y, actor.direction, frameTime, frozen, 3, !actor.hp || hurt || !!actor.cast)) {
        text(actor.name.slice(0, 1), x, y + 5, 36, '#e7e0be')
      }
      if (ultimate?.index === actor.index) {
        const pulse = .58 + Math.sin(visualTime * 16) * .18
        for (const offset of [-4, 4]) flashSprite(clip, x + offset, y, actor.direction, elapsed, pulse, '#78e9ff')
        sprite(ctx, clip, x, y, actor.direction, elapsed, false, 3, true)
      }
      if (hurtAge >= 0 && hurtAge < .16) flashSprite(clip, x, y, actor.direction, elapsed, .88 * (1 - hurtAge / .16))
      if (actor.hp && actor.status && !asleep) {
        drawStatus(ctx, actor.status.kind, x, y - 110, visualTime, 30, 26)
      }
      if (actor.hp && actor.ongoing) drawOngoing(ctx, actor.ongoing.kind, x, y, battle.time)
      if (actor.hp && actor.leech) drawTarget(ctx, { visual: 'seed', x, at: battle.time - .4, expires: battle.time + .6 }, y, battle.time)
      const activeEffects = actor.hp ? Object.keys(actor.boosts).filter(key => actor.boosts[key] > battle.time) : []
      if (actor.hp && resting && !frozen) activeEffects.unshift('sleep')
      if (actor.hp && actor.confusion) text('✦ • ✦', x, y - 108, 22, '#f9a4ff')
      if (actor.hp && actor.flinchUntil > battle.time) text('✦ ✦', x, y - 108, 22, '#ffe299')
      activeEffects.forEach((key, index) => {
        const [symbol, color] = auras[key]
        const phase = battle.time * (key === 'paralysis' ? 12 : 5) + index
        text(symbol, x + (index - (activeEffects.length - 1) / 2) * 27 + Math.cos(phase) * 8,
          y - 106 + Math.sin(phase) * 7, 24, color)
      })
      text((actor.ownerName ? actor.ownerName + ' · ' : '') + (appearance.disguised ? appearance.name : actor.name) + ' · Lv. ' + actor.level, x, y - 76)
      drawHealth(actor, x, y, visualTime, delta)
      if (ultimate?.index === actor.index) drawUltimateMarker(x, y, visualTime)
      ctx.restore()
    }
    for (const shot of battle.projectiles) {
      if (visualTime >= shot.end || (battle.over && postRound > .3)) continue
      const color = palette(shot.move.type ?? shot.actor.types[0])
      if (shot.move.visual === 'beam') {
        ctx.save()
        ctx.shadowColor = color
        ctx.shadowBlur = 13
        ctx.fillRect(shot.x - shot.direction * 65, arena.floor - 7, shot.direction * 65, 14)
        ctx.fillStyle = '#fff6d8'
        ctx.fillRect(shot.x - shot.direction * 55, arena.floor - 2, shot.direction * 55, 4)
        ctx.restore()
        continue
      }
      drawProjectile(ctx, shot, arena.floor, visualTime)
    }
    for (const effect of battle.effects) {
      if (effect.kind !== 'hit' || effect.expires <= visualTime) continue
      const elapsed = visualTime - effect.at
      ctx.fillStyle = palette(effect.type)
      if (effect.damage && effect.visual === 'punch') drawPunch(ctx, effect.x, arena.floor, elapsed)
      if (effect.damage && effect.visual === 'fireblast') drawHeavyFireImpact(ctx, effect.x, arena.floor, elapsed)
      if (effect.damage && effect.visual === 'hydro') drawWaterImpact(ctx, effect.x, arena.floor, elapsed)
      if (effect.damage && effect.visual === 'drain') drawTarget(ctx, effect, arena.floor, visualTime)
      if (effect.damage) {
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - elapsed / .34)
        ctx.strokeStyle = decisive ? '#fff1b0' : palette(effect.type)
        ctx.lineWidth = decisive ? 7 : 4
        ctx.beginPath()
        ctx.arc(effect.x, arena.floor, 13 + elapsed * (decisive ? 240 : 145), 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3
        const distance = 8 + elapsed * 92
        ctx.fillRect(effect.x + Math.cos(angle) * distance, arena.floor + Math.sin(angle) * distance, 6, 6)
      }
      const label = effect.dodged ? (language() === 'es' ? 'Esquivó' : 'Dodged') :
        effect.damage ? '−' + effect.damage + (effect.critical ? ' !!!' : '') : '•'
      text(label, effect.x, arena.floor - 32 - elapsed * 83, effect.critical ? 39 : 29, effect.critical ? '#ffd066' : '#fff4e3', 7)
    }
    ctx.restore()
    const copy = words[language()]
    if (showWinner) {
      if (victory.hidden) {
        victory.lastElementChild.textContent = battle.winner.name
        victory.hidden = false
      }
      if (victory.firstElementChild.textContent !== copy.victory) victory.firstElementChild.textContent = copy.victory
    }
    const nextStatus = showWinner ? battle.winner.name + ' ' + copy.wins :
      battle.over && !battle.winner ? copy.over : battle.suddenDeath ? copy.sudden : isAuto ? copy.live : copy.manual
    if (status.textContent !== nextStatus) status.textContent = nextStatus
  }
  requestAnimationFrame(draw)
  return () => {
    const copy = words[language()]
    pane.querySelector('h2').textContent = language() === 'es' ? 'Vista previa de batalla' : 'Battle preview'
    pane.querySelector('.lab-hint').textContent = language() === 'es' ? 'Prueba una ronda con Pokémon aleatorios sin afectar el directo ni el progreso.' : 'Simulate a round with random Pokémon without affecting the stream or progress.'
    for (const [index, label] of form.querySelectorAll('label span').entries()) {
      label.textContent = [copy.pokemon, copy.move, copy.level, copy.all][index]
    }
    form.querySelector('[data-start="random"]').textContent = copy.random
    form.querySelector('[data-start="test"]').textContent = copy.test
    communityButton.textContent = copy.community
    showLearnset()
    if (!battle) status.textContent = roster.length ? copy.idle : importHint[language()]
  }
}
