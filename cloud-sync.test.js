import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { openProgress } from './progress.js'
import { startCloudSync } from './cloud-sync.js'

test('pending changes survive restart and retry after a dropped connection', async t => {
  const temp = mkdtempSync(join(tmpdir(), 'stream-sync-'))
  const path = join(temp, 'progress.sqlite')
  let progress = openProgress(path)
  const viewer = { displayName: 'Test', collection: { Weedle: 0 }, balls: { normal: 4, great: 0, ultra: 0, master: 0 } }
  const data = { viewers: { 'twitch:1': viewer } }
  progress.save(data)
  progress.close()
  progress = openProgress(path)
  const old = progress.pending()
  assert.equal(old[0].revision, 1)
  let attempts = 0
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const { viewers } = JSON.parse(options.body)
    if (++attempts === 1) throw new Error('offline')
    viewer.collection.Weedle = 120
    progress.save(data)
    return Response.json({ received: viewers.map(({ id, revision }) => ({ id, revision })) })
  })
  let resolve
  const recovered = new Promise(done => { resolve = done })
  const stop = startCloudSync({
    progress, url: 'https://example.test', token: 'a'.repeat(64), interval: 15,
    onStatus(status) { if (attempts === 2 && status === 'Hay cambios pendientes') resolve() }
  })
  try {
    await recovered
    assert.equal(progress.pending()[0].revision, 2)
    assert.equal(progress.pending()[0].collection.Weedle, 120)
    progress.acknowledge(progress.pending())
    assert.deepEqual(progress.pending(), [])
  } finally {
    stop()
    progress.close()
    rmSync(path, { force: true })
    rmdirSync(temp)
  }
})

test('whole XP inside a level is queued without losing local fractional XP', () => {
  const store = openProgress(':memory:')
  try {
    const viewer = { displayName: 'Test', collection: { Weedle: 0 }, balls: { normal: 4 } }
    const progress = { viewers: { 'twitch:1': viewer } }
    store.save(progress)
    store.acknowledge(store.pending())
    viewer.collection.Weedle = 119.9
    store.save(progress)
    assert.equal(store.load().viewers['twitch:1'].collection.Weedle, 119.9)
    assert.equal(store.pending()[0].collection.Weedle, 119)
    store.acknowledge(store.pending())
    viewer.collection.Weedle = 120.1
    store.save(progress)
    assert.equal(store.pending()[0].collection.Weedle, 120)
    store.acknowledge(store.pending())
    viewer.metrics = { wins: 0, losses: 0, summonSeconds: 59.9 }
    store.save(progress)
    assert.deepEqual(store.pending(), [])
    viewer.metrics.summonSeconds = 60
    viewer.metrics.wins = 1
    store.save(progress)
    assert.deepEqual(store.pending()[0].metrics, { wins: 1, losses: 0, summonMinutes: 1 })
  } finally {
    store.close()
  }
})

test('an old sync acknowledgement cannot consume new progress after erasure', () => {
  const store = openProgress(':memory:')
  try {
    const id = 'kick:1'
    const viewer = { displayName: 'Test', balls: { normal: 5 }, collection: { Weedle: 120 } }
    store.save({ viewers: { [id]: viewer } })
    const old = store.pending()
    store.save({ viewers: {}, erasedViewers: [id], viewerGenerations: { [id]: 1 } })
    assert.deepEqual(store.pending(), [])
    assert.equal(store.load().viewers[id], undefined)
    store.save({ viewers: { [id]: { ...viewer, collection: {} } }, viewerGenerations: { [id]: 2 } })
    store.acknowledge(old)
    assert.equal(store.pending()[0].generation, 2)
    assert.deepEqual(store.pending()[0].collection, {})
  } finally {
    store.close()
  }
})
