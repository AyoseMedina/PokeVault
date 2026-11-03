import {DATA} from './data.js';
import {FORMAT_DATA as F} from './formats-data.js';
import {MOVE_DATA as M} from './move-data.js';
import {decrypt3,encrypt3,put16,put32,internal3,parsePK3,levelFrom} from './core.js';
import {decryptPK45,encryptPK45,parsePK45} from './formats.js';
const need=(v,m)=>{if(!v)throw new Error(m);};
const u32=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,true);
export const personal=(game,species)=>M.families[M.games[game]].personal[species];
export const everstone=g=>g===2?112:g===3?195:g>=4?229:0;
export function speciesName(species,generation,language){
 let name=M.names[language]?.[species];need(name,'Nombre de especie no verificado para este idioma.');
 if(generation<=4){name=name.toUpperCase();if(language==='fr')name=name.replace(/[ÈÉÊ]/g,'E').replace(/Ï/g,'I');if([ 'en','it','es'].includes(language))name=name.replace(/’/g,"'");}
 return name;
}
export function encodeExact(text,g,language,length){
 const b=new Uint8Array(length).fill(g<=2?0x50:255),table=g===1?F.g1chars:g===2?DATA.g2chars[{it:'es',de:'fr'}[language]||language]:g===3?DATA.g3chars:F.g4chars;
 need([...text].length<=(g<=2?length-1:g===3?length:length/2-1),'El nombre evolucionado no cabe sin recortar.');
 [...text].forEach((c,i)=>{const code=g===5?c.charCodeAt(0):table?.indexOf(c);need(Number.isInteger(code)&&code>=0&&code<(g<=2?256:g===3?255:65535),'Nombre evolucionado sin representación exacta.');if(g<=3)b[i]=code;else put16(b,i*2,code);});return b;
}
function equalName(raw,expected,g){const terminator=g<=2?0x50:255,end=raw.indexOf(terminator),length=end<0?raw.length:end;return expected.slice(0,length).every((b,i)=>raw[i]===b)&&expected[length]===raw[length];}
export function setHeldItem(p,item){
 if(p.generation===2){const raw=p.raw.slice();raw[1]=item;return {...p,raw,heldItem:item};}
 if(p.generation===3){const plain=decrypt3(p.raw);put16(plain,2,item);const raw=encrypt3(p.raw.subarray(0,32),plain);return {...p,...parsePK3(raw)};}
 const plain=decryptPK45(p.raw);put16(plain,10,item);const raw=encryptPK45(plain);return {...p,...parsePK45(raw,p.generation,{},levelFrom)};
}
// EvolutionSet / SpeciesName / PersonalInfo sources and policy differences:
// docs/MOVE_IMPLEMENTATION.md. No random PID, name trimming or move replacement.
export function evolveArrival(p,sourceGeneration,game){
 const g=p.generation,notes=[],canTrade=sourceGeneration===g||(sourceGeneration===1&&g===2)||(sourceGeneration===2&&g===3);
 if(!canTrade)return {pokemon:p,notes};
 if([588,616].includes(p.species)){notes.push('Karrablast/Shelmet: no evolucionan sin una contrapartida de intercambio; este envío es unidireccional.');return {pokemon:p,notes};}
 if(p.heldItem&&p.heldItem===everstone(g)){notes.push('Piedra Eterna: impide la evolución por intercambio (política PokéVault, también Kadabra).');return {pokemon:p,notes};}
 const evolution=M.evolutions[g][p.species]?.find(e=>e.method===5||e.method===6&&e.item===p.heldItem);
 if(!evolution)return {pokemon:p,notes};
 const target=evolution.species,learn=M.families[M.games[game]].learn[target];need(learn,'Faltan movimientos verificados de la evolución.');
 need(!learn.some(([,level])=>level===p.level),`${speciesName(target,g,'es')} aprende un movimiento en el nivel actual (${p.level}). Evoluciona dentro del juego para elegir; no se sustituirán movimientos.`);
 const lang=g<=2?p.textLanguage||'es':({2:'en',3:'fr',4:'it',5:'de',7:'es'})[p.language],name=speciesName(target,g,lang),raw=p.raw.slice();let renamed=false,out;
 if(g<=2){const oldName=encodeExact(speciesName(p.species,g,lang),g,lang,11),nicknameRaw=p.nicknameRaw.slice();renamed=equalName(nicknameRaw,oldName,g);if(renamed)nicknameRaw.set(encodeExact(name,g,lang,11));raw[0]=g===1?F.g1species.indexOf(target):target;if(g===1){raw[5]=personal(game,target).types[0];raw[6]=personal(game,target).types[1];}if(g===2&&evolution.method===6)raw[1]=0;out={...p,raw,species:target,nicknameRaw,heldItem:g===2?raw[1]:0};}
 else if(g===3){const plain=decrypt3(raw),slot=u32(plain,40)>>>31;need(personal(game,target).abilities[slot]>0,'Posición de habilidad evolucionada no válida.');put16(plain,0,internal3(target));if(evolution.method===6)put16(plain,2,0);renamed=equalName(raw.subarray(8,18),encodeExact(speciesName(p.species,g,lang),g,lang,10),g);if(renamed)raw.set(encodeExact(name,g,lang,10),8);out={...p,...parsePK3(encrypt3(raw.subarray(0,32),plain))};}
 else{const plain=decryptPK45(raw),slot=g===5&&(plain[0x42]&1)?2:g===5?(p.pid>>>16)&1:p.pid&1;
   const abilities=personal(game,p.species).abilities;need(plain[0x15]===(abilities[slot]||(slot===1?abilities[0]:0)),'La habilidad no coincide con su posición original. Evolución bloqueada.');const targetAbilities=personal(game,target).abilities,ability=targetAbilities[slot]||(slot===1?targetAbilities[0]:0);need(ability>0,'Habilidad evolucionada no verificada.');
   put16(plain,8,target);plain[0x15]=ability;if(evolution.method===6)put16(plain,10,0);renamed=!(u32(plain,0x38)&0x80000000);if(renamed)plain.set(encodeExact(name,g,lang,22),0x48);out={...p,...parsePK45(encryptPK45(plain),g,{},levelFrom)};
 }
 need(out.exp===p.exp&&out.level===p.level,'La evolución cambiaría experiencia o nivel.');
 notes.push(`${speciesName(p.species,g,lang)} → ${name}: evolución por intercambio${renamed?'; nombre de especie actualizado':' con mote conservado'}${evolution.method===6?'; objeto consumido':''}.`);
 return {pokemon:out,notes,evolution:{from:p.species,to:target,renamed,consumedItem:evolution.method===6?p.heldItem:0}};
}
export function tradeFriendship(p,sourceGeneration){
 // pret/pokeemerald TradeMons and pokeplatinum TradeRoom_ExecuteTrade.
 // Other routes retain their already reviewed converter behavior.
 if(![3,4].includes(p.generation)||!(sourceGeneration===p.generation||sourceGeneration===2&&p.generation===3))return {pokemon:p,notes:[]};
 const g=p.generation,plain=g===3?decrypt3(p.raw):decryptPK45(p.raw),offset=g===3?9:0x14,old=plain[offset];plain[offset]=70;
 const raw=g===3?encrypt3(p.raw.subarray(0,32),plain):encryptPK45(plain),pokemon={...p,...(g===3?parsePK3(raw):parsePK45(raw,g,{},levelFrom))};
 return {pokemon,notes:old===70?[]:[`Amistad de intercambio: ${old} → 70 (rutina nativa de generación ${g}).`]};
}
