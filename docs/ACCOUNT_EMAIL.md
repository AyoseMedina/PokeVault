# Cuenta, correo y avisos · Account, email and notifications

## Español

**Estado:** autorizado e implementado (2026-11-03). Código: `server/account-store.js`,
`server/mailer.js`, `server/notifications.js`, rutas en `server/app.js`,
`server/public/recover.*` y la página «Cuenta» de `dist/app.js`. Pruebas:
`server/tests/account.test.js` y `tests/browser-account.mjs`.

**Diferencias con el borrador:** la cuenta va **cifrada** (`/data/account.enc`,
misma clave que el banco). El modo de emergencia es `vault-admin.mjs reset-account`.
Los mensajes de Pokémon se generan en el servidor desde el banco cifrado
(`SERVER_VAULT.md`), sin tener el navegador abierto; el endpoint
`/notify/message` del navegador no hace falta. Los aniversarios usan la fecha
de importación de cada partida. Política: `pokevault-account-v1`. Implementar **después** del modo
mover (`docs/MOVE_TRANSFER.md`).

Decisiones del usuario:

1. Cambiar la contraseña y el correo desde la web, con los datos de la cuenta
   en un **volumen persistente**.
2. Recuperar el acceso con un **enlace por correo** de un solo uso y un aviso.
3. Avisos por correo, **incluidos mensajes con datos de sus Pokémon** (nombre,
   mote, nivel, juego), sabiendo que salen del navegador hacia el servidor y el
   proveedor de correo.

Se mantiene: una sola cuenta, sin registro público, sin credenciales por defecto,
sin modo sin autenticación. Cerrar sesión no borra IndexedDB.

### 1. Almacén de la cuenta (volumen)

- Volumen Docker `pokevault_data` montado en `/data` (lectura y escritura),
  compartido con el banco de `docs/SERVER_VAULT.md`. El resto del contenedor
  sigue en `read_only`. Añadirlo a los tres archivos compose y a la
  documentación de Portainer.
- `/data/account.json` (permisos 0600, usuario `node`):
  `{ version, username, passwordHash, email, emailVerified, sessionEpoch,
  passwordChangedAt, notify: {…}, lastBackupExportAt, reset: { tokenHash, expiresAt } }`.
- Escritura atómica: archivo temporal, `fsync`, `rename`. Ante un JSON inválido o
  una versión desconocida, el servidor **no arranca** y explica cómo recuperarlo.
  Nunca se reinicializa en silencio.
- Arranque: si `account.json` no existe, se crea con las variables actuales
  (`POKEVAULT_USERNAME`, `POKEVAULT_PASSWORD_HASH`). Si existe, manda el archivo
  y las variables se ignoran (avisar en el log y en EMPEZAR.md).
- Recuperación sin correo: `docker exec … node server/create-credentials.mjs
  --reset-account` sustituye el hash del volumen tras una confirmación en la
  terminal e incrementa `sessionEpoch`.
- `sessionEpoch` se guarda en cada sesión. Si no coincide con el de la cuenta, la
  sesión deja de ser válida (cierre de todas las sesiones).

### 2. SMTP

- Variables: `POKEVAULT_SMTP_HOST`, `POKEVAULT_SMTP_PORT`,
  `POKEVAULT_SMTP_USER`, `POKEVAULT_SMTP_PASSWORD` o `POKEVAULT_SMTP_PASSWORD_FILE`
  y `POKEVAULT_SMTP_FROM`. Si no hay SMTP, todo funciona salvo el correo, y la
  interfaz lo indica.
- TLS obligatorio: TLS implícito (465) o STARTTLS exigido (587) con certificado
  verificado. Se rechaza la conexión sin cifrar.
- Biblioteca: `nodemailer` con versión exacta en `server/package.json` y
  `package-lock.json`. Gmail funciona con una contraseña de aplicación (requiere
  verificación en dos pasos en la cuenta de Google).
- No se registran en el log ni la contraseña SMTP, ni los tokens, ni el contenido
  de los correos; solo el tipo de aviso y el resultado.
- Límite de envío: como máximo 20 correos por hora y 5 de seguridad por hora.
  Si se supera, se descartan y se registra.
- Plantillas en texto plano y HTML. **Escapar todo** dato del guardado (los motes
  y nombres de entrenador vienen de archivos importados). Quitar CR/LF del asunto
  y de las cabeceras. Sin imágenes remotas ni seguimiento.

### 3. Correo de la cuenta

- Configurar o cambiar el correo exige la contraseña actual. Se envía un enlace de
  confirmación a la dirección nueva (válido 24 h) y un aviso a la anterior, si
  existía. Mientras no se confirme, sigue activo el correo anterior.
- Sin correo verificado no hay recuperación ni avisos, y la interfaz lo muestra.

### 4. Cambiar la contraseña

- Página «Cuenta» (con sesión iniciada): contraseña actual, nueva y repetición.
  Entre 15 y 128 caracteres (`validPassword`), distinta de la actual.
- Mismo hash scrypt. CSRF y limitación de intentos de la contraseña actual (igual
  que el login).
- Al cambiarla: `sessionEpoch++` (se cierran las demás sesiones; la actual se
  regenera), se borra cualquier enlace de recuperación pendiente y se envía un aviso.

### 5. Recuperar el acceso

- En `/login`, «¿Olvidaste tu contraseña?» → `POST /auth/forgot` (CSRF, `Origin`).
  Siempre responde lo mismo, haya o no correo configurado. Límite: 1 cada 5
  minutos y 3 por hora en total.
- Token: 32 bytes aleatorios. Solo se guarda su SHA-256 y la caducidad (15 min).
  Es de un solo uso y se invalida al iniciar sesión, al cambiar la contraseña o al
  pedir otro.
- Enlace: `POKEVAULT_ORIGIN/reset#<token>`. El token va en el **fragmento** para
  que no aparezca en los logs del proxy ni en `Referer`. La página lo envía por
  POST con CSRF.
- Al restablecer: nueva contraseña con las mismas reglas, `sessionEpoch++`, sin
  inicio de sesión automático y aviso por correo «Se ha cambiado tu contraseña».
- Las comparaciones usan `timingSafeEqual`. Las pruebas cubren la caducidad, la
  reutilización, un token incorrecto, la limitación y la respuesta idéntica.

### 6. Avisos de seguridad

Siempre activos si hay correo verificado:
- contraseña cambiada o restablecida;
- correo cambiado (a la dirección antigua);
- recuperación solicitada;
- bloqueo por demasiados intentos fallidos.

Opcional: aviso de cada inicio de sesión correcto, desactivado por defecto.

### 7. Mensajes de tus Pokémon

> **Actualización 2026-11-03:** con `docs/SERVER_VAULT.md` el banco vive en el
> servidor. Los mensajes con datos de Pokémon pueden generarse y programarse en
> el servidor a partir del banco (sin necesidad de tener el navegador abierto),
> con los mismos campos mínimos, la activación por tipo y el escapado. Lo que
> sigue describe la versión inicial, para cuando el banco estaba solo en el navegador.

El servidor **no guarda datos de Pokémon**: no tiene el banco, que vive en IndexedDB.

- **Recordatorio de respaldo** (programado en el servidor): el navegador envía
  solo la fecha `lastBackupExportAt` al exportar el `.pvault`. Si pasan N días
  (configurable, por defecto 30), el servidor envía el recordatorio. No contiene
  datos de Pokémon.
- **Mensajes con datos de Pokémon** (se generan en el navegador al usar la app):
  - resumen semanal o mensual (cuántos Pokémon, nuevos, favoritos);
  - aniversarios («Hace un año que Pikachu llegó a tu banco»);
  - resultado de un traslado («Kadabra evolucionó a Alakazam al llegar a Rojo Fuego»);
  - recuerdos de compañeros que llevan tiempo en una caja.
- El navegador envía a `POST /notify/message` un JSON mínimo con un esquema
  estricto: `{ kind, items: [{ species, nickname, level, game }] }`, como máximo
  30 elementos y textos de 1–40 caracteres. **Nunca** se envían bytes del
  guardado, PID, ID secreto, hashes ni notas personales. El servidor valida, envía
  y descarta el contenido; solo guarda la fecha del último envío por tipo.
- Cada tipo se activa por separado en «Cuenta → Avisos». Todos vienen
  **desactivados** por defecto, salvo los de seguridad. La primera vez que se
  activa uno, la interfaz explica qué datos salen y hacia dónde.
- Un mensaje programado con datos de Pokémon solo se envía cuando el navegador
  está abierto (por ejemplo, el resumen sale en la primera visita tras 7 días).
  Así no hace falta guardar datos de Pokémon en el servidor.

### 8. Cambios de reglas

AGENTS.md: el servidor puede guardar los datos de la cuenta en el volumen y
recibir resúmenes mínimos de Pokémon solo para enviarlos por correo, sin
almacenarlos. Siguen prohibidos los guardados en el servidor, el registro público
y las credenciales por defecto.

### Pruebas mínimas

Arranque con y sin `account.json`; JSON dañado (no arranca); escritura atómica;
cambio de contraseña (actual errónea, limitación, cierre de las demás sesiones);
recuperación (caducidad, un solo uso, token erróneo, límites, misma respuesta,
token solo en el fragmento); cambio de correo con verificación; SMTP sin TLS
rechazado; escapado HTML y cabeceras sin CR/LF con motes maliciosos; esquema
estricto de `/notify/message`; el log no contiene secretos ni contenido. Ejecutar
`npm run test:auth` y `npm test`.

## English (summary)

Policy `pokevault-account-v1`, authorized and not implemented yet. Build it after
move mode. Account data (scrypt hash, verified email, `sessionEpoch`, notification
preferences) lives in an atomic JSON file on the `pokevault_account` Docker volume.
Environment variables only bootstrap the account. SMTP requires TLS and uses
pinned `nodemailer`. Password change requires the current password and closes
other sessions. Email recovery uses a single-use, 15-minute token whose SHA-256
is stored server-side; the token travels in the URL fragment, and recovery sends
a notice. Security notices are always on. Pokémon messages are opt-in and built in
the browser. A strict minimal schema (species, nickname, level, game) is sent,
emailed and discarded; the server never stores Pokémon data or saves.
