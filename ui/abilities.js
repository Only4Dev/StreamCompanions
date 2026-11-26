const indexedTypes = types => Object.fromEntries(types.split(' ').map((type, index) => [type, index + 1]))

export const battleFormAssets = {
  493: indexedTypes('bug dark dragon electric fighting fire flying ghost grass ground ice poison psychic rock steel water fairy'),
  649: { water: 1, electric: 2, fire: 3, ice: 4 },
  773: indexedTypes('fighting flying poison ground rock bug ghost steel fire water grass electric psychic ice dragon dark fairy'),
  888: { crowned: 1 },
  889: { crowned: 1 },
  351: { sun: 1, rain: 2, hail: 3 },
  421: { sunshine: 1 },
  555: { zen: 1 },
  648: { pirouette: 1 },
  658: { ash: 1 },
  681: { blade: 1 },
  718: { complete: 2 },
  746: { school: 1 },
  774: { core: 1 },
  778: { busted: 1 },
  845: { gulping: 1, gorging: 2 },
  875: { noice: 1 },
  877: { hangry: 1 },
  964: { hero: 1 },
  1024: { terastal: 1, stellar: 2 }
}

export const battleFormFallbacks = {
  658: { ash: 10117 }, 774: { core: 10136 },
  845: { gulping: 10182, gorging: 10183 }, 1024: { terastal: 10276, stellar: 10277 }
}

const pickupSpecies = new Set([19, 20, 52, 53, 161, 162, 190, 216, 231, 263, 264, 417, 424, 446, 506, 659, 660, 702, 710, 711, 731, 732, 733, 819, 820, 924, 925])
const poisonHealSpecies = new Set([285, 286, 472])

const assignments = {
  'strong-jaw': [158, 159, 160, 318, 319, 696, 697, 734, 735, 835, 836],
  'parental-bond': [115], 'skill-link': [90, 91, 190, 424, 572, 573, 731, 732, 733],
  'flash-fire': [37, 38, 58, 59, 77, 78, 136, 228, 229, 607, 608, 609, 631],
  torrent: [7, 8, 9, 158, 159, 160, 258, 259, 260, 393, 394, 395, 501, 502, 503, 656, 657, 658, 728, 729, 730, 816, 817, 818, 912, 913, 914],
  blaze: [4, 5, 6, 155, 156, 157, 255, 256, 257, 390, 391, 392, 498, 499, 500, 653, 654, 655, 725, 726, 727, 813, 814, 815, 909, 910, 911],
  overgrow: [1, 2, 3, 152, 153, 154, 252, 253, 254, 387, 388, 389, 495, 496, 497, 650, 651, 652, 722, 723, 724, 810, 811, 812, 906, 907, 908],
  swarm: [12, 15, 123, 165, 166, 167, 168, 212, 214, 267, 313, 314, 402, 545],
  chlorophyll: [43, 44, 45, 69, 70, 71, 102, 103, 114, 182, 187, 188, 189, 191, 192, 273, 274, 275],
  'swift-swim': [54, 55, 118, 119, 129, 138, 139, 140, 141, 170, 171, 226, 230, 270, 271, 272, 349, 369],
  'sand-rush': [27, 28, 506, 507, 508, 529, 530, 880, 882],
  'slush-rush': [613, 614, 740, 875, 974, 975],
  'sand-veil': [50, 51, 74, 75, 76, 104, 105, 207, 246, 247, 331, 332, 443, 444, 445],
  'snow-cloak': [220, 221, 361, 471, 473, 478, 584],
  'grass-pelt': [672, 673], 'surge-surfer': [26, 1008],
  'solar-power': [6, 192, 357, 694, 695],
  guts: [19, 20, 56, 57, 66, 67, 68, 136, 217, 246, 277, 296, 297, 403, 404, 405, 532, 533, 534, 550, 862, 901, 903],
  'thick-fat': [87, 143, 183, 184, 241, 296, 297, 326, 363, 364, 365, 432, 446, 499, 500],
  technician: [52, 53, 123, 212, 235, 237, 286, 439, 572, 573, 849, 853],
  'water-absorb': [60, 61, 62, 134, 186, 194, 195, 226, 331, 332, 458, 535, 536, 537, 592, 593, 980],
  'volt-absorb': [135, 170, 171, 312, 417, 642, 807, 880],
  filter: [122, 439, 306, 757, 768], 'super-luck': [198, 359, 430, 519, 520, 521],
  'huge-power': [183, 184, 298, 659, 660], 'marvel-scale': [147, 148, 350]
}

const battleAbilities = new Map()
for (const [ability, species] of Object.entries(assignments)) {
  for (const id of species) {
    if (!battleAbilities.has(id)) battleAbilities.set(id, [])
    battleAbilities.get(id).push(ability)
  }
}

export const abilitiesFor = id => battleAbilities.get(id) ?? []

export const hasPickup = id => pickupSpecies.has(id)
export const hasPoisonHeal = id => poisonHealSpecies.has(id)
