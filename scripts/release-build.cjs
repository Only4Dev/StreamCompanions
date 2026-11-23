const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { build } = require('../package.json')

const assets = process.env.SC_LOSSLESS_ASSETS === '1' ? 'dist/pmd-lossless' : 'pmd'
if (!existsSync(join(__dirname, '..', assets, 'manifest.json'))) throw new Error('Import the sprite catalog before building a release.')

module.exports = {
  ...build,
  files: [...build.files, { from: assets, to: 'pmd' }],
  extraFiles: [{ from: 'dist/sprite-credits', to: '.', filter: ['SPRITE-CREDITS.md', 'SpriteCollab-LICENSE.md'] }],
  win: { signAndEditExecutable: false }
}
