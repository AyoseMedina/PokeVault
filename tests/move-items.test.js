import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_TRANSFER as I} from '../dist/item-transfer-data.js';
import {itemPlan,itemFamily,returnItemToBag} from '../dist/move-items.js';
import {entity} from './fixtures/move.js';
import {saveWriter,buildMove} from '../dist/move.js';
import {makeFixtureG2,makeFixtureG3,parseSave} from '../dist/core.js';
import {fixtureG4,fixtureG5,wrapDSV} from './fixtures/builders.js';
const u16=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint16(o,true);
const fixture=game=>game==='crystal'?makeFixtureG2([25]):['ruby','sapphire','emerald','firered','leafgreen'].includes(game)?makeFixtureG3(game,[]):['black','black2'].includes(game)?fixtureG5(game):wrapDSV(fixtureG4(game));
function source(game,species=25,item=0){const s={id:'s',hash:'s',game,gameLanguage:'es',language:'es',name:'Origen é.srm',bytes:fixture(game)},w=saveWriter(s),p=entity(game,species,2,false,item);if(game==='crystal'){p.raw[2]=33;p.raw[23]=35;}w.entity(p);s.bytes=w.finish().bytes;return s;}
function move(s,game){const d={id:'d',hash:'d',game,gameLanguage:'es',language:'es',name:'Destino é.dsv',bytes:fixture(game)},p=parseSave(s.bytes,s.game).records.find(p=>p.location==='pc'&&p.box===0&&p.slot===0);return buildMove(d,[{...p,game:s.game,saveId:s.id}],0,[s],{customGen2To3:true,date:'2026-11-03'});}
test('generated item maps enforce every same-gen family and cross-generation mapping',()=>{
 for(const [game,g] of [['crystal',2],['emerald',3],['diamond',4],['platinum',4],['heartgold',4],['black2',5]]){
  for(const id of I.held[itemFamily(game)]){const p={game,generation:g,heldItem:id};if(I.mail[g].includes(id))assert.throws(()=>itemPlan(p,game),/Cartas/);else assert.equal(itemPlan(p,game).targetItem,id);}
  assert.throws(()=>itemPlan({game,generation:g,heldItem:65535},game),/equipable/);
 }
 for(const [id,to] of Object.entries(I.g2to3))assert.equal(itemPlan({game:'crystal',generation:2,heldItem:+id},'emerald').targetItem,to);
 for(const [id,to] of Object.entries(I.g3to4))if(I.held.pt.includes(to))assert.equal(itemPlan({game:'emerald',generation:3,heldItem:+id},'platinum').targetItem,to);
 assert.throws(()=>itemPlan({game:'heartgold',generation:4,heldItem:492},'diamond'),/destino/);
 assert.throws(()=>itemPlan({game:'emerald',generation:3,heldItem:1},'black2'),/intermedia/);
 const tm=Object.keys(I.g2to3);assert.ok(tm.length);assert.throws(()=>itemPlan({game:'crystal',generation:2,heldItem:191},'emerald'),/equivalente/);
});
test('items actually travel, evolve/consume, map Crystal→GBA and remain through Pal Park without evolution',()=>{
 for(const game of ['crystal','emerald','platinum','black2']){const item=I.held[itemFamily(game)].find(i=>!I.mail[game==='crystal'?2:game==='emerald'?3:game==='black2'?5:4].includes(i));const r=move(source(game,25,item),game);assert.equal(r.checked.records.find(p=>p.box===r.placements[0].box&&p.slot===r.placements[0].slot&&p.location==='pc').heldItem,item);}
 for(const [game,item] of [['crystal',143],['emerald',199],['platinum',233],['black2',233]]){const r=move(source(game,95,item),game),p=r.checked.records.find(p=>p.location==='pc'&&p.slot===r.placements[0].slot);assert.equal(p.species,208);assert.equal(p.heldItem,0);}
 const custom=move(source('crystal',25,173),'emerald');assert.equal(custom.checked.records[0].heldItem,I.g2to3[173]);assert.match(custom.notes.join(),/Aranja|Oran/);
 const pal=move(source('emerald',64,1),'platinum');assert.equal(pal.placements[0].resultSpecies,64);assert.equal(pal.checked.records.find(p=>p.slot===pal.placements[0].slot&&p.location==='pc').heldItem,I.g3to4[1]);
});
for(const game of ['diamond','pearl','platinum','heartgold','soulsilver'])test(`${game}: IV→V returns to source bag and preserves DSV footer, source dex and remaining Pokémon`,()=>{
 const s=source(game,64,221),before=s.bytes.slice(),r=move(s,'black2'),b=r.outputs[1].bytes,family=itemFamily(game),bag=I.bags[family],pocket=bag.pockets.find(p=>p.items.includes(221)),base=parseSave(before,game).writeInfo.generalBase+bag.base+pocket.offset;
 assert.equal(u16(b,base),221);assert.equal(u16(b,base+2),1);assert.deepEqual(b.subarray(524288),before.subarray(524288));assert.deepEqual(parseSave(b,game).pokedex,parseSave(before,game).pokedex);assert.deepEqual(s.bytes,before);assert.equal(r.placements[0].resultSpecies,64);assert.equal(r.checked.records.find(p=>p.slot===r.placements[0].slot&&p.location==='pc').heldItem,0);
});
test('bag capacities, stack maxima, sorted pockets, multiple returns and malformed/full bags block safely',()=>{
 for(const game of ['diamond','platinum','heartgold'])for(const pocket of I.bags[itemFamily(game)].pockets.filter(p=>!['KeyItems','MailItems'].includes(p.type))){
  const w=saveWriter({game,bytes:fixture(game)}),item=pocket.items.find(i=>I.held[itemFamily(game)].includes(i)),base=w.parsed.writeInfo.generalBase+I.bags[itemFamily(game)].base+pocket.offset;
  returnItemToBag(w,item,pocket.max-1);returnItemToBag(w,item,1);assert.throws(()=>returnItemToBag(w,item),/máximo/);w.finish();assert.equal(u16(w.bytes,base+2),pocket.max);
  const broken=saveWriter({game,bytes:fixture(game)});for(let i=0;i<pocket.capacity;i++){broken.word(base+i*4,65535);broken.word(base+i*4+2,1);}assert.throws(()=>returnItemToBag(broken,item),/desconocidos/);
 }
 const w=saveWriter({game:'platinum',bytes:fixture('platinum')}),p=I.bags.pt.pockets.find(p=>p.type==='Berries'),base=w.parsed.writeInfo.generalBase+I.bags.pt.base+p.offset,items=p.items.slice(0,3);
 returnItemToBag(w,items[2],3);returnItemToBag(w,items[0],2);returnItemToBag(w,items[1],1);assert.deepEqual([0,1,2].map(i=>[u16(w.bytes,base+i*4),u16(w.bytes,base+i*4+2)]),[[items[0],2],[items[1],1],[items[2],3]]);assert.ok(w.finish().checked.checks.every(c=>c.ok));
});
