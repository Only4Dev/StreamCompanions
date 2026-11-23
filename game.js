import { normalizeCommand } from './commands.js'
import { evolutionChildren, evolutionParent, familyDnaCount, familyRoot, maxDnaBoosters, nextEvolutionLevel } from './ui/evolution.js'
import { defaultSummonXpPerSecond, level, maxLevel, maxXp, xpAtLevel } from './ui/levels.js'
import { captureRates } from './ui/capture-rates.js'
import { heldItems } from './ui/held-items.js'
import { normalizeShopPrices, shopItems, validShopPrice } from './ui/shop.js'

export const creatures = ['Brasa', 'Musgo', 'Gota']

export function catchChance(ball, id, legendary = false) {
  if (ball === 'master') return 1
  if (legendary) return { normal: .03, great: .06, ultra: .12 }[ball]
  const base = .30 + .25 * ((captureRates[id - 1] ?? 255) / 255)
  return base + { normal: 0, great: .15, ultra: .30 }[ball]
}

export function createGame({ now = Date.now, random = Math.random, progress, catalog = creatures.map(name => ({ name, shiny: true })) } = {}) {
  const species = catalog.map(item => item.name)
  const shinySpecies = new Set(catalog.filter(item => item.shiny).map(item => item.name))
  const byName = new Map(catalog.map(item => [item.name, item]))
  const byId = new Map(catalog.filter(item => item.id).map(item => [item.id, item]))
  const legendarySpecies = catalog.filter(item => item.legendary && !evolutionParent(item.id)).map(item => item.name)
  const wildSpecies = catalog.filter(item => !item.legendary && !evolutionParent(item.id)).map(item => item.name)
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
  const config = { interval: 30, duration: 3, catchGraceSeconds: 10, shiny: 128, nameLimit: 50, visibleLimit: 100, spriteScale: 100, duplicateMode: 1, duplicateXpPercent: 25, ...savedConfig }
  if (!savedConfig.summonXpTuned && config.summonXpPerSecond === 1) config.summonXpPerSecond = defaultSummonXpPerSecond
  config.summonXpPerSecond ??= defaultSummonXpPerSecond
  config.battleXpPerOpponent ??= 120
  config.battleEveryEncounters ??= 5
  config.battleEnabled ??= 0
  config.battleHpMultiplier ??= 1
  config.shopPrices = normalizeShopPrices(config.shopPrices ?? {}) ?? normalizeShopPrices({})
  let encounter = null
  let encounterCount = 0
  let savedEncounters = progress?.statistics?.encounters ?? 0
  let savedCaptures = progress?.statistics?.captures ?? 0
  let encounterBaseline = 0
  let captureBaseline = 0
  const statistics = () => ({ encounters: savedEncounters + encounterCount - encounterBaseline,
    captures: savedCaptures + captureSequence - captureBaseline })
  let nextLegendary = legendarySpecies.includes(progress?.nextLegendary) ? progress.nextLegendary : undefined
  let nextAt = now() + config.interval * 60_000
  let notice = ''

  const families = new Map()
  for (const item of byId.values()) {
    const root = familyRoot(item.id)
    if (!families.has(root)) families.set(root, [])
    families.get(root).push(item)
  }

  function shareFamily(viewer, key, xp) {
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
    for (const member of members) if (unlocked.has(member.id)) viewer.collection[member.name + suffix] = xp
  }

  function familyXp(viewer, key) {
    const item = byName.get(key.replace(/ ✦$/, ''))
    if (!item?.id) return viewer.collection[key] ?? 0
    const suffix = key.endsWith(' ✦') ? ' ✦' : ''
    return Math.max(0, ...families.get(familyRoot(item.id)).map(member => viewer.collection[member.name + suffix] ?? 0))
  }

  function dnaKeys(viewer, key) {
    const suffix = key.endsWith(' ✦') ? ' ✦' : ''
    const id = byName.get(key.replace(/ ✦$/, ''))?.id
    if (!id) return [key]
    return families.get(familyRoot(id)).map(member => member.name + suffix)
      .filter(name => Object.hasOwn(viewer.collection, name)).sort()
  }

  for (const viewer of viewers.values()) {
    for (const key of Object.keys(viewer.collection)) shareFamily(viewer, key, familyXp(viewer, key))
  }

  function spawn(name) {
    const entry = byName.get(name)
    if (!entry || evolutionParent(entry.id)) throw new Error('Invalid wild creature')
    const time = now()
    const legendary = Boolean(byName.get(name)?.legendary)
    const endsAt = time + (legendary ? 5 : config.duration) * 60_000
    const catchUntil = endsAt + config.catchGraceSeconds * 1000
    encounter = { id: time + ':' + ++encounterCount, name, level: 1, legendary,
      shiny: shinySpecies.has(name) && random() < 1 / config.shiny, endsAt, catchUntil }
    nextAt = Math.max(time + config.interval * 60_000, catchUntil)
    for (const viewer of viewers.values()) viewer.caughtChannels = new Set()
  }

  function tick() {
    if (config.running === false) return
    const time = now()
    if (encounter?.catchUntil <= time) encounter = null
    if (!encounter && nextAt <= time) {
      if (nextLegendary) {
        spawn(nextLegendary)
        nextLegendary = undefined
      } else {
        const pool = legendarySpecies.length && random() < .0001 ? legendarySpecies : wildSpecies
        if (pool.length) spawn(pool[Math.floor(random() * pool.length)])
      }
    }
    for (const [id, viewer] of viewers) {
      const active = viewer.active
      if (!active) continue
      const until = Math.min(time, active.expires)
      const seconds = Math.max(0, until - active.last) / 1000
      const xp = viewer.collection[active.key] ?? 0
      if (seconds && config.summonXpPerSecond && xp < maxXp) shareFamily(viewer, active.key,
        Math.min(maxXp, xp + seconds * config.summonXpPerSecond))
      const before = Math.floor(viewer.metrics.summonSeconds / 60)
      viewer.metrics.summonSeconds += seconds
      const after = Math.floor(viewer.metrics.summonSeconds / 60)
      for (let minute = before; minute < after; minute++) {
        const candy = random() < .05
        const money = random() < .1 ? 1 + Math.floor(random() * 100) : 0
        if (candy) viewer.rareCandies = (viewer.rareCandies ?? 0) + 1
        if (money) viewer.pokeDollars = (viewer.pokeDollars ?? 0) + money
        if (candy || money) active.pickup = { at: until, candy, money }
        if (random() < .002) grantHeldItem(viewer)
      }
      active.last = until
      if (time >= active.expires) viewer.active = null
    }
  }

  function chat(id, raw, displayName, channel) {
    if (erasedViewers.has(id)) return ''
    if (config.running === false) return ''
    tick()
    const message = normalizeCommand(raw).toLowerCase()
    const viewer = viewers.get(id)
    if (message === '!poke join') {
      if (viewer) return 'alreadyJoined'
      viewers.set(id, { displayName, balls: { normal: 5, great: 0, ultra: 0, master: 0 },
        collection: {}, metrics: initialMetrics(), active: null })
      return 'joined'
    }
    if (viewer && displayName) viewer.displayName = displayName
    if (!viewer) return 'joinFirst'
    if (message === '!summon out') {
      if (viewer.active && viewer.active.channel !== channel) return 'summonOtherChannel'
      viewer.active = null
      return 'removed'
    }
    const [command, ...parts] = message.split(/\s+/)
    const argument = parts.join(' ')
    if (command === '!candy') {
      const key = Object.keys(viewer.collection).find(name => name.toLowerCase() === argument)
      if (!key) return 'missingCreature'
      const rank = level(viewer.collection[key])
      if (rank >= maxLevel) return 'candyMaxLevel'
      if (!viewer.rareCandies) return 'noCandy'
      viewer.rareCandies--
      shareFamily(viewer, key, xpAtLevel(rank + 1))
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
      if (ball !== 'master' && random() >= catchChance(ball, byName.get(encounter.name)?.id, encounter.legendary)) return 'escaped'
      viewer.caughtChannels ??= new Set()
      viewer.caughtChannels.add(channel)
      recentCaptures.push({ id: ++captureSequence, encounterId: encounter.id, viewer: viewer.displayName || id,
        pokemon: key, at: now() })
      if (recentCaptures.length > 12) recentCaptures.shift()
      if (!owned) {
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
      if (viewer.active && viewer.active.channel !== channel) return 'summonOtherChannel'
      const name = species.find(item => item.toLowerCase() === argument)
      if (!name) return 'missingCreature'
      const key = name + (command === '!summonshiny' ? ' ✦' : '')
      if (!Object.hasOwn(viewer.collection, key)) return 'missingCreature'
      viewer.active = { key, channel, expires: now() + 600_000, last: now(), layer: ++layer }
      return 'summoned'
    }
    if (!message.startsWith('!') && message && viewer.active?.channel === channel &&
      message !== viewer.lastMessage && now() - (viewer.lastActivity ?? -Infinity) >= 10_000) {
      viewer.active.expires = now() + 600_000
      viewer.lastActivity = now()
      viewer.lastMessage = message
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
    setShopPrices(values) {
      const prices = normalizeShopPrices(values)
      if (!prices) throw new Error('Invalid shop prices')
      config.shopPrices = prices
    },
    fulfillOrder({ id, viewerId, item, price, speciesKey }) {
      if (shopReceipts.has(id)) return shopReceipts.get(id)
      const product = Object.hasOwn(shopItems, item) ? shopItems[item] : null
      const viewer = viewers.get(viewerId)
      let result = 'unavailable'
      const charge = price ?? product?.price
      if (viewer && product && validShopPrice(charge) && (!product.dna || Object.hasOwn(viewer.collection, speciesKey ?? ''))) {
        const keys = product.dna ? dnaKeys(viewer, speciesKey) : []
        const dna = familyDnaCount(viewer.dnaBoosters, keys)
        if (product.held && viewer.heldItems?.includes(item)) result = 'owned'
        else if (product.dna && dna >= maxDnaBoosters) result = 'maxed'
        else if ((viewer.pokeDollars ?? 0) < charge) result = 'funds'
        else {
          viewer.pokeDollars -= charge
          if (product.ball) viewer.balls[product.ball] = (viewer.balls[product.ball] ?? 0) + 1
          else if (product.dna) {
            viewer.dnaBoosters ??= {}
            for (const key of keys) delete viewer.dnaBoosters[key]
            viewer.dnaBoosters[keys[0]] = dna + 1
          }
          else (viewer.heldItems ??= []).push(item)
          result = 'purchased'
        }
      }
      shopReceipts.set(id, result)
      return result
    },
    dnaCount: (viewer, key) => familyDnaCount(viewer.dnaBoosters, dnaKeys(viewer, key)),
    acknowledgeOrders(ids) {
      for (const id of ids) shopReceipts.delete(id)
    },
    encounterCount: () => encounterCount,
    clearStatistics() {
      savedEncounters = 0
      savedCaptures = 0
      encounterBaseline = encounterCount
      captureBaseline = captureSequence
    },
    queueLegendary(name) {
      if (!legendarySpecies.includes(name)) throw new Error('Invalid legendary')
      nextLegendary = name
    },
    grantDemoMasterBall(id) {
      const viewer = viewers.get(id)
      if (!viewer) return false
      viewer.balls.master++
      return true
    },
    hasEncounter: () => Boolean(encounter),
    spawn,
    setRunning(running) {
      if ((config.running !== false) === running) return
      tick()
      config.running = running
      notice = ''
      if (running) nextAt = now() + config.interval * 60_000
      else {
        encounter = null
        recentCaptures.length = 0
        for (const viewer of viewers.values()) viewer.active = null
      }
    },
    schedule() {
      tick()
      return nextAt
    },
    chat(id, message, displayName, channel = 'local') {
      const result = chat(id, message, displayName, channel)
      notice = result
      return result
    },
    latestCapture: () => recentCaptures.at(-1),
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
        for (const name of Object.keys(target.collection)) shareFamily(target, name, familyXp(target, name))
        for (const key of Object.keys(target.balls)) target.balls[key] = Math.max(target.balls[key], source.balls[key] ?? 0)
        for (const key of Object.keys(target.metrics)) target.metrics[key] = Math.max(target.metrics[key], source.metrics[key] ?? 0)
        target.heldItems = [...new Set([...(target.heldItems ?? []), ...(source.heldItems ?? [])])]
        target.rareCandies = Math.max(target.rareCandies ?? 0, source.rareCandies ?? 0)
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
        if (!target.active || source.active && source.active.layer < target.active.layer) target.active = source.active
      }
      viewers.delete(kickId)
    },
    snapshot() {
      tick()
      const visibleEncounter = encounter && now() < encounter.endsAt ? encounter : null
      return structuredClone({ config, encounter: visibleEncounter, nextAt, nextLegendary, notice, recentCaptures,
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
        erasedViewers: [...erasedViewers],
        viewerGenerations: Object.fromEntries(viewerGenerations),
        shopReceipts: Object.fromEntries(shopReceipts),
        viewers: Object.fromEntries([...viewers].map(([id, { balls, collection, displayName, metrics, heldItems, rareCandies, pokeDollars, dnaBoosters }]) =>
          [id, { balls, collection, displayName, metrics, heldItems, rareCandies, pokeDollars, dnaBoosters }]))
      }
    },
    recordBattle(participants, winner, speciesKey) {
      if (!winner || !participants.includes(winner)) return
      for (const id of new Set(participants)) {
        const metrics = viewers.get(id)?.metrics
        if (metrics) metrics[id === winner ? 'wins' : 'losses']++
      }
      const viewer = viewers.get(winner)
      if (viewer && speciesKey && Object.hasOwn(viewer.collection, speciesKey)) {
        const reward = (new Set(participants).size - 1) * config.battleXpPerOpponent
        if (viewer.collection[speciesKey] < maxXp) shareFamily(viewer, speciesKey, Math.min(maxXp, viewer.collection[speciesKey] + reward))
        if (new Set(participants).size > 1) grantHeldItem(viewer)
      }
    },
    configure(values) {
      const { summonXpPerSecond = config.summonXpPerSecond, battleXpPerOpponent = config.battleXpPerOpponent } = values
      const { battleEveryEncounters = config.battleEveryEncounters } = values
      const { battleEnabled = config.battleEnabled, battleHpMultiplier = config.battleHpMultiplier } = values
      const { interval, duration, catchGraceSeconds = config.catchGraceSeconds, shiny, nameLimit = config.nameLimit, visibleLimit = config.visibleLimit, spriteScale = config.spriteScale, duplicateMode = config.duplicateMode, duplicateXpPercent = config.duplicateXpPercent } = values
      if (!Number.isInteger(interval) || interval < 6 || interval > 1440 ||
          !Number.isInteger(duration) || duration < 1 || duration > interval ||
          !Number.isInteger(catchGraceSeconds) || catchGraceSeconds < 0 || catchGraceSeconds > 120 ||
          !Number.isInteger(shiny) || shiny < 1 || shiny > 100000 ||
          !Number.isInteger(nameLimit) || nameLimit < 0 || nameLimit > 250 ||
          !Number.isInteger(visibleLimit) || visibleLimit < 1 || visibleLimit > 250 ||
          !Number.isInteger(spriteScale) || spriteScale < 50 || spriteScale > 300 ||
          ![0, 1, 2].includes(duplicateMode) ||
          !Number.isInteger(duplicateXpPercent) || duplicateXpPercent < 1 || duplicateXpPercent > 100 ||
          !Number.isFinite(summonXpPerSecond) || summonXpPerSecond < 0 || summonXpPerSecond > 100 ||
          !Number.isSafeInteger(battleXpPerOpponent) || battleXpPerOpponent < 0 || battleXpPerOpponent > 10000 ||
          !Number.isSafeInteger(battleEveryEncounters) || battleEveryEncounters < 0 || battleEveryEncounters > 100 ||
          ![0, 1].includes(battleEnabled) || ![1, 1.5, 2].includes(battleHpMultiplier)) throw new Error('Invalid configuration')
      Object.assign(config, { interval, duration, catchGraceSeconds, shiny, nameLimit, visibleLimit, spriteScale, duplicateMode, duplicateXpPercent })
      Object.assign(config, { summonXpPerSecond, battleXpPerOpponent, battleEveryEncounters, battleEnabled, battleHpMultiplier })
      if (Object.hasOwn(values, 'summonXpPerSecond')) config.summonXpTuned = true
      nextAt = Math.max(now() + interval * 60_000, encounter?.catchUntil ?? 0)
    }
  }
}
