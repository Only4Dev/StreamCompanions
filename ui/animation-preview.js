const hatchSamples = {
  common: { id:10, name:'Caterpie', rarity:'common' },
  rare: { id:1, name:'Bulbasaur', rarity:'rare' },
  epic: { id:147, name:'Dratini', rarity:'epic' },
  legendary: { id:150, name:'Mewtwo', rarity:'legendary' }
}
const byName = (a, b) => a.name.localeCompare(b.name)

export function mountAnimationPreview({ language }) {
  const attacks = document.querySelector('#attack-animation-form')
  const eggs = document.querySelector('#egg-animation-form')
  const attackStage = document.querySelector('#attack-animation-stage')
  const eggStage = document.querySelector('#egg-animation-stage')
  const errorText = () => language() === 'en' ? 'Preview unavailable.' : 'No se pudo abrir la vista previa.'
  const attackStatus = document.querySelector('#attack-animation-status')
  let options
  let styles
  let frameTimer
  const prepare = () => {
    options ??= fetch('/animation-preview/options').then(response => {
      if (!response.ok) throw Error('Preview options unavailable')
      return response.json()
    }).then(data => {
      const selected = { move: 'ember', attacker: 6, target: 9 }
      for (const [field, values] of [['move', data.moves], ['attacker', data.species], ['target', data.species]]) {
        const select = attacks.elements.namedItem(field)
        select.replaceChildren(...values.slice().sort(byName).map(entry =>
          new Option(entry.type ? entry.name + ' · ' + entry.type : entry.name, entry.id,
            false, String(entry.id) === String(selected[field]))))
      }
      attackStatus.textContent = ''
    }).catch(() => { options = undefined; attackStatus.textContent = errorText() })
  }
  attacks.addEventListener('submit', event => {
    event.preventDefault()
    const query = new URLSearchParams(new FormData(attacks))
    query.set('layout', 'strip')
    query.set('preview', 'attack')
    query.set('run', crypto.randomUUID())
    const frame = document.createElement('iframe')
    frame.title = language() === 'en' ? 'Attack preview' : 'Vista previa del ataque'
    frame.src = '/companions?' + query
    attackStage.replaceChildren(frame)
    clearTimeout(frameTimer)
    frameTimer = setTimeout(() => frame.remove(), 13000)
  })
  eggs.addEventListener('submit', async event => {
    event.preventDefault()
    const button = eggs.querySelector('button')
    const status = document.querySelector('#egg-animation-status')
    if (button.disabled) return
    button.disabled = true
    status.textContent = ''
    try {
      styles ??= new Promise((resolve, reject) => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = '/assets/hatch.css'
        link.onload = resolve
        link.onerror = () => { styles = undefined; link.remove(); reject(Error('Preview styles unavailable')) }
        document.head.append(link)
      })
      const [player] = await Promise.all([import('/assets/hatch-player.js'), styles])
      eggStage.innerHTML = player.hatchDialog(language() === 'en')
      const rarity = eggs.elements.rarity.value
      await player.revealHatches(eggStage.querySelector('dialog'),
        rarity === 'batch' ? Object.values(hatchSamples) :
          rarity === 'shiny' ? { ...hatchSamples.legendary, shiny: true } : hatchSamples[rarity], language())
    } catch { status.textContent = errorText() }
    finally { button.disabled = false }
  })
  return { prepare, stop() { clearTimeout(frameTimer); attackStage.replaceChildren() } }
}
