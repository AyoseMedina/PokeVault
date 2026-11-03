import { GAMES,parseSave,buildTransfer,bytesEqual,checksum32,put16,put32 } from './core.js';
import { encryptPK45,crc16CCITT } from './formats.js';
import { FORMAT_DATA as F } from './formats-data.js';
import {evolveArrival,setHeldItem,tradeFriendship} from './move-entity.js';
import {registerDex,verifyDex} from './move-dex.js';
import {entityIdentity} from './transfer.js';
import {itemPlan,returnItemToBag} from './move-items.js';
export const MOVE_POLICY='pokevault-move-v1';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const u32=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,true);
const loc=p=>`${p.location}/${p.box}/${p.slot}`;
const equalEntity=(a,b)=>bytesEqual(a.raw,b.raw)&&(!a.otRaw||bytesEqual(a.otRaw,b.otRaw)&&bytesEqual(a.nicknameRaw,b.nicknameRaw));
export function exactSaveName(name){check(typeof name==='string'&&name.length>0&&!/[\/\\\x00-\x1f\x7f]/.test(name)&&!name.includes('..')&&/\.(sav|srm|dsv)$/i.test(name),'Nombre de guardado no seguro o extensión no compatible. No se renombrará silenciosamente.');return name;}
export function resultPath(save){return `copiar-a-la-SD/${['','gb','gbc','gba','nds','nds'][GAMES[save.game].generation]}/${exactSaveName(save.name)}`;}

// Layout/empty-slot sources (pinned URLs): docs/MOVE_IMPLEMENTATION.md.
// One writer records exact byte ranges and refreshes only affected checksums.
export function saveWriter(save){
  const parsed=parseSave(save.bytes,save.game,save.language),bytes=save.bytes.slice(),allowed=new Uint8Array(bytes.length),sectors=new Set(),boxes=new Set(),blocks=new Set();let general=false;
  function patch(offset,data){check(Number.isInteger(offset)&&offset>=0&&offset+data.length<=bytes.length,'Rango de escritura inválido.');allowed.fill(1,offset,offset+data.length);bytes.set(data,offset);}
  const word=(o,n)=>{const b=new Uint8Array(2);put16(b,0,n);patch(o,b);};
  const dword=(o,n)=>{const b=new Uint8Array(4);put32(b,0,n);patch(o,b);};
  function gba(logical,data,first=5){for(let k=0;k<data.length;k++){const id=first+Math.floor((logical+k)/0xF80);check(id<=13,'Rango GBA inválido.');patch(parsed.active.sectors[id]+(logical+k)%0xF80,data.subarray(k,k+1));sectors.add(id);}}
  function slot(box,slot,data){
    boxes.add(box);
    if(parsed.generation===3)gba(4+(box*30+slot)*80,data);
    else if(parsed.generation===4){const i=parsed.writeInfo;patch(i.storageBase+i.boxStart+box*i.stride+slot*136,data);}
    else if(parsed.generation===5){patch(0x400+box*4096+slot*136,data);blocks.add(box+1);}
    else throw new Error('Las listas GB se escriben con compactación.');
  }
  function entity(p){
    if(parsed.generation>=3){slot(p.box,p.slot,p.raw);return;}
    const yellow=parsed.generation===1,size=yellow?33:32,current=bytes[yellow?0x284C:0x2700]&(yellow?127:255),bank=(p.box<(yellow?6:7)?0x4000:0x6000)+(p.box%(yellow?6:7))*(yellow?0x462:0x450),offsets=[];
    if(!yellow||(bytes[0x284C]&128))offsets.push(bank);
    if(p.box===current)offsets.push(yellow?0x30C0:0x2D10);
    for(const o of offsets){patch(o+1+p.slot,Uint8Array.of(p.raw[0]));patch(o+22+p.slot*size,p.raw);patch(o+22+20*size+220+p.slot*11,p.nicknameRaw);}
    boxes.add(p.box);
  }
  function finish(){
    if(parsed.generation===1){for(const bank of [0x4000,0x6000])if([...boxes].some(b=>(b<6?0x4000:0x6000)===bank)&&(bytes[0x284C]&128)){
      const complement=b=>(~b.reduce((a,n)=>(a+n)&255,0))&255;
      patch(bank+0x1A4C,Uint8Array.of(complement(bytes.subarray(bank,bank+0x1A4C))));for(let i=0;i<6;i++)patch(bank+0x1A4D+i,Uint8Array.of(complement(bytes.subarray(bank+i*0x462,bank+(i+1)*0x462))));
    }patch(0x3523,Uint8Array.of((~bytes.subarray(0x2598,0x3523).reduce((a,n)=>(a+n)&255,0))&255));}
    if(parsed.generation===2&&general){for(const [start,end,crc] of [[0x2009,0x2B83,0x2D0D],[0x1209,0x1D83,0x1F0D]])word(crc,bytes.subarray(start,end).reduce((a,n)=>(a+n)&65535,0));}
    if(parsed.generation===3)for(const id of sectors){const base=parsed.active.sectors[id],rs=['ruby','sapphire'].includes(save.game),sizes=[rs?0x890:save.game==='emerald'?0xF2C:0xF24,0xF80,0xF80,0xF80,rs?0xC40:save.game==='emerald'?0xF08:0xEE8,...Array(8).fill(0xF80),0x7D0];word(base+0xFF6,checksum32(bytes.subarray(base,base+0xF80),sizes[id]));}
    if(parsed.generation===4){const i=parsed.writeInfo;if(boxes.size){if(i.hgss)dword(i.storageBase+0x12004,(u32(bytes,i.storageBase+0x12004)|[...boxes].reduce((n,b)=>n|(1<<b),0))>>>0);word(i.storageBase+i.storageSize-2,crc16CCITT(bytes.subarray(i.storageBase,i.storageBase+i.storageSize-i.footer)));}if(general)word(i.generalBase+i.generalSize-2,crc16CCITT(bytes.subarray(i.generalBase,i.generalBase+i.generalSize-i.footer)));}
    if(parsed.generation===5&&blocks.size){const table=F[parsed.writeInfo.family];for(const index of [...blocks,table.length-1]){const [o,n,c,m]=table[index],crc=crc16CCITT(bytes.subarray(o,o+n));word(c,crc);word(m,crc);}}
    for(let i=0;i<bytes.length;i++)check(bytes[i]===save.bytes[i]||allowed[i],'Cambio fuera de rangos autorizados.');
    return {bytes,checked:parseSave(bytes,save.game,save.language),allowed};
  }
  return {parsed,bytes,patch,word,dword,gba,slot,entity,boxes,blocks,sectors,markGeneral:()=>{general=true;},finish};
}
export function removeSelected(save,selected){
  check(!save.consumedBy,'Versión consumida: importa el resultado nuevo.');const w=saveWriter(save),before=w.parsed,keys=new Set();
  for(const p of selected){const original=before.records.find(r=>loc(r)===loc(p));check(p.location==='pc'&&original?.valid&&equalEntity(original,p),'El Pokémon a retirar no coincide con su original.');check(!keys.has(loc(p)),'Selección repetida.');keys.add(loc(p));}
  check(before.records.every(p=>p.valid),'El origen contiene Pokémon en cuarentena.');
  if(before.generation<=2){
    const yellow=before.generation===1,cap=20,size=yellow?33:32,payload=yellow?0x462:0x44E,current=save.bytes[yellow?0x284C:0x2700]&(yellow?127:255),initialized=!yellow||!!(save.bytes[0x284C]&128),active=yellow?0x30C0:0x2D10;
    for(const box of new Set(selected.map(p=>p.box))){
      const bank=(box<(yellow?6:7)?0x4000:0x6000)+(box%(yellow?6:7))*(yellow?0x462:0x450),offset=yellow&&box===current?active:bank,list=save.bytes.slice(offset,offset+payload),old=before.records.filter(p=>p.location==='pc'&&p.box===box),kept=old.filter(p=>!keys.has(loc(p)));
      check(old.length===list[0],'Lista GB no contigua.');list[0]=kept.length;list[1+kept.length]=255;
      kept.forEach((p,i)=>{list[1+i]=yellow?p.raw[0]:p.species;list.set(p.raw,22+i*size);list.set(p.otRaw,22+cap*size+i*11);list.set(p.nicknameRaw,22+cap*size+cap*11+i*11);});
      // Unused tail bytes remain intact, matching count-based native GB lists.
      if(initialized)w.patch(bank,list);if(box===current)w.patch(active,list);w.boxes.add(box);
    }
  }else for(const p of selected)w.slot(p.box,p.slot,before.generation===3?new Uint8Array(80):encryptPK45(new Uint8Array(136)));
  const result=w.finish(),remaining=before.records.filter(p=>!keys.has(loc(p)));check(result.checked.records.length===remaining.length,'Recuento incorrecto tras retirar Pokémon.');
  for(const old of remaining){const slot=before.generation<=2&&old.location==='pc'?old.slot-selected.filter(p=>p.box===old.box&&p.slot<old.slot).length:old.slot;const found=result.checked.records.find(p=>p.location===old.location&&p.box===old.box&&p.slot===slot);check(found&&equalEntity(old,found),'Otro Pokémon del origen cambió.');}
  return result;
}
export function buildMove(destination,selected,targetBox,sources,options={}){
  check(destination&&!destination.consumedBy&&!destination.demo,'Destino consumido, de demo o no disponible.');check(selected.length>0,'Selecciona Pokémon del PC.');
  const sourceMap=new Map(sources.map(s=>[s.id,s])),groups=new Map();
  selected=selected.map(p=>({...p,game:sourceMap.get(p.saveId)?.game}));
  for(const p of selected){const s=sourceMap.get(p.saveId);check(s&&!s.demo&&!s.consumedBy,'Origen consumido, de demo o no disponible.');check(s.id!==destination.id&&s.hash!==destination.hash&&!bytesEqual(s.bytes,destination.bytes),'Origen y destino son la misma partida. Usa el juego para organizarla.');if(!groups.has(s.id))groups.set(s.id,[]);groups.get(s.id).push(p);}
  const all=[destination,...[...groups.keys()].map(id=>sourceMap.get(id))],paths=all.map(resultPath),canonical=paths.map(p=>p.normalize('NFC').toLowerCase());check(new Set(canonical).size===paths.length,'Dos archivos de la misma carpeta comparten nombre. No se renombrarán.');
  // Validate items separately, then feed isolated item-free entities to the
  // existing conversion writer. Original entities remain untouched.
  const targetGeneration=GAMES[destination.game].generation;
  const itemPlans=selected.map(p=>itemPlan(p,destination.game));
  const inputs=selected.map(p=>p.heldItem?setHeldItem(p,0):p);
  const result=buildTransfer(destination,inputs,targetBox,options),w=saveWriter({...destination,bytes:result.bytes}),dexSpecies=[],notes=[];
  const identities=new Set(parseSave(destination.bytes,destination.game,destination.language).records.map(entityIdentity));
  for(let index=0;index<result.placements.length;index++){
    const placement=result.placements[index],source=selected[index];placement.pokemon=source;
    let received=result.checked.records.find(p=>p.location==='pc'&&p.box===placement.box&&p.slot===placement.slot);
    const items=itemPlans[index];if(items.targetItem!==null&&targetGeneration>=2)received=setHeldItem(received,items.targetItem);notes.push(...items.notes);placement.itemChanges=items;
    const friendship=tradeFriendship(received,source.generation);received=friendship.pokemon;notes.push(...friendship.notes);
    registerDex(w,received);dexSpecies.push(received.species);
    const language=targetGeneration>=4?result.checked.gameLanguage:targetGeneration===3?destination.gameLanguage:destination.language;
    const evolved=evolveArrival(received,source.generation,destination.game,language),after=evolved.pokemon;
    check(!identities.has(entityIdentity(after)),'El Pokémon evolucionado ya existe en el destino.');identities.add(entityIdentity(after));
    if(evolved.evolution){registerDex(w,after);dexSpecies.push(after.species);}
    w.entity(after);placement.raw=after.raw;placement.resultSpecies=after.species;placement.evolution=evolved.evolution||null;placement.conversion=[...(placement.conversion||[]).map(n=>n.replace('La Pokédex del destino no se modifica.','')),...items.notes,...friendship.notes,...evolved.notes];notes.push(...evolved.notes);
  }
  const finished=w.finish();verifyDex(parseSave(destination.bytes,destination.game,destination.language).pokedex,finished.checked.pokedex,dexSpecies);
  for(const p of parseSave(destination.bytes,destination.game,destination.language).records){check(equalEntity(p,finished.checked.records.find(r=>loc(r)===loc(p))),'Otro Pokémon del destino cambió.');}
  for(const p of result.placements){check(bytesEqual(p.raw,finished.checked.records.find(r=>r.location==='pc'&&r.box===p.box&&r.slot===p.slot)?.raw),'El Pokémon recibido difiere de lo revisado.');}
  result.bytes=finished.bytes;result.checked=finished.checked;
  const outputs=[{save:destination,bytes:result.bytes,role:'destination'}];
  for(const [id,picks] of groups){
    const save=sourceMap.get(id),removed=removeSelected(save,picks),writer=saveWriter({...save,bytes:removed.bytes});
    for(let i=0;i<selected.length;i++)if(selected[i].saveId===id&&itemPlans[i].returnItem)notes.push(returnItemToBag(writer,itemPlans[i].returnItem).notes);
    const result=writer.finish();for(const p of removed.checked.records)check(equalEntity(p,result.checked.records.find(r=>loc(r)===loc(p))),'Otro Pokémon del origen cambió al devolver objetos.');
    verifyDex(removed.checked.pokedex,result.checked.pokedex,[]);outputs.push({save,bytes:result.bytes,role:'source'});
  }
  return {...result,policy:MOVE_POLICY,outputs,notes:[...(result.notes||[]).filter(n=>!n.startsWith('Copia')).map(n=>n.replace('La Pokédex del destino no se modifica.','')),...notes,'Pokédex del destino: especies recibidas y evolucionadas registradas como vistas/capturadas.','Movimiento: se retirarán los Pokémon seleccionados de los nuevos guardados de origen. Instala todos los resultados o ninguno.']};
}
