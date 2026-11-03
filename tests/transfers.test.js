import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseSave, parsePK3, decrypt3, encrypt3, decode3, levelFrom, checksum16, makeDemoPK3, makeFixtureG3, makeFixtureG2, GAMES, prepareTransfer, buildTransfer, bytesEqual, u16, u32, put16, put32 } from '../dist/core.js';
import { encryptPK45, decryptPK45, crc16CCITT } from '../dist/formats.js';
import { convertPokemon, entityIdentity, routeFor } from '../dist/transfer.js';
import { FORMAT_DATA as F } from '../dist/formats-data.js';
import { TRANSFER_DATA as T } from '../dist/transfer-data.js';
import { reference, fixtureG4, fixtureG5, fixtureYellow, refreshG4, refreshG5, refreshYellow, wrapDSV } from './fixtures/builders.js';
const api={parseSave,parsePK3,decrypt3,decode3,levelFrom,checksum16,GAMES},opts={date:'2026-11-03'};
function sourceDS(g,mutate=()=>{}){
 const plain=reference(g);put32(plain,0,0x12345679);put16(plain,10,0);put32(plain,56,u32(plain,56)&~0x40000000);plain[0x40]&=6;plain[0x17]=2;plain[0x83]=4;plain[0x86]=0;mutate(plain);
 const game=g===4?'platinum':'black2',bytes=g===4?fixtureG4(game):fixtureG5(game),base=g===4?0x40000+0xCF2C+4:0x400;bytes.set(encryptPK45(plain),base);g===4?refreshG4(bytes,game):refreshG5(bytes,game);return parseSave(bytes,game).records.find(p=>p.location==='pc');
}
function source3(mutate=()=>{}){
 const h=makeDemoPK3(6,50,100).slice(0,32),g=decrypt3(makeDemoPK3(6,50,100));h[27]=10;put16(g,38,(3<<7)|(4<<11)|10);g.set([100,80,0,0,0,0,50,40,30,20,10,5],24);put32(g,44,2|(1<<3)|(4<<6)|(1<<15));g[8]=0xE4;mutate(h,g);const raw=encrypt3(h,g);return {...parsePK3(raw),location:'pc',box:0,slot:0};
}
function target(game){return {game,language:'es',bytes:GAMES[game].generation===4?fixtureG4(game):GAMES[game].generation===5?fixtureG5(game):game==='crystal'?makeFixtureG2([245]):fixtureYellow()};}
function sourceYellow(){const b=fixtureYellow(),o=0x30C0+22;b[o+12]=0xAB;b[o+13]=0xCD;b[o+7]=0xA3;refreshYellow(b);return parseSave(b,'yellow').records.find(p=>p.box===8);}
const finalPK=(result,p)=>result.checked.records.find(x=>x.location==='pc'&&x.box===p.box&&x.slot===p.slot);

test('route matrix permits only same generations and I→II / III→IV→V',()=>{
 for(let a=1;a<=5;a++)for(let b=1;b<=5;b++){const ok=a===b||(a===1&&b===2)||(a===3&&[4,5].includes(b))||(a===4&&b===5);if(ok)assert.ok(routeFor(a,b));else assert.throws(()=>routeFor(a,b));}
});
test('Game Boy I→I and II→II append without altering existing Pokémon',()=>{
 const src2=parseSave(makeFixtureG2([25]),'crystal').records[0];
 for(const [game,p] of [['yellow',sourceYellow()],['crystal',src2]])for(const box of [0,8,game==='yellow'?11:13]){
  const d=target(game),before=d.bytes.slice(),result=buildTransfer(d,[p],box,opts),placed=finalPK(result,result.placements[0]);assert.equal(placed.species,p.species);assert.equal(bytesEqual(placed.raw,p.raw),true);assert.equal(bytesEqual(placed.otRaw,p.otRaw),true);assert.equal(bytesEqual(placed.nicknameRaw,p.nicknameRaw),true);assert.equal(bytesEqual(d.bytes,before),true);assert.equal(result.checked.records.length,parseSave(before,game).records.length+1);
 }
});
test('Yellow updates main, per-box and bank checksums including active mirror',()=>{
 const d=target('yellow'),result=buildTransfer(d,[sourceYellow()],8,opts),b=result.bytes,complement=bytes=>(~bytes.reduce((n,x)=>(n+x)&255,0))&255;
 assert.equal(b[0x3523],complement(b.subarray(0x2598,0x3523)));assert.equal(b[0x7A4C],complement(b.subarray(0x6000,0x7A4C)));for(let i=0;i<6;i++)assert.equal(b[0x7A4D+i],complement(b.subarray(0x6000+i*0x462,0x6000+(i+1)*0x462)));assert.equal(bytesEqual(b.subarray(0x30C0,0x3522),b.subarray(0x6000+2*0x462,0x6000+3*0x462)),true);
});
test('Yellow uninitialized PC permits only its active box',()=>{
 const d={game:'yellow',bytes:fixtureYellow({initialized:false})};assert.throws(()=>buildTransfer(d,[sourceYellow()],0,opts),/no están inicializadas/);assert.equal(buildTransfer(d,[sourceYellow()],8,opts).checked.records.length,3);
});
test('Crystal keeps backup main data and its own checksum intact',()=>{
 const d=target('crystal');d.bytes.set(d.bytes.subarray(0x2009,0x2B83),0x1209);d.bytes[0x1209]=88;let sum=0;for(let i=0x1209;i<0x1D83;i++)sum=(sum+d.bytes[i])&65535;put16(d.bytes,0x1F0D,sum);const before=d.bytes.slice(),source=parseSave(makeFixtureG2([25]),'crystal').records[0],result=buildTransfer(d,[source],0,opts);
 assert.equal(bytesEqual(result.bytes.subarray(0x1209,0x1D83),before.subarray(0x1209,0x1D83)),true);assert.equal(u16(result.bytes,0x1F0D),sum);assert.equal(u16(result.bytes,0x2D0D),u16(before,0x2D0D));assert.equal(bytesEqual(result.bytes.subarray(0x4000,0x444E),result.bytes.subarray(0x2D10,0x315E)),true);
});
test('Yellow→Crystal preserves data and applies the native catch-rate item conversion',()=>{
 const p=sourceYellow(),d={game:'crystal',language:'es',bytes:makeFixtureG2([])},result=buildTransfer(d,[p],0,opts),pk=finalPK(result,result.placements[0]);assert.equal(pk.species,25);assert.equal(pk.level,20);assert.equal(pk.heldItem,0xA3);assert.equal(pk.raw[27],70);assert.equal(bytesEqual(pk.raw.subarray(2,27),p.raw.subarray(8,33)),true);assert.equal(bytesEqual(pk.otRaw,p.otRaw),true);assert.equal(bytesEqual(pk.nicknameRaw,p.nicknameRaw),true);assert.equal(pk.tid,p.tid);
 assert.throws(()=>buildTransfer({...d,bytes:result.bytes},[p],0,opts),/ya existe/);
});
test('Gen III→IV preserves identity, IVs, EVs, nature, ability, marks and ribbons',()=>{
 const p=source3(),d=target('platinum'),before=d.bytes.slice(),result=buildTransfer(d,[p],0,opts),pk=finalPK(result,result.placements[0]),plain=decryptPK45(pk.raw),g=decrypt3(p.raw);
 assert.equal(pk.species,6);assert.equal(pk.pid,p.pid);assert.equal(pk.tid,p.tid);assert.equal(pk.exp,p.exp);assert.deepEqual(pk.ivs,p.ivs);assert.deepEqual(pk.moves,p.moves);assert.equal(pk.ot,p.ot);assert.equal(pk.nickname,p.nickname);assert.equal(plain[0x15],66);assert.equal(plain[0x16],12);assert.equal(u32(plain,0x3C),0x100F13);assert.equal(u32(plain,0x38)>>>31,0);assert.deepEqual([...plain.subarray(0x18,0x24)],[...g.subarray(24,36)]);assert.equal(u16(plain,0x80),55);assert.equal(plain[0x5F],3);assert.equal(plain[0x83],4);assert.deepEqual([...plain.subarray(0x7B,0x7E)],[26,11,3]);assert.equal(plain[0x14],70);assert.equal(plain[0x30],T.pp4[33]);assert.equal(plain[0x31],Math.floor(T.pp4[45]*6/5));assert.equal(bytesEqual(d.bytes,before),true);assert.equal(bytesEqual(result.bytes.subarray(0,0xCF2C),before.subarray(0,0xCF2C)),true);
});
test('Gen III→V chains both conversions and keeps PID/nature/IVs intact',()=>{
 const p=source3(),result=buildTransfer(target('white2'),[p],23,opts),pk=finalPK(result,result.placements[0]),plain=decryptPK45(pk.raw);assert.equal(result.route,'III → IV → V');assert.equal(pk.pid,p.pid);assert.deepEqual(pk.ivs,p.ivs);assert.equal(plain[0x41],p.pid%25);assert.equal(u16(plain,0x80),30001);assert.equal(plain[0x5F],3);assert.equal(plain[0x84]&127,p.level);assert.deepEqual([...plain.subarray(0x7B,0x7E)],[26,11,3]);assert.equal(result.notes.length,2);
});
test('Gen IV→V encodes names and retains HGSS ball, PID, nature and marks',()=>{
 const p=sourceDS(4,plain=>{plain[0x86]=23;plain[0x16]=6;}),result=buildTransfer(target('black2'),[p],3,opts),pk=finalPK(result,result.placements[0]),plain=decryptPK45(pk.raw);assert.equal(pk.species,p.species);assert.equal(pk.nickname,p.nickname);assert.equal(pk.ot,p.ot);assert.equal(pk.pid,p.pid);assert.equal(plain[0x41],p.pid%25);assert.equal(plain[0x83],23);assert.equal(plain[0x86],0);assert.equal(plain[0x16],6);assert.equal(u16(plain,0x80),30001);assert.equal(plain[0x14],70);assert.equal(plain[0x84]&127,p.level);
});
test('forward conversions preserve leading and trailing name spaces byte-for-byte in text',()=>{
 const p3=source3((h,g)=>{h.fill(255,8,18);h.set([0,0xBB,0],8);h.fill(255,20,27);h.set([0,0xBB,0],20);}),out4=convertPokemon(p3,4,api,opts),plain4=decryptPK45(out4.raw);
 assert.deepEqual([u16(plain4,0x48),u16(plain4,0x4A),u16(plain4,0x4C),u16(plain4,0x4E)],[F.g4chars.indexOf(' '),F.g4chars.indexOf('A'),F.g4chars.indexOf(' '),65535]);
 const p4={...out4.pokemon,location:'pc'},out5=convertPokemon(p4,5,api,opts),plain5=decryptPK45(out5.raw);assert.deepEqual([u16(plain5,0x48),u16(plain5,0x4A),u16(plain5,0x4C),u16(plain5,0x4E)],[32,65,32,65535]);
});
test('unknown DS glyphs and language-dependent GBA quote glyphs are rejected',()=>{
 const p=sourceDS(4,plain=>put16(plain,0x48,0xEFFF));assert.throws(()=>convertPokemon(p,5,api,opts),/glifo desconocido/);
 for(const language of [3,5])assert.throws(()=>convertPokemon(source3((h,g)=>{h[18]=language;h[8]=0xB1;}),4,api,opts),/glifos de GBA/);
});
test('Pal Park metadata uses the Italian template without swapping German',()=>{
 for(const [lang,expected] of [[4,0x84],[5,0xA4]]){const p=source3((h,g)=>{h[18]=lang;h.fill(255,8,18);h[8]=0xBB;}),plain=decryptPK45(convertPokemon(p,4,api,opts).raw);assert.equal(plain[0x58],expected);}
});
test('all generation IV destination layouts support exact PC copies and preserve backup partitions',()=>{
 const p=sourceDS(4);for(const game of ['diamond','pearl','platinum','heartgold','soulsilver']){
  const d=target(game),before=d.bytes.slice(),result=buildTransfer(d,[p],17,opts),pk=finalPK(result,result.placements[0]);assert.equal(bytesEqual(pk.raw,p.raw),true,game);assert.equal(bytesEqual(d.bytes,before),true);assert.equal(bytesEqual(result.bytes.subarray(0,game==='platinum'?0xCF2C:game==='diamond'||game==='pearl'?0xC100:0xF628),before.subarray(0,game==='platinum'?0xCF2C:game==='diamond'||game==='pearl'?0xC100:0xF628)),true);if(['heartgold','soulsilver'].includes(game))assert.ok(u32(result.bytes,result.checked.writeInfo.storageBase+0x12004)&(1<<17));
 }
});
test('all generation V layouts update local CRC and mirrored checksum-table CRC',()=>{
 const p=sourceDS(5);for(const game of ['black','white','black2','white2']){
  const d=target(game),before=d.bytes.slice(),result=buildTransfer(d,[p],23,opts),pk=finalPK(result,result.placements[0]);assert.equal(bytesEqual(pk.raw,p.raw),true);const blocks=F[game.endsWith('2')?'b2w2':'bw'];for(const [o,n,c,m] of blocks){const crc=crc16CCITT(result.bytes.subarray(o,o+n));assert.equal(u16(result.bytes,c),crc);assert.equal(u16(result.bytes,m),crc);}const end=game.endsWith('2')?0x26000:0x24000;assert.equal(bytesEqual(result.bytes.subarray(end),before.subarray(end)),true);
 }
});
test('DSV exports retain their exact original footer and file length',()=>{
 const bytes=wrapDSV(fixtureG5('white2')),d={game:'white2',bytes},result=buildTransfer(d,[source3()],0,opts);assert.equal(result.bytes.length,bytes.length);assert.equal(bytesEqual(result.bytes.subarray(524288),bytes.subarray(524288)),true);assert.match(result.checked.container,/DSV/);
});
test('duplicate detection works after conversion and with mixed generations',()=>{
 const p=source3(),d=target('platinum'),first=buildTransfer(d,[p],0,opts);assert.throws(()=>buildTransfer({...d,bytes:first.bytes},[p],1,opts),/ya existe/);const converted=finalPK(first,first.placements[0]);assert.equal(entityIdentity(converted),entityIdentity(p));assert.throws(()=>buildTransfer(target('black2'),[p,converted],0,opts),/repetido/);
});
test('backward and II→III paths fail; invalid destinations, items, eggs and team are blocked',()=>{
 const p3=source3(),p4=sourceDS(4),p5=sourceDS(5);assert.throws(()=>buildTransfer(target('platinum'),[p5],0,opts),/generación anterior/);assert.throws(()=>buildTransfer(target('crystal'),[p3],0,opts),/generación anterior/);
 const p2=parseSave(makeFixtureG2([25]),'crystal').records[0];assert.throws(()=>buildTransfer({game:'emerald',bytes:makeFixtureG3('emerald')},[p2],0,opts),/No existe intercambio/);assert.throws(()=>buildTransfer(target('platinum'),[p2],0,opts),/II → III/);
 assert.throws(()=>buildTransfer(target('platinum'),[{...p4,location:'party'}],0,opts),/Deposita/);assert.throws(()=>buildTransfer(target('platinum'),[sourceDS(4,plain=>put32(plain,56,u32(plain,56)|0x40000000))],0,opts),/huevos/);assert.throws(()=>buildTransfer(target('platinum'),[sourceDS(4,plain=>put16(plain,10,1))],0,opts),/objeto equipado/);
});
test('forward conversions reject HM, event, destructive glyph and unknown-origin cases',()=>{
 for(const [p,message] of [[source3((h,g)=>put16(g,12,57)),/MO de generación III/],[source3((h,g)=>put32(g,44,u32(g,44)|0x80000000)),/encuentro especial/],[source3((h,g)=>h[20]=1),/glifos de GBA/],[source3((h,g)=>put16(g,38,0)),/procedencia GBA/]])assert.throws(()=>buildTransfer(target('platinum'),[p],0,opts),message);
 assert.throws(()=>buildTransfer(target('black2'),[sourceDS(4,p=>put16(p,0x28,57))],0,opts),/MO de generación IV/);assert.throws(()=>buildTransfer(target('black2'),[sourceDS(4,p=>p[0x40]|=1)],0,opts),/encuentro especial/);
 assert.throws(()=>buildTransfer(target('black2'),[sourceDS(4,p=>p[0x5F]=21)],0,opts),/procedencia del Pokémon/);
});
test('incompatible special forms are blocked within a generation',()=>{
 const rotom=sourceDS(4,p=>{put16(p,8,479);p[0x40]=(p[0x40]&7)|8;});assert.throws(()=>buildTransfer(target('diamond'),[rotom],0,opts),/no admiten esa forma/);
 const fused=sourceDS(5,p=>{put16(p,8,646);p[0x40]=(p[0x40]&7)|8;});assert.throws(()=>buildTransfer(target('white2'),[fused],0,opts),/Kyurem/);
});
test('full boxes and malformed conversion date stop before any write',()=>{
 const d=target('platinum'),info=parseSave(d.bytes,d.game).writeInfo,p=sourceDS(4);for(let i=0;i<30;i++)d.bytes.set(encryptPK45(reference(4)),info.storageBase+4+i*136);refreshG4(d.bytes,'platinum');const before=d.bytes.slice();assert.throws(()=>buildTransfer(d,[p],0,opts),/0 huecos/);assert.equal(bytesEqual(d.bytes,before),true);assert.throws(()=>buildTransfer(target('platinum'),[source3()],0,{date:'2026-02-31'}),/Fecha/);
});
test('create non-playable local fixtures for UI transfer verification',()=>{
 const dir='./.test-output/qa-transfers';mkdirSync(dir,{recursive:true});const p=source3(),source=makeFixtureG3('emerald',[p.raw]);writeFileSync(`${dir}/QA-origin-emerald.sav`,source);writeFileSync(`${dir}/QA-target-platinum.sav`,fixtureG4('platinum'));writeFileSync(`${dir}/QA-target-white2.dsv`,wrapDSV(fixtureG5('white2')));
 const exported=buildTransfer({game:'platinum',bytes:fixtureG4('platinum')},[p],0,opts);writeFileSync(`${dir}/expected-platinum-result.sav`,exported.bytes);
});
