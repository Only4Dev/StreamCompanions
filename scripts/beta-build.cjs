const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { build } = require('../package.json')

const optimize = process.env.SC_LOSSLESS_ASSETS === '1'
const assetDir = optimize ? 'dist/pmd-lossless' : 'pmd'
if (!existsSync(join(__dirname, '..', assetDir, 'manifest.json'))) {
  throw new Error(optimize ? 'Run python scripts/optimize-pmd.py first.' : 'Run npm run import:pmd before building the private beta.')
}

module.exports = {
  ...build,
  directories: { output: 'dist/beta' },
  artifactName: 'Stream-Companions-Beta-${version}-${arch}.${ext}',
  files: [...build.files, { from: assetDir, to: 'pmd' }],
  win: { signAndEditExecutable: false }
}
