# Ejecutar PokéVault en tu equipo

[Español](EMPEZAR.md) · [English](GETTING_STARTED.md) · [Volver al proyecto](README.md)

Puedes descargar el ZIP de GitHub (**Code → Download ZIP**) o clonar:

```bash
git clone https://github.com/AyoseMedina/PokeVault.git
cd PokeVault
```

**Para el login, utiliza [Docker o Portainer](#docker-y-portainer-desde-github).**

## Desarrollo local sin login

Este servidor Python conserva el modo estático original y no incluye acceso
autenticado. Está limitado al propio equipo.

1. Si descargaste un ZIP, descomprímelo y entra en la carpeta del proyecto:
   `PokeVault-main` en GitHub o `pokevault-proyecto` en el paquete original.
2. Ejecuta el servidor local:

   **Debian / Ubuntu / Linux:**

   ```bash
   python3 iniciar.py
   ```

   **Windows:**

   ```powershell
   py iniciar.py
   ```

3. Abre **http://127.0.0.1:8000** en tu navegador.
4. Para detener el servidor pulsa **Ctrl+C** en la terminal.

Solo se utiliza la biblioteca estándar de Python. No necesitas instalar paquetes.
El servidor escucha en 127.0.0.1, accesible desde el propio equipo. Puedes elegir
otro puerto con `python3 iniciar.py --port 8080`.

No abras index.html directamente: los módulos JavaScript necesitan un servidor.

## Docker y Portainer desde GitHub

Los despliegues Docker incluyen login y requieren credenciales propias. Para
**Portainer con tu proxy existente usa `docker-compose.yml`**. También se conservan
el modo local (`compose.yaml`) y la opción con Caddy (`compose.cloud.yaml`).
Son archivos completos alternativos para Docker Standalone. La aplicación sigue procesando
las partidas en el navegador; el servidor Node solo gestiona acceso y archivos
web. Docker instala sus dependencias durante la construcción. Swarm no está
configurado en estos stacks.

### Crear tus credenciales una vez

Si tienes Node.js 22 o posterior, desde la raíz del proyecto:

```bash
node server/create-credentials.mjs --write-env
```

El generador pide usuario, contraseña oculta y confirmación. Crea `.env` con el
hash de contraseña y un secreto aleatorio, sin sobrescribir archivos existentes.
No necesita `npm install`. Usa una contraseña larga y exclusiva (15–128 caracteres).

Sin Node instalado, utiliza Docker:

```bash
docker build -t pokevault .
docker run --rm -it pokevault node server/create-credentials.mjs
```

Copia las tres variables que imprime a un archivo `.env` local o a las variables
del stack en Portainer. Son `POKEVAULT_USERNAME`, `POKEVAULT_PASSWORD_HASH` y
`POKEVAULT_SESSION_SECRET`. No publiques esos valores ni los pegues en el Compose
de GitHub. No hay cuenta ni contraseña predeterminada.

### Local: listo sin dominio

```bash
docker compose up -d --build
```

Abre **http://localhost:8080** e inicia sesión. El puerto se publica solo en
127.0.0.1 del equipo Docker. Puedes añadir `POKEVAULT_PORT=8081` a `.env` para
cambiarlo; la dirección de acceso se ajusta automáticamente. Usa `localhost`,
no la IP LAN. Si ya tenías un banco en `http://127.0.0.1:8080`, configura
`POKEVAULT_ORIGIN=http://127.0.0.1:8080` para conservar exactamente ese origen.

Si Docker está en otro equipo, un túnel SSH permite el mismo acceso local:

```bash
ssh -L 8080:127.0.0.1:8080 usuario@TU_SERVIDOR
```

Luego abre `http://localhost:8080` en tu ordenador. Para acceso por dominio o
LAN utiliza HTTPS; no se ofrece login con contraseña por HTTP abierto a la red.

### Tu Nginx existente: despliegue en Portainer

`docker-compose.yml` construye solo PokéVault desde Git y expone el puerto
**8080 dentro de Docker**, sin publicar ningún puerto en el host. No añade
Nginx, Caddy ni una red externa: tú conectas los contenedores a la red que
utilices desde Portainer. No utiliza GitHub Actions ni un registro de imágenes.

Una vez conectados, configura en tu Nginx:

| Campo | Valor |
| --- | --- |
| Dominio público | Tu dominio |
| Esquema del destino | `http` |
| Host del destino | `pokevault` (o el nombre/alias del contenedor en tu red) |
| Puerto del destino | `8080` |
| TLS / SSL | Lo gestiona tu Nginx |

El proxy debe conservar el `Host` público y sobrescribir `X-Forwarded-Proto`
con `https`, así como sanear `X-Forwarded-For` y `X-Forwarded-Host`. Si configuras
Nginx directamente, dentro del bloque HTTPS y su `location /` puedes usar:

```nginx
proxy_pass http://pokevault:8080;
proxy_set_header Host $http_host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Host $http_host;
```

`POKEVAULT_ORIGIN` es la URL pública completa, por ejemplo
`https://pokevault.tudominio.com`, sin barra final. `POKEVAULT_TRUST_PROXY` es la
IP interna de Nginx tal como la ve PokéVault, o una subred dedicada al proxy.
Esto permite validar HTTPS y usar cookies seguras detrás de Nginx. No uses
`true` ni una red más amplia de lo necesario. Si cambia la IP del proxy,
actualiza esta variable o usa su subred dedicada con acceso controlado.

No se necesita una base de datos ni un volumen para partidas: el banco sigue
en el navegador. Mientras preparas el dominio y Nginx, puedes usar el modo local.

### Opcional, sin proxy propio: HTTPS automático con Caddy

1. Crea un registro DNS A (y AAAA solo si IPv6 funciona) apuntando tu dominio
   al servidor. Por ejemplo: `pokevault.tudominio.com`.
2. Asegúrate de que los puertos 80 y 443 estén disponibles y lleguen al servidor.
   Si ya tienes otro proxy ocupándolos, integra el backend con ese proxy en vez
   de lanzar dos servicios sobre los mismos puertos; consulta [Acceso](docs/ACCESS.md).
3. Añade `POKEVAULT_DOMAIN=pokevault.tudominio.com` a `.env`, sin `https://` ni ruta.
4. Ejecuta:

   ```bash
   docker compose -f compose.cloud.yaml up -d --build
   ```

5. Abre `https://pokevault.tudominio.com`. Caddy obtiene y renueva el certificado
   y redirige HTTP a HTTPS. Espera a la emisión inicial si el dominio acaba de crearse.

La aplicación queda en una red interna sin puerto de host; solo Caddy recibe
80/443. `caddy_data` y `caddy_config` conservan certificados y configuración del
proxy. No contienen tus partidas. No elimines esos volúmenes al actualizar.
No se crea ni compra el dominio automáticamente. Mientras no lo tengas, usa local.

### Crear el stack

1. En Portainer **Docker Standalone → Stacks → Add stack → Git Repository**.
2. Nombre: `pokevault`. Repositorio: `https://github.com/AyoseMedina/PokeVault`.
   Es público y no necesita credenciales de lectura. También puedes usar tu fork;
   si es privado, configura su autenticación en Portainer.
3. Referencia: `refs/heads/main`.
4. **Compose path**: `docker-compose.yml` para tu proxy existente.
   Usa `compose.yaml` solo para local, o `compose.cloud.yaml` si necesitas Caddy.
   Son alternativas completas: no combines estos archivos en un mismo stack.
5. Configura las variables:

   | Variable | Tu proxy (`docker-compose.yml`) | Local | Caddy opcional |
   | --- | --- | --- | --- |
   | `POKEVAULT_USERNAME` | Generada, obligatoria | Obligatoria | Obligatoria |
   | `POKEVAULT_PASSWORD_HASH` | Generada, obligatoria | Obligatoria | Obligatoria |
   | `POKEVAULT_SESSION_SECRET` | Generada, obligatoria | Obligatoria | Obligatoria |
   | `POKEVAULT_ORIGIN` | URL HTTPS pública, obligatoria | Opcional, origen local existente | Se obtiene del dominio |
   | `POKEVAULT_TRUST_PROXY` | IP o subred exclusiva del proxy, obligatoria | No se usa | Automática en red aislada |
   | `POKEVAULT_PORT` | No se usa; puerto interno 8080 | Opcional, 8080 | No se usa |
   | `POKEVAULT_DOMAIN` | No se usa | No se usa | Obligatoria, sin esquema ni ruta |

6. **Deploy the stack**. La aplicación debe estar `healthy`. Configura tu proxy
   con el destino indicado arriba y abre la URL HTTPS pública para iniciar sesión.
   En la alternativa con Caddy, revisa sus logs para confirmar el certificado.

La imagen incluye los recursos; no actives volúmenes de rutas relativas ni
montes `./dist`. El archivo `docker/nginx.conf` anterior se conserva como
referencia, pero estos stacks ya no lo usan: servir `dist/` directamente omite
el login. No uses ese servidor estático como despliegue público.

### Actualizar y cambiar de modo

Sube los cambios a la misma rama. No hay workflow de GitHub Actions ni hace falta
ejecutarlo para desplegar. En Portainer usa **Pull and redeploy**, con **Re-pull image** desactivado:
`pull_policy: build` reconstruye desde Git. Si tu versión no admite esa política,
actualiza Portainer/Compose; no la quites sin garantizar la reconstrucción.

Al actualizar desde la versión sin login, configura las tres credenciales antes
de desplegar. El contenedor no arrancará sin ellas. Los reinicios cierran las
sesiones, pero conservan el banco en el navegador. El cierre de sesión tampoco
borra datos. Para recuperar o cambiar la contraseña, ejecuta el generador sin
`--write-env`, sustituye las tres variables y recrea el contenedor.

Para pasar de local a tu proxy, conserva las credenciales, selecciona
`docker-compose.yml` y configura origen HTTPS e IP del proxy. Si eliges Caddy,
usa `compose.cloud.yaml` y configura su dominio. Exporta antes un `.pvault`: cambiar protocolo, dominio/IP,
puerto o perfil de navegador cambia el almacenamiento visible. Restáuralo en
la nueva dirección. El login no sincroniza ni cifra IndexedDB.

### Revisar o detener

```bash
docker compose ps
docker compose logs --tail 50
docker compose down
```

Para tu proxy añade `-f docker-compose.yml` a cada comando; para Caddy,
`-f compose.cloud.yaml`. Sin `-f`, Docker elige `compose.yaml` (local).
`down` sin `-v` conserva
los volúmenes del proxy. No se requieren volúmenes para los Pokémon.

### Publicar una copia propia

El repositorio público se puede clonar o bifurcar sin eliminar su historial.
Para publicar una carpeta que todavía no sea un repositorio Git:

```bash
git init -b main
git add .
git diff --cached --stat
git commit -m "Preparar PokeVault para Docker y Portainer"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Revisa los archivos antes del commit. Incluye aplicación, servidor, lockfile,
configuración, documentación, licencia y pruebas. `.gitignore` excluye `.env`,
guardados, ROM y `.test-output/`; la subida web de GitHub no aplica esas reglas.
No incluyas secretos en archivos, enlaces ni historial. Si ya clonaste, no
vuelvas a inicializar el repositorio ni sustituyas su remoto sin necesidad.

Más detalles: [protecciones y alcance del login](docs/ACCESS.md),
[Portainer desde Git](https://docs.portainer.io/user/docker/stacks/add) y
[HTTPS automático de Caddy](https://caddyserver.com/docs/automatic-https).

## Pokédex y Cristal → GBA

Después de entrar, importa tus partidas. **Pokédex** permite elegir un guardado
para consultar sus marcas reales de vistos/capturados y descripciones de esa
edición. Los textos son referencias incluidas localmente; se indica inglés cuando
falta español. Consulta [Pokédex](docs/POKEDEX.md).

Para copiar de Cristal a Rubí, Zafiro, Esmeralda, Rojo Fuego o Verde Hoja, importa
ambos guardados y selecciona Pokémon del PC. En Transferencias elige el destino
GBA y activa **Cristal → GBA personalizada**. Revisa identidad generada, DVs/IVs,
entrenamiento y procedencia sintética antes de exportar. El ZIP conserva ambos
originales. Consulta la [política personalizada y sus límites](docs/CUSTOM_TRANSFER.md).

## Trasladar tu banco

Los guardados se conservan en el almacenamiento del navegador. El banco local
será independiente del que tengas en el sitio alojado: exporta un respaldo
.pvault desde el sitio e impórtalo aquí para trasladar tus datos.

Conserva el mismo navegador, dirección y puerto para volver a abrir el mismo
banco local. Cambiar el origen web cambia el almacenamiento visible.

No se incluyen partidas personales ni ROM. Las dos entidades públicas de
referencia de tests/fixtures forman parte de las pruebas, con su procedencia
y licencia documentadas. Los guardados generados por los tests no son jugables.

## Pruebas

Con Node.js 22 o posterior, desde esta carpeta:

```bash
npm test
```

Las pruebas de guardados no necesitan `npm install`. Los archivos generados por
las pruebas se guardan en `.test-output/`, dentro del proyecto.

Para el servidor de acceso:

```bash
npm --prefix server ci --ignore-scripts
npm run test:auth
```

## Alojamiento propio

Para alojar con login usa los stacks anteriores. `dist/` sigue siendo una web
estática y puede servirse sin el servidor de acceso solo en desarrollo local.
Los guardados se mantienen en el navegador; el servidor no los recibe.

## Contenido

- dist/: aplicación, conversores, tablas y 649 sprites locales.
- tests/: pruebas de importación, exportación, conversión e integridad.
- iniciar.py: servidor local para Python.
- AGENTS.md: pautas para modificar el proyecto.
- CHANGELOG.md: historial de cambios.
- README.md: alcance, restricciones, rutas y fuentes.
- dist/LICENSE: licencia GPL-3.0.
- LICENSE: copia de la licencia en la raíz para GitHub.
- Dockerfile y docker-compose.yml: servidor de acceso para Portainer y tu proxy.
- compose.yaml y compose.cloud.yaml: alternativas local y Caddy opcional.
- server/: login, sesiones, dependencias de servidor y pruebas de autenticación.
- docker/: Caddy y configuración Nginx anterior conservada como referencia.
- docs/ACCESS.md: protecciones y alcance del login en ambos idiomas.
- README.en.md, GETTING_STARTED.md, CHANGELOG.en.md y AGENTS.en.md: documentación inglesa.
- CONTRIBUTING.md: guía de contribuciones en ambos idiomas.
- docs/assets/: cabecera visual del repositorio.

La exportación conserva los originales y genera archivos nuevos para instalar
manualmente en el emulador. Consulta la guía de la aplicación antes de preparar
transferencias.
