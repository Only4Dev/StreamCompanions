export class EncounterEvents {
  constructor(state) {
    this.state = state
  }

  async fetch(request) {
    if (request.method === 'POST') {
      const update = await request.text()
      for (const socket of this.state.getWebSockets()) {
        try { socket.send(update) } catch { socket.close(1011, 'Reconnect') }
      }
      return new Response(null, { status: 204 })
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response(null, { status: 426 })
    const [client, server] = Object.values(new WebSocketPair())
    this.state.acceptWebSocket(server)
    return new Response(null, { status: 101, webSocket: client })
  }
  webSocketMessage(socket) {
    socket.close(1008, 'Receive only')
  }

  webSocketClose(socket) {
    socket.close()
  }
}
