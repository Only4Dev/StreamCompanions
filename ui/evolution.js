import { evolutionParents } from './evolution-data.js'

const children = new Map()
evolutionParents.forEach((parent, index) => {
  if (!parent) return
  if (!children.has(parent)) children.set(parent, [])
  children.get(parent).push(index + 1)
})

export function familyRoot(id) {
  let root = id
  while (evolutionParents[root - 1]) root = evolutionParents[root - 1]
  return root
}

export const evolutionChildren = id => children.get(id) ?? []
export const evolutionParent = id => evolutionParents[id - 1] || undefined

export function nextEvolutionLevel(id) {
  const branches = evolutionChildren(id)
  if (!branches.length) return undefined
  return familyRoot(id) === id && (branches.length > 1 || branches.some(next => evolutionChildren(next).length)) ? 16 : 31
}
