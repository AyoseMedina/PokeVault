import { DATA } from './data.js';
import { FORMAT_DATA as F } from './formats-data.js';
import { TRANSFER_DATA as T } from './transfer-data.js';
import { decryptPK45, encryptPK45, parsePK45, crc16CCITT } from './formats.js';

const v=b=>new DataView(b.buffer,b.byteOffset,b.byteLength),u16=(b,o)=>v(b).getUint16(o,true),u32=(b,o)=>v(b).getUint32(o,true),be16=(b,o)=>v(b).getUint16(o,false);
const set16=(b,o,n)=>v(b).setUint16(o,n,true),set32=(b,o,n)=>v(b).setUint32(o,n,true),equal=(a,b)=>a.length===b.length&&a.every((n,i)=>n===b[i]);
const require=(ok,message)=>{if(!ok){const e=new Error(message);e.name='SaveError';throw e;}};
const roman=['','I','II','III','IV','V'];
export function defaultTransferDate(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Atlantic/Canary',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const field=t=>p.find(x=>x.type===t).value;return `${field('year')}-${field('month')}-${field('day')}`;}
function dateParts(date){require(/^20\d\d-\d\d-\d\d$/.test(date),'Fecha de transferencia no válida (2000–2099).');const d=new Date(date+'T12:00:00Z');require(!Number.isNaN(+d)&&d.toISOString().slice(0,10)===date,'Fecha de transferencia no válida.');return [d.getUTCFullYear()-2000,d.getUTCMonth()+1,d.getUTCDate()];}
export function routeFor(source,target){
  require(Number.isInteger(source)&&Number.isInteger(target)&&source>=1&&source<=5&&target>=1&&target<=5,'Generación no compatible.');
  require(target>=source,'No se permiten envíos a una generación anterior.');
  require(source===target||(source===1&&target===2)||(source===3&&[4,5].includes(target))||(source===4&&target===5),'No existe una ruta compatible entre estas generaciones. El salto II → III y las rutas que lo atraviesan están bloqueados.');
  return source===3&&target===5?'III → IV → V':`${roman[source]} → ${roman[target]}`;
}
export function entityIdentity(p){
  if(p.generation>=3){const oid=p.generation===3?u32(p.raw,4):u32(decryptPK45(p.raw),12);return `pid-${p.species}-${p.pid}-${oid}`;}
  const dv=be16(p.raw,p.generation===1?27:21),o=p.generation===1?14:8,exp=p.raw[o]*65536+p.raw[o+1]*256+p.raw[o+2];return `gb-${p.species}-${p.tid}-${dv}-${exp}`;
}
function identity(p){
  return entityIdentity(p);
}
function validatePokemon(source,api){
  require(source?.valid&&source.raw,'Pokémon no válido o en cuarentena.');
  require(!source.demo,'Los Pokémon de demo no se pueden exportar como datos jugables.');
  require(source.location==='pc','Deposita primero al Pokémon del equipo en una caja dentro del juego y vuelve a importar.');
  let p=source;
  if(source.generation===3){const decoded=api.parsePK3(source.raw);require(decoded?.valid&&decoded.species===source.species,'Checksum o especie del Pokémon GBA incorrectos.');p={...source,...decoded};}
  else if(source.generation>=4){const decoded=parsePK45(source.raw,source.generation,{},api.levelFrom);require(decoded?.valid&&decoded.species===source.species,'Checksum o especie del Pokémon DS incorrectos.');p={...source,...decoded};}
  else{
    require(source.raw.length===(source.generation===1?33:32),'Pokémon de Game Boy incompleto.');
    require(source.species===(source.generation===1?F.g1species[source.raw[0]]:source.raw[0]),'Especie de Game Boy incorrecta.');
    require(source.otRaw?.length===11&&source.nicknameRaw?.length===11,'Faltan los nombres originales del Pokémon de Game Boy. Vuelve a importar su partida.');
  }
  require(!p.egg,'Los huevos están bloqueados. Hazlos eclosionar en el juego de origen y vuelve a importar.');
  require(!p.heldItem,'Retira el objeto equipado en el juego de origen y vuelve a importar. No se borran objetos ni se modifica la bolsa automáticamente.');
  if(p.generation>=3)require([2,3,4,5,7].includes(p.language),'La exportación admite Pokémon de idiomas internacionales compatibles (EN/FR/IT/DE/ES).');
  return p;
}
function healPP(plain,generation){for(let i=0;i<4;i++){const move=u16(plain,0x28+i*2),ups=plain[0x34+i],pp=T['pp'+generation][move];require(ups<=3&&pp!==undefined,'Movimiento o cantidad de PP Más no compatible.');plain[0x30+i]=move?Math.floor(pp*(5+ups)/5):0;}}
function encodeName(buffer,text,generation){
  require([...text].length<buffer.length/2,'El nombre no cabe en el formato de destino.');
  let i=0;for(const char of text){let code;if(generation===4)code=char==='♂'?0x1BB:char==='♀'?0x1BC:F.g4chars.indexOf(char);else code=char==='♂'?0x246D:char==='♀'?0x246E:char.charCodeAt(0);require(code>0&&code<65535&&!(code>=0xD800&&code<=0xDFFF),`El carácter «${char}» no tiene una conversión fiel. No se reemplazará por otro.`);set16(buffer,i++*2,code);}set16(buffer,i*2,65535);
}
const invalid45=new Set("$_ª°ºÂÃÅÆÊËÎÏÐÔÕØÛÝÞãåæðõøýþÿŒœŞş←↑→↓⑧⑨⑩⑪⑫⒅⒆⒇⒈⒉⒊⒋⒌⒍⒎⒏►♈♉♊♋♌♍♎♏円＆＿");
function text3Lossless(bytes){let text='';for(const c of bytes){if(c===255)break;require(!(c>=1&&c<=0xA0)&&![0xB1,0xB2,0xB7].includes(c)&&!(c>=0xF7&&c<=0xFE),'El nombre o entrenador usa glifos de GBA que Parque Compi transforma. Esta conversión se bloquea para no cambiar el texto.');const char=DATA.g3chars[c];require(char&&char!=='\0','El texto GBA contiene un glifo no representable.');text+=char;}return text;}
function text4Lossless(bytes){let text='';for(let i=0;i<bytes.length;i+=2){const code=u16(bytes,i);if(code===65535||code===0)break;require(![0xEE,0xEF].includes(code),'El nombre contiene un símbolo de género de ancho completo. Conversión bloqueada para preservar su representación.');const char=code===0xE0?null:F.g4chars[code]||F.g4korean[code-0x400];require(char&&char!=='\0','El texto de generación IV contiene un glifo desconocido. No se sustituirá por un signo de interrogación.');text+=char;}return text;}
function plain3to4(p,api,date){
  const g=api.decrypt3(p.raw),origins=u16(g,38),version=(origins>>>7)&15,ball=(origins>>>11)&15,ribbons=u32(g,44),pid=p.pid;
  require(version>=1&&version<=5&&ball>=1&&ball<=12,'Los datos de procedencia GBA no son compatibles con la conversión segura.');
  require((ribbons&0xF8000000)===0,'Los eventos con encuentro especial o cintas reservadas requieren revisión manual.');
  require(!p.moves.some(m=>[15,19,57,70,148,249,127,291].includes(m)),'El Pokémon conoce una MO de generación III. Olvídala dentro del juego antes de preparar la transferencia.');
  const nick=text3Lossless(p.raw.subarray(8,18)),ot=text3Lossless(p.raw.subarray(20,27));
  const out=new Uint8Array(136),personal=T.personal[p.species];require(personal,'No hay datos de especie para convertir con seguridad.');
  set32(out,0,pid);set16(out,8,p.species);set32(out,12,u32(p.raw,4));set32(out,16,u32(g,4));out[0x14]=70;
  const abilityBit=u32(g,40)>>>31;out[0x15]=personal[1+abilityBit];require(out[0x15]>0,'Habilidad de generación III no válida.');
  const ratio=personal[0],gender=ratio===255?2:ratio===254?1:ratio===0?0:(pid&255)<ratio?1:0;
  const form=p.species===201?((((pid&0x3000000)>>>18)|((pid&0x30000)>>>12)|((pid&0x300)>>>6)|(pid&3))%28):0;
  out[0x40]=(gender<<1)|(form<<3);out[0x16]=(p.raw[27]&9)|((p.raw[27]&2)<<1)|((p.raw[27]&4)>>>1);out[0x17]=p.language;
  out.set(g.subarray(24,36),0x18);out.set(g.subarray(12,20),0x28);for(let i=0;i<4;i++)out[0x34+i]=(g[8]>>>(i*2))&3;
  const lang={2:'en',3:'fr',4:'it',5:'de',7:'es'}[p.language];let defaultName=T.species[lang][p.species].toUpperCase();if(p.language===3)defaultName=defaultName.replace(/[ÈÉÊ]/g,'E').replace(/Ï/g,'I');if([2,4,7].includes(p.language))defaultName=defaultName.replace(/’/g,"'");
  set32(out,0x38,((u32(g,40)&0x3FFFFFFF)|(nick===defaultName?0:0x80000000))>>>0);
  let expanded=0;for(let i=0;i<5;i++){const n=(ribbons>>>(i*3))&7;require(n<=4,'Contador de cintas de concurso no válido.');expanded|=((1<<n)-1)<<(i*4);}expanded|=((ribbons>>>15)&0xFFF)<<20;set32(out,0x3C,expanded>>>0);
  const trash=[p.language===2?0x18:p.language===4?0x54:0x74,0x20,0x0D,0x02,0x42,0,0,0,0,0,0,0,p.language===2?0x48:p.language===4?0x84:0xA4,0xA1,0x0C,0x02,0xE0,0xFF];out.set(trash,0x4C);
  encodeName(out.subarray(0x48,0x5E),nick,4);out.set(out.subarray(0x48,0x58),0x68);encodeName(out.subarray(0x68,0x78),ot,4);
  out[0x5F]=version;out.set(dateParts(date),0x7B);set16(out,0x80,55);out[0x82]=g[36];out[0x83]=ball;out[0x84]=p.level|((origins>>>15)<<7);healPP(out,4);return out;
}
function plain4to5(p,plain,date){
  require([1,2,3,4,5,7,8,10,11,12,15].includes(plain[0x5F])&&u16(plain,0x80)<0x4000,'La procedencia del Pokémon no es compatible con una conversión IV → V. Requiere revisión manual.');
  require(!(plain[0x40]&1),'Los eventos con encuentro especial requieren revisión manual antes de pasar a generación V.');
  require((plain[0x40]>>>3)===0||p.species===201,'Esta forma especial necesita normalizarse en el juego de origen antes de pasar a generación V.');
  require(!p.moves.some(m=>[15,19,57,70,127,249,250,431,432].includes(m)),'El Pokémon conoce una MO de generación IV. Olvídala dentro del juego antes de preparar la transferencia.');
  const nick=text4Lossless(plain.subarray(0x48,0x5E)),ot=text4Lossless(plain.subarray(0x68,0x78));
  require(![...nick,...ot].some(c=>invalid45.has(c)),'El texto contiene glifos que cambian al pasar a generación V. Conversión bloqueada para conservar el nombre y entrenador.');
  const out=plain.slice(),ball=Math.max(out[0x83],out[0x86]);require(ball>=1&&ball<=24,'Poké Ball no compatible con la conversión IV → V.');
  out[0x14]=70;out[0x41]=p.pid%25;out.fill(0,0x44,0x48);out.fill(0,0x86,0x88);out[0x83]=ball;
  encodeName(out.subarray(0x48,0x5E),nick,5);encodeName(out.subarray(0x68,0x78),ot,5);set16(out,0x80,30001);out[0x84]=(out[0x84]&128)|p.level;out.set(dateParts(date),0x7B);
  if(p.species===292)out[0x40]=(out[0x40]&~6)|4;healPP(out,5);return out;
}
function compatibleSameDS(p,destination){
  const form=p.form||0;if(!form)return;
  require(!(p.species===172&&form>0),'Pichu picoreja no se puede transferir.');
  require(!(p.species===646&&form>0),'Separa a Kyurem de su fusión dentro del juego antes de transferir.');
  if(['diamond','pearl'].includes(destination.game))require(![479,487,492].includes(p.species),'Diamante y Perla no admiten esa forma. Cámbiala a su forma base dentro del juego de origen.');
  if(['black','white'].includes(destination.game))require(![641,642,645,647].includes(p.species),'Negro y Blanco no admiten esa forma de Negro 2 / Blanco 2. Usa la forma base.');
  require([201,351,386,412,413,422,423,479,487,492,550,585,586,641,642,645,647,649].includes(p.species),'Esta forma temporal o especial necesita revisión manual.');
}
export function convertPokemon(source,target,api,options={}){
  const p=validatePokemon(source,api),route=routeFor(p.generation,target),date=options.date||defaultTransferDate(),notes=[];
  if(p.generation===target)return {raw:p.raw.slice(),pokemon:p,notes,route};
  if(p.generation===1){
    const raw=new Uint8Array(32);raw[0]=p.species;raw.set(p.raw.subarray(7,33),1);const catchRate=p.raw[7],map={25:146,45:83,50:174};raw[1]=map[catchRate]??([90,100,120,135,190,195,220,250,255].includes(catchRate)?173:catchRate);raw[27]=70;raw[31]=p.level;
    notes.push('I → II: se conservan DVs, experiencia, movimientos y nombres; la amistad comienza en 70 y la tasa de captura se convierte en objeto según la Cápsula del Tiempo.');return {raw,pokemon:{...p,generation:2,raw,heldItem:raw[1]},notes,route};
  }
  let plain=p.generation===3?plain3to4(p,api,date):decryptPK45(p.raw);
  if(p.generation===3)notes.push('III → IV: procedencia Parque Compi, fecha '+date+', amistad 70 y PP recuperados; se conservan identidad, experiencia, IVs, EVs, naturaleza, habilidad y cintas.');
  if(target===5){const intermediate=p.generation===3?parsePK45(encryptPK45(plain),4,{},api.levelFrom):p;plain=plain4to5(intermediate,plain,date);notes.push('IV → V: procedencia Pokétransfer, fecha '+date+', amistad 70 y PP recuperados; nombres recodificados sin sustituciones.');}
  const raw=encryptPK45(plain),result=parsePK45(raw,target,{},api.levelFrom);require(result?.valid&&result.species===p.species&&result.pid===p.pid&&result.exp===p.exp,'La verificación de la conversión ha fallado.');
  return {raw,pokemon:{...result,location:p.location},notes,route};
}

export function preparePortableTransfer(destination,selected,targetBox,api,options={}){
  require(destination?.bytes&&api.GAMES[destination.game],'Importa una partida de destino compatible.');require(!destination.demo,'La demo no es una partida jugable.');
  const parsed=api.parseSave(destination.bytes,destination.game,destination.language),capacity=parsed.generation<=2?20:30;
  require(Number.isInteger(targetBox)&&targetBox>=0&&targetBox<parsed.boxes.length,'Caja de destino no válida.');
  require(selected.length>0&&selected.length<=capacity,`Selecciona entre 1 y ${capacity} Pokémon.`);require(parsed.records.every(p=>p.valid),'El destino contiene Pokémon en cuarentena. Revisa el guardado antes de exportar.');
  if(parsed.generation===1&&!(destination.bytes[0x284C]&128))require(targetBox===(destination.bytes[0x284C]&127),'Las cajas de Amarillo aún no están inicializadas. Usa su caja activa o cambia de caja en el juego, guarda y vuelve a importar.');
  const present=new Set(parsed.records.map(identity)),occupied=new Set(parsed.records.filter(p=>p.location==='pc'&&p.box===targetBox).map(p=>p.slot)),slots=Array.from({length:capacity},(_,i)=>i).filter(i=>!occupied.has(i));
  require(slots.length>=selected.length,`La caja tiene ${slots.length} huecos libres y necesitas ${selected.length}. Nunca se sustituye una casilla ocupada.`);
  const placements=[],notes=[],routes=new Set(),date=options.date||defaultTransferDate();
  for(let i=0;i<selected.length;i++){
    const source=selected[i],converted=convertPokemon(source,parsed.generation,api,{...options,date});
    if(parsed.generation<=2)require((source.textLanguage||'es')===(destination.language||'es'),'Para preservar los nombres, las copias Game Boy requieren el mismo grupo de idioma en origen y destino.');
    if(source.generation===parsed.generation&&parsed.generation>=4)compatibleSameDS(converted.pokemon,destination);
    const id=identity(converted.pokemon);require(!present.has(id),`${source.name} ya existe en el destino o está repetido. Copia bloqueada.`);present.add(id);routes.add(converted.route);notes.push(...converted.notes);
    placements.push({pokemon:source,raw:converted.raw,expected:converted.pokemon,box:targetBox,slot:slots[i],conversion:converted.notes});
  }
  return {parsed,placements,date,capacity,route:[...routes].join(' · '),notes:[...new Set(notes)]};
}

export function buildPortableTransfer(destination,selected,targetBox,api,options={}){
  const plan=preparePortableTransfer(destination,selected,targetBox,api,options),{parsed,placements}=plan,output=destination.bytes.slice(),allowed=new Uint8Array(output.length);
  const permit=(o,n)=>{require(o>=0&&o+n<=output.length,'Rango de escritura inválido.');allowed.fill(1,o,o+n);};
  const patch=(o,data)=>{permit(o,data.length);output.set(data,o);};
  const patch16=(o,n)=>{permit(o,2);set16(output,o,n);},patch32=(o,n)=>{permit(o,4);set32(output,o,n);};
  const complement=bytes=>(~bytes.reduce((a,b)=>(a+b)&255,0))&255;
  if(parsed.generation<=2){
    const isYellow=parsed.generation===1,size=isYellow?33:32,payload=isYellow?0x462:0x44E,current=destination.bytes[isYellow?0x284C:0x2700]&(isYellow?127:255),initialized=!isYellow||!!(destination.bytes[0x284C]&128),bank=(isYellow?(targetBox<6?0x4000:0x6000):(targetBox<7?0x4000:0x6000)),bankOffset=bank+(targetBox%(isYellow?6:7))*(isYellow?0x462:0x450),activeOffset=isYellow?0x30C0:0x2D10;
    const sourceOffset=isYellow&&current===targetBox?activeOffset:bankOffset,list=output.slice(sourceOffset,sourceOffset+payload),count=list[0];require(count+placements.length<=20,'La lista Game Boy no tiene espacio suficiente.');
    for(let i=0;i<placements.length;i++){
      const p=placements[i],slot=count+i;require(p.slot===slot,'La lista Game Boy no es contigua.');list.set(p.raw,22+slot*size);list.set(p.pokemon.otRaw,22+20*size+slot*11);list.set(p.pokemon.nicknameRaw,22+20*size+220+slot*11);list[1+slot]=isYellow?p.raw[0]:p.expected.species;list[2+slot]=255;
    }list[0]=count+placements.length;
    if(initialized)patch(bankOffset,list);
    if(current===targetBox)patch(activeOffset,list);
    if(isYellow){
      if(initialized){patch(bank+0x1A4C,new Uint8Array([complement(output.subarray(bank,bank+0x1A4C))]));for(let i=0;i<6;i++)patch(bank+0x1A4D+i,new Uint8Array([complement(output.subarray(bank+i*0x462,bank+(i+1)*0x462))]));}
      patch(0x3523,new Uint8Array([complement(output.subarray(0x2598,0x3523))]));
    }
    // Crystal PC payloads are outside its main checksum. Preserve the backup
    // main bytes and its separate checksum together, rather than desynchronizing them.
  }else if(parsed.generation===4){
    const info=parsed.writeInfo;for(const p of placements)patch(info.storageBase+info.boxStart+p.box*info.stride+p.slot*136,p.raw);
    if(info.hgss){const o=info.storageBase+0x12004;patch32(o,(u32(output,o)|(1<<targetBox))>>>0);}
    const o=info.storageBase;patch16(o+info.storageSize-2,crc16CCITT(output.subarray(o,o+info.storageSize-info.footer)));
  }else{
    const blocks=F[parsed.writeInfo.family];for(const p of placements)patch(0x400+p.box*4096+p.slot*136,p.raw);
    for(const index of [targetBox+1,blocks.length-1]){const [o,length,checksum,mirror]=blocks[index],crc=crc16CCITT(output.subarray(o,o+length));patch16(checksum,crc);patch16(mirror,crc);}
  }
  const checked=api.parseSave(output,destination.game,destination.language);require(checked.records.length===parsed.records.length+selected.length,'El número de Pokémon tras la escritura no coincide.');
  for(const p of placements){const found=checked.records.find(r=>r.location==='pc'&&r.box===p.box&&r.slot===p.slot);require(found?.valid&&equal(found.raw,p.raw),'La comprobación posterior del Pokémon ha fallado.');if(parsed.generation<=2)require(equal(found.otRaw,p.pokemon.otRaw)&&equal(found.nicknameRaw,p.pokemon.nicknameRaw),'Los nombres Game Boy no coinciden con el original.');}
  for(const old of parsed.records){const found=checked.records.find(r=>r.location===old.location&&r.box===old.box&&r.slot===old.slot);require(found&&equal(found.raw,old.raw),'Se ha alterado un Pokémon que ya estaba en el destino.');}
  for(let i=0;i<output.length;i++)require(output[i]===destination.bytes[i]||allowed[i],'Se detectó un cambio fuera de los rangos autorizados.');
  return {...plan,bytes:output,checked,integritySummary:parsed.generation<=2?'Listas y checksums comprobados':parsed.generation===4?'CRC general y de PC comprobados':'Bloques CRC y espejos comprobados'};
}
