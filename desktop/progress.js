import { DatabaseSync } from 'node:sqlite'

export function openProgress(path) {
  const database = new DatabaseSync(path)
  database.exec('PRAGMA secure_delete = ON')
  database.exec(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      snapshot TEXT NOT NULL
    )
  `)
  database.exec(`
    CREATE TABLE IF NOT EXISTS viewer_sync (
      id TEXT PRIMARY KEY,
      revision INTEGER NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL
    )
  `)
  const queue = database.prepare(`
    INSERT INTO viewer_sync (id, revision, payload) VALUES (?, 1, ?)
    ON CONFLICT (id) DO UPDATE SET revision = viewer_sync.revision + 1, payload = excluded.payload
    WHERE viewer_sync.payload != excluded.payload
  `)
  const readViewer = database.prepare('SELECT id, revision, payload FROM viewer_sync WHERE id = ?')
  const pending = database.prepare('SELECT id, revision, payload FROM viewer_sync WHERE revision > acknowledged ORDER BY acknowledged, id LIMIT 10')
  const acknowledge = database.prepare("UPDATE viewer_sync SET acknowledged = max(acknowledged, ?) WHERE id = ? AND revision >= ? AND COALESCE(json_extract(payload, '$.generation'), 0) = ?")
  const erasePrevious = database.prepare("DELETE FROM viewer_sync WHERE id = ? AND COALESCE(json_extract(payload, '$.generation'), 0) != ?")
  const erase = database.prepare('DELETE FROM viewer_sync WHERE id = ?')
  function transaction(action) {
    database.exec('BEGIN IMMEDIATE')
    try {
      action()
      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }
  const read = database.prepare('SELECT snapshot FROM progress WHERE id = 1')
  const write = database.prepare(`
    INSERT INTO progress (id, snapshot) VALUES (1, ?)
    ON CONFLICT (id) DO UPDATE SET snapshot = excluded.snapshot
  `)
  let initialized = false
  let last = read.get()?.snapshot
  return {
    load: () => last === undefined ? undefined : JSON.parse(last),
    save(progress, { clearQueue = false } = {}) {
      const snapshot = JSON.stringify(progress)
      if (snapshot === last && initialized && !clearQueue) return
      transaction(() => {
        if (clearQueue) database.exec('DELETE FROM viewer_sync')
        write.run(snapshot)
        for (const [id, generation] of Object.entries(progress.viewerGenerations ?? {})) erasePrevious.run(id, generation)
        for (const id of progress.erasedViewers ?? []) erase.run(id)
        for (const [id, viewer] of Object.entries(progress.viewers ?? {})) {
          if (!/^(twitch|kick):\d{1,24}$/.test(id)) continue
          const collection = Object.fromEntries(Object.entries(viewer.collection).map(([name, xp]) => [name, Math.floor(xp)]))
          const { wins = 0, losses = 0, summonSeconds = 0 } = viewer.metrics ?? {}
          const metrics = { wins, losses, summonMinutes: Math.floor(summonSeconds / 60) }
          queue.run(id, JSON.stringify({ ...(progress.viewerGenerations?.[id] ? { generation: progress.viewerGenerations[id] } : {}), displayName: viewer.displayName ?? '', balls: viewer.balls, collection, metrics,
            heldItems: viewer.heldItems ?? [], rareCandies: viewer.rareCandies ?? 0, pokeDollars: viewer.pokeDollars ?? 0,
            dnaBoosters: viewer.dnaBoosters ?? {}, ...(viewer.log?.length ? { log: viewer.log } : {}) }))
        }
      })
      last = snapshot
      initialized = true
    },
    viewer(id) {
      const row = readViewer.get(id)
      return row && { id: row.id, revision: row.revision, ...JSON.parse(row.payload) }
    },
    pending: () => pending.all().map(row => ({ id: row.id, revision: row.revision, ...JSON.parse(row.payload) })),
    acknowledge(batch) {
      transaction(() => {
        for (const { id, revision, generation = 0 } of batch) acknowledge.run(revision, id, revision, generation)
      })
    },
    close: () => database.close()
  }
}
