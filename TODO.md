# Battle and companion backlog

## Ready for testing in the live setup

- [ ] Verify light-blue summon XP in the actual Streamlabs source. The canvas regression test passes.
- [ ] Check the transformation visuals in the battle source. The local preview opens with Ditto, Minior and Charizard. Ditto copies the nearest eligible rival at the start, retains its identity and HP, and gets up to five PP per copied move. Zorua and Zoroark keep their own kit and lose the disguise on direct damage.
- [ ] Verify the community wallet updates for Pay Day (50) and Make It Rain (100), once per completed use. Dragon Darts fires twice. Check the configurable XP reward and the held-item effects in a community match.
- [ ] Verify a custom WAV or MP3 in the desktop, Streamlabs and a signed-in portal with shiny sounds enabled.

## Implemented

- [x] Configurable XP percentage awarded once per contested victory. Existing settings start at 25%.
- [x] More than 20 passives, including Pickup, Poison Heal, Strong Jaw, Parental Bond, Skill Link, Flash Fire and Torrent.
- [x] Battle forms for Castform, Cherrim, Darmanitan, Meloetta, Greninja, Aegislash, Zygarde, Wishiwashi, Minior, Mimikyu, Cramorant, Eiscue, Morpeko, Palafin and Terapagos. All these forms have normal and shiny art using PMD animations or fallback stills.
- [x] Import all equipment forms for Arceus, Silvally, Genesect, Zacian and Zamazenta. Arceus and Silvally use existing typed held items. Genesect uses Drives. Zacian and Zamazenta use the Rusted Sword and Rusted Shield.
- [x] Toxic Orb, Quick Claw, Damp Rock, Heat Rock, Grip Claw, Wise Glasses, Shell Bell, Leppa Berry and Leftovers.
- [x] Configure, preview and reset the shiny cue in the app. Add per-viewer audio opt-in to the portal.

## Deferred

- [ ] Dondozo and Tatsugiri team interaction, per request.
- [ ] Regional, cosmetic, externally selected and fusion forms require collection and loadout rules. Mega Evolution and Gigantamax require separate activation mechanics.
