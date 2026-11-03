import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { parseSave, parsePK3, decrypt3, sha256Fallback, checksum32, checksum16, put16, put32, national3, internal3, expFor, levelFrom, makeFixtureG3, makeFixtureG2, makeDemoPK3, buildTransfer, prepareTransfer, makeZip, bytesEqual } from '../dist/core.js';

const gba=(game='emerald',ids=[])=>({game,bytes:makeFixtureG3(game,ids.map((s,i)=>makeDemoPK3(s,35+i,s*100+i)))});
const picked=(ids=[6])=>parseSave(gba('firered',ids).bytes,'firered').records;
const rechecksum=(bytes,game)=>{
  const sizes=[game==='emerald'?0xF2C:0xF24,0xF80,0xF80,0xF80,game==='emerald'?0xF08:0xEE8,...Array(8).fill(0xF80),0x7D0];
  const d=new DataView(bytes.buffer);for(let o=0;o<0x1C000;o+=4096){const id=d.getUint16(o+0xFF4,true);if(id<14)put16(bytes,o+0xFF6,checksum32(bytes.subarray(o,o+0xF80),sizes[id]));}
};
test('SHA-256 matches standard vectors and Node crypto at padding boundaries',()=>{
  for(const text of ['', 'abc', 'a'.repeat(55),'a'.repeat(56),'a'.repeat(64),'a'.repeat(100000)]){
    const b=new TextEncoder().encode(text);assert.equal(sha256Fallback(b),createHash('sha256').update(b).digest('hex'));
  }
});
test('generation III national mapping handles Hoenn reordering and unused IDs',()=>{
  assert.equal(national3(277),252);assert.equal(internal3(252),277);assert.equal(internal3(358),411);assert.equal(internal3(384),406);
  for(let i=1;i<=386;i++)assert.equal(national3(internal3(i)),i);
  for(let i=252;i<277;i++)assert.equal(national3(i),0);
});
test('fixed external-layout PK3 vector decodes GEMA permutation, independent of encoder',()=>{
  const raw=new Uint8Array(80);put32(raw,0,3);raw[18]=7;raw[19]=2;raw.fill(255,8,18);raw.fill(255,20,27);
  // Unencrypted physical blocks for PID%24=3: Growth, EV, Misc, Attacks.
  const physical=new Uint8Array(48);put16(physical,0,25);put32(physical,4,125000);put16(physical,36,85);put32(physical,28,0x12345678);
  put16(raw,28,checksum16(physical));for(let i=0;i<48;i+=4)put32(raw,32+i,(new DataView(physical.buffer).getUint32(i,true)^3)>>>0);
  const p=parsePK3(raw);assert.equal(p.valid,true);assert.equal(p.species,25);assert.equal(p.moves[0],85);assert.equal(p.level,50);assert.equal(p.ivs[0],24);
});
test('all 24 personality permutations keep data and checksums intact',()=>{
  for(let seed=0;seed<24;seed++){const p=parsePK3(makeDemoPK3(282,47,seed));assert.equal(p.species,282);assert.equal(p.level,47);assert.equal(p.valid,true);assert.equal(p.ot,'DEMO');}
});
test('each growth curve has consistent level boundaries',()=>{
  const max=[1250000,1000000,800000,1059860,600000,1640000];for(let i=1;i<=6;i++)assert.equal(expFor(100,i),max[i-1]);
  assert.equal(levelFrom(0,1),1);assert.equal(levelFrom(117359,1),49);assert.equal(levelFrom(117360,1),50);
});
test('GBA saves read rotated sectors and latest save slot',()=>{
  for(const game of ['firered','emerald']){const s=gba(game,[25,6,384]);const p=parseSave(s.bytes,game);assert.equal(p.active.counter,10);assert.equal(p.records.length,3);assert.deepEqual(p.records.map(r=>r.species),[25,6,384]);assert.equal(p.checks.every(c=>c.ok),true);}
});
test('generation III counter wrap picks 0 after 0xffffffff',()=>{
  const s=gba();for(let i=0;i<14;i++){put32(s.bytes,i*4096+0xFFC,0);put32(s.bytes,0xE000+i*4096+0xFFC,0xFFFFFFFF);}assert.equal(parseSave(s.bytes,s.game).active.slot,0);
});
test('invalid file sizes, empty data and incomplete sections fail closed',()=>{
  assert.throws(()=>parseSave(new Uint8Array(65536),'emerald'),/128 KiB/);assert.throws(()=>parseSave(new Uint8Array(131088),'emerald'),/128 KiB/);assert.throws(()=>parseSave(new Uint8Array(131072),'firered'),/bloque completo/);
  const s=gba();s.bytes[3*4096]^=1;assert.throws(()=>parseSave(s.bytes,s.game),/más reciente está dañada/);
});
test('bad Pokémon checksum is quarantined and cannot be copied',()=>{
  const p=picked()[0];p.raw[40]^=1;p.valid=false;assert.throws(()=>prepareTransfer(gba(),[p],0),/no válido/);
});
test('copy creates a new buffer and preserves source, old backup, and destination bytes outside allowed areas',()=>{
  const source=picked([6,9]),target=gba('emerald',[25]),before=target.bytes.slice(),sourceBefore=source.map(p=>p.raw.slice());
  const out=buildTransfer(target,source,0);assert.equal(bytesEqual(target.bytes,before),true);assert.equal(out.bytes.length,before.length);assert.equal(out.checked.records.length,3);
  assert.deepEqual(out.checked.records.map(p=>p.species),[25,6,9]);assert.equal(bytesEqual(out.bytes.subarray(0xE000),before.subarray(0xE000)),true);source.forEach((p,i)=>assert.equal(bytesEqual(p.raw,sourceBefore[i]),true));
  for(const id of [0,1,2,3,4]){const start=out.checked.active.sectors[id];assert.equal(bytesEqual(out.bytes.subarray(start,start+4096),before.subarray(start,start+4096)),true);}
});
test('copy crossing a fragmented PC sector boundary preserves all 80 bytes',()=>{
  const target=gba('emerald',Array.from({length:49},(_,i)=>i+1));const p=picked([384])[0],out=buildTransfer(target,[p],1);assert.equal(out.placements[0].slot,19);const result=out.checked.records.find(r=>r.box===1&&r.slot===19);assert.equal(bytesEqual(result.raw,p.raw),true);assert.equal(result.species,384);
});
test('occupied boxes, duplicate identities and repeated selections are blocked',()=>{
  const p=picked([6])[0];assert.throws(()=>buildTransfer(gba('firered',[6]),[p],0),/ya existe/);assert.throws(()=>buildTransfer(gba(),[p,p],0),/repetido/);
  const full=gba('emerald',Array.from({length:30},(_,i)=>i+1));assert.throws(()=>buildTransfer(full,picked([384]),0),/0 huecos/);
});
test('cross-generation, team Pokémon, eggs, Japanese and demo exports are blocked',()=>{
  const target=gba(),p=picked()[0];
  assert.throws(()=>prepareTransfer(target,[{...p,generation:2}],0),/conversión personalizada/);
  assert.throws(()=>prepareTransfer(target,[{...p,location:'party'}],0),/Deposita/);
  assert.throws(()=>prepareTransfer(target,[{...p,egg:true}],0),/huevos/);
  assert.throws(()=>prepareTransfer(target,[{...p,language:1}],0),/idiomas/);
  assert.throws(()=>prepareTransfer({...target,demo:true},[p],0),/demo/);
  assert.throws(()=>prepareTransfer({game:'crystal',bytes:makeFixtureG2()},[p],0),/generación anterior/);
});
test('copy works in both GBA directions and in the last PC box',()=>{
  const p=parseSave(gba('emerald',[384]).bytes,'emerald').records[0],out=buildTransfer(gba('firered'),[p],13);assert.equal(out.checked.records[0].species,384);assert.equal(out.checked.records[0].box,13);assert.equal(out.checked.records[0].valid,true);
});
test('Crystal boxes use the international 0x450 stride and checksum',()=>{
  const b=makeFixtureG2([245,157,181]),p=parseSave(b,'crystal');assert.equal(p.records.length,3);assert.equal(p.records[0].name,'Suicune');assert.equal(p.records[2].level,41);assert.equal(p.checks.every(c=>c.ok),true);b[0x200B]^=1;assert.throws(()=>parseSave(b,'crystal'),/Checksum principal/);
});
test('Crystal structural list damage is detected even outside main checksum area',()=>{
  const b=makeFixtureG2();b[0x4000]=21;assert.throws(()=>parseSave(b,'crystal'),/Lista/);const c=makeFixtureG2();c[0x4009]=0;assert.throws(()=>parseSave(c,'crystal'),/terminador/);
});
test('ZIP round-trip is compatible with independent Python zipfile CRC validation',()=>{
  const dir='./.test-output/qa';mkdirSync(dir,{recursive:true});const bytes=makeZip([{name:'originales/prueba.sav',data:gba().bytes},{name:'manifiesto.json',data:'{"verified":true}'}]);writeFileSync(`${dir}/test-package.zip`,bytes);
});
test('write local non-playable QA fixtures, never bundled with the site',()=>{
  const dir='./.test-output/qa';mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/QA-RojoFuego.sav`,gba('firered',[6,25,133]).bytes);writeFileSync(`${dir}/QA-Esmeralda.sav`,gba('emerald',[254,260]).bytes);writeFileSync(`${dir}/QA-Cristal.srm`,makeFixtureG2());writeFileSync(`${dir}/corrupt.sav`,new Uint8Array(131072));
});
