import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyPassword } from '../password.js';

const directory = new URL(`../../.test-output/credential-tests-${randomBytes(8).toString('hex')}/`, import.meta.url);
await mkdir(directory,{recursive:true});
const password = 'test-only-' + randomBytes(16).toString('hex');
// Emulate the CLI's TTY capability on pipes; never use real account credentials.
async function generate() {
  const source = `Object.defineProperty(process.stdin,'isTTY',{value:true});process.stdin.setRawMode=v=>{process.stdin.isRaw=v;};await import(${JSON.stringify(new URL('../create-credentials.mjs',import.meta.url).href)});`;
  return new Promise((resolve,reject)=>{
    const child = spawn(process.execPath,['--input-type=module','-e',source,'--','--write-env'],{cwd:fileURLToPath(directory),stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='',stage=0;
    const timeout=setTimeout(()=>{child.kill();reject(new Error('Credential generator timed out'));},10_000);
    child.stdout.on('data',chunk=>{
      stdout+=chunk.toString();
      if(stage===0&&stdout.includes('Username (3–64):')){stage++;child.stdin.write('test-owner\n');}
      else if(stage===1&&stdout.includes('hidden):')){stage++;child.stdin.write(password+'\n');}
      else if(stage===2&&stdout.includes('Repeat:')){stage++;child.stdin.write(password+'\n');}
    });
    child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
    child.on('error',error=>{clearTimeout(timeout);reject(error);});
    child.on('close',code=>{clearTimeout(timeout);resolve({code,stdout,stderr});});
  });
}
test('credential generator writes a salted hash and random secret without plaintext output', async () => {
  const result=await generate(); assert.equal(result.code,0,result.stderr);
  const content=await readFile(new URL('.env',directory),'utf8');
  assert.doesNotMatch(content,new RegExp(password)); assert.ok(!result.stdout.includes(password));
  const vars=Object.fromEntries(content.trim().split('\n').map(line=>line.split('=')));
  assert.equal(vars.POKEVAULT_USERNAME,'test-owner');
  assert.match(vars.POKEVAULT_SESSION_SECRET,/^[a-f0-9]{64}$/);
  assert.equal(await verifyPassword(password,vars.POKEVAULT_PASSWORD_HASH),true);
});
test('credential generator refuses to overwrite an existing configuration', async () => {
  const original=await readFile(new URL('.env',directory));
  const result=await generate(); assert.equal(result.code,1); assert.match(result.stderr,/already exists/);
  assert.deepEqual(await readFile(new URL('.env',directory)),original);
});
