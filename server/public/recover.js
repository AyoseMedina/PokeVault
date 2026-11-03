// Password recovery and email confirmation (docs/ACCOUNT_EMAIL.md). The token
// travels in the URL fragment, which is never sent to the server or proxies.
const $ = id => document.getElementById(id);
// A link pasted into an open recovery tab only changes the fragment: reload to read it.
window.addEventListener('hashchange', () => location.reload());
const token = location.hash.slice(1);
if (token) history.replaceState(null, '', location.pathname);
let csrf = '';
async function prepare() {
  const response = await fetch('/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('csrf');
  csrf = (await response.json()).csrf;
}
async function post(path, body) {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body) });
  let data = {}; try { data = await response.json(); } catch {}
  if (response.status === 403) await prepare();
  return { ok: response.ok, data, status: response.status };
}
const say = (id, text) => { $(id).textContent = text; };

if (location.pathname === '/confirm-email') {
  $('recover-eyebrow').textContent = 'CORREO DE LA CUENTA'; $('recover-title').textContent = 'Confirmando tu correo…'; $('recover-subtitle').textContent = '';
  $('confirm-status').hidden = false;
  prepare().then(() => token ? post('/auth/confirm-email', { token }) : { ok: false, data: {} }).then(({ ok, data }) => {
    $('recover-title').textContent = ok ? 'Correo confirmado' : 'No se pudo confirmar';
    say('confirm-status', ok ? 'Ya puedes recibir avisos y recuperar el acceso con este correo.' : data.message || 'El enlace no es válido o ha caducado. Pide otro desde «Cuenta».');
  }).catch(() => say('confirm-status', 'No se pudo conectar. Recarga la página.'));
} else if (token) {
  $('recover-title').textContent = 'Elige una contraseña nueva'; $('recover-subtitle').textContent = 'Al guardarla se cerrarán todas las sesiones abiertas.';
  $('reset-form').hidden = false;
  prepare().then(() => { $('reset-submit').disabled = false; }).catch(() => say('reset-status', 'No se pudo conectar. Recarga la página.'));
  $('reset-form').addEventListener('submit', async event => {
    event.preventDefault();
    const password = $('new-password').value;
    if (password !== $('repeat-password').value) return say('reset-status', 'Las contraseñas no coinciden.');
    if ([...password].length < 15) return say('reset-status', 'Usa al menos 15 caracteres.');
    $('reset-submit').disabled = true; say('reset-status', 'Guardando…');
    const { ok, data } = await post('/auth/reset', { token, password }).catch(() => ({ ok: false, data: {} }));
    $('new-password').value = ''; $('repeat-password').value = '';
    if (ok) { $('reset-form').hidden = true; $('recover-title').textContent = 'Contraseña cambiada'; $('recover-subtitle').textContent = 'Ya puedes entrar con tu contraseña nueva.'; }
    else { say('reset-status', data.message || 'No se pudo cambiar. Pide otro enlace.'); $('reset-submit').disabled = false; }
  });
} else {
  $('forgot-form').hidden = false;
  prepare().then(() => { $('forgot-submit').disabled = false; }).catch(() => say('forgot-status', 'No se pudo conectar. Recarga la página.'));
  $('forgot-form').addEventListener('submit', async event => {
    event.preventDefault(); $('forgot-submit').disabled = true;
    await post('/auth/forgot', {}).catch(() => {});
    say('forgot-status', 'Si la cuenta tiene un correo verificado, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.');
  });
}
