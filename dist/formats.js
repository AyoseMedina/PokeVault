import { DATA } from './data.js';
import { FORMAT_DATA as F } from './formats-data.js';

// Read-only importers. No write path exists for Game Boy or Nintendo DS saves.
const dv=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
const u16=(b,o)=>dv(b).getUint16(o,true),u32=(b,o)=>dv(b).getUint32(o,true),be16=(b,o)=>dv(b).getUint16(o,false);
const require=(v,message)=>{if(!v){const e=new Error(message);e.name='SaveError';throw e;}};
const sum16=b=>{let c=0;for(let i=0;i<b.length;i+=2)c=(c+u16(b,i))&65535;return c;};
export const DS_LAYOUTS={
  diamond:{family:'dp',generation:4,gsize:0xC100,ssize:0x121E0,sstart:0xC100,footer:0x14,trainer:0x64,party:0x98,boxStart:4,stride:4080,names:73444},
  pearl:{family:'dp',generation:4,gsize:0xC100,ssize:0x121E0,sstart:0xC100,footer:0x14,trainer:0x64,party:0x98,boxStart:4,stride:4080,names:73444},
  platinum:{family:'pt',generation:4,gsize:0xCF2C,ssize:0x121E4,sstart:0xCF2C,footer:0x14,trainer:0x68,party:0xA0,boxStart:4,stride:4080,names:73444},
  heartgold:{family:'hgss',generation:4,gsize:0xF628,ssize:0x12310,sstart:0xF700,footer:0x10,trainer:0x64,party:0x98,boxStart:0,stride:4096,names:0x12008},
  soulsilver:{family:'hgss',generation:4,gsize:0xF628,ssize:0x12310,sstart:0xF700,footer:0x10,trainer:0x64,party:0x98,boxStart:0,stride:4096,names:0x12008},
  black:{family:'bw',generation:5},white:{family:'bw',generation:5},black2:{family:'b2w2',generation:5},white2:{family:'b2w2',generation:5}
};
export function crc16CCITT(bytes){let crc=65535;for(const b of bytes){crc^=b<<8;for(let j=0;j<8;j++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&65535;}return crc;}
export function decodeDS(bytes,generation){
  let result='';for(let i=0;i+1<bytes.length;i+=2){const c=u16(bytes,i);if(c===65535||c===0)break;let char=generation===5?String.fromCharCode(c):(F.g4chars[c]||F.g4korean[c-0x400]||'?');if(char==='\0')break;if(char==='⑭')char='♂';if(char==='⑮')char='♀';result+=char;}
  return result.trim();
}
function decodeGB(bytes){let s='';for(const c of bytes){if(c===0x50)break;s+=F.g1chars[c]||'?';}return s.replace(/\0/g,'').trim();}
function historicalTypes(species,generation){if(generation===1&&[81,82].includes(species))return [13];return DATA.types[species]||[1];}

export function parseYellow(bytes,language='es',levelFrom){
  require(bytes.length===32768,'Amarillo requiere un guardado de batería internacional de 32 KiB (32768 bytes).');
  let sum=0;for(let i=0x2598;i<0x3523;i++)sum=(sum+bytes[i])&255;
  require(((~sum)&255)===bytes[0x3523],'Checksum principal de Amarillo no válido. Comprueba región, juego y formato de batería.');
  const current=bytes[0x284C]&127,initialized=(bytes[0x284C]&128)!==0;
  require(current<12,'Índice de caja de Amarillo no válido.');
  const records=[],boxes=Array.from({length:12},(_,i)=>`Caja ${i+1}`);
  function readList(offset,capacity,party,box){
    const count=bytes[offset],size=party?44:33,label=box===-1?'Equipo':boxes[box];
    require(count<=capacity&&bytes[offset+1+count]===255,`Lista de ${label} de Amarillo no válida.`);
    const start=offset+capacity+2,otStart=start+capacity*size,nickStart=otStart+capacity*11;
    for(let slot=0;slot<count;slot++){
      const raw=bytes.slice(start+slot*size,start+(slot+1)*size),internal=raw[0],species=F.g1species[internal]||0;
      const exp=raw[14]*65536+raw[15]*256+raw[16],level=levelFrom(exp,species),dvWord=be16(raw,27);
      const valid=species>=1&&species<=151&&bytes[offset+1+slot]===internal&&[8,9,10,11].every(i=>raw[i]<=165)&&raw[3]>=1&&raw[3]<=100;
      records.push({box,slot,location:party?'party':'pc',boxName:label,generation:1,species,name:DATA.names[species]||'Datos no válidos',nickname:decodeGB(bytes.subarray(nickStart+slot*11,nickStart+(slot+1)*11)),ot:decodeGB(bytes.subarray(otStart+slot*11,otStart+(slot+1)*11)),nicknameRaw:bytes.slice(nickStart+slot*11,nickStart+(slot+1)*11),otRaw:bytes.slice(otStart+slot*11,otStart+(slot+1)*11),textLanguage:language,tid:be16(raw,12),level,exp,moves:Array.from(raw.subarray(8,12)),heldItem:0,shiny:false,egg:false,valid,raw,fingerprint:`1-${species}-${be16(raw,12)}-${dvWord}-${exp}`,ivs:[12,8,4,0].map(n=>(dvWord>>>n)&15),types:historicalTypes(species,1)});
    }
  }
  for(let box=0;box<12;box++){
    if(box===current)readList(0x30C0,20,false,box);
    else if(initialized)readList((box<6?0x4000:0x6000)+(box%6)*0x462,20,false,box);
  }
  readList(0x2F2C,6,true,-1);
  const bad=records.filter(p=>!p.valid).length;
  return {generation:1,game:'yellow',language,trainer:decodeGB(bytes.subarray(0x2598,0x25A3)),tid:be16(bytes,0x2605),records,boxes,boxCapacity:20,checks:[{label:'Batería internacional',ok:true,detail:'32 KiB'},{label:'Checksum principal',ok:true,detail:'Verificado'},{label:'Caja activa y listas',ok:true,detail:initialized?'12 cajas + equipo':'Caja activa + equipo'},{label:'Estructuras Pokémon',ok:bad===0,detail:bad?`${bad} en cuarentena`:`${records.length} verificadas`}],warnings:['Amarillo permite copias entre partidas de generación I y enviar a Cristal, conservando los originales.','Generación I no tiene checksum individual de Pokémon. El checksum principal no cubre todas las cajas; las listas se validan por estructura.']};
}

const ORDERS=['ABCD','ABDC','ACBD','ACDB','ADBC','ADCB','BACD','BADC','BCAD','BCDA','BDAC','BDCA','CABD','CADB','CBAD','CBDA','CDAB','CDBA','DABC','DACB','DBAC','DBCA','DCAB','DCBA'];
export function decryptPK45(raw){
  require(raw.length>=136,'Pokémon de Nintendo DS incompleto.');
  const physical=new Uint8Array(128),plain=new Uint8Array(136);plain.set(raw.subarray(0,8));let seed=u16(raw,6);
  for(let i=0;i<128;i+=2){seed=(Math.imul(seed,0x41C64E6D)+0x6073)>>>0;dv(physical).setUint16(i,u16(raw,i+8)^(seed>>>16),true);}
  const order=ORDERS[((u32(raw,0)>>>13)&31)%24];
  for(let i=0;i<4;i++)plain.set(physical.subarray(i*32,(i+1)*32),8+'ABCD'.indexOf(order[i])*32);
  return plain;
}
export function encryptPK45(plain){
  require(plain.length===136,'Estructura Pokémon DS no válida.');
  const output=new Uint8Array(136),physical=new Uint8Array(128);output.set(plain.subarray(0,8));dv(output).setUint16(6,sum16(plain.subarray(8)),true);
  const order=ORDERS[((u32(plain,0)>>>13)&31)%24];
  for(let i=0;i<4;i++){const start=8+'ABCD'.indexOf(order[i])*32;physical.set(plain.subarray(start,start+32),i*32);}
  let seed=u16(output,6);for(let i=0;i<128;i+=2){seed=(Math.imul(seed,0x41C64E6D)+0x6073)>>>0;dv(output).setUint16(8+i,u16(physical,i)^(seed>>>16),true);}return output;
}
export function parsePK45(raw,generation,location,levelFrom){
  if(raw.every(v=>v===0))return null;
  const p=decryptPK45(raw);if(p.every(v=>v===0))return null;
  const species=u16(p,8),pid=u32(p,0),oid=u32(p,12),ivWord=u32(p,56),maxSpecies=generation===4?493:649,maxMove=generation===4?467:559;
  const moves=[0,1,2,3].map(i=>u16(p,0x28+i*2)),valid=u16(p,4)===0&&sum16(p.subarray(8,136))===u16(p,6)&&species>=1&&species<=maxSpecies&&moves.every(m=>m<=maxMove);
  return {...location,generation,species,name:DATA.names[species]||'Datos no válidos',nickname:decodeDS(p.subarray(0x48,0x5E),generation),ot:decodeDS(p.subarray(0x68,0x78),generation),tid:oid&65535,pid,language:p[0x17],level:levelFrom(u32(p,0x10),species),exp:u32(p,0x10),heldItem:u16(p,0xA),moves,ivs:[0,1,2,3,4,5].map(i=>(ivWord>>>(5*i))&31),shiny:((pid&65535)^(pid>>>16)^(oid&65535)^(oid>>>16))<8,egg:!!(ivWord&0x40000000),form:p[0x40]>>>3,valid,raw:raw.slice(0,136),fingerprint:`${generation}-${pid}-${oid}-${species}`,types:historicalTypes(species,generation)};
}
export function unwrapDS(bytes){
  if(bytes.length===524288)return {bytes,container:'SAV / SRM · 512 KiB'};
  require([524288+40,524288+122].includes(bytes.length),'Nintendo DS requiere 512 KiB (524288 bytes) o un .dsv estándar con pie reconocido. No se aceptan estados rápidos ni formatos comprimidos de No$GBA.');
  const footer=new TextDecoder().decode(bytes.subarray(bytes.length-16));
  require(footer==='|-DESMUME SAVE-|'&&u32(bytes,bytes.length-36)===524288&&u32(bytes,bytes.length-20)===0,'El pie .dsv no es válido o declara un tamaño diferente. El original no se recorta.');
  return {bytes:bytes.subarray(0,524288),container:'DSV · pie reconocido; original íntegro'};
}
function selectG4Block(bytes,start,length,footer,label){
  const candidates=[0,0x40000].map(base=>{
    const data=bytes.subarray(base+start,base+start+length),magic=u32(data,length-8);
    return {base:base+start,data,known:[0x20060623,0x20070903].includes(magic),major:u32(data,length-20),minor:u32(data,length-16),valid:crc16CCITT(data.subarray(0,length-footer))===u16(data,length-2)};
  });
  const known=candidates.filter(c=>c.known);require(known.length,`${label}: cabecera no compatible con el juego DS seleccionado.`);
  const compare=(a,b)=>{if(a===b)return 0;if(a===0xFFFFFFFF&&b!==0xFFFFFFFE)return -1;if(b===0xFFFFFFFF&&a!==0xFFFFFFFE)return 1;return a>b?1:-1;};
  known.sort((a,b)=>compare(b.major,a.major)||compare(b.minor,a.minor));const chosen=known[0];
  require(chosen.valid,`${label}: CRC de la copia más reciente incorrecto. Importación bloqueada; no se sustituye silenciosamente por una copia antigua.`);return chosen;
}
export function parseNDS(input,game,levelFrom){
  const config=DS_LAYOUTS[game];require(config,'Juego de Nintendo DS no compatible.');
  const {bytes:b,container}=unwrapDS(input),records=[],boxes=[];let trainer,tid,checks,writeInfo;
  const add=(raw,loc)=>{const p=parsePK45(raw,config.generation,loc,levelFrom);if(p)records.push(p);};
  if(config.generation===4){
    const g=selectG4Block(b,0,config.gsize,config.footer,'Datos generales'),s=selectG4Block(b,config.sstart,config.ssize,config.footer,'Cajas del PC');
    writeInfo={kind:'nds4',storageBase:s.base,storageSize:config.ssize,footer:config.footer,boxStart:config.boxStart,stride:config.stride,hgss:config.family==='hgss'};
    trainer=decodeDS(g.data.subarray(config.trainer,config.trainer+16),4);tid=u16(g.data,config.trainer+16);
    const current=u32(s.data,config.family==='hgss'?0x12000:0);require(current<18,'Índice de caja DS no válido.');
    for(let box=0;box<18;box++){
      const name=decodeDS(s.data.subarray(config.names+box*40,config.names+box*40+40),4)||`Caja ${box+1}`;boxes.push(name);
      for(let slot=0;slot<30;slot++){const offset=config.boxStart+box*config.stride+slot*136;add(s.data.subarray(offset,offset+136),{box,slot,location:'pc',boxName:name});}
    }
    const count=g.data[config.party-4];require(count<=6,'Equipo de generación IV no válido.');
    for(let slot=0;slot<count;slot++){const o=config.party+slot*236;add(g.data.subarray(o,o+136),{box:-1,slot,location:'party',boxName:'Equipo'});}
    checks=[{label:'CRC datos generales',ok:true,detail:`Copia ${g.base<0x40000?1:2}`},{label:'CRC almacenamiento',ok:true,detail:`Copia ${s.base<0x40000?1:2} · 18 cajas`}];
  }else{
    const blocks=F[config.family];
    writeInfo={kind:'nds5',family:config.family};
    for(let index=0;index<blocks.length;index++){
      const [offset,length,checksum,mirror]=blocks[index],crc=crc16CCITT(b.subarray(offset,offset+length));
      require(crc===u16(b,checksum)&&crc===u16(b,mirror),`Nintendo DS: CRC incorrecto en bloque ${index} de ${config.family==='bw'?'Negro / Blanco':'Negro 2 / Blanco 2'}. Comprueba el juego seleccionado y exporta una batería válida.`);
    }
    trainer=decodeDS(b.subarray(0x19404,0x19414),5);tid=u16(b,0x19414);require(b[0]<24,'Índice de caja DS no válido.');
    for(let box=0;box<24;box++){
      const name=decodeDS(b.subarray(4+box*40,4+box*40+20),5)||`Caja ${box+1}`;boxes.push(name);
      for(let slot=0;slot<30;slot++){const offset=0x400+box*4096+slot*136;add(b.subarray(offset,offset+136),{box,slot,location:'pc',boxName:name});}
    }
    const count=b[0x18E04];require(count<=6,'Equipo de generación V no válido.');
    for(let slot=0;slot<count;slot++){const o=0x18E08+slot*220;add(b.subarray(o,o+136),{box:-1,slot,location:'party',boxName:'Equipo'});}
    checks=[{label:'CRC bloques principales',ok:true,detail:`${blocks.length} / ${blocks.length}`},{label:'Checksums espejo',ok:true,detail:'Verificados · 24 cajas'}];
  }
  const bad=records.filter(p=>!p.valid).length;
  return {generation:config.generation,game,trainer,tid,records,boxes,boxCapacity:30,container,writeInfo,checks:[{label:'Batería DS',ok:true,detail:container},...checks,{label:'Pokémon descifrados',ok:bad===0,detail:bad?`${bad} en cuarentena`:`${records.length} verificados`}],warnings:['Las transferencias se preparan como copias en archivos nuevos, con respaldo y comprobación posterior. La ruta y sus restricciones se revisan antes de exportar.','Se leen cajas de PC y equipo. No se extraen guardería, GTS, Pokéwalker, caja de combate ni otros contenidos auxiliares. La validación cubre los bloques principales, no todos los datos adicionales.']};
}
