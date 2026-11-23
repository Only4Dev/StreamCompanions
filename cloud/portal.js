import { helpPage } from './help.js'
import { aboutCopy, projectLinks } from '../ui/about.js'
import appPackage from '../package.json' with { type: 'json' }
import { webEnglish } from "./web-copy.js"
import { authorizeUrl, eraseAccount, platformIdentity, providerConfig, sessionKey, signIn, unlinkIdentity } from './auth.js'
import { nationalDex } from './national-dex.js'
import { kanto } from './kanto.js'
import { equippedMoves, moves } from '../dev/battle.js'
import { familyDnaCount, familyRoot, maxDnaBoosters } from '../ui/evolution.js'
import { creatureMoves, parseLoadout, speciesName, validMoveset } from './movesets.js'
import { portalStyles, dexStyles, providerStyles, languageStyles, helpStyles, darkStyles } from './portal-style.js'
import { level, maxLevel, ultimateLevel, xpAtLevel } from '../ui/levels.js'
import { heldItems } from '../ui/held-items.js'
import { shopItems } from '../ui/shop.js'

const families = new Map()
for (const entry of nationalDex) {
  const root = familyRoot(entry[0])
  if (!families.has(root)) families.set(root, [])
  families.get(root).push(entry)
}
const familyLinks = id => families.get(familyRoot(id)) ?? []
const dexByName = new Map(nationalDex.map(([id]) => [speciesName(id), id]))
function sharedDna(boosters, key) {
  const shiny = key.endsWith(' ✦')
  const id = dexByName.get(key.replace(/ ✦$/, ''))
  const keys = id ? familyLinks(id).map(([member]) => speciesName(member) + (shiny ? ' ✦' : '')) : [key]
  return familyDnaCount(boosters, keys)
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
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; img-src https://raw.githubusercontent.com; style-src 'unsafe-inline'; form-action 'self' https://id.kick.com https://id.twitch.tv; frame-ancestors 'none'" })
  headers.append('Set-Cookie', cookie('sc_lang', language, 31_536_000))
  headers.append('Set-Cookie', cookie('sc_theme', theme, 31_536_000))
  return new Response('<!doctype html><html lang="' + language + '" data-theme="' + theme + '"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Stream Companions</title><style>' + portalStyles + dexStyles + providerStyles + languageStyles + helpStyles + darkStyles + '</style>' +
    '<main><header class="mast"><span class="mark" aria-hidden="true">✦</span>Stream Companions<nav class="web-language" aria-label="Language">' + '<a class="help-header" href="?' + escape(new URLSearchParams({
      tab: 'help', ...(url.searchParams.get('community') ? { community: url.searchParams.get('community') } : {})
    })) + '">' + (language === 'en' ? 'Help' : 'Ayuda') + '</a><a href="/?tab=about">' + aboutCopy[language].about + '</a>' + themeLink + languageLinks + '</nav></header>' + body + '</main></html>', { status, headers })
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

export async function portal(request, url, env) {
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
  const requested = url.searchParams.get('lang') ?? getCookie(request, 'sc_lang')
  const language = requested === 'en' ? 'en' : 'es'
  const t = text => language === 'en' ? webEnglish[text] ?? text : text
  const theme = (url.searchParams.get('theme') ?? getCookie(request, 'sc_theme')) === 'light' ? 'light' : 'dark'
  const page = (body, status = 200) => renderPage(body, status, language, theme, url)
  if (request.method === 'GET' && url.pathname === '/' && url.searchParams.get('tab') === 'about') {
    const about = aboutCopy[language]
    return page('<section class="sheet"><h1>' + about.about + '</h1><p><strong>Stream Companions</strong> · ' + about.version + ' ' + escape(appPackage.version) +
      '</p><p>' + about.by + ' <a href="' + projectLinks.author + '">Only4Dev</a></p><p>' + about.project + '</p><p>' + about.rights +
      '</p><p>' + about.credits + '</p><ul><li><a href="' + projectLinks.sprites + '">PMDCollab / SpriteCollab</a></li><li><a href="' +
      projectLinks.spriteLicense + '">' + about.license + '</a></li><li><a href="' + projectLinks.pokeapi + '">PokéAPI Sprites</a></li></ul></section>')
  }
  const helpLabel = language === 'en' ? 'Help' : 'Ayuda'
  if (request.method === 'GET' && url.pathname === '/' && url.searchParams.get('tab') === 'help') {
    const community = url.searchParams.get('community')
    const nav = community ? '<nav class="tabs" aria-label="Stream Companions">' +
      ['dex', 'inventory', 'overview'].map(tab => '<a href="?' + escape(new URLSearchParams({ community, tab })) +
        '">' + (tab === 'overview' ? (language === 'en' ? 'Overview' : 'Resumen') : tab === 'dex' ? 'Dex' : 'Inventory') + '</a>').join('') + '<a aria-current="page" href="?' +
      escape(new URLSearchParams({ community, tab: 'help' })) + '">' + helpLabel + '</a></nav>' :
      '<nav class="tabs"><a href="/">' + (language === 'en' ? 'Back to portal' : 'Volver al portal') + '</a></nav>'
    return page(helpPage(language, nav))
  }
  const route = url.pathname.match(/^\/auth\/(twitch|kick)(?:\/(callback|link))?$/)
  const session = getCookie(request, 'sc_session')
  const key = /^[a-f0-9]{64}$/.test(session ?? '') ? await sessionKey(session) : null
  const identity = key ? await env.DB.prepare(
    'SELECT s.viewer_id, s.login, ident.account_id FROM web_sessions s ' +
    'JOIN account_identities ident ON ident.viewer_id = s.viewer_id WHERE s.id IN (?, ?) AND s.expires_at > ? AND ident.detached_at IS NULL'
  ).bind(session, key, Date.now()).first() : null

  if (route) {
    const [, provider, action] = route
    const config = providerConfig(env, provider)
    if (!config) return page('<p>' + t('El acceso con ') + providers[provider] + t(' todavía no está disponible.') + ' <a href="/">' + t("Volver") + '</a></p>', 503)
    const callback = url.origin + '/auth/' + provider + '/callback'
    const cookieName = 'sc_flow_' + provider
    if (action === 'callback' && request.method === 'GET') {
      const [state, verifier, linkSession] = (getCookie(request, cookieName) || '').split('.')
      const code = url.searchParams.get('code')
      if (!code || !state || state !== url.searchParams.get('state') ||
          (linkSession && (!identity || linkSession !== session))) {
        return page('<p>' + t("La autorización venció o fue cancelada.") + ' <a href="/">' + t("Volver") + '</a></p>', 400)
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
        cookie(cookieName, '', 0), cookie('sc_session', newSession, 86_400)
      ])
    }
    const linking = action === 'link'
    if ((!action && request.method === 'GET') ||
        (linking && request.method === 'POST' && identity && request.headers.get('Origin') === url.origin)) {
      const state = randomId()
      const verifier = randomId()
      const destination = await authorizeUrl(provider, config, callback, state, verifier)
      return redirect(destination, [cookie(cookieName, [state, verifier, linking ? session : ''].join('.'), 600)])
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
    'SELECT p.community_id, p.viewer_id, p.payload, p.updated_at, row_number() OVER (PARTITION BY p.community_id ORDER BY p.updated_at DESC, p.viewer_id) AS entry ' +
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
    const message = url.searchParams.has('unlinked') ? (language === 'en' ? 'Sign-in unlinked. Your progress is still saved.' : 'Acceso desvinculado. Tu progreso sigue guardado.') :
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
  const { displayName, balls, collection, metrics = {}, heldItems: ownedItems = [], rareCandies = 0, pokeDollars = 0, dnaBoosters = {} } = JSON.parse(selected.payload)
  const online = buying || url.searchParams.get('tab') === 'shop' || !editing && url.searchParams.has('pokemon')
    ? await env.DB.prepare('SELECT seen_at, prices, supports_dna FROM shop_online WHERE community_id = ?').bind(selected.community_id).first() : null
  const published = online?.prices ? JSON.parse(online.prices) : null
  if (buying) {
    const item = url.searchParams.get('item')
    const orderId = url.searchParams.get('order')
    if (!Object.hasOwn(shopItems, item ?? '') || !/^[a-f0-9-]{36}$/.test(orderId ?? '')) return new Response(null, { status: 400 })
    const product = shopItems[item]
    const target = product.dna ? url.searchParams.get('pokemon') : null
    if (product.dna && (!(online?.supports_dna >= 2) || !Object.hasOwn(collection, target ?? '') || sharedDna(dnaBoosters, target) >= maxDnaBoosters)) {
      return new Response(null, { status: 409 })
    }
    const destination = target ? { pokemon: target } : { tab: 'shop' }
    const price = published?.[item] ?? product.price
    const quote = url.searchParams.get('price')
    if ((!published && quote === null) || quote === String(price)) {
      if ((product.held && ownedItems.includes(item)) || pokeDollars < price) return new Response(null, { status: 409 })
    } else return redirect('/?' + new URLSearchParams({ community: selected.community_id, ...destination, repriced: '1' }), [])
    const now = Date.now()
    const queued = await env.DB.prepare('INSERT OR IGNORE INTO shop_orders (id, community_id, viewer_id, item, created_at, price, species_key) ' +
      'SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM shop_online WHERE community_id = ? AND seen_at > ? AND prices IS ? AND (? IS NULL OR supports_dna >= 2)) ' +
      'AND EXISTS (SELECT 1 FROM account_identities WHERE viewer_id = ? AND account_id = ?) AND EXISTS (SELECT 1 FROM web_sessions WHERE id IN (?, ?) AND expires_at > ?)')
      .bind(orderId, selected.community_id, selected.viewer_id, item, now, published ? price : null, target,
        selected.community_id, now - 70_000, online?.prices ?? null, target, selected.viewer_id, identity.account_id, session, key, Date.now()).run()
    return redirect('/?' + new URLSearchParams({ community: selected.community_id, ...destination, ...(queued.meta.changes ? (target ? { purchase: orderId } : {}) : { retry: '1' }) }), [])
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
    const dnaMessage = url.searchParams.has('repriced') ? (en ? 'The price changed.' : 'El precio cambió.') :
      url.searchParams.has('retry') ? (en ? 'Purchase unavailable. Check for a pending order.' : 'Compra no disponible. Revisa si hay un pedido pendiente.') :
      dnaOrder ? (dnaOrder.result === 'purchased' ? (en ? 'Purchase complete.' : 'Compra realizada.') :
        dnaOrder.result ? (en ? 'Purchase could not be completed.' : 'No se pudo completar la compra.') :
          (en ? 'Purchase pending. Refresh to check its status.' : 'Compra pendiente. Recarga para consultar el estado.')) : ''
    const dnaSection = '<div class="held-frame"><strong>DNA Booster ' + (dna >= maxDnaBoosters ? 'MAX' : dna + '/' + maxDnaBoosters) + '</strong>' +
      '<span>' + (en ? 'Shared across this evolution line' : 'Compartido en esta línea evolutiva') + '</span>' +
      (dnaMessage ? '<span role="status">' + dnaMessage + '</span>' : '') +
      (dna < maxDnaBoosters ? '<form method="post" action="' + escape(dnaAction) + '"><button' +
        (!(online?.supports_dna >= 2 && online.seen_at > Date.now() - 70_000) || (dnaOrder && !dnaOrder.result) || pokeDollars < dnaPrice ? ' disabled' : '') + '>' +
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
    return page('<section class="sheet creature-summary"><p><a href="' + escape(returnToDex) + '">' +
      (en ? 'Back to Pokédex' : 'Volver a la Pokédex') + '</a></p>' + familyNav + '<div class="summary-profile"><img alt="" width="120" height="120" src="' + sprite +
      '"><div><h1>' + escape(speciesKey) + '</h1><p class="summary-meta">#' + String(detail.id).padStart(3, '0') + ' · Lv. ' + detail.rank +
      detail.types.map(type => typeIcon(type, en)).join('') + '</p>' + (description ? '<p>' + escape(description) + '</p>' : '') +
      (detail.form === detail.id ? '' : '<p>' + (en ? 'Battle form · ' : 'Forma en combate · ') + escape(speciesName(detail.form)) + '</p>') +
      xpBar + '</div><div class="summary-equipment">' + itemFrame + '</div></div><dl class="battle-stats">' + stats.map(([es, english, key]) => '<div><dt>' + (en ? english : es) +
        '</dt><dd>' + Math.round(detail.stats[key]) + '</dd></div>').join('') + '</dl>' + dnaSection +
      '<h2>' + (en ? 'Moveset' : 'Ataques activos') + '</h2><form class="moveset-form" method="post" action="' + escape(action) +
      '"><fieldset><legend>' + (en ? 'Choose up to four' : 'Elige hasta cuatro') + ' · <output>' + active.length + ' / 4</output></legend><div class="move-options">' +
      [...detail.unlockedAt].map(([key, rank]) => moveCard(key, active.includes(key), en, rank > detail.rank ? rank : 0)).join('') +
      '</div></fieldset><fieldset class="ultimate-slot"><legend>' + (en ? 'Ultimate' : 'Ataque definitivo') + '</legend>' +
      (ultimate ? (detail.ultimates.length > 1 ? '<select name="ultimate" aria-label="' + (en ? 'Ultimate' : 'Ataque definitivo') + '">' +
        detail.ultimates.map(key => '<option value="' + escape(key) + '"' + (key === ultimate ? ' selected' : '') + '>' + escape(moves[key].name) + '</option>').join('') + '</select>' :
        '<div class="move-options">' + moveCard(ultimate, true, en) + '</div><input type="hidden" name="ultimate" value="' + escape(ultimate) + '">') :
        '<p class="meta">' + (en ? 'Unlocks at Lv. ' : 'Se aprende al Nv. ') + ultimateLevel + '</p>') + '</fieldset>' +
      '<button type="submit"' + (active.length ? '' : ' disabled') + '>' + (en ? 'Save moves' : 'Guardar ataques') + '</button></form>' +
      (url.searchParams.has('saved') ? '<p role="status">' + (en ? 'Moves saved.' : 'Ataques guardados.') + '</p>' : '') +
      '</section><script src="/assets/moveset.js" defer></script>')
  }
  const requestedTab = url.searchParams.get('tab')
  const tab = ['inventory', 'overview', 'shop'].includes(requestedTab) ? requestedTab : 'dex'
  const shopLabel = language === 'en' ? 'Shop' : 'Tienda'
  let shopPage = ''
  if (tab === 'shop') {
    const en = language === 'en'
    const available = online && online.seen_at > Date.now() - 70_000
    const order = await env.DB.prepare('SELECT item, result FROM shop_orders WHERE community_id = ? AND viewer_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(selected.community_id, selected.viewer_id).first()
    const status = { purchased: en ? 'Purchase complete' : 'Compra realizada', owned: en ? 'Already owned' : 'Ya tienes ese objeto',
      funds: en ? 'Not enough Pokédollars' : 'Pokédólares insuficientes', unavailable: en ? 'Purchase could not be completed' : 'No se pudo completar la compra',
      maxed: en ? 'That Pokémon is at the DNA limit' : 'Ese Pokémon ya alcanzó el máximo de DNA' }
    const pending = order && !order.result
    shopPage = '<section class="sheet"><h2>' + shopLabel + '</h2><p>Pokédólares · <strong>$' + escape(pokeDollars) + '</strong></p>' +
      (url.searchParams.has('repriced') ? '<p role="status">' + (en ? 'The price changed. Check it before buying again.' : 'El precio cambió. Revísalo antes de volver a comprar.') + '</p>' : '') +
      (!available ? '<p class="empty">' + (en ? 'The shop opens when the streamer runs the game.' : 'La tienda abre cuando el streamer tiene el juego activo.') + '</p>' : '') +
      (pending ? '<p role="status">' + (en ? 'Purchase pending. Refresh to check its status.' : 'Compra pendiente. Recarga para consultar el estado.') + '</p>' :
        order && status[order.result] ? '<p role="status">' + status[order.result] + '</p>' : '') +
      '<ul class="held-grid">' + Object.entries(shopItems).filter(([, product]) => !product.dna).map(([id, product]) => {
        const owned = product.held && ownedItems.includes(id)
        const price = published?.[id] ?? product.price
        const action = '/shop/buy?' + new URLSearchParams({ community: selected.community_id, item: id, order: crypto.randomUUID(), price })
        const button = '<button' + (!available || pending || owned || pokeDollars < price ? ' disabled' : '') + '>' +
          (owned ? (en ? 'Owned' : 'Ya lo tienes') : (en ? 'Buy' : 'Comprar')) + '</button>'
        return '<li>' + itemIcon(id) + '<strong>' + escape(product.names[Number(en)]) + '</strong><span>$' + price + '</span>' +
          '<form method="post" action="' + escape(action) + '">' + button + '</form></li>'
      }).join('') + '</ul></section>'
  }
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
    ['hisui', 'Hisui', 899, 905], ['paldea', 'Paldea', 906, 1025]
  ]
  const region = regions.find(([id]) => id === url.searchParams.get('region')) ?? regions[0]
  const href = (name, regionId = region[0]) => '?' + new URLSearchParams({
    tab: name, community: selected.community_id, region: regionId
  })
  const spriteBase = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/'
  const inventory = [
    ['normal', 'Poké Ball', 'poke-ball'], ['great', 'Great Ball', 'great-ball'],
    ['ultra', 'Ultra Ball', 'ultra-ball'], ['master', 'Master Ball', 'master-ball']
  ].filter(([id]) => balls[id] > 0)
    .map(([id, name, icon]) => '<li class="bag-slot"><img class="bag-icon" src="' + spriteBase + 'items/' + icon +
      '.png" width="30" height="30" alt=""><span>' + name + '</span><strong>×' + escape(balls[id]) + '</strong></li>').join('')
  const pockets = [ ['balls', language === 'en' ? 'Ball pocket' : 'Poké Balls'],
    ['held', language === 'en' ? 'Held items' : 'Objetos equipables'], ['key', language === 'en' ? 'Key items' : 'Objetos clave'] ]
  const pocket = pockets.some(([id]) => id === url.searchParams.get('pocket')) ? url.searchParams.get('pocket') : 'balls'
  const wallet = '<p class="meta">Pokédólares · <strong>$' + escape(pokeDollars) + '</strong> · ' +
    (language === 'en' ? 'Rare Candy' : 'Caramelo Raro') + ' <strong>×' + escape(rareCandies) + '</strong></p>'
  const inventoryPage = '<section class="sheet"><h2>Inventory</h2>' + wallet + '<nav class="tabs pockets" aria-label="Inventory">' + pockets.map(([id, label]) =>
    '<a href="?' + escape(new URLSearchParams({ community: selected.community_id, tab: 'inventory', pocket: id })) + '"' +
    (id === pocket ? ' aria-current="page"' : '') + '>' + label + '</a>').join('') + '</nav>' +
    (pocket === 'key' ? '<p class="empty">' + (language === 'en' ? 'Coming soon' : 'Próximamente') + '</p>' : pocket === 'held' && availableItems.length ?
      '<ul class="held-grid">' + availableItems.map(item => '<li>' + itemIcon(item) + '<strong>' + itemName(item) + '</strong></li>').join('') + '</ul>' :
      pocket === 'balls' && inventory ? '<ul class="bag">' + inventory + '</ul>' : '<p class="empty">' + t('Tu bolsa está vacía.') + '</p>') + '</section>'
  const regionSpecies = nationalDex.slice(region[2] - 1, region[3])
  const borders = tab === 'dex' ? '<style>' + [...new Set(regionSpecies.map(([dex]) => familyRoot(dex)))].map(root =>
    '.dex-grid:has([data-family="' + root + '"]:is(:hover,:focus-within)) [data-family="' + root + '"]{outline:2px solid #6664ac;outline-offset:1px}'
  ).join('') + '</style>' : ''
  const slots = tab === 'dex' ? regionSpecies.map(([dex, , label]) => {
    const key = kanto[dex - 1] ?? label
    const normal = collection[key]
    const shiny = collection[key + ' ✦']
    const owned = normal !== undefined || shiny !== undefined
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
    return '<li class="slot ' + (owned ? 'owned' : 'locked') + '" data-family="' + familyRoot(dex) + '"><span class="dex-number">#' +
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
  const nav = [['dex', 'Dex'], ['inventory', 'Inventory'], ['shop', shopLabel], ['overview', overviewLabel], ['help', helpLabel]]
    .map(([name, label]) => '<a href="' + escape(href(name)) + '"' +
      (tab === name ? ' aria-current="page"' : '') + '>' + label + '</a>').join('')
  return page('<div class="toolbar"><div><p class="meta">Viewer · ' + escape(displayName) + '</p><h1>' + t("Tu álbum") + '</h1></div>' +
    actions + '</div><p class="meta community-label">' + t('Comunidad · ') + escape(selected.community_name ?? selected.community_id) + '</p><nav class="tabs" aria-label="Álbum">' + nav + '</nav>' +
    (tab === 'dex' ? borders + '<section class="sheet"><h2>Pokédex</h2><nav class="tabs generations" aria-label="' + t('Región') + '">' + regionNav + '</nav><ol class="dex-grid">' + slots + '</ol></section>'
      : tab === 'overview' ? overview : tab === 'shop' ? shopPage : inventoryPage) +
    '<div class="toolbar"><p class="meta">' + (updated ? t('Última sincronización · ') + escape(updated) + ' (Lima)' : t('Todavía no hay progreso sincronizado')) +
    '</p></div>')
}
