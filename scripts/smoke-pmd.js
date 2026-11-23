import assert from 'node:assert/strict'
const base = 'http://127.0.0.1:43127'
for (let attempt = 0; attempt < 30; attempt++) {
  try { if ((await fetch(base)).ok) break } catch {}
  await new Promise(resolve => setTimeout(resolve, 500))
}
const catalog = await (await fetch(base + '/catalog')).json()
assert.equal(catalog.species.length, 1025)
assert.ok(catalog.species.some(item => item.shiny))
assert.ok(catalog.species.every(item => !item.shiny ||
  Object.keys(item.normal.animations).every(clip => item.shiny.animations[clip])))
const targets = await (await fetch('http://127.0.0.1:9227/json/list')).json()
const socket = new WebSocket(targets.find(target => target.url === base + '/').webSocketDebuggerUrl)
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
let sequence = 0
function cdp(method, params) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    const listener = ({ data }) => {
      const result = JSON.parse(data)
      if (result.id !== id) return
      socket.removeEventListener('message', listener)
      if (result.error) reject(result.error)
      else resolve(result.result)
    }
    socket.addEventListener('message', listener)
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function run(fn) {
  const result = await cdp('Runtime.evaluate', { expression: '(' + fn + ')()', awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
try {
  const outcome = await run(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    const state = async () => (await fetch('/state')).json()
    const send = action => fetch('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) })
    while (document.querySelector('#summon-preview select').options.length !== 1025) await wait(50)
    await send({ running: true })
    await send({ config: { interval: 30, duration: 3, shiny: 1 } })
    await send({ spawn: 'Rattata' })
    const candidates = []
    for (let index = 0; index < 12 && candidates.length < 2; index++) {
      const viewer = 'Smoke ' + Date.now() + '-' + index
      await send({ viewer, message: '!poke join' })
      for (let i = 0; i < 5; i++) await send({ viewer, message: '!catch' })
      await send({ viewer, message: '!summonshiny rattata' })
      if ((await state()).viewers[viewer].active) candidates.push(viewer)
    }
    const output = await state()
    await wait(1100)
    function digest(id) {
      const target = document.getElementById(id)
      const pixels = target.getContext('2d').getImageData(0, 0, target.width, Math.floor(target.height * .72)).data
      return { alpha: pixels.filter((value, i) => i % 4 === 3 && value).length, hash: pixels.reduce((hash, value) => (31 * hash + value) | 0, 0) }
    }
    const before = digest('encounter')
    const companions = digest('companions')
    await wait(120)
    return { before, after: digest('encounter'), companions, output, candidates }
  })
  assert.ok(outcome.before.alpha > 0)
  assert.ok(outcome.after.alpha > 0)
  assert.ok(outcome.companions.alpha > 0)
  assert.equal(outcome.output.encounter.shiny, true)
  assert.equal(outcome.candidates.length, 2)
  const [first, second] = outcome.candidates.map(name => outcome.output.viewers[name].active.layer)
  assert.ok(first < second)
  for (const route of ['/encounter', '/companions']) assert.equal((await fetch(base + route)).status, 200)
  console.log('Electron: 1,025 choices, complete shiny sprites, rendered shiny encounter and companion layer order verified.')
} finally {
  socket.close()
}
