# Changelog

## 1.1.2

- The viewer activity log shows the ball spent and the remaining count after each catch attempt.

- Streamers can link a dedicated Kick account to send chat replies and announcements from their own bot. The shared app bot remains available when no dedicated bot is linked.

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
