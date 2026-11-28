import { hatchDialog, revealHatches } from './hatch-ui.js'
import { playHatchSpace } from './hatch-space.js'
import { hatchStyles } from './hatch-style.js'
import { threeEggSource } from './three-egg-vendor.js'

export const hatchAsset = pathname => {
  switch (pathname) {
    case '/assets/hatch-player.js': return { source: 'export ' + revealHatches.toString() + '\nexport ' + hatchDialog.toString() }
    case '/assets/hatch-space.js': return { source: 'export ' + playHatchSpace.toString() }
    case '/assets/three-hatch-r187.js': return { source: threeEggSource, immutable: true }
    case '/assets/hatch.css': return { source: hatchStyles, type: 'text/css; charset=utf-8' }
  }
}
