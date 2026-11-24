import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, rename } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)
const executable = 'Stream Companions.exe'
const versionPattern = /^\d{1,8}\.\d{1,8}\.\d{1,8}$/
const allowedHosts = new Set(['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'])
const require = createRequire(import.meta.url)
// Electron's standard fs opens ASAR archives as directories and can lock them on Windows.
const nativeFs = require(process.versions.electron ? 'original-fs' : 'node:fs')
const { rm, stat } = nativeFs.promises

export function releaseArchive(version, asset) {
  if (!versionPattern.test(version ?? '')) return null
  const name = `Stream-Companions-v${version}-Windows-x64.zip`
  const url = `https://github.com/Only4Dev/StreamCompanions/releases/download/v${version}/${name}`
  if (asset?.name !== name || asset.browser_download_url !== url || asset.state !== 'uploaded' ||
      !/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? '') || !Number.isSafeInteger(asset.size) ||
      asset.size < 1 || asset.size > 750_000_000) return null
  return { url, size: asset.size, digest: asset.digest.slice(7) }
}

export const hasAppArchive = file => nativeFs.statSync(file).isFile()

export async function stageUpdate(profile, { version, archive }, shutdown) {
  if (!versionPattern.test(version ?? '') || !archive) throw new Error('Release has no verified Windows archive')
  const signal = AbortSignal.any([shutdown, AbortSignal.timeout(10 * 60_000)])
  const root = join(profile, 'app-updates')
  await mkdir(root, { recursive: true })
  const stage = await mkdtemp(join(root, 'download-'))
  try {
    let response
    let url = new URL(archive.url)
    for (let attempts = 0; attempts < 4; attempts++) {
      if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || url.port || url.username || url.password) throw new Error('Invalid release redirect')
      response = await fetch(url, { redirect: 'manual', signal })
      if (response.status !== 302 && response.status !== 301 && response.status !== 307 && response.status !== 308) break
      const location = response.headers.get('Location')
      await response.body?.cancel()
      if (!location) throw new Error('Release redirect missing')
      url = new URL(location, url)
    }
    if (!response?.ok || !response.body) throw new Error('Release download unavailable (HTTP ' + (response?.status ?? 'unknown') + ')')
    const zip = join(stage, 'update.zip')
    const hash = createHash('sha256')
    let size = 0
    await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, _, finish) {
      size += chunk.length
      if (size > archive.size) return finish(new Error('Release size mismatch'))
      hash.update(chunk)
      finish(null, chunk)
    } }), createWriteStream(zip, { flags: 'wx' }), { signal })
    if (size !== archive.size || hash.digest('hex') !== archive.digest) throw new Error('Release checksum mismatch')

    const tar = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    const flags = { signal, windowsHide: true, maxBuffer: 2_000_000 }
    const listing = await run(tar, ['-tf', zip], flags)
    for (const name of listing.stdout.trimEnd().split(/\r?\n/)) {
      if (!/^\.\/(?:[a-z0-9_. -]+\/)*[a-z0-9_. -]*\/?$/i.test(name) || name.split('/').includes('..')) {
        throw new Error('Invalid release archive path')
      }
    }
    const { stdout } = await run(tar, ['-tvf', zip], flags)
    for (const line of stdout.trimEnd().split(/\r?\n/)) {
      if (!/^[-d]/.test(line) || /(?:^|[\\/])\.\.(?:[\\/]|$)| -> | link to |\\/.test(line)) throw new Error('Invalid release archive entry')
    }
    const target = join(stage, 'app')
    await mkdir(target)
    await run(tar, ['-xf', zip, '-C', target], flags)
    if (!(await stat(join(target, executable))).isFile() || !(await stat(join(target, 'resources', 'app.asar'))).isFile()) {
      throw new Error('Release is missing app files')
    }
    // Keep the existing installation intact. Each update launches from its own folder.
    const destination = await mkdtemp(join(root, 'v' + version + '-'))
    await rename(target, join(destination, 'app'))
    return join(destination, 'app', executable)
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}
