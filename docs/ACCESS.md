# Acceso seguro / Secure access

[Español](#español) · [English](#english)

## Español

El login es de **una cuenta personal**, validada en el servidor. La pantalla
está disponible en español e inglés. No hay registro público, contraseña por
defecto ni recuperación por correo. Los guardados siguen en el navegador.

### Protecciones

- Contraseñas de 15–128 caracteres sin recortes, hash scrypt con sal aleatoria
  de 16 bytes (`N=131072`, `r=8`, `p=1`); el servidor solo conserva el hash, no la contraseña en claro.
- Sesiones firmadas y aleatorias, almacenadas en memoria: hasta 128 autenticadas y 512 previas, en almacenes separados.
  Se renueva el identificador al entrar y se revoca en el servidor al salir.
- Cookies `HttpOnly` y `SameSite=Strict`, sin Domain. En HTTPS también `Secure`
  y prefijo `__Host-`. Ninguna credencial ni identificador va a localStorage.
- Caducidad de 30 minutos sin interacción y 8 horas como máximo. La consulta
  periódica no renueva la actividad. Cerrar sesión avisa a las otras pestañas. Si hay una operación o ventana abierta, se muestra un aviso y se aplaza la navegación para conservar el trabajo y las descargas; el servidor revoca la sesión inmediatamente.
- Validación de Host, origen exacto y CSRF para login, actividad y logout.
- 8 intentos fallidos por dirección cada 15 minutos. CSRF, formato JSON y tamaño se validan antes de contarlos; no hay un bloqueo global de la cuenta.
  Cálculo de hash y creación de sesiones previas también limitados. Los errores
  no indican si un usuario existe. Un reinicio restablece sesiones y límites.
- Aplicación, estilos y sprites protegidos. Solo son públicos el formulario,
  sus recursos, el favicon y `/healthz`.
- `no-store`, CSP sin scripts en línea, protección contra marcos y HSTS en HTTPS.
  Los fallos de acceso registran la IP efectiva; no incluyen contraseñas, tokens ni cuerpos de petición.
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

Con Docker, el banco y la cuenta se guardan **cifrados en el servidor** (volumen
`pokevault_data`, AES-256-GCM, [SERVER_VAULT](SERVER_VAULT.md)) y el navegador no
conserva copia. Cerrar sesión no borra nada. La contraseña se cambia y recupera
desde la web ([ACCOUNT_EMAIL](ACCOUNT_EMAIL.md)); tras el primer arranque manda la
cuenta del volumen, no `POKEVAULT_PASSWORD_HASH`. Con `iniciar.py`, el banco queda
sin cifrar en IndexedDB de ese perfil de navegador: usa un perfil propio en
equipos compartidos.

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
  random 16-byte salts (`N=131072`, `r=8`, `p=1`). The access server stores only the hash, not the plaintext password.
- Random signed sessions are stored in separate memory stores: up to 128 authenticated and 512 pre-login sessions. Identifiers rotate
  at sign-in and are revoked server-side at logout.
- `HttpOnly`, `SameSite=Strict` cookies without Domain; HTTPS adds `Secure` and
  `__Host-`. No credentials or session identifiers go into localStorage.
- Expiry after 30 minutes without interaction and 8 hours at most. Background
  checks do not renew activity. Logout notifies other tabs. An open operation or dialog delays navigation and shows a notice so work/downloads are retained; the server revokes the session immediately.
- Host, exact-origin and CSRF checks for login, activity and logout.
- 8 failed attempts per address per 15 minutes. CSRF, JSON format and size are checked first; there is no global account lockout.
  Hash computation and pre-login session creation are also limited. Errors do
  not reveal account existence. Restarting resets sessions and limits.
- Application, styles and sprites require a session. Only the form, its assets,
  favicon and `/healthz` are public.
- `no-store`, CSP without inline scripts, frame protection and HTTPS HSTS.
  Failed sign-ins log the effective client IP; logs exclude passwords, tokens and request bodies.
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

With Docker, the bank and account are stored **encrypted on the server**
(`pokevault_data` volume, AES-256-GCM, [SERVER_VAULT](SERVER_VAULT.md)) and the browser
keeps no copy. Logout deletes nothing. The password is changed and recovered from
the web ([ACCOUNT_EMAIL](ACCOUNT_EMAIL.md)); after the first start the volume account
is authoritative, not `POKEVAULT_PASSWORD_HASH`. With `iniciar.py`, the bank stays
unencrypted in that browser profile's IndexedDB: use your own profile on shared computers.

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


### Comprobar el proxy / Verify the proxy

En una prueba de configuración, provoca un único fallo de login y consulta
`docker compose logs pokevault`: `auth login_failed` debe mostrar la IP del
cliente. Si siempre aparece la IP de Nginx, corrige `POKEVAULT_TRUST_PROXY` y
las cabeceras reenviadas. No confíes en todas las redes. El límite por IP no
sustituye la protección de tráfico del proxy.

During setup, make one failed login attempt and inspect
`docker compose logs pokevault`: `auth login_failed` should show the client IP.
If it always shows Nginx's IP, correct `POKEVAULT_TRUST_PROXY` and forwarded
headers. Do not trust every network. IP throttling does not replace traffic
protection at the reverse proxy.

Las imágenes base están fijadas por digest y cada servicio tiene un límite de
512 MiB. Revisa periódicamente los digests y `npm --prefix server audit --omit=dev`;
fijar una imagen no instala automáticamente futuras correcciones de seguridad.
`docker/nginx.conf` es solo una referencia de desarrollo estático sin login.

Base images are pinned by digest and each service is limited to 512 MiB.
Review digests and `npm --prefix server audit --omit=dev` periodically; pinning
does not automatically install future security fixes. `docker/nginx.conf` is
only a reference for static development without authentication.
