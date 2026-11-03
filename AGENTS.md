# Pautas para trabajar en PokéVault

## Objetivo y arquitectura

PokéVault es una aplicación estática de uso personal para gestionar guardados
de Pokémon de generaciones I–V. Los archivos se procesan en el navegador;
IndexedDB conserva el banco. No hay servidor de guardados ni dependencias de
ejecución JavaScript en el navegador. `server/` añade autenticación HTTP para
Docker y Node; no recibe ni almacena guardados. Caddy proporciona HTTPS en nube.

Archivos principales:

- `dist/app.js`: interfaz, persistencia, respaldo y flujo de revisión/exportación.
- `dist/core.js`: formatos GBC/GBA, validación común, ZIP y escritura Gen III.
- `dist/formats.js`: lectura de Amarillo/DS y cifrado de entidades DS.
- `dist/transfer.js`: rutas, conversiones y escritura de copias en GB y DS.
- `dist/data.js`, `formats-data.js`, `transfer-data.js`: tablas con procedencia documentada.
- `dist/styles.css`: diseño adaptable; conservar la dirección visual existente.
- `tests/`: pruebas con entidades públicas y guardados sintéticos no jugables.
- `iniciar.py`: servidor local limitado a 127.0.0.1.
- `server/`: login, sesiones, limitación de intentos y recursos de acceso ES/EN.
- `compose.yaml`, `compose.cloud.yaml`: acceso local o HTTPS automático con Caddy.

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
- II→III y los envíos hacia atrás están bloqueados. No habilitar rutas sin una
  especificación comprobada y pruebas de datos convertidos.
- No sustituir caracteres ni recortar nombres para hacerlos encajar. Preservar
  espacios, nombres originales e identidad; bloquear conversiones con pérdida.
- Preservar PID, ID32, experiencia, DVs/IVs, EVs, habilidad y cintas cuando la
  ruta los admite. No generar nuevos valores aleatorios para ocultar problemas.
- La fecha de conversión se fija en la revisión, con zona Atlantic/Canary. El
  resultado final debe coincidir con los bytes revisados.
- No eliminar objetos, MO, huevos, eventos o formas especiales silenciosamente.
  Mantener los bloqueos conservadores y las instrucciones manuales claras.
- Distinguir una copia de datos de un intercambio real: no borrar el origen ni
  activar evoluciones por intercambio como efecto implícito.
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
