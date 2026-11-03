import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createApp } from '../app.js';
import { readConfig } from '../config.js';
import { hashPassword, verifyPassword } from '../password.js';

const password = randomBytes(24).toString('hex');
const hash = await hashPassword(password);
const env = { POKEVAULT_USERNAME:'vault-owner', POKEVAULT_PASSWORD_HASH:hash, POKEVAULT_SESSION_SECRET:randomBytes(32).toString('hex') };

async function fixture(t, options = {}) {
  const config = readConfig({ ...env, ...options.env });
  let time = Date.now();
  const access = createApp(config, { now: () => time, loginLimit:options.loginLimit ?? 8, globalLimit:options.globalLimit ?? 30 });
  const listener = access.app.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const base = `http://127.0.0.1:${listener.address().port}`;
  if (!config.secure) { config.origin = base; config.host = new URL(base).host; }
  t.after(() => { access.close(); listener.closeAllConnections(); listener.close(); });
  const cookies = new Map();
  async function request(path, { method='GET', body, headers={}, cookie, origin=config.origin } = {}) {
    const result = await new Promise((resolve, reject) => {
      const http = httpRequest(base + path, { method, headers:{
      Host:config.host, ...(config.secure ? { 'X-Forwarded-Proto':'https' } : {}),
      ...(origin === null ? {} : { Origin:origin }),
      Cookie:cookie ?? [...cookies].map(([k,v]) => `${k}=${v}`).join('; '),
      ...(body === undefined ? {} : { 'Content-Type':'application/json' }), ...headers
      } }, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status:response.statusCode, text:async () => text, json:async () => JSON.parse(text), headers:{
            get:name => response.headers[name.toLowerCase()]?.toString() ?? null,
            getSetCookie:() => response.headers['set-cookie'] || []
          } });
        });
      });
      http.on('error', reject);
      if (body !== undefined) http.write(typeof body === 'string' ? body : JSON.stringify(body));
      http.end();
    });
    for (const value of result.headers.getSetCookie()) {
      const pair = value.split(';')[0], index = pair.indexOf('='); cookies.set(pair.slice(0,index),pair.slice(index+1));
    }
    return result;
  }
  const csrf = async () => (await (await request('/auth/csrf')).json()).csrf;
  const login = async (data = {}) => request('/auth/login', { method:'POST', body:{ username:env.POKEVAULT_USERNAME,password,...data }, headers:{'X-CSRF-Token':await csrf()} });
  return { request, csrf, login, config, advance:ms => { time += ms; }, cookie:() => [...cookies].map(([k,v]) => `${k}=${v}`).join('; ') };
}

test('configuration fails closed without credentials and rejects non-local plaintext origins', () => {
  assert.throws(() => readConfig({}), /USERNAME/);
  assert.throws(() => readConfig({...env,POKEVAULT_PASSWORD_HASH:'plain-password'}), /PASSWORD_HASH/);
  assert.throws(() => readConfig({...env,POKEVAULT_SESSION_SECRET:'short'}), /SESSION_SECRET/);
  for (const origin of ['http://192.168.1.10:8080','http://example.org','https://example.org/path','https://user:pass@example.org','https://example.org/']) {
    assert.throws(() => readConfig({...env,POKEVAULT_ORIGIN:origin}));
  }
  for (const trust of ['true','1','0.0.0.0/0','::/0']) assert.throws(() => readConfig({...env,POKEVAULT_TRUST_PROXY:trust}));
});
test('scrypt verifies full passwords without truncating spaces and rejects malformed hashes', async () => {
  assert.equal(await verifyPassword(password,hash),true);
  assert.equal(await verifyPassword(` ${password}`,hash),false);
  assert.equal(await verifyPassword(password+' ',hash),false);
  await assert.rejects(hashPassword('too short'));
  await assert.rejects(verifyPassword(password,'scrypt:2:8:1:bad:bad'));
});
test('anonymous visitors see the login and cannot fetch app code, sprites or backup files', async t => {
  const f = await fixture(t);
  const root = await f.request('/'); assert.equal(root.status,303); assert.equal(root.headers.get('location'),'/login');
  assert.equal((await f.request('/login')).status,200);
  for (const path of ['/app.js','/core.js','/styles.css','/sprites/25.png','/auth/session','/.env','/server/config.js']) assert.equal((await f.request(path)).status,401,path);
  assert.equal((await f.request('/healthz')).status,200);
});
test('login enforces CSRF, exact Origin and JSON and returns generic credential errors', async t => {
  const f = await fixture(t), csrf = await f.csrf();
  const body = { username:env.POKEVAULT_USERNAME,password };
  assert.equal((await f.request('/auth/login',{method:'POST',body})).status,403);
  for (const origin of [null,'https://evil.example','null']) assert.equal((await f.request('/auth/login',{method:'POST',body,origin,headers:{'X-CSRF-Token':csrf}})).status,403);
  assert.equal((await f.request('/auth/login',{method:'POST',body,headers:{'X-CSRF-Token':csrf,'Content-Type':'text/plain'}})).status,415);
  const wrongUser = await f.login({username:'unknown'}), wrongPass = await f.login({password:'wrong'});
  assert.equal(wrongUser.status,401); assert.equal(wrongPass.status,401);
  assert.deepEqual(await wrongUser.json(),await wrongPass.json());
});
test('login rotates the session; protected files match originals and private paths remain hidden', async t => {
  const f = await fixture(t), oldCsrf = await f.csrf(), oldCookie = f.cookie();
  const login = await f.login(); assert.equal(login.status,200); assert.notEqual(f.cookie(),oldCookie);
  assert.match(login.headers.get('set-cookie'),/HttpOnly/); assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
  assert.doesNotMatch(login.headers.get('set-cookie'),/; Secure/);
  assert.equal((await f.request('/auth/session',{cookie:oldCookie})).status,401);
  const session = await (await f.request('/auth/session')).json(); assert.notEqual(session.csrf,oldCsrf);
  const app = await f.request('/app.js'); assert.equal(app.status,200);
  assert.equal(await app.text(),await readFile(new URL('../../dist/app.js',import.meta.url),'utf8'));
  assert.equal(app.headers.get('cache-control'),'no-store');
  assert.match(app.headers.get('content-security-policy'),/script-src 'self'/);
  assert.match(await (await f.request('/')).text(),/auth-assets\/entry.js/);
  for (const path of ['/server/config.js','/package.json','/.env','/docker/nginx.conf']) assert.ok([403,404].includes((await f.request(path)).status),path);
  assert.equal((await f.request('/app.js',{method:'POST',body:'data'})).status,405);
});
test('logout requires CSRF and revokes the server-side session, including copied cookies', async t => {
  const f = await fixture(t); await f.login();
  const session = await (await f.request('/auth/session')).json(), cookie = f.cookie();
  assert.equal((await f.request('/auth/logout',{method:'POST'})).status,403);
  assert.equal((await f.request('/auth/logout',{method:'POST',headers:{'X-CSRF-Token':session.csrf}})).status,200);
  assert.equal((await f.request('/auth/session',{cookie})).status,401);
  assert.equal((await f.request('/app.js',{cookie})).status,401);
});
test('idle expiry is enforced server-side; background session checks do not keep the bank unlocked', async t => {
  const f = await fixture(t); await f.login();
  f.advance(f.config.idleMs-1000); assert.equal((await f.request('/auth/session')).status,200);
  f.advance(1001); assert.equal((await f.request('/auth/session')).status,401);
  assert.equal((await f.request('/login')).status,200);
});
test('activity extends idle time but cannot bypass absolute expiry', async t => {
  const f = await fixture(t); await f.login();
  const {csrf} = await (await f.request('/auth/session')).json();
  for (let i=0;i<16;i++) {
    f.advance(f.config.idleMs-1);
    assert.equal((await f.request('/auth/activity',{method:'POST',headers:{'X-CSRF-Token':csrf}})).status,200);
  }
  f.advance(20); assert.equal((await f.request('/auth/session')).status,401);
});
test('expired pre-login sessions can be replaced; previous CSRF tokens are rejected', async t => {
  const f = await fixture(t), csrf = await f.csrf(); f.advance(f.config.preauthMs+1);
  assert.equal((await f.request('/auth/login',{method:'POST',body:{username:env.POKEVAULT_USERNAME,password},headers:{'X-CSRF-Token':csrf}})).status,403);
  assert.equal((await f.login()).status,200);
});
test('login throttling blocks repeated attempts even when usernames change', async t => {
  const f = await fixture(t,{loginLimit:2}), csrf = await f.csrf();
  for (let i=0;i<2;i++) assert.equal((await f.request('/auth/login',{method:'POST',body:{username:`unknown${i}`,password:'bad'},headers:{'X-CSRF-Token':csrf}})).status,401);
  assert.equal((await f.request('/auth/login',{method:'POST',body:{username:env.POKEVAULT_USERNAME,password},headers:{'X-CSRF-Token':csrf}})).status,429);
  const account = await fixture(t,{loginLimit:20,globalLimit:2});
  for(let i=0;i<3;i++) assert.equal((await account.login({username:`unknown${i}`})).status,401);
  assert.equal((await account.login()).status,200);
});
test('secure mode uses a host-only Secure cookie and requires a trusted HTTPS proxy', async t => {
  const f = await fixture(t,{env:{POKEVAULT_ORIGIN:'https://bank.example',POKEVAULT_TRUST_PROXY:'loopback'}});
  assert.equal((await f.request('/login',{headers:{'X-Forwarded-Proto':'http'}})).status,400);
  const result = await f.login(); assert.equal(result.status,200);
  assert.match(result.headers.get('set-cookie'),/__Host-pokevault.sid=/);
  assert.match(result.headers.get('set-cookie'),/; Secure/);
  assert.doesNotMatch(result.headers.get('set-cookie'),/Domain=/);
  assert.match(result.headers.get('strict-transport-security'),/max-age=/);
  const untrusted = await fixture(t,{env:{POKEVAULT_ORIGIN:'https://bank.example'}});
  assert.equal((await untrusted.request('/login')).status,400);
});
test('Host validation prevents alternate-origin access; oversized and malformed payloads fail', async t => {
  const f = await fixture(t), csrf = await f.csrf();
  assert.equal((await f.request('/login',{headers:{Host:'attacker.example'}})).status,421);
  assert.equal((await f.request('/auth/login',{method:'POST',body:'{',headers:{'X-CSRF-Token':csrf}})).status,400);
  assert.equal((await f.request('/auth/login',{method:'POST',body:{password:'a'.repeat(3000)},headers:{'X-CSRF-Token':csrf}})).status,413);
});


test('invalid CSRF and content types do not consume password attempts', async t => {
  const f=await fixture(t,{loginLimit:1});
  for(let i=0;i<12;i++) assert.equal((await f.request('/auth/login',{method:'POST',body:{}})).status,403);
  assert.equal((await f.login()).status,200);
});
test('one client cannot consume the password attempt allowance of another trusted client', async t => {
  const f=await fixture(t,{loginLimit:2,env:{POKEVAULT_TRUST_PROXY:'loopback'}}),csrf=await f.csrf();
  for(let i=0;i<2;i++)assert.equal((await f.request('/auth/login',{method:'POST',body:{username:'bad',password:'bad'},headers:{'X-CSRF-Token':csrf,'X-Forwarded-For':'192.0.2.1'}})).status,401);
  assert.equal((await f.request('/auth/login',{method:'POST',body:{username:env.POKEVAULT_USERNAME,password},headers:{'X-CSRF-Token':csrf,'X-Forwarded-For':'192.0.2.2'}})).status,200);
});
test('server fails closed when the authenticated entry cannot be injected', () => {
  assert.throws(()=>createApp(readConfig(env),{indexHTML:'<html><head></head><script src="./app.js?v=2"></script></html>'}),/entry point/);
});
test('anonymous session churn cannot evict authenticated sessions', async () => {
  const {PartitionedStore}=await import('../session-store.js');const store=new PartitionedStore(60000);
  const put=(id,data)=>new Promise((resolve,reject)=>store.set(id,{cookie:{maxAge:60000},...data},e=>e?reject(e):resolve()));
  try {await put('owner',{authenticated:true});for(let i=0;i<600;i++)await put('anonymous-'+i,{});
    assert.equal((await new Promise((resolve,reject)=>store.get('owner',(e,s)=>e?reject(e):resolve(s)))).authenticated,true);
  } finally {store.stopInterval();}
});
