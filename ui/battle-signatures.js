import { battleFxColor, elementTile } from './battle-fx.js'

export const signatureTiles = {
  'water-tail':20, icefall:21, 'wing-sweep':22, 'speed-strike':23, rockfall:24, 'heart-drain':25,
  amnesia:26, agility:27, claw:28, punch:29, fangs:30, ripple:31,
  sprout:32, ward:33, restore:34, tackle:35
}
const tau = Math.PI * 2
const fade = t => Math.max(0, Math.min(1, 1 - t))
const contactTiles = { tail:20, kick:29, slam:35, horn:28, spin:31, 'dragon-dance':28, meditate:33, scheme:26, stars:35, echo:27 }

function ribbon(ctx, x, y, w, h, tilt, start, end, color, alpha) {
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.lineCap = 'round'
  for (const [size, tint] of [[13, color], [4, '#fffaf1']]) {
    ctx.strokeStyle = tint
    ctx.lineWidth = size
    ctx.beginPath()
    ctx.ellipse(x, y, w, h, tilt, start, end)
    ctx.stroke()
  }
  ctx.restore()
}

function question(ctx, x, y, size) {
  ctx.font = '900 ' + size + 'px system-ui'
  ctx.textAlign = 'center'
  ctx.strokeStyle = '#50296e'
  ctx.lineWidth = 6
  ctx.strokeText('?', x, y)
  ctx.fillStyle = '#ffe0ff'
  ctx.fillText('?', x, y)
}

export function drawSignatureCue(ctx, fx, cue, x, y, time) {
  const t = (time - cue.at) / (cue.expires - cue.at)
  if (t < 0 || t > 1) return true
  const profile = cue.animationProfile
  const released = cue.stage === 'release'
  const direction = cue.direction || 1
  const type = cue.type || 'normal'
  const color = battleFxColor(type)
  const tile = signatureTiles[profile] ?? contactTiles[profile]
  if (profile === 'icefall' || profile === 'rockfall') {
    if (!released) {
      const falling = Math.min(1, Math.max(0, (t - .13) / .86))
      const Y = y - (1 - falling ** 2.4) * Math.min(286, y - 35)
      ctx.save()
      ctx.globalAlpha = .85
      ribbon(ctx, x, y + 34, 46 + t * 23, 12, 0, 0, tau, color, .65)
      ctx.restore()
      for (let i = 0; i < 5; i++) fx.add(x + Math.sin(i * 5) * 22, Y - i * 18, 29 + i * 4, type, .67 - i * .1, 2, t)
      fx.add(x, Y, 77 - falling * 9, type, .97, tile, falling * .47 - .19)
    }
    return true
  }
  if (profile === 'agility' || profile === 'amnesia') {
    if (released) {
      if (profile === 'amnesia') {
        ctx.save()
        ctx.globalAlpha = fade((t - .35) / .65)
        for (let i = 0; i < 3; i++) {
          const dx = (i - 1) * 38 + Math.sin(t * 7 + i) * 8
          question(ctx, x + dx, y - 13 - t * 26 - (i === 1 ? 21 : 0), 32 + (i === 1 ? 10 : 0))
        }
        ctx.restore()
        fx.add(x + 63, y + 9, 37, 'psychic', fade(t) * .85, 26, t)
      } else {
        for (let i = 0; i < 5; i++) {
          const dir = i % 2 ? -1 : 1
          fx.add(x + dir * (28 + i * 13) * Math.sin(t * Math.PI), y + 27 - i * 7, 33, 'grass', fade(t), 27, dir * -.18)
        }
        ribbon(ctx, x, y + 28, 65 + t * 23, 10, .13, t * 9, t * 9 + 3, '#8bf6c7', fade(t))
      }
    }
    return released
  }
  if (profile === 'heart-drain' && released && Number.isFinite(cue.origin) && Math.abs(x - cue.origin) > 14) {
    for (let i = 0; i < 5; i++) {
      const travel = Math.min(1, Math.max(0, t * 1.45 - i * .115))
      fx.add(x + (cue.origin - x) * travel, y - Math.sin(travel * Math.PI) * 58,
        37 - i * 3, 'fairy', fade(travel) * .94, i === 0 ? 25 : 34, -.16 + travel)
    }
    return true
  }
  if (!released && ['water-tail', 'wing-sweep', 'speed-strike'].includes(profile)) {
    const distance = profile === 'speed-strike' ? -26 : -14
    fx.add(x + direction * distance, y + 4, 39 + t * 17, type, fade(t) * .9, tile, direction * -.3)
    return true
  }
  if (!released || tile === undefined || cue.style === 'ultimate' || cue.style === 'projectile') return false
  if (cue.style === 'rush' || cue.style === 'maneuver') {
    if (profile === 'water-tail' || profile === 'wing-sweep' || profile === 'claw' || profile === 'tail') {
      const a = direction > 0 ? -.9 : Math.PI - .9
      ribbon(ctx, x, y + 5, 51 + t * 46, 22 + t * 20, direction * -.48, a - t, a + 2.4 + t, color, fade(t) * .86)
    }
    fx.add(x - direction * 9, y, 59 + t * 30, type, fade(t), tile, direction * (-.17 + t * .4))
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.399 + t
      fx.add(x + Math.cos(angle) * (27 + t * 70), y + Math.sin(angle) * (15 + t * 39), 16,
        type, fade(t), profile === 'wing-sweep' ? 22 : elementTile[type], angle)
    }
    return true
  }
  if (['guard', 'support'].includes(cue.style)) {
    ribbon(ctx, x, y + 30, 33 + t * 43, 13, .09, t * 8, t * 8 + 4.8, color, fade(t) * .7)
    for (let i = 0; i < 3; i++) fx.add(x + Math.cos(t * 7 + i * tau / 3) * 43, y + 24 - t * 39, 33,
      type, fade(t) * .92, tile, i / 7 + t)
    return true
  }
  return false
}

export function drawSignatureImpact(fx, x, y, hit, time) {
  const t = Math.max(0, (time - hit.at) / .43)
  if (t > 1) return
  const profile = hit.animationProfile
  const tile = signatureTiles[profile] ?? contactTiles[profile]
  if (tile === undefined) return
  const strength = hit.critical ? 1.18 : 1
  fx.add(x, y, (58 + 25 * t) * strength, hit.type, fade(t) ** 1.2, tile, (hit.direction ?? 1) * t * .55)
  if (profile === 'rockfall' || profile === 'icefall' || profile === 'water-tail') {
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.399
      fx.add(x + Math.cos(angle) * (17 + t * 84), y + Math.sin(angle) * (9 + t * 43) + t ** 2 * 23,
        16 + i % 3 * 6, hit.type, fade(t) * .93, profile === 'water-tail' ? 7 : tile, angle + t)
    }
  }
}
