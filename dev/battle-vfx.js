const tau = Math.PI * 2

function polygon(ctx, points, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(...points[0])
  for (const point of points.slice(1)) ctx.lineTo(...point)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function bolt(ctx, x, y, radius, angle) {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const phase = angle + i * .21
    const r = radius + (i % 2 ? 7 : -5)
    const px = x + Math.cos(phase) * r
    const py = y + Math.sin(phase) * r * .75
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
}

const silhouettes = {
  grass: { shape: [[-15, 7], [-12, -5], [-3, -10], [17, -9], [8, 4], [-2, 10]], fill: '#60c34c', stroke: '#214b39' },
  fire: { shape: [[-25, 1], [-15, -5], [-7, -13], [5, -10], [13, 0], [6, 11], [-8, 12]], fill: '#ff8e43', stroke: '#c04830' },
  water: { shape: [[-23, 2], [-12, -7], [1, -9], [11, -5], [14, 1], [5, 8], [-9, 7]], fill: '#94eafa', stroke: '#438ec5' },
  ice: { shape: [[-14, -5], [3, -10], [15, 0], [2, 8]], fill: '#a5e0ff', stroke: '#4b9cc7' },
  dragon: { shape: [[-20, 8], [-8, -7], [-2, 1], [10, -11], [14, 1], [1, 10]], fill: '#ffad79', stroke: '#9b4e62' }
}

export function drawProjectile(ctx, shot, y, time) {
  const { move, x, direction } = shot
  const phase = time * 22 + x * .015
  const type = move.effect === 'sleep' ? 'sleep' : move.type
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(direction * 1.35, 1.35)
  ctx.shadowColor = ({ fire:'#ff734b', water:'#55d8ff', psychic:'#ff8cf1', grass:'#8cff75', electric:'#ffe16e' })[type] ?? '#cacaff'
  ctx.shadowBlur = 15
  ctx.lineCap = 'round'
  const silhouette = silhouettes[type]
  if (move.visual === 'dreepy') {
    polygon(ctx, [[-34, 4], [-18, -3], [-10, -2], [1, -11], [17, -8], [10, -1], [21, 3], [5, 9], [-8, 5]], '#7fe0a5', '#254f52')
    polygon(ctx, [[-10, -4], [-15, -13], [2, -8], [0, -2]], '#e87697', '#864569')
    polygon(ctx, [[9, -5], [14, -4], [10, -1]], '#ffeba1', '#f3da89')
  } else if (move.visual === 'swift') {
    for (let i = 2; i >= 0; i--) {
      const points = Array.from({ length: 10 }, (_, j) => {
        const angle = j * tau / 10 + phase * .17
        const radius = j % 2 ? 4 : 10
        return [Math.cos(angle) * radius - i * 16, Math.sin(angle) * radius + Math.sin(phase + i) * 8]
      })
      polygon(ctx, points, '#ffe48a', '#fff8ce')
    }
  } else if (move.visual === 'sting') {
    polygon(ctx, [[-18, 2], [-13, -7], [-6, -1], [15, 0], [-5, 4], [-11, 7]], '#a63580', '#f8addf')
  } else if (type === 'rock' || type === 'ground') {
    ctx.rotate(phase * .12)
    polygon(ctx, [[-16, 1], [-12, -9], [1, -13], [15, -4], [11, 9], [-4, 11]], '#a9835b', '#eccba2')
    polygon(ctx, [[-11, -7], [0, -12], [8, -5], [-2, 1]], '#c9a07c')
  } else if (move.visual === 'swarm') {
    for (let i = 0; i < 7; i++) {
      const px = -i * 12
      const py = Math.sin(phase + i * 2.3) * (11 + i * 2)
      ctx.fillStyle = '#fff1c4'
      ctx.fillRect(px - 3, py - 5 - Math.sin(phase * 3 + i) * 4, 7, 5)
      ctx.fillStyle = '#362822'
      ctx.fillRect(px - 5, py - 3, 11, 7)
      ctx.fillStyle = '#ffc94f'
      ctx.fillRect(px - 3, py - 2, 3, 5)
      ctx.fillRect(px + 2, py - 2, 3, 5)
    }
  } else if (move.visual === 'bullet') {
    polygon(ctx, [[-10, 1], [-5, -6], [7, -4], [11, 1], [3, 6], [-6, 5]], '#d8a358', '#59723a')
    ctx.fillStyle = '#f9ed9c'
    ctx.fillRect(1, -3, 5, 2)
  } else if (move.visual === 'hydro') {
    const length = Math.min(300, 35 + Math.abs(x - shot.origin))
    for (const [width, color] of [[32, '#286ba9'], [24, '#52bbef'], [11, '#d4f8ff']]) {
      const edge = side => Array.from({ length: 11 }, (_, i) => {
        const t = i / 10
        return [-length * t, side * width * Math.sin(Math.PI * (.17 + .83 * t)) +
          Math.sin(phase + i * 2.1 + side) * (3 + 4 * t)]
      })
      polygon(ctx, [...edge(-1), ...edge(1).reverse()], color)
    }
    for (let i = 0; i < 28; i++) {
      const t = (time * 4 + i * .13) % 1
      const py = Math.sin(i * 2.4 + phase) * (14 + t * 29)
      ctx.fillStyle = i % 3 ? '#9ae7ff' : '#f5ffff'
      ctx.fillRect(-t * length, py, 4 + (i % 5) * 3, 2 + i % 4)
    }
  } else if (move.visual === 'bubbles') {
    for (let i = 12; i >= 0; i--) {
      const r = 5 + i % 5 * 2
      ctx.beginPath()
      ctx.arc(-i * 10, Math.sin(phase + i * 1.8) * (9 + i * 1.2), r, 0, tau)
      ctx.fillStyle = '#75bce96e'
      ctx.strokeStyle = i % 2 ? '#96e7fb' : '#e0ffff'
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()
    }
  } else if (move.visual === 'fireblast') {
    flameGlyph(ctx, phase, 1)
  } else if (silhouette) {
    for (let i = 2; i >= 0; i--) {
      ctx.save()
      ctx.translate(-i * 20, Math.sin(phase - i * 1.6) * 8)
      ctx.rotate(Math.sin(phase + i) * (type === 'grass' ? .65 : .22))
      ctx.scale(1 - i * .13, 1 - i * .13)
      ctx.globalAlpha = 1 - i * .22
      ctx.lineWidth = 2
      polygon(ctx, silhouette.shape, silhouette.fill, silhouette.stroke)
      ctx.strokeStyle = type === 'grass' ? '#dcff99' : '#fff4d4'
      ctx.beginPath()
      ctx.moveTo(-13, type === 'grass' ? 6 : 0)
      ctx.lineTo(10, -6)
      ctx.stroke()
      ctx.restore()
    }
  } else if (move.visual === 'aura') {
    for (let i = 3; i >= 0; i--) {
      ctx.beginPath()
      ctx.arc(-i * 14, Math.sin(phase - i) * 5, 14 - i * 3, 0, tau)
      ctx.fillStyle = ['#f9ffff', '#71dbff', '#6094d4', '#4766ac'][i]
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#65caf7'
      ctx.stroke()
    }
  } else if (type === 'electric') {
    ctx.beginPath()
    ctx.moveTo(-58, 5)
    for (let i = 0; i < 7; i++) ctx.lineTo(-49 + i * 10, (i % 2 ? 7 : -8) + Math.sin(phase + i) * 4)
    ctx.strokeStyle = '#df9d2e'
    ctx.lineWidth = 9
    ctx.stroke()
    ctx.strokeStyle = '#fff3a1'
    ctx.lineWidth = 4
    ctx.stroke()
  } else {
    const colors = type === 'flying' ? ['#f7f1ca', '#b9dfde', '#8bbbc3'] :
      type === 'sleep' ? ['#f6edb4', '#c1df7e', '#8eaf5c'] :
      type === 'psychic' ? ['#fff0cf', '#ed8bb7', '#d467a9'] : ['#eee4ff', '#aa7abb', '#784a99']
    const orb = type === 'ghost' || type === 'poison'
    for (let i = 2; i >= 0; i--) {
      ctx.strokeStyle = colors[i]
      ctx.lineWidth = i ? 3 : 4
      ctx.beginPath()
      ctx.ellipse(-i * 15, Math.sin(phase - i) * 5, 10 + i * 3, 17 - i * 3,
        -.2, orb ? 0 : phase + i, orb ? tau : phase + i + Math.PI * 1.4)
      if (orb) {
        ctx.fillStyle = type === 'poison' ? '#76366f' : '#35234f'
        ctx.fill()
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function drawStatus(ctx, kind, x, y, time, width = 48, height = 55) {
  ctx.save()
  ctx.translate(x, y)
  if (kind === 'freeze') {
    const w = width
    const h = height
    ctx.lineWidth = 2
    polygon(ctx, [[-w, -h * .65], [-w * .4, -h], [w * .88, -h * .85], [w, -h * .36],
      [w * .74, h * .62], [-w * .75, h * .62]], '#7adaff3b', '#9ff3ff')
    polygon(ctx, [[-w, -h * .65], [-w * .4, -h], [w * .88, -h * .85], [w * .43, -h * .51]], '#c7fcff88')
    polygon(ctx, [[w * .43, -h * .51], [w * .88, -h * .85], [w, -h * .36], [w * .74, h * .62]], '#3d91d170')
    ctx.strokeStyle = '#ebffffa0'
    ctx.beginPath()
    ctx.moveTo(-w * .71, -h * .56)
    ctx.lineTo(-w * .65, h * .2)
    ctx.moveTo(-w * .37, h * .4)
    ctx.lineTo(w * .11, h * .46)
    ctx.stroke()
  } else if (kind === 'paralysis') {
    for (let i = 0; i < 3; i++) {
      const phase = (time * 2.3 + i / 3) % 1
      ctx.globalAlpha = Math.sin(phase * Math.PI)
      ctx.strokeStyle = '#f6cc44'
      ctx.lineWidth = 6
      bolt(ctx, 0, -6, width * (.68 + phase * .5), i * tau / 3 + time * 4)
      ctx.strokeStyle = '#fff8bd'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  } else if (kind === 'burn' || kind === 'poison') {
    for (let i = 0; i < 9; i++) {
      const phase = (time * (kind === 'burn' ? 1.65 : .8) + i * .137) % 1
      const px = Math.sin(i * 2.4 + phase * 2) * width * .78
      const py = 19 - phase * (height + 15)
      ctx.globalAlpha = Math.sin(Math.PI * phase) * .92
      if (kind === 'poison') {
        const radius = 4 + (i % 3) * 2
        ctx.fillStyle = '#8139a9'
        ctx.strokeStyle = '#efa2ff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, tau)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#ffe8ff'
        ctx.fillRect(px - radius / 2, py - radius / 2, 2, 2)
      } else {
        const bend = Math.sin(time * 17 + i) * 7
        polygon(ctx, [[px - 8, py + 7], [px - 9, py - 2], [px + bend, py - 21],
          [px + 3, py - 8], [px + 9, py + 1], [px + 5, py + 8]], '#ee542b')
        polygon(ctx, [[px - 4, py + 6], [px + bend / 2, py - 9], [px + 4, py + 2], [px + 2, py + 6]], '#ffe584')
      }
    }
  }
  ctx.restore()
}

export function drawArea(ctx, effect, floor, color, time) {
  const { x, reach, visual, kind } = effect
  const progress = Math.min(1, (time - effect.at) / (effect.expires - effect.at))
  const warning = kind === 'warning'
  ctx.save()
  if (visual === 'quake') {
    const spread = reach * (warning ? progress : 1)
    ctx.strokeStyle = warning ? '#d9a66b' : '#f6d396'
    ctx.lineWidth = warning ? 2 : 4
    ctx.globalAlpha = warning ? .55 : 1 - progress
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(x, floor + 35)
      for (let i = 1; i <= 11; i++) {
        ctx.lineTo(x + side * spread * i / 11, floor + 35 + Math.sin(i * 2.3) * (9 + i))
      }
      ctx.stroke()
    }
    for (let i = 1; i <= 15; i++) {
      const offset = Math.sin(i * 2.4) * reach
      const phase = progress * 1.5 - Math.abs(offset) / reach * .5
      if (phase < 0) continue
      const height = Math.sin(Math.min(1, phase) * Math.PI) * (14 + (i % 4) * 12)
      ctx.globalAlpha = warning ? .4 : .8
      polygon(ctx, [[x + offset - 14, floor + 34], [x + offset - 7, floor + 34 - height],
        [x + offset + 4, floor + 29 - height * .6], [x + offset + 15, floor + 34]], '#a5825b', '#e5c486')
      if (!warning && reach > 300) {
        const px = x + offset * (1 + progress * .13)
        const py = floor + 33 - Math.sin(Math.PI * progress) * (42 + i % 5 * 18)
        const size = 4 + i % 4 * 3
        polygon(ctx, [[px - size, py], [px - size / 2, py - size], [px + size, py - size / 2],
          [px + size / 2, py + size]], '#8c6f58', '#eed196')
      }
    }
  } else if (visual === 'storm' || visual === 'electric') {
    const radius = Math.max(12, reach * (warning ? progress : 1))
    const glow = ctx.createRadialGradient(x, floor - 16, 0, x, floor - 16, radius)
    glow.addColorStop(0, color + '15')
    glow.addColorStop(.8, color + '60')
    glow.addColorStop(1, color + '00')
    ctx.globalAlpha = warning ? .9 : 1 - progress
    ctx.fillStyle = glow
    ctx.fillRect(x - radius, floor - 16 - radius, radius * 2, radius * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    for (let i = 0; i < 20; i++) {
      const angle = i * 2.4 + time * 5
      const r = radius * (.45 + (i % 6) * .095)
      const px = x + Math.cos(angle) * r
      const py = floor - 16 + Math.sin(angle) * r * .54
      if (visual === 'electric') bolt(ctx, px, py, 14, angle)
      else {
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px - Math.sin(angle) * 19, py + Math.cos(angle) * 9)
        ctx.stroke()
      }
    }
  } else {
    ctx.globalAlpha = warning ? .25 : (1 - progress) * .7
    ctx.strokeStyle = color
    ctx.lineWidth = warning ? 3 : 11
    ctx.beginPath()
    ctx.ellipse(x, floor + 27, reach, 31, 0, 0, tau)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawTarget(ctx, effect, y, time) {
  const age = (time - effect.at) / (effect.expires - effect.at)
  const x = effect.x
  ctx.save()
  ctx.globalAlpha = 1 - Math.max(0, age - .32) / .68
  if (['salt', 'wrap', 'infestation', 'dig', 'fly'].includes(effect.visual)) {
    drawOngoing(ctx, effect.visual, x, y, time)
  } else if (effect.visual === 'string') {
    ctx.strokeStyle = '#faf4ce'
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.ellipse(x, y + i * 10 - 18, 37 - i * 5, 7, -.22, 0, tau)
      ctx.stroke()
    }
  } else if (effect.visual === 'seed') {
    const height = 30 * Math.min(1, age * 2.5)
    ctx.fillStyle = '#9de775'
    ctx.fillRect(x - 2, y + 20 - height, 5, height)
    polygon(ctx, [[x, y + 22 - height], [x - 17, y + 13 - height], [x - 20, y + 3 - height], [x - 7, y + 5 - height]], '#6cc75c')
    polygon(ctx, [[x, y + 21 - height], [x + 7, y + 7 - height], [x + 20, y + 4 - height], [x + 16, y + 15 - height]], '#a4e96c')
  } else if (effect.visual === 'drain' || effect.visual === 'wisp') {
    const fire = effect.visual === 'wisp'
    for (let i = 0; i < 8; i++) {
      const angle = i * tau / 8 + age * 5
      const radius = fire ? 54 - age * 44 : 12 + age * 60
      const px = x + Math.cos(angle) * radius
      const py = y + Math.sin(angle) * radius * .7
      polygon(ctx, [[px - 7, py], [px, py - 13], [px + 6, py - 2], [px + 3, py + 5]],
        fire ? '#a477ff' : '#aff395', fire ? '#f2a2ff' : '#e7ffc3')
    }
  } else if (effect.visual === 'psychic') {
    if (Number.isFinite(effect.origin)) {
      const lift = Math.min(92, Math.abs(x - effect.origin) * .26)
      ctx.shadowColor = '#ff5cec'
      ctx.shadowBlur = 24
      for (const [width, color] of [[15, '#d14ae2'], [5, '#fff1ff']]) {
        ctx.lineWidth = width
        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.moveTo(effect.origin, y)
        ctx.quadraticCurveTo((x + effect.origin) / 2, y - lift, x, y - 12)
        ctx.stroke()
      }
    }
    for (let i = 0; i < 5; i++) {
      const t = age * 1.55 - i * .13
      if (t <= 0 || t >= 1) continue
      ctx.globalAlpha = (1 - t) * .95
      ctx.strokeStyle = i % 2 ? '#ef8cd9' : '#ffe2fb'
      ctx.lineWidth = 2 + (1 - t) * 5
      ctx.beginPath()
      ctx.ellipse(x, y - 8, 5 + t * 83, 4 + t * 56, -.22, 0, tau)
      ctx.stroke()
    }
    ctx.globalAlpha = (1 - age) ** 2
    ctx.fillStyle = '#fff3ff'
    ctx.fillRect(x - 3, y - 27, 6, 39)
    ctx.fillRect(x - 20, y - 11, 40, 6)
  } else if (effect.visual === 'lightning') {
    const top = Math.max(12, y - 320)
    ctx.lineJoin = 'bevel'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(x + side * 31, top)
      for (let i = 1; i <= 11; i++) {
        ctx.lineTo(x + side * (1 - i / 11) * (i % 2 ? -16 : 32), top + (y - top) * i / 11)
      }
      ctx.strokeStyle = '#de9b24'
      ctx.lineWidth = 13
      ctx.stroke()
      ctx.strokeStyle = '#fff5a6'
      ctx.lineWidth = 5
      ctx.stroke()
    }
  } else {
    const growth = Math.sin(Math.PI * Math.min(.98, age * 1.35))
    for (let i = -3; i <= 3; i++) {
      const foot = x + i * 17
      const top = y + 20 - (85 - Math.abs(i) * 11) * growth
      polygon(ctx, [[foot - 12, y + 20], [foot + i * 7, top], [foot + 14, y + 18]], '#87c9f3', '#3f78aa')
      polygon(ctx, [[foot - 4, y + 15], [foot + i * 7, top], [foot + 5, y + 6]], '#eeffff')
    }
  }
  ctx.restore()
}

export function drawOngoing(ctx, kind, x, y, time) {
  ctx.save()
  if (kind === 'wrap') {
    ctx.strokeStyle = '#7cac57'
    ctx.lineWidth = 5
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.ellipse(x, y + i * 12 - 15, 31, 9, -.18, 0, tau)
      ctx.stroke()
    }
  } else {
    const colors = { salt: '#fff4df', infestation: '#a8c85d', dig: '#b58b61', fly: '#e5f4ff' }
    ctx.fillStyle = colors[kind] ?? '#fff'
    for (let i = 0; i < 9; i++) {
      const angle = i * tau / 9 + time * (kind === 'infestation' ? 7 : 2)
      const radius = 19 + i % 3 * 8
      ctx.fillRect(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * .65, 3 + i % 4, 3 + i % 4)
    }
  }
  ctx.restore()
}

export function drawDigMound(ctx, x, y, time) {
  ctx.save()
  ctx.fillStyle = '#765742'
  ctx.beginPath()
  ctx.ellipse(x, y + 21, 30, 12, 0, Math.PI, 0)
  ctx.fill()
  drawOngoing(ctx, 'dig', x, y + 10, time)
  ctx.restore()
}

export function drawClash(ctx, x, y, elapsed) {
  drawPunch(ctx, x, y, elapsed)
}

export function drawPoisonHazard(ctx, effect, floor, time) {
  ctx.save()
  ctx.globalAlpha = Math.min(.7, effect.expires - time)
  for (let i = 0; i < 7; i++) {
    const x = effect.x + (i - 3) * 23
    const y = floor + 31 + Math.sin(i * 3) * 4
    polygon(ctx, [[x - 12, y], [x - 2, y - 11 - i % 3 * 5], [x + 14, y + 2]], '#714aa0', '#c390e7')
  }
  ctx.restore()
}

export function drawGraveyard(ctx, width, floor, time) {
  ctx.save()
  const sky = ctx.createLinearGradient(0, 40, 0, floor + 78)
  sky.addColorStop(0, '#16122e15')
  sky.addColorStop(.8, '#2720449c')
  sky.addColorStop(1, '#20152d32')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, floor + 78)
  ctx.fillStyle = '#d7caff35'
  ctx.beginPath()
  ctx.arc(width * .79, floor - 217, 46, 0, tau)
  ctx.fill()
  for (let side = 0; side < 2; side++) {
    const y = floor - (side ? 61 : 101)
    const gap = side ? 36 : 58
    ctx.fillStyle = side ? '#18182d' : '#342746'
    ctx.fillRect(0, y + 12, width, 5)
    ctx.fillRect(0, y + 39, width, 5)
    for (let x = gap / 2; x < width; x += gap) {
      ctx.fillRect(x - 2, y + 1, 4, 54)
      polygon(ctx, [[x - 6, y + 6], [x, y - 7], [x + 6, y + 6]], side ? '#18182d' : '#342746')
    }
  }
  for (let i = 0; i < 13; i++) {
    const x = (i * 167 + 35) % width
    const y = floor - 10 - (i % 3) * 11
    const height = 32 + i % 5 * 9
    const w = 13 + i % 3 * 5
    ctx.lineWidth = 2
    polygon(ctx, [[x - w, y], [x - w + 3, y - height + 14], [x - 6, y - height],
      [x + 9, y - height], [x + w, y - height + 12], [x + w + 1, y]], '#312840', '#625672')
    ctx.fillStyle = '#8e7da152'
    ctx.fillRect(x - 7, y - height + 20, 14, 2)
    ctx.fillRect(x - 5, y - height + 28, 10, 2)
  }
  ctx.fillStyle = '#ad8de123'
  for (let i = 0; i < 9; i++) {
    const x = ((i * 263 + time * (i % 2 ? -27 : 33)) % (width + 360) + width + 360) % (width + 360) - 180
    ctx.beginPath()
    ctx.ellipse(x, floor - 19 + Math.sin(time * 1.4 + i) * 16, 170 + i % 4 * 29, 14 + i % 3 * 4, 0, 0, tau)
    ctx.fill()
  }
  ctx.restore()
}

export function drawUltimate(ctx, effect, width, floor, time, color) {
  const { visual, x, direction, origin, positions, pulse, at, expires } = effect
  const progress = Math.min(1, (time - at) / (expires - at))
  const fade = Math.max(0, 1 - progress ** 3)
  if (visual === 'beam') {
    drawHyper(ctx, { ...effect, kind: 'pierce', palette: effect.type === 'grass' ?
      ['#39794a', '#79c458', '#d9ff88', '#f9ffd6'] : undefined }, width, floor, time)
    if (progress < .64) drawPunch(ctx, origin, floor, progress * .44)
    return
  }
  ctx.save()
  ctx.globalAlpha = fade
  ctx.lineCap = 'round'
  if (visual === 'waves') {
    const head = direction > 0 ? progress * width : width - progress * width
    const crest = floor - 96 - pulse * 13 + Math.sin(time * 17) * 8
    ctx.save()
    ctx.translate(head, crest)
    ctx.scale(direction, 1)
    const water = ctx.createLinearGradient(0, 0, 0, floor - crest + 38)
    water.addColorStop(0, '#baf7ff')
    water.addColorStop(.25, '#39b9ed')
    water.addColorStop(1, '#19649d')
    ctx.beginPath()
    ctx.moveTo(-310, floor - crest + 35)
    ctx.bezierCurveTo(-189, floor - crest + 19, -155, -27, -72, -12)
    ctx.bezierCurveTo(-39, -9, -5, 16, 28, 42)
    ctx.bezierCurveTo(-31, 22, -50, 45, 46, floor - crest + 35)
    ctx.closePath()
    ctx.fillStyle = water
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#9ce8fc'
    ctx.stroke()
    ctx.strokeStyle = '#f2ffff'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(-144, 26)
    ctx.bezierCurveTo(-92, -41, -14, 2, 27, 42)
    ctx.stroke()
    for (let i = 0; i < 35; i++) {
      const age = (progress * 2.7 + i * .147) % 1
      ctx.globalAlpha = fade * (1 - age)
      ctx.fillStyle = i % 3 ? '#aff5ff' : '#fff'
      ctx.fillRect(-150 + i % 12 * 14 - age * 35, 9 + i % 7 * 5 - Math.sin(age * Math.PI) * (32 + i % 6 * 7),
        3 + i % 4 * 2, 2 + i % 3)
    }
    ctx.restore()
  } else if (visual === 'vortex') {
    const head = direction > 0 ? progress * width : width - progress * width
    for (let i = 0; i < 7; i++) {
      const px = head - direction * i * 52
      ctx.save()
      ctx.translate(px, floor - i % 3 * 20)
      ctx.rotate(Math.sin(time * 9 + i) * .27)
      flameGlyph(ctx, time * 24 + i, 1.3 + i % 3 * .2)
      ctx.restore()
    }
  } else if (visual === 'thunder') {
    for (const px of positions) {
      if (!pulse) drawTarget(ctx, { x: px, visual: 'lightning', at, expires }, floor, time)
      else for (const side of [-1, 1]) {
        const reach = side < 0 ? px : width - px
        const tip = px + side * reach * progress
        ctx.strokeStyle = '#ffe66e'
        ctx.lineWidth = 4
        bolt(ctx, tip, floor + 21, 28, side < 0 ? 3 : 0)
        ctx.fillStyle = '#fff5aa'
        ctx.fillRect(tip - 23, floor + 19, 46, 3)
      }
    }
  } else if (visual === 'ice') {
    for (let i = 0; i < 22; i++) {
      const px = origin + (i % 2 ? 1 : -1) * (width * .6) * Math.min(1, progress * 2) * (i / 22)
      const y = floor - 7 + Math.sin(i * 3 + progress * 9) * 22
      polygon(ctx, [[px - 16, y + 11], [px - 4, y - 16], [px + 20, y - 7], [px + 12, y + 13]],
        i % 2 ? '#9df1ff' : '#438cbf', '#e9fdff')
    }
  } else if (visual === 'combo') {
    drawPunch(ctx, x, floor - 8, progress * .32)
  } else if (visual === 'trash') {
    const y = effect.falling ? floor + progress ** 2 * 240 : floor - Math.sin(progress * Math.PI) * 125
    const travelX = origin + (x - origin) * progress
    ctx.save()
    ctx.translate(travelX, y)
    ctx.rotate(progress * 8)
    polygon(ctx, [[-22, -22], [25, -22], [16, 26], [-17, 26]], '#7f8270', '#ded5a2')
    ctx.fillStyle = '#b7a790'
    ctx.fillRect(-29, -26, 58, 9)
    ctx.restore()
    if (!effect.falling) drawStatus(ctx, 'poison', travelX, y, time, 21, 23)
  } else if (visual === 'fissure') {
    ctx.beginPath()
    ctx.moveTo(0, floor + 36)
    for (let i = 1; i <= 24; i++) ctx.lineTo(i * width / 24, floor + 36 + Math.sin(i * 3.7) * (9 + progress * 20))
    ctx.strokeStyle = '#492b3a'
    ctx.lineWidth = 17
    ctx.stroke()
    ctx.strokeStyle = '#ffb665'
    ctx.lineWidth = 4
    ctx.stroke()
  } else if (visual === 'tornado') {
    for (let i = 0; i < 12; i++) {
      const px = width / 2 + Math.sin(i * .8 + time * 12) * 95
      const py = floor + 21 - i * 20
      ctx.beginPath()
      ctx.ellipse(px, py, 35 + i * 11, 13 + i * 2, 0, 0, tau)
      ctx.strokeStyle = i % 2 ? '#b2f0f2' : '#6ba9bf'
      ctx.lineWidth = 4 + i * .4
      ctx.stroke()
    }
  } else if (visual === 'girder') {
    const y = floor + 24 - Math.abs(Math.cos(progress * Math.PI / 2)) * (pulse ? 95 : 285) +
      (pulse === 2 ? Math.max(0, progress - .72) * 630 : 0)
    ctx.fillStyle = '#525b77'
    ctx.fillRect(0, y - 22, width, 40)
    ctx.fillStyle = '#c1deef'
    ctx.fillRect(0, y - 23, width, 8)
    ctx.fillStyle = '#829bb3'
    ctx.fillRect(0, y + 12, width, 7)
    for (let i = 30; i < width; i += 96) {
      ctx.fillStyle = '#e4f1fc'
      ctx.fillRect(i, y - 4, 7, 7)
    }
  } else if (visual === 'orbs') {
    for (let i = 0; i < 5; i++) {
      const angle = time * 8 + i * tau / 5
      const px = i === pulse ? origin + (x - origin) * progress : origin + Math.cos(angle) * 65
      const y = floor - 23 + Math.sin(angle) * 25
      ctx.beginPath()
      ctx.arc(px, y, i === pulse ? 22 : 12, 0, tau)
      ctx.fillStyle = '#241122'
      ctx.strokeStyle = '#bd485e'
      ctx.lineWidth = 5
      ctx.fill()
      ctx.stroke()
    }
  } else {
    for (const [i, px] of positions.entries()) {
      if (visual === 'telekinesis') drawTarget(ctx, { x: px, visual: 'psychic', at, expires }, floor - (!pulse ? 80 : 0), time)
      else if (visual === 'meteors' || visual === 'comets') {
        const offset = Math.sin(i * 3 + pulse) * (1 - progress) * 100
        const y = floor - 230 * (1 - Math.min(1, progress * 1.65))
        const px2 = px + offset
        polygon(ctx, [[px2 - 18, y + 12], [px2 - 16, y - 19], [px2 + 5, y - 48],
          [px2 + 20, y - 8], [px2 + 11, y + 15]], visual === 'comets' ? '#ffc781' : '#b79a82', '#fff1ba')
        if (progress > .62) for (const sign of [-1, 1]) {
          ctx.fillStyle = '#d7bd95'
          ctx.fillRect(px + sign * (progress - .62) * 120, floor - 16, 12, 9)
        }
      } else if (visual === 'web') {
        ctx.beginPath()
        ctx.strokeStyle = '#cbe9ca'
        ctx.lineWidth = 3
        for (let strand = -2; strand <= 2; strand++) {
          ctx.moveTo(px + strand * 31, floor + 28)
          ctx.lineTo(px + strand * -13, floor - 35)
        }
        ctx.stroke()
        if (pulse) drawChannel(ctx, px, floor, time, '#f5e7a6')
      } else {
        const glow = ctx.createRadialGradient(px, floor - 24, 6, px, floor - 24, 118)
        glow.addColorStop(0, visual === 'mist' ? '#fd99d5b0' : '#633b99b0')
        glow.addColorStop(1, '#a173d900')
        ctx.fillStyle = glow
        ctx.fillRect(px - 118, floor - 142, 236, 236)
        drawChannel(ctx, px, floor, time, visual === 'mist' ? '#ffbeda' : '#bd9cef')
      }
    }
  }
  if (!['waves', 'vortex', 'combo', 'girder', 'trash'].includes(visual) && progress < .78) {
    const anchors = ['fissure', 'orbs'].includes(visual) ? [x] : positions
    for (const [index, px] of anchors.entries()) {
      for (let i = 0; i < 8; i++) {
        const angle = i * tau / 8 + index * .26
        const reach = 18 + progress * (63 + i % 3 * 22)
        ctx.globalAlpha = (1 - progress / .78) * .8
        ctx.fillStyle = i % 3 ? color : '#fff5d4'
        const size = 2 + (1 - progress) * (i % 3 + 2)
        ctx.fillRect(px + Math.cos(angle) * reach, floor + Math.sin(angle) * reach * .65, size * 2, size)
      }
    }
  }
  ctx.restore()
}

export function drawChannel(ctx, x, y, time, color) {
  ctx.save()
  for (let i = 0; i < 12; i++) {
    const phase = (time * 1.8 + i / 12) % 1
    const angle = i * tau / 12
    ctx.globalAlpha = Math.sin(phase * Math.PI) * .85
    ctx.fillStyle = i % 3 ? color : '#fff9dc'
    ctx.fillRect(x + Math.cos(angle) * (51 - phase * 12), y + Math.sin(angle) * 19 - phase * 43,
      3 + i % 3 * 3, 3 + i % 3 * 3)
  }
  ctx.restore()
}

function flameGlyph(ctx, phase, scale) {
  ctx.save()
  ctx.scale(scale, scale)
  for (const [angle, reach] of [[-1.57, 48], [-.53, 42], [-2.62, 38], [.58, 56], [2.47, 57]]) {
    ctx.save()
    ctx.rotate(angle)
    const flicker = Math.sin(phase + angle * 8) * 10
    const end = reach + flicker
    polygon(ctx, [[-9, -15], [end * .42, -13], [end * .68, -7], [end, -2], [end * .67, 10], [3, 16]], '#dd4929', '#9d3024')
    polygon(ctx, [[0, -10], [end * .62, -6], [end - 5, -2], [end * .59, 6], [0, 9]], '#ffae46')
    polygon(ctx, [[1, -4], [end * .58, -3], [end * .78, -1], [end * .47, 3], [0, 5]], '#fff3a7')
    ctx.restore()
  }
  ctx.restore()
}

export function drawHeavyFireImpact(ctx, x, y, elapsed) {
  if (elapsed > .42) return
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = 1 - elapsed / .42
  flameGlyph(ctx, elapsed * 73, 1 + elapsed * 2)
  ctx.restore()
}

export function drawWaterImpact(ctx, x, y, elapsed) {
  const progress = elapsed / .38
  if (progress >= 1) return
  ctx.save()
  ctx.globalAlpha = 1 - progress
  for (let i = 0; i < 17; i++) {
    const angle = -Math.PI + i * Math.PI / 16
    const speed = 48 + i % 4 * 25
    const px = x + Math.cos(angle) * progress * speed
    const py = y + Math.sin(angle) * progress * speed + 31 * progress ** 2
    ctx.fillStyle = i % 3 ? '#78d9fe' : '#e7fcff'
    ctx.fillRect(px, py, 6 + i % 3 * 3, 3 + i % 4)
  }
  ctx.restore()
}

export function drawHyper(ctx, effect, width, y, time) {
  const phase = (time - effect.at) / (effect.expires - effect.at)
  const { x, direction } = effect
  ctx.save()
  if (effect.kind === 'charge') {
    ctx.translate(x, y)
    ctx.strokeStyle = '#ffd687'
    ctx.lineWidth = 4
    for (let i = 0; i < 4; i++) {
      const p = (phase * 1.6 + i * .25) % 1
      ctx.globalAlpha = p * .9
      ctx.beginPath()
      ctx.arc(0, 0, 58 - p * 51, 0, tau)
      ctx.stroke()
    }
  } else {
    ctx.translate(x, y)
    ctx.scale(direction, 1)
    const length = direction === 1 ? width - x : x
    const thickness = Math.max(3, 55 * (1 - phase ** 2))
    ctx.globalAlpha = 1 - phase ** 3
    const colors = effect.palette ?? ['#bc552c', '#f99144', '#ffe382', '#fffde2']
    for (const [index, ratio] of [1, .8, .57, .29].entries()) {
      const r = thickness * ratio
      polygon(ctx, [[0, 0], [43, -r * .75], [110, -r], [length, -r * .86],
        [length, r * .9], [93, r], [39, r * .72]], colors[index])
    }
    ctx.fillStyle = '#fff1b2'
    for (let i = 0; i < 23; i++) {
      ctx.fillRect((i * 91 + phase * 280) % length, Math.sin(i * 3.5) * thickness * (1 + phase), 11 + i % 5 * 5, 3)
    }
  }
  ctx.restore()
}

export function drawPunch(ctx, x, y, time) {
  const progress = time / .32
  if (progress >= 1) return
  ctx.save()
  ctx.globalAlpha = 1 - progress
  ctx.beginPath()
  for (let i = 0; i < 20; i++) {
    const angle = i * tau / 20
    const radius = (16 + 74 * progress) * (i % 2 ? .57 : 1)
    const px = x + radius * Math.cos(angle)
    const py = y + radius * Math.sin(angle)
    if (!i) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = '#ffe997'
  ctx.strokeStyle = '#ed7847'
  ctx.lineWidth = 5
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawTerrainAura(ctx, width, floor, time, color, electric) {
  const span = width / 9
  for (let i = 0; i <= 9; i++) {
    const drift = Math.sin(time * (electric ? 3 : 1.15) + i * 1.7)
    const x = i * span + drift * span * .32
    const y = floor + 31 + Math.sin(time * 1.4 + i) * 9
    const rise = (electric ? 51 : 70) + drift * 13
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(span * 1.16, rise)
    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    haze.addColorStop(0, `rgba(${color}, ${electric ? .3 : .36})`)
    haze.addColorStop(.58, `rgba(${color}, .13)`)
    haze.addColorStop(1, `rgba(${color}, 0)`)
    ctx.fillStyle = haze
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
}

export function drawField(ctx, field, width, height, floor, time) {
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, (time - field.start) / .45, (field.ends - time) / .35))
  if (field.kind === 'rain') {
    const opacity = ctx.globalAlpha
    ctx.strokeStyle = '#a2dcfc83'
    ctx.lineWidth = 2.4
    for (let i = 0; i < 92; i++) {
      const x = ((i * 137 - time * 58) % width + width) % width
      const y = (i * 79 + time * (380 + i % 4 * 35)) % height
      ctx.globalAlpha = opacity * Math.min(1, y / 94, (height - y) / 30)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 6, y + 24)
      ctx.stroke()
    }
  } else if (field.kind === 'hail' || field.kind === 'sandstorm') {
    const hail = field.kind === 'hail'
    const opacity = ctx.globalAlpha
    ctx.fillStyle = hail ? '#d8f2ff' : '#dac08b'
    for (let i = 0; i < 66; i++) {
      const y = (i * 73 + time * (hail ? 190 : 40)) % height
      const x = (i * 149 + time * (hail ? 70 : 430)) % width
      ctx.globalAlpha = opacity * .64 * Math.min(1, y / 80, (height - y) / 80)
      ctx.fillRect(x, y, hail ? 4 : 9, hail ? 5 : 2)
    }
  } else if (field.kind === 'sun') {
    const glow = ctx.createLinearGradient(0, 0, 0, floor + 60)
    glow.addColorStop(0, '#ffd58545')
    glow.addColorStop(1, '#ffb46d00')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, floor + 60)
    ctx.strokeStyle = '#ffd89145'
    ctx.lineWidth = 5
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * (width - 160) / 5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x - 110 + Math.sin(time * 2 + i) * 30, floor - 50)
      ctx.stroke()
    }
  } else if (field.kind === 'electric') {
    drawTerrainAura(ctx, width, floor, time, '255, 204, 45', true)
    ctx.strokeStyle = '#fff4a7d6'
    ctx.lineWidth = 3
    for (let i = 0; i < 19; i++) {
      const pulse = (time * 3 + i * .35) % 1
      if (pulse > .58) continue
      bolt(ctx, 30 + i * (width - 60) / 18, floor + 29 + Math.sin(i * 2) * 13, 24, i * 1.3 + pulse)
    }
  } else if (field.kind === 'grass') {
    drawTerrainAura(ctx, width, floor, time, '102, 227, 90', false)
    for (let i = 0; i < 32; i++) {
      const x = 30 + i * (width - 64) / 31
      const lift = (time * 1.2 + i * .31) % 1
      const y = floor + 43 - lift * (35 + i % 5 * 6)
      ctx.fillStyle = i % 4 ? '#a9ed8989' : '#f0ffb3a9'
      ctx.fillRect(x + Math.sin(lift * 3 + i) * 8, y, 4 + i % 4, 2 + i % 3)
    }
  }
  ctx.restore()
}
