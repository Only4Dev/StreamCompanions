# Battle and companion backlog

## Overlay regression

- [ ] The summon XP bar still appears yellow in the user’s setup. Reproduce it in the OBS browser source and verify that the active summon’s XP fill actually renders light blue.

## 1. Battle progression

- [x] Award XP once per completed victory as a configurable share of the current level span. Legacy settings migrate to 25%, configurable from 0% to 100%.

## 2. Passive abilities and signature moves

- [ ] Build a reusable ability pool of at least 20 passives. Start with Strong Jaw, Parental Bond, Skill Link, Flash Fire, Torrent, and Poison Heal. Cover damage, defense, movement, evasion, weather, and field effects using the battle engine’s existing mechanics.
- [x] Add Pickup to route Pokémon including Rattata, Sentret, and Furret. Active summons gain five percentage points of held-item drop chance per eligible minute.
- [ ] Add Meowth’s Pay Day, awarding 50 Pokédollars per successful move use, and Gholdengo’s Make It Rain, awarding 100. Credit the owner once per use, including for multi-target moves. Add Dragapult’s Dragon Darts with two sequential Dreepy projectiles.

## 3. Battle transformations and sprites

- [ ] Audit the full species catalog for alternate forms and separate in-battle transformations from forms chosen outside battle. Record the trigger, reversal rule, sprite and shiny availability, and any missing animations for each candidate.
- [ ] Start with Minior (Shields Down, Meteor to Core at half HP), Castform (Forecast), Cherrim (Flower Gift), Eiscue (Ice Face), Mimikyu (Disguise), Zygarde (Power Construct), and Palafin (proposed half-HP trigger because the arena has no switching). Check for other applicable species and match their abilities to the battle rules.
- [ ] Verify alternate sprites against the PMD catalog and test transformations on the same actor so there is only one sprite and the correct HP, position, and status carry over.

## 4. Held items and battle balance

- [x] Add Toxic Orb and Poison Heal. The orb attempts to inflict severe poison from two seconds into battle. Poison Heal recovers 4% max HP on poison ticks.
- [x] Add Quick Claw (18% chance to halve the delay before the next action) and Damp Rock (five additional seconds of rain).
- [ ] Add more held items with readable arena effects. Candidates include PP Up for additional uses and a healing item that improves recovery from moves. Consider field-dependent items and cooldown reductions during the balance pass.
- [ ] Test payoffs, weather effects, action delay, healing, and PP together. Check that item triggers and move payouts fire once per intended event.

## 5. Shiny audio

- [ ] Let streamers select and preview a WAV or MP3 cue, keep a default sound, and add an opt-in to play shiny cues on the web. Play the cue once per encounter in each client.
