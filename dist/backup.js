import { GAMES, parseSave, sha256 } from './core.js';
import { consumedLedger } from './consumed.js';
export const LANGUAGES=['es','en','fr','it','de'];
const fail=message=>{throw new Error(message);};
const time=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const id=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value);
function decode(text){if(typeof text!=='string'||text.length>750000)fail('Bytes de respaldo no válidos.');const raw=atob(text);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export async function decodeBackup(backup,existing=[]) {
  if(!backup||backup.format!=='pokevault-backup'||![1,2].includes(backup.schema)||!Array.isArray(backup.saves)||backup.saves.length>100)fail('Respaldo .pvault no compatible.');
  const saves=[],keys=new Set(),ids=new Set(),unreadable=new Set(),binary=new Map();
  const load=async item=>{
    if(!/^[a-f0-9]{64}$/.test(item.hash))fail('Hash de respaldo no válido.');
    const bytes=backup.schema===2?(binary.get(item.hash)||decode(backup.blobs?.[item.hash])):decode(item.data);
    if(await sha256(bytes)!==item.hash)fail('SHA-256 incorrecto en el respaldo.');binary.set(item.hash,bytes);return bytes;
  };
  for(const s of backup.saves){
    if(!id(s.id)||ids.has(s.id)||!GAMES[s.game])fail('Partida o ID de respaldo no válido.');ids.add(s.id);
    const language=s.language===undefined&&backup.schema===1?'es':s.language;
    if(!LANGUAGES.includes(language))fail('Idioma no admitido en el respaldo.');
    if(s.gameLanguage!==undefined&&!LANGUAGES.includes(s.gameLanguage))fail('Idioma de juego no admitido en el respaldo.');
    const at=s.at??backup.createdAt;if(!time(at))fail('Fecha de partida no válida.');
    if(saves.some(item=>item.hash===s.hash))fail('Original repetido dentro del respaldo.');
    const bytes=await load(s);
    try {parseSave(bytes,s.game,language).records.forEach(r=>keys.add(`${s.id}/${r.location}/${r.box}/${r.slot}`));}
    catch {if(backup.schema===1)throw new Error('Guardado no legible en respaldo antiguo. Conserva el archivo original.');unreadable.add(s.id);}
    saves.push({id:s.id,game:s.game,language,...(s.gameLanguage?{gameLanguage:s.gameLanguage}:{}),at,name:String(s.name||'partida.sav'),hash:s.hash,bytes,...(s.consumedBy?{consumedBy:s.consumedBy,consumedAt:s.consumedAt}:{})});
  }
  if(existing.length+new Set(saves.filter(s=>!existing.some(e=>e.hash===s.hash)).map(s=>s.hash)).size>100)fail('La fusión superaría las 100 partidas. Retira una versión antigua tras respaldarla.');
  const keyValid=k=>keys.has(k)||(typeof k==='string'&&/^([\w-]+)\/(pc|party)\/-?\d+\/\d+$/.test(k)&&unreadable.has(k.split('/')[0]));
  function metadata(data){
    if(!Array.isArray(data.boxes)||data.boxes.length>500)fail('Cajas de respaldo no válidas.');
    const assigned=new Set(),boxIds=new Set();
    const boxes=data.boxes.map(b=>{
      if(!id(b.id)||boxIds.has(b.id)||typeof b.name!=='string'||b.name.length>100||!Array.isArray(b.slots)||b.slots.length!==30)fail('Caja de respaldo inválida.');boxIds.add(b.id);
      for(const k of b.slots)if(k!==null){if(!keyValid(k)||assigned.has(k))fail('Referencia Pokémon inválida o repetida.');assigned.add(k);}
      return {id:b.id,name:b.name,slots:[...b.slots]};
    });
    if(!Array.isArray(data.favorites)||data.favorites.some(k=>!keyValid(k))||!data.notes||typeof data.notes!=='object'||Array.isArray(data.notes))fail('Favoritos o notas no válidos.');
    const notes={};for(const [k,v] of Object.entries(data.notes)){if(!keyValid(k)||typeof v!=='string'||v.length>1000)fail('Nota de respaldo no válida.');notes[k]=v;}
    return {boxes,favorites:[...new Set(data.favorites)],notes};
  }
  const meta=metadata(backup),backups=[];
  for(const b of backup.schema===2?backup.backups||[]:[]){
    if(!id(b.id)||!time(b.at)||typeof b.reason!=='string')fail('Respaldo original no válido.');
    const events=b.events||[];if(!Array.isArray(events)||events.some(e=>!time(e.at)||typeof e.reason!=='string'))fail('Historial de respaldo no válido.');
    backups.push({id:b.id,saveId:ids.has(b.saveId)?b.saveId:null,name:String(b.name||'original.sav').slice(0,120),hash:b.hash,bytes:await load(b),at:b.at,reason:b.reason,events});
  }
  const plans=backup.schema===2?backup.plans||[]:[];
  if(!Array.isArray(plans)||plans.some(p=>!id(p.id)||!time(p.at)||!Number.isSafeInteger(p.count)||p.count<0||typeof p.destination!=='string'||!['export','plan'].includes(p.type)))fail('Historial de preparaciones no válido.');
  const snapshots=[];
  for(const snap of backup.schema===2?backup.snapshots||[]:[]){
    if(!id(snap.id)||!time(snap.at)||typeof snap.reason!=='string')fail('Punto de restauración no válido.');
    if(!Array.isArray(snap.plans||[])||(snap.plans||[]).some(p=>!id(p.id)||!time(p.at)||!Number.isSafeInteger(p.count)||typeof p.destination!=='string'||!['export','plan'].includes(p.type)))fail('Historial del punto de restauración no válido.');
    snapshots.push({id:snap.id,at:snap.at,reason:snap.reason,...metadata(snap),plans:structuredClone(snap.plans||[])});
  }
  if(snapshots.length>25)fail('Demasiados puntos de restauración.');
  const consumed=consumedLedger({saves,consumed:backup.consumed});
  for(const save of saves)if(consumed[save.hash])Object.assign(save,consumed[save.hash]);
  return {saves,...meta,backups,plans:structuredClone(plans),snapshots,unreadable,consumed};
}
