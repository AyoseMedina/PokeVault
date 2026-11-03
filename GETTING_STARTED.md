# Run PokéVault on your computer

[Español](EMPEZAR.md) · [English](GETTING_STARTED.md) · [Back to the project](README.en.md)

Download the GitHub ZIP (**Code → Download ZIP**) or clone:

```bash
git clone https://github.com/AyoseMedina/PokeVault.git
cd PokeVault
```

**For sign-in, use [Docker or Portainer](#docker-and-portainer-from-github).**

## Phones and tablets

Open your deployment URL and use **Menú** to reach all six sections. Import files with your device’s file picker and save downloads using **Descargar archivo** (Download file). To organize boxes, select Pokémon and tap **Mover de caja** (Move to box); dragging is optional.

Each device’s browser stores its own bank. To move it from desktop to phone, export a `.pvault` in **Copias de seguridad** (Backups), then restore it on the phone. Sign-in does not synchronize banks. `localhost` only works on the same computer; on your phone, use the reachable URL of your Nginx deployment.

## Importing and moving saves

Choose the **cartridge language** when importing GB/GBA, even if its Pokémon
are foreign. DS reads it from the save. Legacy GBA banks must confirm language
before an evolution can rename a Pokémon. Review every change before exporting.

Install **all** files from `copiar-a-la-SD` or none, keeping exact filenames and
extensions and checking each previous hash in the manifest. Used versions are
consumed. Import the results to continue; if none was installed, confirm
**Anular exportación** in history. [Guide and limits](docs/MOVE_IMPLEMENTATION.md).

## Local development without sign-in

The Python server preserves the original static mode without authenticated
access. It is restricted to this computer.

1. Extract the ZIP and enter the project directory (`PokeVault-main` for a GitHub
   ZIP, or `pokevault-proyecto` for the original downloadable package).
2. Start the local server:

   **Debian / Ubuntu / Linux / macOS:**

   ```bash
   python3 iniciar.py
   ```

   **Windows:**

   ```powershell
   py iniciar.py
   ```

3. Open **http://127.0.0.1:8000** in your browser.
4. Press **Ctrl+C** in the terminal to stop the server.

Only the Python standard library is used. No packages need to be installed.
The server listens on 127.0.0.1 and is accessible from the same computer. Choose
another port with `python3 iniciar.py --port 8080` (or `py` on Windows).

Do not open `index.html` directly: JavaScript modules require a server. The
application interface is in Spanish.

## Docker and Portainer from GitHub

Docker deployments include sign-in and require your own credentials. For
**Portainer with your existing proxy use `docker-compose.yml`**. Local mode
(`compose.yaml`) and optional Caddy (`compose.cloud.yaml`) are also preserved.
These are complete alternatives for Docker Standalone. Saves are still
processed in the browser; the Node server only handles access and web files.
Docker installs its dependencies during the build. These stacks do not target Swarm.

### Create your credentials once

With Node.js 22 or newer, run from the project root:

```bash
node server/create-credentials.mjs --write-env
```

The generator asks for a username, hidden password and confirmation. It creates
`.env` with a password hash and random session secret, without overwriting an
existing file. No `npm install` is needed. Use a long, unique password (15–128 characters).

Without local Node, use Docker:

```bash
docker build -t pokevault .
docker run --rm -it pokevault node server/create-credentials.mjs
```

Copy the three printed variables into a local `.env` file or Portainer stack
variables: `POKEVAULT_USERNAME`, `POKEVAULT_PASSWORD_HASH` and
`POKEVAULT_SESSION_SECRET`. Do not publish them or paste them into the GitHub
Compose file. There is no default account or password.

### Local: ready without a domain

```bash
docker compose up -d --build
```

Open **http://localhost:8080** and sign in. The port is bound only to the Docker
host's 127.0.0.1. Add `POKEVAULT_PORT=8081` to `.env` to change the port; the
access address adjusts automatically. Use `localhost`, not the LAN IP.
For an existing bank at `http://127.0.0.1:8080`, set
`POKEVAULT_ORIGIN=http://127.0.0.1:8080` to retain that exact origin.

If Docker runs elsewhere, use an SSH tunnel:

```bash
ssh -L 8080:127.0.0.1:8080 user@YOUR_SERVER
```

Then open `http://localhost:8080` on your computer. Domain and LAN access require
HTTPS; password login over network-exposed plaintext HTTP is not supported.

### Your existing Nginx: Portainer deployment

`docker-compose.yml` builds only PokéVault from Git and exposes port **8080
inside Docker**, without publishing any host ports. It adds no Nginx, Caddy
or external network: you connect the containers to your chosen network in
Portainer. It uses neither GitHub Actions nor an image registry.

Once connected, configure your Nginx:

| Field | Value |
| --- | --- |
| Public domain | Your domain |
| Upstream scheme | `http` |
| Upstream host | `pokevault` (or the container name/alias on your network) |
| Upstream port | `8080` |
| TLS / SSL | Managed by your Nginx |

The proxy must preserve the public `Host`, overwrite `X-Forwarded-Proto` with
`https`, and sanitize `X-Forwarded-For` and `X-Forwarded-Host`. For directly
managed Nginx, these directives belong in `location /` inside the HTTPS block:

```nginx
proxy_pass http://pokevault:8080;
proxy_set_header Host $http_host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Host $http_host;
```

Set `POKEVAULT_ORIGIN` to the exact public URL, such as
`https://pokevault.yourdomain.com`, without a trailing slash. Set
`POKEVAULT_TRUST_PROXY` to Nginx's internal IP as seen by PokéVault, or a dedicated
proxy subnet. This validates HTTPS and enables secure cookies behind Nginx.
Do not use `true` or a broader network than needed. If the proxy IP changes,
update this variable or use its dedicated subnet with controlled access.

No database or save volume is required: the bank stays in the browser. While
preparing the domain and Nginx, you can use local mode.

### Optional, without your own proxy: automatic HTTPS with Caddy

1. Create a DNS A record (and AAAA only with working IPv6) pointing to your
   server, for example `pokevault.yourdomain.com`.
2. Make ports 80 and 443 available and reachable. If another proxy already uses
   them, integrate the backend with that proxy instead of binding two services
   to the same ports; see [Access](docs/ACCESS.md#english).
3. Add `POKEVAULT_DOMAIN=pokevault.yourdomain.com` to `.env`, without a scheme or path.
4. Run:

   ```bash
   docker compose -f compose.cloud.yaml up -d --build
   ```

5. Open `https://pokevault.yourdomain.com`. Caddy obtains and renews the certificate
   and redirects HTTP to HTTPS. Allow time for initial issuance on a new domain.

The application has no host port and lives on an internal network; only Caddy
receives 80/443. `caddy_data` and `caddy_config` preserve proxy certificates and
configuration, not saves. Keep those volumes when updating. A domain is not
purchased or created automatically. Use local mode until you have one.

### Create the stack

1. In Portainer: **Docker Standalone → Stacks → Add stack → Git Repository**.
2. Name: `pokevault`. Repository: `https://github.com/AyoseMedina/PokeVault`.
   Public read access needs no credentials. You can use a fork; configure
   Portainer Git authentication if it is private.
3. Reference: `refs/heads/main`.
4. **Compose path**: `docker-compose.yml` for your existing proxy.
   Use `compose.yaml` for local only, or `compose.cloud.yaml` if you need Caddy.
   These are complete alternatives; do not combine these files in one stack.
5. Configure variables:

   | Variable | Your proxy (`docker-compose.yml`) | Local | Optional Caddy |
   | --- | --- | --- | --- |
   | `POKEVAULT_USERNAME` | Generated, required | Required | Required |
   | `POKEVAULT_PASSWORD_HASH` | Generated, required | Required | Required |
   | `POKEVAULT_SESSION_SECRET` | Generated, required | Required | Required |
   | `POKEVAULT_ORIGIN` | Public HTTPS URL, required | Optional existing local origin | Derived from domain |
   | `POKEVAULT_TRUST_PROXY` | Proxy IP or exclusive subnet, required | Unused | Automatic on isolated network |
   | `POKEVAULT_PORT` | Unused; internal port 8080 | Optional, 8080 | Unused |
   | `POKEVAULT_DOMAIN` | Unused | Unused | Required, no scheme or path |

6. **Deploy the stack**. The app must become `healthy`. Configure your proxy
   with the upstream above and open the public HTTPS URL to sign in.
   For the optional Caddy setup, check its logs for certificate issuance.

Resources are built into the image; do not enable relative-path volumes or
mount `./dist`. The old `docker/nginx.conf` is preserved as a reference but is
no longer used by these stacks. Serving `dist/` directly bypasses sign-in;
that static server is not a public authenticated deployment.

### Update or switch modes

Push changes to the same branch. There is no GitHub Actions workflow or required
Actions run for deployment. In Portainer use **Pull and redeploy**, leaving **Re-pull image** disabled:
`pull_policy: build` rebuilds from Git. If unsupported, update Portainer/Compose;
do not remove it without ensuring the image is rebuilt.

When upgrading from the version without sign-in, configure the three credentials
before deploying. The container fails to start without them. Restarts close
sessions but retain the browser bank. Logout also preserves data. To recover
or change access, run the generator without `--write-env`, replace all three
variables and recreate the container.

To switch from local to your proxy, keep credentials, select `docker-compose.yml`
and configure the HTTPS origin and proxy IP. For Caddy, use `compose.cloud.yaml`
and configure its domain. Export `.pvault` first: changing protocol, domain/IP, port or
browser profile changes visible storage. Restore it at the new address.
Sign-in does not synchronize or encrypt IndexedDB.

### Inspect or stop

```bash
docker compose ps
docker compose logs --tail 50
docker compose down
```

For your proxy add `-f docker-compose.yml`; for Caddy, add `-f compose.cloud.yaml`
to each command. Without `-f`, Docker chooses `compose.yaml` (local). `down` without `-v`
keeps proxy volumes. Pokémon data does not require Docker volumes.

### Publish your own copy

Clone or fork the public repository while preserving history. To publish a
folder that is not yet a Git repository:

```bash
git init -b main
git add .
git diff --cached --stat
git commit -m "Prepare PokeVault for Docker and Portainer"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Review staged files before committing. Include the app, server, lockfile,
configuration, documentation, license and tests. `.gitignore` excludes `.env`,
saves, ROMs and `.test-output/`; GitHub's web uploader does not apply these rules.
Never include secrets in files, URLs or history. If already cloned, do not
reinitialize the repository or replace its remote unnecessarily.

More: [login protections and scope](docs/ACCESS.md#english),
[Portainer from Git](https://docs.portainer.io/user/docker/stacks/add) and
[Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).

## Pokédex and Crystal → GBA

After signing in, import your saves. **Pokédex** lets you select a save and view
its actual seen/caught flags and exact-edition descriptions. Descriptions are
bundled reference data; English is explicitly shown when Spanish is unavailable.
See [Pokédex](docs/POKEDEX.md#english).

To copy from Crystal to Ruby, Sapphire, Emerald, FireRed or LeafGreen, import
both saves and choose PC Pokémon. In Transfers, select the GBA destination and
enable the **custom Crystal → GBA** option. Review generated identity fields,
DVs/IVs, training and synthetic origin before export. The ZIP keeps both originals.
See the [custom policy and restrictions](docs/CUSTOM_TRANSFER.md#english).

## Move your bank

Saves are kept in browser storage. Your local bank is independent of the bank
at another hosted address: export a `.pvault` there and import it here to move
your data. Keep the same browser, address and port to reopen the same local
bank. Changing the web origin changes the visible storage.

No personal saves or ROMs are included. The two public reference entities in
`tests/fixtures` are part of the tests, with documented provenance and license.
The saves generated by tests are not playable.

## Tests

With Node.js 22 or newer, run from the project directory:

```bash
npm test
```

The save tests do not require `npm install`. Generated
test files are stored in `.test-output/` inside the project.

For the access server:

```bash
npm --prefix server ci --ignore-scripts
npm run test:auth
```

## Self-hosting

Use the stacks above for hosting with sign-in. `dist/` remains a static website
and can be served without the access server for local development only. Saves
remain in the browser; the server does not receive them.

## Contents

- `dist/`: application, converters, tables and 649 local sprites.
- `tests/`: import, export, conversion and integrity tests.
- `iniciar.py`: local Python server.
- `AGENTS.md`: project development rules in Spanish.
- `CHANGELOG.md`: change history in Spanish.
- `README.md`: scope, restrictions, routes and sources in Spanish.
- `dist/LICENSE`: GPL-3.0 license.
- `LICENSE`: the same license at the repository root for GitHub.
- `Dockerfile`, `docker-compose.yml`: access server for Portainer and your proxy.
- `compose.yaml`, `compose.cloud.yaml`: local and optional Caddy alternatives.
- `server/`: login, sessions, server dependencies and authentication tests.
- `docker/`: Caddy and the previous Nginx configuration retained for reference.
- `docs/ACCESS.md`: login protections and scope in both languages.
- `README.en.md`, `GETTING_STARTED.md`, `CHANGELOG.en.md`, `AGENTS.en.md`: English documentation.
- `CONTRIBUTING.md`: contribution guide in both languages.
- `docs/assets/`: repository banner.

Exports preserve originals and produce new files to install manually in your
emulator. Read the in-app guide before preparing transfers.


## Updating the bank and retaining versions

This version opens IndexedDB version 2. The first valid write moves byte buffers
to a hash-indexed store in the same transaction; Pokémon keys do not change.
Close other tabs if the upgrade is blocked. Do not downgrade the application
against this database: export `.pvault` and keep this version for recovery.

In **Copias de seguridad** (Backups), download the complete v2 `.pvault`. v1
imports remain supported. Merging retains current organization, adds missing
data, and keeps up to 25 restore points, prioritizing existing points.
To free an old version, use **Mis partidas → Retirar versión**: download the bank,
verify the copy, then type RETIRAR. Its notes, favorites and unreferenced local
backups are removed too.

If a save cannot be read, retain its original and `.pvault` before changing
versions. An unknown schema blocks writes and offers raw JSON recovery without
modifying stored data. [Details and tests](docs/VALIDATION.md#english).
