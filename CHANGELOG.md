# Historial de cambios

[Español](CHANGELOG.md) · [English](CHANGELOG.en.md)

Las entradas documentan los cambios realizados en este proyecto. No representan
versiones semánticas ni garantizan pruebas de funcionamiento en una R36S real.

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
