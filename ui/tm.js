import data from './tmlearn.json' with { type: 'json' }
import { familyRoot } from './evolution.js'

export const tmLearn = data
export const ancestralFragmentCost = 5
export const tmOptions = id => Object.hasOwn(data.families, familyRoot(id)) ? data.families[familyRoot(id)] : { standard: [], ancestral: [] }
export const tmCost = (id, move) => tmOptions(id).standard.includes(move) ? 'standard' :
  tmOptions(id).ancestral.includes(move) ? 'ancestral' : null
export const learnedTmMoves = (id, learned) => (learned?.[familyRoot(id)] ?? []).filter(move => tmCost(id, move))
export const parseTmCommand = command => typeof command === 'string' && /^!learntm ([a-zA-Z0-9-]{1,40}) (.{1,64})$/.exec(command)
export function validTmMoves(learned) {
  return learned !== null && typeof learned === 'object' && !Array.isArray(learned) &&
    Object.entries(learned).every(([family, keys]) => Object.hasOwn(data.families, family) &&
      Array.isArray(keys) && keys.length === new Set(keys).size && keys.every(key => tmCost(Number(family), key)))
}
