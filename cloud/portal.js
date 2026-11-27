import { expireShopOrders } from './shop-queue.js'
import { enqueueWebGame, webGameStatus, webGameViewer } from './web-game.js'
import { botCopy } from '../ui/bot-copy.js'
import { helpPage } from './help.js'
import { aboutCopy, projectLinks } from '../ui/about.js'
import appPackage from '../package.json' with { type: 'json' }
import { webEnglish } from "./web-copy.js"
import { authorizeUrl, eraseAccount, platformIdentity, providerConfig, sessionKey, signIn, unlinkIdentity } from './auth.js'
import { nationalDex } from './national-dex.js'
import { kanto } from './kanto.js'
import { equippedMoves, moveCooldown, movePp, moves } from '../dev/battle.js'
import { familyDnaCount, familyRoot, maxDnaBoosters } from '../ui/evolution.js'
import { creatureMoves, parseLoadout, speciesName, validMoveset } from './movesets.js'
import { portalStyles, dexStyles, providerStyles, languageStyles, helpStyles, darkStyles, mobileStyles, liveReactionStyles } from './portal-style.js'
import { level, maxLevel, ultimateLevel, xpAtLevel } from '../ui/levels.js'
import { arenaShopItems, heldItems } from '../ui/held-items.js'
import { featuredShopItems, maxShopQuantity, shopIconUrl, shopItems, validShopQuantity } from '../ui/shop.js'

function communityTabs(community, language, current, region = 'kanto') {
  const en = language === 'en'
  const tabs = [['dex', 'Pokédex'], ['inventory', en ? 'Inventory' : 'Inventario'], ['shop', en ? 'Shop' : 'Tienda'],
    ['overview', en ? 'Overview' : 'Resumen'], ['log', en ? 'Log' : 'Registro'], ['live', en ? 'Play on the web' : 'Jugar en web'],
    ['help', en ? 'Help' : 'Ayuda']]
  return '<nav class="tabs community-tabs" aria-label="' + (en ? 'Community' : 'Comunidad') + '">' + tabs.map(([tab, label]) =>
    '<a href="/?' + escape(new URLSearchParams({ community, tab, region })) + '"' + (current === tab ? ' aria-current="page"' : '') +
    '>' + label + '</a>').join('') + '</nav>'
}

const announcementsScript = `(() => {
const feed = document.querySelector('[data-announcements]');
const query = new URLSearchParams({community: feed.dataset.announcements});
const list = feed.querySelector('ol');
const empty = feed.querySelector('[data-announcements-empty]');
let latest = '';
async function refresh() {
  try {
    if (!document.hidden) {
      const response = await fetch('/live/announcements?' + query);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const { events } = await response.json();
      const key = events.map(event => event.id).join(',');
      if (key !== latest) {
        latest = key;
        list.replaceChildren(...events.map(({ message }) => {
          const row = document.createElement('li');
          row.textContent = message;
          return row;
        }));
        empty.hidden = events.length > 0;
      }
    }
  } catch {}
  setTimeout(refresh, document.hidden ? 10000 : 2500);
}
refresh();
})();`

function renderAnnouncements(community, language) {
  const en = language === 'en'
  return '<section class="sheet" data-announcements="' + escape(community) + '"><h2>' +
    (en ? 'Bot announcements' : 'Avisos del bot') + '</h2><p class="meta" data-announcements-empty>' +
    (en ? 'No announcements yet.' : 'Todavía no hay avisos.') +
    '</p><ol class="announcement-feed" role="log" aria-live="polite" aria-relevant="additions"></ol></section>' +
    '<script src="/assets/announcements.js" defer></script>'
}

const webGameScript = `(() => {
const root = document.querySelector('[data-web-game]');
const status = root.querySelector('[role=status]');
const capture = root.querySelector('[data-capture-form]');
const endpoint = new URL('/live/status', location.origin);
endpoint.search = location.search;
let submitting = false;
let timer;
let version = 0;
let lastLog = '';
let clearReaction;
const reaction = document.querySelector('[data-live-reaction]');
const shinyOptIn = root.querySelector('[data-shiny-audio]');
const shinyUrl = new URL('/live/shiny-cue', endpoint);
shinyUrl.searchParams.set('community', endpoint.searchParams.get('community'));
shinyUrl.searchParams.set('platform', endpoint.searchParams.get('platform'));
const shinyAudio = new Audio();
let lastEncounter;
const shinyPreference = 'sc-web-shiny-audio';
try { shinyOptIn.checked = localStorage.getItem(shinyPreference) === '1'; } catch {}
function playShiny() {
  shinyUrl.searchParams.set('play', Date.now());
  shinyAudio.src = shinyUrl;
  shinyAudio.volume = .55;
  return shinyAudio.play();
}
shinyOptIn.addEventListener('change', () => {
  try { localStorage.setItem(shinyPreference, shinyOptIn.checked ? '1' : '0'); } catch {}
  if (shinyOptIn.checked) playShiny().catch(() => {});
  else shinyAudio.pause();
});
function showFeedback(message, result, captureAction = false) {
  const kind = result === 'catchSuccess' ? 'catch' : captureAction || result === 'escaped' ? 'miss' :
    ['summoned', 'removed', 'candyUsed', 'trackerUsed'].includes(result) ? 'success' : 'warning';
  status.dataset.feedback = kind;
  status.textContent = message;
  if (!reaction) return;
  clearTimeout(clearReaction);
  const badge = document.createElement('span');
  badge.className = 'live-reaction-badge';
  badge.dataset.effect = kind;
  const icon = document.createElement('span');
  icon.className = kind === 'catch' || kind === 'miss' ? 'live-reaction-ball' : 'live-reaction-symbol';
  icon.textContent = kind === 'success' ? '✓' : kind === 'warning' ? '!' : '';
  const text = document.createElement('span');
  text.textContent = message;
  badge.append(icon, text);
  reaction.replaceChildren(badge);
  clearReaction = setTimeout(() => reaction.replaceChildren(), 4200);
}
let actionType = '';
function schedule(delay) {
  clearTimeout(timer);
  timer = setTimeout(refresh, delay);
}
root.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || endpoint.searchParams.has('game')) return;
  const form = event.target;
  const data = new URLSearchParams(new FormData(form));
  actionType = data.get('action');
  delete status.dataset.feedback;
  submitting = true;
  version++;
  clearTimeout(timer);
  status.textContent = root.dataset.waiting;
  for (const button of root.querySelectorAll('button')) button.disabled = true;
  try {
    const response = await fetch(form.getAttribute('action'), {method: 'POST', body: data, headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    status.textContent = result.message || root.dataset.waiting;
    if (result.id) endpoint.searchParams.set('game', result.id);
    else if (result.message) showFeedback(result.message, result.result, actionType === 'catch');
    form.elements.namedItem('id').value = crypto.randomUUID();
  } catch {
    showFeedback(root.dataset.failed, 'network');
  } finally {
    submitting = false;
    void refresh();
  }
});
async function refresh() {
  const current = version;
  try {
    const response = await fetch(endpoint, {cache: 'no-store', signal: AbortSignal.timeout(8000)});
    if (current !== version) return;
    if (response.status === 401 || response.status === 404) {
      status.textContent = root.dataset.failed;
      return;
    }
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const state = await response.json();
    if (current !== version) return;
    if (lastEncounter !== undefined && state.encounter && state.encounter !== lastEncounter && state.shiny && shinyOptIn.checked) {
      playShiny().catch(() => {});
    }
    lastEncounter = state.encounter;
    capture.querySelector('input[name="encounter"]').value = state.encounter || '';
    root.querySelector('[data-capture-difficulty]').textContent = state.difficulty || root.dataset.noEncounter;
    for (const input of capture.querySelectorAll('input[name="ball"]')) {
      const amount = state.balls?.[input.value] ?? 0;
      input.disabled = amount < 1;
      input.parentElement.querySelector('[data-ball-count]').textContent = '×' + amount;
    }
    if (!capture.querySelector('input[name="ball"]:checked:not(:disabled)')) {
      const available = capture.querySelector('input[name="ball"]:not(:disabled)');
      if (available) available.checked = true;
    }
    capture.querySelector('button').disabled = submitting || state.pending || !state.encounter ||
      !capture.querySelector('input[name="ball"]:checked:not(:disabled)');
    for (const button of root.querySelectorAll('form:not([data-capture-form]) button')) {
      const maximum = button.hasAttribute('data-tracker-use') ? state.legendaryTrackers || 0 : button.hasAttribute('data-candy-use') ? state.rareCandies || 0 : Infinity;
      button.disabled = submitting || state.pending || !state.online || maximum < 1;
    }
    root.querySelector('[data-tracker-count]').textContent = '×' + (state.legendaryTrackers || 0);
    root.querySelector('[data-candy-count]').textContent = '×' + (state.rareCandies || 0);
    const activity = root.querySelector('[data-live-activity]');
    const key = JSON.stringify(state.activity ?? []);
    if (key !== lastLog) {
      lastLog = key;
      activity.replaceChildren(...(state.activity ?? []).map(entry => {
        const row = document.createElement('li');
        row.textContent = entry.action + ' · ' + entry.message;
        return row;
      }));
    }
    if (!state.pending && state.result && endpoint.searchParams.has('game')) {
      showFeedback(state.message, state.result, actionType === 'catch');
    } else if (state.message) status.textContent = state.message;
    else if (!state.online) status.textContent = root.dataset.offline;
    else if (status.textContent === root.dataset.offline) status.textContent = '';
    if (!state.pending) endpoint.searchParams.delete('game');
    schedule(state.pending ? 500 : 2500);
  } catch (error) {
    console.warn('Could not refresh live game status', error);
    if (current === version) schedule(2500);
  }
}
refresh();
})();`

function defaultShinyCue() {
  const rate = 16000
  const samples = 10080
  const bytes = new ArrayBuffer(44 + samples * 2)
  const header = new DataView(bytes)
  for (const [offset, tag] of [[0, 'RIFF'], [8, 'WAVE'], [12, 'fmt '], [36, 'data']]) {
    for (let index = 0; index < tag.length; index++) header.setUint8(offset + index, tag.charCodeAt(index))
  }
  for (const [offset, value] of [[4, bytes.byteLength - 8], [16, 16], [24, rate], [28, rate * 2], [40, samples * 2]]) header.setUint32(offset, value, true)
  for (const [offset, value] of [[20, 1], [22, 1], [32, 2], [34, 16]]) header.setUint16(offset, value, true)
  for (let index = 0; index < samples; index++) {
    const time = index / rate
    const note = Math.floor(time / .21)
    const phase = time - note * .21
    const frequency = [659.25, 880, 1318.51][note]
    header.setInt16(44 + index * 2, Math.round(Math.sin(2 * Math.PI * frequency * phase) *
      Math.min(1, phase * 80) * Math.max(0, 1 - phase / .21) * 13000), true)
  }
  return bytes
}

function webGameState(runtime, row, language) {
  const en = language === 'en'
  const online = Boolean(runtime?.seen_at > Date.now() - 20000)
  const pending = Boolean(row && !row.result && row.created_at > Date.now() - 15000)
  const result = row?.result || (row && !pending ? 'expired' : '')
  const messages = {
    catchSuccess: en ? 'You caught the Pokémon!' : '¡Capturaste al Pokémon!',
    ballInventory: en ? 'Checked Poké Ball inventory.' : 'Consultó el inventario de Poké Balls.',
    summoned: en ? 'Companion summoned.' : 'Compañero invocado.',
    removed: en ? 'Companion withdrawn.' : 'Compañero retirado.',
    expired: en ? 'The encounter or request expired.' : 'El encuentro o la solicitud caducó.',
    pending: en ? 'An action is already pending.' : 'Ya hay una acción pendiente.',
    offline: en ? 'The streamer’s app is offline.' : 'La app del streamer está desconectada.',
    cooldown: en ? 'Wait five seconds between commands in this channel.' : 'Espera cinco segundos entre comandos en este canal.',
    noBalls: en ? 'You have none of the selected Poké Ball.' : 'No te quedan Poké Balls del tipo elegido.',
    escaped: en ? 'The Pokémon escaped.' : 'El Pokémon escapó.'
  }
  const message = pending ? (en ? 'Waiting for the streamer’s app…' : 'Esperando a la app del streamer…') :
    result ? messages[result] || botCopy[language][result] || (en ? 'The action could not be completed.' : 'No se pudo completar la acción.') : ''
  return { online, pending, message, ...(result ? { result } : {}), encounter: online ? runtime.encounter_id : null,
    difficulty: online ? runtime[en ? 'difficulty_en' : 'difficulty_es'] : null, ...(online && runtime.shiny ? { shiny: true } : {}) }
}

async function viewerSession(request, db) {
  const session = getCookie(request, 'sc_session')
  const key = /^[a-f0-9]{64}$/.test(session ?? '') ? await sessionKey(session) : null
  const identity = key ? await db.prepare(
    'SELECT s.viewer_id, s.login, ident.account_id FROM web_sessions s ' +
    'JOIN account_identities ident ON ident.viewer_id = s.viewer_id WHERE s.id IN (?, ?) AND s.expires_at > ? AND ident.detached_at IS NULL'
  ).bind(session, key, Date.now()).first() : null
  return { session, key, identity }
}

async function renderLiveGame(request, db, url, language) {
  const en = language === 'en'
  const community = url.searchParams.get('community')
  const platform = url.searchParams.get('platform')
  const { identity } = await viewerSession(request, db)
  const viewer = identity && await webGameViewer(db, identity.account_id, community, platform)
  if (!viewer) return '<section class="sheet" id="play-web"><h2>' + (en ? 'Play on the web' : 'Jugar en web') + '</h2><p>' + (en ? 'Sign in and link your channel account to play.' : 'Inicia sesión y vincula tu cuenta del canal para jugar.') + ' <a href="/">' +
    (en ? 'Viewer portal' : 'Portal de viewers') + '</a></p></section>'
  const { collection, balls, legendaryTrackers = 0, rareCandies = 0 } = JSON.parse(viewer.payload)
  const runtime = await db.prepare('SELECT * FROM web_game_runtime WHERE community_id = ?').bind(community).first()
  const id = url.searchParams.get('game')
  const row = ['offline', 'expired', 'pending'].includes(id) ? { result: id } : await webGameStatus(db, identity.account_id, community, id)
  const state = webGameState(runtime, row, language)
  const destination = escape('/live/action?' + new URLSearchParams({ community, platform }))
  const open = (action, extra = '') => '<form method="post" action="' + destination + '"' + extra + '>' +
    '<input type="hidden" name="id" value="' + crypto.randomUUID() + '"><input type="hidden" name="action" value="' + action + '">'
  const disabled = !state.online || state.pending ? ' disabled' : ''
  const names = [['normal', 'Poké Ball', 'poke-ball'], ['great', en ? 'Great Ball' : 'Super Ball', 'great-ball'],
    ['ultra', 'Ultra Ball', 'ultra-ball'], ['master', 'Master Ball', 'master-ball']]
  const firstAvailable = names.find(([type]) => balls[type] > 0)?.[0]
  const options = names.map(([type, name, icon]) =>
    '<label class="live-ball"><input type="radio" name="ball" value="' + type + '" required' +
    (type === firstAvailable ? ' checked' : '') + (balls[type] > 0 ? '' : ' disabled') + '>' +
    itemIcon(icon) + '<span>' + name + '</span><strong data-ball-count>×' + escape(balls[type] ?? 0) + '</strong></label>').join('')
  const creatures = Object.keys(collection).sort().map(name => '<option>' + escape(name) + '</option>').join('')
  const noEncounter = en ? 'No Pokémon available to catch.' : 'No hay un Pokémon disponible para capturar.'
  return '<section class="sheet" id="play-web" data-web-game data-waiting="' + (en ? 'Sending action…' : 'Enviando acción…') +
    '" data-failed="' + (en ? 'Could not send the action. Try again.' : 'No se pudo enviar la acción. Intenta de nuevo.') +
    '" data-offline="' + (en ? 'Waiting for the streamer to start the app…' : 'Esperando a que el streamer inicie la app…') +
    '" data-no-encounter="' + noEncounter + '"><h2>' + (en ? 'Play on the web' : 'Jugar en web') +
    '</h2><p class="live-game-status" role="status">' + escape(state.message) + '</p><div class="live-game-grid">' +
    '<section class="live-game-card"><h3>' + (en ? 'Catch' : 'Captura') + '</h3><p class="meta" data-capture-difficulty>' +
    escape(state.difficulty ?? noEncounter) + '</p>' +
    open('catch', ' data-capture-form') + '<input type="hidden" name="encounter" value="' + escape(state.encounter ?? '') + '">' +
    '<fieldset class="live-balls"><legend>' + (en ? 'Choose a Poké Ball' : 'Elige una Poké Ball') + '</legend>' + options +
    '</fieldset><button' + (state.encounter && firstAvailable ? disabled : ' disabled') + '>' +
    (en ? 'Catch' : 'Capturar') + '</button></form></section>' +
    '<section class="live-game-card"><h3>' + (en ? 'Companion' : 'Compañero') + '</h3><div class="live-companion">' +
    (creatures ? open('summon') + '<label>Pokémon <select name="pokemon">' + creatures + '</select></label><button' +
      disabled + '>' + (en ? 'Summon' : 'Invocar') + '</button></form>' : '') +
    open('withdraw') + '<button class="live-secondary"' + disabled + '>' + (en ? 'Withdraw' : 'Retirar') + '</button></form></div>' +
    open('candy', ' class="live-candy"') + '<p class="meta live-item-count">' + itemIcon('rare-candy') + ' <strong data-candy-count>×' + rareCandies + '</strong></p><label>' + (en ? 'Rare Candy quantity' : 'Cantidad de Caramelos Raros') +
    ' <input type="number" name="quantity" min="1" max="50" value="1" required></label><button' +
    (rareCandies ? disabled : ' disabled') + ' data-candy-use>' + (en ? 'Use Rare Candy' : 'Usar Caramelo Raro') + '</button></form></section>' +
    '<section class="live-game-card"><h3>' + (en ? 'Key Items' : 'Objetos clave') + '</h3>' + open('tracker') +
    '<p class="meta live-item-count">' + itemIcon('dowsing-machine') + ' Legendary Tracker <strong data-tracker-count>×' + legendaryTrackers + '</strong></p><button data-tracker-use' +
    (legendaryTrackers ? disabled : ' disabled') + '>' + (en ? 'Use Legendary Tracker' : 'Usar Legendary Tracker') + '</button></form></section>' +
    '</div><label><input type="checkbox" data-shiny-audio> ' + (en ? 'Play shiny sounds' : 'Reproducir sonidos shiny') + '</label><details class="live-activity" open><summary>' + (en ? 'Your game activity' : 'Tu actividad de juego') +
    '</summary><ol data-live-activity></ol></details></section><script src="/assets/web-game.js?v=6" defer></script>'

}

const families = new Map()
for (const entry of nationalDex) {
  const root = familyRoot(entry[0])
  if (!families.has(root)) families.set(root, [])
  families.get(root).push(entry)
}
const familyLinks = id => families.get(familyRoot(id)) ?? []
const dexByName = new Map(nationalDex.map(([id]) => [speciesName(id), id]))
function sharedDna(boosters, key) {
  const name = key.replace(/ ✦$/, '')
  const id = dexByName.get(name)
  const names = id ? familyLinks(id).map(([member]) => speciesName(member)) : [name]
  return familyDnaCount(boosters, names.flatMap(name => [name, name + ' ✦']))
}
const typeNames = {
  normal: 'Normal', fighting: 'Lucha', flying: 'Volador', poison: 'Veneno', ground: 'Tierra', rock: 'Roca',
  bug: 'Bicho', ghost: 'Fantasma', steel: 'Acero', fire: 'Fuego', water: 'Agua', grass: 'Planta',
  electric: 'Eléctrico', psychic: 'Psíquico', ice: 'Hielo', dragon: 'Dragón', dark: 'Siniestro', fairy: 'Hada'
}
const typeIds = Object.keys(typeNames)
const itemIcon = item => '<img class="bag-icon" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/' + item + '.png" alt="" width="30" height="30">'
function typeIcon(type, en) {
  const id = typeIds.indexOf(type) + 1
  if (!id) return ''
  const name = en ? type[0].toUpperCase() + type.slice(1) : typeNames[type]
  return '<img class="type-icon" width="26" height="26" alt="' + name + '" title="' + name + '" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/sword-shield/small/' + id + '.png">'
}

const helpHint = (label, copy) => '<details class="portal-hint"><summary aria-label="' + escape(label) + '">?</summary><p>' + escape(copy) + '</p></details>'

function moveCard(key, selected, en, unlockLevel = 0) {
  const move = moves[key]
  const ultimate = Boolean(move.ultimate)
  const fieldTypes = { rain: 'water', sun: 'fire', electric: 'electric', grass: 'grass' }
  const type = move.type ?? fieldTypes[move.field] ?? ({ speed: 'psychic', evasion: 'normal', mind: 'psychic' })[move.boost] ?? (ultimate ? move.ultimate : 'normal')
  const target = move.field || ['area', 'pierce'].includes(move.kind) ? (en ? 'Area' : 'Área') :
    move.kind === 'guard' ? (en ? 'Self' : 'Propio') : (en ? 'Single target' : 'Un objetivo')
  const effects = {
    paralysis: ['Parálisis', 'Paralysis'], freeze: ['Congelación', 'Freeze'], burn: ['Quemadura', 'Burn'],
    sleep: ['Sueño', 'Sleep'], poison: ['Envenenamiento', 'Poison'], speed: ['Aumenta la velocidad', 'Boosts speed'],
    evasion: ['Aumenta la evasión', 'Boosts evasion'], mind: ['Refuerza la defensa especial', 'Boosts special defense'],
    rain: ['Convoca lluvia', 'Calls rain'], sun: ['Intensifica el sol', 'Intensifies sunlight'],
    hail: ['Convoca granizo', 'Calls hail'], sandstorm: ['Convoca una tormenta de arena', 'Calls a sandstorm'],
    grass: ['Activa el campo de hierba', 'Sets grassy terrain'], electric: ['Activa el campo eléctrico', 'Sets electric terrain'],
    blink: ['Se teletransporta', 'Teleports'], leech: ['Drena PS con el tiempo', 'Drains HP over time'],
    slow: ['Ralentiza al objetivo', 'Slows the target'], shield: ['Bloquea ataques normales brevemente', 'Briefly blocks regular attacks'],
    heal: ['Con ≤20 % de PS, recupera el 40 %', 'At ≤20% HP, restores 40%']
  }
  const effect = effects[move.effect ?? move.boost ?? move.field ?? (move.blink ? 'blink' : move.leech ? 'leech' : move.slow ? 'slow' : move.heal ? 'heal' : 'shield')]
  const note = move.effect || !(move.power > 0) && !ultimate
    ? '<small>' + effect[Number(en)] + (move.chance ? ' · ' + Math.round(move.chance * 100) + ' %' : '') + '</small>' :
    move.ongoing ? '<small>' + (en ? 'Damage over time' : 'Daño con el tiempo') + '</small>' :
    move.flinch ? '<small>' + (en ? 'Flinch' : 'Amedrentar') + ' · ' + Math.round(move.flinch * 100) + ' %</small>' : ''
  const power = move.power > 0 ? 'BP ' + move.power + (move.count ? ' × ' + move.count : '') : (en ? 'Status' : 'Estado')
  const selectable = !ultimate && !unlockLevel
  const tag = selectable ? 'label' : 'div'
  return '<' + tag + ' class="move-card' + (unlockLevel ? ' move-locked' : '') + '">' +
    (selectable ? '<input type="checkbox" name="move" value="' + escape(key) + '"' + (selected ? ' checked' : '') + '>' : '') +
    '<span class="move-title">' + typeIcon(type, en) + '<strong>' + escape(move.name) + '</strong></span>' +
    '<span class="move-limits">' + (ultimate ? (en ? 'Charge' : 'Carga') : 'CD ' + moveCooldown(move).toLocaleString(en ? 'en' : 'es') + ' s') + ' · PP ' + movePp(move) + '</span>' +
    '<small>' + power + ' · ' + target + '</small>' + (unlockLevel ? '<small>' + (en ? 'Unlocks at Lv. ' : 'Se aprende al Nv. ') + unlockLevel + '</small>' : note) + '</' + tag + '>'
}

const cookie = (name, value, seconds) =>
  name + '=' + value + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + seconds
const getCookie = (request, name) => request.headers.get('Cookie')?.split(';')
  .map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1)
const randomId = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

function renderPage(body, status, language, theme, url) {
  const viewQuery = url.pathname === '/' ? new URLSearchParams(url.search) : new URLSearchParams()
  for (const key of [...viewQuery.keys()]) {
    if (!['community', 'tab', 'region', 'pokemon', 'account', 'lang', 'theme', 'pocket'].includes(key)) viewQuery.delete(key)
  }
  const languageLinks = ['es', 'en'].map(item => {
    const query = new URLSearchParams(viewQuery)
    query.delete('theme')
    query.set('lang', item)
    return '<a href="/?' + escape(query) + '"' + (language === item ? ' aria-current="true"' : '') + '><span class="flag flag-' + (item === 'es' ? 'es' : 'us') + '" aria-hidden="true"></span> ' + item.toUpperCase() + '</a>'
  }).join('')
  const themeQuery = new URLSearchParams(viewQuery)
  themeQuery.set('theme', theme === 'dark' ? 'light' : 'dark')
  const themeLabel = theme === 'dark' ? (language === 'en' ? 'Light mode' : 'Modo claro') : (language === 'en' ? 'Dark mode' : 'Modo oscuro')
  const themeLink = '<a href="/?' + escape(themeQuery) + '">' + themeLabel + '</a>'
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'; media-src 'self'; frame-src https://player.twitch.tv https://player.kick.com; img-src https://raw.githubusercontent.com https://static-cdn.jtvnw.net https://*.kick.com; style-src 'unsafe-inline'; form-action 'self' https://id.kick.com https://id.twitch.tv; frame-ancestors 'none'" })
  headers.append('Set-Cookie', cookie('sc_lang', language, 31_536_000))
  headers.append('Set-Cookie', cookie('sc_theme', theme, 31_536_000))
  return new Response('<!doctype html><html lang="' + language + '" data-theme="' + theme + '"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Stream Companions</title><style>' + portalStyles + dexStyles + providerStyles + languageStyles + helpStyles + darkStyles + mobileStyles + liveReactionStyles + '</style>' +
    '<main><header class="mast"><span class="mark" aria-hidden="true">✦</span>Stream Companions<nav class="web-language" aria-label="' + (language === 'en' ? 'Portal navigation' : 'Navegación del portal') + '"><a href="/">' +
    (language === 'en' ? 'Home' : 'Inicio') + '</a>' + '<a class="help-header" href="?' + escape(new URLSearchParams({
      tab: 'help', ...(url.searchParams.get('community') ? { community: url.searchParams.get('community') } : {})
    })) + '">' + (language === 'en' ? 'Help' : 'Ayuda') + '</a><a href="/?tab=about">' + aboutCopy[language].about + '</a><a href="/?tab=live">' + (language === 'en' ? 'Live' : 'En directo') + '</a>' + themeLink + languageLinks + '</nav></header>' + body + '</main></html>', { status, headers })
}

function redirect(location, cookies) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
  for (const item of cookies) headers.append('Set-Cookie', item)
  return new Response(null, { status: 303, headers })
}

const providers = { twitch: 'Twitch', kick: 'Kick' }

function platformButton(provider, enabled, t, language) {
  const name = providers[provider]
  const icon = '<span class="provider-icon" aria-hidden="true">' + (provider === 'twitch' ? '◫' : 'K') + '</span>'
  return enabled
    ? '<a class="button provider ' + provider + '" href="/auth/' + provider + '">' + icon + (language === 'en' ? 'Continue with ' : 'Continuar con ') + name + '</a>'
    : '<span class="button provider unavailable" aria-disabled="true">' + icon + name + ' <small>' + t('Próximamente') + '</small></span>'
}

function quantityField(en, price, limit) {
  return '<div class="shop-quantity"><label>' + (en ? 'Quantity' : 'Cantidad') + ' <input type="number" name="quantity" data-shop-quantity="' +
    price + '" min="1" max="' + Math.max(1, limit) + '" value="1" required></label><span>Total <output aria-live="polite">$' + price + '</output></span></div>'
}

function submittingPurchase(en) {
  return '<span role="status" data-shop-submitting hidden>' + (en ? 'Sending order…' : 'Enviando pedido…') + '</span>'
}

function hatchDialog(en) {
  return '<dialog class="egg-dialog" data-hatch aria-labelledby="egg-title" data-opening="' + (en ? 'The egg is hatching…' : '¡El huevo está eclosionando!') +
    '" data-reveal="' + (en ? 'Your egg hatched!' : '¡Tu huevo eclosionó!') + '"><h2 id="egg-title"></h2>' +
    '<div class="egg-stage" aria-hidden="true"><div class="egg-rays"></div><div class="egg-shell"><i></i><i></i></div><img width="104" height="104" alt=""></div>' +
    '<p data-hatch-result aria-live="polite"></p><form method="dialog"><button>' + (en ? 'Close' : 'Cerrar') + '</button></form></dialog>'
}

function pendingPurchase(en) {
  return ' data-order-pending aria-live="polite" data-waiting="' +
    (en ? 'Still waiting for the streamer’s app. Please wait.' : 'Seguimos esperando a la app del streamer. Espera un momento.') + '"'
}

export async function portal(request, url, env) {
  if (request.method === 'GET' && url.pathname === '/assets/dex-new.js') {
    return new Response(`function dismiss(event) {
      const card = event.target.closest('[data-dex-new]');
      if (!card) return;
      const query = new URLSearchParams({ community: card.closest('[data-dex-community]').dataset.dexCommunity, species: card.dataset.dexNew, at: card.dataset.acquired });
      delete card.dataset.dexNew;
      card.querySelector('.dex-new').hidden = true;
      fetch('/dex/seen?' + query, {method: 'POST', keepalive: true}).catch(() => {});
    }
    document.addEventListener('pointerover', dismiss);
    document.addEventListener('click', dismiss);
    document.addEventListener('focusin', dismiss);`, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } })
  }
  if (request.method === 'GET' && url.pathname === '/assets/shop-status.js') {
    return new Response(`for (const input of document.querySelectorAll('[data-shop-quantity]')) {
        const total = input.form.querySelector('output');
        input.addEventListener('input', () => {
          total.value = input.validity.valid ? '$' + (input.valueAsNumber * Number(input.dataset.shopQuantity)) : '—';
        });
      }
      const submitting = document.querySelector('[data-shop-submitting]');
      let submitted = false;
      for (const form of document.querySelectorAll('[data-shop-buy]')) {
        form.addEventListener('submit', event => {
          if (submitted) {
            event.preventDefault();
            return;
          }
          submitted = true;
          for (const button of document.querySelectorAll('[data-shop-buy] button')) button.disabled = true;
          if (submitting) submitting.hidden = false;
        });
      }
      const dialog = document.querySelector('[data-hatch]');
      let didHatch = false;
      function revealHatch(hatch) {
        if (!dialog || didHatch) return;
        didHatch = true;
        const title = dialog.querySelector('h2');
        const result = dialog.querySelector('[data-hatch-result]');
        const sprite = dialog.querySelector('.egg-stage img');
        dialog.dataset.rarity = hatch.rarity;
        sprite.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + hatch.id + '.png';
        title.textContent = dialog.dataset.opening;
        dialog.showModal();
        setTimeout(() => {
          dialog.classList.add('hatched');
          title.textContent = dialog.dataset.reveal;
          result.textContent = hatch.name + (hatch.xp > 0 ? ' · +' + hatch.xp + ' XP' : '');
        }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1450);
      }
      const receipt = document.querySelector('[data-order-pending], [data-order-receipt]');
      const wallet = document.querySelector('[data-shop-wallet]');
      const controls = [...document.querySelectorAll('[data-shop-product]')];
      const availability = document.querySelector('[data-shop-availability]');
      let latestState;
      function updateControl(form, state) {
        const {shopProduct, shopPrice, shopBall} = form.dataset;
        const dna = shopProduct === 'dna-booster';
        const owned = state.heldItems.includes(shopProduct);
        const cap = dna ? (state.dna ? ${maxDnaBoosters} - state.dnaCount : 0) : ${maxShopQuantity};
        const limit = Math.min(cap, Math.floor(state.balance / Number(shopPrice)));
        const input = form.querySelector('[data-shop-quantity]');
        if (input) input.max = Math.max(1, limit);
        const button = form.querySelector('button');
        button.disabled = submitted || !state.online || state.pending || owned || limit < 1 ||
          (shopProduct === 'master-ball' && !state.master) ||
          (form.hasAttribute('data-shop-feature') && !state.featured?.includes(shopProduct)) ||
          Boolean(input && (!input.validity.valid || (!state.bulk && input.valueAsNumber > 1)));
        button.textContent = owned ? button.dataset.owned : button.dataset.buy;
        const feature = form.parentElement.querySelector('[data-feature-upgrade]');
        if (feature) feature.hidden = !state.online || Boolean(state.featured?.includes(shopProduct));
        const upgrade = form.parentElement.querySelector('[data-shop-master-upgrade]');
        if (upgrade) upgrade.hidden = !state.online || Boolean(state.master);
        const count = form.querySelector('[data-shop-count]');
        if (count) count.textContent = '×' + (state.balls[shopBall] ?? 0);
      }
      for (const form of controls) form.addEventListener('input', () => {
        if (latestState) updateControl(form, latestState);
      });
      if (receipt || wallet) {
        const query = new URLSearchParams(location.search);
        const status = new URL('/shop/status', location.origin);
        status.searchParams.set('community', query.get('community'));
        if (receipt) status.searchParams.set('purchase', query.get('purchase'));
        if (query.has('pokemon')) status.searchParams.set('pokemon', query.get('pokemon'));
        const dnaCount = document.querySelector('[data-shop-dna-count]');
        const delta = document.querySelector('[data-shop-delta]');
        let balance = wallet ? Number(wallet.dataset.shopWallet) : null;
        let attempts = 0;
        async function refresh() {
          try {
            if (document.hidden) return void setTimeout(refresh, 5000);
            const response = await fetch(status, {cache: 'no-store'});
            if (response.status === 401 || response.status === 404) return;
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const state = await response.json();
            attempts = 0;
            if (dnaCount && Number.isInteger(state.dnaCount)) {
              dnaCount.textContent = state.dnaCount >= ${maxDnaBoosters} ? 'MAX' : state.dnaCount + '/${maxDnaBoosters}';
            }
            if (wallet && Number.isSafeInteger(state.balance)) {
              if (state.balance !== balance) {
                if (delta) delta.textContent = state.balance > balance ? '+$' + (state.balance - balance) : '';
                balance = state.balance;
                wallet.textContent = '$' + balance;
              }
              latestState = state;
              if (availability) {
                availability.hidden = state.online && state.bulk;
                availability.textContent = state.online ? availability.dataset.upgrade : availability.dataset.offline;
              }
              for (const form of controls) updateControl(form, state);
            }
            if (state.hatch) revealHatch(state.hatch);
            if (receipt && state.message) {
              receipt.textContent = state.message;
              if (!state.pending) {
                receipt.removeAttribute('data-order-pending');
                status.searchParams.delete('purchase');
                if (!wallet) return;
              }
            }
          } catch {
            if (receipt?.hasAttribute('data-order-pending') && ++attempts >= 3) {
              receipt.textContent = receipt.dataset.waiting;
            }
          }
          setTimeout(refresh, receipt?.hasAttribute('data-order-pending') ? 500 : 5000);
        }
        if (receipt) refresh();
        else setTimeout(refresh, 1000);
      }`, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=300' } })
  }
  if (request.method === 'GET' && url.pathname === '/assets/moveset.js') {
    return new Response(`const form = document.querySelector('.moveset-form');
      const choices = [...form.querySelectorAll('input[name=move]')];
      const save = form.querySelector('button[type=submit]');
      function update() {
        const selected = choices.filter(choice => choice.checked).length;
        for (const choice of choices) choice.disabled = selected >= 4 && !choice.checked;
        save.disabled = selected === 0;
        form.querySelector('output').textContent = selected + ' / 4';
      }
      form.addEventListener('change', update);
      update();`, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=300' } })
  }
  if (request.method === 'GET' && url.pathname === '/assets/announcements.js') return new Response(announcementsScript, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
  })
  if (request.method === 'GET' && url.pathname === '/live/announcements') {
    const community = url.searchParams.get('community')
    if (!community || community.length > 100) return new Response(null, { status: 400 })
    const { results } = await env.DB.prepare('SELECT id, message FROM portal_announcements WHERE community_id = ? AND created_at >= ? ' +
      'ORDER BY created_at DESC, id DESC LIMIT 12').bind(community, Date.now() - 6 * 60 * 60_000).all()
    return Response.json({ events: results.reverse() }, { headers: { 'Cache-Control': 'public, max-age=1' } })
  }
  if (request.method === 'GET' && url.pathname === '/assets/web-game.js') return new Response(webGameScript, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
  })
  const requested = url.searchParams.get('lang') ?? getCookie(request, 'sc_lang')
  const language = requested === 'en' ? 'en' : 'es'
  const t = text => language === 'en' ? webEnglish[text] ?? text : text
  const theme = (url.searchParams.get('theme') ?? getCookie(request, 'sc_theme')) === 'light' ? 'light' : 'dark'
  const page = (body, status = 200) => renderPage(body, status, language, theme, url)
  if (request.method === 'GET' && url.pathname === '/' && url.searchParams.get('tab') === 'live') {
    const { results } = await env.DB.prepare('SELECT community_id, seen_at, platforms FROM community_stream_status ORDER BY seen_at DESC LIMIT 100').all()
    const title = language === 'en' ? 'Streaming communities' : 'Comunidades de streaming'
    const selectedStream = results.find(row => row.community_id === url.searchParams.get('community'))
    const platform = url.searchParams.get('platform')
    if (selectedStream && !platform && selectedStream.seen_at > Date.now() - 90_000) {
      const available = JSON.parse(selectedStream.platforms).find(item => item.live && ['twitch', 'kick'].includes(item.provider))
      if (available) {
        url.searchParams.set('platform', available.provider)
        return redirect(url.pathname + url.search, [])
      }
    }
    const stream = selectedStream?.seen_at > Date.now() - 90_000 && JSON.parse(selectedStream.platforms).find(channel =>
      channel.provider === platform && ['twitch', 'kick'].includes(platform) && channel.live && /^[a-z0-9_-]{1,30}$/i.test(channel.login))
    const player = stream && url.protocol === 'https:' && (platform === 'twitch'
      ? 'https://player.twitch.tv/?' + new URLSearchParams({ channel: stream.login, parent: url.hostname, autoplay: 'false' })
      : 'https://player.kick.com/' + encodeURIComponent(stream.login) + '?autoplay=false')
    const en = language === 'en'
    const liveUrl = (community, provider) => '/?' + new URLSearchParams({ tab: 'live', community, platform: provider })
    const validChannel = channel => ['twitch', 'kick'].includes(channel.provider) && /^[a-z0-9_-]{1,30}$/i.test(channel.login)
    const liveChannels = row => row.seen_at > Date.now() - 90_000
      ? JSON.parse(row.platforms).filter(channel => channel.live && validChannel(channel)) : []
    const communities = results.map(row => ({ row, channels: liveChannels(row) })).filter(({ channels }) => channels.length)
    const channelTabs = selectedStream ? '<nav class="tabs live-platforms" aria-label="' + (en ? 'Streaming platform' : 'Plataforma de streaming') + '">' +
      ['twitch', 'kick'].map(provider => {
        const name = provider === 'twitch' ? 'Twitch' : 'Kick'
        const channel = liveChannels(selectedStream).find(item => item.provider === provider)
        return channel ? '<a href="' + escape(liveUrl(selectedStream.community_id, provider)) + '"' +
          (provider === platform ? ' aria-current="page"' : '') + '>' + name + '</a>' :
          '<span aria-disabled="true">' + name + '</span>'
      }).join('') + '</nav>' : ''
    const cards = communities.map(({ row, channels }) =>
      '<li><a class="button" href="' + escape(liveUrl(row.community_id, channels[0].provider)) + '">' +
      escape(channels[0].login) + '</a></li>').join('')
    const mainTabs = stream ? '<nav class="tabs live-sections" aria-label="' + (en ? 'Live sections' : 'Secciones del directo') +
      '"><a href="#watch-live">' + (en ? 'Watch stream' : 'Ver directo') + '</a><a href="#play-web">' +
      (en ? 'Play on the web' : 'Jugar en web') + '</a></nav>' : ''
    const channelUrl = stream && (platform === 'twitch' ? 'https://www.twitch.tv/' : 'https://kick.com/') + encodeURIComponent(stream.login)
    const watch = '<section class="sheet live-watch" id="watch-live"><h1>' + title + '</h1>' + mainTabs + channelTabs +
      (stream ? '<div class="live-reaction" data-live-reaction aria-hidden="true"></div>' : '') +
      (player ? '<div class="live-player"><iframe title="' + escape(stream.login) + '" src="' + escape(player) +
        '" width="960" height="540" allowfullscreen></iframe></div>' +
        '<a class="live-mobile-channel" href="' + escape(channelUrl) + '">' +
        (en ? 'Open on ' : 'Abrir en ') + (platform === 'twitch' ? 'Twitch' : 'Kick') + '</a>' :
        '<p class="meta">' + (communities.length
          ? (en ? 'Choose a live channel to watch and play here.' : 'Elige un canal en directo para ver el stream y jugar aquí.')
          : (en ? 'No channels are live right now.' : 'No hay canales en directo en este momento.')) + '</p>') +
      '<ul class="community-list live-communities">' + cards + '</ul></section>'
    const game = stream ? await renderLiveGame(request, env.DB, url, language) : ''
    const community = url.searchParams.get('community')
    return page((community ? communityTabs(community, language, 'live', url.searchParams.get('region') ?? 'kanto') : '') +
      (game ? '<div class="live-layout">' + watch + game + '</div>' : watch) +
      (selectedStream ? renderAnnouncements(selectedStream.community_id, language) : ''))
  }
  if (request.method === 'GET' && url.pathname === '/' && url.searchParams.get('tab') === 'about') {
    const about = aboutCopy[language]
    return page('<section class="sheet"><h1>' + about.about + '</h1><p><strong>Stream Companions</strong> · ' + about.version + ' ' + escape(appPackage.version) +
      '</p><p>' + about.by + ' <a href="' + projectLinks.author + '">Only4Dev</a></p><p>' + about.project + '</p><p>' + about.rights +
      '</p><p>' + about.credits + '</p><ul><li><a href="' + projectLinks.sprites + '">PMDCollab / SpriteCollab</a></li><li><a href="' +
      projectLinks.spriteLicense + '">' + about.license + '</a></li><li><a href="' + projectLinks.pokeapi + '">PokéAPI Sprites</a></li></ul></section>')
  }
  if (request.method === 'GET' && url.pathname === '/' && url.searchParams.get('tab') === 'help') {
    const community = url.searchParams.get('community')
    const nav = community ? communityTabs(community, language, 'help', url.searchParams.get('region') ?? 'kanto') :
      '<nav class="tabs"><a href="/">' + (language === 'en' ? 'Back to portal' : 'Volver al portal') + '</a></nav>'
    return page(helpPage(language, nav))
  }
  const route = url.pathname.match(/^\/auth\/(twitch|kick)(?:\/(callback|link))?$/)
  const { session, key, identity } = await viewerSession(request, env.DB)

  if (request.method === 'POST' && url.pathname === '/dex/seen') {
    if (!identity || request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 })
    const community = url.searchParams.get('community') ?? ''
    const dex = Number(url.searchParams.get('species'))
    const at = Number(url.searchParams.get('at'))
    if (!/^[a-z0-9_-]{1,64}$/.test(community) || !Number.isInteger(dex) || !nationalDex[dex - 1] ||
        !Number.isSafeInteger(at) || at < 1 || at > Date.now() + 60_000) return new Response(null, { status: 400 })
    const name = speciesName(dex)
    const { results } = await env.DB.prepare('SELECT p.payload FROM viewer_progress p JOIN account_identities i ON i.viewer_id = p.viewer_id WHERE p.community_id = ? AND i.account_id = ?')
      .bind(community, identity.account_id).all()
    if (!results.some(row => {
      const { collection = {} } = JSON.parse(row.payload)
      return Object.hasOwn(collection, name) || Object.hasOwn(collection, name + ' ✦')
    })) return new Response(null, { status: 404 })
    await env.DB.prepare('INSERT INTO dex_seen VALUES (?, ?, ?, ?) ON CONFLICT (account_id, community_id, species_id) DO UPDATE SET seen_at = MAX(seen_at, excluded.seen_at)')
      .bind(identity.account_id, community, dex, at).run()
    return new Response(null, { status: 204 })
  }

  if (request.method === 'GET' && url.pathname === '/shop/status') {
    const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
    if (!identity) return json({ error: 'authentication required' }, 401)
    const community = url.searchParams.get('community')
    const viewer = await env.DB.prepare(
      'SELECT p.payload, s.seen_at, s.supports_quantity, s.supports_dna, s.prices, o.id AS order_id, o.result, o.hatch, o.created_at, o.dispatched_at FROM viewer_progress p JOIN account_identities i ON p.viewer_id = i.viewer_id ' +
      'LEFT JOIN shop_online s ON s.community_id = p.community_id ' +
      'LEFT JOIN shop_orders o ON o.community_id = p.community_id AND o.viewer_id = p.viewer_id AND o.id = ? ' +
      'WHERE i.account_id = ? AND p.community_id = ? ORDER BY o.id IS NOT NULL DESC, (p.viewer_id LIKE \'twitch:%\') DESC, p.updated_at DESC, p.viewer_id LIMIT 1'
    ).bind(url.searchParams.get('purchase'), identity.account_id, community).first()
    if (!viewer) return json({ error: 'community not found' }, 404)
    if (viewer.order_id && viewer.result === null && viewer.created_at <= Date.now() - 120_000 &&
        (!viewer.dispatched_at || viewer.dispatched_at <= Date.now() - 600_000)) {
      await expireShopOrders(env.DB, community, Date.now()).run()
      const row = await env.DB.prepare('SELECT result, hatch FROM shop_orders WHERE id = ? AND community_id = ?').bind(viewer.order_id, community).first()
      if (row) Object.assign(viewer, row)
    }
    const pending = Boolean(viewer.order_id && viewer.result === null)
    const online = viewer.seen_at > Date.now() - 70_000
    const { pokeDollars: balance = 0, balls = {}, heldItems = [], dnaBoosters = {}, collection = {} } = JSON.parse(viewer.payload)
    const species = url.searchParams.get('pokemon')
    const dnaCount = species && Object.hasOwn(collection, species) ? sharedDna(dnaBoosters, species) : undefined
    const messages = {
      expired: language === 'en' ? 'The order expired before processing. You can retry.' : 'El pedido caducó antes de procesarse. Puedes volver a comprar.',
      review: language === 'en' ? 'The app did not confirm the order. Check your inventory and balance.' : 'La app no confirmó el pedido. Revisa tu inventario y saldo.',
      purchased: language === 'en' ? 'Purchase complete.' : 'Compra realizada.',
      owned: language === 'en' ? 'Already owned.' : 'Ya tienes ese objeto.',
      funds: language === 'en' ? 'Not enough Pokédollars.' : 'No tienes suficientes Pokédólares.',
      repriced: language === 'en' ? 'The price changed.' : 'El precio cambió.',
      battleLocked: botCopy[language].battleLocked,
      maxed: language === 'en' ? 'That Pokémon is at the DNA limit.' : 'Ese Pokémon ya alcanzó el máximo de DNA.',
      unavailable: language === 'en' ? 'Purchase could not be completed.' : 'No se pudo completar la compra.'
    }
    const message = pending && !online
      ? (language === 'en' ? 'Streamer app disconnected. Order still pending.' : 'App del streamer desconectada. El pedido sigue pendiente.')
      : (viewer.result && messages[viewer.result]) || ''
    const prices = viewer.prices ? JSON.parse(viewer.prices) : {}
    const master = Object.hasOwn(prices, 'master-ball')
    const featured = featuredShopItems.filter(id => Object.hasOwn(prices, id))
    const hatch = viewer.hatch ? JSON.parse(viewer.hatch) : null
    return json({ balance, balls, heldItems, pending, online, ...(master ? { master: true } : {}), ...(featured.length ? { featured } : {}), ...(hatch ? { hatch } : {}), bulk: Boolean(viewer.supports_quantity), dnaCount, ...(dnaCount !== undefined ? { dna: viewer.supports_dna >= 3 } : {}), message })
  }

  if (url.pathname === '/live/shiny-cue' && request.method === 'GET') {
    if (!identity) return new Response(null, { status: 401 })
    const community = url.searchParams.get('community')
    const platform = url.searchParams.get('platform')
    if (!await webGameViewer(env.DB, identity.account_id, community, platform)) return new Response(null, { status: 404 })
    const cue = await env.DB.prepare('SELECT type, audio FROM shiny_cues WHERE community_id = ?').bind(community).first()
    return new Response(cue ? new Uint8Array(cue.audio) : defaultShinyCue(), { headers: {
      'Content-Type': cue?.type ?? 'audio/wav', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'
    } })
  }

  if (url.pathname === '/live/action' || url.pathname === '/live/status') {
    if (!identity) return new Response(null, { status: 401 })
    const community = url.searchParams.get('community')
    const platform = url.searchParams.get('platform')
    if (request.method === 'POST' && url.pathname === '/live/action') {
      if (request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 })
      let form
      try {
        const body = await request.text()
        if (body.length > 2048) return new Response(null, { status: 400 })
        form = new URLSearchParams(body)
      } catch { return new Response(null, { status: 400 }) }
      const result = await enqueueWebGame(env.DB, identity.account_id, community, platform, form)
      if (!result) return new Response(null, { status: 400 })
      if (request.headers.get('Accept') === 'application/json') {
        const id = /^[a-f0-9-]{36}$/.test(result) ? result : null
        const state = webGameState(null, id ? { created_at: Date.now() } : { result }, language)
        return Response.json({ id, message: state.message, ...(state.result ? { result: state.result } : {}) }, { headers: { 'Cache-Control': 'private, no-store' } })
      }
      return redirect('/?' + new URLSearchParams({ tab: 'live', community, platform, game: result }) + '#play-web', [])
    }
    if (request.method !== 'GET' || url.pathname !== '/live/status') return new Response(null, { status: 405 })
    const viewer = await webGameViewer(env.DB, identity.account_id, community, platform)
    if (!viewer) return new Response(null, { status: 404 })
    const runtime = await env.DB.prepare('SELECT * FROM web_game_runtime WHERE community_id = ?').bind(community).first()
    const row = await webGameStatus(env.DB, identity.account_id, community, url.searchParams.get('game'))
    const { balls = {}, log = [], legendaryTrackers = 0, rareCandies = 0 } = JSON.parse(viewer.payload)
    const activity = log.slice(-8).reverse().map(({ action, result }) => ({ action,
      message: webGameState(null, { result: result === 'caught' || result === 'duplicateReward' ? 'catchSuccess' : result }, language).message }))
    return Response.json({ ...webGameState(runtime, row, language), balls, activity, ...(legendaryTrackers ? { legendaryTrackers } : {}), ...(rareCandies ? { rareCandies } : {}) }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  if (route) {
    const [, provider, action] = route
    const config = providerConfig(env, provider)
    if (!config) return page('<p>' + t('El acceso con ') + providers[provider] + t(' todavía no está disponible.') + ' <a href="/">' + t("Volver") + '</a></p>', 503)
    const callback = url.origin + '/auth/' + provider + '/callback'
    const cookieName = 'sc_flow_' + provider
    if (action === 'callback' && request.method === 'GET') {
      const returnedState = url.searchParams.get('state') ?? ''
      const flowCookie = /^[a-f0-9]{64}$/.test(returnedState) ? cookieName + '_' + returnedState : cookieName
      const [state, verifier, linkSession] = (getCookie(request, flowCookie) || getCookie(request, cookieName) || '').split('.')
      const code = url.searchParams.get('code')
      if (!code || !state || state !== url.searchParams.get('state') ||
          (linkSession && (!identity || linkSession !== session))) {
        console.warn(JSON.stringify({ event: 'viewer_oauth_failure', provider, stage: !code ? 'cancelled_or_missing_code' : 'flow_cookie' }))
        return page('<p>' + t("La autorización venció o fue cancelada.") + ' <a href="/auth/' + provider + '">' + (language === 'en' ? 'Try sign-in again' : 'Volver a iniciar sesión') + '</a></p>', 400)
      }
      const verified = await platformIdentity(provider, config, code, callback, verifier)
      if (!verified) return page('<p>' + t("No se pudo verificar la cuenta.") + ' <a href="/">' + t("Volver") + '</a></p>', 502)
      const newSession = await signIn(env.DB, verified, linkSession ? identity.account_id : null)
      if (!newSession && !linkSession) return page('<p>' + (language === 'en'
        ? 'This sign-in was unlinked. Sign in with your other platform to reconnect it.'
        : 'Este acceso está desvinculado. Entra con tu otra plataforma para volver a conectarlo.') +
        ' <a href="/">' + t('Volver') + '</a></p>', 409)
      if (!newSession) return page('<p>' + (language === 'en'
        ? 'This identity is already linked elsewhere, or your account already has a different identity from this platform.'
        : 'Esta identidad ya está vinculada a otra cuenta o tu cuenta ya tiene otra identidad de esta plataforma.') +
        ' <a href="/">' + t("Volver") + '</a></p>', 409)
      return redirect(linkSession ? '/?account=1' : '/', [
        cookie(flowCookie, '', 0), cookie('sc_session', newSession, 86_400)
      ])
    }
    const linking = action === 'link'
    if (!action && request.method === 'GET' && identity) return redirect('/?account=1', [])
    if ((!action && request.method === 'GET') ||
        (linking && request.method === 'POST' && identity && request.headers.get('Origin') === url.origin)) {
      const state = randomId()
      const verifier = randomId()
      const destination = await authorizeUrl(provider, config, callback, state, verifier)
      return redirect(destination, [cookie(cookieName + '_' + state, [state, verifier, linking ? session : ''].join('.'), 600)])
    }
    return page('<p>' + t("Solicitud inválida.") + '</p>', 403)
  }

  if (request.method === 'POST' && url.pathname === '/auth/unlink') {
    if (!identity || request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 })
    const viewerId = url.searchParams.get('identity')
    if (!/^(twitch|kick):\d{1,24}$/.test(viewerId ?? '')) return new Response(null, { status: 400 })
    const changed = await unlinkIdentity(env.DB, identity.account_id, viewerId)
    if (changed && viewerId === identity.viewer_id) return redirect('/?unlinked=1', [cookie('sc_session', '', 0)])
    return redirect(changed ? '/?account=1&unlinked=1' : '/?account=1&unlinkError=1', [])
  }

  const en = language === 'en'
  const deleteLabel = en ? 'Delete my data' : 'Eliminar mis datos'
  const confirmation = en ? 'DELETE' : 'ELIMINAR'
  if (url.pathname === '/auth/delete') {
    if (!identity) return new Response(null, { status: 403 })
    const label = en ? 'Type DELETE to confirm' : 'Escribe ELIMINAR para confirmar'
    if (request.method === 'GET') {
      const nonce = randomId()
      const response = page('<section class="sheet"><h1>' + deleteLabel + '</h1><p>' + (en ?
        'This permanently deletes your profile, collection, inventory and progress, and signs out all linked accounts. The desktop app deletes its local copy when it reconnects. You can sign in or link again without restoring deleted progress.' :
        'Esto elimina de forma permanente tu perfil, colección, inventario y progreso, y cierra todas las sesiones vinculadas. La app de escritorio borrará su copia local cuando vuelva a conectarse. Puedes iniciar sesión o vincular de nuevo sin restaurar el progreso borrado.') +
        '</p><form method="post" action="/auth/delete"><input type="hidden" name="nonce" value="' + nonce + '">' +
        '<label>' + label + ' <input required name="confirm" autocomplete="off" maxlength="8" pattern="' + confirmation + '"></label> ' +
        '<button class="danger-action">' + deleteLabel + '</button></form><p><a href="/?account=1">' + (en ? 'Cancel' : 'Cancelar') + '</a></p></section>')
      response.headers.append('Set-Cookie', cookie('sc_delete', nonce + '.' + key, 300))
      return response
    }
    if (request.method !== 'POST' || request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 })
    const [nonce, owner] = (getCookie(request, 'sc_delete') ?? '').split('.')
    if (!nonce || owner !== key) return new Response(null, { status: 403 })
    const fields = new URLSearchParams(await request.text())
    if (fields.get('nonce') !== nonce || !['DELETE', 'ELIMINAR'].includes(fields.get('confirm'))) {
      return redirect('/auth/delete', [])
    }
    await eraseAccount(env.DB, identity.account_id)
    return redirect('/?deleted=1', [cookie('sc_delete', '', 0), cookie('sc_session', '', 0)])
  }

  if (request.method === 'POST' && url.pathname === '/auth/logout') {
    if (request.headers.get('Origin') !== url.origin) return page('<p>' + t("Solicitud inválida.") + '</p>', 403)
    if (identity) await env.DB.prepare('DELETE FROM web_sessions WHERE id IN (?, ?)').bind(session, key).run()
    return redirect('/', [cookie('sc_session', '', 0)])
  }
  const editingItem = request.method === 'POST' && url.pathname === '/held-item'
  const buying = request.method === 'POST' && url.pathname === '/shop/buy'
  const editing = buying || editingItem || request.method === 'POST' && url.pathname === '/moveset'
  if (!editing && (request.method !== 'GET' || url.pathname !== '/')) return null
  if (editing && (!identity || request.headers.get('Origin') !== url.origin)) return new Response(null, { status: 403 })
  if (!identity) return page(
    (url.searchParams.has('deleted') ? '<p role="status">' + (en ? 'Your profile was deleted.' : 'Tu perfil se eliminó.') + '</p>' : '') +
    (url.searchParams.has('unlinked') ? '<p role="status">' + (language === 'en' ? 'Sign in with your other platform. Your progress is still saved.' : 'Entra con tu otra plataforma. Tu progreso sigue guardado.') + '</p>' : '') +
    '<section class="hero"><div><h1>' + t("Tu álbum de compañeros") + '</h1><p>' + t("Consulta tus capturas, sus variantes y las Poké Balls de cada comunidad.") + '</p>' +
    '<div class="providers">' + platformButton('twitch', providerConfig(env, 'twitch'), t, language) + platformButton('kick', providerConfig(env, 'kick'), t, language) +
    '</div><p class="provider-hint">' + (language === 'en' ? 'Use your existing login. You can link the other platform later to keep your progress together.' : 'Entra con la cuenta que ya usas. Puedes vincular la otra plataforma después para compartir tu progreso.') + '</p>' +
    '</div><div class="art" aria-hidden="true"><div class="stars"><span>✦</span><span>✧</span></div><div class="mascot">••</div></div></section>'
  )

  const { results } = await env.DB.prepare(
    'SELECT entries.*, COALESCE(k.login, entries.community_id) AS community_name FROM (' +
    'SELECT community_id, viewer_id, payload, updated_at FROM (' +
    "SELECT p.community_id, p.viewer_id, p.payload, p.updated_at, row_number() OVER (PARTITION BY p.community_id ORDER BY CASE WHEN p.viewer_id LIKE 'twitch:%' THEN 0 ELSE 1 END, p.updated_at DESC, p.viewer_id) AS entry " +
    'FROM viewer_progress p JOIN account_identities i ON p.viewer_id = i.viewer_id WHERE i.account_id = ?' +
    ') WHERE entry = 1) entries LEFT JOIN kick_channels k ON k.community_id = entries.community_id ' +
    "AND entries.community_id LIKE 'kick-%' ORDER BY entries.community_id"
  ).bind(identity.account_id).all()
  if (url.searchParams.has('account')) {
    const { results: linked } = await env.DB.prepare(
      'SELECT viewer_id, login FROM account_identities WHERE account_id = ? AND detached_at IS NULL ORDER BY viewer_id'
    ).bind(identity.account_id).all()
    const rows = Object.entries(providers).map(([provider, name]) => {
      const accounts = linked.filter(item => item.viewer_id.startsWith(provider + ':'))
      const info = accounts.length ? accounts.map(item => '<span class="account-handle">@' + escape(item.login || name) + '</span>' +
        (linked.length > 1 ? '<form method="post" action="/auth/unlink?' + escape(new URLSearchParams({ identity: item.viewer_id })) + '"><button>' +
          (language === 'en' ? 'Unlink sign-in' : 'Desvincular acceso') + '</button></form>' : '')).join('') :
        providerConfig(env, provider)
          ? '<form method="post" action="/auth/' + provider + '/link"><button>' + t('Vincular ') + name + '</button></form>'
          : t('Próximamente')
      return '<li class="account-card"><strong>' + name + '</strong>' + info + '</li>'
    }).join('')
    const message = url.searchParams.has('unlinked') ? (language === 'en' ? 'Sign-in unlinked. The shared album stays with your remaining login.' : 'Acceso desvinculado. El álbum compartido se conserva con el acceso restante.') :
      url.searchParams.has('unlinkError') ? (language === 'en' ? 'Keep at least one sign-in method active.' : 'Mantén al menos una forma de iniciar sesión.') : ''
    return page('<section class="sheet"><h1>' + t("Cuentas vinculadas") + '</h1>' + (message ? '<p role="status">' + message + '</p>' : '') + '<ul class="community-list">' + rows +
      '</ul><p><a href="/">' + t("Volver a comunidades") + '</a></p><hr><p><a class="danger-action" href="/auth/delete">' + deleteLabel + '</a></p></section>')
  }
  const selected = results.find(row => row.community_id === url.searchParams.get('community'))
  if (editing && !selected) return new Response(null, { status: 404 })
  const logout = '<form class="logout" method="post" action="/auth/logout"><button>' + t("Cerrar sesión") + '</button></form>'
  if (!selected) {
    const communities = results.map(row => '<li><a class="button" href="?' +
      escape(new URLSearchParams({ community: row.community_id })) + '">' + escape(row.community_name ?? row.community_id) + '</a></li>').join('')
    return page('<div class="toolbar"><p class="meta">Viewer · ' + escape(identity.login || 'Viewer') + '</p>' + '<div class="album-actions"><a class="button" href="/?account=1">' + t("Cuentas vinculadas") + '</a>' + logout + '</div>' +
      '</div><section class="sheet"><h1>' + t("Elige un streamer") + '</h1>' +
      (communities ? '<ul class="community-list">' + communities + '</ul>' :
        '<p class="empty">' + t("Aún no tienes comunidades sincronizadas. Usa !poke join en el chat de un streamer participante.") + '</p>') +
      '</section>')
  }
  const { displayName, balls, collection, metrics = {}, heldItems: ownedItems = [], rareCandies = 0, legendaryTrackers = 0, pokeDollars = 0, dnaBoosters = {}, log = [], dexAcquired = {} } = JSON.parse(selected.payload)
  const online = buying || url.searchParams.get('tab') === 'shop' || !editing && url.searchParams.has('pokemon')
    ? await env.DB.prepare('SELECT seen_at, prices, supports_dna, supports_quantity FROM shop_online WHERE community_id = ?').bind(selected.community_id).first() : null
  const published = online?.prices ? JSON.parse(online.prices) : null
  const shopOpen = Boolean(online && online.seen_at > Date.now() - 70_000)
  const walletText = (en ? 'Current balance: ' : 'Saldo actual: ') + '$' + pokeDollars
  const offlineText = en ? 'Purchases are available when the streamer’s app is connected and the game is running.' :
    'Puedes comprar cuando la app del streamer esté conectada y el juego activo.'
  const fundsText = (en ? 'Not enough Pokédollars. ' : 'No tienes suficientes Pokédólares. ') + walletText
  const upgradeText = en ? 'The streamer’s app does not support DNA Booster purchases yet.' :
    'La app del streamer aún no admite compras de DNA Booster.'
  const reasons = { offline: offlineText, funds: fundsText, upgrade: upgradeText,
    master: en ? 'The streamer’s app must be updated to sell Master Balls.' : 'La app del streamer debe actualizarse para vender Master Balls.',
    feature: en ? 'The streamer’s app must be updated for this item.' : 'La app del streamer debe actualizarse para vender este objeto.',
    quantity: en ? 'The streamer’s app does not support buying multiple items yet.' : 'La app del streamer aún no permite comprar varias unidades.' }
  const reason = url.searchParams.get('reason')
  const purchaseWarning = Object.hasOwn(reasons, reason ?? '') ? reasons[reason] : url.searchParams.has('retry') ?
    (en ? 'A purchase is pending or you have reached the purchase limit. Wait a moment and try again.' : 'Hay una compra pendiente o alcanzaste el límite. Espera un momento y vuelve a intentar.') : ''
  if (buying) {
    const item = url.searchParams.get('item')
    const orderId = url.searchParams.get('order')
    if (!Object.hasOwn(shopItems, item ?? '') || !/^[a-f0-9-]{36}$/.test(orderId ?? '')) return new Response(null, { status: 400 })
    const product = shopItems[item]
    let form
    if (request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) {
      const reader = request.body?.getReader()
      let size = 0
      let text = ''
      const decoder = new TextDecoder()
      if (reader) while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 1024) { await reader.cancel(); return new Response(null, { status: 413 }) }
        text += decoder.decode(value, { stream: true })
      }
      form = new URLSearchParams(text + decoder.decode())
    }
    const quantity = Number(form?.get('quantity') ?? 1)
    if (!validShopQuantity(product, quantity)) return new Response(null, { status: 400 })
    const target = product.dna ? url.searchParams.get('pokemon') : null
    if (product.dna && (!Object.hasOwn(collection, target ?? '') || sharedDna(dnaBoosters, target) + quantity > maxDnaBoosters)) {
      return new Response(null, { status: 409 })
    }
    const destination = target ? { pokemon: target } : { tab: 'shop', ...(product.held || product.section ? { section: product.section ?? 'held' } : {}) }
    const existingOrder = await env.DB.prepare('SELECT item FROM shop_orders WHERE id = ? AND community_id = ? AND viewer_id = ?')
      .bind(orderId, selected.community_id, selected.viewer_id).first()
    if (existingOrder?.item === item) return redirect('/?' + new URLSearchParams({ community: selected.community_id, ...destination, purchase: orderId }), [])
    const blocked = !shopOpen ? 'offline' : product.dna && !(online?.supports_dna >= 3) ? 'upgrade' : null
    const returnBlocked = reason => redirect('/?' + new URLSearchParams({ community: selected.community_id, ...destination, reason }), [])
    if (blocked || (quantity > 1 && !online.supports_quantity)) return returnBlocked(blocked ?? 'quantity')
    if (item === 'master-ball' && !Object.hasOwn(published ?? {}, item)) return returnBlocked('master')
    if ((arenaShopItems.includes(item) || featuredShopItems.includes(item)) && !Object.hasOwn(published ?? {}, item)) return returnBlocked('feature')
    const price = published?.[item] ?? product.price
    const quote = url.searchParams.get('price')
    if ((!published && quote === null) || quote === String(price)) {
      if (pokeDollars < price * quantity) return returnBlocked('funds')
      if (product.held && ownedItems.includes(item)) return new Response(null, { status: 409 })
    } else return redirect('/?' + new URLSearchParams({ community: selected.community_id, ...destination, repriced: '1' }), [])
    const findExistingOrder = () => env.DB.prepare('SELECT id FROM shop_orders WHERE id = ? AND community_id = ? AND viewer_id = ?')
      .bind(orderId, selected.community_id, selected.viewer_id).first()
    const now = Date.now()
    const [, queued] = await env.DB.batch([expireShopOrders(env.DB, selected.community_id, now), env.DB.prepare('INSERT OR IGNORE INTO shop_orders (id, community_id, viewer_id, item, created_at, price, species_key, quantity) ' +
      'SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM shop_online WHERE community_id = ? AND seen_at > ? AND prices IS ? AND (? IS NULL OR supports_dna >= 3) AND (? = 1 OR supports_quantity = 1)) ' +
      'AND EXISTS (SELECT 1 FROM account_identities WHERE viewer_id = ? AND account_id = ?) AND EXISTS (SELECT 1 FROM web_sessions WHERE id IN (?, ?) AND expires_at > ?) ' +
      'AND NOT EXISTS (SELECT 1 FROM shop_orders o JOIN account_identities i ON i.viewer_id = o.viewer_id WHERE o.community_id = ? AND i.account_id = ? AND o.result IS NULL) ' +
      'AND (SELECT COUNT(*) FROM shop_orders o JOIN account_identities i ON i.viewer_id = o.viewer_id WHERE o.community_id = ? AND i.account_id = ? AND o.created_at > ?) < 8 ' +
      "AND NOT EXISTS (SELECT 1 FROM shop_orders o JOIN account_identities i ON i.viewer_id = o.viewer_id WHERE o.community_id = ? AND i.account_id = ? AND o.item = ? AND o.price IS ? AND o.species_key IS ? AND o.quantity = ? AND o.result = 'purchased' AND o.created_at > ?)")
      .bind(orderId, selected.community_id, selected.viewer_id, item, now, published ? price : null, target, quantity,
        selected.community_id, now - 70_000, online?.prices ?? null, target, quantity, selected.viewer_id, identity.account_id, session, key, now, selected.community_id, identity.account_id, selected.community_id, identity.account_id, now - 30_000,
        selected.community_id, identity.account_id, item, published ? price : null, target, quantity, now - 3000)])
    return redirect('/?' + new URLSearchParams({ community: selected.community_id, ...destination, ...(queued.meta.changes || await findExistingOrder() ? { purchase: orderId } : { retry: '1' }) }), [])
  }
  const availableItems = [...new Set(ownedItems)].filter(item => Object.hasOwn(heldItems, item))
  const itemName = item => escape(heldItems[item][Number(language === 'en')])
  const regionQuery = url.searchParams.get('region')
  const locationParams = { community: selected.community_id, ...(regionQuery ? { region: regionQuery } : {}) }
  const speciesKey = url.searchParams.get('pokemon')
  const dna = speciesKey ? sharedDna(dnaBoosters, speciesKey) : 0
  const detail = speciesKey && Object.hasOwn(collection, speciesKey) ? creatureMoves(speciesKey, collection[speciesKey], dna) : null
  if (editing) {
    if (!detail || !selected.viewer_id) return new Response(null, { status: 404 })
    const raw = await request.text()
    const fields = new URLSearchParams(raw)
    if (editingItem) {
      const item = fields.get('item')
      if (raw.length > 100 || fields.getAll('item').length !== 1 || (item !== '' && !availableItems.includes(item))) {
        return new Response(null, { status: 400 })
      }
      const keys = [selected.community_id, selected.viewer_id, speciesKey]
      if (item) await env.DB.prepare('INSERT INTO viewer_held_items SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM account_identities WHERE viewer_id = ? AND account_id = ?) AND EXISTS (SELECT 1 FROM web_sessions WHERE id IN (?, ?) AND expires_at > ?) ' +
        'ON CONFLICT (community_id, viewer_id, species_key) DO UPDATE SET item = excluded.item').bind(...keys, item, selected.viewer_id, identity.account_id, session, key, Date.now()).run()
      else await env.DB.prepare('DELETE FROM viewer_held_items WHERE community_id = ? AND viewer_id = ? AND species_key = ?').bind(...keys).run()
      return redirect('/?' + new URLSearchParams({ ...locationParams, pokemon: speciesKey }), [])
    }
    const selection = fields.getAll('move')
    const equipped = fields.getAll('ultimate')
    if (raw.length > 700 || !validMoveset(selection, detail.options) ||
        equipped.length > 1 || (equipped.length && !detail.ultimates.includes(equipped[0]))) {
      return page('<p>' + (language === 'en' ? 'Choose up to four unlocked moves and one available ultimate.' :
        'Elige hasta cuatro ataques aprendidos y una ulti disponible.') +
        ' <a href="/?' + escape(new URLSearchParams({ ...locationParams, pokemon: speciesKey })) + '">' + t('Volver') + '</a></p>', 400)
    }
    await env.DB.prepare('INSERT INTO viewer_movesets (community_id, viewer_id, species_key, moves) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM account_identities WHERE viewer_id = ? AND account_id = ?) AND EXISTS (SELECT 1 FROM web_sessions WHERE id IN (?, ?) AND expires_at > ?) ' +
      'ON CONFLICT (community_id, viewer_id, species_key) DO UPDATE SET moves = excluded.moves')
      .bind(selected.community_id, selected.viewer_id, speciesKey,
        JSON.stringify({ moves: selection, ultimate: equipped[0], selectedAt: detail.rank }), selected.viewer_id, identity.account_id, session, key, Date.now()).run()
    return new Response(null, { status: 303, headers: { Location: '/?' +
      new URLSearchParams({ ...locationParams, pokemon: speciesKey, saved: '1' }) } })
  }
  if (detail) {
    const en = language === 'en'
    const dnaPrice = published?.['dna-booster'] ?? shopItems['dna-booster'].price
    const dnaAction = '/shop/buy?' + new URLSearchParams({ community: selected.community_id, pokemon: speciesKey,
      item: 'dna-booster', price: dnaPrice, order: crypto.randomUUID() })
    const purchase = url.searchParams.get('purchase')
    const dnaOrder = /^[a-f0-9-]{36}$/.test(purchase ?? '') ? await env.DB.prepare(
      "SELECT result FROM shop_orders WHERE id = ? AND community_id = ? AND viewer_id = ? AND item = 'dna-booster'"
    ).bind(purchase, selected.community_id, selected.viewer_id).first() : null
    const dnaBlocked = !shopOpen ? offlineText : !(online?.supports_dna >= 3) ? upgradeText : pokeDollars < dnaPrice ? fundsText : ''
    const dnaMessage = purchaseWarning || (url.searchParams.has('repriced') ? (en ? 'The price changed.' : 'El precio cambió.') :
      url.searchParams.has('retry') ? (en ? 'Purchase unavailable. Check for a pending order.' : 'Compra no disponible. Revisa si hay un pedido pendiente.') :
      dnaOrder ? (dnaOrder.result === 'battleLocked' ? botCopy[language].battleLocked : dnaOrder.result === 'purchased' ? (en ? 'Purchase complete.' : 'Compra realizada.') :
        dnaOrder.result === 'funds' ? fundsText : dnaOrder.result === 'repriced' ? (en ? 'The price changed.' : 'El precio cambió.') : dnaOrder.result ? (en ? 'Purchase could not be completed.' : 'No se pudo completar la compra.') :
          (en ? 'Order sent. Waiting for the streamer’s app to confirm…' : 'Pedido enviado. Esperando confirmación de la app del streamer…')) : '')
    const dnaQuantity = quantityField(en, dnaPrice, Math.min(online?.supports_quantity ? maxDnaBoosters - dna : 1, Math.floor(pokeDollars / dnaPrice)))
    const dnaSection = '<div class="held-frame"><strong>DNA Booster <span data-shop-dna-count>' + (dna >= maxDnaBoosters ? 'MAX' : dna + '/' + maxDnaBoosters) + '</span></strong>' +
      '<span>' + (en ? 'Shared across this evolution line' : 'Compartido en esta línea evolutiva') + '</span>' +
      helpHint(en ? 'About DNA Booster' : 'Sobre DNA Booster', en ?
        'Boosts the battle stats of the whole evolution line, including shiny Pokémon. Max 10.' :
        'Mejora las estadísticas de toda la línea evolutiva, incluidas las variantes shiny. Máximo 10.') +
      '<span>' + (en ? 'Current balance: ' : 'Saldo actual: ') + '<strong data-shop-wallet="' + escape(pokeDollars) + '">$' + escape(pokeDollars) + '</strong></span>' + submittingPurchase(en) +
      (dnaMessage || dnaBlocked ? '<span role="status" data-order-receipt' + (dnaOrder && !dnaOrder.result ? pendingPurchase(en) : '') + '>' + escape(dnaMessage || dnaBlocked) + '</span>' : '') +
      (dna < maxDnaBoosters ? '<form method="post" data-shop-buy data-shop-product="dna-booster" data-shop-price="' + dnaPrice + '" action="' + escape(dnaAction) + '">' + dnaQuantity +
        '<button data-buy="' + (en ? 'Buy · $' : 'Comprar · $') + dnaPrice + '"' +
        (dnaBlocked || (dnaOrder && !dnaOrder.result) ? ' disabled' : '') + '>' +
        (en ? 'Buy · $' : 'Comprar · $') + dnaPrice + '</button></form>' : '') + '</div>'
    const saved = await env.DB.prepare('SELECT moves FROM viewer_movesets WHERE community_id = ? AND viewer_id = ? AND species_key = ?')
      .bind(selected.community_id, selected.viewer_id, speciesKey).first()
    const choices = parseLoadout(saved?.moves)
    const active = equippedMoves(detail.form, detail.types, detail.final, detail.rank, choices.moves, choices.selectedAt)
    const ultimate = detail.ultimates.includes(choices.ultimate) ? choices.ultimate : detail.ultimates[0]
    const itemLabel = en ? 'Held item' : 'Objeto equipado'
    let itemFrame = '<div class="held-frame"><strong>' + itemLabel + '</strong><span>' + (en ? 'No held items yet' : 'Aún no tienes objetos') + '</span></div>'
    if (availableItems.length) {
      const equipped = await env.DB.prepare('SELECT item FROM viewer_held_items WHERE community_id = ? AND viewer_id = ? AND species_key = ?')
        .bind(selected.community_id, selected.viewer_id, speciesKey).first()
      const current = availableItems.includes(equipped?.item) ? equipped.item : ''
      const itemAction = '/held-item?' + new URLSearchParams({ ...locationParams, pokemon: speciesKey })
      itemFrame = '<button type="button" class="held-frame" popovertarget="choose-held"><strong>' + itemLabel + '</strong>' +
        (current ? itemIcon(current) + '<span>' + itemName(current) + '</span>' : '<span>' + (en ? 'None' : 'Ninguno') + '</span>') + '</button>' +
        '<div class="held-picker" id="choose-held" popover><h3>' + itemLabel + '</h3><form method="post" action="' + escape(itemAction) + '">' +
        ['' , ...availableItems].map(item => '<button name="item" value="' + item + '"' + (current === item ? ' class="chosen"' : '') + '>' +
          (item ? itemIcon(item) + itemName(item) : (en ? 'None' : 'Ninguno')) + '</button>').join('') + '</form></div>'
    }
    const descriptions = {
      1: en ? 'The bulb on its back stores energy as it grows.' : 'El bulbo de su lomo acumula energía a medida que crece.',
      19: en ? 'An agile rodent with incisors that never stop growing.' : 'Un roedor ágil con incisivos que nunca dejan de crecer.',
      123: en ? 'Its forearms end in blades that slice through tall grass.' : 'Sus antebrazos terminan en cuchillas capaces de cortar hierba alta.'
    }
    const description = descriptions[detail.id]
    const xp = collection[speciesKey] - xpAtLevel(detail.rank)
    const span = xpAtLevel(detail.rank + 1) - xpAtLevel(detail.rank)
    const xpBar = detail.rank === maxLevel ? '<p class="xp-cap">' + (en ? 'Maximum level' : 'Nivel máximo') + '</p>' :
      '<div class="xp-track"><label for="creature-xp">XP <strong>' + xp + ' / ' + span + '</strong></label>' +
      '<progress id="creature-xp" value="' + xp + '" max="' + span + '">' + xp + ' / ' + span + '</progress></div>'
    const stats = [['PS', 'HP', 'maxHp'], ['ATK', 'ATK', 'attack'], ['SPA', 'SPA', 'specialAttack'],
      ['DEF', 'DEF', 'defense'], ['SPD', 'SPD', 'specialDefense'], ['SPE', 'SPE', 'speed']]
    const returnToDex = '/?' + new URLSearchParams(locationParams)
    const suffix = speciesKey.endsWith(' ✦') ? ' ✦' : ''
    const members = familyLinks(detail.id)
    const familyNav = members.length > 1 ? '<nav class="family-forms" aria-label="' + (en ? 'Evolution family' : 'Línea evolutiva') + '">' +
      members.map(([id]) => {
        const key = speciesName(id) + suffix
        const formName = escape(speciesName(id))
        if (!Object.hasOwn(collection, key)) return '<span class="family-form locked" title="' + (en ? 'Locked' : 'Sin desbloquear') + '">' + formName + '</span>'
        const url = '/?' + new URLSearchParams({ ...locationParams, pokemon: key })
        return '<a class="family-form" href="' + escape(url) + '"' + (key === speciesKey ? ' aria-current="page"' : '') + '>' + formName + '</a>'
      }).join('') + '</nav><p class="meta">' + (en ? 'Shared family level · Lv. ' : 'Nivel compartido de la línea · Nv. ') + detail.rank +
      (suffix ? ' ✦' : '') + '</p>' : ''
    const action = '/moveset?' + new URLSearchParams({ ...locationParams, pokemon: speciesKey })
    const sprite = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' +
      (speciesKey.endsWith(' ✦') ? 'shiny/' : '') + detail.id + '.png'
    return page(communityTabs(selected.community_id, language, 'dex', url.searchParams.get('region') ?? 'kanto') + '<section class="sheet creature-summary"><p><a href="' + escape(returnToDex) + '">' +
      (en ? 'Back to Pokédex' : 'Volver a la Pokédex') + '</a></p>' + familyNav + '<div class="summary-profile"><img alt="" width="120" height="120" src="' + sprite +
      '"><div><h1>' + escape(speciesKey) + '</h1><p class="summary-meta">#' + String(detail.id).padStart(3, '0') + ' · Lv. ' + detail.rank +
      detail.types.map(type => typeIcon(type, en)).join('') + '</p>' + (description ? '<p>' + escape(description) + '</p>' : '') +
      (detail.form === detail.id ? '' : '<p>' + (en ? 'Battle form · ' : 'Forma en combate · ') + escape(speciesName(detail.form)) + '</p>') +
      xpBar + '</div><div class="summary-equipment">' + itemFrame + '</div></div><dl class="battle-stats">' + stats.map(([es, english, key]) => '<div><dt>' + (en ? english : es) +
        '</dt><dd>' + Math.round(detail.stats[key]) + '</dd></div>').join('') + '</dl>' + dnaSection +
      '<div class="section-with-help"><h2>' + (en ? 'Moveset' : 'Ataques activos') + '</h2>' + helpHint(en ? 'About cooldowns and PP' : 'Sobre recarga y PP', en ? 'CD is the cooldown in seconds after the move finishes. PP is how many times the move can be used per battle. Ultimates use a charge meter.' : 'CD es la recarga en segundos después del ataque. PP indica cuántas veces puedes usarlo por batalla. Los ataques definitivos requieren carga.') + '</div><form class="moveset-form" method="post" action="' + escape(action) +
      '"><fieldset><legend>' + (en ? 'Choose up to four' : 'Elige hasta cuatro') + ' · <output>' + active.length + ' / 4</output></legend><div class="move-options">' +
      [...detail.unlockedAt].map(([key, rank]) => moveCard(key, active.includes(key), en, rank > detail.rank ? rank : 0)).join('') +
      '</div></fieldset><fieldset class="ultimate-slot"><legend>' + (en ? 'Ultimate' : 'Ataque definitivo') + '</legend>' +
      (ultimate ? (detail.ultimates.length > 1 ? '<select name="ultimate" aria-label="' + (en ? 'Ultimate' : 'Ataque definitivo') + '">' +
        detail.ultimates.map(key => '<option value="' + escape(key) + '"' + (key === ultimate ? ' selected' : '') + '>' + escape(moves[key].name) + '</option>').join('') + '</select>' :
        '<div class="move-options">' + moveCard(ultimate, true, en) + '</div><input type="hidden" name="ultimate" value="' + escape(ultimate) + '">') :
        '<p class="meta">' + (en ? 'Unlocks at Lv. ' : 'Se aprende al Nv. ') + ultimateLevel + '</p>') + '</fieldset>' +
      '<button type="submit"' + (active.length ? '' : ' disabled') + '>' + (en ? 'Save moves' : 'Guardar ataques') + '</button></form>' +
      (url.searchParams.has('saved') ? '<p role="status">' + (en ? 'Moves saved.' : 'Ataques guardados.') + '</p>' : '') +
      '</section><script src="/assets/moveset.js" defer></script><script src="/assets/shop-status.js" defer></script>')
  }
  const requestedTab = url.searchParams.get('tab')
  const tab = ['inventory', 'overview', 'shop', 'log'].includes(requestedTab) ? requestedTab : 'dex'
  const shopLabel = language === 'en' ? 'Shop' : 'Tienda'
  let shopPage = ''
  if (tab === 'shop') {
    const en = language === 'en'
    const available = shopOpen
    const requestedSection = url.searchParams.get('section')
    const section = ['held', 'eggs', 'keys'].includes(requestedSection) ? requestedSection : 'balls'
    const shopTabs = '<nav class="tabs shop-sections" aria-label="' + shopLabel + '">' +
      [['balls', 'Poké Balls'], ['held', en ? 'Held items' : 'Objetos equipables'], ['eggs', 'Poké Egg'], ['keys', en ? 'Key Items' : 'Objetos clave']].map(([id, label]) =>
        '<a href="/?' + escape(new URLSearchParams({ community: selected.community_id, tab: 'shop', section: id })) + '"' +
        (section === id ? ' aria-current="page"' : '') + '>' + label + '</a>').join('') + '</nav>'
    const purchase = url.searchParams.get('purchase')
    const order = purchase && await env.DB.prepare('SELECT item, result FROM shop_orders WHERE community_id = ? AND viewer_id = ? AND id = ?')
      .bind(selected.community_id, selected.viewer_id, purchase).first()
    const status = { expired: en ? 'Order expired.' : 'El pedido caducó.', review: en ? 'Order unconfirmed. Check your balance.' : 'Pedido sin confirmar. Revisa tu saldo.', purchased: en ? 'Purchase complete' : 'Compra realizada', owned: en ? 'Already owned' : 'Ya tienes ese objeto',
      funds: fundsText, repriced: en ? 'The price changed.' : 'El precio cambió.', unavailable: en ? 'Purchase could not be completed' : 'No se pudo completar la compra',
      battleLocked: botCopy[language].battleLocked,
      maxed: en ? 'That Pokémon is at the DNA limit' : 'Ese Pokémon ya alcanzó el máximo de DNA' }
    const pending = order && !order.result
    const eggDialog = section === 'eggs' ? hatchDialog(en) : ''
    shopPage = '<section class="sheet"><h2>' + shopLabel + '</h2><p>Pokédólares · <strong data-shop-wallet="' + escape(pokeDollars) + '">$' + escape(pokeDollars) + '</strong> <span data-shop-delta aria-live="polite"></span></p>' + shopTabs +
      (url.searchParams.has('repriced') ? '<p role="status">' + (en ? 'The price changed. Check it before buying again.' : 'El precio cambió. Revísalo antes de volver a comprar.') + '</p>' : '') +
      (purchaseWarning ? '<p role="status" class="empty">' + escape(purchaseWarning) + '</p>' : '') +
      '<p role="status" class="empty" data-shop-availability data-offline="' + escape(offlineText) + '" data-upgrade="' +
      escape(reasons.quantity) + '"' + (available && online?.supports_quantity ? ' hidden' : '') + '>' +
      escape(available ? reasons.quantity : offlineText) + '</p>' +
      submittingPurchase(en) + (pending ? '<p role="status" data-order-receipt' + pendingPurchase(en) + '>' + (en ? 'Order sent. Waiting for the streamer’s app to confirm…' : 'Pedido enviado. Esperando confirmación de la app del streamer…') + '</p>' :
        order && status[order.result] ? '<p role="status" data-order-receipt>' + status[order.result] + '</p>' : '') +
      '<ul class="held-grid shop-grid">' + Object.entries(shopItems).filter(([id, product]) =>
        (!arenaShopItems.includes(id) || Object.hasOwn(published ?? {}, id)) && (section === 'held' ? product.held : section === 'balls' ? product.ball : product.section === section)
      ).map(([id, product]) => {
        const owned = product.held && ownedItems.includes(id)
        const price = published?.[id] ?? product.price
        const featured = featuredShopItems.includes(id)
        const needsUpdate = (id === 'master-ball' || featured) && !Object.hasOwn(published ?? {}, id)
        const action = '/shop/buy?' + new URLSearchParams({ community: selected.community_id, item: id, order: crypto.randomUUID(), price })
        const button = '<button data-buy="' + (en ? 'Buy' : 'Comprar') + '" data-owned="' + (en ? 'Owned' : 'Ya lo tienes') + '"' + (!available || pending || owned || needsUpdate || pokeDollars < price ? ' disabled' : '') + '>' +
          (owned ? (en ? 'Owned' : 'Ya lo tienes') : (en ? 'Buy' : 'Comprar')) + '</button>'
        const quantityInput = product.ball
          ? quantityField(en, price, Math.min(maxShopQuantity, Math.floor(pokeDollars / price))) : ''
        return '<li><img class="bag-icon" src="' + shopIconUrl(id) + '" alt="" width="30" height="30"><strong>' + escape(product.names[Number(en)]) + '</strong><span>$' + price + '</span>' +
          '<form method="post" data-shop-buy data-shop-product="' + id + '" data-shop-price="' + price + '" action="' + escape(action) + '"' +
          (product.ball ? ' data-shop-ball="' + product.ball + '"' : '') + (featured ? ' data-shop-feature' : '') + '>' +
          (product.ball ? '<span class="shop-count">' + (en ? 'In bag' : 'En la bolsa') + ' <strong data-shop-count>×' + escape(balls[product.ball] ?? 0) + '</strong></span>' : '') + quantityInput + button + '</form>' + (featured ? '<small data-feature-upgrade' + (needsUpdate ? '' : ' hidden') + '>' + reasons.feature + '</small>' : '') + (id === 'master-ball' ? '<small data-shop-master-upgrade' + (available && needsUpdate ? '' : ' hidden') + '>' + escape(reasons.master) + '</small>' : '') +
          (available && !needsUpdate && !owned && pokeDollars < price ? '<small>' + escape(fundsText) + '</small>' : '') + '</li>'
      }).join('') + '</ul>' + eggDialog + '</section><script src="/assets/shop-status.js?v=2" defer></script>'
  }
  const logDescription = entry => {
    const outcome = Object.hasOwn(outcomes, entry.result) ? outcomes[entry.result] : ''
    if (!entry.capture) return [entry.action, outcome].filter(Boolean).join(' · ')
    const { ball, remaining, pokemon } = entry.capture
    const names = { normal: 'Poké Ball', great: en ? 'Great Ball' : 'Super Ball', ultra: 'Ultra Ball', master: 'Master Ball' }
    const name = names[ball]
    const viewer = displayName || identity.login || (en ? 'Viewer' : 'Espectador')
    return [en ? viewer + ' threw a ' + name : viewer + ' lanzó una ' + name,
      pokemon ? outcome + ' · ' + pokemon : outcome,
      en ? 'Remaining (' + name + '): ' + remaining : 'Restantes (' + name + '): ' + remaining].filter(Boolean).join(' · ')
  }
  const outcomes = en ?
    { joined: 'Joined', caught: 'Caught', escaped: 'Escaped', noBalls: 'Out of Poké Balls', noEncounter: 'No wild Pokémon', summoned: 'Summoned', removed: 'Withdrawn', duplicateReward: 'Earned XP', alreadyCaught: 'Already caught', candyUsed: 'Used Rare Candy' } :
    { joined: 'Registro', caught: 'Captura', escaped: 'Se escapó', noBalls: 'Sin Poké Balls', noEncounter: 'Sin encuentro activo', summoned: 'Invocado', removed: 'Retirado', duplicateReward: 'Ganó XP', alreadyCaught: 'Ya capturado', candyUsed: 'Usó Caramelo Raro' }
  const overviewLabel = language === 'en' ? 'Overview' : 'Resumen'
  const minutes = metrics.summonMinutes ?? 0
  const overview = '<section class="sheet"><h2>' + overviewLabel + '</h2><dl class="overview-stats">' +
    [[language === 'en' ? 'Wins' : 'Victorias', metrics.wins ?? 0],
      [language === 'en' ? 'Losses' : 'Derrotas', metrics.losses ?? 0],
      [language === 'en' ? 'Time summoned' : 'Tiempo invocado', Math.floor(minutes / 60) + ' h ' + minutes % 60 + ' min']]
      .map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + escape(value) + '</dd></div>').join('') + '</dl></section>'
  const regions = [
    ['kanto', 'Kanto', 1, 151], ['johto', 'Johto', 152, 251],
    ['hoenn', 'Hoenn', 252, 386], ['sinnoh', 'Sinnoh', 387, 493],
    ['unova', 'Unova', 494, 649], ['kalos', 'Kalos', 650, 721],
    ['alola', 'Alola', 722, 809], ['galar', 'Galar', 810, 898],
    ['hisui', 'Hisui', 899, 905], ['paldea', 'Paldea', 906, 1025], ['all', language === 'en' ? 'All' : 'Todas', 1, nationalDex.length]
  ]
  const region = regions.find(([id]) => id === url.searchParams.get('region')) ?? regions[0]
  const caughtOnly = url.searchParams.get('caught') === '1'
  const href = (name, regionId = region[0], only = caughtOnly) => '?' + new URLSearchParams({
    tab: name, community: selected.community_id, region: regionId, ...(name === 'dex' && only ? { caught: '1' } : {})
  })
  const spriteBase = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/'
  const inventory = [
    ['normal', 'Poké Ball', 'poke-ball'], ['great', 'Great Ball', 'great-ball'],
    ['ultra', 'Ultra Ball', 'ultra-ball'], ['master', 'Master Ball', 'master-ball']
  ].filter(([id]) => balls[id] > 0)
    .map(([id, name, icon]) => '<li class="bag-slot"><img class="bag-icon" src="' + spriteBase + 'items/' + icon +
      '.png" width="30" height="30" alt=""><span>' + name + '</span><strong>×' + escape(balls[id]) + '</strong></li>').join('')
  const pockets = [ ['balls', language === 'en' ? 'Poké Balls' : 'Poké Balls'],
    ['held', language === 'en' ? 'Held items' : 'Objetos equipables'], ['key', language === 'en' ? 'Consumables' : 'Consumibles'] ]
  const pocket = pockets.some(([id]) => id === url.searchParams.get('pocket')) ? url.searchParams.get('pocket') : 'balls'
  const wallet = '<p class="meta">Pokédólares · <strong>$' + escape(pokeDollars) + '</strong></p>'
  const consumables = [['rare-candy', language === 'en' ? 'Rare Candy' : 'Caramelo Raro', rareCandies],
    ['dowsing-machine', 'Legendary Tracker', legendaryTrackers]].map(([icon, label, amount]) =>
    '<li class="bag-slot">' + itemIcon(icon) + '<span>' + label + '</span><strong>×' + escape(amount) + '</strong></li>').join('')
  const inventoryPage = '<section class="sheet"><h2>' + (language === 'en' ? 'Inventory' : 'Inventario') + '</h2>' + wallet + '<nav class="tabs pockets" aria-label="Inventory">' + pockets.map(([id, label]) =>
    '<a href="?' + escape(new URLSearchParams({ community: selected.community_id, tab: 'inventory', pocket: id })) + '"' +
    (id === pocket ? ' aria-current="page"' : '') + '>' + label + '</a>').join('') + '</nav>' +
    (pocket === 'key' ? '<ul class="bag">' + consumables + '</ul>' : pocket === 'held' && availableItems.length ?
      '<ul class="held-grid">' + availableItems.map(item => '<li>' + itemIcon(item) + '<strong>' + itemName(item) + '</strong></li>').join('') + '</ul>' :
      pocket === 'balls' && inventory ? '<ul class="bag">' + inventory + '</ul>' : '<p class="empty">' + t('Tu bolsa está vacía.') + '</p>') + '</section>'
  const seen = new Map()
  const eggAcquired = new Map()
  if (tab === 'dex' && selected.viewer_id) {
    const [seenRows, eggs] = await env.DB.batch([
      env.DB.prepare('SELECT species_id, seen_at FROM dex_seen WHERE account_id = ? AND community_id = ?').bind(identity.account_id, selected.community_id),
      env.DB.prepare("SELECT CAST(json_extract(o.hatch, '$.id') AS INTEGER) AS dex, MAX(o.created_at) AS acquired FROM shop_orders o JOIN account_identities i ON i.viewer_id = o.viewer_id WHERE o.community_id = ? AND i.account_id = ? AND o.result = 'purchased' AND o.hatch IS NOT NULL AND json_extract(o.hatch, '$.duplicate') = 0 GROUP BY dex").bind(selected.community_id, identity.account_id)
    ])
    for (const row of seenRows.results) seen.set(row.species_id, row.seen_at)
    for (const row of eggs.results) eggAcquired.set(row.dex, row.acquired)
  }
  const regionSpecies = nationalDex.slice(region[2] - 1, region[3])
  const borders = tab === 'dex' ? '<style>' + [...new Set(regionSpecies.map(([dex]) => familyRoot(dex)))].map(root =>
    '.dex-grid:has([data-family="' + root + '"]:is(:hover,:focus-within)) [data-family="' + root + '"]{outline:2px solid #6664ac;outline-offset:1px}'
  ).join('') + '</style>' : ''
  const slots = tab === 'dex' ? regionSpecies.map(([dex, , label]) => {
    const key = kanto[dex - 1] ?? label
    const normal = collection[key]
    const shiny = collection[key + ' ✦']
    const owned = normal !== undefined || shiny !== undefined
    if (caughtOnly && !owned) return ''
    const sprite = spriteBase + 'pokemon/' +
      (normal === undefined && shiny !== undefined ? 'shiny/' : '') + dex + '.png'
    const summaryLink = (species, label, className = '') =>
      '<a class="' + className + '" href="?' + escape(new URLSearchParams({ community: selected.community_id, region: region[0], pokemon: species })) +
      '">' + label + '</a>'
    const details = [
      normal !== undefined ? summaryLink(key, 'Normal · Lv. ' + level(normal)) : '',
      shiny !== undefined ? summaryLink(key + ' ✦', '✦ Shiny · Lv. ' + level(shiny), 'shiny-tag') : ''
    ].join('')
    const member = owned ? (normal === undefined ? key + ' ✦' : key) :
      familyLinks(dex).flatMap(([id]) => [speciesName(id), speciesName(id) + ' ✦'])
        .find(variant => Object.hasOwn(collection, variant))
    const profile = '<img src="' + sprite + '" width="96" height="96" loading="lazy" alt=""><strong>' + escape(label) + '</strong>'
    const acquired = Math.max(dexAcquired[key] ?? 0, dexAcquired[key + ' ✦'] ?? 0, eggAcquired.get(dex) ?? 0)
    const isNew = owned && acquired > (seen.get(dex) ?? 0)
    return '<li class="slot ' + (owned ? 'owned' : 'locked') + '" data-family="' + familyRoot(dex) + '"' +
      (isNew ? ' data-dex-new="' + dex + '" data-acquired="' + acquired + '"><span class="dex-new">' + (en ? 'NEW' : 'NUEVO') + '</span>' : '>') + '<span class="dex-number">#' +
      String(dex).padStart(3, '0') + '</span>' +
      (member ? summaryLink(member, profile, 'dex-entry') : profile) +
      '<div class="variants">' + (details || '<span>' + t("Sin capturar") + '</span>') + '</div></li>'
  }).join('') : ''
  const updated = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-PE', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima'
  }).format(selected.updated_at)
  const actions = '<div class="album-actions"><a class="button" href="/?account=1">' + t("Cuentas vinculadas") + '</a><a class="button" href="/">' + t("Cambiar streamer") + '</a>' + logout + '</div>'
  const regionNav = regions.map(([id, label]) => '<a href="' + escape(href('dex', id)) + '"' +
    (id === region[0] ? ' aria-current="page"' : '') + '>' + label + '</a>').join('')
  const nav = communityTabs(selected.community_id, language, tab, region[0])
  return page('<div class="toolbar"><div><p class="meta">Viewer · ' + escape(displayName) + '</p><h1>' + t("Tu álbum") + '</h1></div>' +
    actions + '</div><p class="meta community-label">' + t('Comunidad · ') + escape(selected.community_name ?? selected.community_id) + '</p>' + nav +
    (tab === 'dex' ? borders + '<section class="sheet"><div class="dex-heading"><h2>Pokédex</h2><a class="button"' + (caughtOnly ? ' aria-current="true"' : '') + ' href="' + escape(href('dex', region[0], !caughtOnly)) + '">' +
      (en ? 'Unlocked' : 'Desbloqueados') + '</a></div><nav class="tabs generations" aria-label="' + t('Región') + '">' + regionNav + '</nav><ol class="dex-grid" data-dex-community="' + escape(selected.community_id) + '">' + slots + '</ol></section><script src="/assets/dex-new.js" defer></script>'
      : tab === 'overview' ? overview : tab === 'shop' ? shopPage : tab === 'log' ?
        '<section class="sheet"><h2>' + (en ? 'Activity log' : 'Registro de actividad') + '</h2><ul>' +
        [...log].reverse().map(entry => '<li><time>' + escape(new Date(entry.at).toLocaleString(language, { timeZone: 'America/Lima' })) +
          '</time> · ' + escape(entry.platform + ' · ' + logDescription(entry)) + '</li>').join('') + '</ul></section>' : inventoryPage) +
    '<div class="toolbar"><p class="meta">' + (updated ? t('Última sincronización · ') + escape(updated) + ' (Lima)' : t('Todavía no hay progreso sincronizado')) +
    '</p></div>')
}
