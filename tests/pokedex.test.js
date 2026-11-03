import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, makeFixtureG2, makeFixtureG3, checksum32, put16, GAMES } from '../dist/core.js';
import { fixtureYellow, refreshYellow, fixtureG4, refreshG4, fixtureG5, refreshG5, wrapDSV } from './fixtures/builders.js';
import { dexEntry } from '../dist/pokedex-catalog.js';
const flag=(b,o,n)=>b[o+((n-1)>>3)]|=1<<((n-1)&7);
function checksumCrystal(b){let sum=0;for(let i=0x2009;i<=0x2B82;i++)sum=(sum+b[i])&65535;put16(b,0x2D0D,sum);}

test('Yellow and Crystal read actual flags, byte boundaries and padding without inferring PC ownership',()=>{
  for(const [game,make,caught,seen,max,refresh] of [['yellow',fixtureYellow,0x25A3,0x25B6,151,refreshYellow],['crystal',makeFixtureG2,0x2A27,0x2A47,251,checksumCrystal]]){
    const b=make();for(const n of [1,8,9,max])flag(b,seen,n);flag(b,caught,8);flag(b,caught,max);
    b[seen+Math.ceil(max/8)-1]|=128;refresh(b);const before=b.slice(),p=parseSave(b,game);
    assert.equal(p.pokedex.seenCount,4);assert.equal(p.pokedex.caughtCount,2);
    assert.equal(p.pokedex.caught[24],false);assert.deepEqual(b,before);
  }
});
for(const game of ['ruby','sapphire','emerald','firered','leafgreen'])test(`${game}: dex follows the active rotated small sector and ignores obsolete flags`,()=>{
  const b=makeFixtureG3(game),p=parseSave(b,game),base=p.active.sectors[0];
  flag(b,base+0x28,386);flag(b,base+0x5C,1);flag(b,base+0x5C,386);
  put16(b,base+0xFF6,checksum32(b.subarray(base,base+0xF80),['ruby','sapphire'].includes(game)?0x890:game==='emerald'?0xF2C:0xF24));
  const before=b.slice(),dex=parseSave(b,game).pokedex;
  assert.equal(dex.caughtCount,1);assert.equal(dex.seenCount,2);assert.equal(dex.caught[385],true);assert.deepEqual(b,before);
});
for(const [game,offset] of Object.entries({diamond:0x12DC,pearl:0x12DC,platinum:0x1328,heartgold:0x12B8,soulsilver:0x12B8}))test(`${game}: dex uses newest general block independently of PC block`,()=>{
  for(const base of [0,0x40000]){
    const b=fixtureG4(game,{partyBase:base,storageBase:base?0:0x40000});flag(b,base+offset+4,493);flag(b,base+offset+0x44,493);
    flag(b,(base?0:0x40000)+offset+4,1);refreshG4(b,game);
    const wrapped=wrapDSV(b),before=wrapped.slice(),dex=parseSave(wrapped,game).pokedex;
    assert.equal(dex.caughtCount,1);assert.equal(dex.caught[492],true);assert.equal(dex.caught[0],false);assert.deepEqual(wrapped,before);
  }
});
for(const game of ['black','white','black2','white2'])test(`${game}: union of all four seen regions, not display bits`,()=>{
  const b=fixtureG5(game),base=game.endsWith('2')?0x21400:0x21600;
  for(let i=0;i<4;i++)flag(b,base+0x5C+i*0x54,i===3?649:i+1);
  flag(b,base+8,649);flag(b,base+0x1AC,25);refreshG5(b,game);
  const before=b.slice(),dex=parseSave(b,game).pokedex;
  assert.equal(dex.seenCount,4);assert.equal(dex.caughtCount,1);assert.equal(dex.seen[648],true);assert.equal(dex.seen[24],false);assert.deepEqual(b,before);
  b[base+8]^=1;assert.throws(()=>parseSave(b,game),/CRC/);
});
test('inconsistent captured/seen flags are reported without repairing original data',()=>{
  const b=fixtureYellow();flag(b,0x25A3,1);refreshYellow(b);const before=b.slice(),dex=parseSave(b,'yellow').pokedex;
  assert.equal(dex.inconsistent,1);assert.equal(dex.seen[0],false);assert.deepEqual(b,before);
});
test('offline descriptions cover each supported version and never substitute another game',()=>{
  for(const [game,g] of Object.entries(GAMES))for(let n=1;n<=[0,151,251,386,493,649][g.generation];n++){
    const en=dexEntry(game,n,'en'),es=dexEntry(game,n,'es');assert.ok(en?.text);assert.equal(en.game,game);assert.equal(es.language,'en');assert.equal(es.fallback,true);
  }
  assert.notEqual(dexEntry('crystal',25).text,dexEntry('emerald',25).text);
  assert.equal(dexEntry('yellow',152),null);assert.equal(dexEntry('unknown',1),null);assert.equal(dexEntry('emerald',0),null);
});
