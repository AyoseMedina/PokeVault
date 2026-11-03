import {MOVE_DATA as M} from '../../dist/move-data.js';
import {DATA} from '../../dist/data.js';
import {FORMAT_DATA as F} from '../../dist/formats-data.js';
import {makeDemoPK3,makeFixtureG2,makeFixtureG3,parseSave,parsePK3,expFor,put16,put32,levelFrom,decrypt3,encrypt3} from '../../dist/core.js';
import {encryptPK45,parsePK45} from '../../dist/formats.js';
import {fixtureYellow,fixtureG4,fixtureG5} from './builders.js';
import {evolveArrival,encodeExact,speciesName,everstone,setHeldItem,personal} from '../../dist/move-entity.js';
import {registerDex,verifyDex} from '../../dist/move-dex.js';
import {saveWriter,buildMove} from '../../dist/move.js';
export function entity(game,species,level=20,nick=false,item=0){
 const g=game==='yellow'?1:game==='crystal'?2:['emerald','ruby','sapphire','firered','leafgreen'].includes(game)?3:['black','white','black2','white2'].includes(game)?5:4,name=nick?' MI MOTE ':speciesName(species,g,'es'),exp=expFor(level,DATA.growth[species]);let p;
 if(g<=2){p=parseSave(g===1?fixtureYellow():makeFixtureG2([species]),game).records.find(p=>p.location==='pc');p={...p,raw:p.raw.slice(),nicknameRaw:encodeExact(name,g,'es',11),species,exp,level};p.raw[0]=g===1?F.g1species.indexOf(species):species;const o=g===1?14:8;p.raw[o]=exp>>>16;p.raw[o+1]=exp>>>8&255;p.raw[o+2]=exp&255;p.raw[g===1?3:31]=level;if(g===2)p.raw[1]=item;}
 else if(g===3){const raw=makeDemoPK3(species,level,1);raw.set(encodeExact(name,g,'es',10),8);const plain=decrypt3(raw);put16(plain,38,level|(3<<7)|(4<<11));p=parsePK3(encrypt3(raw.subarray(0,32),plain));}
 else{const plain=new Uint8Array(136);put32(plain,0,0x12340000);put16(plain,8,species);put32(plain,12,12345);put32(plain,16,exp);plain[0x14]=70;plain[0x15]=personal(game,species).abilities[0];plain[0x17]=7;plain[0x40]=0;put16(plain,0x28,33);plain[0x30]=35;plain[0x5F]=10;plain[0x83]=4;plain[0x84]=level;put16(plain,0x80,1);if(nick)put32(plain,0x38,0x80000000);plain.set(encodeExact(name,g,'es',22),0x48);plain.set(encodeExact('OT',g,'es',16),0x68);p=parsePK45(encryptPK45(plain),g,{},levelFrom);}
 p={...p,game,generation:g,location:'pc',box:0,slot:0,heldItem:item};return g>=3?setHeldItem(p,item):p;
}
