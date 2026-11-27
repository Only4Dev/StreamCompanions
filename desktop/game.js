import { hasPickup } from '../ui/abilities.js'
import { normalizeCommand } from './commands.js'
import { evolutionChildren, evolutionParent, familyDnaCount, familyRoot, maxDnaBoosters, nextEvolutionLevel } from '../ui/evolution.js'
import { defaultSummonXpPerSecond, level, maxLevel, maxXp, xpAtLevel } from '../ui/levels.js'
import { captureCategories, catchChance, catchDifficulty, eggRarity, normalizeCapturePercentages, specialEncounterTag } from '../ui/capture-rates.js'
import { heldItems } from '../ui/held-items.js'
import { eggRarities, normalizeShopPrices, shopItems, validShopPrice, validShopQuantity } from '../ui/shop.js'

export const creatures = ['Brasa', 'Musgo', 'Gota']

export { catchChance }

export function createGame({ now = Date.now, random = Math.random, streamStarters = false, progress, onEvolution = () => {}, onSummonChange = () => {}, catalog = creatures.map(name => ({ name, shiny: true })) } = {}) {
  const species = catalog.map(item => item.name)
  const starterSpecies = catalog.filter(item => item.id && !item.legendary && !evolutionParent(item.id) && [1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912].includes(item.id))
  const shinySpecies = new Set(catalog.filter(item => item.shiny).map(item => item.name))
  const byName = new Map(catalog.map(item => [item.name, item]))
  const byId = new Map(catalog.filter(item => item.id).map(item => [item.id, item]))
  const specialTags = new Map(catalog.map(item => [item.name, specialEncounterTag(item.id, item.legendary)]))
  const specialSpecies = catalog.filter(item => specialTags.get(item.name)).map(item => item.name)
  const wildSpecies = catalog.filter(item => !specialTags.get(item.name) && !evolutionParent(item.id)).map(item => item.name)
  const eggPools = new Map(eggRarities.map(rarity => [rarity, []]))
  for (const item of catalog) {
    if (item.id && !specialTags.get(item.name) && !evolutionParent(item.id)) eggPools.get(eggRarity(item.id)).push(item)
  }
  const eggWeights = [65, 25, 8, 2]
  const eggChoices = eggRarities.map((rarity, index) => ({ rarity, weight: eggWeights[index], pool: eggPools.get(rarity) }))
    .filter(choice => choice.pool.length)
  const eggWeight = eggChoices.reduce((total, choice) => total + choice.weight, 0)
  const trackers = catalog.filter(item => specialTags.get(item.name) === 'legendary')
  const recentCaptures = []
  let captureSequence = 0
  const initialMetrics = () => ({ wins: 0, losses: 0, summonSeconds: 0 })
  const viewers = new Map(Object.entries(progress?.viewers ?? {}).map(([id, viewer]) =>
    [id, { ...viewer, metrics: { ...initialMetrics(), ...viewer.metrics }, active: null }]))
  const shopReceipts = new Map(Object.entries(progress?.shopReceipts ?? {}))
  const viewerGenerations = new Map(Object.entries(progress?.viewerGenerations ?? {}))
  const erasedViewers = new Set(progress?.erasedViewers ?? [])
  for (const id of erasedViewers) viewers.delete(id)
  let layer = 0
  const savedConfig = { ...progress?.config }
  delete savedConfig.duplicateXp
  const config = { interval: 30, duration: 3, catchGraceSeconds: 10, legendaryChancePercent: .01, shiny: 128, nameLimit: 50, visibleLimit: 100, spriteScale: 100, duplicateMode: 1, duplicateXpPercent: 25, ...savedConfig }
  if (!savedConfig.summonXpTuned && config.summonXpPerSecond === 1) config.summonXpPerSecond = defaultSummonXpPerSecond
  config.summonXpPerSecond ??= defaultSummonXpPerSecond
  delete config.battleXpPerOpponent
  config.battleXpPercentPerWin = Number.isFinite(config.battleXpPercentPerWin) &&
    config.battleXpPercentPerWin >= 0 && config.battleXpPercentPerWin <= 100 ? config.battleXpPercentPerWin : 25
  config.battleMoneyPerWin ??= 0
  config.summonMoneyPerMinute ??= 50
  config.battleEveryEncounters ??= 5
  config.battleEnabled ??= 0
  config.battleHpMultiplier ??= 1
  config.capturePercentages = normalizeCapturePercentages(config.capturePercentages) ??
    Object.fromEntries(captureCategories.map(({ id, defaults }) => [id, [...defaults]]))
  config.shopPrices = normalizeShopPrices(config.shopPrices ?? {}) ?? normalizeShopPrices({})
  let encounter = null
  let wildPaused = false
  let battleActive = false
  let encounterCount = 0
  let savedEncounters = progress?.statistics?.encounters ?? 0
  let savedCaptures = progress?.statistics?.captures ?? 0
  let encounterBaseline = 0
  let captureBaseline = 0
  const statistics = () => ({ encounters: savedEncounters + encounterCount - encounterBaseline,
    captures: savedCaptures + captureSequence - captureBaseline })
  let nextLegendary = specialSpecies.includes(progress?.nextLegendary) ? progress.nextLegendary : undefined
  let trackerAt = nextLegendary && Number.isSafeInteger(progress?.trackerAt) ? progress.trackerAt : undefined
  let nextAt = trackerAt ?? now() + config.interval * 60_000
  let notice = ''

  const families = new Map()
  for (const item of byId.values()) {
    const root = familyRoot(item.id)
    if (!families.has(root)) families.set(root, [])
    families.get(root).push(item)
  }

  function shareFamily(viewer, key, xp, announce = true) {
    const shiny = key.endsWith(' ✦')
    const suffix = shiny ? ' ✦' : ''
    const entry = byName.get(key.replace(/ ✦$/, ''))
    const members = entry?.id ? families.get(familyRoot(entry.id)) : null
    if (!members) {
      viewer.collection[key] = xp
      return
    }
    const unlocked = new Set(members.filter(item => Object.hasOwn(viewer.collection, item.name + suffix)).map(item => item.id))
    const rank = level(xp)
    for (const id of unlocked) {
      let parent = evolutionParent(id)
      while (parent && rank >= nextEvolutionLevel(parent)) {
        if (byId.has(parent) && (!shiny || byId.get(parent).shiny)) unlocked.add(parent)
        parent = evolutionParent(parent)
      }
    }
    const visited = new Set(unlocked)
    const queue = [...unlocked]
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]
      if (!(rank >= nextEvolutionLevel(id))) continue
      for (const target of evolutionChildren(id)) {
        const item = byId.get(target)
        if (visited.has(target)) continue
        visited.add(target)
        // Allow later shiny forms to unlock even when an intermediate shiny is unavailable.
        queue.push(target)
        if (item && (!shiny || item.shiny)) unlocked.add(target)
      }
    }
    const newForms = []
    for (const member of members) {
      if (!unlocked.has(member.id)) continue
      const form = member.name + suffix
      if (!Object.hasOwn(viewer.collection, form)) {
        newForms.push(form)
        if (announce) (viewer.dexAcquired ??= {})[form] = now()
      }
      viewer.collection[form] = xp
    }
    if (!announce || !newForms.length) return
    if (newForms.length === 1 && viewer.active?.key === key) {
      const target = newForms[0]
      if (evolutionChildren(byName.get(key.replace(/ ✦$/, ''))?.id).includes(byName.get(target.replace(/ ✦$/, ''))?.id)) {
        viewer.active.key = target
        viewer.active.evolvedAt = now()
        onSummonChange({ event: 'evolved', from: key, species: target, layer: viewer.active.layer })
      }
    }
    onEvolution(viewer.displayName, newForms)
  }

  function familyXp(viewer, key) {
    const item = byName.get(key.replace(/ ✦$/, ''))
    if (!item?.id) return viewer.collection[key] ?? 0
    const suffix = key.endsWith(' ✦') ? ' ✦' : ''
    return Math.max(0, ...families.get(familyRoot(item.id)).map(member => viewer.collection[member.name + suffix] ?? 0))
  }

  function dnaKeys(viewer, key) {
    const name = key.replace(/ ✦$/, '')
    const id = byName.get(name)?.id
    const names = id ? families.get(familyRoot(id)).map(member => member.name) : [name]
    return names.flatMap(name => [name, name + ' ✦'])
      .filter(name => Object.hasOwn(viewer.collection, name)).sort()
  }

  for (const viewer of viewers.values()) {
    for (const key of Object.keys(viewer.collection)) shareFamily(viewer, key, familyXp(viewer, key), false)
  }

  function spawn(name) {
    if (wildPaused) throw new Error("Wild encounters are paused for battle")
    const entry = byName.get(name)
    const specialTag = specialTags.get(name)
    if (!entry || (!specialTag && evolutionParent(entry.id))) throw new Error('Invalid wild creature')
    const time = now()
    const legendary = specialTag === 'legendary' || specialTag === 'mythical'
    const endsAt = time + (specialTag ? 5 : config.duration) * 60_000
    const catchUntil = endsAt + config.catchGraceSeconds * 1000
    encounter = { id: time + ':' + ++encounterCount, name, level: 1, legendary, specialTag,
      shiny: shinySpecies.has(name) && random() < 1 / config.shiny, endsAt, catchUntil }
    nextAt = Math.max(trackerAt ?? time + config.interval * 60_000, catchUntil)
    for (const viewer of viewers.values()) viewer.caughtChannels = new Set()
  }

  function tick() {
    if (config.running === false) return
    const time = now()
    if (encounter?.catchUntil <= time) encounter = null
    if (!wildPaused && (!trackerAt || !battleActive) && !encounter && nextAt <= time) {
      if (nextLegendary) {
        trackerAt = undefined
        spawn(nextLegendary)
        nextLegendary = undefined
      } else {
        const pool = specialSpecies.length && random() < config.legendaryChancePercent / 100 ? specialSpecies : wildSpecies
        if (pool.length) spawn(pool[Math.floor(random() * pool.length)])
      }
    }
    if (battleActive) return
    for (const viewer of viewers.values()) {
      const active = viewer.active
      if (!active) continue
      const until = time
      const seconds = Math.max(0, until - active.last) / 1000
      const xp = viewer.collection[active.key] ?? 0
      if (seconds && config.summonXpPerSecond && xp < maxXp) shareFamily(viewer, active.key,
        Math.min(maxXp, xp + seconds * config.summonXpPerSecond))
      const before = Math.floor(viewer.metrics.summonSeconds / 60)
      viewer.metrics.summonSeconds += seconds
      const after = Math.floor(viewer.metrics.summonSeconds / 60)
      const speciesId = byName.get(active.key.replace(/ ✦$/, ''))?.id
      const itemDropChance = hasPickup(speciesId) ? .052 : .002
      for (let minute = before; minute < after; minute++) {
        const candy = random() < .05
        const money = config.summonMoneyPerMinute
        if (candy) viewer.rareCandies = (viewer.rareCandies ?? 0) + 1
        if (money) viewer.pokeDollars = (viewer.pokeDollars ?? 0) + money
        if (random() < itemDropChance) grantHeldItem(viewer)
        const masterBall = random() < .0001
        if (masterBall) {
          viewer.balls ??= { normal: 0, great: 0, ultra: 0, master: 0 }
          viewer.balls.master = (viewer.balls.master ?? 0) + 1
        }
        if (candy || money || masterBall) active.pickup = { at: until, candy, money, ...(masterBall ? { masterBall } : {}) }
      }
      active.last = until
    }
  }

  function chat(id, raw, displayName, channel, { sharedSummon = false } = {}) {
    if (erasedViewers.has(id)) return ''
    if (config.running === false) return ''
    const message = normalizeCommand(raw).toLowerCase()
    if (message !== '!legendaryticket') tick()
    const viewer = viewers.get(id)
    if (battleActive && /^(?:!poke join|!catch|!summon|!summonshiny|!evolve|!candy|!legendaryticket)(?: |$)/.test(message)) return 'battleLocked'
    if (message === '!poke join') {
      if (viewer && (!streamStarters || Object.keys(viewer.collection).length)) return 'alreadyJoined'
      const collection = viewer?.collection ?? {}
      if (streamStarters && starterSpecies.length) {
        collection[starterSpecies[Math.floor(random() * starterSpecies.length)].name] = 0
      }
      if (!viewer) viewers.set(id, { displayName, balls: { normal: 5, great: 0, ultra: 0, master: 0 },
        collection, metrics: initialMetrics(), active: null })
      return 'joined'
    }
    if (viewer && displayName) viewer.displayName = displayName
    if (!viewer) return 'joinFirst'
    if (message === '!legendaryticket') {
      if (wildPaused) return 'battleLocked'
      if (nextLegendary) return 'trackerQueued'
      if (!(viewer.legendaryTrackers > 0)) return 'trackerMissing'
      if (!trackers.length) return 'unavailable'
      nextLegendary = trackers[Math.floor(random() * trackers.length)].name
      trackerAt = Math.max(nextAt, now() + 300_000, encounter?.catchUntil ?? 0)
      nextAt = trackerAt
      viewer.legendaryTrackers--
      return 'trackerUsed'
    }
    if (message === '!summon out') {
      if (viewer.active) onSummonChange({ event: 'withdrawn', species: viewer.active.key, layer: viewer.active.layer })
      viewer.active = null
      return 'removed'
    }
    const [command, ...parts] = message.split(/\s+/)
    const argument = parts.join(' ')
    if (command === '!candy') {
      const key = viewer.active?.key
      if (!key || (!sharedSummon && viewer.active.channel !== channel)) return 'candyNoSummon'
      const quantity = argument ? Number(argument) : 1
      if (argument && (!/^\d+$/.test(argument) || !Number.isSafeInteger(quantity) || quantity < 1)) return 'candyQuantity'
      const rank = level(viewer.collection[key])
      if (rank + quantity > maxLevel) return 'candyMaxLevel'
      if ((viewer.rareCandies ?? 0) < quantity) return 'noCandy'
      viewer.rareCandies -= quantity
      shareFamily(viewer, key, xpAtLevel(rank + quantity))
      return 'candyUsed'
    }
    if (command === '!evolve') return 'automaticEvolution'
    if (command === '!catch') {
      const ball = argument || 'normal'
      if (!encounter) return 'noEncounter'
      const key = encounter.name + (encounter.shiny ? ' ✦' : '')
      const owned = Object.hasOwn(viewer.collection, key)
      if (viewer.caughtChannels?.has(channel) || (owned && config.duplicateMode === 0)) return 'alreadyCaught'
      if (!Object.hasOwn(viewer.balls, ball)) return 'invalidBall'
      if (!viewer.balls[ball]) return 'noBalls'
      viewer.balls[ball]--
      if (ball !== 'master' && random() >= catchChance(ball, byName.get(encounter.name)?.id, encounter.legendary, config.capturePercentages)) return 'escaped'
      viewer.caughtChannels ??= new Set()
      viewer.caughtChannels.add(channel)
      recentCaptures.push({ id: ++captureSequence, encounterId: encounter.id, viewer: viewer.displayName || id,
        pokemon: key, at: now() })
      if (recentCaptures.length > 40) recentCaptures.shift()
      if (!owned) {
        ;(viewer.dexAcquired ??= {})[key] = now()
        viewer.collection[key] = familyXp(viewer, key)
        shareFamily(viewer, key, viewer.collection[key])
        return 'caught'
      }
      const xp = viewer.collection[key]
      if (xp >= maxXp) return 'caught'
      const levelIndex = Math.floor(Math.sqrt(xp / 120))
      const nextLevelXp = (levelIndex + 1) ** 2 * 120
      const levelSpan = nextLevelXp - levelIndex ** 2 * 120
      const earnedXp = Math.max(1, Math.round(levelSpan * config.duplicateXpPercent / 100))
      shareFamily(viewer, key, Math.min(maxXp, config.duplicateMode === 2 ? nextLevelXp : xp + earnedXp))
      return 'duplicateReward'
    }
    if (command === '!summon' || command === '!summonshiny') {
      const name = species.find(item => item.toLowerCase() === argument)
      if (!name) return 'missingCreature'
      const key = name + (command === '!summonshiny' ? ' ✦' : '')
      if (!Object.hasOwn(viewer.collection, key)) return 'missingCreature'
      viewer.active = { key, channel, expires: Number.MAX_SAFE_INTEGER, last: now(), layer: viewer.active?.layer ?? ++layer }
      onSummonChange({ event: 'summoned', species: key, layer: viewer.active.layer })
      return 'summoned'
    }
    return 'ignored'
  }

  function grantHeldItem(viewer) {
    viewer.heldItems ??= []
    const available = Object.keys(heldItems).filter(item => !viewer.heldItems.includes(item))
    if (available.length) viewer.heldItems.push(available[Math.floor(random() * available.length)])
  }

  return {
    config,
    creditBattleMove(id, amount) {
      const viewer = viewers.get(id)
      if (!viewer || !battleActive || ![50, 100].includes(amount)) return false
      viewer.pokeDollars = (viewer.pokeDollars ?? 0) + amount
      return true
    },
    viewerGeneration: id => viewerGenerations.get(id) ?? 0,
    applyErasure({ viewer_id: id, generation, active }) {
      const previous = viewerGenerations.get(id) ?? 0
      if (generation < previous) return false
      if (generation === previous && erasedViewers.has(id) === !active) return false
      if (generation > previous || !active) viewers.delete(id)
      viewerGenerations.set(id, generation)
      if (active) erasedViewers.delete(id)
      else erasedViewers.add(id)
      recentCaptures.length = 0
      return true
    },
    setCapturePercentages(values) {
      const percentages = normalizeCapturePercentages(values)
      if (!percentages) throw new Error('Invalid capture percentages')
      config.capturePercentages = percentages
    },
    setShopPrices(values) {
      const prices = normalizeShopPrices(values)
      if (!prices) throw new Error('Invalid shop prices')
      config.shopPrices = prices
    },
    fulfillOrder({ id, viewerId, item, price, speciesKey, quantity = 1 }) {
      if (shopReceipts.has(id)) return shopReceipts.get(id)?.result ?? shopReceipts.get(id)
      if (battleActive) {
        shopReceipts.set(id, 'battleLocked')
        return 'battleLocked'
      }
      const product = Object.hasOwn(shopItems, item) ? shopItems[item] : null
      const viewer = viewers.get(viewerId)
      let result = 'unavailable'
      let hatch
      const unitPrice = config.shopPrices?.[item] ?? product?.price
      const charge = unitPrice * quantity
      if (viewer && product && validShopPrice(unitPrice, product) && (price == null || validShopPrice(price, product)) && validShopQuantity(product, quantity) && (!product.dna || Object.hasOwn(viewer.collection, speciesKey ?? ''))) {
        const keys = product.dna ? dnaKeys(viewer, speciesKey) : []
        const dna = familyDnaCount(viewer.dnaBoosters, keys)
        if (price != null && price !== unitPrice) result = 'repriced'
        else if (product.held && viewer.heldItems?.includes(item)) result = 'owned'
        else if (product.dna && dna + quantity > maxDnaBoosters) result = 'maxed'
        else if ((viewer.pokeDollars ?? 0) < charge) result = 'funds'
        else if (item === 'poke-egg' && !eggWeight) result = 'unavailable'
        else {
          viewer.pokeDollars -= charge
          if (product.ball) viewer.balls[product.ball] = (viewer.balls[product.ball] ?? 0) + quantity
          else if (product.dna) {
            viewer.dnaBoosters ??= {}
            for (const key of keys) delete viewer.dnaBoosters[key]
            viewer.dnaBoosters[keys[0]] = dna + quantity
          }
          else if (item === 'legendary-tracker') viewer.legendaryTrackers = (viewer.legendaryTrackers ?? 0) + 1
          else if (item === 'poke-egg') {
            let roll = random() * eggWeight
            const { rarity, pool } = eggChoices.find(choice => (roll -= choice.weight) < 0) ?? eggChoices.at(-1)
            const pokemon = pool[Math.floor(random() * pool.length)]
            const duplicate = Object.hasOwn(viewer.collection, pokemon.name)
            const xp = familyXp(viewer, pokemon.name)
            const rank = level(xp)
            const bonus = duplicate && rank < maxLevel && config.duplicateMode !== 1
              ? xpAtLevel(rank + 1) - xp
              : duplicate && rank < maxLevel ? Math.max(1, Math.round((xpAtLevel(rank + 1) - xpAtLevel(rank)) * config.duplicateXpPercent / 100)) : 0
            const earned = Math.min(bonus, maxXp - xp)
            if (!duplicate) {
              viewer.collection[pokemon.name] = xp
              ;(viewer.dexAcquired ??= {})[pokemon.name] = now()
            }
            shareFamily(viewer, pokemon.name, xp + earned)
            hatch = { id: pokemon.id, name: pokemon.name, rarity, duplicate, xp: earned }
          } else (viewer.heldItems ??= []).push(item)
          result = 'purchased'
        }
      }
      shopReceipts.set(id, hatch ? { result, hatch } : result)
      return result
    },
    grantAdmin({ viewerId, kind, item, amount }) {
      const viewer = viewers.get(viewerId)
      if (!viewer || erasedViewers.has(viewerId) || !Number.isSafeInteger(amount) || amount < 1) return false
      if (kind === 'pokemon') {
        const entry = byName.get(typeof item === 'string' ? item.replace(/ ✦$/, '') : '')
        if (amount !== 1 || !entry || item.endsWith(' ✦') && !entry.shiny || Object.hasOwn(viewer.collection, item)) return false
        ;(viewer.dexAcquired ??= {})[item] = now()
        viewer.collection[item] = familyXp(viewer, item)
        shareFamily(viewer, item, viewer.collection[item])
        return true
      }
      if (kind === 'held') {
        if (amount !== 1 || !Object.hasOwn(heldItems, item) || viewer.heldItems?.includes(item)) return false
        ;(viewer.heldItems ??= []).push(item)
        return true
      }
      if (kind === 'balls') {
        if (amount > 999 || !['normal', 'great', 'ultra', 'master'].includes(item)) return false
        viewer.balls ??= { normal: 0, great: 0, ultra: 0, master: 0 }
        viewer.balls[item] = (viewer.balls[item] ?? 0) + amount
        return true
      }
      const counter = { money: 'pokeDollars', candy: 'rareCandies', tracker: 'legendaryTrackers' }
      if (!Object.hasOwn(counter, kind) || amount > (kind === 'money' ? 1_000_000 : 999)) return false
      const key = counter[kind]
      const total = (viewer[key] ?? 0) + amount
      if (!Number.isSafeInteger(total)) return false
      viewer[key] = total
      return true
    },
    shopHatch: id => shopReceipts.get(id)?.hatch,
    dnaCount: (viewer, key) => familyDnaCount(viewer.dnaBoosters, dnaKeys(viewer, key)),
    acknowledgeOrders(ids) {
      const time = now()
      for (const id of ids) {
        const receipt = shopReceipts.get(id)
        if (id.startsWith('web:')) shopReceipts.delete(id)
        else if (receipt && receipt.completedAt === undefined) {
          shopReceipts.set(id, { ...(typeof receipt === 'string' ? { result: receipt } : receipt), completedAt: time })
        }
      }
      for (const [id, receipt] of shopReceipts) {
        if (receipt?.completedAt !== undefined && time - receipt.completedAt > 86_400_000) shopReceipts.delete(id)
      }
    },
    encounterCount: () => encounterCount,
    clearStatistics() {
      savedEncounters = 0
      savedCaptures = 0
      encounterBaseline = encounterCount
      captureBaseline = captureSequence
    },
    trackerPending: () => Boolean(trackerAt),
    queueLegendary(name) {
      if (trackerAt) return false
      if (!specialSpecies.includes(name)) throw new Error('Invalid legendary')
      nextLegendary = name
    },
    grantDemoMasterBall(id) {
      const viewer = viewers.get(id)
      if (!viewer) return false
      viewer.balls.master++
      return true
    },
    webReceipt: id => shopReceipts.get('web:' + id),
    rememberWebReceipt: (id, result) => shopReceipts.set('web:' + id, result),
    currentEncounter() {
      tick()
      return encounter
    },
    hasEncounter: () => Boolean(encounter && encounter.catchUntil > now()),
    ballInventory: id => viewers.get(id)?.balls,
    setBattleActive(active) {
      if (battleActive === active) return
      if (active) tick()
      else for (const viewer of viewers.values()) if (viewer.active) viewer.active.last = now()
      battleActive = active
    },
    setWildPaused(paused) {
      if (wildPaused && !paused) nextAt = trackerAt ? Math.max(trackerAt, now() + 60_000) : now() + config.interval * 60_000
      wildPaused = paused
    },
    spawn,
    setRunning(running) {
      if ((config.running !== false) === running) return
      tick()
      config.running = running
      notice = ''
      if (running) nextAt = trackerAt ? Math.max(trackerAt, now() + 60_000) : now() + config.interval * 60_000
      else {
        encounter = null
        recentCaptures.length = 0
        for (const viewer of viewers.values()) viewer.active = null
      }
    },
    schedule() {
      tick()
      return wildPaused ? null : nextAt
    },
    chat(id, message, displayName, channel = 'local', options) {
      const result = chat(id, message, displayName, channel, options)
      notice = result
      return result
    },
    resetCommunity() {
      viewers.clear()
      shopReceipts.clear()
      recentCaptures.length = 0
      encounter = null
      nextLegendary = undefined
      trackerAt = undefined
      notice = ''
      nextAt = now() + config.interval * 60_000
    },
    latestCapture: () => recentCaptures.at(-1),
    recordAction(id, action) {
      const viewer = viewers.get(id)
      if (viewer) viewer.log = [...(viewer.log ?? []).slice(-29), { ...action, at: now() }]
    },
    starterName: id => Object.keys(viewers.get(id)?.collection ?? {})[0],
    encounterDifficulty: (name, language) => catchDifficulty(byName.get(name)?.id, byName.get(name)?.legendary, language),
    linkKickViewer(kickId, twitchId) {
      if (erasedViewers.has(kickId) || erasedViewers.has(twitchId)) return
      const source = viewers.get(kickId)
      if (!source) return
      const target = viewers.get(twitchId)
      if (!target) {
        viewers.set(twitchId, source)
      } else {
        for (const [name, xp] of Object.entries(source.collection)) {
          target.collection[name] = Math.max(target.collection[name] ?? 0, xp)
        }
        for (const name of Object.keys(target.collection)) shareFamily(target, name, familyXp(target, name), false)
        target.balls ??= { normal: 0, great: 0, ultra: 0, master: 0 }
        for (const key of Object.keys(target.balls)) target.balls[key] = Math.max(target.balls[key], source.balls?.[key] ?? 0)
        for (const key of Object.keys(target.metrics)) target.metrics[key] = Math.max(target.metrics[key], source.metrics[key] ?? 0)
        for (const [name, at] of Object.entries(source.dexAcquired ?? {})) {
          const acquired = target.dexAcquired ??= {}
          acquired[name] = Math.max(acquired[name] ?? 0, at)
        }
        target.heldItems = [...new Set([...(target.heldItems ?? []), ...(source.heldItems ?? [])])]
        target.legendaryTrackers = Math.max(target.legendaryTrackers ?? 0, source.legendaryTrackers ?? 0)
        target.rareCandies = Math.max(target.rareCandies ?? 0, source.rareCandies ?? 0)
        target.log = [...(target.log ?? []), ...(source.log ?? [])].sort((a, b) => a.at - b.at).slice(-30)
        target.pokeDollars = Math.max(target.pokeDollars ?? 0, source.pokeDollars ?? 0)
        if (source.dnaBoosters) {
          const imported = new Set()
          for (const key of Object.keys(source.dnaBoosters)) {
            const keys = dnaKeys(target, key)
            if (!keys.length || imported.has(keys[0])) continue
            imported.add(keys[0])
            const count = Math.max(familyDnaCount(target.dnaBoosters, keys), familyDnaCount(source.dnaBoosters, keys))
            target.dnaBoosters ??= {}
            for (const member of keys) delete target.dnaBoosters[member]
            target.dnaBoosters[keys[0]] = count
          }
        }
        target.caughtChannels = new Set([...(target.caughtChannels ?? []), ...(source.caughtChannels ?? [])])
        if (source.active && target.active) onSummonChange({ event: 'linkedSummonsMerged', layers: [source.active.layer, target.active.layer] })
        if (!target.active || source.active && source.active.layer < target.active.layer) target.active = source.active
      }
      viewers.delete(kickId)
      return true
    },
    snapshot() {
      tick()
      const visibleEncounter = encounter && now() < encounter.endsAt ? encounter : null
      return structuredClone({ config, encounter: visibleEncounter, nextAt: wildPaused ? null : nextAt, nextLegendary, notice, recentCaptures,
        encounterCount: encounterCount - encounterBaseline, captureCount: captureSequence - captureBaseline,
        statistics: statistics(), viewers: Object.fromEntries(viewers) })
    },
    overlay(kind) {
      tick()
      if (kind === 'encounter') {
        return { config, encounter: encounter && now() < encounter.endsAt ? encounter : null, recentCaptures }
      }
      const activeViewers = []
      for (const [id, viewer] of viewers) {
        const { active, displayName, collection } = viewer
        if (!active) continue
        activeViewers.push([id, { active, displayName, collection: { [active.key]: collection[active.key] } }])
      }
      return { config, viewers: Object.fromEntries(activeViewers) }
    },
    progress() {
      tick()
      return {
        config,
        statistics: statistics(),
        nextLegendary,
        trackerAt,
        erasedViewers: [...erasedViewers],
        viewerGenerations: Object.fromEntries(viewerGenerations),
        shopReceipts: Object.fromEntries(shopReceipts),
        viewers: Object.fromEntries([...viewers].map(([id, { balls, collection, displayName, metrics, heldItems, rareCandies, legendaryTrackers, pokeDollars, dnaBoosters, log, dexAcquired }]) =>
          [id, { balls, collection, displayName, metrics, heldItems, rareCandies, legendaryTrackers, pokeDollars, dnaBoosters, log, dexAcquired }]))
      }
    },
    recordBattle(participants, winner, speciesKey) {
      if (!winner || !participants.includes(winner)) return 0
      const fighters = new Set(participants)
      for (const id of fighters) {
        const metrics = viewers.get(id)?.metrics
        if (metrics) metrics[id === winner ? 'wins' : 'losses']++
      }
      const viewer = viewers.get(winner)
      const money = viewer && fighters.size > 1 ? config.battleMoneyPerWin : 0
      if (money) viewer.pokeDollars = (viewer.pokeDollars ?? 0) + money
      if (viewer && speciesKey && Object.hasOwn(viewer.collection, speciesKey)) {
        const xp = viewer.collection[speciesKey]
        if (fighters.size > 1 && xp < maxXp && config.battleXpPercentPerWin) {
          const rank = level(xp)
          const levelSpan = xpAtLevel(rank + 1) - xpAtLevel(rank)
          const reward = levelSpan * config.battleXpPercentPerWin / 100
          shareFamily(viewer, speciesKey, Math.min(maxXp, xp + reward))
        }
        if (fighters.size > 1) grantHeldItem(viewer)
      }
      return money
    },
    configure(values) {
      const { summonMoneyPerMinute = config.summonMoneyPerMinute, summonXpPerSecond = config.summonXpPerSecond, battleXpPercentPerWin = config.battleXpPercentPerWin } = values
      const { battleEveryEncounters = config.battleEveryEncounters, battleMoneyPerWin = config.battleMoneyPerWin } = values
      const { battleEnabled = config.battleEnabled, battleHpMultiplier = config.battleHpMultiplier } = values
      const { interval, duration, catchGraceSeconds = config.catchGraceSeconds, legendaryChancePercent = config.legendaryChancePercent, shiny, nameLimit = config.nameLimit, visibleLimit = config.visibleLimit, spriteScale = config.spriteScale, duplicateMode = config.duplicateMode, duplicateXpPercent = config.duplicateXpPercent } = values
      if (!Number.isInteger(interval) || interval < 6 || interval > 1440 ||
          !Number.isInteger(duration) || duration < 1 || duration > interval ||
          !Number.isFinite(legendaryChancePercent) || legendaryChancePercent < 0 || legendaryChancePercent > 100 ||
          !Number.isInteger(catchGraceSeconds) || catchGraceSeconds < 0 || catchGraceSeconds > 120 ||
          !Number.isInteger(shiny) || shiny < 1 || shiny > 100000 ||
          !Number.isInteger(nameLimit) || nameLimit < 0 || nameLimit > 250 ||
          !Number.isInteger(visibleLimit) || visibleLimit < 1 || visibleLimit > 250 ||
          !Number.isInteger(spriteScale) || spriteScale < 50 || spriteScale > 300 ||
          ![0, 1, 2].includes(duplicateMode) ||
          !Number.isInteger(duplicateXpPercent) || duplicateXpPercent < 1 || duplicateXpPercent > 100 ||
          !Number.isInteger(summonMoneyPerMinute) || summonMoneyPerMinute < 0 || summonMoneyPerMinute > 100_000 ||
          !Number.isFinite(summonXpPerSecond) || summonXpPerSecond < 0 || summonXpPerSecond > 100 ||
          !Number.isSafeInteger(battleMoneyPerWin) || battleMoneyPerWin < 0 || battleMoneyPerWin > 1_000_000 ||
          !Number.isFinite(battleXpPercentPerWin) || battleXpPercentPerWin < 0 || battleXpPercentPerWin > 100 ||
          !Number.isSafeInteger(battleEveryEncounters) || battleEveryEncounters < 0 || battleEveryEncounters > 100 ||
          ![0, 1].includes(battleEnabled) || ![1, 1.5, 2].includes(battleHpMultiplier)) throw new Error('Invalid configuration')
      Object.assign(config, { interval, duration, catchGraceSeconds, legendaryChancePercent, shiny, nameLimit, visibleLimit, spriteScale, duplicateMode, duplicateXpPercent })
      Object.assign(config, { summonMoneyPerMinute, summonXpPerSecond, battleXpPercentPerWin, battleMoneyPerWin, battleEveryEncounters, battleEnabled, battleHpMultiplier })
      if (Object.hasOwn(values, 'summonXpPerSecond')) config.summonXpTuned = true
      nextAt = Math.max(trackerAt ?? now() + interval * 60_000, encounter?.catchUntil ?? 0)
    }
  }
}
