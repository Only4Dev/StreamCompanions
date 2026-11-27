import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { battleFormAssets, battleFormFallbacks } from '../ui/abilities.js'
import { regionalSpecies } from '../ui/regional-species.js'
import { nationalDex } from '../cloud/national-dex.js'

const revision = 'ef13b72c6cd3de0c0cb5a99c50c22c9c4ace4729'
const root = new URL('../pmd/', import.meta.url)
const base = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/' + revision + '/'
const wanted = ['Idle', 'Walk', 'Run', 'Sleep', 'Jump', 'Hop', 'Attack', 'Shoot', 'Hurt', 'Faint',
  'Strike', 'Charge', 'Bite', 'Scratch', 'Kick', 'Roll', 'Slam', 'MultiAttack', 'Twirl', 'Special0', 'Special1', 'Special2']

async function download(path, optional = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(base + path, { signal: AbortSignal.timeout(20_000) })
      if (res.status === 404 && optional) return null
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + path)
      return Buffer.from(await res.arrayBuffer())
    } catch (error) {
      if (attempt === 2) throw error
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }
}

function tag(xml, name) {
  return xml.match(new RegExp('<' + name + '>([^<]+)</' + name + '>'))?.[1].trim()
}

async function importVariant(id, shiny, required = [], subform = '') {
  const path = 'sprite/' + id + subform + (shiny ? (subform ? '/0001' : '/0000/0001') : '')
  const xml = await download(path + '/AnimData.xml', true)
  if (!xml) return null
  const folder = id + subform.replace('/', '-') + (shiny ? '-shiny' : '')
  const output = new URL(folder + '/', root)
  await mkdir(output, { recursive: true })
  const entries = new Map([...xml.toString().matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)]
    .map(([, block]) => [tag(block, 'Name'), block]))
  const animations = {}
  const sheets = new Map()
  const sources = new Map()

  for (const name of wanted) {
    let source = name
    const visited = new Set()
    while (entries.has(source) && !visited.has(source)) {
      visited.add(source)
      const alias = tag(entries.get(source), 'CopyOf')
      if (!alias) break
      source = alias
    }
    const block = entries.get(source)
    if (!block) continue
    sources.set(name, source)
  }
  if (required.some(name => !sources.has(name))) return null
  for (const [name, source] of sources) {
    const block = entries.get(source)
    if (!sheets.has(source)) {
      const width = Number(tag(block, 'FrameWidth'))
      const height = Number(tag(block, 'FrameHeight'))
      const durations = [...block.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(match => Number(match[1]))
      const filename = source + '-Anim.png'
      const png = await download(path + '/' + filename, true)
      if (!png || png.length < 24 || !width || !height) continue
      const rows = png.readUInt32BE(20) / height
      if (![1, 8].includes(rows) || !durations.length || png.readUInt32BE(16) / width < durations.length) {
        continue
      }
      await writeFile(new URL(filename, output), png)
      sheets.set(source, { url: '/pmd/' + folder + '/' + filename, width, height, durations, rows })
    }
    if (sheets.has(source)) animations[name] = sheets.get(source)
  }
  if ((!animations.Idle && !animations.Walk) || required.some(name => !animations[name])) return null
  const credits = await download(path + '/credits.txt', true)
  return { animations, credits: credits?.toString() ?? '' }
}

const tracker = JSON.parse(await download('tracker.json'))
await mkdir(root, { recursive: true })
const manifestPath = new URL('manifest.json', root)
const previous = await readFile(manifestPath, 'utf8').then(JSON.parse, () => null)
const cached = new Map(previous?.revision === revision ? previous.species.map(item => [item.id, item]) : [])
async function cachedVariant(variant) {
  if (!variant) return null
  const sheets = [...new Set(Object.values(variant.animations).map(clip => clip.url))]
  try {
    await Promise.all(sheets.map(url => access(new URL('..' + url, root))))
    return variant
  } catch { return null }
}
async function importStill(id, dex = Number(id), shiny = false, optional = false) {
  const url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + (shiny ? 'shiny/' : '') + dex + '.png'
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (optional && response.status === 404) return null
  if (!response.ok) throw Error('Missing fallback sprite: ' + id + ' (' + response.status + ')')
  const png = Buffer.from(await response.arrayBuffer())
  const folder = new URL(id + '/', root)
  await mkdir(folder, { recursive: true })
  await writeFile(new URL('Static.png', folder), png)
  return { source: 'pokeapi', credits: url, animations: {
    Idle: { url: '/pmd/' + id + '/Static.png', width: png.readUInt32BE(16), height: png.readUInt32BE(20), durations: [60], rows: 1 }
  } }
}
const ids = nationalDex.map(([id, , name]) => ({ id: String(id).padStart(4, '0'), name }))
async function importPortrait(id, shiny, known) {
  if (known !== undefined) {
    if (!known) return null
    try { await access(new URL('..' + known, root)); return known } catch {}
  }
  const variant = shiny ? '/0000/0001' : ''
  const png = await download('portrait/' + id + variant + '/Normal.png', true)
  if (!png) return null
  const folder = id + (shiny ? '-shiny' : '') + '/'
  await writeFile(new URL(folder + 'Portrait.png', root), png)
  return '/pmd/' + folder + 'Portrait.png'
}
const species = []
const formsOnly = process.argv.includes('--battle-forms-only')
if (formsOnly && !cached.size) throw new Error('Import the base catalog first.')
let next = 0
await Promise.all(Array.from({ length: 40 }, async () => {
  while (next < ids.length) {
    const index = next++
    const { id, name } = ids[index]
    const entry = tracker[id]
    const old = cached.get(id)
    if (formsOnly) {
      species[index] = old
      continue
    }
    let normal = await cachedVariant(old?.normal) ??
      (entry?.sprite_credit?.primary ? await importVariant(id, false) : null)
    if (!normal) {
      normal = await importStill(id)
    }
    const required = Object.keys(normal.animations)
    const oldShiny = await cachedVariant(old?.shiny)
    const checkShiny = normal.source !== 'pokeapi' && !(previous?.strictShiny && old && !old.shiny)
    const shiny = oldShiny && required.every(clip => oldShiny.animations[clip]) ? oldShiny :
      (checkShiny && entry?.subgroups?.['0000']?.subgroups?.['0001']?.sprite_credit?.primary ? await importVariant(id, true, required) : null)
    const [portrait, shinyPortrait] = await Promise.all([
      importPortrait(id, false, old?.portrait),
      shiny ? importPortrait(id, true, old?.shinyPortrait) : null
    ])
    species[index] = { id, name: Number(id) <= 151 ? entry.name : name, normal, shiny, portrait, shinyPortrait }
  }
}))
const available = species.filter(Boolean)
await Promise.all(available.filter(item => battleFormAssets[Number(item.id)]).map(async item => {
  const forms = await Promise.all(Object.entries(battleFormAssets[Number(item.id)]).map(async ([key, index]) => {
    const code = String(index).padStart(4, '0')
    const path = '/' + code
    const old = item.battleForms?.[key]
    const dex = battleFormFallbacks[Number(item.id)]?.[key]
    const folder = item.id + '-' + code
    const normal = await cachedVariant(old?.normal) ?? await importVariant(item.id, false, [], path) ??
      (dex ? await importStill(folder, dex, false, true) : null)
    if (!normal) return null
    const required = Object.keys(normal.animations)
    const shinyCredit = tracker[item.id]?.subgroups?.[code]?.subgroups?.['0001']?.sprite_credit?.primary
    const shiny = await cachedVariant(old?.shiny) ?? (shinyCredit ? await importVariant(item.id, true, required, path) : null) ??
      (dex ? await importStill(folder + '-shiny', dex, true, true) : null)
    return [key, { code, normal, shiny }]
  }))
  item.battleForms = Object.fromEntries(forms.filter(Boolean))
}))
await Promise.all(regionalSpecies.map(async (form, index) => {
  const id = String(form.id)
  const sourceId = String(form.baseId).padStart(4, '0')
  const path = form.pmdForm ? '/' + form.pmdForm : null
  const old = cached.get(id)
  const normal = await cachedVariant(old?.normal) ?? (path ? await importVariant(sourceId, false, [], path) : null) ??
    await importStill(id, form.id, false, true)
  if (!normal) return
  const required = Object.keys(normal.animations)
  const shiny = await cachedVariant(old?.shiny) ?? (path ? await importVariant(sourceId, true, required, path) : null) ??
    await importStill(id + '-shiny', form.id, true, true)
  available[species.length + index] = { id, name: form.name, baseId: sourceId, pmdForm: form.pmdForm, region: form.region, normal, shiny }
}))
const catalog = available.filter(Boolean)
const temporary = new URL('manifest.json.tmp', root)
await writeFile(temporary, JSON.stringify({ revision, species: catalog,
  missing: catalog.filter(item => item.normal.source === 'pokeapi').map(item => item.id), strictShiny: true }))
await rename(temporary, manifestPath)
console.log('Imported %d normal species, %d complete shiny variants and %d fallback stills.',
  catalog.length, catalog.filter(item => item.shiny).length, catalog.filter(item => item.normal.source === 'pokeapi').length)

