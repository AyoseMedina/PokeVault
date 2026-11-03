import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, makeFixtureG2, makeFixtureG3, makeDemoPK3, buildTransfer, prepareTransfer, expFor, decrypt3, checksum32, put16, put32, encode2 } from '../dist/core.js';
import { DATA } from '../dist/data.js';
import { TRANSFER_DATA as T } from '../dist/transfer-data.js';
const options={customGen2To3:true,date:'2026-11-03'};
const dv=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
function source(species=25,word=0x8888){
  const b=makeFixtureG2([species]),o=0x4000+22;
  b[o+2]=33;b[o+23]=35;const exp=expFor(35,DATA.growth[species]);b[o+8]=exp>>>16;b[o+9]=exp>>>8;b[o+10]=exp;
  dv(b).setUint16(o+21,word,false);b[o+27]=123;b[o+28]=0x24;b[o+29]=10;b[o+30]=0x82;
  b.set(b.subarray(0x4000,0x444E),0x2D10);
  const p=parseSave(b,'crystal').records[0];return {...p,game:'crystal'};
}
const dest=game=>({game,bytes:makeFixtureG3(game,[makeDemoPK3(1,12,765)])});
const gender=(ratio,pid)=>ratio===255?2:ratio===254?1:ratio===0?0:(pid&255)<ratio?1:0;
const form=pid=>(((pid>>>18)&0xC0)|((pid>>>12)&0x30)|((pid>>>6)&12)|(pid&3))%28;
test('custom conversion is opt-in and refuses unsafe source cases',()=>{
  const d=dest('emerald'),p=source();assert.throws(()=>buildTransfer(d,[p],0),/activar/);
  for(const bad of [{...p,demo:true},{...p,egg:true},{...p,location:'party'},{...p,valid:false},{...p,game:'gold'}])assert.throws(()=>buildTransfer(d,[bad],0,options));
  for(const n of [151,251])assert.throws(()=>buildTransfer(d,[source(n)],0,options),/evento/);
  const item=source();item.raw[1]=1;assert.throws(()=>buildTransfer(d,[item],0,options),/objeto/);
  const hm=source();hm.raw[2]=57;assert.throws(()=>buildTransfer(d,[hm],0,options),/MO/);
  const exp=source();exp.raw[31]=90;assert.throws(()=>buildTransfer(d,[exp],0,options),/experiencia/);
});
for(const game of ['ruby','sapphire','emerald','firered','leafgreen'])test(`Crystal → ${game}: deterministic reviewed bytes, existing entities, source and dex preserved`,()=>{
  const d=dest(game),p=source(),before=d.bytes.slice(),original=p.raw.slice(),result=buildTransfer(d,[p],0,options);
  const repeat=buildTransfer(d,[p],0,{...options,date:'2027-01-01'});assert.deepEqual(result.bytes,repeat.bytes);assert.deepEqual(d.bytes,before);assert.deepEqual(p.raw,original);
  assert.equal(result.customConversion,true);assert.equal(result.placements[0].pokemon.generation,2);assert.ok(result.placements[0].customDetails);
  const target=result.checked.records[1],plain=decrypt3(target.raw);
  assert.equal(target.species,25);assert.equal(target.exp,p.exp);assert.equal(target.tid,p.tid);assert.equal(target.shiny,p.shiny);assert.equal(target.pid%25,0);
  assert.deepEqual(target.ivs,[1,17,17,17,17,17]);assert.equal(target.nickname,'PIKACHU');assert.equal(target.ot,'DEMO');
  assert.equal(plain[9],123);assert.equal(plain[36],0x24);assert.equal(plain[37],254);
  assert.deepEqual(result.checked.records[0].raw,parseSave(before,game).records[0].raw);
  assert.deepEqual(result.checked.pokedex,parseSave(before,game).pokedex);
  assert.deepEqual(prepareTransfer(d,[p],0,options).placements[0].raw,target.raw);
  assert.throws(()=>buildTransfer({game,bytes:result.bytes},[p],0,options),/existe|repetido/);
  assert.throws(()=>buildTransfer(d,[p,p],0,options),/repetido/);
});
test('custom identity preserves every Unown letter and shiny/gender combinations',()=>{
  const d=dest('emerald'),letters=new Set();
  for(let n=0;n<256;n+=7){const a=(n>>>6)*2,de=((n>>>4)&3)*2,s=((n>>>2)&3)*2,sp=(n&3)*2;
    const p=source(201,(a<<12)|(de<<8)|(s<<4)|sp),result=buildTransfer(d,[p],0,options),pk=result.checked.records[1];
    const expected=Math.floor(n/10);letters.add(expected);assert.equal(form(pk.pid),expected);
  }
  assert.equal(letters.size,26);
  for(const species of [25,1,29,32,81,201])for(const word of [0x2AAA,0xAAAA,0xFAAA,0x0000,0xFFFF]){
    const p=source(species,word),result=buildTransfer(d,[p],0,options),pk=result.checked.records[1],details=result.placements[0].customDetails;
    assert.equal(pk.shiny,p.shiny);assert.equal(gender(T.personal[species][0],pk.pid),details.gender);
  }
});
test('stat experience mapping respects the total EV budget and reports all source values',()=>{
  const p=source();for(const o of [11,13,15,17,19])dv(p.raw).setUint16(o,65535,false);
  const result=buildTransfer(dest('emerald'),[p],0,options),details=result.placements[0].customDetails;
  assert.deepEqual(details.statExperience,[65535,65535,65535,65535,65535]);assert.equal(details.evs.reduce((a,b)=>a+b,0),508);
  assert.ok(details.evs.every(n=>n<=252&&n%4===0));assert.ok(result.notes.some(n=>n.includes('65535')));
});
test('names retain spaces and unsupported/long names block rather than being trimmed',()=>{
  const p=source();p.nicknameRaw=encode2(' PIKA ',11);p.otRaw=encode2(' OT ',11);
  const result=buildTransfer(dest('emerald'),[p],0,options),raw=result.placements[0].raw;
  assert.equal(DATA.g3chars[raw[8]],' ');assert.equal(DATA.g3chars[raw[13]],' ');assert.equal(result.placements[0].customDetails.nickname,' PIKA ');
  p.otRaw=encode2('TOOLONGOT',11);assert.throws(()=>buildTransfer(dest('emerald'),[p],0,options),/no cabe/);
  p.otRaw=encode2('DEMO',11);p.nicknameRaw[0]=0;assert.throws(()=>buildTransfer(dest('emerald'),[p],0,options),/glifo/);
});
test('new GBA families use verified section lengths and party offsets; wrong family fails',()=>{
  for(const game of ['ruby','sapphire','leafgreen']){
    const b=makeFixtureG3(game),p=parseSave(b,game),small=p.active.sectors[0],large=p.active.sectors[1];
    const count=game==='leafgreen'?0x34:0x234;put32(b,large+count,1);b.set(makeDemoPK3(25,25,891),large+count+4);
    put16(b,large+0xFF6,checksum32(b.subarray(large,large+0xF80)));
    assert.equal(parseSave(b,game).records[0].location,'party');
    if(game!=='leafgreen'){b[small+0x890]=1;put16(b,small+0xFF6,checksum32(b.subarray(small,small+0x890)));assert.throws(()=>parseSave(b,'emerald'),/dañada|coincide/);}
  }
});
