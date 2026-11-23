import assert from 'node:assert/strict'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import electron from 'electron'

const folder = await mkdtemp(join(tmpdir(), 'stream-companions-restart-'))
const base = 'http://127.0.0.1:43127'
let child
let socket
let cookie
async function start() {
  assert.equal(await fetch(base).then(() => true, () => false), false, 'Expected a free local port')
  child = spawn(electron, ['.', '--user-data-dir=' + folder, '--remote-debugging-port=0'], { windowsHide: true, stdio: 'ignore' })
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const [port] = (await readFile(join(folder, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)
      const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()
      const page = targets.find(target => target.url === base + '/')
      if (page) {
        socket = new WebSocket(page.webSocketDebuggerUrl)
        await once(socket, 'open')
        const data = await cdp('Network.getCookies', { urls: [base] })
        cookie = 'sc_local_control=' + data.cookies.find(item => item.name === 'sc_local_control').value
        return
      }
    } catch { socket?.close() }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('Electron failed to start')
}
let commandId = 0
function cdp(method, params = {}) {
  const id = ++commandId
  return new Promise(resolve => {
    const read = ({ data }) => {
      const message = JSON.parse(data)
      if (message.id !== id) return
      socket.removeEventListener('message', read)
      resolve(message.result)
    }
    socket.addEventListener('message', read)
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function stop() {
  if (child?.exitCode !== null) return
  const timeout = AbortSignal.timeout(8000)
  const closed = once(child, 'exit', { signal: timeout })
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: ++commandId, method: 'Page.close' }))
  else child.kill()
  try { await closed } catch (error) { child.kill(); throw error }
  finally { socket?.close() }
  assert.equal(await fetch(base + '/state?overlay=companions').then(() => true, () => false), false)
}
async function send(action) {
  const response = await fetch(base + '/demo', {
    method: 'POST',
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(action)
  })
  assert.equal(response.status, 204)
}
const state = async () => (await (await fetch(base + '/state', { headers: { Cookie: cookie } })).json())
try {
  await start()
  const evaluate = async expression => (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value
  assert.equal(await evaluate(`(async()=>{
    for(let i=0;i<24 && !document.querySelector('.battle-preview');i++) await new Promise(r=>setTimeout(r,100));
    if(document.querySelector('[data-pane=home]').hidden || !document.querySelector('[data-pane=game]').hidden) return 'wrong startup pane';
    document.querySelector('[data-view=about]').click();
    if(document.querySelector('[data-pane=about]').hidden || !/\\d+\\.\\d+\\.\\d+/.test(document.querySelector('#app-version').textContent) || !document.querySelector('#check-updates').textContent) return 'about missing';
    document.querySelector('[data-view=game]').click();
    if(document.querySelectorAll('#settings .help-tip').length < 14) return 'settings help missing';
    document.querySelector('[data-view=shop]').click();
    if(!document.querySelector('#shop-price-fields img')) return 'shop icons missing';
    document.querySelector('[data-view=obs]').click();
    if(!document.querySelector('.battle-preview') || document.querySelector('[data-view=battle]')) return 'battle preview missing';
    document.querySelector('#preview-encounter').click();
    if(!(await (await fetch('/state?overlay=encounter')).json()).encounter) return 'ok';
    return 'preview leaked to overlay';
  })()`), 'ok')
  assert.equal((await fetch(base + '/state')).status, 403)
  assert.equal((await fetch(base + '/state?overlay=companions')).status, 200)
  assert.equal((await fetch(base + '/demo', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{}' })).status, 403)
  assert.deepEqual((await state()).viewers, {})
  assert.equal((await state()).config.running, false)
  await send({ running: true })
  await send({ config: { interval: 45, duration: 3, shiny: 1 } })
  await send({ spawn: 'Rattata' })
  let viewer
  for (let index = 0; index < 10 && !viewer; index++) {
    const name = 'Restart ' + index
    await send({ viewer: name, message: '!poke join' })
    for (let attempt = 0; attempt < 5; attempt++) await send({ viewer: name, message: '!catch' })
    if ((await state()).viewers[name].collection['Rattata ✦'] !== undefined) viewer = name
  }
  assert.ok(viewer)
  await send({ viewer, message: '!summonshiny rattata' })
  await new Promise(resolve => setTimeout(resolve, 200))
  await send({ viewer, message: 'hola' })
  const before = (await state()).viewers[viewer]
  await send({ running: false })
  await stop()
  await start()
  const after = await state()
  assert.equal(after.config.interval, 45)
  assert.equal(after.config.running, false)
  assert.equal(after.encounter, null)
  assert.deepEqual(after.viewers[viewer].balls, before.balls)
  assert.ok(after.viewers[viewer].collection['Rattata ✦'] > 0)
  assert.equal(after.viewers[viewer].active, null)
  assert.equal(after.encounterCount, 0)
  assert.ok(after.statistics.encounters >= 1 && after.statistics.captures >= 1)
  await send({ clearStatistics: true })
  assert.deepEqual((await state()).statistics, { encounters: 0, captures: 0 })
  assert.equal((await state()).viewers[viewer].collection['Rattata ✦'], after.viewers[viewer].collection['Rattata ✦'])
  await send({ running: true })
  await send({ viewer, message: '!poke join' })
  assert.deepEqual((await state()).viewers[viewer].balls, before.balls)
  console.log('Electron window close releases the port. Private panel, public overlay and SQLite restart verified.')
} finally {
  await stop()
}
