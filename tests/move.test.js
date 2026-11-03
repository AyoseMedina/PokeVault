import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSave,makeFixtureG2,makeFixtureG3,makeDemoPK3,sha256} from '../dist/core.js';
import {fixtureYellow,fixtureG4,fixtureG5,wrapDSV} from './fixtures/builders.js';
import {removeSelected,buildMove,resultPath} from '../dist/move.js';
import {consumeVersions,assertUnconsumed,mergeConsumed,annulExport} from '../dist/consumed.js';
import {decodeBackup} from '../dist/backup.js';
const fixtures={yellow:()=>fixtureYellow(),crystal:()=>makeFixtureG2(),emerald:()=>makeFixtureG3('emerald',[makeDemoPK3(25,35,33),makeDemoPK3(6,40,44)]),platinum:()=>wrapDSV(fixtureG4('platinum')),heartgold:()=>fixtureG4('heartgold'),black:()=>wrapDSV(fixtureG5('black')),black2:()=>fixtureG5('black2')};
for(const [game,fixture] of Object.entries(fixtures))test(`move removes PC entity, retains all other entities and original bytes: ${game}`,()=>{
 const s={game,bytes:fixture(),language:'es'},original=s.bytes.slice(),parsed=parseSave(s.bytes,game),p=parsed.records.find(p=>p.location==='pc');
 const r=removeSelected(s,[p]);assert.deepEqual(s.bytes,original);assert.equal(r.checked.records.length,parsed.records.length-1);assert.ok(r.checked.checks.every(c=>c.ok));
 for(let i=0;i<original.length;i++)if(!r.allowed[i])assert.equal(r.bytes[i],original[i]);
 if(original.length>524288)assert.deepEqual(r.bytes.subarray(524288),original.subarray(524288));
 assert.throws(()=>removeSelected(s,[p,p]),/repetida/);
 assert.throws(()=>removeSelected({...s,consumedBy:'x'},[p]),/consumida/);
});
test('multi-file move preserves exact names and blocks same source/destination or name collisions',async()=>{
 const s={id:'source',game:'emerald',name:'Mi aventura é.srm',bytes:fixtures.emerald()},d={id:'dest',game:'firered',name:'Rojo fuego.SAV',bytes:makeFixtureG3('firered',[])};
 for(const f of [s,d])f.hash=await sha256(f.bytes);
 const picks=parseSave(s.bytes,s.game).records.map(p=>({...p,saveId:s.id}));
 const out=buildMove(d,picks,0,[s]);assert.equal(out.outputs.length,2);assert.equal(resultPath(s),'copiar-a-la-SD/gba/Mi aventura é.srm');assert.equal(resultPath(d),'copiar-a-la-SD/gba/Rojo fuego.SAV');
 assert.equal(resultPath({...s,game:'platinum',name:'Mi DS é.dsv'}),'copiar-a-la-SD/nds/Mi DS é.dsv');
 assert.equal(parseSave(out.outputs[1].bytes,s.game).records.length,0);
 assert.throws(()=>buildMove(s,picks,0,[s]),/misma partida/);
 assert.throws(()=>buildMove({...d,name:s.name},picks,0,[s]),/comparten nombre/);
 assert.throws(()=>buildMove({...d,name:s.name.toUpperCase().normalize('NFD')},picks,0,[s]),/comparten nombre/);
 for(const name of ['../a.sav','a\\b.sav','a/b.sav','a\0.sav'])assert.throws(()=>resultPath({...s,name}),/Nombre/);
});
test('consumption survives retirement and old backup merges; annul requires confirmation and no imported result',()=>{
 const s={id:'s',hash:'a'.repeat(64)},d={id:'d',hash:'b'.repeat(64)},state={saves:[{...s},{...d}],plans:[{id:'export1',type:'export',files:[{after:'c'.repeat(64)}]}]},at='2026-11-03T12:00:00Z';
 consumeVersions(state,[s,d],'export1',at);assert.throws(()=>assertUnconsumed(state,s.hash),/consumida/);
 state.saves=[];mergeConsumed(state,{saves:[]});assert.throws(()=>assertUnconsumed(state,s.hash),/consumida/);
 assert.throws(()=>annulExport(state,'export1',false,at),/Confirma/);
 state.saves.push({hash:'c'.repeat(64)});assert.throws(()=>annulExport(state,'export1',true,at),/Ya se importó/);state.saves=[];
 annulExport(state,'export1',true,at);assertUnconsumed(state,s.hash);assert.equal(state.plans[0].cancelledAt,at);
});
test('Crystal compacts multiple removals in order in both bank and active box',()=>{
 const s={game:'crystal',bytes:makeFixtureG2([25,133,6,9,150])},records=parseSave(s.bytes,s.game).records;
 const r=removeSelected(s,[records[1],records[3]]);assert.deepEqual(r.checked.records.map(p=>p.species),[25,6,150]);
 assert.deepEqual(r.bytes.subarray(0x2D10,0x315E),r.bytes.subarray(0x4000,0x444E));
 [records[0],records[2],records[4]].forEach((p,i)=>{assert.equal(r.checked.records[i].slot,i);assert.deepEqual(r.checked.records[i].raw,p.raw);assert.deepEqual(r.checked.records[i].nicknameRaw,p.nicknameRaw);});
});
test('optional consumption metadata reads in both backup schemas and malformed ledgers fail closed',async()=>{
 const bytes=makeFixtureG3('emerald',[]),hash=await sha256(bytes),at='2026-11-03T12:00:00Z',s={id:'save',name:'Mi partida.srm',game:'emerald',language:'es',hash,at,data:Buffer.from(bytes).toString('base64')};
 for(const schema of [1,2]){
  const base={format:'pokevault-backup',schema,createdAt:at,saves:[s],blobs:{[hash]:s.data},boxes:[],favorites:[],notes:{}};
  assert.deepEqual((await decodeBackup(base)).consumed,{});
  const marked={...base,saves:[{...s,consumedBy:'export1',consumedAt:at}]};
  assert.equal((await decodeBackup(marked)).consumed[hash].consumedBy,'export1');
  await assert.rejects(decodeBackup({...marked,consumed:{bad:{}}}),/consumidas/);
 }
});
