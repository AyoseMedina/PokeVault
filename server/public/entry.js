// Loaded only by the authenticated server. The standalone static app is unchanged.
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('pokevault-access') : null;
const signIn = () => location.replace('/login');
if (channel) channel.onmessage = event => { if (event.data === 'logout') signIn(); };
let csrf = '', activityPending = false, lastPing = 0, checking = false, exiting = false;

async function checkSession() {
  if (checking || exiting) return;
  checking = true;
  try {
    const response = await fetch('/auth/session', { cache: 'no-store', credentials: 'same-origin' });
    if (response.status === 401) { signIn(); return false; }
    if (!response.ok) throw new Error('No se pudo comprobar la sesión.');
    const data = await response.json(); csrf = data.csrf;
    return true;
  } finally { checking = false; }
}
async function activity() {
  if (activityPending || exiting || !csrf || Date.now() - lastPing < 60_000) return;
  activityPending = true; lastPing = Date.now();
  try {
    const response = await fetch('/auth/activity', { method:'POST', headers:{ 'X-CSRF-Token':csrf }, credentials:'same-origin' });
    if (response.status === 401 || response.status === 403) signIn();
  } catch { /* No local data is discarded on a temporary network failure. */ }
  finally { activityPending = false; }
}
function mountLogout() {
  const header = document.querySelector('.topbar-right');
  if (!header || header.querySelector('[data-auth-logout]')) return;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'auth-logout'; button.dataset.authLogout = '';
  button.textContent = 'Cerrar sesión'; button.title = 'Cerrar sesión sin borrar el banco de este navegador';
  button.onclick = async () => {
    if (exiting) return; exiting = true; button.disabled = true;
    try {
      const response = await fetch('/auth/logout', { method:'POST', headers:{ 'X-CSRF-Token':csrf }, credentials:'same-origin' });
      if (!response.ok && response.status !== 401) throw new Error('logout');
      channel?.postMessage('logout'); signIn();
    } catch { exiting = false; button.disabled = false; button.textContent = 'Reintentar cierre'; }
  };
  header.append(button);
}
try {
  if (await checkSession()) {
    await import('/app.js');
    new MutationObserver(mountLogout).observe(document.getElementById('app'), { childList:true, subtree:true });
    mountLogout();
    for (const event of ['pointerdown','keydown','touchstart']) document.addEventListener(event, activity, { passive:true });
    setInterval(() => { checkSession().catch(() => {}); }, 60_000);
    window.addEventListener('pageshow', () => { checkSession().catch(() => {}); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkSession().catch(() => {}); });
  }
} catch {
  const root = document.getElementById('app'); root.textContent = '';
  const message = document.createElement('p'); message.textContent = 'No se pudo abrir tu sesión. Recarga la página para volver a intentarlo.';
  const link = document.createElement('a'); link.href = '/login'; link.textContent = 'Volver al acceso / Back to sign in';
  root.append(message, link);
}
