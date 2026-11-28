const tau = Math.PI * 2
const goldenAngle = Math.PI * (3 - Math.sqrt(5))
const palette = {
  normal: '#fff3c4', fighting: '#ff984a', flying: '#affeef', poison: '#d791ff', ground: '#ffc67d',
  rock: '#d9a77c', bug: '#dafa76', ghost: '#a797ff', steel: '#d3eaff', fire: '#ff793e',
  water: '#63d9ff', grass: '#a8f36a', electric: '#ffe566', psychic: '#fa8bff', ice: '#b6f9ff',
  dragon: '#ad8aff', dark: '#ad92e4', fairy: '#ffb4e7'
}
const rgb = Object.fromEntries(Object.values(palette).map(color => [color, [1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16) / 255)]))
const statusType = { burn: 'fire', poison: 'poison', sleep: 'psychic', freeze: 'ice', paralysis: 'electric' }
export const elementTile = {
  normal: 4, fighting: 5, fire: 6, water: 7, electric: 8, ground: 9, rock: 9, steel: 10,
  ghost: 11, dark: 12, fairy: 13, dragon: 14, grass: 15, bug: 16, flying: 17, poison: 18, ice: 19, psychic: 17
}
const stageIcons = { attack: 'sword', specialAttack: 'wand', defense: 'shield', specialDefense: 'ward', speed: 'boot' }
const hudTiles = { sword: 0, wand: 1, shield: 2, ward: 3, boot: 4, aura: 5 }
const hudCache = new Map()
let hudAtlas
export const battleFxColor = type => palette[type] ?? palette.normal
const clamp = value => Math.max(0, Math.min(1, value))

function arc(context, x, y, rx, ry, start = 0, end = tau, rotation = 0) {
  context.beginPath()
  context.ellipse(x, y, Math.max(.3, rx), Math.max(.3, ry), rotation, start, end)
  context.stroke()
}

function orb(context, x, y, radius, light, color) {
  const gradient = context.createRadialGradient(x - radius * .28, y - radius * .34, 1, x, y, radius)
  gradient.addColorStop(0, light)
  gradient.addColorStop(.50, color)
  gradient.addColorStop(1, color + '00')
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, tau)
  context.fill()
}

function hudTile(name, color) {
  if (!hudAtlas) {
    hudAtlas = new Image()
    hudAtlas.src = '/battle-hud.webp'
  }
  if (!hudAtlas.complete || !hudAtlas.naturalWidth) return
  const key = name + ':' + color
  if (hudCache.has(key)) return hudCache.get(key)
  const index = hudTiles[name], w = hudAtlas.naturalWidth / 3, h = hudAtlas.naturalHeight / 2
  const tile = document.createElement('canvas')
  tile.width = tile.height = 96
  const ctx = tile.getContext('2d')
  ctx.drawImage(hudAtlas, index % 3 * w, Math.floor(index / 3) * h, w, h, 0, 0, 96, 96)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 96, 96)
  hudCache.set(key, tile)
  return tile
}

export function createBattleParticles(anchor) {
  const items = []
  let surface, pending, unavailable = false, generation = 0
  let water
  const ease = age => surface ? surface.ease(age) : 1 - (1 - age) ** 3
  return {
    begin() {
      items.length = 0
      water = undefined
      if (surface || pending || unavailable) return
      const requested = generation
      pending = import('./battle-fx-gpu.js').then(module => {
        if (requested === generation) surface = module.createParticleSurface(anchor)
      }).catch(() => { unavailable = true }).finally(() => { pending = undefined })
    },
    wave(t, floor, time, pulse) { water = { t, floor, time, pulse } },
    add(x, y, radius, type, opacity, cell = 0, rotation = 0) {
      if (items.length >= 360 || opacity <= .01) return
      const color = battleFxColor(type)
      items.push({ x, y, radius, opacity: clamp(opacity), cell, rotation, rgb: rgb[color], color })
    },
    burst(x, y, type, phase, strength = 1, impact = false) {
      if (phase < 0 || phase > 1) return
      const speed = ease(phase)
      const fade = (1 - phase) ** 1.2
      this.add(x, y, (27 + 43 * speed) * strength, type, fade * .55, 2, phase * 2)
      if (impact) this.add(x, y, (18 + speed * 39) * strength, type, fade * .95, type === 'water' ? 3 : 1, .5 - phase)
      this.add(x, y, (31 + speed * 38) * strength, type, fade * .95, elementTile[type] ?? 4, phase * .43)
      for (let index = 0; index < 7; index++) {
        const angle = index * goldenAngle + x * .017
        const spread = (10 + speed * (36 + index * 4)) * strength
        this.add(x + Math.cos(angle) * spread, y + Math.sin(angle) * spread * .7 + phase ** 2 * 18,
          (7 + index % 4 * 4) * strength, type, fade, index % 3 === 0 ? elementTile[type] ?? 0 : 0, angle + phase)
      }
    },
    paint(context, width, height) {
      if (!items.length && !water) { surface?.hide(); return }
      try { if (surface?.draw(items, width, height, water)) return } catch {
        surface?.dispose()
        surface = undefined
        unavailable = true
      }
      context.save()
      for (let i = 0; i < Math.min(items.length, 120); i++) {
        const { x, y, radius, opacity, cell, color, rotation } = items[i]
        context.globalAlpha = opacity * .82
        if (cell !== 0) orb(context, x, y, radius, '#fff9e9', color)
        else {
          context.save()
          context.translate(x, y)
          context.rotate(rotation)
          context.fillStyle = color
          context.fillRect(-radius * .64, -1, radius * 1.28, 2)
          context.fillRect(-1, -radius * .64, 2, radius * 1.28)
          context.restore()
        }
      }
      context.restore()
    },
    hide() { surface?.hide() },
    reset() {
      generation++
      surface?.dispose()
      surface = undefined
    }
  }
}

export function drawMoveCue(context, particles, effect, x, y, time) {
  const age = (time - effect.at) / (effect.expires - effect.at)
  if (age < 0 || age > 1) return
  const color = battleFxColor(effect.type)
  const released = effect.stage === 'release'
  const fade = 1 - age
  context.save()
  context.strokeStyle = color
  context.globalAlpha = fade * (released ? .87 : .78)
  context.lineWidth = released ? 3 : 2
  if (released && effect.style === 'target' && effect.status === 'sleep') {
    const distance = x - effect.origin
    for (let i = 0; i < 4; i++) {
      const t = clamp(age * 1.65 - i * .13)
      const px = effect.origin + distance * t
      const py = y - 34 * Math.sin(t * Math.PI)
      arc(context, px, py, 12 + 9 * t, 23 + 12 * t, -.96, 1.05, distance < 0 ? Math.PI : 0)
      particles.add(px, py, 13, 'psychic', fade * .75, 0, i)
    }
  } else if (released && (effect.style === 'rush' || effect.style === 'maneuver')) {
    for (let i = 0; i < 3; i++) {
      context.lineWidth = 5 - i
      const sweep = (age * 2.6 + i * .23) * effect.direction
      arc(context, x, y - i * 8, 29 + i * 10 + age * 14, 15 + i * 7, sweep - 1, sweep + .7, -.35 * effect.direction)
    }
  } else if (released && effect.style !== 'projectile' && effect.style !== 'pierce') {
    arc(context, x, y + 10, 15 + age * 55, 8 + age * 19, 0, tau, -.2)
    particles.burst(x, y, effect.type, age, effect.style === 'area' ? 1.45 : .9)
    if (effect.visual === 'pollen' || effect.type === 'fairy' || effect.type === 'ghost') {
      for (let i = 0; i < 9; i++) {
        const a = i * goldenAngle
        particles.add(x + Math.cos(a) * age * (64 + i * 11), y + Math.sin(a) * age * 64,
          13 + i % 3 * 19, effect.type, fade * .8, i % 2 ? elementTile[effect.type] : 2, a + age)
      }
    }
    if (effect.type === 'grass' && effect.style !== 'guard' && effect.visual !== 'pollen') {
      context.strokeStyle = '#acf372'
      for (let i = 0; i < 4; i++) {
        const sign = i % 2 ? -1 : 1
        context.lineWidth = 3 + i % 2 * 2
        context.beginPath()
        context.moveTo(x + sign * (12 + i * 7), y + 38)
        context.quadraticCurveTo(x + sign * (55 + i * 6), y - 39 * age, x + sign * (24 + i * 19), y - 30 * age)
        context.stroke()
      }
    }
    if (effect.visual === 'drain' && Number.isFinite(effect.origin)) {
      for (let i = 0; i < 6; i++) {
        const t = clamp(age * 1.7 - i * .12)
        orb(context, x + (effect.origin - x) * t, y - Math.sin(t * Math.PI) * 44 + i % 2 * 11, 8 + i % 3 * 3, '#f8ffbf', '#71e568')
      }
    }
    if (effect.type === 'ground' || effect.type === 'rock') {
      context.strokeStyle = effect.type === 'ground' ? '#bd8768' : '#a6a3b6'
      for (let i = 0; i < 4; i++) {
        const sign = i % 2 ? -1 : 1
        context.beginPath()
        context.moveTo(x, y + 39)
        for (let n = 1; n <= 5; n++) context.lineTo(x + sign * n * (age + .2) * (14 + i * 2), y + 39 + Math.sin(n * 3 + i) * (2 + i))
        context.stroke()
      }
    }
  } else if (!released) {
    for (let i = 0; i < 3; i++) {
      const angle = time * 12 + i * tau / 3
      const r = 18 + 16 * Math.sin(age * Math.PI)
      const px = x + Math.cos(angle) * r
      const py = y + Math.sin(angle) * r * .64
      particles.add(px, py, 9, effect.type, fade * .85, 0, angle)
    }
    arc(context, x, y, 12 + 17 * age, 7 + 13 * age, age * 5, age * 5 + Math.PI * 1.3, -.3)
  } else {
    particles.burst(x + effect.direction * 15, y, effect.type, age, .65)
  }
  context.restore()
}

export function drawSpellProjectile(context, particles, shot, y, time) {
  const { x, direction, move } = shot
  const dx = direction || 1
  const color = battleFxColor(move.type)
  const phase = time * 24 + (shot.at ?? 0) * 19
  for (let i = 0; i < 6; i++) {
    const px = x - i * 12 * dx
    const py = y + Math.sin(phase - i * 1.17) * (4 + i * 2)
    particles.add(px, py, 22 - i * 1.8, move.type, .75 - i * .09, i % 3 !== 1 ? elementTile[move.type] ?? 0 : 2, phase + i)
  }
  if (move.visual === 'dreepy') return false
  if (move.visual && !['bubbles', 'hydro'].includes(move.visual)) return false
  context.save()
  if (move.visual === 'bubbles') {
    for (let i = 4; i >= 0; i--) {
      const px = x - i * 17 * dx, py = y + Math.sin(phase - i) * (7 + i)
      const r = 10 + (i * 7 % 15)
      orb(context, px, py, r, '#f4ffffaf', '#75cfff')
      context.strokeStyle = i % 2 ? '#c4faff' : '#b1b0ff'
      context.lineWidth = 2
      arc(context, px, py, r * .91, r, .2, 5.65)
      context.strokeStyle = '#fffefa'
      arc(context, px, py, r * .64, r * .69, 3.5, 4.45)
    }
  } else if (move.visual === 'hydro') {
    for (let i = 10; i >= 0; i--) {
      const px = x - i * 10 * dx, py = y + Math.sin(phase - i * .8) * (5 + i * 1.8)
      orb(context, px, py, 15 + (10 - i) * 1.6, '#e5ffff', i % 2 ? '#5dcaff' : '#4d8cff')
      if (i % 2) particles.add(px, py - 14, 17, 'water', .58, 3, phase - i)
    }
  } else if (move.type === 'electric') {
    for (const [w, ink] of [[14, '#427bfa80'], [6, '#7fbeff'], [2, '#e9faff']]) {
      context.strokeStyle = ink
      context.lineWidth = w
      context.beginPath()
      context.moveTo(x - 76 * dx, y)
      for (let n = 1; n < 8; n++) context.lineTo(x - (76 - n * 11) * dx, y + Math.sin(phase + n * 2.7) * 12)
      context.stroke()
    }
  } else if (move.type === 'fire') {
    for (let i = 6; i >= 0; i--) {
      const px = x - i * 12 * dx
      const py = y + Math.sin(phase - i) * (5 + i)
      particles.add(px, py - 11 - i * 2, 30 - i, i % 3 ? 'fire' : 'steel', .9 - i * .095, i % 3 ? 6 : 2, dx * -1.15)
      orb(context, px, py, 22 - i * 1.8, '#fff3b1', '#fa6632')
    }
  } else {
    const radius = move.type === 'normal' ? 16 : 21
    for (let i = 3; i >= 0; i--) orb(context, x - i * 13 * dx, y + Math.sin(phase - i) * i * 3, radius - i * 2, '#fffdf4', color)
    context.strokeStyle = color
    context.lineWidth = 2.2
    arc(context, x, y, radius * 1.1, radius * .58, phase, phase + Math.PI, -.36)
  }
  context.restore()
  return true
}

export function drawImpact(context, particles, x, y, hit, time) {
  const age = Math.max(0, time - hit.at)
  if (age > .53) return
  const phase = age / .53
  const type = hit.bossImpact ? 'fairy' : hit.type
  const strength = hit.critical || hit.visual === 'dreepy' ? 1.38 : hit.superEffective ? 1.17 : .92
  const radius = strength * (10 + 82 * (1 - (1 - phase) ** 3))
  particles.burst(x, y, type, phase, strength, true)
  context.save()
  context.globalAlpha = (1 - phase) ** 2
  context.strokeStyle = battleFxColor(type)
  context.lineWidth = 4 * strength
  arc(context, x, y, radius, radius * .69, 0, tau, .18)
  context.strokeStyle = '#fff8dd'
  context.lineWidth = 1.8
  arc(context, x, y, radius * .78, radius * .49, .1, 4.8, -.27)
  context.restore()
}

export function drawPiercingBeam(context, particles, effect, y, time) {
  const age = clamp((time - effect.at) / (effect.expires - effect.at))
  const length = (effect.reach || 400) * Math.min(1, age * 7)
  const end = effect.x + length * effect.direction
  const color = battleFxColor(effect.type)
  const fade = 1 - age
  context.save()
  context.lineCap = 'round'
  for (const [thickness, ink, opacity] of [[32, color, .22], [14, color, .66], [4, '#fff9e9', .95]]) {
    context.globalAlpha = opacity * fade
    context.lineWidth = thickness * Math.max(.18, fade)
    context.strokeStyle = ink
    context.beginPath()
    context.moveTo(effect.x, y)
    context.lineTo(end, y)
    context.stroke()
  }
  for (let index = 0; index < 7; index++) {
    const t = (age * 4 + index / 7) % 1
    particles.add(effect.x + (end - effect.x) * t, y + Math.sin(index + age * 8) * 17, 18, effect.type, fade, 0, age * 5)
  }
  context.restore()
}

export function drawStageAura(context, particles, fighter, x, y, time) {
  const values = Object.values(fighter.stages ?? {})
  const types = []
  if (fighter.buffed || values.some(value => value > 0)) types.push(['grass', '#9effa4', 1])
  if (fighter.slowed || fighter.intimidated || values.some(value => value < 0)) types.push(['fire', '#ff817d', -1])
  context.save()
  for (const [type, color, direction] of types) {
    const r = 37 + (direction < 0 ? 9 : 0)
    context.globalAlpha = .65
    context.strokeStyle = color
    context.lineWidth = 3
    arc(context, x, y - 4, r, 10, direction * time * 3.5, direction * time * 3.5 + 3.8)
    const texture = hudTile('aura', color)
    if (texture) {
      const span = Math.sin(time * 3 * direction) * 7
      context.drawImage(texture, x - r * 1.45 + span, y - 21, r * 2.9, 33)
    }
    for (let i = 0; i < 3; i++) {
      const theta = time * 5 * direction + i * tau / 3
      particles.add(x + Math.cos(theta) * r, y - 5 + Math.sin(theta) * 9, 12, type, .67, direction > 0 ? 15 : 6, theta)
    }
  }
  context.restore()
}

function drawStatIcon(context, icon, x, y) {
  const texture = hudTile(icon, context.fillStyle)
  if (texture) {
    context.drawImage(texture, x - 8, y - 8, 16, 16)
    return
  }
  context.save()
  context.translate(x, y)
  context.lineWidth = 2
  context.lineCap = 'round'
  context.beginPath()
  if (icon === 'shield' || icon === 'ward') {
    context.moveTo(-5, -5); context.lineTo(5, -5); context.lineTo(4, 2); context.lineTo(0, 6); context.lineTo(-4, 2); context.closePath()
  } else if (icon === 'boot') {
    context.moveTo(-3, -5); context.lineTo(2, -5); context.lineTo(2, 1); context.lineTo(6, 2); context.lineTo(6, 5); context.lineTo(-4, 5); context.closePath()
  } else {
    context.moveTo(-5, 5); context.lineTo(4, -5)
    if (icon === 'sword') { context.moveTo(-5, 0); context.lineTo(0, 5); context.moveTo(0, -4); context.lineTo(5, -5); context.lineTo(4, 0) }
    else { context.moveTo(2, -5); context.lineTo(4, -7); context.lineTo(7, -4); context.lineTo(5, -2); context.closePath() }
  }
  context.stroke()
  if (icon === 'ward') {
    context.fillRect(-1, -3, 2, 6)
    context.fillRect(-3, -1, 6, 2)
  }
  context.restore()
}

export function drawStageMarks(context, stages, x, y, intimidated) {
  const signed = Object.entries(stages ?? {}).filter(([stat, value]) => stageIcons[stat] && value)
  if (intimidated) signed.unshift(['attack', -1])
  if (!signed.length) return
  const width = signed.reduce((sum, [, value]) => sum + 22 + 13 * Math.abs(value), 0) - 5
  let left = x - width / 2
  context.save()
  for (const [stat, value] of signed) {
    const w = 17 + 13 * Math.abs(value)
    context.fillStyle = '#101527e8'
    context.beginPath()
    context.roundRect(left, y - 10, w, 20, 6)
    context.fill()
    context.fillStyle = context.strokeStyle = value > 0 ? '#aaff99' : '#ff9399'
    for (let index = 0; index < Math.abs(value); index++) drawStatIcon(context, stageIcons[stat], left + 9 + index * 13, y)
    context.lineWidth = 1.6
    const cx = left + w - 8
    const sign = Math.sign(value)
    context.beginPath()
    context.moveTo(cx - 3, y + sign)
    context.lineTo(cx, y - 3 * sign)
    context.lineTo(cx + 3, y + sign)
    context.moveTo(cx, y - 3 * sign)
    context.lineTo(cx, y + 4 * sign)
    context.stroke()
    left += w + 5
  }
  context.restore()
}

export function drawBarrier(context, particles, x, y, top, time, physical, special) {
  const radius = Math.max(33, (y - top) * .53)
  const cy = y - radius * .73
  const screens = []
  if (physical) screens.push(['water', '#90e7ff', 1])
  if (special) screens.push(['psychic', '#d2adff', -1])
  context.save()
  for (const [type, color, direction] of screens) {
    const r = radius + (direction < 0 && physical ? 7 : 0)
    const dome = context.createRadialGradient(x, cy, r * .22, x, cy, r * 1.17)
    dome.addColorStop(0, color + '05')
    dome.addColorStop(.72, color + '18')
    dome.addColorStop(1, color + '66')
    context.fillStyle = dome
    context.beginPath()
    context.ellipse(x, cy, r, r * 1.16, 0, 0, tau)
    context.fill()
    context.strokeStyle = color
    context.globalAlpha = .5
    context.lineWidth = 2.7
    arc(context, x, cy, r, r * 1.16)
    context.globalAlpha = .76
    for (let i = 0; i < 2; i++) {
      const theta = direction * time * 3.2 + i * Math.PI
      arc(context, x, cy, r * .96, r * .35, theta, theta + 1.37, Math.sin(theta) * .72)
      particles.add(x + Math.cos(theta) * r, cy + Math.sin(theta) * r * .88, 11, type, .85, 0, theta)
    }
  }
  context.restore()
}

export function drawStatusParticles(particles, status, x, y, time) {
  const type = statusType[status]
  if (!type) return
  for (let i = 0; i < 5; i++) {
    const age = (time * (status === 'paralysis' ? 1.85 : .97) + i * .213) % 1
    const theta = time * 3 + i * goldenAngle
    const px = x + Math.cos(theta) * (18 + age * 17)
    const py = y - (status === 'freeze' ? Math.sin(theta) * 32 : age * 52)
    particles.add(px, py, 9 + (i % 3) * 4, type, Math.sin(age * Math.PI) * .81, i % 2 ? elementTile[type] : 2, theta)
  }
}
