<p align="center"><img src="docs/assets/pokevault-banner.svg" alt="PokéVault — Tus aventuras, en un mismo lugar / Your adventures, together in one place" width="100%"></p>

<p align="center"><strong>Español</strong> · <a href="README.en.md">English</a></p>
<p align="center">
  <a href="https://github.com/AyoseMedina/PokeVault/actions/workflows/ci.yml"><img src="https://github.com/AyoseMedina/PokeVault/actions/workflows/ci.yml/badge.svg" alt="Pruebas y Docker"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-GPL--3.0-193f36" alt="Licencia GPL-3.0"></a>
  <img src="https://img.shields.io/badge/Pok%C3%A9mon-generaciones_I%E2%80%93V-a5d8b7?labelColor=193f36" alt="Generaciones I a V">
  <a href="EMPEZAR.md#docker-y-portainer-desde-github"><img src="https://img.shields.io/badge/despliegue-Docker_%2B_Portainer-193f36" alt="Docker y Portainer"></a>
</p>

# PokéVault · Tu HOME clásico

Un banco personal para reunir, organizar y preparar copias de tus Pokémon de generaciones I–V, pensado para R36S / ArkOS. **Tus guardados se procesan y conservan en tu navegador.** No se suben partidas, no hay analítica ni dependencias JavaScript de ejecución.

El código es público y la aplicación se puede alojar en tu propio equipo o servidor. Docker incluye un **login personal validado en el servidor**, y el modo nube añade HTTPS automático con Caddy. Los archivos de guardado se generan localmente y se instalan manualmente en la consola. La interfaz del banco está en español; el login y la documentación están disponibles en español e inglés. Las dependencias del servidor de acceso están separadas del código del navegador.

**[Empezar](EMPEZAR.md) · [Docker y Portainer](EMPEZAR.md#docker-y-portainer-desde-github) · [Historial](CHANGELOG.md) · [Contribuir](CONTRIBUTING.md)**

## Qué puedes hacer

| Función | Descripción |
| --- | --- |
| Importar aventuras | Leer equipo y cajas de 13 juegos, comprobar estructura y checksums y conservar los bytes originales con SHA-256. |
| Organizar tu banco | Crear cajas virtuales de 30 casillas, buscar, filtrar, ordenar, marcar favoritos y añadir notas. La organización no altera las cajas de la partida. |
| Preparar copias | Elegir Pokémon del PC, revisar ruta y cambios y escribir solo en casillas libres de un guardado nuevo. |
| Guardar respaldos | Exportar un banco portátil `.pvault`, fusionar respaldos y recuperar los últimos 25 estados de organización. |
| Instalar con contexto | Descargar un ZIP con originales, resultado, manifiesto y guía manual para R36S / ArkOS. |
| Explorar primero | Usar una demo con datos sintéticos no jugables antes de importar tus partidas. |
| Proteger el acceso | Login ES/EN, contraseñas con hash scrypt, sesiones con caducidad, límites de intentos y cierre de sesión sin borrar el banco. |

## Inicio rápido

```bash
git clone https://github.com/AyoseMedina/PokeVault.git
cd PokeVault
```

[Crea tus credenciales](EMPEZAR.md#crear-tus-credenciales-una-vez) y guárdalas en `.env` o en Portainer. No hay contraseña por defecto. Después:

```bash
docker compose up -d --build
```

Abre **http://localhost:8080** en el equipo Docker.

Para Portainer: repositorio `https://github.com/AyoseMedina/PokeVault`, referencia `refs/heads/main` y **Docker Standalone**. Elige `compose.yaml` para local o `compose.cloud.yaml` para nube. En nube, añade `POKEVAULT_DOMAIN` cuando tengas dominio y DNS; Caddy obtiene y renueva el certificado. Sigue la [guía de despliegue](EMPEZAR.md#crear-el-stack).

El modo estático original se conserva para desarrollo local **sin login**: `py iniciar.py` en Windows o `python3 iniciar.py` en Linux/macOS, en **http://127.0.0.1:8000**, sin instalar paquetes. No lo expongas a Internet.

> El banco está en IndexedDB, no en Docker ni en GitHub. Exporta un `.pvault` antes de cambiar de navegador, dominio, protocolo o puerto; cada origen web tiene su propio almacenamiento.

El login protege el acceso web; no cifra IndexedDB ni separa cuentas dentro de un mismo perfil de navegador. Consulta [protecciones, recuperación y límites](docs/ACCESS.md).

## Juegos y formatos

- Gen I: Amarillo internacional, 32 KiB, 12 cajas y equipo.
- Gen II: Cristal internacional, 32 KiB, 14 cajas y equipo.
- Gen III: Rojo Fuego y Esmeralda internacionales, 128 KiB, 14 cajas y equipo.
- Gen IV: Diamante, Perla, Platino, HeartGold y SoulSilver, 512 KiB, 18 cajas y equipo.
- Gen V: Negro, Blanco, Negro 2 y Blanco 2, 512 KiB, 24 cajas y equipo.
- DS acepta RAW SAV/SRM y DSV con pie reconocido de 40 o 122 bytes. El archivo completo se conserva. No se admiten ROM hacks, savestates, baterías comprimidas de No$GBA ni colas RTC de GB.

## Exportación de copias

Todas las operaciones conservan los Pokémon y guardados de origen y producen un archivo nuevo. No activan evoluciones por intercambio, no simulan un cable Link ni los minijuegos oficiales, y no cambian la Pokédex, bolsa ni progreso.

| Ruta | Soporte |
| --- | --- |
| I→I, II→II, III→III, IV→IV, V→V | Copia dentro de la generación, con restricciones de idioma/formas/objetos |
| I→II | Conversión de Cápsula del Tiempo: raw, nombres, DVs, EVs y EXP conservados; amistad70 y mapa nativo de tasa de captura a objeto |
| III→IV | Parque Compi: PID, ID32, EXP, EVs, IVs, habilidad GenIII, naturaleza, cintas y nombres; procedencia55, fecha explícita, amistad70 y PP GenIV |
| IV→V | Pokétransfer: PID, IVs, naturaleza, nombres y datos; procedencia30001, fecha explícita, amistad70 y PP GenV |
| III→V | Cadena III→IV→V |
| II→III, rutas que atraviesan ese salto y envíos hacia atrás | Bloqueados |

Se bloquean huevos, Pokémon fuera del PC, objetos equipados en origen, destinos en cuarentena, duplicados, casillas ocupadas e idiomas no compatibles. Las conversiones rechazan MO en vez de borrarlas, eventos con fateful, formas no soportadas y recodificaciones con pérdida. La política es conservadora; no es un análisis de legalidad competitiva. No se extraen GTS, guardería, Pokéwalker o caja de combate.

La fecha se fija en la revisión, usando Atlantic/Canary. Los bytes producidos al exportar deben coincidir exactamente con los aprobados. El ZIP incluye originales, resultado, instrucciones y manifiesto con hashes de archivos y entidades, ruta, fecha y cambios.

## Garantías de escritura

- Solo se insertan en huecos libres. Se analiza el resultado, se comprueba cada Pokémon insertado y que los anteriores sigan iguales. Una máscara de rangos bloquea cambios fuera de las zonas autorizadas.
- Amarillo actualiza caja activa/espejo y checksums principal, de banco y por caja. Las cajas inactivas sin inicializar se bloquean.
- Cristal actualiza listas y espejo activo; conserva unidos el backup principal anterior y su checksum separado. Los PC están fuera del checksum principal.
- Gen III actualiza únicamente casillas PC y checksums de sus sectores; conserva la otra copia interna.
- Gen IV escribe en el almacenamiento activo y actualiza su CRC; HGSS registra la caja modificada. Datos generales y copia anterior se conservan.
- Gen V actualiza el bloque de caja, su checksum local/espejo y el CRC de la tabla de checksums. Se conserva el backup y datos auxiliares.
- DSV mantiene longitud y pie exactos; se exporta como DSV.
- Se conserva una copia al importar y otra antes de exportar. El banco guarda puntos de restauración de organización y un respaldo portátil .pvault. El control de revisión evita sobrescribir cambios desde otra pestaña.

## Desarrollo y verificación

Sin instalación: servir `dist` con un servidor estático. `node --test tests/*.test.js` comprueba integridad, formatos, escritura y conversiones. Las fixtures de guardado son sintéticas y no jugables; nunca se incluyen en `dist`. Se usan también entidades públicas de PKHeX y se contrastan campos con las especificaciones originales. Las pruebas no sustituyen la comprobación de una copia real en el emulador o R36S.

Con Node.js 22 o posterior:

```bash
npm test
```

La suite de guardados contiene 62 pruebas y no requiere instalar paquetes. El servidor de acceso tiene 14 pruebas adicionales: instala con `npm --prefix server ci --ignore-scripts` y ejecuta `npm run test:auth`. Los archivos generados van a `.test-output/`. GitHub Actions comprueba ambas suites, login, logout, Docker y la configuración de nube. No publica la web ni una imagen en un registro.

## Mapa del proyecto

| Ruta | Responsabilidad |
| --- | --- |
| `dist/app.js` | Interfaz, IndexedDB, banco, respaldos, revisión y exportación. |
| `dist/core.js` | Lectura GB/GBA, validación común, SHA-256, ZIP y escritura Gen III. |
| `dist/formats.js` | Lectura de Amarillo/DS, contenedores DSV y cifrado de entidades DS. |
| `dist/transfer.js` | Rutas, conversiones y escritura de copias en GB/DS. |
| `dist/*data.js` | Tablas de especies, texto y conversión con procedencia documentada. |
| `dist/styles.css`, `dist/sprites/` | Diseño adaptable y 649 sprites locales. |
| `tests/` | Pruebas y entidades públicas de referencia. |
| `server/` | Servidor de acceso, pantalla ES/EN, generador de credenciales y pruebas. |
| `Dockerfile`, `compose.yaml`, `compose.cloud.yaml`, `docker/` | Login local y despliegue HTTPS con Caddy en Docker / Portainer; configuración Nginx anterior conservada. |
| `iniciar.py` | Servidor Python limitado a `127.0.0.1`. |
| `AGENTS.md` | Reglas de desarrollo y protección de datos; [traducción inglesa](AGENTS.en.md). |

## Documentación en dos idiomas

| Documento | Español | English |
| --- | --- | --- |
| Presentación, compatibilidad y arquitectura | [README](README.md) | [README](README.en.md) |
| Inicio, Docker y Portainer | [Empezar](EMPEZAR.md) | [Getting started](GETTING_STARTED.md) |
| Historial de cambios | [Historial](CHANGELOG.md) | [Changelog](CHANGELOG.en.md) |
| Pautas de desarrollo | [Pautas](AGENTS.md) | [Guidelines](AGENTS.en.md) |
| Contribuciones | [Guía bilingüe](CONTRIBUTING.md#español) | [Bilingual guide](CONTRIBUTING.md#english) |
| Entidades de pruebas y atribución | [Procedencia](tests/fixtures/README.md#español) | [Provenance](tests/fixtures/README.md#english) |
| Login y seguridad | [Acceso](docs/ACCESS.md#español) | [Access](docs/ACCESS.md#english) |

## Fuentes y licencia

Implementación JavaScript original bajo GPL-3.0. Tablas y referencias de [kwsch/PKHeX](https://github.com/kwsch/PKHeX), © sus autores: PK1/PK3/PK4, SAV1/SAV2/SAV3/SAV4/SAV5, StringConverter345, SpeciesName, personal_e y MoveInfo4/5. Licencia en [LICENSE](LICENSE), conservada también en `dist/LICENSE`. Fuentes nativas contrastadas en [pret/pokeyellow](https://github.com/pret/pokeyellow), [pret/pokecrystal](https://github.com/pret/pokecrystal), [pret/pokeemerald](https://github.com/pret/pokeemerald) y [pret/pokefirered](https://github.com/pret/pokefirered). Tablas locales en `data.js`, `formats-data.js` y `transfer-data.js`.

Entidades de referencia: `tests/fixtures/README.md`. Datos de especies y crecimiento: [PokéAPI](https://github.com/PokeAPI/pokeapi). Sprites locales hasta especie649: [PokeAPI/sprites](https://github.com/PokeAPI/sprites). Imágenes y personajes pertenecen a The Pokémon Company. Proyecto personal no oficial.
