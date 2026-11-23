# Releases and updates

**English** · [Español](RELEASING.es.md)

## Prepare a release

1. Confirm the license for the project's own code and review the third-party assets allowed in the binary. The imported `pmd/` catalog, reference sheets in `ATTACKMOVESSPRITES/`, and local `dist/` builds are excluded from Git. [SpriteCollab license](https://github.com/PMDCollab/SpriteCollab/blob/master/LICENSE.md) · [PokéAPI sprites](https://github.com/PokeAPI/sprites)
2. Update the version in `package.json` and `package-lock.json`, add its changes to [CHANGELOG.md](CHANGELOG.md), run `npm test`, and import sprites with `npm run import:pmd` before building with `npm run dist:folder`. The Windows build includes the catalog and its credits. To package the lossless catalog, run `python scripts/optimize-pmd.py` and set `SC_LOSSLESS_ASSETS=1` before building.
3. Inspect the output for local profiles, databases, or credentials. Test on Windows with a fresh profile and an existing one. Check that the app preserves the OBS URLs and settings. [Pilot checklist in Spanish](README.es.md#checklist-del-piloto)
4. Tag the Windows build's source as `vX.Y.Z` and attach the portable Windows x64 ZIP to the GitHub release. GitHub provides its own source ZIP and tarball for the tag. [GitHub Releases documentation](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

GitHub Actions runs the test suite on Windows with Node.js 24. [CI runs](https://github.com/Only4Dev/StreamCompanions/actions)

## Run your own portal

Copy `cloud/wrangler.example.jsonc` to `cloud/wrangler.jsonc` and set your Worker name and D1 binding. Test database migrations against a test database first. Configure the Worker secrets `TWITCH_WEB_CLIENT_ID`, `TWITCH_WEB_CLIENT_SECRET`, `KICK_WEB_CLIENT_ID`, `KICK_WEB_CLIENT_SECRET`, and `KICK_TOKEN_KEY`. Register the HTTPS callbacks `/auth/twitch/callback` and `/auth/kick/callback`, and the Kick webhook `/webhooks/kick`. Configure the desktop build to use your portal and Twitch Client ID.

## Update policy

**About → Check for updates** compares the installed version with the latest stable GitHub release. Users open the Releases page to download a newer build.

Incremental updates are planned. The app will verify a signed manifest and the hashes of the files it downloads. It will stage changes in a temporary folder and keep a rollback copy. Update packages will leave the Electron profile, SQLite, user settings, credentials, imported assets, and OBS URLs untouched.
