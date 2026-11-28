import catchRates from './catch-rates.json' with { type: 'json' }
export { catchRates }

// Catch rates originally sourced from PokéAPI pokemon_species.csv.
export const baseCaptureRate = id => catchRates.species[id]?.rate ?? 255

const bands = [
  { id: 'superEasy', minimum: 200, names: ['Muy fácil', 'Super easy'], chances: [.38, .56, .75] },
  { id: 'easy', minimum: 120, names: ['Fácil', 'Easy'], chances: [.26, .43, .63] },
  { id: 'normal', minimum: 70, names: ['Normal', 'Normal'], chances: [.17, .31, .50] },
  { id: 'hard', minimum: 30, names: ['Difícil', 'Hard'], chances: [.09, .19, .36] },
  { id: 'ultraHard', minimum: 0, names: ['Muy difícil', 'Ultra hard'], chances: [.04, .09, .21] }
]
const legendaryBand = { id: 'legendary', names: ['Legendario', 'Legendary'], chances: [.01, .025, .05] }
const mythicalSpecies = new Set([151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721, 801, 802, 807, 808, 809, 893, 1025])
const ultraBeasts = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806])
const paradoxSpecies = new Set([984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1009, 1010, 1020, 1021, 1022, 1023])

export function specialEncounterTag(id, legendary = false) {
  if (mythicalSpecies.has(id)) return 'mythical'
  if (ultraBeasts.has(id)) return 'ultraBeast'
  if (legendary) return 'legendary'
  if (paradoxSpecies.has(id)) return 'paradox'
  return null
}

const bandFor = (id, legendary, rate = baseCaptureRate(id)) => legendary || mythicalSpecies.has(id)
  ? legendaryBand : bands.find(band => rate >= band.minimum)

export function eggRarity(id) {
  return ({ superEasy: 'common', easy: 'common', normal: 'uncommon', hard: 'rare', ultraHard: 'epic' })[bandFor(id, false).id]
}

export const captureCategories = [...bands, legendaryBand].map(({ id, names, chances }) => ({
  id, names, defaults: chances.map(chance => Math.round(chance * 10_000) / 100)
}))

export function normalizeCapturePercentages(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== captureCategories.length) return null
  const normalized = {}
  for (const { id } of captureCategories) {
    const row = value[id]
    if (!Array.isArray(row) || row.length !== 3 || row.some(rate => !Number.isFinite(rate) || rate < 0 || rate > 100)) return null
    normalized[id] = row.map(rate => Math.round(rate * 100) / 100)
  }
  return normalized
}

export function catchChance(ball, id, legendary = false, percentages, overrides) {
  if (ball === 'master') return 1
  const band = bandFor(id, legendary, overrides?.rate)
  const index = ['normal', 'great', 'ultra'].indexOf(ball)
  const custom = (overrides ?? catchRates.species[id])?.percentages
  return custom ? custom[index] / 100 : percentages ? percentages[band.id]?.[index] / 100 : band.chances[index]
}

export function catchDifficulty(id, legendary = false, language = 'es', rate) {
  return bandFor(id, legendary, rate).names[Number(language === 'en')]
}
