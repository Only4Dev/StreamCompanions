import { hatchDialog, revealHatches } from './hatch-ui.js'
import { playHatchSpace } from './hatch-space.js'
import { hatchStyles } from './hatch-style.js'
import { threeEggSource } from './three-egg-vendor.js'

function browserModule(...functions) {
  const source = functions.map(render => 'export ' + render.toString()).join('\n')
  // Wrangler may add this helper when preserving the names of local functions.
  const helpers = source.includes('__name(')
    ? 'const __name = (fn, name) => Object.defineProperty(fn, "name", { value: name, configurable: true });\n'
    : ''
  return helpers + source
}

export const hatchAsset = pathname => {
  switch (pathname) {
    case '/assets/hatch-player.js': return { source: browserModule(revealHatches, hatchDialog) }
    case '/assets/hatch-space.js': return { source: browserModule(playHatchSpace) }
    case '/assets/three-hatch-r187.js': return { source: threeEggSource, immutable: true }
    case '/assets/hatch.css': return { source: hatchStyles, type: 'text/css; charset=utf-8' }
  }
}
