import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { nationalDex } from '../cloud/national-dex.js'

const output = new URL('../dist/sprite-credits/', import.meta.url)
const catalog = new URL(process.env.SC_LOSSLESS_ASSETS === '1' ? '../dist/pmd-lossless/manifest.json' : '../pmd/manifest.json', import.meta.url)
const { revision, species } = JSON.parse(await readFile(catalog, 'utf8'))
const available = new Set(species.map(entry => Number(entry.id)))
if (!/^[0-9a-f]{40}$/.test(revision) || nationalDex.some(([id]) => !available.has(id))) {
  throw new Error('A complete sprite catalog is required for a Windows release.')
}

const source = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/' + revision + '/'
async function upstream(path) {
  const response = await fetch(source + path, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error('Could not retrieve SpriteCollab attribution: ' + path)
  return response.text()
}

const [tracking, registry, license] = await Promise.all(['tracker.json', 'credit_names.txt', 'LICENSE.md'].map(upstream))
const tracker = JSON.parse(tracking)
const names = new Map(registry.trim().split(/\r?\n/).slice(1).map(line => {
  const [name, id] = line.split('\t')
  return [id, name || id]
}))
const contributors = credit => [credit?.primary, ...(credit?.secondary ?? [])].filter(Boolean).map(id => names.get(id) ?? id).join(', ')
const summary = ['# Sprite and portrait credits', '',
  'Stream Companions is a noncommercial fan project. Pokémon and its original imagery belong to their respective rights holders.', '',
  'SpriteCollab assets are credited below and use the included [SpriteCollab license](SpriteCollab-LICENSE.md) where applicable.',
  'The downloaded animation sheets keep the chosen animation frames and metadata. Some images may be repackaged as pixel-identical lossless WebP.',
  'Static fallback sprites from PokéAPI retain the copyright of The Pokémon Company.', '',
  '[Pinned SpriteCollab source](https://github.com/PMDCollab/SpriteCollab/tree/' + revision + ') · [PokéAPI sprite notice](https://github.com/PokeAPI/sprites/blob/master/LICENCE.txt)', '']

for (const entry of species) {
  const id = String(entry.id).padStart(4, '0')
  const sourceId = entry.baseId ?? id
  const regionalPath = entry.pmdForm ? '/' + entry.pmdForm : ''
  const normal = entry.pmdForm ? tracker[sourceId]?.subgroups?.[entry.pmdForm] : tracker[sourceId]
  const shiny = entry.pmdForm ? normal?.subgroups?.['0001'] : normal?.subgroups?.['0000']?.subgroups?.['0001']
  const parts = []
  for (const [label, variant, portrait, credit, suffix] of [
    ['Normal', entry.normal, entry.portrait, normal, regionalPath], ['Shiny', entry.shiny, entry.shinyPortrait, shiny, regionalPath ? regionalPath + '/0001' : '/0000/0001']
  ]) {
    if (variant?.source === 'pokeapi') parts.push('- ' + label + ' sprite: [PokéAPI](' + variant.credits + ')')
    else if (variant) parts.push('- ' + label + ' sprites: ' + contributors(credit?.sprite_credit) + ' · [artist history](' + source + 'sprite/' + sourceId + suffix + '/credits.txt)')
    if (portrait) parts.push('- ' + label + ' portrait: ' + contributors(credit?.portrait_credit) + ' · [artist history](' + source + 'portrait/' + id + suffix + '/credits.txt)')
  }
  for (const [form, assets] of Object.entries(entry.battleForms ?? {})) {
    const credit = normal?.subgroups?.[assets.code]
    for (const [label, variant, credits, suffix] of [
      ['Normal', assets.normal, credit, ''], ['Shiny', assets.shiny, credit?.subgroups?.['0001'], '/0001']
    ]) {
      if (variant?.source === 'pokeapi') parts.push('- ' + form + ' (' + label + '): [PokéAPI](' + variant.credits + ')')
      else if (variant) parts.push('- ' + form + ' (' + label + '): ' + contributors(credits?.sprite_credit) +
        ' · [artist history](' + source + 'sprite/' + id + '/' + assets.code + suffix + '/credits.txt)')
    }
  }
  summary.push('## ' + id + ' ' + entry.name, '', ...parts, '')
}

await mkdir(output, { recursive: true })
await Promise.all([
  writeFile(new URL('SPRITE-CREDITS.md', output), summary.join('\n') + '\n', 'utf8'),
  writeFile(new URL('SpriteCollab-LICENSE.md', output), license, 'utf8')
])
