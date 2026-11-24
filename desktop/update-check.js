import { releaseArchive } from './install-update.js'

const endpoint = 'https://api.github.com/repos/Only4Dev/StreamCompanions/releases/latest'
const parse = value => typeof value === 'string' ? /^v?(\d{1,8})\.(\d{1,8})\.(\d{1,8})$/.exec(value)?.slice(1).map(Number) : null

export async function checkForUpdate(version, signal) {
  try {
    const response = await fetch(endpoint, {
      redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(7000)]),
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Stream-Companions' }
    })
    if (response.status === 404) return { status: 'unpublished' }
    if (!response.ok) return { status: 'unavailable' }
    const release = await response.json()
    const latest = parse(release.tag_name)
    const current = parse(version)
    if (!latest || !current || release.draft || release.prerelease) return { status: 'unavailable' }
    const firstDifference = latest.findIndex((part, index) => part !== current[index])
    if (firstDifference === -1 || latest[firstDifference] < current[firstDifference]) return { status: 'latest' }
    const availableVersion = latest.join('.')
    const archive = (Array.isArray(release.assets) ? release.assets : []).map(asset => releaseArchive(availableVersion, asset)).find(Boolean)
    return { status: 'available', version: availableVersion, ...(archive ? { archive } : {}) }
  } catch { return { status: 'unavailable' } }
}
