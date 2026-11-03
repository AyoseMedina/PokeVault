# Run PokéVault on your computer

[Español](EMPEZAR.md) · [English](GETTING_STARTED.md) · [Back to the project](README.en.md)

Download the GitHub ZIP (**Code → Download ZIP**) or clone:

```bash
git clone https://github.com/AyoseMedina/PokeVault.git
cd PokeVault
```

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

`compose.yaml` targets **Docker Standalone** with modern Compose. It builds
the image from the repository and serves `dist/` with Nginx on internal port
8080. No Node.js, Python or volumes are needed on the server. Docker Swarm
requires a prebuilt registry image; this stack is not configured for Swarm.

### Publish your own repository

The public repository is **https://github.com/AyoseMedina/PokeVault**. You can
deploy directly from it or create your own fork. Keep its directory structure.
Include all of `dist/`, `Dockerfile`, `docker/nginx.conf`, `compose.yaml` and
`.dockerignore`, as well as documentation, license and tests. `.gitignore`
excludes saves, ROMs, backups, common credentials and test output. GitHub's
web uploader does not apply those exclusions automatically: do not drag in
`.test-output/`, `.env` or personal files.

From the project directory, only if it is not already a Git repository:

```bash
git init -b main
git add .
git diff --cached --stat
git commit -m "Prepare PokeVault for Docker and Portainer"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

These commands publish your own copy from a folder without Git; do not run
them after cloning. Review the file list before committing. Replace the
username and repository, and authenticate without putting tokens in URLs or
files. If you already cloned the project, preserve its history and remote.

### Create the stack

1. In your Docker Standalone environment in Portainer, open **Stacks → Add stack**.
2. Name: `pokevault`. Select **Git Repository / Repository**.
3. URL: `https://github.com/AyoseMedina/PokeVault` (or configure a Git source,
   depending on your version). Public read access requires no credentials.
   For a private fork, configure read credentials inside Portainer.
4. Reference: `refs/heads/main`. **Compose path**: `compose.yaml`.
5. Configure these stack variables:

   | Variable | Default | Purpose |
   | --- | --- | --- |
   | `POKEVAULT_BIND_IP` | `127.0.0.1` | Docker host IP to listen on |
   | `POKEVAULT_PORT` | `8080` | Available Docker host port |

6. Click **Deploy the stack** and wait for the container to become **healthy**.

By default, `http://127.0.0.1:8080` is available only **on the Docker server**.
For LAN or VPN access, set `POKEVAULT_BIND_IP` to that server's specific IP on
the network, such as `192.168.1.50`, and open `http://192.168.1.50:8080`. Do not
use the container IP or your computer's IP if Docker runs on a different host.
LAN/VPN access is available to devices able to reach that address; there is
no built-in login.

For a domain, configure HTTPS and authentication in your proxy. A proxy running
directly on the Docker host can target `127.0.0.1:8080`. A proxy in another
container has its own loopback address: it needs a shared Docker network with
PokéVault and target `pokevault:8080`, or a reachable host address. Set up private
access before exposing the website outside your network. Repository visibility
does not add authentication to the deployed website.

The image contains the website resources; you do not need Portainer relative
path volumes or a `./dist` bind mount. The server does not receive save files.

### Update

Push changes to the same GitHub branch and use **Pull and redeploy** on the
stack. `pull_policy: build` requests an image rebuild from that code. For a
fork, push to your fork; for this repository, wait for the commit's
**Tests & Docker** check to pass before updating.

Leave **Re-pull image** disabled: the application is built from Git rather
than downloaded as a published PokéVault registry image. If Portainer rejects
`pull_policy: build`, update its Compose version; do not remove it without
ensuring that the image is rebuilt on every update.

Recreating the container preserves the browser bank. Keep the same protocol,
domain/IP, port and browser. Export a `.pvault` before changing the address and
restore it at the new origin. Docker volumes do not back up your bank.

### Try Docker on this computer

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail 50
```

Open `http://127.0.0.1:8080`. To stop and remove this stack's container:

```bash
docker compose down
```

Copy `.env.example` to `.env` to change the address or port locally. In
Portainer, configure variables through the stack interface.

References: [Portainer stacks from Git](https://docs.portainer.io/user/docker/stacks/add),
[updating stacks](https://docs.portainer.io/user/docker/stacks/edit) and
[Compose build policy](https://docs.docker.com/reference/compose-file/services/#pull_policy).

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

There is no `npm install` step: the project has no dependencies. Generated
test files are stored in `.test-output/` inside the project.

## Self-hosting

`dist/` can be served as a static website. Authentication for a private hosted
site belongs to the hosting service and is not included in this exported code.
For access outside your computer, configure authentication and HTTPS on your
chosen server.

## Contents

- `dist/`: application, converters, tables and 649 local sprites.
- `tests/`: import, export, conversion and integrity tests.
- `iniciar.py`: local Python server.
- `AGENTS.md`: project development rules in Spanish.
- `CHANGELOG.md`: change history in Spanish.
- `README.md`: scope, restrictions, routes and sources in Spanish.
- `dist/LICENSE`: GPL-3.0 license.
- `LICENSE`: the same license at the repository root for GitHub.
- `Dockerfile`, `compose.yaml`, `docker/`: Nginx build and deployment.
- `.github/workflows/ci.yml`: tests and Docker checks in GitHub Actions.
- `README.en.md`, `GETTING_STARTED.md`, `CHANGELOG.en.md`, `AGENTS.en.md`: English documentation.
- `CONTRIBUTING.md`: contribution guide in both languages.
- `docs/assets/`: repository banner.

Exports preserve originals and produce new files to install manually in your
emulator. Read the in-app guide before preparing transfers.
