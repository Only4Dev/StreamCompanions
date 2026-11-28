import { encounterRarities, normalizeSpeciesRules, rarityFor, specialRarities } from '../ui/species-rules.js'
import { decodeAllocation, validTraining, normalizeTraining, trainingRules, trainingKey } from '../ui/training.js'
import { regionalSpecies } from '../ui/regional-species.js'
import { hasPickup } from '../ui/abilities.js'
import { normalizeCommand } from './commands.js'
import { evolutionChildren, evolutionParent, familyDnaCount, familyRoot, isFirstStage, maxDnaBoosters, nextEvolutionLevel, regionalEvolutionsFrom } from '../ui/evolution.js'
import { defaultSummonXpPerSecond, level, maxLevel, maxXp, xpAtLevel } from '../ui/levels.js'
import { captureCategories, catchChance, catchDifficulty, normalizeCapturePercentages, specialEncounterTag } from '../ui/capture-rates.js'
import { heldItems } from '../ui/held-items.js'
import { eggPool, parseEggPool } from '../ui/egg-rules.js'
import { eggRarities, normalizeShopPrices, shopItems, validShopPrice, validShopQuantity } from '../ui/shop.js'

export const creatures = ['Brasa', 'Musgo', 'Gota']

export { catchChance }

export function createGame({ now = Date.now, random = Math.random, streamStarters = false, progress, onEvolution = () => {}, onSummonChange = () => {}, catalog = creatures.map(name => ({ name, shiny: true })) } = {}) {
  const species = catalog.map(item => item.name)
  const starterSpecies = catalog.filter(item => item.id && !item.legendary && !evolutionParent(item.id) && [1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912].includes(item.id))
  const shinySpecies = new Set(catalog.filter(item => item.shiny).map(item => item.name))
  const byName = new Map(catalog.map(item => [item.name, item]))
  const byId = new Map(catalog.filter(item => item.id).map(item => [item.id, item]))
  let catchOverrides = normalizeSpeciesRules('catch', progress?.catchOverrides)
  let rarityOverrides = normalizeSpeciesRules('rarity', progress?.rarityOverrides)
  let specialSpecies, wildSpecies, wildWeight
  const specialTags = new Map(catalog.map(item => [item.name, specialEncounterTag(item.id, item.legendary)]))
  const rarityOf = item => rarityFor(item?.id, item?.legendary, rarityOverrides)
  function updateEncounterPools() {
    specialSpecies = catalog.filter(item => specialRarities.has(rarityOf(item))).map(item => item.name)
    const weights = rarityOverrides?.weights ?? encounterRarities.weights
    wildWeight = 0
    wildSpecies = catalog.filter(item => !specialRarities.has(rarityOf(item)) && isFirstStage(item.id))
      .map(item => ({ name: item.name, upper: (wildWeight += weights[rarityOf(item)]) }))
  }
  updateEncounterPools()
  const trackers = catalog.filter(item => specialTags.get(item.name) === 'legendary')
  let eggChoices, eggWeight, legendaryEggPool, legendaryEggChance, customEggPool
  function updateEggPool(input, custom = false) {
    const rules = parseEggPool(input)
    const choices = eggRarities.map(rarity => ({ rarity, weight: rules.weights[rarity],
      pool: catalog.filter(item => rules.tierFor(item.id, specialTags.get(item.name)) === rarity) }))
      .filter(choice => choice.pool.length && choice.weight > 0)
    const weight = choices.reduce((sum, tier) => sum + tier.weight, 0)
    if (custom && !weight) throw new Error('No eligible Pokémon in regular egg tiers')
    eggChoices = choices
    eggWeight = weight
    legendaryEggChance = rules.legendaryChance
    legendaryEggPool = trackers.filter(item => rules.tierFor(item.id, 'legendary') === 'legendary')
    customEggPool = custom
  }
  updateEggPool(eggPool)
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
  delete savedConfig.teamBattles
  delete savedConfig.duplicateMode
  delete savedConfig.duplicateXpPercent
  delete savedConfig.duplicateXp
  const config = { interval: 30, duration: 3, catchGraceSeconds: 10, legendaryChancePercent: .01, shiny: 128, nameLimit: 50, showPokemonName: true, showViewerName: true, visibleLimit: 100, spriteScale: 100, wildEnabled: true, raidEnabled: (savedConfig.raidChance ?? 0) > 0, raidChance: 0, raidDuration: 120, raidSizePercent: 400, raidHpMultiplier: 5, raidViewerHpPercent: 3, raidStatMultiplier: 1.2, raidLevelMode: 'highest', raidCatch: false, raidRewards: [{ kind: 'money', amount: 2500 }, { kind: 'candy', amount: 1 }], teamBattles: true, ...savedConfig }
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

  const regionalBase = new Map(regionalSpecies.map(form => [form.id, form.baseId]))
  const shinyRoot = id => familyRoot(regionalBase.get(id) ?? id)
  const shinyLines = Map.groupBy(catalog.filter(entry => entry.id), entry => shinyRoot(entry.id))
  function syncShinyUnlocks(viewer, root) {
    if (!viewer.shinyFamilies?.includes(root)) return
    for (const entry of shinyLines.get(root) ?? []) {
      const { name } = entry
      if (!entry.shiny || !Object.hasOwn(viewer.collection, name)) continue
      const variant = name + ' ✦'
      if (Object.hasOwn(viewer.collection, variant)) continue
      viewer.collection[variant] = viewer.collection[name]
      ;(viewer.dexAcquired ??= {})[variant] = now()
    }
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
    const regionalUnlocked = []
    for (const id of unlocked) {
      const requiredLevel = nextEvolutionLevel(id) ?? 31
      if (rank < requiredLevel) continue
      for (const regionalId of regionalEvolutionsFrom(id)) {
        const variant = byId.get(regionalId)
        if (!variant || (shiny && !variant.shiny)) continue
        const name = variant.name + suffix
        if (Object.hasOwn(viewer.collection, name)) continue
        viewer.collection[name] = xpAtLevel(requiredLevel)
        ;(viewer.dexAcquired ??= {})[name] = now()
        regionalUnlocked.push(name)
      }
    }
    if (!shiny) syncShinyUnlocks(viewer, shinyRoot(entry.id))
    if (!announce || (!newForms.length && !regionalUnlocked.length)) return
    if (newForms.length === 1 && viewer.active?.key === key) {
      const target = newForms[0]
      if (evolutionChildren(byName.get(key.replace(/ ✦$/, ''))?.id).includes(byName.get(target.replace(/ ✦$/, ''))?.id)) {
        viewer.active.key = target
        viewer.active.evolvedAt = now()
        onSummonChange({ event: 'evolved', from: key, species: target, layer: viewer.active.layer })
      }
    }
    onEvolution(viewer.displayName, [...newForms, ...regionalUnlocked])
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

  function spawn(name, eligible) {
    if (wildPaused) throw new Error("Wild encounters are paused for battle")
    const entry = byName.get(name)
    const rarity = entry && rarityOf(entry)
    const specialTag = specialRarities.has(rarity) ? rarity : null
    if (!entry || (!eligible && !specialTag && !isFirstStage(entry.id))) throw new Error('Invalid wild creature')
    const time = now()
    const legendary = Boolean(specialTag)
    const endsAt = time + (specialTag ? 5 : config.duration) * 60_000
    const catchUntil = endsAt + config.catchGraceSeconds * 1000
    encounter = { id: time + ':' + ++encounterCount, name, level: 1, legendary, specialTag, rarity,
      ...(eligible ? { eligible } : {}), shiny: shinySpecies.has(name) && random() < 1 / config.shiny, endsAt, catchUntil }
    nextAt = Math.max(trackerAt ?? time + config.interval * 60_000, catchUntil)
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
      } else if (config.wildEnabled) {
        if (specialSpecies.length && random() < config.legendaryChancePercent / 100) {
          spawn(specialSpecies[Math.floor(random() * specialSpecies.length)])
        } else if (wildWeight) {
          const roll = random() * wildWeight
          const selected = wildSpecies.find(item => roll < item.upper)
          if (selected) spawn(selected.name)
        }
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
        let money = config.summonMoneyPerMinute
        if (candy) viewer.rareCandies = (viewer.rareCandies ?? 0) + 1
        if (money) viewer.pokeDollars = (viewer.pokeDollars ?? 0) + money
        if (random() < itemDropChance) money += grantHeldItem(viewer, true)
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

  function chat(id, raw, displayName, channel) {
    if (erasedViewers.has(id)) return ''
    if (config.running === false) return ''
    const message = normalizeCommand(raw).toLowerCase()
    if (message !== '!legendaryticket') tick()
    const viewer = viewers.get(id)
    if (battleActive && /^(?:!poke join|!catch|!summon|!summonshiny|!evolve|!candy|!legendaryticket|!shiny)(?: |$)/.test(message)) return 'battleLocked'
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
    if (message === '!shiny') {
      const key = viewer.active?.key
      if (!key || !Object.hasOwn(viewer.collection, key)) return 'shinySummonFirst'
      if (key.endsWith(' ✦')) return 'shinyAlreadyOwned'
      const root = shinyRoot(byName.get(key)?.id)
      if (root && viewer.shinyFamilies?.includes(root)) return 'shinyAlreadyOwned'
      if (!shinySpecies.has(key)) return 'shinyUnavailable'
      if (!(viewer.shinyDust > 0)) return 'shinyDustMissing'
      const shiny = key + ' ✦'
      viewer.shinyDust--
      if (root) {
        ;(viewer.shinyFamilies ??= []).push(root)
        syncShinyUnlocks(viewer, root)
      }
      viewer.collection[shiny] ??= familyXp(viewer, key)
      ;(viewer.dexAcquired ??= {})[shiny] ??= now()
      shareFamily(viewer, shiny, viewer.collection[shiny])
      viewer.active.key = shiny
      onSummonChange({ event: 'shinyConverted', species: shiny, layer: viewer.active.layer })
      return 'shinyConverted'
    }
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
      if (!key) return 'candyNoSummon'
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
      if (encounter.eligible && !encounter.eligible.includes(id)) return 'raidCatchIneligible'
      const key = encounter.name + (encounter.shiny ? ' ✦' : '')
      const owned = Object.hasOwn(viewer.collection, key)
      if (viewer.caughtEncounter === encounter.id || (owned && level(familyXp(viewer, key)) >= maxLevel)) return 'alreadyCaught'
      if (!Object.hasOwn(viewer.balls, ball)) return 'invalidBall'
      if (!viewer.balls[ball]) return 'noBalls'
      viewer.balls[ball]--
      if (ball !== 'master' && random() >= catchChance(ball, byName.get(encounter.name)?.id, encounter.legendary, config.capturePercentages, catchOverrides?.species[byName.get(encounter.name)?.id])) return 'escaped'
      viewer.caughtEncounter = encounter.id
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
      shareFamily(viewer, key, xpAtLevel(Math.min(maxLevel, level(xp) + 1)))
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

  function grantHeldItem(viewer, roaming = false) {
    viewer.heldItems ??= []
    const available = Object.keys(heldItems).filter(item => roaming || !viewer.heldItems.includes(item))
    if (!available.length) return 0
    const item = available[Math.floor(random() * available.length)]
    if (!viewer.heldItems.includes(item)) {
      viewer.heldItems.push(item)
      return 0
    }
    const refund = Math.floor(config.shopPrices[item] / 2)
    viewer.pokeDollars = (viewer.pokeDollars ?? 0) + refund
    return refund
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
    setSpeciesRules(kind, values) {
      const rules = values === null ? null : normalizeSpeciesRules(kind, values)
      if (values !== null && !rules) throw new Error('Invalid species rules')
      if (kind === 'catch') catchOverrides = rules
      else if (kind === 'rarity') {
        rarityOverrides = rules
        updateEncounterPools()
      } else throw new Error('Invalid species rule type')
    },
    setCapturePercentages(values) {
      const percentages = normalizeCapturePercentages(values)
      if (!percentages) throw new Error('Invalid capture percentages')
      config.capturePercentages = percentages
    },
    setEggPool: input => updateEggPool(input, true),
    setRaidRewards(rewards) {
      if (!Array.isArray(rewards) || rewards.length > 10 || rewards.some(({kind, item, amount}) =>
        !['money', 'candy', 'tracker', 'balls', 'held', 'dust'].includes(kind) || !Number.isSafeInteger(amount) || amount < 1 ||
        amount > (kind === 'money' ? 1_000_000 : 999) ||
        kind === 'balls' && !['normal', 'great', 'ultra', 'master'].includes(item) ||
        kind === 'held' && (!Object.hasOwn(heldItems, item) || amount !== 1))) throw new Error('Invalid raid rewards')
      config.raidRewards = rewards
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
          else if (item === 'vitamin-complex') viewer.vitamins = (viewer.vitamins ?? 0) + quantity
          else if (item === 'shiny-dust') viewer.shinyDust = (viewer.shinyDust ?? 0) + 1
          else if (item === 'legendary-tracker') viewer.legendaryTrackers = (viewer.legendaryTrackers ?? 0) + 1
          else if (item === 'poke-egg') {
            const roll = random()
            let regularRoll = (legendaryEggPool.length ? Math.max(0, (roll - legendaryEggChance) / (1 - legendaryEggChance)) : roll) * eggWeight
            const { rarity, pool } = legendaryEggPool.length && roll < legendaryEggChance
              ? { rarity: 'legendary', pool: legendaryEggPool }
              : eggChoices.find(choice => (regularRoll -= choice.weight) < 0) ?? eggChoices.at(-1)
            const pokemon = pool[Math.floor(random() * pool.length)]
            const duplicate = Object.hasOwn(viewer.collection, pokemon.name)
            const xp = familyXp(viewer, pokemon.name)
            const rank = level(xp)
            const bonus = duplicate && rank < maxLevel ? xpAtLevel(rank + 1) - xp : 0
            const earned = Math.min(bonus, maxXp - xp)
            if (!duplicate) {
              viewer.collection[pokemon.name] = xp
              ;(viewer.dexAcquired ??= {})[pokemon.name] = now()
            }
            shareFamily(viewer, pokemon.name, xp + earned)
            hatch = { id: pokemon.id, name: pokemon.name, rarity, duplicate, xp: earned, rules: customEggPool ? 4 : 3, ...(duplicate && earned > 0 ? { levelUp: true } : {}) }
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
      const counter = { money: 'pokeDollars', candy: 'rareCandies', tracker: 'legendaryTrackers', dust: 'shinyDust' }
      if (!Object.hasOwn(counter, kind) || amount > (kind === 'money' ? 1_000_000 : 999)) return false
      const key = counter[kind]
      const total = (viewer[key] ?? 0) + amount
      if (!Number.isSafeInteger(total)) return false
      viewer[key] = total
      return true
    },
    train(viewerId, pokemon, operation, stat) {
      const viewer = viewers.get(viewerId)
      const id = byName.get(pokemon.replace(/ ✦$/, ''))?.id
      if (!id || !viewer || !Object.hasOwn(viewer.collection, pokemon)) return 'missingCreature'
      if (battleActive) return 'battleLocked'
      const key = trainingKey(id)
      const legacy = familyDnaCount(viewer.dnaBoosters, dnaKeys(viewer, pokemon))
      const row = normalizeTraining(viewer.training?.[key], legacy)
      const spent = Object.values(row.stats).reduce((a,b)=>a+b,0)
      if (operation === 'apply') {
        const quantity = stat === '-' || stat === undefined ? 1 : Number(stat)
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > (viewer.vitamins ?? 0) ||
            row.points + quantity > trainingRules.maxPoints) return 'trainingUnavailable'
        viewer.vitamins -= quantity
        row.points += quantity
      } else if (operation === 'save') {
        const stats = decodeAllocation(stat)
        if (!stats || !validTraining({ points: row.points, stats })) return 'trainingUnavailable'
        row.stats = stats
      } else if (operation === 'reset') row.stats = {}
      else if (operation === 'plus' && trainingRules.stats.includes(stat) && row.points > spent && (row.stats[stat] ?? 0) < trainingRules.maxPerStat) row.stats[stat] = (row.stats[stat] ?? 0) + 1
      else if (operation === 'minus' && trainingRules.stats.includes(stat) && row.stats[stat] > 0) row.stats[stat]--
      else return 'trainingUnavailable'
      ;(viewer.training ??= {})[key] = row
      return 'trainingUpdated'
    },
    battleTraining: (viewer, pokemon, id) => normalizeTraining(viewer.training?.[trainingKey(id)], familyDnaCount(viewer.dnaBoosters, dnaKeys(viewer, pokemon))).stats,
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
    spawnRaidPrize(name, viewerIds) { spawn(name, viewerIds) },
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
    chat(id, message, displayName, channel = 'local') {
      const result = chat(id, message, displayName, channel)
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
    encounterSpecies: name => byName.get(name)?.id,
    encounterDifficulty: (name, language) => catchDifficulty(byName.get(name)?.id, encounter?.name === name ? encounter.legendary : specialRarities.has(rarityOf(byName.get(name))), language, catchOverrides?.species[byName.get(name)?.id]?.rate),
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
        target.shinyFamilies = [...new Set([...(target.shinyFamilies ?? []), ...(source.shinyFamilies ?? [])])]
        for (const root of target.shinyFamilies) syncShinyUnlocks(target, root)
        target.vitamins = Math.max(target.vitamins ?? 0, source.vitamins ?? 0)
        target.training = { ...source.training, ...target.training }
        target.shinyDust = Math.max(target.shinyDust ?? 0, source.shinyDust ?? 0)
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
        if (source.caughtEncounter === encounter?.id) target.caughtEncounter = source.caughtEncounter
        if (source.active && target.active) onSummonChange({ event: 'linkedSummonsMerged', layers: [source.active.layer, target.active.layer] })
        if (!target.active || source.active && source.active.layer < target.active.layer) target.active = source.active
      }
      viewers.delete(kickId)
      return true
    },
    snapshot() {
      tick()
      const visibleEncounter = encounter && now() < encounter.endsAt ? encounter : null
      return structuredClone({ config, encounter: visibleEncounter, nextAt: wildPaused || (!config.wildEnabled && !nextLegendary) ? null : nextAt, nextLegendary, notice, recentCaptures,
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
        config, catchOverrides, rarityOverrides,
        statistics: statistics(),
        nextLegendary,
        trackerAt,
        erasedViewers: [...erasedViewers],
        viewerGenerations: Object.fromEntries(viewerGenerations),
        shopReceipts: Object.fromEntries(shopReceipts),
        viewers: Object.fromEntries([...viewers].map(([id, { balls, collection, displayName, metrics, heldItems, rareCandies, legendaryTrackers, shinyDust, shinyFamilies, vitamins, training, pokeDollars, dnaBoosters, log, dexAcquired }]) =>
          [id, { balls, collection, displayName, metrics, heldItems, rareCandies, legendaryTrackers, shinyDust, shinyFamilies, vitamins, training, pokeDollars, dnaBoosters, log, dexAcquired }]))
      }
    },
    recordBattle(participants, winner, speciesKey, performances = []) {
      const fighters = new Set(participants)
      if (fighters.size < 2) return 0
      for (const actor of performances) {
        if (!fighters.has(actor.viewerId)) continue
        const viewer = viewers.get(actor.viewerId)
        if (!viewer || !Object.hasOwn(viewer.collection, actor.speciesKey)) continue
        const score = Math.min(100, (actor.damageFraction ?? 0) * 100 + (actor.knockouts ?? 0) * 35)
        if (score <= 0) continue
        const xp = viewer.collection[actor.speciesKey]
        const rank = level(xp)
        if (rank < maxLevel) shareFamily(viewer, actor.speciesKey, Math.min(maxXp, xp + (xpAtLevel(rank + 1) - xpAtLevel(rank)) * score * .0012))
        const bonus = Math.round(config.battleMoneyPerWin * score / 200)
        if (bonus) viewer.pokeDollars = (viewer.pokeDollars ?? 0) + bonus
      }
      if (!winner || !fighters.has(winner)) return 0
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
      const { interval, duration, catchGraceSeconds = config.catchGraceSeconds, legendaryChancePercent = config.legendaryChancePercent, shiny, nameLimit = config.nameLimit, visibleLimit = config.visibleLimit, spriteScale = config.spriteScale } = values
      if (!Number.isInteger(interval) || interval < 6 || interval > 1440 ||
          !Number.isInteger(duration) || duration < 1 || duration > interval ||
          !Number.isFinite(legendaryChancePercent) || legendaryChancePercent < 0 || legendaryChancePercent > 100 ||
          !Number.isInteger(catchGraceSeconds) || catchGraceSeconds < 0 || catchGraceSeconds > 120 ||
          !Number.isInteger(shiny) || shiny < 1 || shiny > 100000 ||
          !Number.isInteger(nameLimit) || nameLimit < 0 || nameLimit > 250 ||
          !Number.isInteger(visibleLimit) || visibleLimit < 1 || visibleLimit > 250 ||
          !Number.isInteger(spriteScale) || spriteScale < 50 || spriteScale > 300 ||
          !Number.isInteger(summonMoneyPerMinute) || summonMoneyPerMinute < 0 || summonMoneyPerMinute > 100_000 ||
          !Number.isFinite(summonXpPerSecond) || summonXpPerSecond < 0 || summonXpPerSecond > 100 ||
          !Number.isSafeInteger(battleMoneyPerWin) || battleMoneyPerWin < 0 || battleMoneyPerWin > 1_000_000 ||
          !Number.isFinite(battleXpPercentPerWin) || battleXpPercentPerWin < 0 || battleXpPercentPerWin > 100 ||
          !Number.isSafeInteger(battleEveryEncounters) || battleEveryEncounters < 0 || battleEveryEncounters > 100 ||
          ![0, 1].includes(battleEnabled) || ![1, 1.5, 2].includes(battleHpMultiplier)) throw new Error('Invalid configuration')
      for (const [name, min, max, whole] of [['raidSizePercent', 100, 600, true], ['raidHpMultiplier', 1, 50, false], ['raidViewerHpPercent', 0, 100, false], ['raidStatMultiplier', .1, 5, false], ]) {
        const value = values[name] ?? config[name]
        if (!Number.isFinite(value) || value < min || value > max || (whole && !Number.isInteger(value))) throw new Error('Invalid boss configuration')
      }
      Object.assign(config, { interval, duration, catchGraceSeconds, legendaryChancePercent, shiny, nameLimit, visibleLimit, spriteScale })
      if (Number.isFinite(values.raidChance) && values.raidChance >= 0 && values.raidChance <= 100) config.raidChance = values.raidChance
      for (const name of ['raidSizePercent', 'raidHpMultiplier', 'raidViewerHpPercent', 'raidStatMultiplier']) if (values[name] !== undefined) config[name] = values[name]
      if (['highest', 'average'].includes(values.raidLevelMode)) config.raidLevelMode = values.raidLevelMode
      if (Number.isInteger(values.raidDuration) && values.raidDuration >= 30 && values.raidDuration <= 600) config.raidDuration = values.raidDuration
      for (const name of ['showPokemonName', 'showViewerName', 'raidCatch', 'wildEnabled', 'raidEnabled']) if (typeof values[name] === 'boolean') config[name] = values[name]
      Object.assign(config, { summonMoneyPerMinute, summonXpPerSecond, battleXpPercentPerWin, battleMoneyPerWin, battleEveryEncounters, battleEnabled, battleHpMultiplier })
      if (Object.hasOwn(values, 'summonXpPerSecond')) config.summonXpTuned = true
      nextAt = Math.max(trackerAt ?? now() + interval * 60_000, encounter?.catchUntil ?? 0)
    }
  }
}
