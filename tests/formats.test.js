import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseSave, levelFrom, buildTransfer, GAMES, bytesEqual, validFileSize } from '../dist/core.js';
import { parsePK45, decryptPK45, crc16CCITT, unwrapDS } from '../dist/formats.js';
import { DATA } from '../dist/data.js';
import { FORMAT_DATA as F } from '../dist/formats-data.js';
import { reference, encryptedReference, fixtureLayouts, fixtureG4, fixtureG5, fixtureYellow, refreshG4, refreshG5, refreshYellow, wrapDSV } from './fixtures/builders.js';
const dsGames=['diamond','pearl','platinum','heartgold','soulsilver','black','white','black2','white2'];
test('all nine main-series DS titles and Yellow have registered importers',()=>{
 assert.equal(dsGames.length,9);for(const game of [...dsGames,'yellow'])assert.ok(GAMES[game]);assert.equal(Object.keys(GAMES).length,13);assert.equal(DATA.names[649],'Genesect');assert.equal(DATA.moves.length,560);
});
test('CRC16-CCITT matches the independent standard check value',()=>assert.equal(crc16CCITT(new TextEncoder().encode('123456789')),0x29B1));
test('upstream PK4 and PK5 decode exactly through all 32 shuffle selectors',()=>{
 for(const g of [4,5])for(let i=0;i<32;i++){
  const raw=encryptedReference(g,i),decoded=decryptPK45(raw),expected=reference(g);expected.set(raw.subarray(0,4),0);assert.equal(bytesEqual(decoded,expected),true,`Generation ${g}, selector ${i}`);
  const p=parsePK45(raw,g,{location:'pc',box:0,slot:0},levelFrom);assert.equal(p.species,g===4?172:300);assert.equal(p.nickname,'Egg');assert.equal(p.egg,true);assert.equal(p.valid,true);
 }
});
test('encrypted zero species is empty and corrupt Pokémon are quarantined',()=>{
 assert.equal(parsePK45(new Uint8Array(136),4,{},levelFrom),null);
 const raw=encryptedReference(5);raw[80]^=1;assert.equal(parsePK45(raw,5,{},levelFrom).valid,false);
});
for(const game of Object.keys(fixtureLayouts))test(`${game}: independent general/storage block selection, team and last box`,()=>{
 const b=fixtureG4(game,{box:17,slot:29}),before=b.slice(),p=parseSave(b,game);assert.equal(p.generation,4);assert.equal(p.trainer,'NUEVO');assert.equal(p.tid,12345);assert.equal(p.boxes.length,18);assert.equal(p.boxes[17],'CAJA 18');assert.equal(p.records.length,2);assert.equal(p.records[0].species,172);assert.equal(p.records[0].box,17);assert.equal(p.records[0].slot,29);assert.equal(p.records[1].location,'party');assert.equal(p.checks.every(c=>c.ok),true);assert.equal(bytesEqual(before,b),true);
});
test('generation IV CRC corruption of newest block fails without silently falling back',()=>{
 const b=fixtureG4('diamond');b[0x40000+0xC100+10]^=1;assert.throws(()=>parseSave(b,'diamond'),/CRC de la copia más reciente/);
});
test('incorrect generation IV game family is rejected',()=>assert.throws(()=>parseSave(fixtureG4('diamond'),'platinum'),/cabecera no compatible/));
for(const game of ['black','white','black2','white2'])test(`${game}: full block checks, team and final box`,()=>{
 const b=fixtureG5(game,{box:23,slot:29}),before=b.slice(),p=parseSave(b,game);assert.equal(p.generation,5);assert.equal(p.trainer,'TESÉLIA');assert.equal(p.tid,54321);assert.equal(p.boxes.length,24);assert.equal(p.records.length,2);assert.equal(p.records[0].species,300);assert.equal(p.records[0].box,23);assert.equal(p.records[0].slot,29);assert.equal(p.records[1].location,'party');assert.equal(p.checks.every(c=>c.ok),true);assert.equal(bytesEqual(before,b),true);
});
test('generation V checksum copies and incorrect BW/B2W2 family fail closed',()=>{
 const b=fixtureG5('black');b[0x23F04]^=1;assert.throws(()=>parseSave(b,'black'),/CRC incorrecto/);assert.throws(()=>parseSave(fixtureG5('black'),'black2'),/CRC incorrecto/);
});
test('DSV 40/122-byte recognized footer is read without mutating the original',()=>{
 for(const footerSize of [40,122]){const b=wrapDSV(fixtureG4('platinum'),footerSize),before=b.slice(),p=parseSave(b,'platinum');assert.equal(p.records.length,2);assert.match(p.container,/DSV/);assert.equal(bytesEqual(b,before),true);assert.equal(unwrapDS(b).bytes.length,524288);}
});
test('unknown DSV footer, declared size mismatch, compressed and truncated files are rejected',()=>{
 const b=wrapDSV(fixtureG5('white2'));b[b.length-1]=0;assert.throws(()=>parseSave(b,'white2'),/pie .dsv/);const c=wrapDSV(fixtureG5('white2'));c[c.length-36]^=1;assert.throws(()=>parseSave(c,'white2'),/pie .dsv/);assert.throws(()=>parseSave(new Uint8Array(524287),'diamond'),/512 KiB/);assert.throws(()=>parseSave(new Uint8Array(524288),'black'),/CRC incorrecto/);
});
test('Yellow uses internal species IDs, active box over its stale mirror and 12-box bank',()=>{
 const b=fixtureYellow(),before=b.slice(),p=parseSave(b,'yellow');assert.equal(p.records.length,3);assert.equal(p.boxes.length,12);assert.equal(p.trainer,'AMARILLO');assert.equal(p.records[0].species,25);assert.equal(p.records[1].box,8);assert.equal(p.records[1].nickname,'PIKACHU');assert.equal(p.records[1].ot,'ASH');assert.equal(p.records[1].level,20);assert.equal(p.records[2].location,'party');assert.equal(p.checks.every(c=>c.ok),true);assert.equal(bytesEqual(b,before),true);
});
test('Yellow ignores uninitialized box banks and blocks bad checksum and malformed lists',()=>{
 assert.equal(parseSave(fixtureYellow({initialized:false}),'yellow').records.length,2);const bad=fixtureYellow();bad[0x2598]^=1;assert.throws(()=>parseSave(bad,'yellow'),/Checksum principal/);const list=fixtureYellow();list[0x4000]=21;assert.throws(()=>parseSave(list,'yellow'),/Lista/);
});
test('all destination generations reject empty selections',()=>{
 for(const game of ['yellow',...dsGames]){const bytes=game==='yellow'?fixtureYellow():GAMES[game].generation===4?fixtureG4(game):fixtureG5(game);assert.throws(()=>buildTransfer({bytes,game},[],0),/Selecciona/);}
});
test('file-size preflight is specific to selected platform',()=>{
 assert.equal(validFileSize(524410,'diamond'),true);assert.equal(validFileSize(524328,'black2'),true);assert.equal(validFileSize(131072,'yellow'),false);assert.equal(validFileSize(524288,'emerald'),false);
});
test('create local UI fixtures and a portable DS backup with complete DSV bytes',()=>{
 const directory='./.test-output/qa-nds';mkdirSync(directory,{recursive:true});const cases={yellow:fixtureYellow(),diamond:fixtureG4('diamond'),heartgold:fixtureG4('heartgold'),black:fixtureG5('black'),white2:wrapDSV(fixtureG5('white2'))};
 for(const [game,b] of Object.entries(cases))writeFileSync(`${directory}/QA-${game}.${game==='white2'?'dsv':'sav'}`,b);
 const bytes=cases.white2;const backup={format:'pokevault-backup',schema:1,saves:[{id:'qa-nds-restore',name:'QA-restore-white2.dsv',game:'white2',data:Buffer.from(bytes).toString('base64'),hash:'pending',at:'2026-11-03T10:00:00Z'}],boxes:[{id:'qa-box',name:'DS restaurada',slots:['qa-nds-restore/pc/0/0','qa-nds-restore/party/-1/0',...Array(28).fill(null)]}],favorites:[],notes:{}};
 backup.saves[0].hash=createHash('sha256').update(bytes).digest('hex');assert.equal(bytesEqual(new Uint8Array(Buffer.from(backup.saves[0].data,'base64')),bytes),true);writeFileSync(`${directory}/QA-DS-restore.pvault`,JSON.stringify(backup));
});
