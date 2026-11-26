export function startCloudSync({ progress, url, token, onStatus, interval = 5_000 }) {
  const endpoint = new URL('/api/sync', url)
  if (endpoint.protocol !== 'https:' || !/^[0-9a-f]{64}$/.test(token)) {
    throw new Error('Configuración de sincronización inválida')
  }
  const controller = new AbortController()
  let sending = false
  async function run() {
    if (sending || controller.signal.aborted) return
    const viewers = progress.pending()
    if (!viewers.length) {
      onStatus('Sincronización al día')
      return
    }
    sending = true
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewers }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])
      })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const { received } = await response.json()
      if (!Array.isArray(received) || received.length !== viewers.length ||
          !viewers.every(item => received.some(ack => ack?.id === item.id && ack.revision === item.revision))) {
        throw new Error('confirmación inesperada')
      }
      if (controller.signal.aborted) return
      progress.acknowledge(viewers)
      onStatus(progress.pending().length ? 'Hay cambios pendientes' : 'Sincronización al día')
    } catch (error) {
      if (!controller.signal.aborted) onStatus('Cambios pendientes de sincronizar (' + error.message + ')')
    } finally {
      sending = false
    }
  }
  const timer = setInterval(run, interval)
  run()
  return () => {
    controller.abort()
    clearInterval(timer)
  }
}
