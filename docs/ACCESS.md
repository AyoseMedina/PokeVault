# Acceso seguro / Secure access

[Español](#español) · [English](#english)

## Español

El login es de **una cuenta personal**, validada en el servidor. La pantalla
está disponible en español e inglés. No hay registro público, contraseña por
defecto ni recuperación por correo. Los guardados siguen en el navegador.

### Protecciones

- Contraseñas de 15–128 caracteres sin recortes, hash scrypt con sal aleatoria
  de 16 bytes (`N=131072`, `r=8`, `p=1`); no se conserva la contraseña en claro.
- Sesiones firmadas y aleatorias, almacenadas en memoria con límite de 512.
  Se renueva el identificador al entrar y se revoca en el servidor al salir.
- Cookies `HttpOnly` y `SameSite=Strict`, sin Domain. En HTTPS también `Secure`
  y prefijo `__Host-`. Ninguna credencial ni identificador va a localStorage.
- Caducidad de 30 minutos sin interacción y 8 horas como máximo. La consulta
  periódica no renueva la actividad. Cerrar sesión avisa a las otras pestañas.
- Validación de Host, origen exacto y CSRF para login, actividad y logout.
- 8 intentos fallidos por dirección cada 15 minutos; 30 globales para la cuenta.
  Cálculo de hash y creación de sesiones previas también limitados. Los errores
  no indican si un usuario existe. Un reinicio restablece sesiones y límites.
- Aplicación, estilos y sprites protegidos. Solo son públicos el formulario,
  sus recursos, el favicon y `/healthz`.
- `no-store`, CSP sin scripts en línea, protección contra marcos y HSTS en HTTPS.
  Los registros no incluyen contraseñas, tokens ni cuerpos de petición.
- Aplicación sin root y con sistema de archivos de solo lectura.

### Nginx existente, local y Caddy opcional

`docker-compose.yml` incluye solo la aplicación con puerto interno 8080, sin
puertos de host ni redes externas preconfiguradas. Conecta tú la red del Nginx
existente en Portainer y apunta a `http://pokevault:8080` (o su alias en esa red).
Nginx gestiona dominio y TLS. Configura origen HTTPS e IP del proxy como se indica
abajo; no hay workflows de GitHub Actions. La imagen de PokéVault se construye
desde el código; Docker descarga la imagen base Node durante la construcción.

`compose.yaml` publica solo en `127.0.0.1`, con `http://localhost:8080`.
HTTP es una excepción para el mismo equipo: no se admite para dominios o IP LAN.
Puedes usar un túnel SSH para acceder al servidor sin abrir HTTP en tu red.

`compose.cloud.yaml` añade Caddy para obtener y renovar certificados y redirigir
HTTP a HTTPS. Necesita dominio con DNS correcto y puertos 80/443 disponibles.
No compra ni crea el dominio. La aplicación no publica puerto de host y comparte
una red interna con Caddy. Los volúmenes del proxy guardan certificados y
configuración; no guardan tu banco.

Con un proxy propio, establece `POKEVAULT_ORIGIN` al origen HTTPS exacto y
`POKEVAULT_TRUST_PROXY` a sus IP o redes concretas. Conserva el backend inaccesible
directamente. Solo en el stack opcional de Caddy, `uniquelocal` queda limitado por la red
interna Docker. El proxy conserva Host y establece `X-Forwarded-Proto: https`.

### Credenciales y recuperación

`node server/create-credentials.mjs --write-env` crea un `.env` nuevo sin
sobrescribir archivos. No necesita paquetes. Sin el flag imprime las variables
para Portainer. También funciona dentro de la imagen; consulta [EMPEZAR.md](../EMPEZAR.md).

Configura `POKEVAULT_USERNAME`, `POKEVAULT_PASSWORD_HASH` y
`POKEVAULT_SESSION_SECRET`. Para secretos montados, el servidor también admite
`POKEVAULT_PASSWORD_HASH_FILE` y `POKEVAULT_SESSION_SECRET_FILE` en un stack
propio. El Compose incluido utiliza variables. No subas `.env`, hashes de acceso
ni secretos. Los administradores de Docker / Portainer pueden leer las variables.

Para recuperar o cambiar el acceso, genera otras credenciales, sustituye las
tres variables y recrea el contenedor. Cambiar el secreto y reiniciar invalida
las sesiones sin tocar el banco.

### Alcance

El login **no cifra IndexedDB ni separa usuarios dentro del mismo perfil de
navegador**. Quien acceda a ese perfil o sus herramientas de desarrollo puede
leer los datos locales. Usa un perfil propio en equipos compartidos. Cerrar
sesión conserva los guardados; exporta `.pvault` para copias externas.

No hay MFA, passkeys ni SSO; para ello utiliza una capa de identidad adicional.
El almacén en memoria está pensado para una instancia, no varias réplicas.
`iniciar.py` y servir `dist/` directamente permanecen como opciones de desarrollo
local **sin este login**: no los expongas a Internet.

## English

Sign-in uses **one personal account**, validated server-side. The screen supports
Spanish and English. There is no public registration, default password or email
recovery. Saves remain in the browser.

### Protections

- Passwords contain 15–128 characters without truncation; scrypt hashing uses
  random 16-byte salts (`N=131072`, `r=8`, `p=1`). No plaintext password is stored.
- Random signed sessions are stored in memory, capped at 512. Identifiers rotate
  at sign-in and are revoked server-side at logout.
- `HttpOnly`, `SameSite=Strict` cookies without Domain; HTTPS adds `Secure` and
  `__Host-`. No credentials or session identifiers go into localStorage.
- Expiry after 30 minutes without interaction and 8 hours at most. Background
  checks do not renew activity. Logout notifies other tabs.
- Host, exact-origin and CSRF checks for login, activity and logout.
- 8 failed attempts per address per 15 minutes; 30 globally for the account.
  Hash computation and pre-login session creation are also limited. Errors do
  not reveal account existence. Restarting resets sessions and limits.
- Application, styles and sprites require a session. Only the form, its assets,
  favicon and `/healthz` are public.
- `no-store`, CSP without inline scripts, frame protection and HTTPS HSTS.
  Logs exclude passwords, tokens and request bodies.
- Non-root application with a read-only filesystem.

### Existing Nginx, local and optional Caddy

`docker-compose.yml` includes only the application on internal port 8080, without
host ports or preconfigured external networks. Connect your existing Nginx network
in Portainer and target `http://pokevault:8080` (or its alias on that network).
Nginx manages the domain and TLS. Configure the HTTPS origin and proxy IP below;
there are no GitHub Actions workflows. The PokéVault image is built from source;
Docker downloads the Node base image during the build.

`compose.yaml` binds only to `127.0.0.1`, using `http://localhost:8080`.
HTTP is an exception for the same computer, not domains or LAN IPs. An SSH
tunnel can provide server access without exposing HTTP to your network.

`compose.cloud.yaml` adds Caddy for automatic certificates, renewal and HTTP
to HTTPS redirects. It needs a domain with correct DNS and available ports
80/443. It does not purchase or create a domain. The application publishes no
host port and shares an internal network with Caddy. Proxy volumes hold
certificates and configuration, not the bank.

With your own proxy, set `POKEVAULT_ORIGIN` to the exact HTTPS origin and
`POKEVAULT_TRUST_PROXY` to specific proxy IPs or networks. Keep the backend
inaccessible directly. Only the optional Caddy stack bounds `uniquelocal` trust using
the internal Docker network. The proxy preserves Host and sets
`X-Forwarded-Proto: https`.

### Credentials and recovery

`node server/create-credentials.mjs --write-env` creates a new `.env` without
overwriting files. No packages are required. Without the flag it prints the
variables for Portainer. It also runs inside the image; see [GETTING_STARTED.md](../GETTING_STARTED.md).

Configure `POKEVAULT_USERNAME`, `POKEVAULT_PASSWORD_HASH` and
`POKEVAULT_SESSION_SECRET`. Mounted secrets can use `POKEVAULT_PASSWORD_HASH_FILE`
and `POKEVAULT_SESSION_SECRET_FILE` in a custom stack. The included Compose
uses environment variables. Do not commit `.env`, access hashes or secrets.
Docker / Portainer administrators can read the variables.

To recover or change access, generate new credentials, replace all three
variables and recreate the container. Changing the secret and restarting
revokes sessions without touching the bank.

### Scope

Sign-in **does not encrypt IndexedDB or isolate users within one browser
profile**. Anyone with access to that profile or its developer tools can
read local data. Use your own profile on shared computers. Logout preserves
saves; export `.pvault` for external backups.

MFA, passkeys and SSO require an additional identity layer. The in-memory store
targets one instance, not multiple replicas. `iniciar.py` and serving `dist/`
directly remain available for local development **without this login**; do
not expose them to the Internet.

## Referencias / References

- [OWASP: Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP: Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP: CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Express: sessions](https://expressjs.com/en/resources/middleware/session/)
- [Express: trusted proxies](https://expressjs.com/en/guide/behind-proxies/)
- [Caddy: automatic HTTPS](https://caddyserver.com/docs/automatic-https)
