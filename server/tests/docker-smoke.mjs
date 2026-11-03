// Disposable, synthetic credentials only; output remains in ignored .test-output/.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { hashPassword } from '../password.js';

const folder = new URL('../../.test-output/', import.meta.url);
if (process.argv.includes('--prepare')) {
  await mkdir(folder,{recursive:true});
  const password = randomBytes(24).toString('hex'), passwordHash = await hashPassword(password);
  await writeFile(new URL('auth-ci.json',folder),JSON.stringify({username:'ci-owner',password}),{mode:0o600});
  await writeFile(new URL('auth-ci.env',folder),`POKEVAULT_USERNAME=ci-owner\nPOKEVAULT_PASSWORD_HASH=${passwordHash}\nPOKEVAULT_SESSION_SECRET=${randomBytes(32).toString('hex')}\nPOKEVAULT_DOMAIN=localhost\nPOKEVAULT_PORT=${process.env.POKEVAULT_TEST_PORT || '8080'}\n`,{mode:0o600});
  console.log('Disposable test credentials prepared.');
} else {
  const credentials = JSON.parse(await readFile(new URL('auth-ci.json',folder),'utf8'));
  const cloud = process.argv.includes('--cloud');
  const port = Number(process.env.POKEVAULT_TEST_PORT || (cloud ? 18443 : 8080));
  const origin = cloud ? 'https://localhost' : `http://localhost:${port}`;
  const ca = cloud ? await readFile(new URL('auth-cloud-ca.crt',folder)) : undefined;
  const cookies = new Map();
  const cookie = () => [...cookies].map(([k,v])=>`${k}=${v}`).join('; ');
  async function request(path,{method='GET',body,csrf,previousCookie}={}) {
    return new Promise((resolve,reject)=>{
      const req=(cloud?httpsRequest:httpRequest)({hostname:'127.0.0.1',port,path,method,ca,servername:'localhost',headers:{Host:new URL(origin).host,Origin:origin,Cookie:previousCookie??cookie(),...(csrf?{'X-CSRF-Token':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})}},res=>{
        const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{
          for(const value of res.headers['set-cookie']||[]){const pair=value.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}
          resolve({status:res.statusCode,headers:res.headers,bytes:Buffer.concat(chunks)});
        });
      });req.on('error',reject);if(body)req.write(JSON.stringify(body));req.end();
    });
  }
  assert.equal((await request('/healthz')).status,200);
  assert.equal((await request('/')).status,303);
  assert.equal((await request('/app.js')).status,401);
  const form=await request('/auth/csrf'),csrf=JSON.parse(form.bytes).csrf;
  const login=await request('/auth/login',{method:'POST',body:credentials,csrf});assert.equal(login.status,200);
  if(cloud) assert.match(login.headers['set-cookie'].join(';'),/__Host-pokevault.sid=.*; Secure/);
  const current=JSON.parse((await request('/auth/session')).bytes);
  for(const file of ['app.js','core.js','transfer.js','styles.css','sprites/649.png']){
    const result=await request('/'+file);assert.equal(result.status,200);assert.equal(result.headers['cache-control'],'no-store');
    assert.deepEqual(result.bytes,await readFile(new URL('../../dist/'+file,import.meta.url)));
  }
  const previousCookie=cookie();
  assert.equal((await request('/auth/logout',{method:'POST',csrf:current.csrf})).status,200);
  assert.equal((await request('/app.js',{previousCookie})).status,401);
  console.log(`Docker ${cloud?'HTTPS reverse proxy':'localhost'}: login, protected original assets, cookie and logout verified.`);
}
