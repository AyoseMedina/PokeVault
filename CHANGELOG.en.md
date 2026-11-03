# Changelog

[Español](CHANGELOG.md) · [English](CHANGELOG.en.md)

These entries document changes made to this project. They are not semantic
versions and do not guarantee testing on a physical R36S.

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
