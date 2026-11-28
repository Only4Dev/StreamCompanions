import { battleFxColor, elementTile } from './battle-fx.js'

const tau = Math.PI * 2
const limit = v => Math.max(0, Math.min(1, v))
const noise = i => (Math.sin(i * 73.315) * 1911.713) % 1
const drift = i => Math.abs(noise(i))

function path(ctx, points) {
  ctx.beginPath()
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
}

function fill(ctx, points, color) {
  path(ctx, points)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function glow(ctx, x, y, r, color, alpha = .6) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, color + '00')
  ctx.globalAlpha *= alpha
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.globalAlpha /= alpha
}

function cloudBed(ctx, fx, width, y, time, type, opacity) {
  for (let i = 0; i < 12; i++) {
    const x = (i + .5) * width / 12 + Math.sin(time * .75 + i) * 33
    const dy = Math.sin(i * 7.2) * 25
    glow(ctx, x, y + dy, 142, '#222a49', opacity * .87)
    fx.add(x, y + dy, 110, type, opacity * .37, 2, time * .17 + i)
  }
}

export function drawRainLayers(ctx, width, floor, time) {
  ctx.save()
  for (let layer = 0; layer < 2; layer++) {
    const span = floor + 65
    ctx.lineWidth = 1.4 + layer
    ctx.strokeStyle = layer ? '#c6edff8a' : '#5da5e837'
    ctx.beginPath()
    for (let i = 0; i < 42; i++) {
      const x = (drift(i * 19 + layer) * width + time * (40 + layer * 30)) % width
      const y = (drift(i * 5 + layer) * span + time * (235 + layer * 182)) % span - 42
      ctx.moveTo(x, y)
      ctx.lineTo(x + 8 + layer * 8, y + 16 + layer * 13)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function wave(ctx, fx, e, width, floor, t, time) {
  fx.wave(t, floor, time, e.pulse ?? 0)
  cloudBed(ctx, fx, width, Math.max(34, floor - 300), time, 'water', .77)
  drawRainLayers(ctx, width, floor, time)
  // Project every cross-section separately so the crest grows as it approaches the foreground.
  const front = 1 / (2.95 - t * 2.26)
  const height = Math.min(floor * .66, 145 * front + (e.pulse ?? 0) * 17)
  const base = floor - 80 + t * 140
  const crest = []
  for (let i = 0; i <= 54; i++) {
    const u = i / 54
    const x = width * u
    const y = base - height * (.67 + .19 * Math.sin(u * 11 + time * 3) + .14 * Math.sin(u * 23 - t * 6))
    crest.push([x + Math.sin(u * 17) * 16 * front, y])
  }
  const water = ctx.createLinearGradient(0, base - height, 0, base + 30)
  water.addColorStop(0, '#a5f4ff')
  water.addColorStop(.21, '#35c3f3')
  water.addColorStop(.61, '#197bdd')
  water.addColorStop(1, '#123c8e30')
  fill(ctx, [...crest, [width, base + 34], [0, base + 34]], water)
  for (let band = 0; band < 5; band++) {
    path(ctx, crest.map(([x, y], i) => [x + band * 7, y + band * (6 + 6 * front) + Math.sin(i * .49 + t * 9) * 6]))
    ctx.strokeStyle = ['#ecffff', '#9ce9ffb0', '#41ddffd9', '#86d7ff64', '#d0f6ff80'][band]
    ctx.lineWidth = (band ? 4 : 9) * front
    ctx.stroke()
  }
  for (let i = 0; i < 18; i++) {
    const [x, y] = crest[i * 3]
    fx.add(x, y - 7 - 15 * drift(i), (23 + 22 * drift(i + 2)) * front, 'water', .86, 7, i + t * 4)
  }
}

function fork(ctx, start, end, seed, hue, breadth = 1) {
  const line = [start]
  for (let i = 1; i < 11; i++) {
    const t = i / 11
    line.push([start[0] + (end[0] - start[0]) * t + noise(i + seed) * (19 + breadth * 16),
      start[1] + (end[1] - start[1]) * t + noise(i * 2 + seed) * 15])
  }
  line.push(end)
  for (const [w, color] of [[17, hue + '45'], [7, hue], [2.4, '#f6f9ff']]) {
    path(ctx, line)
    ctx.strokeStyle = color
    ctx.lineWidth = w * breadth
    ctx.stroke()
  }
}

function storm(ctx, fx, e, width, floor, t, time) {
  const top = Math.max(40, floor - 295)
  cloudBed(ctx, fx, width, top, time, 'electric', .88)
  const targets = e.positions.length ? e.positions : [e.x]
  for (const [i, x] of targets.slice(0, 8).entries()) {
    const hue = i % 2 || e.pulse ? '#65b9ff' : '#ffe46c'
    if (!e.pulse) {
      fork(ctx, [x + 37, top], [x, floor - 22], i + Math.floor(t * 16), hue)
      fork(ctx, [x + 12, top + 80], [x + 70, floor - 80], i + 12, hue, .53)
    } else {
      for (const side of [-1, 1]) fork(ctx, [x, floor - 22], [x + side * width * .43 * t, floor - 30], i + side, hue, .67)
    }
    fx.burst(x, floor - 27, 'electric', t, 1.25, true)
  }
}

function fireSea(ctx, fx, e, width, floor, t, time) {
  const head = e.direction > 0 ? t * width : width - t * width
  for (let i = 0; i < 16; i++) {
    const x = i * width / 15
    const heat = .43 + .57 * Math.sin(i * 6 + time * 14) ** 2
    glow(ctx, x, floor - 6, 84 * heat, '#ff4d26', .52)
    fx.add(x, floor - 28 * heat, 66 * heat, 'fire', .72, 6, Math.sin(i * 3 + time * 8) * .35)
    fx.add(x + 20, floor - 79 - 25 * heat, 58, 'steel', .19, 2, t * 3)
  }
  const cy = floor - 92
  for (const [dx, dy] of [[-35, -72], [38, -69], [-68, -18], [68, -25], [-50, 49], [56, 54]]) {
    const a = [head + Math.sin(time * 22) * 5, cy]
    const b = [head + dx, cy + dy]
    for (const [w, color] of [[32, '#ff662a85'], [15, '#ff990f'], [6, '#fff09d']]) {
      ctx.strokeStyle = color; ctx.lineWidth = w
      ctx.beginPath(); ctx.moveTo(...a)
      ctx.quadraticCurveTo((a[0] + b[0]) / 2 + Math.sin(time * 11 + dx) * 15, (a[1] + b[1]) / 2, ...b)
      ctx.stroke()
    }
    fx.add(b[0], b[1], 51, 'fire', .95, 6, Math.atan2(dy, dx) + Math.PI / 2)
  }
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath()
    ctx.moveTo(head + i * 31, floor + 18)
    for (let n = 1; n < 16; n++) ctx.lineTo(head + i * 31 + Math.sin(n * .7 + time * 14) * 9, floor - n * 14)
    ctx.lineWidth = 2.4
    ctx.strokeStyle = '#ffe4a97d'
    ctx.stroke()
  }
}

function stone(ctx, x, y, r, gray, seed) {
  const corners = Array.from({ length: 7 }, (_, i) => {
    const angle = i / 7 * tau + seed
    const size = r * (.73 + drift(i + seed) * .36)
    return [x + Math.cos(angle) * size, y + Math.sin(angle) * size]
  })
  for (let i = 0; i < corners.length; i++) {
    const colors = gray ? ['#464654', '#626376', '#85849a', '#aaa7b7'] : ['#5c3934', '#8b5644', '#af7d59', '#d8ad78']
    fill(ctx, [[x + r * .23, y - r * .24], corners[i], corners[(i + 1) % corners.length]], colors[Math.min(3, i % 4)])
  }
}

function ruin(ctx, fx, e, width, floor, t, time) {
  const isGround = e.type === 'ground'
  if (isGround) {
    for (const [stroke, ink] of [[17, '#2c1a22'], [5, '#e89955'], [1.7, '#ffdda0']]) {
      ctx.strokeStyle = ink; ctx.lineWidth = stroke
      path(ctx, Array.from({ length: 42 }, (_, i) => [i * width / 41, floor + 11 + noise(i * 3) * (9 + t * 16)]))
      ctx.stroke()
    }
  }
  const anchors = isGround ? Array.from({ length: 9 }, (_, i) => width * (i + .5) / 9) : e.positions.slice(0, 12)
  for (const [i, x] of anchors.entries()) {
    const fall = limit(t / (e.type === 'dragon' ? .64 : .58))
    const y = isGround ? floor - Math.sin(t * Math.PI) * (42 + 40 * drift(i)) : floor - (1 - fall ** 2) * Math.min(286, floor - 31)
    const px = x + (isGround ? 1 : 1 - fall) * noise(i + e.pulse) * 90
    const r = e.type === 'dragon' ? 36 + 18 * drift(i * 3) : 17 + 18 * drift(i * 4)
    if (isGround || t < .74) {
      stone(ctx, px, y - r * .45, r, e.type !== 'ground', t * 3 + i)
      if (e.type === 'dragon') {
        glow(ctx, px, y - 18, r * 2.15, '#7169ff', .57)
        for (let j = 0; j < 4; j++) fx.add(px + (j - 2) * 12, y - j * 19, r * 1.15, 'dragon', .94 - j * .14, j % 2 ? 8 : 2, t * 5 + j)
      }
    }
    const impact = isGround ? t : (t - (e.type === 'dragon' ? .58 : .49)) / .51
    if (impact >= 0) fx.burst(x, floor - 14, e.type, impact, e.type === 'dragon' ? 1.62 : 1.27, true)
  }
}

function graveyard(ctx, fx, e, width, floor, t, time) {
  cloudBed(ctx, fx, width, floor - 46, time, 'ghost', .72)
  for (let i = 0; i < 11; i++) {
    const x = (i + .37) * width / 11
    const y = floor - 7 + Math.sin(i * 8) * 18
    const h = 30 + drift(i) * 31
    ctx.beginPath(); ctx.roundRect(x - 17, y - h, 34, h, [12, 12, 3, 3])
    ctx.fillStyle = i % 2 ? '#32264f' : '#44335b'; ctx.fill()
    ctx.strokeStyle = '#a48fcd'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#a48fcd'; ctx.fillRect(x - 8, y - h * .61, 16, 2); ctx.fillRect(x - 1, y - h * .75, 2, 19)
    fx.add(x + Math.sin(time * 3 + i) * 33, y - h - 21 + Math.sin(time * 4 + i) * 12, 41, 'ghost', .68, 11, Math.sin(time + i) * .4)
  }
  for (const x of e.positions.slice(0, 10)) glow(ctx, x, floor - 42, 73, '#733dea', .57)
}

function metal(ctx, fx, e, width, floor, t) {
  const y = floor - 35 - (1 - limit(t * 1.64) ** 3) * Math.min(floor - 45, e.pulse ? 125 : 248)
  const girder = ctx.createLinearGradient(0, y - 23, 0, y + 25)
  for (const [at, color] of [[0, '#dbeaf9'], [.23, '#6e8ba8'], [.36, '#33445d'], [.75, '#526c89'], [1, '#acc9df']]) girder.addColorStop(at, color)
  ctx.fillStyle = girder; ctx.fillRect(0, y - 22, width, 44)
  ctx.fillStyle = '#28354a'; ctx.fillRect(0, y - 9, width, 4)
  ctx.fillStyle = '#a6c5de'; ctx.fillRect(0, y + 14, width, 3)
  for (let x = 18; x < width; x += 71) {
    ctx.fillStyle = '#dcefff'; ctx.fillRect(x, y - 6, 6, 6)
    ctx.fillStyle = '#243750'; ctx.fillRect(x, y + 1, 6, 4)
    if (t > .49) {
      fx.add(x, floor - 13 - (t - .49) * 73, 42 + t * 23, 'steel', (1 - t) * .83, 2, x)
      if (x % 3 === 0) fx.add(x + 9, floor - 19, 19, 'steel', 1 - t, 10, x + t)
    }
  }
}

function trash(ctx, fx, e, floor, t) {
  const x = e.origin + (e.x - e.origin) * t
  const y = e.falling ? floor - 7 - (1 - t ** 2) * 102 : floor - 37 - Math.sin(t * Math.PI) * 158
  ctx.save(); ctx.translate(x, y); ctx.rotate((e.falling ? .3 : 5) * t)
  const steel = ctx.createLinearGradient(-27, 0, 27, 0)
  steel.addColorStop(0, '#304336'); steel.addColorStop(.42, '#a2b4a2'); steel.addColorStop(1, '#455847')
  fill(ctx, [[-29, -28], [29, -28], [21, 30], [-20, 30]], steel)
  ctx.strokeStyle = '#d0dccc'; ctx.lineWidth = 2
  for (let n = -20; n <= 20; n += 8) { path(ctx, [[n, -24], [n * .73, 24]]); ctx.stroke() }
  ctx.fillStyle = '#83998b'; ctx.beginPath(); ctx.ellipse(0, -28, 34, 8, 0, 0, tau); ctx.fill()
  ctx.strokeStyle = '#eef0d5'; ctx.strokeRect(-7, -39, 14, 7)
  ctx.restore()
  for (let i = 0; i < 9; i++) fx.add(x + noise(i) * 76, y + noise(i * 3) * 61, 21, 'poison', .72, i % 2 ? 18 : 2, t + i)
}

function tornado(ctx, fx, e, width, floor, t, time) {
  const center = e.positions.length ? e.positions.reduce((a, x) => a + x, 0) / e.positions.length : width / 2
  for (let i = 0; i < 21; i++) {
    const u = i / 20, angle = time * 18 - i * .63
    const x = center + Math.sin(angle) * (34 + u * 94)
    const y = floor - 14 - u * Math.min(floor - 40, 272)
    ctx.beginPath(); ctx.ellipse(x, y, 22 + u * 88, 9 + u * 14, Math.sin(angle) * .15, angle, angle + Math.PI * 1.44)
    ctx.strokeStyle = i % 2 ? '#e4fffde3' : '#84dcef8a'; ctx.lineWidth = 3 + u * 5; ctx.stroke()
    fx.add(x, y, 34 + u * 18, 'flying', .58, 17, angle)
  }
}

export function drawElementalUltimate(ctx, fx, effect, width, floor, time) {
  const t = limit((time - effect.at) / (effect.expires - effect.at))
  const type = effect.type
  const targets = effect.positions.length ? effect.positions : [effect.x]
  const color = battleFxColor(type)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.globalAlpha = 1 - t ** 3
  let handled = true
  switch (type) {
    case 'normal': {
      const y = floor - 59, end = effect.direction > 0 ? width : 0
      for (const [w, ink] of [[89, '#d0d1df40'], [47, '#afb4c3'], [28, '#f5f6fa'], [11, '#ffffff']]) {
        path(ctx, [[effect.origin, y], [end, y]])
        ctx.lineWidth = w * (1 - t * .53); ctx.strokeStyle = ink; ctx.stroke()
      }
      for (let i = 0; i < 18; i++) {
        const x = effect.origin + (end - effect.origin) * (i + .5) / 18
        fx.add(x, y + noise(i) * 49, 23 + drift(i) * 24, 'normal', 1 - t, i % 3 ? 4 : 2, i + t * 3)
      }
      break
    }
    case 'fighting':
      for (let i = 0; i < 7; i++) {
        const a = i * tau / 7 + effect.pulse
        fx.add(effect.x + Math.cos(a) * (115 - t * 81), floor - 48 + Math.sin(a) * (69 - t * 44),
          34 + t * 25, 'fighting', .97, 5, a + 1.57)
      }
      fx.burst(effect.x, floor - 44, 'fighting', t, 1.4, true)
      break
    case 'ghost': graveyard(ctx, fx, effect, width, floor, t, time); break
    case 'fire': fireSea(ctx, fx, effect, width, floor, t, time); break
    case 'water': wave(ctx, fx, effect, width, floor, t, time); break
    case 'electric': storm(ctx, fx, effect, width, floor, t, time); break
    case 'ground': case 'rock': case 'dragon': ruin(ctx, fx, effect, width, floor, t, time); break
    case 'steel': metal(ctx, fx, effect, width, floor, t); break
    case 'poison': trash(ctx, fx, effect, floor, t); break
    case 'flying': tornado(ctx, fx, effect, width, floor, t, time); break
    default:
      for (const [i, x] of targets.slice(0, 12).entries()) {
        const y = floor - 45 + Math.sin(i + t * 9) * 21
        const spellX = type === 'dark' ? effect.origin + (x - effect.origin) * t : x
        glow(ctx, spellX, y, 70 + drift(i) * 41, color, .54)
        fx.add(spellX, y, 71, type, .64, 2, i + t * 3)
        for (let j = 0; j < 6; j++) {
          const angle = time * 6 + j * tau / 6
          fx.add(spellX + Math.cos(angle) * (48 + t * 49), y + Math.sin(angle) * (24 + t * 36), 20 + j * 2,
            type, .94 - .35 * t, elementTile[type], angle)
        }
      }
      handled = !['grass', 'bug', 'psychic'].includes(type)
  }
  ctx.restore()
  return handled
}

export function drawFrozenShell(ctx, fx, x, y, top, time) {
  const h = Math.max(42, (y - top) * .88), w = Math.max(27, Math.min(62, h * .57))
  const ice = ctx.createLinearGradient(x - w, top, x + w, y)
  ice.addColorStop(0, '#d6faff96'); ice.addColorStop(.51, '#9fddff28'); ice.addColorStop(1, '#4eb6efb2')
  ctx.save()
  fill(ctx, [[x - w, y - 4], [x - w * .77, y - h], [x + w * .27, y - h - 6], [x + w, y - h * .55], [x + w * .82, y + 4]], ice)
  ctx.strokeStyle = '#defaffb5'; ctx.lineWidth = 2.5; ctx.stroke()
  path(ctx, [[x - w, y - 4], [x + w * .27, y - h - 6], [x + w * .26, y + 2]]); ctx.stroke()
  ctx.restore()
  fx.add(x + Math.sin(time * 4) * w, y - h * .58, 19, 'ice', .81, 19, time)
}

export function drawWarp(ctx, fx, effect, y, time) {
  const t = limit((time - effect.at) / (effect.expires - effect.at))
  ctx.save()
  for (const [x, phase] of [[effect.origin, t], [effect.x, 1 - t]]) {
    const rim = 13 + 53 * phase
    glow(ctx, x, y, rim * 1.5, '#d877ff', .58 * (1 - t * .8))
    ctx.strokeStyle = '#efd2ff'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.ellipse(x, y, rim * .51, rim, phase * .52, 0, tau); ctx.stroke()
    fx.burst(x, y, 'psychic', t, .94, true)
  }
  ctx.restore()
}
