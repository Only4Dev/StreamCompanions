import { battleStatsAtLevel, equippedMoves, moveOptions, moves, ultimateOptions } from '../dev/battle.js'
import { nationalStats } from '../dev/national-stats.js'
import { level, maxLevel } from '../ui/levels.js'
import { kanto } from './kanto.js'
import { nationalDex } from './national-dex.js'

export const speciesName = id => kanto[id - 1] ?? nationalDex[id - 1]?.[2]
const idsByName = new Map(nationalDex.map(([id]) => [speciesName(id), id]))

export function creatureMoves(speciesKey, xp, dna = 0) {
  const id = idsByName.get(speciesKey.replace(/ ✦$/, ''))
  if (!id) return null
  const rank = level(xp)
  const [form, stats, types, final] = nationalStats[id - 1]
  const unlockedAt = new Map()
  for (let rank = 1; rank <= maxLevel; rank++) {
    for (const key of moveOptions(form, types, final, rank)) {
      if (!moves[key].ultimate && !unlockedAt.has(key)) unlockedAt.set(key, rank)
    }
  }
  return {
    id, form, rank, types, final, stats: battleStatsAtLevel(id, stats, rank, dna),
    unlockedAt,
    options: moveOptions(form, types, final, rank).filter(key => !moves[key].ultimate),
    ultimates: ultimateOptions(types, rank)
  }
}

export function validMoveset(selection, options) {
  return Array.isArray(selection) && selection.length >= 1 && selection.length <= 4 &&
    new Set(selection).size === selection.length && selection.every(key => options.includes(key))
}

export function parseLoadout(raw) {
  try {
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return { moves: data }
    return Array.isArray(data?.moves) ? { moves: data.moves, ultimate: data.ultimate, selectedAt: data.selectedAt } : {}
  } catch { return {} }
}

export async function readMovesets(db, community, candidates) {
  const terms = candidates.map(() => '(viewer_id = ? AND species_key = ?)').join(' OR ')
  const bindings = [community, ...candidates.flatMap(({ viewerId, speciesKey }) => [viewerId, speciesKey])]
  const [sets, equipment] = await db.batch([
    db.prepare('SELECT viewer_id, species_key, moves FROM viewer_movesets WHERE community_id = ? AND (' + terms + ')').bind(...bindings),
    db.prepare('SELECT viewer_id, species_key, item FROM viewer_held_items WHERE community_id = ? AND (' + terms + ')').bind(...bindings)
  ])
  const find = (results, viewerId, speciesKey) => results.find(row => row.viewer_id === viewerId && row.species_key === speciesKey)
  return candidates.map(({ viewerId, speciesKey }) => ({ viewerId, speciesKey,
    ...parseLoadout(find(sets.results, viewerId, speciesKey)?.moves),
    heldItem: find(equipment.results, viewerId, speciesKey)?.item }))
}
