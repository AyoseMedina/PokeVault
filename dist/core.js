import { DATA } from './data.js';
import { parseYellow, parseNDS, DS_LAYOUTS } from './formats.js';
import { preparePortableTransfer, buildPortableTransfer } from './transfer.js';

export const GAMES = {
  crystal: {name:'Cristal', generation:2, region:'Johto', color:'#8c77cb', icon:245},
  firered: {name:'Rojo Fuego', generation:3, region:'Kanto', color:'#dc795d', icon:6},
  emerald: {name:'Esmeralda', generation:3, region:'Hoenn', color:'#388f72', icon:384},
  yellow: {name:'Amarillo', generation:1, region:'Kanto', color:'#c6a134', icon:25},
  diamond: {name:'Diamante', generation:4, region:'Sinnoh', color:'#6597c2', icon:483},
  pearl: {name:'Perla', generation:4, region:'Sinnoh', color:'#bd84ac', icon:484},
  platinum: {name:'Platino', generation:4, region:'Sinnoh', color:'#879389', icon:487},
  heartgold: {name:'HeartGold', generation:4, region:'Johto', color:'#c3a05e', icon:250},
  soulsilver: {name:'SoulSilver', generation:4, region:'Johto', color:'#8b9ca9', icon:249},
  black: {name:'Negro', generation:5, region:'Teselia', color:'#5b6570', icon:643},
  white: {name:'Blanco', generation:5, region:'Teselia', color:'#9aa5b0', icon:644},
  black2: {name:'Negro 2', generation:5, region:'Teselia', color:'#48799f', icon:646},
  white2: {name:'Blanco 2', generation:5, region:'Teselia', color:'#a58879', icon:646}
};
export const generationLabel=g=>['','I','II','III','IV','V'][g]||String(g);
export function saveRequirements(game){const g=GAMES[game];return g?.generation>=4?'512 KiB · .sav / .srm / .dsv reconocido':g?.generation===3?'128 KiB · .sav / .srm':'32 KiB · .sav / .srm';}
export function validFileSize(size,game){return GAMES[game]?.generation>=4?[524288,524328,524410].includes(size):size===(GAMES[game]?.generation===3?131072:32768);}
export const TYPE_NAMES = {1:'Normal',2:'Lucha',3:'Volador',4:'Veneno',5:'Tierra',6:'Roca',7:'Bicho',8:'Fantasma',9:'Acero',10:'Fuego',11:'Agua',12:'Planta',13:'Eléctrico',14:'Psíquico',15:'Hielo',16:'Dragón',17:'Siniestro'};
const SECTOR=0x1000, CHUNK=0xF80, GROUP=14*SECTOR;
const ORDERS=['GAEM','GAME','GEAM','GEMA','GMAE','GMEA','AGEM','AGME','AEGM','AEMG','AMGE','AMEG','EGAM','EGMA','EAGM','EAMG','EMGA','EMAG','MGAE','MGEA','MAGE','MAEG','MEGA','MEAG'];
export class SaveError extends Error { constructor(message){super(message);this.name='SaveError';} }
const assert=(v,m)=>{if(!v)throw new SaveError(m);};
export const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
export const u16=(b,o)=>view(b).getUint16(o,true);
export const u32=(b,o)=>view(b).getUint32(o,true);
export const be16=(b,o)=>view(b).getUint16(o,false);
export const put16=(b,o,v)=>view(b).setUint16(o,v,true);
export const put32=(b,o,v)=>view(b).setUint32(o,v,true);
export const bytesEqual=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
export async function sha256(bytes){
  if(globalThis.crypto?.subtle){const a=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('');}
  return sha256Fallback(bytes);
}
// SHA-256 also works in the local HTTP preview, where Web Crypto is unavailable.
export function sha256Fallback(bytes){
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const padded=new Uint8Array(Math.ceil((bytes.length+9)/64)*64);padded.set(bytes);padded[bytes.length]=0x80;const dv=view(padded);dv.setUint32(padded.length-8,Math.floor(bytes.length/0x20000000),false);dv.setUint32(padded.length-4,(bytes.length*8)>>>0,false);
  const rotr=(x,n)=>(x>>>n)|(x<<(32-n)),w=new Uint32Array(64);
  for(let offset=0;offset<padded.length;offset+=64){
    for(let i=0;i<16;i++)w[i]=dv.getUint32(offset+i*4,false);
    for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rotr(a,7)^rotr(a,18)^(a>>>3))+w[i-7]+(rotr(b,17)^rotr(b,19)^(b>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,z]=h;
    for(let i=0;i<64;i++){const t1=(z+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;z=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    [a,b,c,d,e,f,g,z].forEach((v,i)=>h[i]=(h[i]+v)>>>0);
  }return h.map(v=>v.toString(16).padStart(8,'0')).join('');
}
export function decode3(b,jp=false){let s='';for(const c of b){if(c===255)break;s+=(jp?DATA.g3jp:DATA.g3chars)[c]||'?';}return s.replace(/\0/g,'').trim();}
export function decode2(b,lang='es'){let s='';const t=DATA.g2chars[lang]||DATA.g2chars.es;for(const c of b){if(c===0x50)break;s+=t[c]||'?';}return s.replace(/\0/g,'').trim();}
export function encode3(str,len){const b=new Uint8Array(len).fill(255);[...str].slice(0,len-1).forEach((c,i)=>{const v=DATA.g3chars.indexOf(c);b[i]=v<0?0:v;});return b;}
export function encode2(str,len){const b=new Uint8Array(len).fill(0x50);[...str].slice(0,len-1).forEach((c,i)=>{const v=DATA.g2chars.es.indexOf(c);b[i]=v<0?0x7f:v;});return b;}
export function checksum32(b,length=b.length){let sum=0;for(let i=0;i<length;i+=4)sum=(sum+u32(b,i))>>>0;return ((sum&65535)+(sum>>>16))&65535;}
export function checksum16(b){let sum=0;for(let i=0;i<b.length;i+=2)sum=(sum+u16(b,i))&65535;return sum;}
export function national3(internal){if(internal<=251)return internal;if(internal<277||internal>411)return 0;return internal+DATA.g3Deltas[internal-277];}
export function internal3(national){if(national<=251)return national;for(let i=277;i<=411;i++)if(national3(i)===national)return i;throw new SaveError('Especie no compatible.');}
export function expFor(n,rate){
  if(n<=1)return 0;
  const c=n*n*n;
  switch(rate){
    case 1:return Math.floor(5*c/4);
    case 2:return c;
    case 3:return Math.floor(4*c/5);
    case 4:return Math.floor(6*c/5)-15*n*n+100*n-140;
    case 5:return n<=50?Math.floor(c*(100-n)/50):n<=68?Math.floor(c*(150-n)/100):n<=98?Math.floor(c*Math.floor((1911-10*n)/3)/500):Math.floor(c*(160-n)/100);
    case 6:return n<=15?Math.floor(c*(Math.floor((n+1)/3)+24)/50):n<=36?Math.floor(c*(n+14)/50):Math.floor(c*(Math.floor(n/2)+32)/50);
    default:return c;
  }
}
export function levelFrom(exp,species){let l=1;while(l<100&&exp>=expFor(l+1,DATA.growth[species]))l++;return l;}

export function decrypt3(raw){
  assert(raw.length>=80,'Pokémon GBA incompleto.');
  const shuffled=new Uint8Array(48), key=(u32(raw,0)^u32(raw,4))>>>0;
  for(let i=0;i<48;i+=4)put32(shuffled,i,(u32(raw,i+32)^key)>>>0);
  const order=ORDERS[u32(raw,0)%24], plain=new Uint8Array(48);
  for(let i=0;i<4;i++)plain.set(shuffled.subarray(i*12,i*12+12),'GAEM'.indexOf(order[i])*12);
  return plain;
}
export function encrypt3(header,plain){
  const raw=new Uint8Array(80);raw.set(header.subarray(0,32));put16(raw,28,checksum16(plain));
  const key=(u32(raw,0)^u32(raw,4))>>>0, order=ORDERS[u32(raw,0)%24], shuffled=new Uint8Array(48);
  for(let i=0;i<4;i++){const o='GAEM'.indexOf(order[i])*12;shuffled.set(plain.subarray(o,o+12),i*12);}
  for(let i=0;i<48;i+=4)put32(raw,i+32,(u32(shuffled,i)^key)>>>0);
  return raw;
}
export function parsePK3(raw,location={}){
  if(raw.every(x=>x===0))return null;
  const plain=decrypt3(raw), internal=u16(plain,0), species=national3(internal), pid=u32(raw,0), oid=u32(raw,4), ivWord=u32(plain,40);
  const present=(raw[19]&2)!==0;
  const valid=present&&species>=1&&species<=386&&checksum16(plain)===u16(raw,28)&&(raw[19]&1)===0;
  return {...location,generation:3,species,name:DATA.names[species]||'Datos no válidos',nickname:decode3(raw.subarray(8,18),raw[18]===1),ot:decode3(raw.subarray(20,27),raw[18]===1),tid:oid&65535,pid,language:raw[18],level:levelFrom(u32(plain,4),species),exp:u32(plain,4),heldItem:u16(plain,2),moves:[0,1,2,3].map(i=>u16(plain,12+i*2)),ivs:[0,1,2,3,4,5].map(i=>(ivWord>>>(5*i))&31),shiny:((pid&65535)^(pid>>>16)^(oid&65535)^(oid>>>16))<8,egg:!!(ivWord&0x40000000),valid,raw:raw.slice(0,80),fingerprint:`3-${pid}-${oid}-${internal}`,types:DATA.types[species]||[1]};
}
function sectionSizes(game){return [game==='emerald'?0xF2C:0xF24,CHUNK,CHUNK,CHUNK,game==='emerald'?0xF08:0xEE8,...Array(8).fill(CHUNK),0x7D0];}
function inspectSlot(b,slot,game){
  const sectors=Array(14).fill(null), errors=[], counts=[];
  for(let n=0;n<14;n++){
    const start=slot*GROUP+n*SECTOR, id=u16(b,start+0xFF4), sig=u32(b,start+0xFF8);
    if(id>13||sig!==0x08012025){errors.push('Cabecera de sector inválida');continue;}
    if(sectors[id]!==null)errors.push('Sector duplicado');
    sectors[id]=start;counts.push(u32(b,start+0xFFC));
    if(checksum32(b.subarray(start,start+CHUNK),sectionSizes(game)[id])!==u16(b,start+0xFF6))errors.push(`Checksum incorrecto en sector ${id}`);
  }
  if(sectors.some(x=>x===null))errors.push('Faltan sectores');
  if(new Set(counts).size!==1)errors.push('Guardado incompleto: contadores distintos');
  return {slot,sectors,counter:counts[0]??0,complete:sectors.every(x=>x!==null),valid:errors.length===0,errors};
}
function newer(a,b){return a!==b&&((a-b)>>>0)<0x80000000;}
export function parseG3(b,game){
  assert(b.length===0x20000,'GBA requiere un guardado de batería de 128 KiB (131072 bytes). No se aceptan 64 KiB, estados ni cabeceras.');
  const slots=[inspectSlot(b,0,game),inspectSlot(b,1,game)];
  const complete=slots.filter(s=>s.complete).sort((a,z)=>newer(z.counter,a.counter)?1:-1);
  assert(complete.length,'No hay un bloque completo GBA. Revisa el juego, el tamaño y que no sea un estado rápido.');
  const active=complete[0];
  assert(active.valid,`La copia más reciente está dañada o el juego indicado no coincide: ${active.errors[0]}. Importación bloqueada.`);
  const storage=new Uint8Array(9*CHUNK),large=new Uint8Array(4*CHUNK);
  for(let id=5;id<=13;id++)storage.set(b.subarray(active.sectors[id],active.sectors[id]+CHUNK),(id-5)*CHUNK);
  for(let id=1;id<=4;id++)large.set(b.subarray(active.sectors[id],active.sectors[id]+CHUNK),(id-1)*CHUNK);
  const small=b.subarray(active.sectors[0],active.sectors[0]+CHUNK);
  assert(!(small[6]===0&&small[7]===0),'Esta versión admite guardados internacionales. El formato japonés no se puede importar con seguridad.');
  assert(u32(storage,0)<14,'Índice de caja GBA no válido. Los ROM hacks no son compatibles.');
  const records=[],boxes=[];
  for(let box=0;box<14;box++){
    const label=decode3(storage.subarray(33604+box*9,33604+box*9+9))||`Caja ${box+1}`;boxes.push(label);
    for(let slot=0;slot<30;slot++){
      const offset=4+(box*30+slot)*80;
      const pk=parsePK3(storage.subarray(offset,offset+80),{box,slot,location:'pc',boxName:label});
      if(pk)records.push(pk);
    }
  }
  const partyCountOffset=game==='emerald'?0x234:0x34, partyOffset=partyCountOffset+4, partyCount=u32(large,partyCountOffset);
  assert(partyCount<=6,'Equipo no válido. Comprueba si el guardado es de Esmeralda o Rojo Fuego original.');
  for(let slot=0;slot<partyCount;slot++){
    const pk=parsePK3(large.subarray(partyOffset+slot*100,partyOffset+slot*100+80),{box:-1,slot,location:'party',boxName:'Equipo'});
    if(pk)records.push(pk);
  }
  const invalid=records.filter(p=>!p.valid).length;
  return {generation:3,game,trainer:decode3(small.subarray(0,8)),tid:u16(small,10),records,boxes,storage,active,slots,checks:[{label:'Tamaño de batería',ok:true,detail:'128 KiB'},{label:'Sectores del guardado activo',ok:true,detail:'14 / 14'},{label:'Checksums de sectores',ok:true,detail:'14 / 14'},{label:'Estructuras Pokémon',ok:invalid===0,detail:invalid?`${invalid} en cuarentena`:`${records.length} verificadas`}],warnings:[...(!slots[1-active.slot].valid?['La copia interna secundaria no es válida; el original se conserva íntegro.']:[]),...(invalid?['Los Pokémon con datos inválidos quedan bloqueados para transferencias.']:[])]};
}

function readList2(b,offset,capacity,party,language,loc){
  const count=b[offset], size=party?48:32, records=[];
  assert(count<=capacity,`Lista de ${loc.boxName} no válida.`);
  assert(b[offset+1+count]===255,`Lista de ${loc.boxName} sin terminador. El formato no es Cristal internacional.`);
  const dataOffset=offset+capacity+2,otOffset=dataOffset+capacity*size,nickOffset=otOffset+capacity*11;
  for(let slot=0;slot<count;slot++){
    const raw=b.slice(dataOffset+slot*size,dataOffset+slot*size+size), species=raw[0], egg=b[offset+1+slot]===253, dv=be16(raw,21);
    const atk=(dv>>>12)&15,def=(dv>>>8)&15,spd=(dv>>>4)&15,spe=dv&15;
    const valid=species>=1&&species<=251&&raw[31]>=1&&raw[31]<=100&&(egg||species===b[offset+1+slot]);
    records.push({...loc,slot,generation:2,species,name:DATA.names[species]||'Datos no válidos',nickname:decode2(b.subarray(nickOffset+slot*11,nickOffset+slot*11+11),language),ot:decode2(b.subarray(otOffset+slot*11,otOffset+slot*11+11),language),nicknameRaw:b.slice(nickOffset+slot*11,nickOffset+slot*11+11),otRaw:b.slice(otOffset+slot*11,otOffset+slot*11+11),textLanguage:language,tid:be16(raw,6),level:raw[31],exp:raw[8]*65536+raw[9]*256+raw[10],moves:Array.from(raw.subarray(2,6)),heldItem:raw[1],shiny:def===10&&spd===10&&spe===10&&[2,3,6,7,10,11,14,15].includes(atk),egg,valid,raw,fingerprint:`2-${species}-${be16(raw,6)}-${dv}-${Array.from(raw.subarray(8,11)).join('-')}`,types:DATA.types[species]||[1],ivs:[atk,def,spd,spe]});
  }
  return records;
}
export function parseG2(b,language='es'){
  assert(b.length===32768,'Cristal requiere 32 KiB (32768 bytes), sin cola RTC ni cabecera. Exporta un guardado de batería estándar.');
  let sum=0;for(let i=0x2009;i<=0x2B82;i++)sum=(sum+b[i])&65535;
  assert(sum===u16(b,0x2D0D),'Checksum principal de Cristal no válido. Puede ser otro juego, una región no compatible o un archivo dañado.');
  assert(b[0x2700]<14,'Índice de caja de Cristal no válido.');
  const records=[],boxes=[];
  for(let box=0;box<14;box++){
    const offset=(box<7?0x4000:0x6000)+(box%7)*0x450;
    const label=decode2(b.subarray(0x2703+box*9,0x2703+box*9+9),language)||`Caja ${box+1}`;boxes.push(label);
    records.push(...readList2(b,offset,20,false,language,{box,location:'pc',boxName:label}));
  }
  records.push(...readList2(b,0x2865,6,true,language,{box:-1,location:'party',boxName:'Equipo'}));
  const invalid=records.filter(p=>!p.valid).length;
  return {generation:2,game:'crystal',trainer:decode2(b.subarray(0x200B,0x2013),language),tid:be16(b,0x2009),records,boxes,language,checks:[{label:'Tamaño de batería',ok:true,detail:'32 KiB'},{label:'Checksum principal',ok:true,detail:'Verificado'},{label:'Listas de cajas y equipo',ok:true,detail:'15 / 15'},{label:'Estructuras Pokémon',ok:invalid===0,detail:invalid?`${invalid} en cuarentena`:`${records.length} verificadas`}],warnings:['Cristal permite copias entre partidas de generación II y recibir desde Amarillo, con respaldo. No hay ruta compatible II → III.','La suma principal de Cristal no cubre todas las cajas; las listas se comprueban por estructura.']};
}
export function parseSave(bytes,game,language='es'){
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  assert(GAMES[game],'Selecciona un juego compatible.');
  if(game==='yellow')return parseYellow(b,language,levelFrom);
  if(DS_LAYOUTS[game])return parseNDS(b,game,levelFrom);
  return game==='crystal'?parseG2(b,language):parseG3(b,game);
}

function prepareGBA(destination,selected,targetBox){
  assert(destination&&destination.bytes,'Importa una partida de destino.');
  assert(!destination.demo,'La demo no es una partida jugable. Importa tus guardados para exportar.');
  assert(GAMES[destination.game]?.generation===3,'Este juego solo admite importación, consulta y planes manuales. La escritura automática está limitada a Rojo Fuego y Esmeralda.');
  assert(Number.isInteger(targetBox)&&targetBox>=0&&targetBox<14,'Caja de destino no válida.');
  assert(selected.length>0&&selected.length<=30,'Selecciona entre 1 y 30 Pokémon.');
  const parsed=parseSave(destination.bytes,destination.game), seen=new Set(parsed.records.map(p=>p.fingerprint));
  assert(parsed.records.every(p=>p.valid),'El destino contiene Pokémon en cuarentena. Revisa la partida antes de exportar.');
  const slots=[];
  for(let slot=0;slot<30;slot++){
    const o=4+(targetBox*30+slot)*80;
    if(parsed.storage.subarray(o,o+80).every(v=>v===0))slots.push(slot);
  }
  assert(slots.length>=selected.length,`La caja tiene ${slots.length} huecos libres y necesitas ${selected.length}. Nunca se sustituye una casilla ocupada.`);
  const placements=[];
  for(let i=0;i<selected.length;i++){
    const p=selected[i];
    assert(p.generation===3,'No existe intercambio directo compatible con este exportador entre generaciones. Solo se copian Pokémon GBA de generación III; la conversión está bloqueada.');
    assert(p.location==='pc','Deposita primero al Pokémon del equipo en una caja dentro del juego y vuelve a importar.');
    assert(p.valid&&parsePK3(p.raw)?.valid,'Pokémon no válido: checksum o estructura incorrectos.');
    assert(!p.egg,'Los huevos no se transfieren en esta versión.');
    assert(!p.heldItem,'Retira el objeto equipado dentro del juego y vuelve a importar antes de transferir.');
    assert([2,3,4,5,7].includes(p.language),'Solo se pueden copiar Pokémon de idiomas internacionales compatibles.');
    assert(!seen.has(p.fingerprint),`${p.name} ya existe en el destino o está repetido en la selección. Copia bloqueada.`);
    seen.add(p.fingerprint);placements.push({pokemon:p,box:targetBox,slot:slots[i]});
  }
  return {parsed,placements};
}
function buildGBA(destination,selected,targetBox){
  const {parsed,placements}=prepareGBA(destination,selected,targetBox), output=destination.bytes.slice(), storage=parsed.storage.slice();
  for(const p of placements)storage.set(p.pokemon.raw,4+(p.box*30+p.slot)*80);
  for(let id=5;id<=13;id++){
    const start=parsed.active.sectors[id];
    output.set(storage.subarray((id-5)*CHUNK,(id-4)*CHUNK),start);
    put16(output,start+0xFF6,checksum32(output.subarray(start,start+CHUNK),sectionSizes(destination.game)[id]));
  }
  const checked=parseSave(output,destination.game);
  assert(checked.records.length===parsed.records.length+selected.length,'El número de Pokémon no coincide tras la escritura.');
  for(const p of placements){
    const found=checked.records.find(x=>x.location==='pc'&&x.box===p.box&&x.slot===p.slot);
    assert(found?.valid&&bytesEqual(found.raw,p.pokemon.raw),'La verificación posterior del Pokémon ha fallado.');
  }
  // Only PC payload bytes and their sector checksums may change.
  const allowed=new Uint8Array(output.length);
  for(const p of placements){for(let k=0;k<80;k++){const o=4+(p.box*30+p.slot)*80+k,id=5+Math.floor(o/CHUNK);allowed[parsed.active.sectors[id]+o%CHUNK]=1;}}
  for(let id=5;id<=13;id++){allowed[parsed.active.sectors[id]+0xFF6]=1;allowed[parsed.active.sectors[id]+0xFF7]=1;}
  for(let i=0;i<output.length;i++)assert(output[i]===destination.bytes[i]||allowed[i],'Se detectó un cambio fuera de las cajas. Exportación bloqueada.');
  return {bytes:output,placements,checked,route:'III → III',notes:['Copia de generación III. El origen conserva sus Pokémon.'],integritySummary:'14 / 14 checksums válidos'};
}

const transferAPI=()=>({parseSave,parsePK3,decrypt3,decode3,levelFrom,checksum16,GAMES});
export function prepareTransfer(destination,selected,targetBox,options={}){
  if(GAMES[destination?.game]?.generation===3){const result=prepareGBA(destination,selected,targetBox);return {...result,route:'III → III',notes:['Copia exacta de Pokémon GBA sin objetos equipados.']};}
  return preparePortableTransfer(destination,selected,targetBox,transferAPI(),options);
}
export function buildTransfer(destination,selected,targetBox,options={}){
  return GAMES[destination?.game]?.generation===3?buildGBA(destination,selected,targetBox):buildPortableTransfer(destination,selected,targetBox,transferAPI(),options);
}

const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(b){let c=0xFFFFFFFF;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
export function makeZip(files){
  const encoder=new TextEncoder(),parts=[],central=[];let offset=0,total=0;
  for(const f of files){
    const name=encoder.encode(f.name),data=typeof f.data==='string'?encoder.encode(f.data):f.data,crc=crc32(data),h=new Uint8Array(30+name.length);
    put32(h,0,0x04034B50);put16(h,4,20);put16(h,6,0x800);put32(h,14,crc);put32(h,18,data.length);put32(h,22,data.length);put16(h,26,name.length);h.set(name,30);parts.push(h,data);
    const c=new Uint8Array(46+name.length);put32(c,0,0x02014B50);put16(c,4,20);put16(c,6,20);put16(c,8,0x800);put32(c,16,crc);put32(c,20,data.length);put32(c,24,data.length);put16(c,28,name.length);put32(c,42,offset);c.set(name,46);central.push(c);offset+=h.length+data.length;total+=c.length;
  }
  const end=new Uint8Array(22);put32(end,0,0x06054B50);put16(end,8,files.length);put16(end,10,files.length);put32(end,12,total);put32(end,16,offset);
  const result=new Uint8Array(offset+total+22);let o=0;for(const p of [...parts,...central,end]){result.set(p,o);o+=p.length;}return result;
}

// Test/demo fixture construction. These are explicitly NOT playable game saves.
export function makeDemoPK3(species,level,seed){
  const h=new Uint8Array(32),p=new Uint8Array(48);put32(h,0,(seed*65537+493)>>>0);put32(h,4,0x1234ABCD);h.set(encode3(DATA.names[species].toUpperCase(),10),8);h[18]=7;h[19]=2;h.set(encode3('DEMO',7),20);put16(p,0,internal3(species));put32(p,4,expFor(level,DATA.growth[species]));p[9]=70;put16(p,12,33);put16(p,14,45);put32(p,40,0x1EF7BDEF);return encrypt3(h,p);
}
export function makeFixtureG3(game,pokemon=[],counter=10){
  const b=new Uint8Array(131072),storage=new Uint8Array(9*CHUNK);
  pokemon.forEach((p,i)=>storage.set(p,4+i*80));
  for(let i=0;i<14;i++)storage.set(encode3('CAJA '+(i+1),9),33604+i*9);
  for(let slot=0;slot<2;slot++)for(let id=0;id<14;id++){
    const start=slot*GROUP+((id+3)%14)*SECTOR;
    if(id===0){b.set(encode3('DEMO',8),start);put16(b,start+10,12345);}
    if(id>=5)b.set(storage.subarray((id-5)*CHUNK,(id-4)*CHUNK),start);
    put16(b,start+0xFF4,id);put32(b,start+0xFF8,0x08012025);put32(b,start+0xFFC,counter-slot);put16(b,start+0xFF6,checksum32(b.subarray(start,start+CHUNK),sectionSizes(game)[id]));
  }return b;
}
export function makeFixtureG2(species=[245,157,181,196,197,248,130,251]){
  const b=new Uint8Array(32768);b.set(encode2('DEMO',8),0x200B);
  for(let box=0;box<14;box++){const o=(box<7?0x4000:0x6000)+(box%7)*0x450;b[o+1]=255;b.set(encode2('CAJA '+(box+1),9),0x2703+box*9);}
  b[0x2866]=255;b[0x4000]=species.length;b[0x4001+species.length]=255;
  species.forEach((s,i)=>{b[0x4001+i]=s;const o=0x4000+22+i*32;b[o]=s;b[o+31]=35+i*3;view(b).setUint16(o+6,12345,false);view(b).setUint16(o+21,0x8888,false);b.set(encode2('DEMO',11),0x4000+22+640+i*11);b.set(encode2(DATA.names[s].toUpperCase(),11),0x4000+22+640+220+i*11);});
  let sum=0;for(let i=0x2009;i<=0x2B82;i++)sum=(sum+b[i])&65535;put16(b,0x2D0D,sum);put16(b,0x1F0D,sum);return b;
}
