# Ejecutar PokéVault en tu equipo

[Español](EMPEZAR.md) · [English](GETTING_STARTED.md) · [Volver al proyecto](README.md)

Puedes descargar el ZIP de GitHub (**Code → Download ZIP**) o clonar:

```bash
git clone https://github.com/AyoseMedina/PokeVault.git
cd PokeVault
```

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

El archivo `compose.yaml` está preparado para **Docker Standalone** con Compose
moderno. Construye la imagen desde el repositorio y sirve `dist/` con Nginx en
el puerto interno 8080. No necesita Node.js, Python ni volúmenes en el servidor.
Docker Swarm requiere una imagen ya construida en un registro; este stack no
está preparado para Swarm.

### Subir el proyecto a GitHub

El repositorio público es **https://github.com/AyoseMedina/PokeVault**. Puedes
desplegar directamente desde él o crear tu propio fork. Conserva la estructura.
Incluye `dist/` completo, `Dockerfile`, `docker/nginx.conf`, `compose.yaml` y
`.dockerignore`, además de documentación, licencia y pruebas. `.gitignore`
excluye guardados, ROM, respaldos, credenciales habituales y salidas de pruebas.
Si usas la subida web de GitHub, esas exclusiones no se aplican automáticamente:
no arrastres `.test-output/`, `.env` ni archivos personales.

Desde una terminal en esta carpeta, si todavía no es un repositorio Git:

```bash
git init -b main
git add .
git diff --cached --stat
git commit -m "Preparar PokéVault para Docker y Portainer"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Este bloque es para publicar una copia propia desde una carpeta sin Git, no
para ejecutarlo después de clonar. Revisa la lista antes del commit. Sustituye
usuario y repositorio por los tuyos; autentícate sin incluir tokens en la URL
ni en archivos. Si ya clonaste el proyecto, conserva su historial y su remoto.

### Crear el stack

1. En tu entorno Docker Standalone de Portainer, abre **Stacks → Add stack**.
2. Nombre: `pokevault`. Selecciona **Git Repository / Repository**.
3. URL: `https://github.com/AyoseMedina/PokeVault` (o una fuente Git, según tu
   versión). Al ser público no necesita credenciales de lectura. Si utilizas
   un fork privado, configura sus credenciales en Portainer.
4. Referencia: `refs/heads/main`. **Compose path**: `compose.yaml`.
5. Configura estas variables en el stack:

   | Variable | Valor inicial | Uso |
   | --- | --- | --- |
   | `POKEVAULT_BIND_IP` | `127.0.0.1` | IP del host Docker donde escuchar |
   | `POKEVAULT_PORT` | `8080` | Puerto libre del host Docker |

6. Pulsa **Deploy the stack** y espera que el contenedor esté **healthy**.

Por defecto solo se abre `http://127.0.0.1:8080` **en el servidor Docker**.
Para entrar desde tu red local o VPN, cambia `POKEVAULT_BIND_IP` por la IP
concreta de ese servidor en esa red, por ejemplo `192.168.1.50`, y abre
`http://192.168.1.50:8080`. No uses la IP del contenedor ni la de tu ordenador
si Docker se ejecuta en otro equipo. El acceso por LAN/VPN queda disponible
para los equipos que puedan alcanzar esa dirección; no hay login incorporado.

Para un dominio, configura HTTPS y autenticación en tu proxy. Si el proxy corre
directamente en el host Docker puede apuntar a `127.0.0.1:8080`. Si corre en otro
contenedor, su `127.0.0.1` no es el host: necesitará una red Docker compartida
con PokéVault y destino `pokevault:8080`, o una dirección del host que pueda
alcanzar. Mantén el acceso privado antes de exponerlo fuera de tu red. La
visibilidad del repositorio no añade autenticación a la web desplegada.

La imagen lleva los recursos dentro; no hay que activar volúmenes de rutas
relativas de Portainer ni montar `./dist`. El servidor no recibe los guardados.

### Actualizar

Sube los cambios a la misma rama de GitHub y utiliza **Pull and redeploy** en
el stack. `pull_policy: build` solicita reconstruir la imagen con ese código.
Para un fork, sube los cambios a tu fork; para este repositorio, espera a que
la comprobación **Tests & Docker** del commit esté en verde antes de actualizar.
Deja desactivada la opción **Re-pull image**: aquí se construye la aplicación
desde Git, no se descarga una imagen de PokéVault publicada en un registro.
Si Portainer rechaza `pull_policy: build`, actualiza su versión de Compose;
no lo elimines sin asegurarte de reconstruir la imagen en cada actualización.

La recreación del contenedor conserva el banco del navegador. Mantén el mismo
protocolo, dominio/IP, puerto y navegador; exporta un `.pvault` antes de cambiar
de dirección y restáuralo en la nueva. Los volúmenes Docker no respaldan el banco.

### Probar Docker en este equipo

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail 50
```

Abre `http://127.0.0.1:8080`. Para detener y retirar el contenedor de este stack:

```bash
docker compose down
```

Puedes copiar `.env.example` a `.env` para cambiar la dirección o el puerto en
una ejecución local; en Portainer configura las variables desde el stack.

Referencias: [stacks desde Git en Portainer](https://docs.portainer.io/user/docker/stacks/add),
[actualización de stacks](https://docs.portainer.io/user/docker/stacks/edit) y
[política de construcción de Compose](https://docs.docker.com/reference/compose-file/services/#pull_policy).

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

No hace falta `npm install`: no hay dependencias. Los archivos generados por
las pruebas se guardan en `.test-output/`, dentro del proyecto.

## Alojamiento propio

La carpeta dist/ se puede servir como web estática. La autenticación del sitio
privado alojado pertenece al servicio de alojamiento y no se incluye en este
código exportado. Para acceso fuera de tu equipo, configura la autenticación
y HTTPS en el servidor que elijas.

## Contenido

- dist/: aplicación, conversores, tablas y 649 sprites locales.
- tests/: pruebas de importación, exportación, conversión e integridad.
- iniciar.py: servidor local para Python.
- AGENTS.md: pautas para modificar el proyecto.
- CHANGELOG.md: historial de cambios.
- README.md: alcance, restricciones, rutas y fuentes.
- dist/LICENSE: licencia GPL-3.0.
- LICENSE: copia de la licencia en la raíz para GitHub.
- Dockerfile, compose.yaml y docker/: construcción y despliegue con Nginx.
- .github/workflows/ci.yml: pruebas y comprobación Docker en GitHub Actions.
- README.en.md, GETTING_STARTED.md, CHANGELOG.en.md y AGENTS.en.md: documentación inglesa.
- CONTRIBUTING.md: guía de contribuciones en ambos idiomas.
- docs/assets/: cabecera visual del repositorio.

La exportación conserva los originales y genera archivos nuevos para instalar
manualmente en el emulador. Consulta la guía de la aplicación antes de preparar
transferencias.
