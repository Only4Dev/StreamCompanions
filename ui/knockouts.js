const params = new URLSearchParams(location.search)
const preview = ['1', 'raid'].includes(params.get('preview')) ? params.get('preview') : ''
const scale = Math.min(300, Math.max(100, Number(params.get('scale')) || 150))
const feed = document.querySelector('#feed')
const source = document.querySelector('#source')
const winner = document.querySelector('#winner')
const raid = document.querySelector('#raid')
const bossName = document.querySelector('#boss-name')
const bossHealth = document.querySelector('#boss-health')
const bossPoints = document.querySelector('#boss-points')
const raidTime = document.querySelector('#raid-time')

function fitSource() {
  // Leave room for three entries so a new knockout does not resize the HUD.
  const zoom = raid.hidden ? scale / 100 : Math.min(scale / 100, innerWidth / source.offsetWidth, innerHeight / 130)
  source.style.zoom = zoom
}

window.addEventListener('resize', fitSource)
fitSource()

function renderBoss(boss, language) {
  raid.hidden = !boss
  fitSource()
  if (!boss) return
  bossName.textContent = boss.name + ' · Dynamax'
  bossHealth.setAttribute('aria-label', boss.name)
  bossHealth.max = boss.maxHp
  bossHealth.value = boss.hp
  bossPoints.textContent = boss.hp + ' / ' + boss.maxHp + (language === 'en' ? ' HP' : ' PS')
  const seconds = Math.ceil(boss.remaining)
  raidTime.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
}

const entries = new Map()
const portrait = fighter => {
  const slot = document.createElement('span')
  const showInitial = () => { slot.textContent = fighter.name?.[0] ?? '?' }
  const showSprite = () => {
    if (!fighter.frame) return showInitial()
    const { url, width, height } = fighter.frame
    const sheet = new Image()
    sheet.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 34
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-label', fighter.name)
      const context = canvas.getContext('2d')
      const ratio = 34 / Math.max(width, height)
      context.imageSmoothingEnabled = false
      context.drawImage(sheet, 0, 0, width, height,
        (34 - width * ratio) / 2, (34 - height * ratio) / 2, width * ratio, height * ratio)
      slot.replaceChildren(canvas)
    }
    sheet.onerror = showInitial
    sheet.src = url
  }
  if (fighter.sprite) {
    const img = document.createElement('img')
    img.alt = fighter.name
    img.onerror = () => { slot.replaceChildren(); showSprite() }
    img.src = fighter.sprite
    slot.append(img)
  } else showSprite()
  return slot
}

function render(rows, language) {
  const current = new Set(rows.map(row => row.id))
  for (const [id, entry] of entries) {
    if (!current.has(id)) {
      entry.node.remove()
      entries.delete(id)
    }
  }
  rows.forEach((row, index) => {
    let entry = entries.get(row.id)
    if (!entry) {
      const node = document.createElement('li')
      node.classList.toggle('boss', row.killer.boss)
      const action = document.createElement('span')
      action.className = 'defeated-by'
      const name = document.createElement('span')
      name.className = 'viewer'
      name.textContent = row.killer.viewer
      node.append(portrait(row.target), action, portrait(row.killer), name)
      entry = { node, action }
      entries.set(row.id, entry)
    }
    entry.action.textContent = language === 'en' ? 'defeated by' : 'derrotado por'
    if (feed.children[index] !== entry.node) feed.insertBefore(entry.node, feed.children[index] ?? null)
    if (row.expiresAt && row.expiresAt - Date.now() < 900) entry.node.classList.add('leaving')
  })
}

async function refresh() {
  let active = false
  let loaded = false
  try {
    const response = await fetch('/knockouts/state' + (preview ? '?preview=' + preview : ''), { signal: AbortSignal.timeout(3000) })
    if (!response.ok) throw Error('Feed unavailable')
    const state = await response.json()
    loaded = true
    active = state.active || state.rows.length > 0
    renderBoss(state.boss, state.language)
    render(state.rows, state.language)
    winner.hidden = !state.winner
    winner.textContent = state.winner ? (state.language === 'en' ? 'Last Winner: ' : 'Último ganador: ') + state.winner : ''
  } catch {
    render([], 'es')
    renderBoss(null, 'es')
    winner.hidden = true
  }
  if (!preview || !loaded) setTimeout(refresh, active ? 180 : 600)
}

refresh()
