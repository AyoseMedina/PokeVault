# Pautas para trabajar en PokéVault

## Objetivo y arquitectura

PokéVault es una aplicación estática de uso personal para gestionar guardados
de Pokémon de generaciones I–V. Los archivos se procesan en el navegador;
IndexedDB conserva el banco. No hay servidor de guardados ni dependencias de
ejecución JavaScript en el navegador. `server/` añade autenticación HTTP para
Docker y Node; no recibe ni almacena guardados. El proxy Nginx existente gestiona
HTTPS; Caddy se conserva como alternativa opcional.

**Cambio autorizado e implementado (2026-11-03):** en modo Docker/Node el banco
completo vive en el servidor, cifrado en el volumen `pokevault_data` según
`docs/SERVER_VAULT.md` (sustituye «no recibe ni almacena guardados» para ese
modo). El análisis y la escritura siguen en el navegador; `iniciar.py` conserva
IndexedDB. Nunca registrar contenido del banco; no sobrescribir ni reinicializar
el volumen; perder `POKEVAULT_DATA_KEY` significa perder el banco.

Archivos principales:

- `dist/app.js`: interfaz, persistencia, respaldo y flujo de revisión/exportación.
- `dist/core.js`: formatos GBC/GBA, validación común, ZIP y escritura Gen III.
- `dist/formats.js`: lectura de Amarillo/DS y cifrado de entidades DS.
- `dist/transfer.js`: rutas, conversiones y escritura de copias en GB y DS.
- `dist/data.js`, `formats-data.js`, `transfer-data.js`: tablas con procedencia documentada.
- `dist/styles.css`: diseño adaptable; conservar el tema Pokémon rojo, blanco y negro solicitado por el usuario.
- `tests/`: pruebas con entidades públicas y guardados sintéticos no jugables.
- `iniciar.py`: servidor local limitado a 127.0.0.1.
- `server/`: login, sesiones, limitación de intentos y recursos de acceso ES/EN.
- `docker-compose.yml`: Portainer detrás del Nginx existente, sin puertos de host.
- `compose.yaml`, `compose.cloud.yaml`: acceso local o Caddy opcional.

## Protección de datos

1. Nunca modificar los bytes originales importados. Trabajar sobre copias.
2. Mantener la validación previa y posterior y el respaldo anterior a exportar.
3. Insertar solo en casillas libres. Bloquear duplicados y comprobar que los
   Pokémon anteriores permanezcan intactos.
4. Conservar la comprobación de rangos de escritura. Actualizar únicamente los
   campos necesarios y los checksums o espejos correspondientes.
5. Mantener el control de revisión de IndexedDB para evitar sobrescribir cambios
   de otra pestaña. No borrar ni reinicializar datos silenciosamente.
6. Preservar la compatibilidad de los respaldos .pvault y de las claves de los
   Pokémon al cambiar el esquema de persistencia.
7. Conservar íntegro el pie DSV cuando el destino tenga ese formato.
8. No incluir ROM, guardados personales, credenciales o datos de sesión en el
   código ni en paquetes. No ampliar la visibilidad del sitio sin autorización
   expresa del usuario.

## Conversiones y compatibilidad

- Rutas actuales: misma generación I–V; I→II; III→IV; IV→V; III→IV→V.
- El usuario autorizó expresamente Cristal II→III personalizada con revisión.
  Sigue `docs/CUSTOM_TRANSFER.md`: campos generados deterministas, activación
  explícita, originales respaldados y resultado verificado. II→IV/V directos y
  envíos hacia atrás siguen bloqueados. Otras rutas necesitan especificación
  comprobada y pruebas de datos convertidos.
- No sustituir caracteres ni recortar nombres para hacerlos encajar. Preservar
  espacios, nombres originales e identidad; bloquear conversiones con pérdida.
- Preservar PID, ID32, experiencia, DVs/IVs, EVs, habilidad y cintas cuando la
  ruta los admite. No generar nuevos valores aleatorios para ocultar problemas.
- La fecha de conversión se fija en la revisión, con zona Atlantic/Canary. El
  resultado final debe coincidir con los bytes revisados.
- No eliminar objetos, MO, huevos, eventos o formas especiales silenciosamente.
  Mantener los bloqueos conservadores y las instrucciones manuales claras.
- El usuario autorizó expresamente (2026-11-03) que las transferencias **muevan**
  el Pokémon en lugar de copiarlo, con evolución por intercambio (también con
  objeto), objetos equipados en la misma generación, registro en la Pokédex del
  destino, nombres y extensiones de archivo exactos y bloqueo del clonado. Sigue
  `docs/MOVE_TRANSFER.md`. Fuera de esa política no se borra el origen ni se
  activan evoluciones, y nunca como efecto implícito o sin mostrarlo en la revisión.
- No afirmar legalidad competitiva por haber superado checksums.

## Desarrollo y comprobaciones

Ejecutar localmente con `python3 iniciar.py` o, en Windows, `py iniciar.py`.
Para cambios de lógica, ejecutar `npm test` con Node.js 22 o posterior y añadir
pruebas de los límites o errores relevantes. No necesitan instalación de paquetes.
Las salidas de prueba van en `.test-output/` y no se incluyen en los entregables.
Los cambios únicamente documentales no requieren repetir pruebas de lógica.

Para cambios de interfaz, revisar el flujo afectado: selección, prevalidación,
revisión de cambios, respaldo y preparación del paquete. Informar de las
comprobaciones que no se hayan podido realizar en el navegador o consola real.

Verificar los detalles de formato con fuentes primarias, como PKHeX y las
descompilaciones de pret citadas en README. Conservar atribuciones y GPL-3.0.
Actualizar CHANGELOG.md con hechos comprobados y EMPEZAR.md si cambia el inicio.
Los cambios en este paquete local no implican publicar una nueva versión del sitio.

Para cambios de acceso, instala con `npm --prefix server ci --ignore-scripts` y
ejecuta `npm run test:auth`, además de `npm test`. No añadas credenciales por
defecto, registro público ni un modo sin autenticación al despliegue Docker.
Mantén el HTTP de desarrollo limitado al host; fuera de él requiere HTTPS.
Cerrar sesión no debe borrar ni reinicializar IndexedDB.

El usuario autorizó (2026-11-03) la cuenta con correo según
`docs/ACCOUNT_EMAIL.md`: datos de la cuenta en un volumen persistente, SMTP con
TLS, cambio y recuperación de contraseña por enlace, y avisos que pueden incluir
un resumen mínimo de Pokémon enviado desde el navegador, que el servidor envía
por correo y descarta. Las partidas y los datos de Pokémon solo se guardan en el
servidor según `docs/SERVER_VAULT.md` (cifrados en el volumen). Las ideas de `docs/ROADMAP.md` no están autorizadas
hasta que tengan su propia especificación.
