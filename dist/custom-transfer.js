import { DATA } from './data.js';
import { TRANSFER_DATA as T } from './transfer-data.js';
import { CUSTOM_DATA as C } from './custom-transfer-data.js';

// PokéVault custom policy v1, explicitly opted into before review/export.
// This is NOT an official transfer or a legality generator. See docs/CUSTOM_TRANSFER.md.
const need=(ok,message)=>{if(!ok){const e=new Error(message);e.name='SaveError';throw e;}};
const be16=(b,o)=>(b[o]<<8)|b[o+1];
const put16=(b,o,v)=>new DataView(b.buffer,b.byteOffset,b.byteLength).setUint16(o,v,true);
const put32=(b,o,v)=>new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(o,v,true);
const gender=(ratio,value)=>ratio===255?2:ratio===254?1:ratio===0?0:value<ratio?1:0;
const unownForm=pid=>(((pid>>>18)&0xC0)|((pid>>>12)&0x30)|((pid>>>6)&0xC)|(pid&3))%28;

function nameBytes(raw,language,size){
  need(raw instanceof Uint8Array&&raw.length===11,'Faltan los nombres originales de Cristal. Vuelve a importar.');
  const table=DATA.g2chars[{it:'es',de:'fr'}[language]||language];
  need(table,'Selecciona el idioma internacional del guardado de Cristal.');
  const end=raw.indexOf(0x50);need(end>=0&&end<=10,'Nombre de Cristal sin terminador válido.');
  let text='';
  for(const code of raw.subarray(0,end)){const char=table[code];need(char&&char!=='\0','El nombre contiene un glifo desconocido de Cristal.');text+=char;}
  need(text.length>0&&[...text].length<=size,`El nombre «${text}» no cabe en GBA (${size} caracteres). No se recortará.`);
  const bytes=new Uint8Array(size).fill(255);
  [...text].forEach((char,i)=>{const code=DATA.g3chars.indexOf(char);need(code>=0&&code<255,`El carácter «${char}» no tiene una equivalencia fiel en GBA.`);bytes[i]=code;});
  return {text,bytes};
}

function effort(raw){
  const original=[11,13,15,17,19].map(o=>be16(raw,o));
  const expanded=[...original,original[4]];
  const desired=expanded.map(n=>Math.min(252,Math.floor(Math.sqrt(n)/4)*4));
  const total=desired.reduce((a,b)=>a+b,0);
  if(total<=508)return {original,evs:desired};
  // Preserve proportions, in useful groups of four; stable tie order HP/Atk/Def/Spe/SpA/SpD.
  const quotas=desired.map(n=>n*127/total),units=quotas.map(Math.floor);
  const order=quotas.map((n,i)=>({i,remainder:n-units[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
  for(let i=0,left=127-units.reduce((a,b)=>a+b,0);i<left;i++)units[order[i].i]++;
  return {original,evs:units.map(n=>n*4)};
}

export function convertCrystalToGBA(source,game,api,options={}){
  need(options.customGen2To3===true,'Cristal → GBA requiere activar la conversión personalizada y revisar los cambios.');
  const version={sapphire:1,ruby:2,emerald:3,firered:4,leafgreen:5}[game];
  need(version,'Destino GBA no compatible.');
  need(source?.generation===2&&source.game==='crystal'&&source.valid&&!source.demo,'Se necesita un Pokémon válido de una partida original de Cristal.');
  need(source.location==='pc','Deposita al Pokémon en el PC de Cristal y vuelve a importar.');
  const b=source.raw;
  need(b instanceof Uint8Array&&b.length===32&&b[0]===source.species&&b[0]>=1&&b[0]<=251,'Estructura de Cristal no válida.');
  need(!source.egg,'Haz eclosionar el huevo en Cristal antes de convertirlo.');
  need(!b[1]&&!source.heldItem,'Retira el objeto equipado en Cristal y vuelve a importar; no se eliminará automáticamente.');
  need(![151,251].includes(b[0]),'Mew y Celebi requieren revisión de evento; no se recreará una procedencia de evento.');
  const moves=Array.from(b.subarray(2,6));
  need(moves.some(Boolean)&&moves.every(m=>m<=251),'Movimientos de Cristal no válidos.');
  need(!moves.some(m=>[15,19,57,70,148,250,127].includes(m)),'Olvida las MO de Cristal en el juego antes de convertir. No se borran movimientos automáticamente.');
  const exp=b[8]*65536+b[9]*256+b[10],level=api.levelFrom(exp,b[0]),tid=be16(b,6);
  need(level===b[31]&&level>=1&&level<=100&&exp<=api.expFor(100,DATA.growth[b[0]]),'Nivel y experiencia de Cristal incoherentes. Guarda de nuevo dentro del juego.');
  const language=source.textLanguage||'es',languageId={en:2,fr:3,it:4,de:5,es:7}[language];
  need(languageId,'Idioma de Cristal no compatible.');
  const nick=nameBytes(source.nicknameRaw,language,10),ot=nameBytes(source.otRaw,language,7);
  const dv=be16(b,21),attack=dv>>>12,defense=(dv>>>8)&15,speed=(dv>>>4)&15,special=dv&15;
  const hp=((attack&1)<<3)|((defense&1)<<2)|((speed&1)<<1)|(special&1);
  const dvs=[hp,attack,defense,speed,special,special],ivs=dvs.map(n=>n*2+1);
  const shiny=defense===10&&speed===10&&special===10&&!!(attack&2);
  const ratio2=C.gender2[b[0]],ratio3=T.personal[b[0]]?.[0];
  need(ratio2!==undefined&&ratio3!==undefined,'Faltan datos de género de la especie.');
  const sourceGender=ratio2===255?2:ratio2===254?1:ratio2===0?0:attack<=(ratio2>>>4)?1:0;
  const form=b[0]===201?Math.floor((((attack&6)<<5)|((defense&6)<<3)|((speed&6)<<1)|((special&6)>>>1))/10):0;
  // Stable identity: species, TID, DVs, original trainer; no clock, destination, PP or experience.
  let seed=2166136261;
  for(const n of [b[0],b[6],b[7],b[21],b[22],...new TextEncoder().encode(ot.text)])seed=Math.imul(seed^n,16777619)>>>0;
  let pid;
  for(let i=0;i<1_000_000;i++){
    const candidate=(seed+Math.imul(i,0x9E3779B9))>>>0;
    if(candidate%25===0&&(T.personal[b[0]][1]===T.personal[b[0]][2]||(candidate&1)===0)&&gender(ratio3,candidate&255)===sourceGender&&(b[0]!==201||unownForm(candidate)===form)){pid=candidate;break;}
  }
  need(pid!==undefined,'No se ha encontrado una identidad GBA que preserve género y forma. Conversión bloqueada.');
  const xor=(pid&65535)^(pid>>>16)^tid;
  let sid=shiny?xor:dv;if(!shiny&&(xor^sid)<8)sid^=8;
  const h=new Uint8Array(32),plain=new Uint8Array(48);
  put32(h,0,pid);put32(h,4,(sid*65536+tid)>>>0);h.set(nick.bytes,8);h[18]=languageId;h[19]=2;h.set(ot.bytes,20);
  put16(plain,0,b[0]);put32(plain,4,exp);plain[9]=b[27];
  const pp=[];
  for(let i=0;i<4;i++){
    const move=moves[i],ups=b[23+i]>>>6,current=b[23+i]&63;
    need(move||(!ups&&!current),'Una casilla de movimiento vacía contiene PP. Revisa el guardado.');
    const max=Math.floor(C.pp3[move]*(5+ups)/5),converted=move?Math.min(current,max):0;
    put16(plain,12+i*2,move);plain[8]|=ups<<(i*2);plain[20+i]=converted;pp.push([current,converted]);
  }
  const training=effort(b);plain.set(training.evs,24);plain[36]=b[28];plain[37]=254;
  // Explicitly synthetic metadata: target version, internal-trade location, Poké Ball.
  put16(plain,38,level|(version<<7)|(4<<11)|((be16(b,29)&128)<<8));
  put32(plain,40,ivs.reduce((word,n,i)=>(word|(n<<(i*5)))>>>0,0));
  const raw=api.encrypt3(h,plain),pokemon=api.parsePK3(raw);
  need(pokemon?.valid&&pokemon.species===source.species&&pokemon.exp===exp&&pokemon.tid===tid&&pokemon.shiny===shiny&&pokemon.ivs.every((n,i)=>n===ivs[i]),'La verificación de Cristal → GBA ha fallado.');
  const details={policy:'pokevault-crystal-gba-v1',nickname:nick.text,originalTrainer:ot.text,tid,pid,sid,language:languageId,nature:0,abilitySlot:0,abilityId:T.personal[b[0]][1],gender:sourceGender,shiny,form,dvs,ivs,statExperience:training.original,evs:training.evs,pp,originalCaughtData:be16(b,29),generatedOrigin:{version,metLocation:254,metLevel:level,ball:4}};
  const notes=[`${nick.text}: Cristal → GBA personalizada. Conserva especie, nombre, entrenador, TID, experiencia, género, variocolor, forma Unown, movimientos, PP Más, amistad y Pokérus.`,
    `DVs ${dvs.join('/')} → IVs ${ivs.join('/')} (2×DV+1). Experiencia de estadísticas ${training.original.join('/')} → EVs ${training.evs.join('/')} (PS/Atq/Def/Vel/AtE/DeE; límite 508). No conserva las estadísticas numéricas de combate.`,
    `Generados de forma determinista: PID ${pid}, SID ${sid}, naturaleza Fuerte (neutra), habilidad inicial ID ${details.abilityId}. No existían en Cristal. Idioma GBA seleccionado: ${language.toUpperCase()}.`,
    `Procedencia sintética: versión ${game}, lugar 254 (intercambio interno), nivel ${level}, Poké Ball. Lugar y hora originales quedan en el manifiesto y respaldo; no representan una captura real en GBA.`,
    `PP actuales: ${pp.map(([a,z])=>a+'→'+z).join(', ')}. Sin cintas ni estadísticas de concurso (no existen en Cristal). La Pokédex del destino no se modifica.`];
  return {raw,pokemon:{...pokemon,location:'pc'},notes,details};
}
