import test from 'node:test'
import assert from 'node:assert/strict'
import { battleClip, chooseBehavior, showScene, spriteScale } from './ui/sprites.js'

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

test('the companion canvas is Full HD independently of preview size', () => {
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
  } finally {
    globalThis.requestAnimationFrame = original
  }
})

test('a visible companion announces a level increase without announcing its initial rank', () => {
  let frame
  const original = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = callback => { frame = callback }
  const labels = []
  const context = { clearRect() {}, save() {}, restore() {}, strokeText() {},
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
    companion.collection.Brasa = 120
    frame(950)
    frame(1150)
    assert.ok(labels.some(([text]) => text === 'Level up!!'))
    assert.ok(labels.some(([text, font]) => text === 'Lv. 2' && font !== 'bold 19px system-ui'))
  } finally {
    globalThis.requestAnimationFrame = original
  }
})
