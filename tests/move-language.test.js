import test from 'node:test';
import assert from 'node:assert/strict';
import {entity} from './fixtures/move.js';
import {evolveArrival,encodeExact,speciesName} from '../dist/move-entity.js';
import {parsePK3,parseSave} from '../dist/core.js';
import {decryptPK45,encryptPK45,parsePK45} from '../dist/formats.js';
import {fixtureG4,fixtureG5,refreshG4,refreshG5} from './fixtures/builders.js';
import {levelFrom} from '../dist/core.js';
function foreign(game,nick=false,language='de'){
 let p=entity(game,67,2,nick);const id={es:7,en:2,fr:3,de:5,it:4}[language],name=nick?' MI MOTE ':speciesName(67,p.generation,language);
 if(p.generation===3){const raw=p.raw.slice();raw[18]=id;raw.set(encodeExact(name,3,language,10),8);p={...p,...parsePK3(raw)};}
 else{const plain=decryptPK45(p.raw);plain[0x17]=id;plain.set(encodeExact(name,p.generation,language,22),0x48);p={...p,...parsePK45(encryptPK45(plain),p.generation,{},levelFrom)};}return p;
}
for(const game of ['ruby','sapphire','emerald','firered','leafgreen'])test(`${game}: foreign GBA default names and nicknames follow destination cartridge rules`,()=>{
 for(const nick of [false,true]){
  const p=foreign(game,nick),r=evolveArrival(p,3,game,'es');assert.equal(r.pokemon.species,68);assert.equal(r.evolution.renamed,false);assert.deepEqual(r.pokemon.raw.subarray(8,18),p.raw.subarray(8,18));assert.equal(r.pokemon.language,5);
 }
 const p=foreign(game,false,'en'); // English and Spanish both use MACHOKE.
 if(['ruby','sapphire'].includes(game))assert.throws(()=>evolveArrival(p,3,game,'es'),/revisión de ROM/);
 else assert.equal(evolveArrival(p,3,game,'es').evolution.renamed,false);
 assert.throws(()=>evolveArrival(foreign(game),3,game),/idioma del juego GBA/);
 assert.equal(evolveArrival(foreign(game,true),3,game).evolution.renamed,false);
});
for(const game of ['diamond','pearl','platinum','heartgold','soulsilver'])test(`${game}: unnicknamed foreign entity takes destination name, nickname stays exact`,()=>{
 for(const nick of [false,true]){const p=foreign(game,nick),r=evolveArrival(p,4,game,'es');assert.equal(r.pokemon.species,68);assert.equal(r.pokemon.language,5);assert.equal(r.evolution.renamed,!nick);assert.deepEqual(decryptPK45(r.pokemon.raw).subarray(0x48,0x5E),nick?decryptPK45(p.raw).subarray(0x48,0x5E):encodeExact('MACHAMP',4,'es',22));}
 assert.throws(()=>evolveArrival(foreign(game),4,game),/Idioma del cartucho DS/);
});
for(const game of ['black','white','black2','white2'])test(`${game}: unresolved foreign unnicknamed evolution blocks; nicknames and same language work`,()=>{
 assert.throws(()=>evolveArrival(foreign(game),5,game,'es'),/Gen V.*pendiente/);
 const p=foreign(game,true),r=evolveArrival(p,5,game,'es');assert.deepEqual(decryptPK45(r.pokemon.raw).subarray(0x48,0x5E),decryptPK45(p.raw).subarray(0x48,0x5E));
 assert.equal(evolveArrival(foreign(game),5,game,'de').pokemon.nickname,'Machomei');
});
test('DS cartridge language is read from verified active save fields, never inferred from Pokémon',()=>{
 for(const game of ['diamond','platinum','heartgold']){const b=fixtureG4(game),o=game==='platinum'?0x68:0x64;b[o+0x19]=3;b[0x40000+o+0x19]=5;refreshG4(b,game);assert.equal(parseSave(b,game).gameLanguage,'fr');b[o+0x19]=0;refreshG4(b,game);assert.equal(parseSave(b,game).gameLanguage,undefined);}
 for(const game of ['black','black2']){const b=fixtureG5(game);b[0x1941E]=4;refreshG5(b,game);assert.equal(parseSave(b,game).gameLanguage,'it');}
});
