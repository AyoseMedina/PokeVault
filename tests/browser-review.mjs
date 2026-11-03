// Optional browser integration suite. Only synthetic data, isolated browser profiles.
// Install Playwright in .test-output/ui-check; see docs/VALIDATION.md.
import { chromium } from '../.test-output/ui-check/node_modules/playwright/index.mjs';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { hashPassword } from '../server/password.js';
import { randomBytes } from 'node:crypto';
import { makeFixtureG3,makeDemoPK3,sha256 } from '../dist/core.js';
import { readFile,mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const password=randomBytes(24).toString('hex');
const config=readConfig({POKEVAULT_USERNAME:'browser-test',POKEVAULT_PASSWORD_HASH:await hashPassword(password),POKEVAULT_SESSION_SECRET:randomBytes(32).toString('hex'),POKEVAULT_ORIGIN:'http://localhost:18082'});
const access=createApp(config),server=access.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));config.origin=`http://localhost:${server.address().port}`;config.host=new URL(config.origin).host;
const browser=await chromium.launch({headless:true}),errors=[];
const bytes=makeFixtureG3('emerald'),hash=await sha256(bytes),at='2026-11-03T12:00:00.000Z';
const save={id:'empty-save',name:'empty.sav',game:'emerald',language:'es',bytes:[...bytes],hash,at};
const bank={schema:1,revision:7,saves:[save],backups:[{...save,id:'backup1',saveId:save.id,reason:'Original al importar'}],boxes:[{id:'box',name:'Original box',slots:Array(30).fill(null)}],favorites:[],notes:{},snapshots:[],plans:[]};
let auth;
try{
  const context=await browser.newContext();const login=await context.newPage();await login.goto(config.origin);await login.fill('#username','browser-test');await login.fill('#password',password);await login.click('#submit');await login.locator('#mobile-menu').waitFor({state:'attached'});auth=await context.storageState();await context.close();
  async function setup(seed){
    const ctx=await browser.newContext({storageState:auth,acceptDownloads:true});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(config.origin+'/healthz');
    if(seed)await page.evaluate(async seed=>{
      for(const item of [...(seed.saves||[]),...(seed.backups||[])])if(Array.isArray(item.bytes))item.bytes=new Uint8Array(item.bytes);
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('pokevault-r36s-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('vault');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      await new Promise((resolve,reject)=>{const tx=db.transaction('vault','readwrite');tx.objectStore('vault').put(seed,'state');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
    },seed);
    await page.goto(config.origin);await page.locator('#mobile-menu').waitFor({state:'attached'});return {ctx,page};
  }
  const read=page=>page.evaluate(async()=>{const v=await import('/vault.js'),db=await v.openVault();try{const state=await v.readVault(db),raw=await v.readVault(db,{raw:true});return {state,raw,version:db.version,blobs:await new Promise(r=>{const q=db.transaction('blobs').objectStore('blobs').count();q.onsuccess=()=>r(q.result);})};}finally{db.close();}});
  const nav=async(page,id)=>page.locator(`.sidebar [data-nav="${id}"]`).click();
  const importSave=async(page,data=makeFixtureG3('firered',[makeDemoPK3(25,20,123)]))=>{await page.locator('[data-action="import"]').first().click();await page.selectOption('#import-game','firered');await page.setInputFiles('#save-file',{name:'new.sav',mimeType:'application/octet-stream',buffer:Buffer.from(data)});await page.click('#import-confirm');await page.locator('#modal-root .modal').waitFor({state:'hidden'});};
  {
    const {ctx,page}=await setup(bank);
    assert.equal(await page.locator('[data-action="demo"]').count(),0,'A save with no Pokémon must not expose demo');
    await importSave(page);const result=await read(page);assert.equal(result.state.saves.length,2);assert.equal(result.version,2);assert.equal(result.raw.schema,2);assert.equal(result.blobs,2);assert.equal(result.raw.saves.some(s=>'bytes'in s),false);assert.equal(result.state.saves[0].hash,hash);assert.equal(result.state.backups[0].hash,hash);
    // A second tab with a stale revision must fail rather than overwrite an import.
    const second=await ctx.newPage();await second.goto(config.origin);await second.locator('[data-action="new-box"]').first().waitFor();
    await page.locator('[data-action="new-box"]').first().click();await page.fill('#box-name','First tab');await page.click('#box-save');
    await second.locator('[data-action="new-box"]').first().click();await second.fill('#box-name','Stale tab');await second.click('#box-save');await second.waitForFunction(()=>document.querySelector('#toast').textContent.includes('otra pestaña'));
    assert.equal((await read(page)).state.boxes.some(b=>b.name==='Stale tab'),false);
    // Complete export and restore into a separate empty browser bank.
    await nav(page,'backups');await page.click('#backup-all');const download=page.waitForEvent('download');await page.click('#ready-download');const file=await download;const exported=JSON.parse(await readFile(await file.path(),'utf8'));assert.equal(exported.schema,2);assert.ok(exported.backups.length);assert.ok(exported.snapshots.length);
    const restored=await setup();await restored.page.locator('.sidebar [data-nav="backups"]').click();await restored.page.setInputFiles('#vault-file',{name:'test.pvault',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await restored.page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Respaldo validado'));assert.equal((await read(restored.page)).state.saves.length,2);await restored.ctx.close();
    await page.locator('#modal-root [data-close]').first().click();await nav(page,'saves');await page.locator('[data-save-remove="empty-save"]').click();assert.equal(await page.locator('#retire-confirm').isDisabled(),true);const retireDownload=page.waitForEvent('download');await page.click('#retire-download');await retireDownload;await page.check('#retire-ack');await page.fill('#retire-word','RETIRAR');await page.click('#retire-confirm');await page.locator('#modal-root .modal').waitFor({state:'hidden'});const retired=await read(page);assert.equal(retired.state.saves.length,1);assert.equal(retired.blobs,1);await ctx.close();
    console.log('PASS: empty-save demo guard, v1→v2 migration, unique blobs, stale tab, v2 export/restore and confirmed retirement');
  }
  {
    const {ctx,page}=await setup(); // Demo is open with an empty DB.
    // Simulate another tab importing a real empty save after the demo started.
    await page.evaluate(async bank=>{for(const x of [...bank.saves,...bank.backups])x.bytes=new Uint8Array(x.bytes);const v=await import('/vault.js'),db=await v.openVault();await v.writeVault(db,bank,0);db.close();},bank);
    await page.locator('[data-action="import"]').first().click();await page.setInputFiles('#save-file',{name:'new.sav',mimeType:'application/octet-stream',buffer:Buffer.from(makeFixtureG3('emerald',[makeDemoPK3(25,20,1)]))});await page.click('#import-confirm');await page.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('banco real'));assert.equal((await read(page)).state.saves[0].hash,hash);
    await page.locator('#modal-root [data-close]').first().click();await page.click('[data-action="exit-demo"]');assert.equal(await page.locator('[data-action="demo"]').count(),0);assert.equal((await read(page)).state.saves.length,1);await ctx.close();
    console.log('PASS: concurrent real bank cannot be replaced by a demo import; exiting demo reloads saved data');
  }
  {
    const {ctx,page}=await setup();
    await page.evaluate(async bank=>{for(const x of [...bank.saves,...bank.backups])x.bytes=new Uint8Array(x.bytes);const v=await import('/vault.js'),db=await v.openVault();await v.writeVault(db,bank,0);db.close();},bank);
    await page.locator('[data-action="new-box"]').first().click();await page.fill('#box-name','Demo only');await page.click('#box-save');assert.equal((await read(page)).state.boxes.some(b=>b.name==='Demo only'),false);
    await nav(page,'backups');await page.setInputFiles('#vault-file',{name:'restore.pvault',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'pokevault-backup',schema:1,saves:[]}))});await page.waitForFunction(()=>document.querySelector('#restore-status').textContent.includes('banco real'));assert.equal((await read(page)).state.saves[0].hash,hash);await ctx.close();
    console.log('PASS: demo edits stay in memory and demo restore cannot replace a real bank');
  }
  {
    const {ctx,page}=await setup(bank);
    const result=await page.evaluate(async()=>{
      const v=await import('/vault.js'),db=await v.openVault(),before=await v.readVault(db),put=IDBObjectStore.prototype.put;let message='';
      IDBObjectStore.prototype.put=function(...args){if(this.name==='vault')throw new DOMException('Test quota','QuotaExceededError');return put.apply(this,args);};
      try{const next=v.cloneVault(before);next.boxes[0].name='Must not persist';await v.writeVault(db,next,before.revision);}catch(e){message=e.name;}
      finally{IDBObjectStore.prototype.put=put;}
      const after=await v.readVault(db);db.close();return {message,revision:after.revision,name:after.boxes[0].name};
    });assert.deepEqual(result,{message:'QuotaExceededError',revision:7,name:'Original box'});await ctx.close();console.log('PASS: failed quota write leaves the original state and revision intact');
  }
  {
    const damaged=structuredClone(bank);const bad=new Uint8Array(131072);damaged.saves.push({...save,id:'bad',name:'unreadable.sav',bytes:[...bad],hash:await sha256(bad)});
    const {ctx,page}=await setup(damaged);await nav(page,'saves');assert.match(await page.locator('main').innerText(),/cuarentena/);assert.equal(await page.locator('[data-save-boxes="bad"]').isDisabled(),true);await nav(page,'backups');await page.click('#backup-all');const d=page.waitForEvent('download');await page.click('#ready-download');const file=await d;assert.equal(JSON.parse(await readFile(await file.path(),'utf8')).saves.length,2);await ctx.close();
    console.log('PASS: unreadable save remains downloadable without blocking the rest of the bank');
  }
  {
    const unknown={...bank,schema:99};delete unknown.revision;const {ctx,page}=await setup(unknown);assert.match(await page.locator('main').innerText(),/Esquema/);assert.equal(await page.locator('[data-action="demo"]').count(),0);await page.click('#recover-raw');assert.equal(await page.locator('#ready-download').count(),1);assert.equal((await read(page)).raw.schema,99);await ctx.close();
    console.log('PASS: unknown schema without revision is preserved and recovery remains available');
  }
  {
    const {ctx,page}=await setup(bank);await page.locator('[data-action="import"]').first().click();
    await page.evaluate(()=>{const channel=new BroadcastChannel('pokevault-access');channel.postMessage('logout');channel.close();});await page.locator('#session-expired').waitFor();assert.ok(!page.url().endsWith('/login'));assert.equal(await page.locator('#modal-root .modal').isVisible(),true);
    // A real logout elsewhere revokes auth; closing the modal can now navigate safely.
    await page.evaluate(async()=>{const {csrf}=await (await fetch('/auth/session')).json();await fetch('/auth/logout',{method:'POST',headers:{'X-CSRF-Token':csrf}});});await page.locator('#modal-root [data-close]').first().click();await page.waitForURL('**/login');await ctx.close();
    console.log('PASS: cross-tab logout preserves an open task until the dialog closes');
  }
  assert.deepEqual(errors,[]);console.log('Browser review regressions passed.');
}finally{await browser.close();access.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
