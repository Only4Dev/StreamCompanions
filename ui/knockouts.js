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
  source.classList.toggle('dynamax', Boolean(boss))
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
  if (!fighter.sprite) {
    const label = document.createElement('span')
    label.textContent = fighter.name?.[0] ?? '?'
    return label
  }
  const img = document.createElement('img')
  img.src = fighter.sprite
  img.alt = fighter.name
  return img
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
    render(state.rows, state.language)
    renderBoss(state.boss, state.language)
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
