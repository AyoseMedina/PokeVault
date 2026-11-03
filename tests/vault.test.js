import test from 'node:test';
import assert from 'node:assert/strict';
import { validateState,cloneVault,deduplicateBackups } from '../dist/vault.js';
import { decodeBackup } from '../dist/backup.js';
import { makeFixtureG3,makeFixtureG2,parseSave,sha256,buildTransfer } from '../dist/core.js';
const empty=()=>({schema:1,saves:[],backups:[],boxes:[],snapshots:[],plans:[],favorites:[],notes:{}});
async function fixture(){
  const bytes=makeFixtureG3('emerald'),hash=await sha256(bytes),at='2026-11-03T12:00:00.000Z';
  return {format:'pokevault-backup',schema:1,createdAt:at,saves:[{id:'save1',game:'emerald',language:'es',hash,data:Buffer.from(bytes).toString('base64'),name:'test.sav',at}],boxes:[],favorites:[],notes:{}};
}
test('unknown schemas, malformed revisions and broken structures fail closed',()=>{
  assert.throws(()=>validateState({...empty(),schema:99}),/Esquema/);
  for(const revision of [-1,'0',NaN])assert.throws(()=>validateState({...empty(),revision}),/Revisión/);
  assert.throws(()=>validateState({...empty(),saves:[{id:'bad'}]}),/Registro/);
  assert.equal(validateState(empty()).schema,1); // Supported legacy states may lack revision.
});
test('metadata cloning isolates boxes and notes without copying immutable bytes',()=>{
  const bytes=new Uint8Array([1,2]),state={...empty(),saves:[{bytes}],boxes:[{slots:['key']}],notes:{key:'before'}};
  const copy=cloneVault(state);copy.notes.key='after';copy.boxes[0].slots[0]=null;
  assert.equal(state.notes.key,'before');assert.equal(state.boxes[0].slots[0],'key');assert.equal(copy.saves[0].bytes,bytes);
});
test('backup deduplication retains prior reasons and a single immutable payload',()=>{
  const bytes=new Uint8Array([1]),backups=deduplicateBackups([{hash:'a',bytes,reason:'import',at:'1'},{hash:'a',bytes:bytes.slice(),reason:'export',at:'2'}]);
  assert.throws(()=>deduplicateBackups([{hash:'a',bytes},{hash:'a',bytes:new Uint8Array([2])}]),/diferentes/);
  assert.equal(backups.length,1);assert.equal(backups[0].bytes,bytes);assert.deepEqual(backups[0].events.map(e=>e.reason),['import','export']);
});
test('v1 restores remain supported, but invalid languages, dates and hashes are rejected',async()=>{
  const backup=await fixture();assert.equal((await decodeBackup(backup)).saves.length,1);
  for(const patch of [{language:'xx'},{at:'not-a-date'},{hash:'0'.repeat(64)}]){const bad=structuredClone(backup);Object.assign(bad.saves[0],patch);await assert.rejects(decodeBackup(bad));}
});
test('restore enforces the combined save limit and deduplicates existing hashes for the limit',async()=>{
  const backup=await fixture();await assert.rejects(decodeBackup(backup,Array.from({length:100},(_,i)=>({hash:String(i)}))),/100/);
  assert.equal((await decodeBackup(backup,[{hash:backup.saves[0].hash}])).saves.length,1);
  await assert.rejects(decodeBackup(backup,Array.from({length:100},()=>({hash:'old-hash'}))),/100/);
  const duplicate=structuredClone(backup);duplicate.saves.push({...duplicate.saves[0],id:'duplicate'});await assert.rejects(decodeBackup(duplicate),/repetido/);
});
test('v2 restores originals, independent backups and preparation history',async()=>{
  const old=await fixture(),save=old.saves[0],other=makeFixtureG2([]),hash=await sha256(other);
  const backup={...old,schema:2,blobs:{[save.hash]:save.data,[hash]:Buffer.from(other).toString('base64')},backups:[{id:'backup1',saveId:null,name:'old.sav',hash,at:save.at,reason:'before export'}],snapshots:[{id:'snap',at:save.at,reason:'old state',boxes:[],favorites:[],notes:{}}],plans:[{id:'plan',at:save.at,count:1,destination:'test',type:'export'}]};
  delete backup.saves[0].data;const decoded=await decodeBackup(backup);assert.equal(decoded.backups.length,1);assert.deepEqual(decoded.backups[0].bytes,other);assert.equal(decoded.plans.length,1);assert.equal(decoded.snapshots.length,1);
});
test('v2 preserves unreadable saves for recovery without making them transferable',async()=>{
  const backup=await fixture(),bytes=new Uint8Array(131072),hash=await sha256(bytes);Object.assign(backup,{schema:2,blobs:{[hash]:Buffer.from(bytes).toString('base64')}});backup.saves[0].hash=hash;
  const decoded=await decodeBackup(backup);assert.ok(decoded.unreadable.has('save1'));assert.deepEqual(decoded.saves[0].bytes,bytes);
});
test('Crystal rejects an active mirror mismatch and checks it again after writing',()=>{
  const bytes=makeFixtureG2([25]),original=bytes.slice();bytes[0x2D10+22+27]^=1;
  assert.throws(()=>parseSave(bytes,'crystal'),/caja activa/);assert.deepEqual(bytes.subarray(0x4000),original.subarray(0x4000));
  const source=parseSave(makeFixtureG2([133]),'crystal').records[0];
  assert.throws(()=>buildTransfer({game:'crystal',bytes},[source],0),/caja activa/);
  const output=buildTransfer({game:'crystal',bytes:original},[source],0,{date:'2026-11-03'}).bytes;
  assert.deepEqual(output.subarray(0x2D10,0x315E),output.subarray(0x4000,0x444E));assert.equal(parseSave(output,'crystal').records.length,2);
});
