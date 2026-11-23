# Stream Companions

**English** · [Español](README.es.md)

Stream Companions turns Twitch and Kick chat into a game of catching, collecting, and battling Pokémon. The streamer runs a portable Windows app and adds browser sources to OBS or Streamlabs. Viewers play from chat and check their progress in the web portal.

[Viewer portal](https://stream-companions.developeronly4g.workers.dev/) · [Portal source](cloud/) · [Releases](https://github.com/Only4Dev/StreamCompanions/releases) · [Changelog](CHANGELOG.md) · [Release guide](RELEASING.md)

## Streamer setup

1. Download the Windows x64 ZIP, extract it into its own folder, and open `Stream Companions.exe`.
2. In **Connections**, link Twitch or Kick to create your community. Link the second platform there any time if you stream on both.
3. Select **Start game**. In **Sources**, copy the wild encounter URL and the companion URL into separate browser sources. Set the companion source to **1920 × 1080**. It also displays battles.
4. Preview an encounter and a companion in **Sources** before testing with a viewer in chat.
5. Select **Stop game** to clear active encounters and summons while the app stays open. Close the window to exit.

### Twitch setup

Select **Connect Twitch** and approve the authorization on Twitch.

### Kick setup

Select **Connect Kick**, approve the authorization on Kick, and return to the app. The app restarts after creating a new community.

## How to play

- Use `!poke join` to join a community. **Twitch** requires a follow first. **Kick** accepts the command directly.
- Use `!catch` during a wild encounter, `!summon <name>` to summon a caught Pokémon, and `!summon out` to withdraw it. Use `!summonshiny <name>` for a shiny variant.
- Use `!web` to find the portal. Sign in with either Twitch or Kick, choose a community, and open the Dex, inventory, or shop.
- Link Twitch and Kick from **Linked accounts** to share progress across both chats in the same community. An account can have one active summon at a time.

## Local development

Use Node.js 24 or later and Git.

```powershell
npm.cmd ci
npm.cmd test
npm.cmd start
```

The app can run without the full sprite catalog in a small demo mode. To load the full catalog for local development, run `npm.cmd run import:pmd` before starting Electron. The importer saves assets and credits to `pmd/`. Git ignores that directory. [SpriteCollab source and credits](https://github.com/PMDCollab/SpriteCollab) · [SpriteCollab license](https://github.com/PMDCollab/SpriteCollab/blob/master/LICENSE.md)

Run `npm.cmd run dist:folder` to build an unsigned portable Windows x64 folder in `dist/win-unpacked/`. The standard build excludes the imported sprite catalog. Keep the executable and its accompanying files together.

To use the full catalog in the portable build, run the importer from a source checkout and copy the resulting `pmd/` folder next to `Stream Companions.exe`, then restart the app. The portable app itself includes its runtime.

## Data and accounts

SQLite stores game progress in the streamer's local Electron profile. The desktop app sends changes over HTTPS to a Cloudflare Worker backed by D1. Viewers can read their last synced progress when the desktop app is offline. The streamer's app must be online to process shop orders.

Unlinking a platform preserves progress. **Delete my data** removes the Stream Companions account, its linked identities, and game progress. Connected desktop apps delete their local copy when they receive the deletion. The service rejects old sync data if the player signs up again.

## Credits and license

Stream Companions is a noncommercial fan project by [Only4Dev](https://github.com/Only4Dev). Pokémon and its characters, trademarks, and assets belong to their respective rights holders. This project is unofficial and unaffiliated with them. The license for the project's own source code is pending. [SpriteCollab credits and license](https://github.com/PMDCollab/SpriteCollab/blob/master/LICENSE.md) · [PokéAPI sprites](https://github.com/PokeAPI/sprites)

## Known issues

The public portal runs on Cloudflare Workers Free with a D1 database. During heavy traffic, hitting the plan quotas can temporarily interrupt sign-in, portal pages, or progress sync. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) · [D1 quotas](https://developers.cloudflare.com/d1/platform/pricing/)
