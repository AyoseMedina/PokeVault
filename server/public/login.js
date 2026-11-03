const translations = {
  es: { tagline:'TU HOME CLÁSICO', headline:'Tus aventuras merecen un hogar.', intro:'Tus compañeros de siempre, tus cajas y tu próxima aventura. Entra en tu espacio personal.', local:'Tu banco se guarda cifrado en tu propio servidor.', private:'ESPACIO PERSONAL', welcome:'QUÉ BUENO TENERTE DE VUELTA', title:'Entra en tu banco.', subtitle:'Inicia sesión para continuar con tus aventuras.', username:'Usuario', password:'Contraseña', show:'Mostrar', hide:'Ocultar', submit:'Entrar en PokéVault', session:'La sesión se cierra tras 30 minutos sin actividad.', help:'¿Necesitas recuperar el acceso?', recovery:'Si la cuenta tiene un correo verificado, recibirás un enlace para elegir otra. No se crean cuentas desde esta página.', forgot:'¿Olvidaste tu contraseña?', footer:'Un espacio para tu historia. De Kanto a Teselia.', invalid_credentials:'Usuario o contraseña incorrectos.', too_many_attempts:'Demasiados intentos. Espera antes de volver a probar.', invalid_request:'La sesión del formulario ha caducado. Vuelve a intentarlo.', connection:'No se pudo conectar. Recarga la página e inténtalo de nuevo.', loading:'Comprobando acceso…' },
  en: { tagline:'YOUR CLASSIC HOME', headline:'Your adventures deserve a home.', intro:'Your longtime companions, your boxes and your next adventure. Step into your personal space.', local:'Your bank is stored encrypted on your own server.', private:'PERSONAL SPACE', welcome:'GOOD TO HAVE YOU BACK', title:'Enter your bank.', subtitle:'Sign in to continue your adventures.', username:'Username', password:'Password', show:'Show', hide:'Hide', submit:'Sign in to PokéVault', session:'Your session ends after 30 minutes of inactivity.', help:'Need to recover access?', recovery:'If the account has a verified email, you will receive a link to choose a new one. Accounts cannot be created on this page.', forgot:'Forgot your password?', footer:'A place for your story. From Kanto to Unova.', invalid_credentials:'Incorrect username or password.', too_many_attempts:'Too many attempts. Wait before trying again.', invalid_request:'The form session expired. Please try again.', connection:'Could not connect. Reload the page and try again.', loading:'Checking access…' }
};
let language = navigator.language.startsWith('es') ? 'es' : 'en', csrf = '', busy = false, statusKey = '';
const $ = id => document.getElementById(id);
function render() {
  document.documentElement.lang = language;
  document.title = language === 'es' ? 'PokéVault · Acceso privado' : 'PokéVault · Private access';
  document.querySelectorAll('[data-text]').forEach(node => { node.textContent = translations[language][node.dataset.text]; });
  $('language').textContent = language === 'es' ? 'EN' : 'ES';
  $('language').ariaLabel = language === 'es' ? 'Switch to English' : 'Cambiar a español';
  $('show-password').textContent = translations[language][$('password').type === 'password' ? 'show' : 'hide'];
  $('status').textContent = statusKey ? translations[language][statusKey] || translations[language].connection : '';
  $('submit').disabled = busy || !csrf;
}
async function prepare() {
  const response = await fetch('/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('connection');
  csrf = (await response.json()).csrf;
}
$('language').onclick = () => { language = language === 'es' ? 'en' : 'es'; render(); };
$('show-password').onclick = () => { const show = $('password').type === 'password'; $('password').type = show ? 'text' : 'password'; $('show-password').setAttribute('aria-pressed', String(show)); render(); };
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !csrf) return;
  busy = true; statusKey = 'loading'; render();
  try {
    const response = await fetch('/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ username: $('username').value, password: $('password').value }) });
    const result = await response.json();
    if (response.ok) { $('password').value = ''; location.replace('/'); return; }
    statusKey = result.error || 'connection';
    $('password').value = '';
    if (response.status === 403) await prepare();
  } catch { statusKey = 'connection'; }
  finally { busy = false; render(); }
});
render();
prepare().catch(() => { statusKey = 'connection'; }).finally(render);
