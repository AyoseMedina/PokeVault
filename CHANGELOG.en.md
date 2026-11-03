# Changelog

[Español](CHANGELOG.md) · [English](CHANGELOG.en.md)

These entries document changes made to this project. They are not semantic
versions and do not guarantee testing on a physical R36S.

## 2026-11-03 · Shiny and animated sprites (not deployed)

- Shiny Pokémon use their shiny sprite (bank, detail, selection and move review).
- Black/White animated sprites in the bank and detail views; the system
  "reduce motion" setting keeps static images.
- 1,947 local files from PokeAPI/sprites at a pinned commit with SHA-256 in
  `dist/sprites/SOURCES.json` (`scripts/build-sprites.mjs`); about 60 MB more in
  the Docker image. The site still loads only same-origin images (CSP).

## 2026-11-03 · Server-side bank (not deployed)

- In Docker/Node mode the whole bank lives on the `pokevault_data` volume,
  encrypted with AES-256-GCM and the required `POKEVAULT_DATA_KEY` (no key, no
  startup). Atomic writes, SHA-256 content-addressed originals, If-Match revisions
  (409 on another device's change) and 50 restorable revisions that never release
  moved versions.
- The server re-validates schema, sizes, quota, new saves with the same parser
  and the consumed ledger. The browser verifies the SHA-256 of every downloaded original.
- Explicit, verified upload of an old browser bank; the local copy is deleted only
  after confirmation. `iniciar.py` keeps IndexedDB.
- `vault-admin.mjs verify | rotate-key`, volume and key in all Compose files,
  credential generator and guides. Tested in Chromium and Docker (read-only root,
  restart and volume permissions).

## 2026-11-03 · Spanish Pokédex (not deployed)

- PokéAPI has no Spanish text for any generation I–V edition. Spanish now shows
  the official text of a later edition (Let's Go, Omega Ruby/Alpha Sapphire or
  X/Y), always named. "English" keeps the exact edition text.
- Fixed words split across lines in descriptions (e.g. "moun tains",
  "bluish- white") in every affected edition, mostly Yellow and Crystal.

## 2026-11-03 · Move phase 3 and cartridge-language correction (not deployed)

- Generated held-item mappings, II→III/III→IV conversion, evolution consumption
  and IV→V source-bag returns, with native limits, sorting, quantities and CRC.
  Mail and item-bearing III→IV→V moves are blocked.
- Destination cartridge naming: explicit GB/GBA language, verified IV/V fields,
  legacy GBA confirmation, foreign-name preservation in Emerald/FRLG and IV
  cartridge names for unnicknamed Pokémon. Ambiguous R/S revisions and foreign
  unnicknamed Gen V evolutions block pending verification; nicknames stay exact.
- Unit coverage plus Chromium custom item-evolution flow, mobile review, ZIP,
  consumption, reimport protection, backup/restore and confirmed cancellation.
- Updated bilingual guides, ZIP instructions, routes, README and primary sources.
  No site deployment.

## 2026-11-03 · Move phase 2 (not deployed)

- Route-specific trade evolutions, exact names, evolved abilities, Everstone
  protection and blocking current-level move-learning prompts.
- Destination Pokédex updates include mirrors, forms, gender and language,
  with unaffected species and existing Pokémon verified after writing.
- Reproducible tables and primary-source citations. Non-base Gen V dex forms
  are blocked pending native-code corroboration, documented in MOVE_IMPLEMENTATION.

## 2026-11-03 · Move phase 1 (not deployed)

- Verified PC removal in generations I–V, GB compaction and active boxes,
  native empty GBA/DS slots, range masks, checksums and intact DSV footers.
- Multi-save ZIP with exact filenames/extensions and before/after hashes.
  Same-save transfers and output filename collisions are blocked.
- Persistent consumed-hash ledger, reimport protection, schema-1 compatible
  backups and confirmed export cancellation recorded in history.
- 108 unit tests passed; Chromium persistence/recovery/access regressions passed.
  No physical console or emulator gameplay tests.

## 2026-11-03 · Bank protection, recovery and access

- Isolated demo from persisted data: exiting reloads the bank; demo imports and
  restores cannot replace real data, including saves with no Pokémon.
- Atomic IndexedDB v2 migration with unique SHA-256 blobs and metadata-only
  writes. Pokémon keys and revision guards are preserved. Unknown schemas
  block writes and offer raw recovery.
- Unreadable saves remain quarantined and exportable without blocking others.
  Portable .pvault v2 includes originals, backups and history; v1 remains readable.
  Languages, dates, references and combined save limits are checked before merging.
- Browser persistence requests, visible quota/usage and external-backup reminders.
  Old-version retirement requires downloading a backup and written confirmation.
- IP throttling follows CSRF/JSON checks; removed global account lockout.
  Authenticated sessions have a separate store. Startup fails if authenticated
  entry injection fails. Expiry notices preserve open tasks/downloads before navigation.
- Crystal validates its active-box mirror on import and readback. ZIP instructions
  now accurately describe custom Crystal → GBA.
- Docker base images pinned by digest, 512 MiB service limits and a warning on
  the static Nginx example. npm audit: 0 vulnerabilities.
- Passed 97 data/logic tests, 18 access tests and isolated Chromium regressions
  for demo, migration, conflicts, quota failure, backup recovery, confirmed
  retirement and logout. Mobile transfer flow checked. No physical phone or
  console verification.

## 2026-11-03 · Complete mobile interface

- Added a mobile menu with all six sections, focus handling and an inactive
  background while dialogs are open. Desktop navigation is retained.
- Enlarged touch controls and inputs; restored mobile access to renaming boxes
  and switching grid/list views. Selection supports moving Pokémon without
  dragging and keeps its actions visible while scrolling.
- Adapted sign-in, bank, saves, Pokédex, details, original boxes, reviews, backups
  and guide with readable text, wrapping tables, scrollable dialogs, reachable
  close buttons, safe areas and dynamic viewport height.
- Checked all six sections at widths from 320 to 850 pixels, landscape,
  short screens and desktop in isolated Chromium. Exercised imports, touch
  selection, boxes, notes, prevalidation, review, backup and ZIP download.
  All 89 data/logic tests and 14 access tests passed.
- Physical phones and the iOS/Android virtual keyboard were not tested.
  Save formats, validation and original save data are preserved.

## 2026-11-03 · Pokédex, Crystal → GBA and Pokémon theme

- Added a read-only per-save Pokédex with actual national seen/caught counts,
  search, filters, pagination and inconsistent-flag reporting. Uses validated
  active blocks, never infers captures from PC contents, and leaves saves and
  the `.pvault` schema unchanged.
- Bundled exact-edition descriptions in species and Pokémon details, available
  offline. The pinned source has English but no Spanish for these editions;
  language is explicit and descriptions are never substituted from another game.
- Added Ruby, Sapphire and LeafGreen, bringing support to 16 games. Crystal →
  all five GBA games is an opt-in unofficial custom conversion with documented
  v1 policy, field review and manifest details. It preserves originals and
  safeguards, generates deterministic identity, adapts DVs/training and declares
  synthetic origin metadata. It does not certify competitive legality.
- Replaced the green palette with Pokémon red, white and charcoal across the
  application, sign-in, favicon and repository banner; existing features remain.
- Passed 89 logic/data tests and 14 access tests. Isolated test Chromium verified
  login, import, Pokédex, detail, selection, prevalidation, custom review, backup,
  ZIP, reload persistence and mobile layout. Verified original bytes, ZIP CRC,
  manifest and result SHA-256 in the downloaded package.
- No personal saves or ROMs were used, and no physical console was validated.
  The user's Nginx network connection remains under their control.

## 2026-11-03 · Portainer with existing Nginx

- Added `docker-compose.yml` to build only PokéVault from Git and expose 8080
  internally, without host ports or external network definitions. The
  administrator connects the Nginx network in Portainer.
- The stack requires credentials, the public HTTPS URL and trusted proxy IP
  or subnet. Existing Nginx handles the domain and certificates.
- Removed the GitHub Actions workflow, its badges and the requirement to wait
  for remote checks before deploying. Local tests remain available.
- Updated ES/EN guides; preserved local mode and standalone Caddy as an option
  for users without a proxy. Application and bank remain intact.
- Passed 62 save tests and 14 access tests. Verified login, Secure cookies,
  protected original assets and logout behind Nginx over HTTPS using a test
  certificate; the application container publishes no host ports. The user's
  own Nginx and Portainer were neither modified nor tested.

## 2026-11-03 · Personal sign-in and local/cloud modes

- Added an Express access server, ES/EN screen, credential generator, scrypt
  hashing and expiring sessions with protected cookies.
- Protected application resources; added throttling, Origin/Host validation,
  CSRF, CSP and logout across tabs.
- Docker requires personal credentials and fails closed when missing. Local
  stays on loopback; cloud adds Caddy and automatic HTTPS certificates once a
  domain, DNS and reachable ports are configured.
- Preserved static Python mode for local development without sign-in and the
  previous Nginx config for reference. Bank data is not deleted.
- Startup-error reload uses a CSP-compatible event listener instead of inline
  code. Readers, conversions and persistence remain intact.
- Added 14 access-server tests and an HTTP Docker check. Updated setup,
  recovery and security-scope documentation in ES/EN.
- Passed 62 save tests and 14 access tests; verified login, protected assets
  and logout in local Docker and over HTTPS with Caddy and a test CA.
- Computer Use did not authorize Edge access: visual review and the full
  browser export flow remain pending. No physical console or public-domain
  certificate issuance has been tested without a configured domain.

## 2026-11-03 · Public repository and bilingual documentation

- Prepared the AyoseMedina/PokeVault presentation with an original SVG banner,
  feature descriptions, quick start, project map and ES/EN links.
- Added English translations of the overview, setup, deployment, history and
  development rules; fixture provenance and contribution guidance in both languages.
- Preserved the application, resources and test entities; added an identical
  root license copy while keeping `dist/LICENSE`.
- Configured GitHub Actions to run tests and check Docker, without automatic
  website or registry image publication.
- Documented the distinction between public source code, private website
  access and bank storage in each browser and web origin.

## 2026-11-03 · Docker and Portainer preparation

- Added a Dockerfile, Nginx configuration and Compose stack for building from
  GitHub in Portainer on Docker Standalone.
- Non-root service with a read-only filesystem, in-memory temporary files and
  an HTTP health check.
- Configurable port, bound to 127.0.0.1 by default; external authentication.
- Docker context limited to website resources and configuration; Git exclusions
  for saves, ROMs, backups, local variables and common keys.
- Documented deployment, updates and moving the bank between addresses.
- Verified local build, healthy startup and Nginx configuration with Docker
  Desktop. Checked 13 HTTP resources against their original bytes, JavaScript
  MIME type, cache policy, and blocking of private paths and POST requests.
  Deployment to the user's Portainer remains pending.

## 2026-11-03 · Downloadable package

- Exported the project with application, resources, license and tests.
- Added AGENTS.md and the changelog.
- Added EMPEZAR.md and the local iniciar.py server, restricted to 127.0.0.1.
- Adapted test output paths to `.test-output/` for execution outside the
  original environment.
- Excluded private deployment identity, credentials and generated test output.

## 2026-11-03 · Exports and conversions

- Copies between saves of the same generation I, II, III, IV or V.
- Yellow→Crystal conversion, including native catch-rate-to-item conversion
  and preservation of DVs, experience and names.
- III→IV, IV→V and chained III→IV→V conversion.
- Writes to empty GB/DS box slots, checksum updates and preservation of existing
  Pokémon, internal copies and DSV footers.
- Review-time date, conversion records and entity/file hashes in the package manifest.
- Blocks for duplicates, backward routes, the II→III gap, held items, eggs,
  HMs on forward conversions and special cases without a safe conversion.
- Preservation of name spaces and rejection of glyphs that lose information
  when recoded.
- 62 automated tests passed during implementation. The browser flow prepared
  Emerald→Platinum and Emerald→White 2 test packages.
- Verification limitation: physical downloads from the test browser and
  loading real saves on an R36S were not confirmed.

## 2026-11-03 · Yellow and Nintendo DS

- International Yellow import.
- Diamond, Pearl, Platinum, HeartGold, SoulSilver, Black, White, Black 2 and
  White 2 import.
- Box and party reading, plus DS entity decryption and verification.
- Support for 512 KiB DS batteries and recognized 40/122-byte DSV footers.
- Species resources and sprites extended through species 649.
- Portable backups adapted to DS save sizes.

## 2026-11-03 · Initial version

- Private website with local save processing.
- Crystal, FireRed and Emerald import.
- Bank with virtual boxes, search, filters, favorites and notes.
- Verified copies between GBA saves into empty slots.
- Protected originals, SHA-256 hashes, export ZIP, `.pvault` backups and
  organization history.
- Guide with manual installation and verification steps for ArkOS.
