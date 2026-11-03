# Guidelines for working on PokéVault

English translation of [AGENTS.md](AGENTS.md). Keep both documents aligned.

## Purpose and architecture

PokéVault is a static personal application for managing Pokémon saves from
generations I–V. Files are processed in the browser; IndexedDB stores the bank.
There is no save server and no browser JavaScript runtime dependencies.
`server/` adds HTTP authentication for Docker and Node without receiving or
storing saves. Existing Nginx handles HTTPS; Caddy remains an optional alternative.

Main files:

- `dist/app.js`: interface, persistence, backups and review/export flow.
- `dist/core.js`: GBC/GBA formats, shared validation, ZIP and Gen III writing.
- `dist/formats.js`: Yellow/DS reading and DS entity encryption.
- `dist/transfer.js`: routes, conversions and GB/DS copy writing.
- `dist/data.js`, `formats-data.js`, `transfer-data.js`: tables with documented provenance.
- `dist/styles.css`: responsive design; preserve the user-requested red, white and charcoal Pokémon theme.
- `tests/`: tests using public entities and synthetic, non-playable saves.
- `iniciar.py`: local server restricted to 127.0.0.1.
- `server/`: login, sessions, throttling and ES/EN access resources.
- `docker-compose.yml`: Portainer behind existing Nginx, without host ports.
- `compose.yaml`, `compose.cloud.yaml`: local access or optional Caddy.

## Data protection

1. Never modify imported original bytes. Work on copies.
2. Preserve validation before and after writing and the pre-export backup.
3. Insert only into empty slots. Block duplicates and check that existing
   Pokémon remain intact.
4. Preserve write-range checks. Update only necessary fields and corresponding
   checksums or mirrors.
5. Preserve IndexedDB revision checks to avoid overwriting another tab's
   changes. Never silently delete or reinitialize data.
6. Preserve `.pvault` backup and Pokémon key compatibility when changing the
   persistence schema.
7. Preserve the complete DSV footer when the destination uses that format.
8. Do not include ROMs, personal saves, credentials or session data in code or
   packages. Do not broaden website visibility without explicit user authorization.

## Conversions and compatibility

- Current routes: same generation I–V; I→II; III→IV; IV→V; III→IV→V.
- The user explicitly authorized custom Crystal II→III conversion with review.
  Follow `docs/CUSTOM_TRANSFER.md`: deterministic generated fields, explicit opt-in,
  original backups and verified output. Direct II→IV/V and backward routes remain
  blocked. Other routes need a verified specification and converted-data tests.
- Do not substitute characters or truncate names to fit. Preserve spaces,
  original names and identity; block lossy conversions.
- Preserve PID, ID32, experience, DVs/IVs, EVs, ability and ribbons where the
  route supports them. Do not generate new random values to hide problems.
- The conversion date is fixed during review in the Atlantic/Canary time zone.
  Final output must match the reviewed bytes.
- Never silently remove items, HMs, eggs, events or special forms. Preserve
  conservative blocks and clear manual instructions.
- Distinguish a data copy from an actual trade: do not delete the source or
  implicitly trigger trade evolutions.
- Do not claim competitive legality merely because checksums pass.

## Development and verification

Run locally with `python3 iniciar.py`, or `py iniciar.py` on Windows. For logic
changes, run `npm test` with Node.js 22 or newer and add tests for relevant
boundaries or errors. No package installation is required. Test output goes
to `.test-output/` and must not be included in deliverables. Documentation-only
changes do not require rerunning logic tests.

For UI changes, check the affected selection, prevalidation, change review,
backup and package preparation flow. Report checks that could not be performed
in a browser or on a real console.

Verify format details against primary sources such as PKHeX and the pret
decompilations cited in the README. Preserve attribution and GPL-3.0. Update
CHANGELOG.md with verified facts and EMPEZAR.md if startup changes. Changes to
this local package do not imply publishing a new hosted website version.

For access changes, install with `npm --prefix server ci --ignore-scripts` and
run `npm run test:auth` as well as `npm test`. Do not add default credentials,
public registration or an unauthenticated Docker deployment mode. Restrict
development HTTP to the host; require HTTPS elsewhere. Logging out must not
delete or reinitialize IndexedDB.
