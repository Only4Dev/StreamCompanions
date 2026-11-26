import { maxDnaBoosters } from './evolution.js'
import { heldItems } from './held-items.js'

export const shopItems = {
  'poke-ball': { price: 100, names: ['Poké Ball', 'Poké Ball'], ball: 'normal' },
  'great-ball': { price: 250, names: ['Super Ball', 'Great Ball'], ball: 'great' },
  'ultra-ball': { price: 500, names: ['Ultra Ball', 'Ultra Ball'], ball: 'ultra' },
  'dna-booster': { price: 10000, names: ['DNA Booster', 'DNA Booster'], dna: true, icon: 'protein' },
  ...Object.fromEntries(Object.entries(heldItems).map(([id, names]) =>
    [id, { price: id === 'sitrus-berry' ? 2500 : 5000, names: names.slice(0, 2), held: true }]))
}

export const validShopPrice = value => Number.isSafeInteger(value) && value >= 1 && value <= 100_000

export const maxShopQuantity = 99

export const validShopQuantity = (product, quantity) => Number.isSafeInteger(quantity) &&
  quantity >= 1 && quantity <= (product.ball ? maxShopQuantity : product.dna ? maxDnaBoosters : 1)

export function normalizeShopPrices(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values) || Object.entries(values).some(([id, value]) =>
    !Object.hasOwn(shopItems, id) || !validShopPrice(value))) return null
  return Object.fromEntries(Object.entries(shopItems).map(([id, item]) => [id, values[id] ?? item.price]))
}
