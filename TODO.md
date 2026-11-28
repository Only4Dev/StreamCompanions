# Battle and companion backlog

## Ready for testing in the live setup

- [ ] Verify light-blue summon XP in the actual Streamlabs source. The canvas regression test passes.
- [ ] Check the transformation visuals in the battle source. Ditto copies the strongest rival at the start based on the total of its combat stats, keeps its HP, and gets up to five PP per copied move. Zorua and Zoroark use Ambush. Palafin changes after ten seconds. Mimikyu and Eiscue block five qualifying hits.
- [ ] Verify the community wallet updates for Pay Day (50) and Make It Rain (100), once per completed use. Dragon Darts fires twice. Check the configurable XP reward and the held-item effects in a community match.
- [ ] Verify a custom WAV or MP3 in the desktop, Streamlabs and a signed-in portal with shiny sounds enabled.

## Implemented

- [x] Configurable XP percentage awarded once per contested victory. Existing settings start at 25%.
- [x] More than 20 passives, including Pickup, Poison Heal, Strong Jaw, Parental Bond, Skill Link, Flash Fire and Torrent.
- [x] Battle forms for Castform, Cherrim, Darmanitan, Meloetta, Greninja, Aegislash, Zygarde, Wishiwashi, Minior, Mimikyu, Cramorant, Eiscue, Morpeko, Palafin and Terapagos. All these forms have normal and shiny art using PMD animations or fallback stills.
- [x] Import all equipment forms for Arceus, Silvally, Genesect, Zacian and Zamazenta. Arceus and Silvally use existing typed held items. Genesect uses Drives. Zacian and Zamazenta use the Rusted Sword and Rusted Shield.
- [x] Toxic Orb, Quick Claw, Damp Rock, Heat Rock, Grip Claw, Wise Glasses, Shell Bell, Leppa Berry and Leftovers.
- [x] Configure, preview and reset the shiny cue in the app. Add per-viewer audio opt-in to the portal.

## Portal and balance testing for the next release

1. Play on the web in Spanish. Check accents, Twitch/Kick tabs, the current wild portrait, and the controls while the stream is offline and the desktop app stays connected.
2. Check the shop and inventory on desktop and mobile. Verify effects with hover and tap, the larger Poké Egg, and the wallet after purchases.
3. Edit `ui/egg-pool.json` to move a species between tiers or adjust percentages. The five tier percentages must sum to 100. Edit `ui/pokemon-abilities.json` to change a species' assigned ability IDs. Edit `ui/learnsets.json` to adjust level requirements and signature moves. Run the tests, rebuild the desktop app and deploy the matching Worker with migrations 0026 and 0027 before testing together.

## Deferred

- [ ] Dondozo and Tatsugiri team interaction, per request.
- [ ] Regional, cosmetic, externally selected and fusion forms require collection and loadout rules. Mega Evolution and Gigantamax require separate activation mechanics.
