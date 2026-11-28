import { level, maxLevel, xpAtLevel } from './levels.js'
import { drawArea, drawClash, drawDigMound, drawField, drawHyper, drawOngoing, drawPoisonHazard, drawProjectile, drawStatus, drawTarget, drawUltimate } from '../dev/battle-vfx.js'

const images = new Map()

export { level }

export const companionWidth = 1920
export const companionHeight = 1080
export const companionStripHeight = 550
const scales = new Map()

const battleClipFallbacks = {
  Run: ['Walk', 'Charge'], Walk: ['Run'], Sleep: [], Hurt: ['Idle'],
  Faint: ['Hurt'], Shoot: ['Special0', 'Attack'], Special0: ['Shoot', 'Attack'],
  Attack: ['Strike', 'Charge', 'Shoot']
}

export function battleClip(animations, motion, kind) {
  const fallbacks = battleClipFallbacks[motion] ?? (kind === 'rush' ? ['Strike', 'Attack'] : ['Attack', 'Shoot'])
  return [motion, ...fallbacks, 'Idle', 'Walk'].map(name => animations?.[name]).find(Boolean)
}

function loadImage(animation) {
  let cached = images.get(animation.url)
  if (!cached || cached.retryAt <= Date.now()) {
    const attempt = (cached?.attempt ?? -1) + 1
    const image = new Image()
    cached = { image, attempt, retryAt: Infinity }
    image.onerror = () => { cached.retryAt = Date.now() + Math.min(30_000, 3000 * 2 ** attempt) }
    images.set(animation.url, cached)
    const separator = animation.url.includes('?') ? '&' : '?'
    image.src = attempt ? animation.url + separator + 'retry=' + Date.now() : animation.url
  }
  const { image } = cached
  return image.complete && image.naturalWidth ? image : null
}

function readyClip(clip, animations) {
  return [clip, animations?.Idle, animations?.Walk].find(candidate => candidate && loadImage(candidate))
}

function companionScale(reference) {
  if (!reference) return 3
  if (scales.has(reference.url)) return scales.get(reference.url)
  const image = loadImage(reference)
  if (!image) return 3
  const { width, height, rows } = reference
  const sample = document.createElement('canvas')
  sample.width = width
  sample.height = height
  const context = sample.getContext('2d')
  context.drawImage(image, 0, rows === 1 ? 0 : height * 2, width, height, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height).data
  let top = height
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3]) {
        top = Math.min(top, y)
        bottom = y
        break
      }
    }
  }
  const visibleHeight = bottom - top + 1
  const scale = visibleHeight > 0 ? Math.max(3, Math.min(5, Math.ceil(48 / visibleHeight))) : 3
  scales.set(reference.url, scale)
  return scale
}

export function spriteScale(animation, scale) {
  if (!/\/Static\.(?:png|webp)$/.test(animation?.url ?? '')) return scale
  return scale * Math.min(1, 40 / Math.max(animation.width, animation.height))
}

export function bossDisplayScale(reference, normal, multiplier, zoom, floor) {
  const relativeHeight = normal ? Math.min(1, normal.height / reference.height) : 1
  const scale = 3 * zoom * multiplier * relativeHeight
  const standing = reference.height * spriteScale(reference, scale)
  return scale * Math.min(1, Math.max(80, floor - 52) / standing)
}

const frameBounds = new WeakMap()
function visibleFrame(image, frame, row, width, height) {
  let frames = frameBounds.get(image)
  if (!frames) { frames = new Map(); frameBounds.set(image, frames) }
  const key = [frame, row, width, height].join(':')
  if (frames.has(key)) return frames.get(key)
  const sample = document.createElement('canvas')
  sample.width = width
  sample.height = height
  const context = sample.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, frame * width, row * height, width, height, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height).data
  let bottom = height
  for (let scan = height - 1; scan >= 0; scan--) {
    let opaque = false
    for (let x = 0; x < width; x++) if (pixels[(scan * width + x) * 4 + 3]) { opaque = true; break }
    if (opaque) { bottom = scan + 1; break }
  }
  frames.set(key, bottom)
  return bottom
}

export function sprite(context, animation, x, y, direction, elapsed, still = false, scale = 2, once = false, grounded = false) {
  if (!animation) return false
  const image = loadImage(animation)
  if (!image) return false

  const { width, height, durations, rows } = animation
  const drawScale = spriteScale(animation, scale)
  const total = durations.reduce((sum, duration) => sum + duration, 0)
  const ticks = Math.floor(elapsed * 60 / 1000)
  let clock = still ? 0 : once ? Math.min(ticks, total - 1) : ticks % total
  let frame = 0
  while (frame < durations.length - 1 && clock >= durations[frame]) {
    clock -= durations[frame++]
  }
  const row = rows === 1 ? 0 : direction < 0 ? 6 : direction > 0 ? 2 : 0

  const anchor = grounded ? visibleFrame(image, frame, row, width, height) : height / 2
  context.drawImage(image, frame * width, row * height, width, height,
    Math.round(x - width * drawScale / 2), Math.round(y - anchor * drawScale), width * drawScale, height * drawScale)
  return true
}

function label(context, text, x, y, size = 15, color = '#fff', outline = 3) {
  context.font = 'bold ' + size + 'px system-ui'
  context.textAlign = 'center'
  context.lineWidth = outline
  context.strokeStyle = '#101719'
  context.fillStyle = color
  context.strokeText(text, x, y)
  context.fillText(text, x, y)
}

export function createCaptureQueue() {
  let seen = new Set()
  let nextRowAt = 0
  const pending = []
  let visible = []
  return (captures, time, wallTime, elapsed) => {
    const current = new Set()
    for (const capture of captures) {
      const key = capture.encounterId + ':' + capture.id
      current.add(key)
      if (!seen.has(key) && wallTime - capture.at < 10_000) pending.push(capture)
    }
    seen = current
    visible = visible.filter(row => time - row.shownAt < 4100)
    if (visible.length < 3 && pending.length && time >= nextRowAt) {
      visible.push({ capture: pending.shift(), shownAt: time, y: visible.length * 24 + 12 })
      nextRowAt = time + 450
    }
    return visible.map((row, index) => {
      row.y += (index * 24 - row.y) * (1 - Math.exp(-elapsed * 18))
      const age = time - row.shownAt
      return { ...row.capture, y: row.y, opacity: Math.min(1, age / 180, (4100 - age) / 700) }
    })
  }
}

function encounterCard(ctx, wild, entry, captures, width, height, fade, time, formatTime, language, arrivalAge) {
  const scale = Math.min(1, height / 295, width / 410)
  const x = width / 2
  const y = height / 2 - 124 * scale + (1 - fade) * 8
  const accent = wild.specialTag ? '#d7a7ff' : wild.shiny ? '#fad77f' : '#c2d9c8'
  const box = (left, top, w, h, radius, color) => {
    ctx.beginPath()
    ctx.roundRect(left, top, w, h, radius)
    ctx.fillStyle = color
    ctx.fill()
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.globalAlpha = fade
  if (wild.specialTag && arrivalAge < 1250) {
    const burst = arrivalAge / 1250
    ctx.save()
    ctx.globalAlpha = fade * (1 - burst)
    for (let i = 0; i < 2; i++) {
      ctx.beginPath()
      ctx.ellipse(0, 84, 83 + burst * 54 + i * 15, 92 + burst * 12 + i * 7, 0, 0, 2 * Math.PI)
      ctx.strokeStyle = i ? '#ffe7a3' : accent
      ctx.lineWidth = i ? 2 : 4
      ctx.stroke()
    }
    ctx.restore()
  }
  if (wild.specialTag) {
    const tags = { legendary: ['Legendario', 'Legendary'], mythical: ['Mítico', 'Mythical'],
      ultraBeast: ['Ultraente', 'Ultra Beast'], paradox: ['Paradoja', 'Paradox'] }
    const en = language === 'en'
    const text = (en ? 'Ultra-rare' : 'Ultrarraro') + ' · ' + tags[wild.specialTag][Number(en)]
    label(ctx, text, 0, -6, 13, accent)
  }
  box(-78, 4, 160, 176, 12, '#0e151dcc')
  box(-80, 0, 160, 176, 12, '#202d32')
  box(-77, 3, 154, 170, 10, accent)
  box(-74, 6, 148, 164, 8, '#233339')
  box(-55, 12, 110, 110, 5, '#16272b')
  const cropped = wild.shiny ? entry?.shinyPortrait ?? entry?.portrait : entry?.portrait
  const image = cropped ? loadImage({ url: cropped }) : null
  if (image) ctx.drawImage(image, -53, 14, 106, 106)
  else {
    const animations = (wild.shiny ? entry?.shiny ?? entry?.normal : entry?.normal)?.animations
    sprite(ctx, readyClip(null, animations), 0, 66, 0, 0, true, 1.6)
    if (!cropped && !animations?.Idle && !animations?.Walk) label(ctx, wild.name[0], 0, 74, 34)
  }
  if (wild.shiny) sparkles(ctx, 0, 68, time, 0, 2)
  label(ctx, wild.name + (wild.shiny ? ' ✦' : '') + ' · Lv. ' + (wild.level ?? 1), 0, 140, wild.name.length > 13 ? 13 : 15)
  box(-69, 146, 138, 19, 4, '#101e23')
  label(ctx, [wild.difficulty, formatTime(wild.endsAt)].filter(Boolean).join(' · '), 0, 161, 13)
  for (const caught of captures) {
    ctx.globalAlpha = fade * caught.opacity
    box(-185, 184 + caught.y, 370, 22, 6, '#17232bef')
    const name = caught.viewer.length > 20 ? caught.viewer.slice(0, 19) + '…' : caught.viewer
    const text = language === 'en' ? name + ' caught ' + caught.pokemon + '!' : '¡' + name + ' capturó a ' + caught.pokemon + '!'
    label(ctx, text, 0, 200 + caught.y, text.length > 47 ? 12 : 14)
  }
  ctx.restore()
}

function summonCapsule(context, x, y, age) {
  const opening = Math.max(0, Math.min(1, (age - 180) / 310))
  const drop = Math.max(0, 1 - age / 180)
  const cy = y + 14 - drop * drop * 48
  context.save()
  context.translate(x, cy)
  context.globalAlpha = 1 - opening
  context.lineWidth = 3
  context.strokeStyle = '#3b2939'
  for (const half of [-1, 1]) {
    context.save()
    context.translate(0, half * opening * 20)
    context.beginPath()
    context.arc(0, 0, 15, half < 0 ? Math.PI : 0, half < 0 ? 2 * Math.PI : Math.PI)
    context.closePath()
    context.fillStyle = half < 0 ? '#e86b62' : '#fff1d7'
    context.fill()
    context.stroke()
    context.restore()
  }
  context.beginPath()
  context.arc(0, 0, 5, 0, Math.PI * 2)
  context.fillStyle = '#fff7df'
  context.fill()
  context.stroke()
  const burst = (age - 180) / 450
  if (burst > 0 && burst < 1) {
    context.globalAlpha = 1 - burst
    context.fillStyle = '#fff2aa'
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5
      const distance = 12 + burst * 60
      const size = Math.max(1, 6 - burst * 5)
      context.fillRect(Math.cos(angle) * distance, Math.sin(angle) * distance - burst * 20, size, size)
    }
  }
  context.restore()
}

function sparkles(context, x, y, time, phase, scale) {
  context.save()
  const colors = ['#fff8c7', '#ffd15e', '#ffffff']
  for (let index = 0; index < colors.length; index++) {
    const cycle = (time / 1600 + phase + index * .33) % 1
    if (cycle > .65) continue
    const glow = Math.sin(Math.PI * cycle / .65)
    const px = x + [-1, .85, .45][index] * 12 * scale
    const py = y + ([-.45, .1, -.85][index] - cycle * .65) * 12 * scale
    const radius = (1 + glow * 2) * scale
    context.globalAlpha = glow
    context.fillStyle = colors[index]
    context.beginPath()
    context.moveTo(px, py - radius)
    context.lineTo(px + radius * .28, py - radius * .28)
    context.lineTo(px + radius, py)
    context.lineTo(px + radius * .28, py + radius * .28)
    context.lineTo(px, py + radius)
    context.lineTo(px - radius * .28, py + radius * .28)
    context.lineTo(px - radius, py)
    context.lineTo(px - radius * .28, py - radius * .28)
    context.fill()
  }
  context.restore()
}

export function chooseBehavior(actor, animations, time, random = Math.random) {
  const roll = random()
  const jump = animations.Jump ? 'Jump' : animations.Hop ? 'Hop' : null
  const attack = animations.Shoot && roll >= .42 ? 'Shoot' : animations.Attack ? 'Attack' : null
  let behavior = 'Walk'
  let duration = 2800 + random() * 4300
  actor.turnAt = null

  if (actor.behavior === 'Walk') {
    const turns = random() < .6
    behavior = 'Idle'
    duration = (turns ? 4700 : 2900) + random() * 2800
    if (turns) actor.turnAt = time + duration * .48
  } else if (actor.behavior === 'Idle') {
    if (roll < .28 && animations.Sleep) {
      behavior = 'Sleep'
      duration = 4000 + random() * 4200
    } else if (roll >= .28 && roll < .49 && attack) {
      behavior = attack
      duration = Math.max(650, animations[attack].durations.reduce((sum, frames) => sum + frames, 0) * 1000 / 60)
    } else if (roll >= .49 && roll < .65 && jump) {
      behavior = jump
      duration = 700
    } else if (random() < .5) {
      actor.direction *= -1
    }
  }

  actor.speed = behavior === 'Walk' ? 75 + random() * 65 : jump && behavior === jump ? 50 : 0
  actor.behavior = behavior
  actor.since = time
  actor.until = time + duration
}

function dynamaxAura(context, x, y, top, time, age) {
  const height = Math.max(90, y - top)
  const radius = Math.min(170, height * .64)
  const pulse = .82 + Math.sin(time / 220) * .18
  context.save()
  const glow = context.createRadialGradient(x, y - height * .36, 7, x, y - height * .36, radius)
  glow.addColorStop(0, '#e044803d')
  glow.addColorStop(.55, '#f434656b')
  glow.addColorStop(1, '#f4346500')
  context.fillStyle = glow
  context.fillRect(x - radius, y - height * .36 - radius, radius * 2, radius * 2)
  context.globalAlpha = pulse
  context.lineWidth = 2
  context.strokeStyle = '#ff557b'
  context.shadowColor = '#ff003f'
  context.shadowBlur = 13
  for (let arc = 0; arc < 3; arc++) {
    context.beginPath()
    context.ellipse(x, y + 6 + arc * 4, radius * (.56 + arc * .12), 8 + arc * 3, 0, time / 480 + arc * 2, time / 480 + arc * 2 + 1.8)
    context.stroke()
  }
  context.shadowBlur = 0
  for (let i = 0; i < 14; i++) {
    const drift = (time / (24 + i) + i * 13) % 100 / 100
    context.globalAlpha = Math.sin(drift * Math.PI) * .85
    context.fillStyle = i % 3 === 0 ? '#ffd2df' : '#ff4e78'
    context.fillRect(x + Math.sin(i * 8.1 + drift * 2) * radius * .8, y - drift * (height + 32), 3, 4)
  }
  if (age < 11) {
    context.globalAlpha = Math.min(1, age * 2 + .25, (11 - age) / 2)
    for (let i = 0; i < 5; i++) {
      const cx = x + (i - 2) * radius * .28 + Math.sin(time / 460 + i * 1.1) * 12
      const cy = Math.max(28, top - 24) - Math.sin(i * 1.8 + time / 610) * 10
      const w = radius * (.22 + i % 2 * .09)
      const mist = context.createRadialGradient(cx, cy, 1, cx, cy, w)
      mist.addColorStop(0, '#ffadcbe8')
      mist.addColorStop(.4, '#c43f79db')
      mist.addColorStop(.75, '#8628579c')
      mist.addColorStop(1, '#5c214e00')
      context.fillStyle = mist
      context.beginPath()
      context.ellipse(cx, cy, w, w * .47, Math.sin(i) * .16, 0, Math.PI * 2)
      context.fill()
    }
  }
  context.restore()
}

export function showScene(canvas, kind, catalog, getState, formatTime, { strip = false } = {}) {
  if (kind === 'companions') {
    canvas.width = companionWidth
    canvas.height = strip ? companionStripHeight : companionHeight
  }
  const context = canvas.getContext('2d')
  const actors = new Map()
  const battlePositions = new Map()
  const defeats = new Map()
  let battleEndedAt
  let battleSnapshot
  let snapshotAt
  const species = new Map(catalog.map(entry => [entry.name, entry]))
  let previous = 0
  let shownEncounter
  let shownEncounterAt = 0
  const captureQueue = createCaptureQueue()
  let encounterOpacity = 0
  function draw(time) {
    requestAnimationFrame(draw)
    const elapsed = Math.min(.1, (time - previous) / 1000)
    previous = time
    const state = getState()
    if (!state) return
    const width = kind === 'companions' ? companionWidth : canvas.clientWidth
    const height = kind === 'companions' ? (strip ? companionStripHeight : companionHeight) : canvas.clientHeight
    if (!canvas.clientWidth || !canvas.clientHeight) return
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    context.clearRect(0, 0, width, height)
    context.imageSmoothingEnabled = false

    const zoom = (state.config.spriteScale ?? 100) / 100

    if (kind === 'encounter') {
      const wild = state.encounter
      const active = wild && Date.now() < wild.endsAt
      if (active) {
        if (shownEncounter?.id !== wild.id) {
          encounterOpacity = 0
          shownEncounterAt = time
        }
        shownEncounter = wild
      }
      if (!shownEncounter) return
      const captures = captureQueue(state.recentCaptures ?? [], time, Date.now(), elapsed)
      encounterOpacity = Math.max(0, Math.min(1, encounterOpacity + elapsed * (active || captures.length ? 3.1 : -2.7)))
      if (!encounterOpacity) return
      encounterCard(context, shownEncounter, species.get(shownEncounter.name), captures, width, height,
        encounterOpacity * encounterOpacity * (3 - 2 * encounterOpacity), time, formatTime, state.bot?.language, time - shownEncounterAt)
      return
    }

    if (state.battle && !state.battleStart) {
      const floor = height - 2
      const battle = state.battle
      if (battleSnapshot !== battle) {
        if (battleSnapshot && battle.time < battleSnapshot.time) {
          battlePositions.clear()
          defeats.clear()
        }
        battleSnapshot = battle
        snapshotAt = time
      }
      if (battle.over) battleEndedAt ??= time
      else battleEndedAt = undefined
      const ahead = battle.over ? 0 : Math.min(.10, (time - snapshotAt) / 1000)
      const renderTime = battle.time + ahead
      const feedbackTime = renderTime + (battleEndedAt === undefined ? 0 : (time - battleEndedAt) / 1000)
      actors.clear()
      if (battle.field && !battle.over) drawField(context, battle.field, width, height, floor, renderTime)
      const hitFeedback = new Map()
      for (const effect of battle.effects) {
        if (effect.expires <= feedbackTime) continue
        if (effect.kind === 'hit' && effect.damage > 0 && Number.isInteger(effect.target)) {
          if (!hitFeedback.has(effect.target)) hitFeedback.set(effect.target, [])
          hitFeedback.get(effect.target).push(effect)
        }
        if (effect.bossImpact && !battle.over) {
          const age = Math.max(0, feedbackTime - effect.at)
          context.save()
          context.globalAlpha = Math.max(0, 1 - age / .4)
          context.strokeStyle = '#ff7195'
          context.lineWidth = 5
          context.beginPath()
          context.ellipse(effect.x, floor - 40, 23 + age * 100, 16 + age * 65, 0, 0, Math.PI * 2)
          context.stroke()
          context.restore()
        }
        if (battle.over) continue
        const color = effect.type === 'fire' ? '#ff8957' : effect.type === 'water' ? '#7bddff' : '#e1c8ff'
        if (effect.kind === 'geyser') {
          const age = renderTime - effect.at
          context.save()
          context.shadowColor = '#66eaff'
          context.shadowBlur = 20
          if (age < 0) {
            context.strokeStyle = '#74e4ff'
            context.lineWidth = 4
            context.beginPath()
            context.ellipse(effect.x, floor - 12, 47, 10, 0, 0, Math.PI * 2)
            context.stroke()
          } else {
            const rise = Math.sin(Math.min(1, age / .55) * Math.PI)
            const plume = context.createLinearGradient(0, floor - rise * 125 - 12, 0, floor - 12)
            plume.addColorStop(0, '#e8fbff00')
            plume.addColorStop(.25, '#e2fbff')
            plume.addColorStop(1, '#147dda')
            context.fillStyle = plume
            for (const dx of [-18, 0, 18]) {
              context.beginPath()
              context.ellipse(effect.x + dx, floor - 16 - rise * 54, 24, 15 + rise * (58 - Math.abs(dx)), dx * .012, 0, Math.PI * 2)
              context.fill()
            }
          }
          context.restore()
        } else if (effect.kind === 'boss-blink') {
          const phase = Math.max(0, Math.min(1, (renderTime - effect.at) / .65))
          context.save()
          context.globalAlpha = 1 - phase
          context.shadowBlur = 19
          context.shadowColor = '#f4588c'
          context.strokeStyle = '#ff85b5'
          context.lineWidth = 4
          for (const x of [effect.origin, effect.x]) {
            context.beginPath()
            context.ellipse(x, floor - 35, 22 + phase * 74, 12 + phase * 47, 0, 0, Math.PI * 2)
            context.stroke()
          }
          context.restore()
        } else if (effect.kind === 'warning') {
          context.save()
          context.globalAlpha = .55
          context.strokeStyle = color
          context.lineWidth = 3
          context.beginPath()
          context.ellipse(effect.x, floor - 10, effect.reach, 11, 0, 0, Math.PI * 2)
          context.stroke()
          context.restore()
        } else if (effect.kind === 'ultimate') drawUltimate(context, effect, width, floor, renderTime, color)
        else if (effect.visual === 'hyper') drawHyper(context, effect, width, floor, renderTime)
        else if (effect.kind === 'clash') drawClash(context, effect.x, floor, renderTime - effect.at)
        else if (effect.kind === 'hazard') drawPoisonHazard(context, effect, floor, renderTime)
        else if (effect.kind === 'target') drawTarget(context, effect, floor - 38, renderTime)
        else if (effect.kind === 'area') drawArea(context, effect, floor, color, renderTime)
      }
      if (!battle.over) for (const shot of battle.projectiles) {
        const x = shot.x + shot.direction * 720 * ahead
        if (renderTime < shot.end && x >= 0 && x <= width) drawProjectile(context, { ...shot, x }, floor - 40, renderTime)
      }
      for (const [index, fighter] of state.battle.actors.entries()) {
        const hits = hitFeedback.get(index)
        if (fighter.hp) defeats.delete(index)
        else if (!defeats.has(index)) defeats.set(index, time)
        const faintAge = fighter.hp ? 0 : (time - defeats.get(index)) / 1000
        if (!fighter.hp && !hits && faintAge > .65) continue
        const appearance = fighter.appearance ?? fighter
        const entry = species.get(appearance.name)
        const form = entry?.battleForms?.[appearance.form]
        const variant = appearance.shiny ? form?.shiny ?? entry?.shiny ?? form?.normal ?? entry?.normal : form?.normal ?? entry?.normal
        const clip = battleClip(variant?.animations, fighter.motion)
        const start = battlePositions.get(index) ?? fighter.x
        const x = start + (fighter.x - start) * Math.min(1, elapsed * 13)
        battlePositions.set(index, x)
        const laneLift = battle.raid && !fighter.boss ? (index % 4) * 9 : 0
        const baseY = floor - laneLift - (fighter.flying && !fighter.boss ? 28 - Math.sin(time / 280 + index) * 5 : 0)
        const y = (fighter.maneuver?.kind === 'fly' ? baseY - Math.sin(Math.PI * fighter.maneuver.phase) * 130 : baseY) - (fighter.bossHop ?? 0)
        let scale = 3 * zoom * (fighter.boss ? fighter.bossScale ?? 4 : 1)
        if (fighter.boss && clip) {
          const base = appearance.form === 'gigantamax' && battleClip(entry?.normal?.animations, 'Idle')
          const reference = battleClip(variant?.animations, 'Idle') ?? clip
          scale = bossDisplayScale(reference, base, fighter.bossScale ?? 4, zoom, floor)
        }
        const top = Math.max(28, y - Math.max(38, (clip?.height ?? 0) * spriteScale(clip, scale)))
        if (fighter.hp && fighter.maneuver?.kind === 'dig') drawDigMound(context, x, y, renderTime)
        else if (fighter.hp) {
          context.save()
          if (fighter.boss) {
            dynamaxAura(context, x, y, top, time, renderTime)
            context.shadowColor = '#ff315e'
            context.shadowBlur = 18
            if (fighter.motion === 'Run') {
              const ghost = readyClip(clip, variant?.animations)
              context.save()
              context.globalAlpha = .24
              for (const distance of [36, 18]) sprite(context, ghost, x - fighter.direction * distance, y, fighter.direction, time, false, scale, false, true)
              context.restore()
            }
          }
          if (fighter.ulting) {
            const charged = readyClip(clip, variant?.animations)
            if (charged) {
              context.save()
              context.filter = 'brightness(0) saturate(100%) invert(86%) sepia(71%) saturate(2736%) hue-rotate(151deg)'
              context.shadowBlur = 18 + Math.sin(time / 73) * 5
              context.shadowColor = '#50d8ff'
              for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) {
                sprite(context, charged, x + dx, y + dy, fighter.direction, time, false, scale, false, true)
              }
              context.restore()
            }
          }
          if (!fighter.boss && hits?.some(hit => renderTime - hit.at < .17)) context.filter = 'brightness(0) invert(1)'
          sprite(context, readyClip(clip, variant?.animations), x, y, fighter.direction, time, false, scale, false, true)
          context.restore()
          if (!clip) label(context, fighter.name[0], x, y, 25)
        }
        if (hits) hits.slice(-4).forEach((hit, slot) => {
          const age = Math.max(0, feedbackTime - hit.at)
          const anchor = top > 100 ? top - 28 : Math.min(height - 28, top + 55)
          context.save()
          context.globalAlpha = Math.min(1, (hit.expires - feedbackTime) * 5)
          context.lineJoin = 'round'
          label(context, '-' + Math.round(hit.damage), x + (slot % 2 ? 24 : -14) + (hit.critical ? Math.sin(age * 96) * Math.max(0, 8 - age * 35) : 0), Math.max(29, anchor - age * 53 - slot * 13),
            hit.critical ? 39 : 30, hit.critical ? '#ffcc51' : '#ffffff', hit.critical ? 7 : 5)
          context.restore()
        })
        if (!fighter.hp) {
          const age = faintAge
          context.save()
          context.globalAlpha = Math.max(0, 1 - age * 1.8)
          if (age < .35) sprite(context, readyClip(clip, variant?.animations), x, y - age * 30, fighter.direction, time, false, scale, false, true)
          context.fillStyle = '#eee2ff'
          context.shadowBlur = 14
          context.shadowColor = '#a26aff'
          for (let i = 0; i < 9; i++) {
            const angle = i * .698
            context.fillRect(x + Math.cos(angle) * (18 + age * 75), top + 28 + Math.sin(angle) * (18 + age * 75) - age * 38, 6, 6)
          }
          context.restore()
          continue
        }
        if (fighter.ongoing) drawOngoing(context, fighter.ongoing, x, y, renderTime)
        if (fighter.status) drawStatus(context, fighter.status, x, top - 55, renderTime, 26, 24)
        if (fighter.evasion || fighter.flinched) label(context, fighter.flinched ? '✦ ✦' : '≋', x + 32, top - 49, 20)
        if (fighter.boss) continue
        label(context, (fighter.teamIndex ? '#T' + fighter.teamIndex + ' · ' : '') + (fighter.ownerName ? fighter.ownerName + ' | ' : '') + (appearance.disguised ? appearance.name : fighter.name) + ' · Lv. ' + fighter.level, x, top - 14, 21)
        const hp = fighter.hp / fighter.maxHp
        context.fillStyle = '#131b22'
        context.fillRect(x - 46, top - 8, 92, 9)
        context.fillStyle = hp <= .2 ? '#ed5863' : hp <= .5 ? '#ffce66' : '#65e595'
        context.fillRect(x - 44, top - 6, 88 * hp, 5)
      }
      if (battle.raid && battle.over) label(context, state.battle.actors.some(actor => actor.boss && actor.hp) ?
        (state.bot?.language === 'es' ? 'Incursión terminada' : 'Raid ended') : (state.bot?.language === 'es' ? '¡Jefe derrotado!' : 'Boss defeated!'), width / 2, height * .63, 49, '#ffe7a6')
      else if (state.battle.over && state.battle.winner) label(context, state.battle.winner +
        (state.bot?.language === 'es' ? ' gana la batalla' : ' wins the battle'), width / 2, height * .63, 49, '#ffe7a6')
      return
    }
    battleSnapshot = undefined
    battlePositions.clear()
    defeats.clear()
    battleEndedAt = undefined
    if (state.battleStart) label(context, state.bot?.language === 'es' ? '¡Empieza la batalla!' : 'Battle Start!', width / 2, height * .62, 64, '#ffe7a6')
    const active = Object.entries(state.viewers).filter(([, data]) => data.active && data.active.expires > Date.now())
      .sort((a, b) => a[1].active.layer - b[1].active.layer)
    const showNames = active.length <= state.config.nameLimit
    const visible = active.slice(-state.config.visibleLimit)
    const layers = new Set(visible.map(([, data]) => data.active.layer))
    for (const layer of actors.keys()) if (!layers.has(layer)) actors.delete(layer)

    for (const [viewer, data] of visible) {
      const { key, layer } = data.active
      const name = key.replace(/ ✦$/, '')
      const entry = species.get(name)
      const animations = (key.endsWith(' ✦') ? entry?.shiny ?? entry?.normal : entry?.normal)?.animations ?? {}
      if (!actors.has(layer)) actors.set(layer, { x: width * (.15 + Math.random() * .7),
        direction: Math.random() < .5 ? -1 : 1, until: time + 640, since: time, arrived: time,
        behavior: 'Idle', turnAt: null, speed: 0 })
      const actor = actors.get(layer)
      if (data.active.evolvedAt && actor.evolvedAt !== data.active.evolvedAt) {
        actor.evolvedAt = data.active.evolvedAt
        actor.arrived = time
        actor.since = time
        actor.behavior = 'Idle'
      }
      const rank = level(data.collection[key])
      if (actor.rank !== undefined && rank > actor.rank) actor.levelUpAt = time
      actor.rank = rank
      if (actor.until <= time) chooseBehavior(actor, animations, time)
      if (actor.turnAt !== null && time >= actor.turnAt) {
        actor.direction *= -1
        actor.turnAt = null
      }
      actor.x += elapsed * actor.speed * actor.direction
      const standing = animations.Idle || animations.Walk
      const scale = companionScale(standing) * zoom
      const animation = animations[actor.behavior] || standing
      const once = ['Attack', 'Shoot', 'Jump', 'Hop'].includes(actor.behavior)
      if (actor.marginScale !== scale) {
        actor.marginScale = scale
        actor.margin = Math.min(Math.max(82, ...Object.values(animations).map(clip => clip.width * spriteScale(clip, scale) / 2 + 18)), width / 2)
      }
      const margin = actor.margin
      if (actor.x < margin || actor.x > width - margin) {
        actor.x = Math.max(margin, Math.min(width - margin, actor.x))
        actor.direction = actor.x === margin ? 1 : -1
      }
      const jumping = actor.behavior === 'Jump' || actor.behavior === 'Hop'
      const lift = jumping ? 36 * Math.sin(Math.PI * (time - actor.since) / (actor.until - actor.since)) : 0
      const y = height - 2 - lift
      const summonAge = time - actor.arrived
      if (summonAge < 640) summonCapsule(context, actor.x, y, summonAge)
      if (summonAge < 230) continue
      context.save()
      context.globalAlpha = Math.min(1, (summonAge - 230) / 230)
      const clip = readyClip(animation, animations)
      sprite(context, clip, actor.x, y, actor.direction, time - actor.since, false, scale, once && clip === animation, true)
      if (!animation) label(context, name[0], actor.x, y, 22)
      if (key.endsWith(' ✦')) sparkles(context, actor.x, y, time, layer * .13, scale)
      const pickup = data.active.pickup
      const pickupAge = pickup && (Date.now() - pickup.at) / 2100
      const labelY = y - Math.max(45, (animation?.height ?? 0) * spriteScale(animation, scale))
      const levelUpAge = time - (actor.levelUpAt ?? -Infinity)
      if (pickup && pickupAge >= 0 && pickupAge < 1) {
        context.save()
        context.globalAlpha *= 1 - pickupAge
        const top = labelY - (levelUpAge < 1650 ? 105 : 40) - pickupAge * 42
        const rewards = [pickup.candy && '🍬 +1', pickup.money && '+$' + pickup.money, pickup.masterBall && 'Master Ball +1'].filter(Boolean)
        rewards.forEach((reward, index) => label(context, reward, actor.x, top - index * 29, 25))
        context.restore()
      }
      if (showNames) {
        const nameInChat = data.displayName || viewer
        const display = nameInChat.length > 16 ? nameInChat.slice(0, 15) + '…' : nameInChat
        const names = [state.config.showViewerName !== false && display, state.config.showPokemonName !== false && key].filter(Boolean)
        if (names.length) label(context, names.join(' | '), actor.x, labelY - 22, 23)
        const bounce = levelUpAge < 650 ? Math.sin(Math.PI * levelUpAge / 650) * 9 : 0
        label(context, 'Lv. ' + rank, actor.x, labelY + bounce * .3, 19 + bounce, bounce ? '#a2fce1' : '#fff')
        const start = xpAtLevel(rank)
        const fraction = rank >= maxLevel ? 1 : (data.collection[key] - start) / (xpAtLevel(rank + 1) - start)
        context.fillStyle = '#142c44'
        context.fillRect(actor.x - 27, labelY + 14, 54, 5)
        context.fillStyle = '#79d7ff'
        context.fillRect(actor.x - 27, labelY + 14, 54 * Math.max(0, Math.min(1, fraction)), 5)
      }
      if (levelUpAge < 1650) {
        const rise = levelUpAge / 1650
        context.globalAlpha *= Math.min(1, (1 - rise) * 2.5)
        label(context, state.bot?.language === 'es' ? '¡Subió de nivel!' : 'Level up!!', actor.x,
          labelY - 49 - rise * 44, 29, '#a2fce1')
      }
      context.restore()
    }
  }
  requestAnimationFrame(draw)
}
