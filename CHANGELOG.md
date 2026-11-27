# Changelog

## 1.2.3

- Refresh stale overlay catalogs, retry failed sprite requests and use a loaded idle or walking sprite while other animations load.

## 1.2.2

- Fix a desktop startup error in the administration form that left the window blank.

## 1.2.1

- Add five hatch presentations and a 0.001% chance of a first-stage Legendary Pokémon per egg. Restrict ordinary eggs and wild encounters to first stages.
- Unlock regional evolutions from their normal predecessor when it lacks a regional form, with independent post-unlock progression.
- Share the active companion, candy use, game cooldown and encounter catches across linked Twitch and Kick identities and the web portal.

- Add 57 regional Pokédex entries across Alola, Galar, Hisui and Paldea, with independent collection keys, move pools and battle stats.
- Add a web administration console restricted to verified Twitch and Kick community owners.

- Deduplicate shop submissions and retries, show unseen Pokédex additions, and reconcile verified Twitch/Kick identities without deleting their albums.

- Recover purchases with fractional egg XP, isolate invalid receipts, expire stalled orders, and limit repeated purchases.
- Keep concurrent OAuth sign-in attempts separate and log the stage of provider failures.
- Add a local streamer administration tab for grants, wild encounters, and battles.

## 1.2.0

- Add configurable Poké Eggs with four hatch effects and the Legendary Tracker, usable from the web or with `!legendaryticket`.
- Show Rare Candy and Legendary Tracker quantities in the portal’s Consumables pocket.

- Add Ditto’s battle copy, Zorua and Zoroark’s Illusion, and equipment-driven forms for Arceus, Genesect, Silvally, Zacian, and Zamazenta.

- Add 15 battle-form species with normal and shiny sprite support, more than 20 passive abilities, and six additional held items.
- Add Pay Day and Make It Rain rewards on completed moves and two sequential Dreepy shots for Dragon Darts.
- Let streamers choose, preview, and reset a shiny encounter sound. Add optional shiny audio to Play on web.

- Add Pickup for selected route Pokémon, Poison Heal, Toxic Orb, Quick Claw, and Damp Rock.
- Award battle XP as a configurable percentage of the winner’s level span, once per victory.

- Use a light blue summon XP bar, center action feedback on phones, and let streamers set Pokédollars awarded per battle win.

- Sell Master Balls for 500,000 Pokédollars by default, with a configurable shop price.

- Keep community navigation available in Help and Live, add an All regions Pokédex filter, and organize the shop by item type.
- Let viewers replace their active companion from either platform, add inventory command aliases, and provide separate chat controls for bot messages.

- Reserve Legendary, Mythical, Ultra Beast, and Paradox Pokémon for ultra-rare encounters with a distinct overlay effect.

- Add a live portal feed for automatic bot announcements and let streamers mute those announcements in Twitch and Kick chat.

- Active summons have a 0.01% chance per completed minute to find a Master Ball. It appears in inventory and is available with `!catch master`.

- Make shop quantities visible on every connection state, add persistent portal navigation and an Unlocked Pokédex toggle, and let streamers customize catch percentages.

- Add bulk Poké Ball and DNA Booster purchases with live order, wallet, and inventory updates.
- Add Twitch and Kick players to the Live portal, with signed-in controls for catching, summoning, withdrawing, and using Rare Candy.
- Support `!poke web` and apply counted Rare Candy purchases to the active companion with `!candy` and `!caramelo`.
- Pause game actions and passive summon rewards during battles. Show XP progress outside battle and announce new evolutions.
- Balance catch rates by species difficulty and add a caught-only Pokédex filter.

## 1.1.2

- Command cooldowns are independent in Twitch and Kick. Encounter and battle announcements are sent to both live chats without waiting for either platform.

- The viewer activity log shows the ball spent and the remaining count after each catch attempt.

- Twitch and Kick send game announcements and replies as the shared @streamcompanionsbot account. The Bot tab includes a moderator command and a send test for both platforms, with clearer Kick delivery errors.

## 1.1.1

- Send chat replies and announcements through a linked Twitch bot or the Kick app bot. The broadcaster account is never used as a fallback.
- Add test buttons in the Bot tab to confirm delivery and sender identity.
- Active companions earn a configurable amount of Pokédollars per minute and continue gaining XP without chat activity.
- Enforce a five-second command cooldown. Catch replies show remaining balls and `!balls` lists the types you own.
- Queue manual battles with a one-minute countdown. An active encounter can finish before the battle, and new encounters resume on a fresh timer.
- Show purchase confirmations and failures automatically in the viewer portal.
- Fix Windows update validation when Electron represents an ASAR archive as a folder. Users on 1.1.0 need to download this corrected build once.

## 1.1.0

- Streamers can play in their own channels. Gameplay commands require the channel to be live and have a three-second cooldown per viewer.
- New viewers receive a random starter. Existing viewers with an empty collection can also claim one using `!poke join`.
- Wild encounters announce the standard Poké Ball catch chance. Streamers can set legendary encounter odds from 0% to 100%, with a default of 0.01%.
- The portal shows live channels and a personal activity log. The desktop app shows recent chat, encounter history, and separate OBS preview links.
- Kick replies use the app bot identity. Twitch replies can use a separate authorized Twitch bot account.
- Streamers can reset their own community's registrations and progress after confirming. Viewers can rejoin afterward.
- The Windows app can download and relaunch a newer release. Install 1.1.0 manually once if upgrading from 1.0.0.

## 1.0.0

First public Windows x64 release. [Downloads and setup](https://github.com/Only4Dev/StreamCompanions/releases/tag/v1.0.0)

- Create a community with Twitch or Kick, and optionally link both channels. Play through either chat. Linked accounts share progress within the same community.
- Catch wild Pokémon, collect normal and shiny variants, and summon companions. Evolution forms unlock automatically and share experience within the line.
- Add browser sources for wild encounters and companions in OBS or Streamlabs. The companion source also shows idle battle royale rounds and offers a compact 1920 × 550 layout.
- View the Pokédex and inventory, manage move sets and held items, and shop in the bilingual viewer portal.
- Buy DNA Boosters from a Pokémon's Dex card. Each evolution line shares its booster count, including normal and shiny variants.
- Run the portable app without an installer. The Windows ZIP includes the sprite catalog and credits.
- Check for stable updates at startup or from **About**. Download and install new builds from GitHub Releases.
