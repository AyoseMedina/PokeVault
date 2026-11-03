import test from 'node:test';
import assert from 'node:assert/strict';
import {MOVE_DATA as M} from '../dist/move-data.js';
import {DATA} from '../dist/data.js';
import {FORMAT_DATA as F} from '../dist/formats-data.js';
import {makeDemoPK3,makeFixtureG2,makeFixtureG3,parseSave,parsePK3,expFor,put16,put32,levelFrom} from '../dist/core.js';
import {encryptPK45,parsePK45} from '../dist/formats.js';
import {fixtureYellow,fixtureG4,fixtureG5} from './fixtures/builders.js';
import {evolveArrival,encodeExact,speciesName,everstone,setHeldItem,personal} from '../dist/move-entity.js';
import {registerDex,verifyDex} from '../dist/move-dex.js';
import {saveWriter,buildMove} from '../dist/move.js';
export function entity(game,species,level=20,nick=false,item=0){
 const g=game==='yellow'?1:game==='crystal'?2:['emerald','ruby','sapphire','firered','leafgreen'].includes(game)?3:['black','white','black2','white2'].includes(game)?5:4,name=nick?' MI MOTE ':speciesName(species,g,'es'),exp=expFor(level,DATA.growth[species]);let p;
 if(g<=2){p=parseSave(g===1?fixtureYellow():makeFixtureG2([species]),game).records.find(p=>p.location==='pc');p={...p,raw:p.raw.slice(),nicknameRaw:encodeExact(name,g,'es',11),species,exp,level};p.raw[0]=g===1?F.g1species.indexOf(species):species;const o=g===1?14:8;p.raw[o]=exp>>>16;p.raw[o+1]=exp>>>8&255;p.raw[o+2]=exp&255;p.raw[g===1?3:31]=level;if(g===2)p.raw[1]=item;}
 else if(g===3){const raw=makeDemoPK3(species,level,1);raw.set(encodeExact(name,g,'es',10),8);p=parsePK3(raw);}
 else{const plain=new Uint8Array(136);put32(plain,0,0x12340000);put16(plain,8,species);put32(plain,12,12345);put32(plain,16,exp);plain[0x14]=70;plain[0x15]=personal(game,species).abilities[0];plain[0x17]=7;plain[0x40]=0;put16(plain,0x28,33);plain[0x30]=35;plain[0x5F]=10;plain[0x83]=4;plain[0x84]=level;put16(plain,0x80,1);if(nick)put32(plain,0x38,0x80000000);plain.set(encodeExact(name,g,'es',22),0x48);plain.set(encodeExact('OT',g,'es',16),0x68);p=parsePK45(encryptPK45(plain),g,{},levelFrom);}
 p={...p,game,generation:g,location:'pc',box:0,slot:0,heldItem:item};return g>=3?setHeldItem(p,item):p;
}
for(const game of ['yellow','crystal','emerald','platinum','black2'])test(`${game}: every trade evolution, nickname, item consumption and Everstone`,()=>{
 const g=entity(game,25).generation;
 for(const [from,branches] of Object.entries(M.evolutions[g]))for(const e of branches){
  if(e.method===7)continue;
  const levels=M.families[M.games[game]].learn[e.species],level=Array.from({length:98},(_,i)=>i+2).find(n=>!levels.some(([,l])=>l===n));
  for(const nick of [false,true]){const p=entity(game,+from,level,nick,e.item),r=evolveArrival(p,g,game);assert.equal(r.pokemon.species,e.species,`${from}→${e.species}`);assert.equal(r.pokemon.exp,p.exp);assert.equal(r.pokemon.pid,p.pid);assert.deepEqual(r.pokemon.ivs,p.ivs);assert.deepEqual(r.pokemon.moves,p.moves);assert.equal(r.evolution.renamed,!nick);if(e.method===6)assert.equal(r.pokemon.heldItem,0);
   if(g>=2)assert.equal(evolveArrival(setHeldItem(p,everstone(g)),g,game).pokemon.species,+from);
   if(e.method===6)assert.equal(evolveArrival(setHeldItem(p,0),g,game).pokemon.species,+from);
  }
 }
});
test('learn-at-current-level blocks, no counterpart leaves Karrablast/Shelmet, and migration does not evolve',()=>{
 for(const game of ['yellow','crystal','emerald','platinum','black2']){
  const g=entity(game,25).generation,l=M.families[M.games[game]].learn[65].find(([,n])=>n>1)[1];
  assert.throws(()=>evolveArrival(entity(game,64,l),g,game),/nivel actual/);
 }
 for(const s of [588,616]){const r=evolveArrival(entity('black2',s),5,'black2');assert.equal(r.pokemon.species,s);assert.match(r.notes.join(),/contrapartida/);}
 assert.equal(evolveArrival(entity('platinum',64),3,'platinum').pokemon.species,64);assert.equal(evolveArrival(entity('black2',64),4,'black2').pokemon.species,64);
});
const fixtures={yellow:()=>fixtureYellow(),crystal:()=>makeFixtureG2([25]),ruby:()=>makeFixtureG3('ruby',[]),sapphire:()=>makeFixtureG3('sapphire',[]),emerald:()=>makeFixtureG3('emerald',[]),firered:()=>makeFixtureG3('firered',[]),leafgreen:()=>makeFixtureG3('leafgreen',[]),diamond:()=>fixtureG4('diamond'),pearl:()=>fixtureG4('pearl'),platinum:()=>fixtureG4('platinum'),heartgold:()=>fixtureG4('heartgold'),soulsilver:()=>fixtureG4('soulsilver'),black:()=>fixtureG5('black'),white:()=>fixtureG5('white'),black2:()=>fixtureG5('black2'),white2:()=>fixtureG5('white2')};
for(const [game,fixture] of Object.entries(fixtures))test(`${game}: destination dex flags, mirrors and checksums preserve every other species`,()=>{
 const save={game,bytes:fixture()},w=saveWriter(save),p=entity(game,65,30);registerDex(w,p);const result=w.finish();verifyDex(w.parsed.pokedex,result.checked.pokedex,[65]);assert.ok(result.checked.checks.every(c=>c.ok));
 if(p.generation===2)assert.equal(!!(result.bytes[0x1C2F]&1),true); // backup caught, species 65
 if(p.generation===3){const offsets=['ruby','sapphire'].includes(game)?[0x938,0x3A8C]:game==='emerald'?[0x988,0x3B24]:[0x5F8,0x3A18];for(const o of offsets){const logical=o+8,at=w.parsed.active.sectors[1+Math.floor(logical/0xF80)]+logical%0xF80;assert.ok(result.bytes[at]&1);}}
 if(p.generation===4){const base=w.parsed.writeInfo.generalBase+({diamond:0x12DC,pearl:0x12DC,platinum:0x1328,heartgold:0x12B8,soulsilver:0x12B8}[game]);if(!['diamond','pearl'].includes(game))assert.ok(result.bytes[base+0x108+(['heartgold','soulsilver'].includes(game)?0x3C:0x20)+65]&32);}
});
test('custom move evolves after conversion, registers both species, preserves all original buffers',()=>{
 const source={id:'s',hash:'s',name:'Cristal.srm',game:'crystal',language:'es',bytes:makeFixtureG2([64])},sw=saveWriter(source),p=entity('crystal',64,20);p.raw[2]=33;p.raw[23]=35;sw.entity(p);source.bytes=sw.finish().bytes;
 const target={id:'t',hash:'t',name:'Esmeralda.sav',game:'emerald',bytes:makeFixtureG3('emerald',[])},picked=parseSave(source.bytes,'crystal').records.map(p=>({...p,game:'crystal',saveId:'s'})),before=source.bytes.slice();
 const r=buildMove(target,picked,0,[source],{customGen2To3:true,date:'2026-11-03'});assert.equal(r.placements[0].resultSpecies,65);assert.equal(r.checked.pokedex.caught[63],true);assert.equal(r.checked.pokedex.caught[64],true);assert.deepEqual(source.bytes,before);
});
for(const game of ['yellow','crystal','emerald','platinum','black2'])test(`${game}: full same-generation move evolves and removes only the selected source`,()=>{
 const source={id:'source',hash:'source',name:'Origen.srm',game,language:'es',bytes:fixtures[game]()},target={id:'target',hash:'target',name:'Destino.srm',game,language:'es',bytes:fixtures[game]()};
 const w=saveWriter(source),p=entity(game,64,2);const first=w.parsed.records.find(p=>p.location==='pc')||{box:0,slot:0};p.box=first.box;p.slot=first.slot;w.entity(p);source.bytes=w.finish().bytes;
 const selected=parseSave(source.bytes,game).records.filter(r=>r.location==='pc'&&r.box===p.box&&r.slot===p.slot).map(p=>({...p,saveId:'source',game}));
 const out=buildMove(target,selected,0,[source],{date:'2026-11-03'});assert.equal(out.placements[0].resultSpecies,65);assert.equal(out.checked.pokedex.caught[63],true);assert.equal(out.checked.pokedex.caught[64],true);assert.equal(parseSave(out.outputs[1].bytes,game).records.length,parseSave(source.bytes,game).records.length-1);
});
test('dex records Crystal Unown in both lists, GBA first PID and HGSS seen/caught Unown order',()=>{
 const crystal=saveWriter({game:'crystal',bytes:makeFixtureG2([])}),unown=entity('crystal',201);registerDex(crystal,unown);const c=crystal.finish();assert.ok(c.bytes[0x2A67]);assert.equal(c.bytes[0x2A67],c.bytes[0x1C67]);assert.equal(c.bytes[0x2A82],c.bytes[0x2A67]);
 for(const species of [201,327]){const w=saveWriter({game:'emerald',bytes:makeFixtureG3('emerald',[])}),p=entity('emerald',species);registerDex(w,p);const base=w.parsed.active.sectors[0];assert.equal(new DataView(w.bytes.buffer).getUint32(base+(species===201?0x1C:0x20),true),p.pid);}
 const w=saveWriter({game:'heartgold',bytes:fixtureG4('heartgold')}),base=w.parsed.writeInfo.generalBase+0x12B8;w.patch(base+0x10C,new Uint8Array(56).fill(255));const p=entity('heartgold',201);p.form=4;registerDex(w,p);w.finish();assert.equal(w.bytes[base+0x10C],4);assert.equal(w.bytes[base+0x128],4);
});
test('Gen V non-base forms block explicitly; no form, gender or language is silently substituted',()=>{
 const w=saveWriter({game:'black2',bytes:fixtureG5('black2')}),p=entity('black2',201);p.form=4;assert.throws(()=>registerDex(w,p),/formas no base/);
});
