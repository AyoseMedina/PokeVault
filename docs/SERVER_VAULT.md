# Banco en el servidor · Server-side vault

## Español

**Estado:** autorizado por el usuario (2026-11-03), pendiente de implementar.
Política: `pokevault-server-vault-v1`. Orden: después del modo mover de Codex y
**antes** de `ACCOUNT_EMAIL.md` (comparten el volumen).

Decisiones del usuario:

1. **Todo el banco vive en el servidor**: partidas, respaldos, cajas, favoritos,
   notas, planes, versiones consumidas y puntos de restauración.
2. **Cifrado en disco con una clave del servidor**, guardada en Portainer y
   separada del volumen. Si alguien copia el volumen no puede leer nada; quien
   controle el servidor y la clave sí. La recuperación por correo recupera
   también el banco.
3. **Solo servidor**: en modo Docker/Node el navegador no guarda el banco. Sin
   conexión no funciona.

Se mantiene: el análisis, la conversión, el movimiento y la verificación siguen
en el navegador con el mismo código probado. El servidor guarda, valida y
sirve. Los bytes originales nunca se modifican. El modo local `iniciar.py` (sin
servidor) sigue usando IndexedDB como hoy.

### 1. Volumen y archivos

- Un único volumen `pokevault_data` montado en `/data` (compartido con la cuenta
  de `ACCOUNT_EMAIL.md`). El resto del contenedor sigue en `read_only`.
- Estructura:
  - `/data/vault/state.<rev>.enc`: metadatos del banco (el mismo esquema que hoy en
    IndexedDB, sin bytes de partidas), cifrado.
  - `/data/vault/blobs/<sha256>.enc`: cada partida o respaldo, **una sola vez por
    hash** (sin duplicados), cifrado.
  - `/data/vault/HEAD`: revisión actual.
- Escritura atómica: temporal, `fsync`, `rename` y `fsync` del directorio.
  Primero se escriben los blobs y después el estado; `HEAD` cambia al final.
- Se conservan las últimas **50 revisiones** del estado, como puntos de
  restauración del servidor. Un blob solo se borra si ninguna revisión conservada
  lo referencia.
- Permisos 0600/0700, usuario `node`. Ante un archivo dañado, una autenticación
  GCM fallida o un `HEAD` incoherente, **no se arranca ni se sobrescribe**: se
  explica cómo restaurar.

### 2. Cifrado

- AES-256-GCM (`node:crypto`). Clave de 32 bytes en `POKEVAULT_DATA_KEY` o
  `POKEVAULT_DATA_KEY_FILE` (hex). `create-credentials.mjs` la genera. Sin clave
  válida, el servidor no arranca.
- Cada archivo lleva una cabecera (versión, id de clave) y un nonce aleatorio de
  12 bytes. Datos adicionales autenticados (AAD): tipo y hash del blob, o número
  de revisión del estado, para que no se puedan intercambiar archivos entre sí.
- Rotación: comando `node server/vault-admin.mjs rotate-key` que lo vuelve a cifrar
  todo de forma atómica con la nueva clave.
- **Perder la clave significa perder el banco**: EMPEZAR.md debe decir que se
  guarde fuera del servidor (gestor de contraseñas) junto con las copias.

### 3. API (con sesión, CSRF y `Origin`)

- `GET /api/vault` → `{ revision, state }`.
- `GET /api/vault/blob/:sha256` → bytes, `Cache-Control: no-store`.
- `PUT /api/vault/blob/:sha256` → el servidor calcula el SHA-256 y lo compara
  con el nombre, y comprueba el tamaño (32 KiB, 128 KiB, 512 KiB o un DSV
  válido) y que `parseSave` lo acepte (el mismo `dist/core.js`, en Node). Es
  idempotente.
- `PUT /api/vault` con `If-Match: <revision>` → **409** si cambió (otro
  dispositivo o pestaña), igual que el control de revisión actual. Antes de
  aceptarlo valida el esquema: hashes referenciados existentes, claves de
  Pokémon coherentes, registro de versiones consumidas (`consumedLedger`) sin
  liberaciones salvo anulación válida, y límites (100 partidas y una cuota
  configurable, por defecto 2 GiB).
- `GET /api/vault/history` y `POST /api/vault/restore/:rev` (con confirmación):
  la restauración crea una revisión nueva; no borra las posteriores.
- Límites de tamaño por petición, limitación de escrituras y registros sin
  contenido (solo la operación, la revisión y el resultado). Abrir solo estos
  métodos en el middleware que hoy rechaza todo lo que no sea GET/HEAD.

### 4. Cliente

- `dist/vault.js` pasa a tener dos adaptadores con la misma interfaz: `indexeddb`
  (modo `iniciar.py`) y `server` (modo autenticado, detectado por `entry.js`).
  `commit()` sube primero los blobs nuevos y después el estado con `If-Match`.
- Un 409 se trata como el conflicto actual: aviso y recarga, sin sobrescribir.
- Un 401 a mitad de operación no pierde nada: la operación no se confirma, se
  avisa y se vuelve a intentar tras iniciar sesión.
- El `.pvault` sigue existiendo para exportar e importar (fuera del servidor).

### 5. Migración desde el navegador

- Al entrar en modo servidor, si el servidor está vacío y el navegador tiene un
  banco en IndexedDB, se ofrece «Subir mi banco al servidor» (acción explícita).
  Se verifican los hashes de todos los blobs y el estado subido.
- Si los dos tienen datos, se **fusiona** con la lógica de restauración actual
  (sin sobrescribir y conservando las versiones consumidas).
- IndexedDB **no se borra automáticamente**. Tras subirlo y verificarlo, se
  ofrece exportar un `.pvault` y después «Borrar la copia de este navegador»,
  con confirmación.

### 6. Copias de seguridad del servidor

- Documentar la copia del volumen (`docker run --rm -v pokevault_data:/data …
  tar`) y su restauración, y recordar que la clave se guarda aparte.
- Opcional: tarea periódica en el contenedor que genere
  `/data/backups/<fecha>.tar.enc` (con rotación), cifrada con la misma clave.

### 7. Relación con otras especificaciones

- `ACCOUNT_EMAIL.md`: usa el mismo volumen (`/data/account.json`). Con el banco
  en el servidor, los mensajes de Pokémon **pueden programarse en el servidor**
  (resumen semanal, aniversarios) sin tener el navegador abierto, con los mismos
  campos mínimos y las mismas opciones de activación.
- Modo mover, versiones consumidas y respaldos: misma lógica; el registro de
  versiones consumidas se valida también en el servidor.

### Pruebas mínimas

Cifrado y descifrado con AAD (rechazo de un archivo cambiado o intercambiado);
arranque sin clave o con un archivo dañado (no arranca y no sobrescribe);
escritura atómica (simular un fallo entre el blob y el estado); `If-Match` y
409; blob con un hash que no coincide o tamaño inválido; esquema y versiones
consumidas que no se pueden liberar; cuota; historial y restauración sin perder
revisiones; GC de blobs; migración desde IndexedDB y fusión; 401 a mitad de
`commit`; rotación de clave; logs sin contenido. `npm run test:auth` y `npm test`.

## English (summary)

Authorized policy `pokevault-server-vault-v1`. The whole bank lives on the
`pokevault_data` Docker volume, shared with the account data. Files are written
atomically and encrypted with AES-256-GCM using a server key from Portainer
(`POKEVAULT_DATA_KEY`) kept outside the volume; AAD binds each file's kind and
hash or revision. Saves are content-addressed blobs. State revisions use If-Match
and return 409 on conflict, and the last 50 revisions are kept. The server
re-validates saves with the same parser and checks the consumed ledger. Parsing,
moving and verification stay in the browser. In server mode the browser keeps no
copy; `iniciar.py` keeps IndexedDB. Migration from IndexedDB is explicit and
verified, and never deletes local data automatically. Losing the key means losing
the bank, so back it up separately.
