import { evolutionParents } from './evolution-data.js'

import { regionalEvolutionParents, regionalSpecies } from './regional-species.js'

const regionalParents = new Map(regionalSpecies.map(form => [form.id, form.parent]))
export const evolutionParent = id => regionalParents.get(id) ?? regionalEvolutionParents[id] ?? (evolutionParents[id - 1] || undefined)

const children = new Map()
for (const child of [...evolutionParents.keys()].map(index => index + 1).concat(regionalSpecies.map(form => form.id))) {
  const parent = evolutionParent(child)
  if (!parent) continue
  if (!children.has(parent)) children.set(parent, [])
  children.get(parent).push(child)
}

export function familyRoot(id) {
  let root = id
  while (evolutionParent(root)) root = evolutionParent(root)
  return root
}

export const evolutionChildren = id => children.get(id) ?? []


export const maxDnaBoosters = 10
export const familyDnaCount = (boosters, keys) => Math.min(maxDnaBoosters,
  keys.reduce((count, key) => count + (boosters?.[key] ?? 0), 0))

export function nextEvolutionLevel(id) {
  const branches = evolutionChildren(id)
  if (!branches.length) return undefined
  return familyRoot(id) === id && (branches.length > 1 || branches.some(next => evolutionChildren(next).length)) ? 16 : 31
}
