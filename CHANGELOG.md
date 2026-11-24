# Changelog

## 1.1.1

- Restore chat replies and encounter announcements without requiring a separate bot account. Twitch can still use a linked bot account. Kick falls back to the channel account only when its bot message is rejected.
- Add test buttons in the Bot tab to confirm delivery and sender identity.
- Active companions earn 50 Pokédollars per minute and continue gaining XP without chat activity.

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
