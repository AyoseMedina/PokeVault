# Contribuir a PokéVault / Contributing to PokéVault

[Español](#español) · [English](#english)

## Español

Gracias por ayudar a mejorar PokéVault. Su prioridad es conservar los guardados
originales y bloquear operaciones que puedan perder información.

1. Lee [AGENTS.md](AGENTS.md) y el [alcance del proyecto](README.md).
2. Trabaja en una rama y explica el problema, el cambio y cómo lo comprobaste.
3. Para cambios de lógica, ejecuta `npm test` con Node.js 22 o posterior y añade
   pruebas de los límites o errores relevantes. No necesitas instalar paquetes.
4. Para cambios de interfaz, revisa selección, prevalidación, revisión, respaldo
   y preparación del paquete. Indica qué no pudiste comprobar.
5. Actualiza [CHANGELOG.md](CHANGELOG.md), su [traducción](CHANGELOG.en.md) y la
   documentación afectada en ambos idiomas. Conserva atribuciones y GPL-3.0.

Al abrir una incidencia incluye juego, generación, idioma, formato/tamaño del
archivo, navegador y pasos para reproducirla. **No adjuntes guardados personales,
ROM, respaldos `.pvault`, credenciales ni datos de sesión.** Usa fixtures
sintéticas o entidades públicas con su fuente y licencia documentadas.

Las nuevas rutas necesitan una especificación verificada y pruebas del resultado.
Para cambios del login, instala `npm --prefix server ci --ignore-scripts` y
ejecuta `npm run test:auth`. Consulta [protecciones y alcance](docs/ACCESS.md).
No elimines restricciones para hacer pasar un caso no compatible. Una copia de
datos no debe borrar el origen ni activar evoluciones por intercambio.

## English

Thank you for helping improve PokéVault. Its priority is preserving original
saves and blocking operations that could lose information.

1. Read [the development rules](AGENTS.en.md) and [project scope](README.en.md).
2. Work on a branch and explain the problem, change and verification.
3. For logic changes, run `npm test` with Node.js 22 or newer and add tests for
   relevant boundaries or errors. No package installation is required.
4. For UI changes, check selection, prevalidation, review, backup and package
   preparation. Report any checks you could not perform.
5. Update [CHANGELOG.md](CHANGELOG.md), its [English translation](CHANGELOG.en.md)
   and affected documentation in both languages. Preserve attribution and GPL-3.0.

When opening an issue, include the game, generation, language, file format/size,
browser and reproduction steps. **Do not attach personal saves, ROMs, `.pvault`
backups, credentials or session data.** Use synthetic fixtures or public entities
with documented sources and licenses.

New routes require a verified specification and tests of the converted output.
For login changes, run `npm --prefix server ci --ignore-scripts` and
`npm run test:auth`. See [protections and scope](docs/ACCESS.md#english).
Do not remove restrictions just to allow an unsupported case. A data copy must
not delete the source or trigger trade evolutions.
