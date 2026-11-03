<p align="center"><img src="docs/assets/pokevault-banner.svg" alt="PokéVault — Tus aventuras, en un mismo lugar / Your adventures, together in one place" width="100%"></p>

<p align="center"><strong>Español</strong> · <a href="README.en.md">English</a></p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-GPL--3.0-191b22" alt="Licencia GPL-3.0"></a>
  <img src="https://img.shields.io/badge/Pok%C3%A9mon-generaciones_I%E2%80%93V-ef4054?labelColor=191b22" alt="Generaciones I a V">
  <a href="EMPEZAR.md#docker-y-portainer-desde-github"><img src="https://img.shields.io/badge/despliegue-Docker_%2B_Portainer-191b22" alt="Docker y Portainer"></a>
</p>

# PokéVault · Tu HOME clásico

Un banco personal para reunir, organizar y **mover** tus Pokémon entre partidas de
generaciones I–V, pensado para R36S / ArkOS y otros emuladores. Lee y escribe los
guardados de batería (`.sav`, `.srm`, `.dsv`) con validación antes y después, y
prepara un paquete para copiar a la SD. Es un proyecto personal no oficial.

Hay dos formas de usarlo:

- **Docker / Portainer (recomendado):** login personal, cuenta con correo y el
  banco completo **cifrado en tu servidor** (volumen `pokevault_data`), igual en el
  móvil y en el ordenador.
- **Modo local sin login (`iniciar.py`):** para desarrollo; el banco vive en el
  navegador (IndexedDB).

Las partidas se analizan y se escriben **en tu navegador**; el servidor guarda,
valida y sirve el banco cifrado. No hay analítica ni servicios externos, salvo el
SMTP que configures para el correo.

**[Empezar](EMPEZAR.md) · [Docker y Portainer](EMPEZAR.md#docker-y-portainer-desde-github) · [Historial](CHANGELOG.md) · [Contribuir](CONTRIBUTING.md)**

## Qué puedes hacer

| Función | Descripción |
| --- | --- |
| Importar aventuras | Equipo y cajas de 16 juegos, con estructura y checksums comprobados y los bytes originales conservados con SHA-256. |
| Organizar tu banco | Cajas virtuales de 30 casillas, búsqueda, filtros, orden, favoritos y notas, sin alterar las cajas de la partida. |
| Ver a tus Pokémon | Sprites animados de Negro/Blanco y variocolor cuando lo son; estáticos si el sistema pide reducir movimiento. |
| Mover Pokémon | Salen del origen y entran en el destino, como un intercambio real: evolución por intercambio, objetos, Pokédex del destino y bloqueo del clonado. [Política](docs/MOVE_TRANSFER.md). |
| Cartas y sobres | Cada Pokémon como carta coleccionable de diseño propio (PS reales, ataques y tabla de tipos de su generación, rareza, holográfica si es variocolor) y sobres que se abren al recibir Pokémon nuevos. [Detalles](docs/CARDS.md). |
| Animaciones | Viaje de cada Pokémon y su evolución al preparar el paquete; repetibles desde el historial y con ejemplo en la demo. [Detalles](docs/ANIMATIONS.md). |
| Consultar la Pokédex | Vistos/capturados reales por partida y descripciones: inglés exacto de la edición o español de una edición posterior indicada. [Cobertura](docs/POKEDEX.md). |
| Banco en el servidor | AES-256-GCM, revisiones con control de conflictos entre dispositivos y 50 versiones restaurables. [Diseño](docs/SERVER_VAULT.md). |
| Cuenta y correo | Cambio y recuperación de contraseña por enlace, avisos de seguridad y mensajes opcionales (resumen semanal, aniversarios, movimientos, recordatorio de respaldo). [Detalles](docs/ACCOUNT_EMAIL.md). |
| R36S ⇄ Wii | Conversor `.srm` ⇄ `.sav` para Visual Boy Advance GX; en Cristal lleva también el reloj (`.rtc`). [Cómo se usa](EMPEZAR.md#r36s--wii-visual-boy-advance-gx). |
| Respaldos | `.pvault` portátil con originales, historial y versiones consumidas; puntos de restauración de la organización. |
| Explorar primero | Demo con datos sintéticos no jugables, incluida la animación de intercambio y evolución. |

Tema Poké Ball rojo, blanco y negro, adaptado a móviles y tabletas. La interfaz
del banco está en español; el login y la documentación, en español e inglés.

## Inicio rápido

```bash
git clone https://github.com/AyoseMedina/PokeVault.git
cd PokeVault
node server/create-credentials.mjs --write-env   # usuario, hash, secreto de sesión y clave del banco
docker compose up -d --build
```

Abre **http://localhost:8080** en el equipo Docker. No hay contraseña por defecto.
Sin Node local, [genera las credenciales con Docker](EMPEZAR.md#crear-tus-credenciales-una-vez).

> **Guarda `POKEVAULT_DATA_KEY` fuera del servidor** (gestor de contraseñas). Cifra
> tu banco: si la pierdes, pierdes el banco, incluso con copias del volumen.

**Portainer con tu Nginx:** repositorio `https://github.com/AyoseMedina/PokeVault`,
referencia `refs/heads/main`, **Docker Standalone** y `docker-compose.yml` (sin
puertos de host; tú conectas la red del proxy). Variables obligatorias: credenciales,
`POKEVAULT_DATA_KEY`, `POKEVAULT_ORIGIN` y `POKEVAULT_TRUST_PROXY`. SMTP opcional.
`compose.yaml` es para local y `compose.cloud.yaml` añade Caddy si no tienes proxy.
[Guía completa](EMPEZAR.md#crear-el-stack).

**Modo local sin login:** `py iniciar.py` (Windows) o `python3 iniciar.py`, en
**http://127.0.0.1:8000**, sin instalar paquetes. Solo para tu equipo.

Si ya tenías un banco en el navegador, al entrar en modo servidor la web ofrece
**subirlo** y lo verifica; la copia del navegador solo se borra si lo confirmas.

## Juegos y formatos

- Gen I: Amarillo internacional, 32 KiB, 12 cajas y equipo.
- Gen II: Cristal internacional, 32 KiB, 14 cajas y equipo; también el `.sav` de Visual Boy Advance GX (Wii) con su reloj, que se conserva.
- Gen III: Rubí, Zafiro, Esmeralda, Rojo Fuego y Verde Hoja internacionales, 128 KiB, 14 cajas y equipo.
- Gen IV: Diamante, Perla, Platino, HeartGold y SoulSilver, 512 KiB, 18 cajas y equipo.
- Gen V: Negro, Blanco, Negro 2 y Blanco 2, 512 KiB, 24 cajas y equipo.
- DS acepta SAV/SRM de 512 KiB y DSV con pie reconocido de 40 o 122 bytes, que se conserva íntegro. No se admiten ROM hacks, estados rápidos, baterías comprimidas de No$GBA ni colas RTC de GB.

## Mover Pokémon

La política [pokevault-move-v1](docs/MOVE_TRANSFER.md) genera un archivo por cada
partida de origen y otro para el destino. El ZIP trae
`copiar-a-la-SD/<gb|gbc|gba|nds>/` con el **nombre y la extensión exactos** de cada
archivo importado (`.srm`, `.sav` o `.dsv`): instala **todos o ninguno**,
comprobando antes el hash de la SD. `originales/` es solo para deshacer.

| Ruta | Herramienta real | Evolución por intercambio |
| --- | --- | --- |
| I→I · II→II · III→III · IV→IV · V→V | Intercambio | Sí |
| I→II | Cápsula del Tiempo | Sí |
| Cristal II→III (Rubí/Zafiro/Esmeralda/RF/VH) | Conversión personalizada no oficial ([política](docs/CUSTOM_TRANSFER.md)) | Sí |
| III→IV · IV→V · III→IV→V | Parque Compi · Pokétransfer | No, como en los juegos |
| II→IV/V directos y envíos hacia atrás | — | Bloqueados |

- **Evoluciones:** Kadabra, Machoke, Graveler, Haunter, Boldore, Gurdurr y las de
  objeto (Roca del Rey, Revestimiento Metálico, Escamadragón, Mejora…; el objeto se
  consume). La Piedra Eterna las impide. Sin mote, toma el nombre en el idioma del
  cartucho de destino. Si aprendería un movimiento al nivel actual, se bloquea.
- **Objetos:** viajan con el Pokémon según [tablas generadas desde PKHeX](docs/ITEM_TRANSFER.md);
  en IV→V vuelven a la mochila del juego de origen, como en Pokétransfer.
- **Pokédex del destino:** se registran la especie recibida y la evolucionada.
- **Anticlonado:** las versiones usadas quedan consumidas; no se pueden reutilizar ni
  reimportar (tampoco desde `originales/` o un `.pvault`). **Anular exportación**
  exige confirmar que no se instaló nada. Después, importa los archivos nuevos.
- Se bloquean huevos, Pokémon del equipo, Cartas, MO al avanzar de generación,
  eventos y formas no verificadas, duplicados y textos con pérdida. No es un
  análisis de legalidad competitiva. [Fuentes y límites](docs/MOVE_IMPLEMENTATION.md).

La fecha se fija en la revisión (zona Atlantic/Canary) y los bytes exportados deben
coincidir con los revisados. El manifiesto incluye hashes de archivos y entidades.

## Garantías de escritura

- Los bytes importados nunca se modifican: se trabaja sobre copias. Solo se inserta
  en casillas libres y una máscara de rangos bloquea cambios fuera de lo autorizado.
- Tras escribir se vuelve a leer: cada Pokémon movido, los que ya estaban (origen y
  destino), la Pokédex y todos los checksums o CRC (principal, bancos, espejos,
  tabla de Gen V y mochila de Gen IV). DSV conserva longitud y pie exactos.
- Copia al importar y antes de exportar, puntos de restauración y control de
  revisión: en el navegador entre pestañas; en el servidor entre dispositivos (409).

## Seguridad y privacidad

- Login con scrypt, sesiones con caducidad, CSRF, límites de intentos y cierre de
  todas las sesiones al cambiar o restablecer la contraseña. [Acceso](docs/ACCESS.md).
- Banco y cuenta cifrados en el volumen con AES-256-GCM; el servidor valida cada
  revisión y el navegador comprueba el SHA-256 de cada original que descarga.
- El correo solo sale por TLS. Los avisos con Pokémon (opcionales) envían especie,
  mote, nivel y juego a tu proveedor de correo.

## Desarrollo y verificación

Con Node.js 22 o posterior:

```bash
npm test                                   # 165 pruebas de formatos, escritura y movimientos
npm --prefix server ci --ignore-scripts
npm run test:auth                          # 38 pruebas de acceso, banco cifrado y cuenta
```

Con Playwright (ver [VALIDATION](docs/VALIDATION.md)): `npm run test:browser`,
`test:browser:move`, `test:browser:vault` y `test:browser:account`. Las partidas de
prueba son sintéticas y no jugables; las salidas van a `.test-output/`. Las pruebas
no sustituyen comprobar una copia real en el emulador o la R36S. No hay GitHub
Actions: Portainer construye directamente desde Git.

## Mapa del proyecto

| Ruta | Responsabilidad |
| --- | --- |
| `dist/app.js` | Interfaz, banco, respaldos, revisión, exportación, cuenta y animaciones. |
| `dist/core.js`, `dist/formats.js` | Lectura GB/GBA/DS, validación, SHA-256, ZIP y cifrado de entidades DS. |
| `dist/move*.js`, `dist/consumed.js` | Movimiento, objetos, evoluciones, Pokédex y versiones consumidas. |
| `dist/transfer.js`, `dist/custom-transfer.js` | Rutas y conversiones, incluida Cristal → GBA. |
| `dist/vault.js`, `dist/server-vault.js`, `dist/backup.js` | Banco en IndexedDB o en el servidor y respaldos `.pvault`. |
| `dist/cards*.js`, `dist/packs*.js`, `dist/card-data.js` | Cartas, sobres y sus datos de PokéAPI. |
| `dist/animations.js`, `dist/pokedex*.js` | Animaciones y Pokédex con descripciones locales. |
| `dist/emulator-convert.js` | Conversor R36S ⇄ Wii, incluido el reloj de Cristal. |
| `dist/*data.js`, `dist/sprites/` | Tablas con procedencia y sprites 1–649 (estáticos, variocolor y animados). |
| `server/` | Login, banco cifrado (`vault-*`), cuenta y correo (`account-store`, `mailer`, `notifications`), páginas públicas y `vault-admin.mjs`. |
| `scripts/` | Generadores reproducibles de tablas, Pokédex y sprites. |
| `tests/`, `server/tests/` | Pruebas unitarias y de navegador. |
| `Dockerfile`, `docker-compose.yml`, `compose*.yaml`, `docker/` | Portainer con tu Nginx, local y Caddy opcional. |
| `iniciar.py` | Servidor local limitado a `127.0.0.1`. |
| `AGENTS.md` | Reglas de desarrollo y protección de datos ([English](AGENTS.en.md)). |

## Documentación

| Documento | Español | English |
| --- | --- | --- |
| Presentación | [README](README.md) | [README](README.en.md) |
| Inicio, Docker, Portainer, correo y copias | [Empezar](EMPEZAR.md) | [Getting started](GETTING_STARTED.md) |
| Historial | [Historial](CHANGELOG.md) | [Changelog](CHANGELOG.en.md) |
| Login y seguridad | [Acceso](docs/ACCESS.md#español) | [Access](docs/ACCESS.md#english) |
| Banco en el servidor · Cuenta y correo | [SERVER_VAULT](docs/SERVER_VAULT.md) · [ACCOUNT_EMAIL](docs/ACCOUNT_EMAIL.md) | (resumen al final de cada uno) |
| Mover, objetos, Cristal → GBA, Pokédex, animaciones | [MOVE_TRANSFER](docs/MOVE_TRANSFER.md) · [ITEM_TRANSFER](docs/ITEM_TRANSFER.md) · [CUSTOM_TRANSFER](docs/CUSTOM_TRANSFER.md) · [POKEDEX](docs/POKEDEX.md) · [ANIMATIONS](docs/ANIMATIONS.md) · [CARDS](docs/CARDS.md) | (bilingües o con resumen) |
| Pruebas y validación | [VALIDATION](docs/VALIDATION.md) | [VALIDATION](docs/VALIDATION.md) |
| Pautas de desarrollo | [Pautas](AGENTS.md) | [Guidelines](AGENTS.en.md) |
| Contribuciones y entidades de prueba | [Guía](CONTRIBUTING.md#español) · [Procedencia](tests/fixtures/README.md#español) | [Guide](CONTRIBUTING.md#english) · [Provenance](tests/fixtures/README.md#english) |

## Fuentes y licencia

Implementación JavaScript original bajo GPL-3.0 ([LICENSE](LICENSE), también en
`dist/LICENSE`). Tablas y referencias de [kwsch/PKHeX](https://github.com/kwsch/PKHeX),
© sus autores. Fuentes nativas contrastadas en [pret/pokeyellow](https://github.com/pret/pokeyellow),
[pret/pokecrystal](https://github.com/pret/pokecrystal), [pret/pokeemerald](https://github.com/pret/pokeemerald),
[pret/pokefirered](https://github.com/pret/pokefirered), [pret/pokeplatinum](https://github.com/pret/pokeplatinum)
y [pret/pokeheartgold](https://github.com/pret/pokeheartgold). Especies, descripciones y
sprites de [PokéAPI](https://github.com/PokeAPI/pokeapi) y [PokeAPI/sprites](https://github.com/PokeAPI/sprites)
con versiones fijadas. Entidades de prueba: `tests/fixtures/README.md`. Imágenes y
personajes pertenecen a Nintendo, Creatures, GAME FREAK y The Pokémon Company.
Proyecto personal no oficial.
