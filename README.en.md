<p align="center"><img src="docs/assets/pokevault-banner.svg" alt="PokéVault — Tus aventuras, en un mismo lugar / Your adventures, together in one place" width="100%"></p>

<p align="center"><a href="README.md">Español</a> · <strong>English</strong></p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-191b22" alt="GPL-3.0 license"></a>
  <img src="https://img.shields.io/badge/Pok%C3%A9mon-generations_I%E2%80%93V-ef4054?labelColor=191b22" alt="Generations I to V">
  <a href="GETTING_STARTED.md#docker-and-portainer-from-github"><img src="https://img.shields.io/badge/deploy-Docker_%2B_Portainer-191b22" alt="Docker and Portainer"></a>
</p>

# PokéVault · Your classic HOME

A personal bank to gather, organize and **move** your Pokémon between generation
I–V saves, built for R36S / ArkOS and other emulators. It reads and writes battery
saves (`.sav`, `.srm`, `.dsv`) with validation before and after, and prepares a
package to copy to the SD card. This is an unofficial personal project.

Two ways to use it:

- **Docker / Portainer (recommended):** personal sign-in, an email-enabled account
  and the whole bank **encrypted on your server** (`pokevault_data` volume), the
  same on phone and computer.
- **Local mode without sign-in (`iniciar.py`):** for development; the bank lives in
  the browser (IndexedDB).

Saves are parsed and written **in your browser**; the server stores, validates and
serves the encrypted bank. No analytics or external services, except the SMTP
server you configure for email. The bank interface is in Spanish; sign-in and
documentation are in Spanish and English.

**[Getting started](GETTING_STARTED.md) · [Docker and Portainer](GETTING_STARTED.md#docker-and-portainer-from-github) · [Changelog](CHANGELOG.en.md) · [Contributing](CONTRIBUTING.md#english)**

## Features

| Feature | Description |
| --- | --- |
| Import adventures | Party and boxes from 16 games, with structure and checksums verified and original bytes kept with SHA-256. |
| Search everything | "Buscar" button or **Ctrl+K** / "/": Pokémon (name, nickname, number, type, trainer, box, notes, shiny), saves, Pokédex and sections, accent- and case-insensitive. |
| Organize your bank | 30-slot virtual boxes, search, filters, sorting, favorites and notes, without changing the save's boxes. |
| See your Pokémon | Black/White animated sprites, shiny when they are; static images when the system asks for reduced motion. |
| Move Pokémon | They leave the source and enter the destination like a real trade: trade evolution, items, destination Pokédex and clone prevention. [Policy](docs/MOVE_TRANSFER.md). |
| Cards and packs | Every Pokémon as an original-design trading card (real HP, that generation's moves and type chart, rarity, holographic when shiny) and packs that open when new Pokémon arrive. [Details](docs/CARDS.md). |
| Animations | Each Pokémon's journey and evolution when the package is prepared; replayable from history and shown in the demo. [Details](docs/ANIMATIONS.md). |
| Pokédex | Real seen/caught flags per save and descriptions: exact English text of the edition, or Spanish from a named later edition. [Coverage](docs/POKEDEX.md). |
| Server-side bank | AES-256-GCM, revisions with cross-device conflict control and 50 restorable versions. [Design](docs/SERVER_VAULT.md). |
| Account and email | Password change and link-based recovery, security notices and optional messages (weekly digest, anniversaries, moves, backup reminder). [Details](docs/ACCOUNT_EMAIL.md). |
| R36S ⇄ Wii | `.srm` ⇄ `.sav` converter for Visual Boy Advance GX; Crystal also carries its clock (`.rtc`). [How to use it](GETTING_STARTED.md#r36s--wii-visual-boy-advance-gx). |
| Backups | Portable `.pvault` with originals, history and consumed versions; organization restore points. |
| Try it first | Demo with synthetic, non-playable data, including the trade and evolution animation. |

## Quick start

```bash
git clone https://github.com/AyoseMedina/PokeVault.git
cd PokeVault
node server/create-credentials.mjs --write-env   # username, hash, session secret and bank key
docker compose up -d --build
```

Open **http://localhost:8080** on the Docker host. There is no default password.
Without local Node, [generate credentials with Docker](GETTING_STARTED.md#create-your-credentials-once).

> **Keep `POKEVAULT_DATA_KEY` outside the server** (password manager). It encrypts
> your bank: losing it loses the bank, even with volume backups.

**Portainer with your Nginx:** repository `https://github.com/AyoseMedina/PokeVault`,
reference `refs/heads/main`, **Docker Standalone** and `docker-compose.yml` (no host
ports; you connect the proxy network). Required: credentials, `POKEVAULT_DATA_KEY`,
`POKEVAULT_ORIGIN` and `POKEVAULT_TRUST_PROXY`. SMTP is optional. `compose.yaml` is
for local use and `compose.cloud.yaml` adds Caddy if you have no proxy.
[Full guide](GETTING_STARTED.md#create-the-stack).

**Local mode without sign-in:** `py iniciar.py` (Windows) or `python3 iniciar.py`, at
**http://127.0.0.1:8000**, no packages needed. For your own computer only.

If you already had a browser bank, server mode offers to **upload** it and verifies
it; the browser copy is deleted only after you confirm.

## Games and formats

- Gen I: international Yellow, 32 KiB, 12 boxes and party.
- Gen II: international Crystal, 32 KiB, 14 boxes and party; also Visual Boy Advance GX (Wii) `.sav` files with their clock, which is kept.
- Gen III: international Ruby, Sapphire, Emerald, FireRed and LeafGreen, 128 KiB, 14 boxes and party.
- Gen IV: Diamond, Pearl, Platinum, HeartGold and SoulSilver, 512 KiB, 18 boxes and party.
- Gen V: Black, White, Black 2 and White 2, 512 KiB, 24 boxes and party.
- DS accepts 512 KiB SAV/SRM and DSV with a recognized 40- or 122-byte footer, kept intact. ROM hacks, save states, compressed No$GBA batteries and GB RTC tails are not supported.

## Moving Pokémon

The [pokevault-move-v1](docs/MOVE_TRANSFER.md) policy produces one file per source
save and one for the destination. The ZIP has `copiar-a-la-SD/<gb|gbc|gba|nds>/`
with the **exact name and extension** of each imported file (`.srm`, `.sav` or
`.dsv`): install **all or none**, checking the SD hash first. `originales/` is only
for rolling back.

| Route | Real tool | Trade evolution |
| --- | --- | --- |
| I→I · II→II · III→III · IV→IV · V→V | Trade | Yes |
| I→II | Time Capsule | Yes |
| Crystal II→III (Ruby/Sapphire/Emerald/FR/LG) | Unofficial custom conversion ([policy](docs/CUSTOM_TRANSFER.md)) | Yes |
| III→IV · IV→V · III→IV→V | Pal Park · Poké Transfer | No, as in the games |
| Direct II→IV/V and backward moves | — | Blocked |

- **Evolutions:** Kadabra, Machoke, Graveler, Haunter, Boldore, Gurdurr and item
  evolutions (King's Rock, Metal Coat, Dragon Scale, Up-Grade…; the item is
  consumed). An Everstone prevents them. Without a nickname, the name follows the
  destination cartridge language. A move learned at the current level blocks it.
- **Items:** they travel with the Pokémon per [tables generated from PKHeX](docs/ITEM_TRANSFER.md);
  IV→V returns them to the source game's bag, as Poké Transfer does.
- **Destination Pokédex:** the received and evolved species are registered.
- **Clone prevention:** used versions are consumed and cannot be reused or
  re-imported (not even from `originales/` or a `.pvault`). **Cancel export**
  requires confirming nothing was installed. Afterwards, import the new files.
- Eggs, party Pokémon, Mail, HMs when advancing generations, unverified events and
  forms, duplicates and lossy text are blocked. This is not a competitive legality
  check. [Sources and limits](docs/MOVE_IMPLEMENTATION.md).

The date is fixed at review time (Atlantic/Canary) and exported bytes must match the
reviewed ones. The manifest includes file and entity hashes.

## Write guarantees

- Imported bytes are never modified; work happens on copies. Only empty slots are
  used, and a range mask blocks any change outside the authorized areas.
- After writing, everything is re-read: each moved Pokémon, existing ones (source
  and destination), the Pokédex and every checksum or CRC (main, banks, mirrors,
  Gen V table and Gen IV bag). DSV keeps its exact length and footer.
- Copies on import and before export, restore points and revision control: between
  tabs in the browser, and between devices on the server (409).

## Security and privacy

- Sign-in with scrypt, expiring sessions, CSRF, attempt limits, and every session
  closed when the password is changed or reset. [Access](docs/ACCESS.md#english).
- Bank and account encrypted on the volume with AES-256-GCM; the server validates
  each revision and the browser checks the SHA-256 of every original it downloads.
- Mail only leaves over TLS. Optional Pokémon messages send species, nickname, level
  and game to your mail provider.

## Development and verification

With Node.js 22 or later:

```bash
npm test                                   # 165 format, write and move tests
npm --prefix server ci --ignore-scripts
npm run test:auth                          # 38 access, encrypted bank and account tests
```

With Playwright (see [VALIDATION](docs/VALIDATION.md)): `npm run test:browser`,
`test:browser:move`, `test:browser:vault` and `test:browser:account`. Test saves are
synthetic and not playable; outputs go to `.test-output/`. Tests do not replace
checking a real copy in the emulator or on the R36S. There are no GitHub Actions:
Portainer builds straight from Git.

## Project map

| Path | Responsibility |
| --- | --- |
| `dist/app.js` | Interface, bank, backups, review, export, account and animations. |
| `dist/core.js`, `dist/formats.js` | GB/GBA/DS reading, validation, SHA-256, ZIP and DS entity encryption. |
| `dist/move*.js`, `dist/consumed.js` | Moves, items, evolutions, Pokédex and consumed versions. |
| `dist/transfer.js`, `dist/custom-transfer.js` | Routes and conversions, including Crystal → GBA. |
| `dist/vault.js`, `dist/server-vault.js`, `dist/backup.js` | Bank in IndexedDB or on the server and `.pvault` backups. |
| `dist/cards*.js`, `dist/packs*.js`, `dist/card-data.js` | Cards, packs and their PokéAPI data. |
| `dist/search.js` | Global search. |
| `dist/animations.js`, `dist/pokedex*.js` | Animations and Pokédex with local descriptions. |
| `dist/emulator-convert.js` | R36S ⇄ Wii converter, including the Crystal clock. |
| `dist/*data.js`, `dist/sprites/` | Tables with provenance and sprites 1–649 (static, shiny and animated). |
| `server/` | Sign-in, encrypted bank (`vault-*`), account and email (`account-store`, `mailer`, `notifications`), public pages and `vault-admin.mjs`. |
| `scripts/` | Reproducible generators for tables, Pokédex and sprites. |
| `tests/`, `server/tests/` | Unit and browser tests. |
| `Dockerfile`, `docker-compose.yml`, `compose*.yaml`, `docker/` | Portainer with your Nginx, local use and optional Caddy. |
| `iniciar.py` | Local server restricted to `127.0.0.1`. |
| `AGENTS.en.md` | Development and data-protection rules ([Spanish](AGENTS.md)). |

## Documentation

| Document | Spanish | English |
| --- | --- | --- |
| Overview | [README](README.md) | [README](README.en.md) |
| Getting started, Docker, Portainer, email and backups | [Empezar](EMPEZAR.md) | [Getting started](GETTING_STARTED.md) |
| Changelog | [Historial](CHANGELOG.md) | [Changelog](CHANGELOG.en.md) |
| Sign-in and security | [Acceso](docs/ACCESS.md#español) | [Access](docs/ACCESS.md#english) |
| Server bank · Account and email | [SERVER_VAULT](docs/SERVER_VAULT.md) · [ACCOUNT_EMAIL](docs/ACCOUNT_EMAIL.md) | (summary at the end of each) |
| Moves, items, Crystal → GBA, Pokédex, animations | [MOVE_TRANSFER](docs/MOVE_TRANSFER.md) · [ITEM_TRANSFER](docs/ITEM_TRANSFER.md) · [CUSTOM_TRANSFER](docs/CUSTOM_TRANSFER.md) · [POKEDEX](docs/POKEDEX.md) · [ANIMATIONS](docs/ANIMATIONS.md) · [CARDS](docs/CARDS.md) | (bilingual or with summary) |
| Tests and validation | [VALIDATION](docs/VALIDATION.md) | [VALIDATION](docs/VALIDATION.md) |
| Development guidelines | [Pautas](AGENTS.md) | [Guidelines](AGENTS.en.md) |
| Contributing and test entities | [Guía](CONTRIBUTING.md#español) · [Procedencia](tests/fixtures/README.md#español) | [Guide](CONTRIBUTING.md#english) · [Provenance](tests/fixtures/README.md#english) |

## Sources and license

Original JavaScript implementation under GPL-3.0 ([LICENSE](LICENSE), also in
`dist/LICENSE`). Tables and references from [kwsch/PKHeX](https://github.com/kwsch/PKHeX),
© its authors. Native sources checked in [pret/pokeyellow](https://github.com/pret/pokeyellow),
[pret/pokecrystal](https://github.com/pret/pokecrystal), [pret/pokeemerald](https://github.com/pret/pokeemerald),
[pret/pokefirered](https://github.com/pret/pokefirered), [pret/pokeplatinum](https://github.com/pret/pokeplatinum)
and [pret/pokeheartgold](https://github.com/pret/pokeheartgold). Species, descriptions and
sprites from [PokéAPI](https://github.com/PokeAPI/pokeapi) and [PokeAPI/sprites](https://github.com/PokeAPI/sprites)
at pinned versions. Test entities: `tests/fixtures/README.md`. Images and characters
belong to Nintendo, Creatures, GAME FREAK and The Pokémon Company. Unofficial
personal project.
