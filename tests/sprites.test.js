import test from 'node:test'
import assert from 'node:assert/strict'
import { battleClip, chooseBehavior, createCaptureQueue, showScene, sprite, spriteScale } from '../ui/sprites.js'

test('sprite loads retry after a temporary image failure', () => {
  const originalImage = globalThis.Image
  const originalNow = Date.now
  let now = 0
  const requests = []
  globalThis.Image = class {
    set src(url) {
      requests.push(url)
      this.complete = true
      this.naturalWidth = requests.length > 1 ? 96 : 0
      if (!this.naturalWidth) this.onerror()
    }
  }
  Date.now = () => now
  const clip = { url: '/pmd/fixture-retry/Idle-Anim.png', width: 32, height: 32, durations: [60], rows: 1 }
  let draws = 0
  const context = { drawImage() { draws++ } }
  try {
    assert.equal(sprite(context, clip, 0, 0, 1, 0), false)
    now = 2999
    assert.equal(sprite(context, clip, 0, 0, 1, 0), false)
    assert.equal(requests.length, 1)
    now = 3000
    assert.equal(sprite(context, clip, 0, 0, 1, 0), true)
    assert.equal(requests[1], clip.url + '?retry=3000')
    assert.equal(draws, 1)
  } finally {
    globalThis.Image = originalImage
    Date.now = originalNow
  }
})

test('overlay capture feed reveals simultaneous catches in order and frees space as each fades', () => {
  const queue = createCaptureQueue()
  const catches = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, encounterId: 'wild', at: 10_000 }))
  const rows = time => queue(catches, time, 10_000 + time, .1)
  assert.deepEqual(rows(0).map(row => row.id), [1])
  assert.deepEqual(rows(450).map(row => row.id), [1, 2])
  assert.deepEqual(rows(900).map(row => row.id), [1, 2, 3])
  assert.ok(rows(3850)[0].opacity < 1)
  assert.deepEqual(rows(4100).map(row => row.id), [2, 3, 4])
  assert.deepEqual(rows(4550).map(row => row.id), [3, 4, 5])
  assert.deepEqual(rows(9000), [])
})

test('large static fallback sprites shrink without changing PMD sprites or zoom behavior', () => {
  const clip = { url: '/pmd/0001/Static.png', width: 96, height: 96 }
  assert.equal(spriteScale(clip, 3) * clip.width, 120)
  assert.equal(spriteScale({ ...clip, url: '/pmd/0001/Static.webp' }, 3) * clip.width, 120)
  assert.equal(spriteScale(clip, 6) * clip.width, 240)
  assert.equal(spriteScale({ ...clip, url: '/pmd/0001/Idle-Anim.png' }, 3), 3)
})

test('battle animations fall back to a clip that matches the action when possible', () => {
  const animations = { Idle: {}, Walk: {}, Attack: {}, Hurt: {} }
  assert.equal(battleClip(animations, 'Run'), animations.Walk)
  assert.equal(battleClip(animations, 'Special0'), animations.Attack)
  assert.equal(battleClip(animations, 'Faint'), animations.Hurt)
  assert.equal(battleClip(animations, 'Sleep'), animations.Idle)
  assert.equal(battleClip(undefined, 'Faint'), undefined)
})

test('walking alternates with idle, and idle can lead to sleep, jumps or attacks', () => {
  const actor = { direction: 1 }
  const animations = { Sleep: {}, Hop: {}, Attack: { durations: [15, 30] } }
  chooseBehavior(actor, animations, 0, () => .01)
  assert.equal(actor.behavior, 'Walk')
  chooseBehavior(actor, animations, 9000, () => .01)
  assert.equal(actor.behavior, 'Idle')
  assert.equal(actor.speed, 0)
  assert.ok(actor.turnAt > actor.since && actor.turnAt < actor.until)
  chooseBehavior(actor, animations, actor.until, () => .1)
  assert.equal(actor.behavior, 'Sleep')
  chooseBehavior(actor, animations, actor.until, () => .3)
  assert.equal(actor.behavior, 'Walk')
  chooseBehavior(actor, animations, actor.until, () => .9)
  assert.equal(actor.behavior, 'Idle')
  chooseBehavior(actor, animations, actor.until, () => .3)
  assert.equal(actor.behavior, 'Attack')
  assert.equal(actor.until - actor.since, 750)
  assert.equal(actor.speed, 0)
  actor.behavior = 'Idle'
  chooseBehavior(actor, animations, actor.until, () => .55)
  assert.equal(actor.behavior, 'Hop')
})

test('the companion canvas retains its selected aspect ratio independently of preview size', () => {
  let frame
  const original = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = callback => { frame = callback }
  const canvas = { clientWidth: 600, clientHeight: 338, getContext: () => ({ clearRect() {} }) }
  try {
    showScene(canvas, 'companions', [], () => ({
      viewers: {}, config: { nameLimit: 50, visibleLimit: 100 }
    }))
    frame(100)
    assert.equal(canvas.width, 1920)
    assert.equal(canvas.height, 1080)
    showScene(canvas, 'companions', [], () => ({
      viewers: {}, config: { nameLimit: 50, visibleLimit: 100 }
    }), undefined, { strip: true })
    frame(100)
    assert.equal(canvas.width, 1920)
    assert.equal(canvas.height, 550)
  } finally {
    globalThis.requestAnimationFrame = original
  }
})

test('a visible companion announces a level increase without announcing its initial rank', () => {
  let frame
  const original = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = callback => { frame = callback }
  const labels = []
  const fills = []
  const context = { clearRect() {}, fillRect(x, y, width, height) { fills.push([this.fillStyle, width, height]) }, save() {}, restore() {}, strokeText() {},
    fillText(text) { labels.push([text, this.font]) } }
  const companion = { active: { key: 'Brasa', expires: Infinity, layer: 1 }, collection: { Brasa: 0 } }
  const canvas = { clientWidth: 600, clientHeight: 338, getContext: () => context }
  try {
    showScene(canvas, 'companions', [], () => ({ viewers: { Viewer: companion },
      config: { nameLimit: 50, visibleLimit: 100 }, bot: { language: 'en' } }))
    Object.assign(context, { translate() {}, beginPath() {}, closePath() {}, arc() {}, fill() {}, stroke() {} })
    frame(0)
    frame(900)
    assert.ok(labels.some(([text]) => text === 'Lv. 1'))
    assert.ok(!labels.some(([text]) => text === 'Level up!!'))
    companion.collection.Brasa = 60
    frame(925)
    assert.ok(fills.some(([color, width, height]) => color === '#79d7ff' && width > 0 && height === 5))
    companion.collection.Brasa = 120
    frame(950)
    frame(1150)
    assert.ok(labels.some(([text]) => text === 'Level up!!'))
    assert.ok(labels.some(([text, font]) => text === 'Lv. 2' && font !== 'bold 19px system-ui'))
  } finally {
    globalThis.requestAnimationFrame = original
  }
})
