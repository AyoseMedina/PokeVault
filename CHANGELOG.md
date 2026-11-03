# Historial de cambios

[Español](CHANGELOG.md) · [English](CHANGELOG.en.md)

Las entradas documentan los cambios realizados en este proyecto. No representan
versiones semánticas ni garantizan pruebas de funcionamiento en una R36S real.

## 2026-11-03 · Cuidados, compañero y juegos (sin despliegue)

- Cuidados en la ficha: acariciar, jugar y dar bayas; cariño con corazones y ánimo
  según el tiempo. Sabor favorito por naturaleza real en Gen III–V.
- Compañero en Mi banco, recompensa diaria con racha y sección Juegos: ¿Quién es?,
  Parejas, Lluvia de bayas y Duelo de tipos, con bayas de premio y récords.
- Enlaces a WikiDex en la ficha, la Pokédex y las cartas. Todo es solo de
  PokéVault: no cambia ninguna partida.

## 2026-11-03 · Buscador global (sin despliegue)

- Botón «Buscar» en la barra superior y atajos **Ctrl+K** y «/». Busca Pokémon por
  nombre, mote, número, tipo, entrenador, caja, notas o variocolor; partidas;
  especies de la Pokédex y secciones o acciones. Sin tildes ni mayúsculas, con
  flechas y Enter, y botón directo a la carta de cada Pokémon.

## 2026-11-03 · Cartas y sobres (sin despliegue)

- Página «Cartas»: cada Pokémon del banco como carta de diseño propio, con PS
  reales, fase según la generación, ataques con su potencia de esa generación,
  debilidad/resistencia con su tabla de tipos, rareza y brillo holográfico en
  variocolor. Reverso con DV/IV, entrenamiento y Pokédex.
- Sobres de hasta 10 cartas al recibir Pokémon nuevos (también tras una
  evolución por intercambio) y sobres de bienvenida; animación de abrir y girar
  cartas, con la más rara al final.
- Datos de PokéAPI fijados (`scripts/build-card-data.mjs`) y pruebas de cálculo,
  generaciones y sobres.

## 2026-11-03 · Conversor R36S ⇄ Wii (sin despliegue)

- «Convertir R36S ⇄ Wii» en Mis partidas: `.srm` (RetroArch) ⇄ `.sav` (Visual Boy
  Advance GX) para Game Boy y GBA, con nombre exacto y verificación de los Pokémon.
- Cristal conserva el reloj: el `.rtc` de gambatte se convierte al bloque de reloj
  de VBA GX y al revés (ZIP con `.srm` y `.rtc`). Formatos verificados en el código
  de VBA GX y gambatte-libretro.
- Se importan y mueven directamente los `.sav` de Cristal de VBA GX, con su reloj
  intacto (como el pie de los `.dsv`).

## 2026-11-03 · Animaciones de intercambio y evolución (sin despliegue)

- Al preparar un movimiento se ve viajar a cada Pokémon (Intercambio, Cápsula del
  Tiempo, Parque Compi, Pokétransfer o conversión personalizada) y, si corresponde,
  su evolución, con avisos de objeto consumido, Piedra Eterna y variocolor.
  Diseño propio; solo refleja el resultado ya verificado y no cambia datos.
- «Saltar» y «Ver todos de golpe»; la evolución no se cancela. Cerrar la animación
  siempre lleva a la descarga. Repetición desde el historial y ejemplo en la demo.
- Preferencia completas/reducidas/desactivadas por navegador; respeta «reducir
  movimiento». Probado en Chromium (escritorio, móvil y reducido).

## 2026-11-03 · Cuenta y correo (sin despliegue)

- Página «Cuenta»: correo con confirmación por enlace, cambio de contraseña (cierra
  las demás sesiones) y avisos por correo. Datos cifrados en `/data/account.enc`.
- Recuperación con enlace de un solo uso (15 min, token en el fragmento, misma
  respuesta siempre, 1 cada 5 min y 3 por hora) y reinicio de emergencia
  `vault-admin.mjs reset-account`.
- SMTP solo con TLS (465/587), `nodemailer` 10.1.7 fijado, límites de envío,
  plantillas escapadas y sin registrar contenido. Avisos de seguridad siempre;
  resumen semanal, aniversarios, movimientos y recordatorio de respaldo opcionales,
  generados en el servidor desde el banco.
- Pruebas de servidor y Chromium (confirmación, avisos, cambio y recuperación).

## 2026-11-03 · Sprites variocolor y animados (sin despliegue)

- Los Pokémon variocolor se muestran con su sprite variocolor (banco, ficha,
  selección y revisión del movimiento).
- Sprites animados de Negro/Blanco en el banco y en las fichas. Con «reducir
  movimiento» del sistema se mantienen los estáticos.
- 1.947 archivos locales de PokeAPI/sprites con versión fijada y SHA-256 en
  `dist/sprites/SOURCES.json` (`scripts/build-sprites.mjs`); unos 60 MB más en la
  imagen Docker. La web solo carga imágenes propias, como exige la CSP.

## 2026-11-03 · Banco en el servidor (sin despliegue)

- En Docker/Node el banco completo se guarda en el volumen `pokevault_data`,
  cifrado con AES-256-GCM y la clave `POKEVAULT_DATA_KEY` (obligatoria; sin ella
  no arranca). Escritura atómica, originales sin duplicados por SHA-256, control de
  revisión con If-Match (409 ante cambios de otro dispositivo) y 50 versiones
  restaurables sin liberar versiones movidas.
- El servidor vuelve a validar esquema, tamaños, cuota, partidas nuevas con el
  mismo lector y el registro de versiones consumidas. El navegador comprueba el
  SHA-256 de cada original descargado.
- Subida explícita y verificada del banco anterior del navegador; la copia local
  solo se borra con confirmación. `iniciar.py` sigue usando IndexedDB.
- `vault-admin.mjs verify | rotate-key`, volumen y clave en los tres Compose,
  generador de credenciales y guías. Probado en Chromium y en Docker (raíz de
  solo lectura, reinicio y permisos del volumen).

## 2026-11-03 · Pokédex en español (sin despliegue)

- PokéAPI no tiene texto español para ninguna edición de generación I–V. En
  español se muestra el texto oficial de una edición posterior (Let's Go, Rubí
  Omega/Zafiro Alfa o X/Y), indicada siempre. «English» mantiene el texto exacto.
- Corregidas las palabras partidas al final de línea en las descripciones
  (por ejemplo «moun tains», «bluish- white») en todas las ediciones afectadas, sobre todo Amarillo y Cristal.

## 2026-11-03 · Movimiento, fase 3 y corrección de idioma (sin despliegue)

- Objetos equipados según las tablas generadas de PKHeX, equivalencias II→III
  y III→IV, consumo al evolucionar y devolución IV→V a la mochila de origen.
  Límites, ordenación nativa de MT/bayas, cantidades y CRC verificados. Cartas
  y III→IV→V con objeto bloqueados.
- Renombrado según cartucho de destino: idioma GB/GBA elegido al importar,
  campos verificados IV/V y confirmación para bancos GBA antiguos. Esmeralda y
  RF/VH conservan nombres extranjeros; IV usa el nombre del cartucho sin mote.
  Renombrados R/S ambiguos por revisión y extranjeros sin mote V bloqueados
  hasta poder verificarlos; los motes se conservan byte por byte.
- Pruebas de objetos, todas las evoluciones, idiomas cruzados, compactación,
  Pokédex/espejos y anticlonado. Chromium: flujo completo con evolución y objeto,
  revisión móvil, ZIP, consumo, reimportación, respaldo/restauración y anulación.
- Guía, LEEME ES/EN, rutas, README y fuentes actualizados. Sin despliegue del sitio.

## 2026-11-03 · Movimiento, fase 2 (sin despliegue)

- Evoluciones por intercambio según ruta, nombres exactos, habilidad de la
  evolución y bloqueo por aprendizaje al nivel actual. Piedra Eterna respetada.
- Pokédex del destino con copias y metadatos de formas, género e idioma;
  verificación de las demás especies y de todos los Pokémon anteriores.
- Tablas reproducibles y fuentes primarias documentadas. Las formas no base
  con registro propio en V quedan bloqueadas por una discrepancia no resuelta
  con código nativo; se explica en MOVE_IMPLEMENTATION.md.

## 2026-11-03 · Movimiento, fase 1 (sin despliegue)

- Retirada verificada del PC en I–V: compactación GB y caja activa, casillas
  vacías nativas GBA/DS, máscaras de escritura, checksums y pie DSV intacto.
- ZIP con todos los resultados en copiar-a-la-SD, nombres y extensiones exactos,
  originales y hashes antes/después. Bloqueo de origen igual a destino y colisiones.
- Versiones consumidas con registro por hash, bloqueo de reimportación, respaldo
  compatible con schema 1 y anulación confirmada registrada en historial.
- Pruebas sintéticas de las cinco generaciones y regresiones Chromium de
  persistencia, recuperación y acceso. Sin prueba en consola o emulador real.

## 2026-11-03 · Protección del banco, recuperación y acceso

- Aislada la demo del banco persistido: salida mediante relectura, importación y
  restauración protegidas frente a un banco real, incluso si no tiene Pokémon.
- Migración atómica a IndexedDB v2, originales únicos por SHA-256 y escritura
  de metadatos sin copiar los bytes. Se mantienen claves y controles de revisión.
  Esquemas desconocidos bloquean escrituras y ofrecen recuperación en bruto.
- Partidas ilegibles en cuarentena, exportables sin bloquear las demás. Respaldo
  .pvault v2 con originales, respaldos e historial; lectura v1 conservada.
  Validación previa de idiomas, fechas, referencias y límite combinado de partidas.
- Persistencia solicitada al navegador, cuota/uso visibles y recordatorios de
  copia externa. Retirada de versiones con descarga previa y confirmación escrita.
- Login limitado por IP después de CSRF/JSON; eliminado el bloqueo global de la
  cuenta. Sesiones autenticadas separadas de las anónimas. Arranque bloqueado
  si no se puede insertar el punto de entrada autenticado. Aviso de caducidad
  que conserva operaciones abiertas y archivos pendientes antes de navegar.
- Cristal valida la coincidencia de su caja activa y la copia; la relectura
  posterior la vuelve a comprobar. LEEME corregido para Cristal → GBA.
- Imágenes Docker fijadas por digest, límite de 512 MiB por servicio y aviso
  explícito en el ejemplo Nginx estático. Auditoría npm: 0 vulnerabilidades.
- Superadas 97 pruebas de lógica/datos, 18 de acceso y regresiones en Chromium
  aislado: demo, migración, conflictos, fallo de cuota, respaldos, recuperación,
  retirada confirmada y cierre de sesión. Flujo móvil de transferencia comprobado.
  No se ha probado en teléfonos físicos ni consola real.

## 2026-11-03 · Interfaz completa para móviles

- Añadido menú móvil con las seis secciones, control del foco y fondo inactivo
  mientras una ventana está abierta. Se conserva la navegación de escritorio.
- Ampliados los controles táctiles y campos de entrada; restauradas en móvil las
  opciones de renombrar cajas y cambiar entre lista y cuadrícula. La selección
  permite mover Pokémon sin arrastrar y mantiene visibles sus acciones al bajar.
- Adaptados login, banco, partidas, Pokédex, fichas, cajas originales, revisión,
  respaldos y guía; textos legibles, tablas ajustadas y ventanas desplazables
  con cierre accesible, áreas seguras y altura dinámica.
- Comprobados los seis apartados entre 320 y 850 píxeles, orientación horizontal,
  pantalla de poca altura y escritorio en Chromium aislado. Probados importación,
  selección táctil, cajas, notas, prevalidación, revisión, respaldo y descarga ZIP.
  Superadas 89 pruebas de datos/lógica y 14 de acceso.
- No se han probado teléfonos físicos ni el teclado virtual de iOS/Android.
  Se conservan los formatos, las validaciones y los originales de las partidas.

## 2026-11-03 · Pokédex, Cristal → GBA y tema Pokémon

- Añadida Pokédex de solo lectura por partida, con contadores nacionales reales
  de vistos/capturados, filtros, búsqueda, paginación y aviso de inconsistencias.
  Se usa el bloque activo validado; no se deducen capturas de las cajas ni se
  cambian los guardados o el esquema `.pvault`.
- Incluidas descripciones de la edición en las fichas, disponibles sin Internet.
  La fuente fijada tiene inglés para estas ediciones, pero no español; se muestra
  el idioma explícitamente sin sustituir textos por los de otro juego.
- Añadidos Rubí, Zafiro y Verde Hoja: 16 juegos compatibles. Cristal → los cinco
  juegos GBA tiene una conversión personalizada no oficial con activación,
  política v1 documentada, revisión de valores y detalles en el manifiesto.
  Conserva originales y bloqueos; genera identidad determinista, adapta DVs y
  entrenamiento y declara la procedencia sintética. No certifica legalidad.
- Sustituida la paleta verde por rojo, blanco y negro en aplicación, login,
  favicon y cabecera del repositorio; se conservan las funciones existentes.
- Superadas 89 pruebas de lógica/datos y 14 de acceso. Comprobados en Chromium
  de pruebas aislado: login, importación, Pokédex, ficha, selección, prevalidación,
  revisión personalizada, respaldo, ZIP, persistencia tras recarga y vista móvil.
  Verificados los originales, CRC ZIP, manifiesto y SHA-256 del paquete generado.
- No se han utilizado partidas personales ni ROM, ni se ha validado una consola
  física. La conexión del Nginx del usuario permanece a su cargo.

## 2026-11-03 · Portainer con Nginx existente

- Añadido `docker-compose.yml` que construye solo PokéVault desde Git y expone
  8080 internamente, sin publicar puertos en el host ni definir redes externas.
  La conexión a la red de Nginx queda a cargo del administrador en Portainer.
- El stack requiere credenciales, URL HTTPS pública e IP o subred del proxy
  de confianza. Nginx existente gestiona dominio y certificados.
- Retirados el workflow de GitHub Actions, sus insignias y el requisito de
  esperar comprobaciones remotas para desplegar. Se conservan las pruebas locales.
- Actualizadas las guías ES/EN; conservados el modo local y Caddy como opción
  independiente para quien no disponga de proxy. Aplicación y banco intactos.
- Superadas 62 pruebas de guardados y 14 de acceso. Verificados login, cookies
  Secure, recursos originales protegidos y logout detrás de Nginx por HTTPS
  con certificado de prueba; el contenedor de la aplicación no publica puertos.
  No se ha modificado ni probado el Nginx o Portainer del usuario.

## 2026-11-03 · Login personal y modos local/nube

- Añadido servidor de acceso con Express, pantalla ES/EN, generador de
  credenciales, hash scrypt y sesiones con cookies protegidas y caducidad.
- Protegidos los recursos de la aplicación; añadidos límites de intentos,
  validación de origen/Host, CSRF, CSP y cierre de sesión entre pestañas.
- Docker requiere credenciales propias y falla cerrado si faltan. Local
  permanece en loopback; nube añade Caddy y certificados HTTPS automáticos
  cuando se configura un dominio con DNS y puertos disponibles.
- Conservado el modo estático Python para desarrollo local sin login y la
  configuración Nginx anterior como referencia. No se borran datos del banco.
- El botón de recarga tras un error de inicio usa un listener compatible con
  CSP en lugar de código en línea. Lectores, conversiones y persistencia intactos.
- Añadidas 14 pruebas del servidor de acceso y comprobación HTTP de Docker.
  Documentación de configuración, recuperación y límites actualizada en ES/EN.
- Superadas 62 pruebas de guardados y 14 de acceso; comprobados login, archivos
  protegidos y logout en Docker local y en HTTPS con Caddy y una CA de prueba.
- La herramienta de ordenador no autorizó el uso de Edge: la revisión visual
  y el flujo completo de exportación en navegador quedan pendientes. No se
  han probado una consola real ni certificados públicos sin dominio configurado.

## 2026-11-03 · Repositorio público y documentación bilingüe

- Preparada la presentación de AyoseMedina/PokeVault con cabecera SVG propia,
  descripción de funciones, inicio rápido, mapa del proyecto y enlaces ES/EN.
- Añadidas traducciones inglesas de presentación, inicio, despliegue, historial
  y pautas de desarrollo; procedencia de fixtures y contribuciones en ambos idiomas.
- Conservados la aplicación, los recursos y las entidades de prueba; añadida
  una copia idéntica de la licencia en la raíz sin retirar `dist/LICENSE`.
- Configurado GitHub Actions para ejecutar pruebas y comprobar Docker, sin
  publicación automática del sitio ni de imágenes en registros.
- Documentada la diferencia entre código público, acceso privado al sitio y
  almacenamiento del banco en cada navegador y origen web.

## 2026-11-03 · Preparación para Docker y Portainer

- Añadidos Dockerfile, configuración Nginx y stack Compose para construir desde
  GitHub en Portainer con Docker Standalone.
- Servicio sin privilegios de root, sistema de archivos de solo lectura,
  temporales en memoria y comprobación de salud HTTP.
- Puerto configurable, limitado por defecto a 127.0.0.1; autenticación externa.
- Contexto Docker limitado a recursos web y configuración; exclusiones Git para
  guardados, ROM, respaldos, variables locales y claves habituales.
- Documentados despliegue, actualización y traslado del banco entre direcciones.
- Construcción local, arranque healthy y configuración Nginx comprobados con
  Docker Desktop. Verificados por HTTP 13 recursos idénticos a los originales,
  MIME JavaScript, caché y bloqueo de archivos privados y peticiones POST.
  El despliegue en el Portainer del usuario queda pendiente.

## 2026-11-03 · Paquete descargable

- Proyecto exportado con aplicación, recursos, licencia y pruebas.
- Añadidos AGENTS.md y este historial.
- Añadidos EMPEZAR.md y servidor local iniciar.py, limitado a 127.0.0.1.
- Rutas de salida de pruebas adaptadas a `.test-output/` para ejecutar el
  proyecto fuera del entorno original.
- Excluidas la identidad del despliegue privado, las credenciales y las
  salidas generadas por pruebas.

## 2026-11-03 · Exportación y conversiones

- Copias entre partidas de la misma generación I, II, III, IV y V.
- Conversión Amarillo→Cristal, incluida la transformación nativa de tasa de
  captura a objeto y la conservación de DVs, experiencia y nombres.
- Conversión III→IV, IV→V y cadena III→IV→V.
- Escritura en huecos libres de cajas GB/DS, actualización de checksums y
  conservación de Pokémon existentes, copias internas y pies DSV.
- Fecha fijada durante la revisión, registro de conversiones y hashes de
  entidades y archivos en el manifiesto del paquete.
- Bloqueos de duplicados, rutas hacia atrás, salto II→III, objetos equipados,
  huevos, MO ascendentes y casos especiales con conversión no segura.
- Conservación de espacios en nombres y rechazo de glifos que perderían
  información al recodificarse.
- 62 pruebas automatizadas superadas durante la implementación. El flujo de
  navegador preparó paquetes de prueba Esmeralda→Platino y Esmeralda→Blanco 2.
- Limitación de verificación: no se confirmó la descarga física desde el
  navegador de pruebas ni la carga de partidas reales en la R36S.

## 2026-11-03 · Amarillo y Nintendo DS

- Importación de Amarillo internacional.
- Importación de Diamante, Perla, Platino, HeartGold, SoulSilver, Negro, Blanco,
  Negro 2 y Blanco 2.
- Lectura de cajas y equipo; descifrado y verificación de entidades DS.
- Soporte de batería DS de 512 KiB y DSV con pie reconocido de 40/122 bytes.
- Recursos de especies y sprites ampliados hasta la especie 649.
- Respaldos portátiles adaptados al tamaño de los guardados DS.

## 2026-11-03 · Versión inicial

- Sitio privado con procesamiento local de partidas.
- Importación de Cristal, Rojo Fuego y Esmeralda.
- Banco con cajas virtuales, búsqueda, filtros, favoritos y notas.
- Copias verificadas entre guardados GBA a casillas vacías.
- Originales protegidos, hashes SHA-256, ZIP de exportación, respaldos .pvault
  e historial de organización.
- Guía con los pasos manuales para instalar y comprobar resultados en ArkOS.
