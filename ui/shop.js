import { maxDnaBoosters } from './evolution.js'
import { heldItems } from './held-items.js'

export const shopIconUrl = item => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/' +
  (item === 'poke-egg' ? 'pokemon/egg.png' : 'items/' + (shopItems[item]?.icon ?? item) + '.png')

export const featuredShopItems = ['poke-egg', 'legendary-tracker']
export const eggRarities = ['common', 'uncommon', 'rare', 'epic']
export const legendaryEggChance = 0.00001

export const shopItems = {
  'poke-egg': { price: 5_000, names: ['Poké Egg', 'Poké Egg'], section: 'eggs' },
  'legendary-tracker': { price: 100_000, names: ['Legendary Tracker', 'Legendary Tracker'], section: 'keys', icon: 'dowsing-machine' },
  'poke-ball': { price: 100, names: ['Poké Ball', 'Poké Ball'], ball: 'normal' },
  'great-ball': { price: 250, names: ['Super Ball', 'Great Ball'], ball: 'great' },
  'ultra-ball': { price: 500, names: ['Ultra Ball', 'Ultra Ball'], ball: 'ultra' },
  'master-ball': { price: 500_000, maxPrice: 10_000_000, names: ['Master Ball', 'Master Ball'], ball: 'master' },
  'dna-booster': { price: 10000, names: ['DNA Booster', 'DNA Booster'], dna: true, icon: 'protein' },
  ...Object.fromEntries(Object.entries(heldItems).map(([id, names]) =>
    [id, { price: id === 'sitrus-berry' ? 2500 : 5000, names: names.slice(0, 2), held: true }]))
}

export const maxShopPrice = product => product.maxPrice ?? 100_000
export const validShopPrice = (value, product) => Number.isSafeInteger(value) && value >= 1 && value <= maxShopPrice(product)

export const maxShopQuantity = 99

export const validShopQuantity = (product, quantity) => Number.isSafeInteger(quantity) &&
  quantity >= 1 && quantity <= (product.ball ? maxShopQuantity : product.dna ? maxDnaBoosters : 1)

export function normalizeShopPrices(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values) || Object.entries(values).some(([id, value]) =>
    !Object.hasOwn(shopItems, id) || !validShopPrice(value, shopItems[id]))) return null
  return Object.fromEntries(Object.entries(shopItems).map(([id, item]) => [id, values[id] ?? item.price]))
}
