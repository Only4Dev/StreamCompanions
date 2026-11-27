import test from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { sessionKey } from './auth.js'
import { regionalSpecies } from '../ui/regional-species.js'
import { portal } from './portal.js'

test('two Twitch sign-in attempts each retain their own flow cookie', async () => {
  const env = { TWITCH_WEB_CLIENT_ID: 'fixture-client', TWITCH_WEB_CLIENT_SECRET: 'fixture-value' }
  const start = new URL('https://example.test/auth/twitch')
  const results = await Promise.all([portal(new Request(start), start, env), portal(new Request(start), start, env)])
  const states = results.map(result => new URL(result.headers.get('Location')).searchParams.get('state'))
  assert.notEqual(states[0], states[1])
  for (const [index, result] of results.entries()) {
    assert.ok(result.headers.getSetCookie()[0].startsWith('sc_flow_twitch_' + states[index] + '='))
  }
})

test('a signed-in viewer can save unlocked moves for an owned variant only', async () => {
  let saved
  const env = { DB: { prepare(sql) {
    return { bind(...args) {
      if (sql.startsWith('SELECT s.viewer_id')) return { first: async () => ({ viewer_id: 'twitch:123', account_id: 'owner' }) }
      if (sql.includes('shop_online')) return { first: async () => null }
      if (sql.includes('row_number')) return { all: async () => ({ results: [{
        community_id: 'channel', viewer_id: 'twitch:123',
        payload: JSON.stringify({ collection: { Rattata: 0, Charmander: 30 ** 2 * 120, Charizard: 30 ** 2 * 120,
          Dreepy: 15 ** 2 * 120, Drakloak: 15 ** 2 * 120 } })
      }] }) }
      if (sql.startsWith('SELECT moves')) return { first: async () => saved ? { moves: saved[3] } : null }
      return { run: async () => { saved = args } }
    } }
  } } }
  const session = 'a'.repeat(64)
  const headers = { Cookie: 'sc_session=' + session, Origin: 'https://example.test' }
  const save = (pokemon, move, ultimates = []) => {
    const url = new URL('https://example.test/moveset?community=channel&pokemon=' + encodeURIComponent(pokemon))
    const fields = new URLSearchParams({ move })
    for (const key of ultimates) fields.append('ultimate', key)
    return portal(new Request(url, { method: 'POST', headers, body: fields.toString() }), url, env)
  }
  assert.equal((await save('Rattata ✦', 'tackle')).status, 404)
  assert.equal((await save('Rattata', 'hydro')).status, 400)
  const empty = new URL('https://example.test/moveset?community=channel&pokemon=Rattata')
  assert.equal((await portal(new Request(empty, { method: 'POST', headers, body: '' }), empty, env)).status, 400)
  const response = await save('Rattata', 'tackle')
  assert.equal(response.status, 303)
  assert.deepEqual(saved, ['channel', 'twitch:123', 'Rattata', '{"moves":["tackle"],"selectedAt":1}', 'twitch:123', 'owner', session, await sessionKey(session), saved.at(-1)])
  const url = new URL(response.headers.get('Location'), 'https://example.test')
  const summary = await portal(new Request(url, { headers }), url, env)
  const summaryHtml = await summary.text()
  assert.match(summaryHtml, /Rattata.*Ataques activos.*Placaje.*Ataques guardados/)
  assert.match(summaryHtml, /CD 1,1 s · PP 20/)
  assert.match(summaryHtml, /Saldo actual: <strong data-shop-wallet="0">\$0<\/strong>/)
  assert.match(summaryHtml, /Puedes comprar cuando la app del streamer esté conectada y el juego activo/)
  assert.equal((await save('Charizard', 'ember', ['ultimate-fire', 'ultimate-flying'])).status, 400)
  assert.equal((await save('Charmander', 'ember', ['ultimate-flying'])).status, 400)
  assert.equal((await save('Charizard', 'ember', ['ultimate-ice'])).status, 400)
  const dual = await save('Charizard', 'ember', ['ultimate-flying'])
  assert.equal(dual.status, 303)
  assert.deepEqual(JSON.parse(saved[3]), { moves: ['ember'], ultimate: 'ultimate-flying', selectedAt: 31 })
  const dualUrl = new URL(dual.headers.get('Location'), url)
  const duelSummary = await portal(new Request(dualUrl, { headers }), dualUrl, env)
  const html = await duelSummary.text()
  assert.match(html, /value="ultimate-fire">/)
  assert.match(html, /value="ultimate-flying" selected/)
  const familyUrl = new URL('https://example.test/?community=channel&region=galar&pokemon=Dreepy')
  const family = await portal(new Request(familyUrl, { headers }), familyUrl, env)
  const familyHtml = await family.text()
  assert.match(familyHtml, /aria-current="page">Dreepy.*pokemon=Drakloak.*family-form locked[^>]*>Dragapult/)
  assert.match(familyHtml, /Nivel compartido de la línea · Nv. 16/)
  assert.match(familyHtml, /name="move"/)
  assert.match(familyHtml, /Se aprende al Nv\. 31/)
})

test('the moveset form disables saving when its last move is cleared', async () => {
  const url = new URL('https://example.test/assets/moveset.js')
  const response = await portal(new Request(url), url, {})
  const choice = { checked: true }
  const button = { disabled: false }
  const output = { textContent: '' }
  let change
  const form = {
    querySelectorAll: () => [choice],
    querySelector: selector => selector === 'output' ? output : button,
    addEventListener: (_, listener) => { change = listener }
  }
  runInNewContext(await response.text(), { document: { querySelector: () => form } })
  assert.equal(button.disabled, false)
  choice.checked = false
  change()
  assert.equal(button.disabled, true)
  assert.equal(output.textContent, '0 / 4')
  choice.checked = true
  change()
  assert.equal(button.disabled, false)
})

test('the portal uses the authenticated viewer and escapes synced display names', async () => {
  const url = new URL('https://example.test/?community=only4gx&viewer_id=twitch:999')
  const db = {
    prepare(sql) {
      return {
        bind(id) {
          if (sql.includes('web_sessions')) {
            assert.equal(id, 'a'.repeat(64))
            return { first: async () => ({ viewer_id: 'twitch:123', account_id: 'sc-account' }) }
          }
          assert.equal(id, 'sc-account')
          return { all: async () => ({ results: [{ community_id: 'only4gx', updated_at: 0,
            payload: JSON.stringify({ displayName: '<Viewer>', balls: { normal: 4, great: 0, ultra: 0, master: 0 },
              collection: { Weedle: 120, "Weedle ✦": 0 }, metrics: { wins: 4, losses: 2, summonMinutes: 93 } })
          }] }) }
        }
      }
    }
  }
  const result = await portal(new Request(url, { headers: { Cookie: 'sc_session=' + 'a'.repeat(64) } }), url, { DB: db })
  const html = await result.text()
  assert.match(html, /&lt;Viewer&gt;/)
  assert.match(html, /Weedle.*Lv\. 2/)
  assert.equal((html.match(/class="slot /g) ?? []).length, 151)
  assert.ok(html.indexOf('class="dex-number">#001') < html.indexOf('class="dex-number">#151'))
  assert.match(html, /class="slot locked"/)
  assert.match(html, /class="slot owned"/)
  assert.doesNotMatch(html, /twitch:999|<Viewer>/)
  assert.match(html, /✦ Shiny · Lv\. 1/)
  const inventoryUrl = new URL('https://example.test/?tab=inventory&community=only4gx')
  const inventory = await portal(new Request(inventoryUrl, {
    headers: { Cookie: 'sc_session=' + 'a'.repeat(64) }
  }), inventoryUrl, { DB: db })
  const inventoryHtml = await inventory.text()
  assert.match(inventoryHtml, /items\/poke-ball\.png.*Poké Ball.*<strong>×4/)
  assert.doesNotMatch(inventoryHtml, /class="slot |Images\/Items\/(greatball|ultraball|masterball)/)
  const overviewUrl = new URL('https://example.test/?tab=overview&community=only4gx')
  const overview = await portal(new Request(overviewUrl, {
    headers: { Cookie: 'sc_session=' + 'a'.repeat(64) }
  }), overviewUrl, { DB: db })
  assert.match(await overview.text(), /Victorias<\/dt><dd>4.*Derrotas<\/dt><dd>2.*1 h 33 min/)
  for (const [region, first, last] of [
    ['johto', '152', '251'], ['hoenn', '252', '386'], ['sinnoh', '387', '493'],
    ['unova', '494', '649'], ['kalos', '650', '721'], ['alola', '722', '809'],
    ['galar', '810', '898'], ['hisui', '899', '905'], ['paldea', '906', '1025']
  ]) {
    const regionUrl = new URL('https://example.test/?community=only4gx&region=' + region)
    const regionPage = await portal(new Request(regionUrl, {
      headers: { Cookie: 'sc_session=' + 'a'.repeat(64) }
    }), regionUrl, { DB: db })
    const html = await regionPage.text()
    const count = Number(last) - Number(first) + 1
    const numbers = [...html.matchAll(/class="dex-number">#(\d+)/g)].map(match => match[1])
    assert.equal(numbers[0], first)
    assert.equal(numbers[count - 1], last)
    assert.equal(numbers.length, count + regionalSpecies.filter(form => form.region === region).length)
    if (region === 'alola') assert.match(html, /Alolan Rattata/)
  }
  const chooserUrl = new URL('https://example.test/?community=another')
  const chooser = await portal(new Request(chooserUrl, {
    headers: { Cookie: 'sc_session=' + 'a'.repeat(64) }
  }), chooserUrl, { DB: db })
  const chooserHtml = await chooser.text()
  assert.match(chooserHtml, /Elige un streamer/)
  assert.match(chooserHtml, /community=only4gx/)
  assert.doesNotMatch(chooserHtml, /class="slot /)
})

test('the sign-in chooser displays Twitch and a pending Kick option', async () => {
  const url = new URL('https://example.test/')
  const html = await (await portal(new Request(url), url, {
    TWITCH_WEB_CLIENT_ID: 'twitch-test', TWITCH_WEB_CLIENT_SECRET: 'test'
  })).text()
  assert.match(html, /href="\/auth\/twitch"/)
  assert.match(html, /Kick <small>Próximamente/)
  assert.match(html, /Continuar con Twitch/)
  assert.match(html, /Puedes vincular la otra plataforma/)
})

test('the portal displays English and persists the language choice', async () => {
  const url = new URL('https://example.test/?lang=en')
  const response = await portal(new Request(url), url, {})
  assert.match(await response.text(), /<html lang="en" data-theme="dark">.*Your companion album/s)
  assert.match(response.headers.get('Set-Cookie'), /sc_lang=en/)
  const home = new URL('https://example.test/')
  const saved = await portal(new Request(home, { headers: { Cookie: 'sc_lang=en; sc_theme=light' } }), home, {})
  assert.match(await saved.text(), /<html lang="en" data-theme="light">.*Dark mode.*Your companion album/s)
})

test('help is public, localized, and keeps the selected community when returning to Dex', async () => {
  const url = new URL('https://example.test/?tab=help&community=only4gx&lang=en')
  const result = await portal(new Request(url), url, {})
  const html = await result.text()
  assert.match(html, /How to play/)
  assert.match(html, /Twitch or Kick chat/)
  assert.match(html, /!invocarshiny weedle/)
  assert.match(html, /community=only4gx&amp;tab=dex/)
  const spanish = new URL('https://example.test/?tab=help')
  const spanishHtml = await (await portal(new Request(spanish), spanish, {})).text()
  assert.match(spanishHtml, /Cómo jugar/)
  assert.match(spanishHtml, /Comandos de chat/)
})
