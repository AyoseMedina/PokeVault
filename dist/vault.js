// IndexedDB persistence. Save bytes are immutable and stored once per SHA-256.
export function validateState(value) {
  if (!value || value.schema !== 1) throw new Error('Esquema de banco desconocido. Escritura bloqueada; conserva la recuperación.');
  if (value.revision !== undefined && (!Number.isSafeInteger(value.revision) || value.revision < 0)) throw new Error('Revisión de banco no válida.');
  for (const key of ['saves','boxes','favorites','snapshots','backups','plans']) if (!Array.isArray(value[key])) throw new Error(`Banco incompleto: ${key}.`);
  if (!value.notes || typeof value.notes !== 'object' || Array.isArray(value.notes)) throw new Error('Notas no válidas.');
  const ids=new Set();
  for(const save of value.saves) {
    if (!save || typeof save.id !== 'string' || ids.has(save.id) || typeof save.game !== 'string' || !(save.bytes instanceof Uint8Array)) throw new Error('Registro de partida no compatible.');
    ids.add(save.id);
  }
  for(const box of value.boxes) if(!box || typeof box.id!=='string' || typeof box.name!=='string' || !Array.isArray(box.slots) || box.slots.length!==30) throw new Error('Caja no compatible.');
  return value;
}
export function cloneVault(value) {
  const {saves,backups,...metadata}=value;
  return {...structuredClone(metadata),saves:saves.map(s=>({...s})),backups:backups.map(b=>({...b}))};
}
const sameBytes=(a,b)=>a instanceof Uint8Array&&b instanceof Uint8Array&&a.length===b.length&&a.every((value,i)=>value===b[i]);
function shareBytes(value){
  const originals=new Map();
  for(const item of [...value.saves,...value.backups]){
    const previous=originals.get(item.hash);
    if(previous&&previous!==item.bytes&&!sameBytes(previous,item.bytes))throw new Error('Un hash identifica bytes diferentes. Conserva una recuperación; no se fusionarán los originales.');
    if(previous)item.bytes=previous;else originals.set(item.hash,item.bytes);
  }
}
export function deduplicateBackups(backups) {
  const unique=new Map();
  for(const backup of backups) {
    const previous=unique.get(backup.hash);
    if(previous) {
      if(previous.bytes!==backup.bytes&&!sameBytes(previous.bytes,backup.bytes))throw new Error('Respaldos con el mismo hash contienen bytes diferentes. No se eliminarán.');
      // Retain every reason/date without retaining another byte buffer.
      const events=[...(previous.events?.length?previous.events:[{at:previous.at,reason:previous.reason}]),...(backup.events?.length?backup.events:[{at:backup.at,reason:backup.reason}])];
      previous.events=[...new Map(events.map(e=>[JSON.stringify([e.at,e.reason]),e])).values()];
      previous.reason=backup.reason;previous.at=backup.at;
    } else unique.set(backup.hash,{...backup});
  }
  return [...unique.values()];
}
export function openVault(onVersionChange=()=>{}) {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('pokevault-r36s-v1',2);let blocked=false;
    request.onupgradeneeded=()=>{for(const name of ['vault','blobs'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name);};
    request.onblocked=()=>{blocked=true;reject(new Error('Cierra las otras pestañas de PokéVault y recarga para actualizar el almacenamiento.'));};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();onVersionChange();};resolve(db);};
  });
}
export function readVault(db,{raw=false}={}) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['vault','blobs']);const request=tx.objectStore('vault').get('state');let value,error;
    request.onsuccess=()=>{
      value=request.result;if(!value || raw || value.schema!==2)return;
      if(!Array.isArray(value.saves)||!Array.isArray(value.backups)||!Number.isSafeInteger(value.revision)||value.revision<0){error=new Error('Estructura o revisión de banco no compatible.');return;}
      value={...value,schema:1};
      const references=new Map();
      for(const item of [...value.saves,...value.backups]) {
        if(!item||typeof item.hash!=='string'){error=new Error('Referencia de original no válida.');continue;}
        if(!references.has(item.hash))references.set(item.hash,[]);references.get(item.hash).push(item);
      }
      for(const [hash,items] of references){
        const blob=tx.objectStore('blobs').get(hash);
        blob.onsuccess=()=>{if(!(blob.result instanceof Uint8Array))error=new Error('Faltan bytes de un original. No se puede escribir en este banco.');else for(const item of items)item.bytes=blob.result;};
      }
    };
    tx.oncomplete=()=>error?reject(error):resolve(value);tx.onerror=()=>reject(tx.error);
  });
}
export function dumpVault(db){
  return new Promise((resolve,reject)=>{
    const result={format:'pokevault-raw-recovery',version:db.version,stores:{}},tx=db.transaction([...db.objectStoreNames]);
    for(const name of db.objectStoreNames){const entries=result.stores[name]=[];const request=tx.objectStore(name).openCursor();request.onsuccess=()=>{const c=request.result;if(c){entries.push({key:c.key,value:c.value});c.continue();}};}
    tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);
  });
}
export function writeVault(db,value,revision,{onlyEmpty=false}={}) {
  validateState(value);
  shareBytes(value);
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['vault','blobs'],'readwrite'),store=tx.objectStore('vault'),blobs=tx.objectStore('blobs');let error;
    const request=store.get('state');
    request.onsuccess=()=>{
      try {
      const old=request.result;
      if(old && (![1,2].includes(old.schema) || ((old.schema===2||old.revision!==undefined) && (!Number.isSafeInteger(old.revision)||old.revision<0))))error=new Error('Esquema o revisión no compatibles. Escritura bloqueada.');
      else if((old?.revision??0)!==revision)error=new Error('El banco ha cambiado en otra pestaña. Recarga antes de continuar.');
      else if(onlyEmpty && old?.saves?.length)error=new Error('La demo no puede sustituir un banco existente. Sal de la demo y recarga.');
      if(error){tx.abort();return;}
      const next={...value,schema:2,revision:revision+1};const hashes=new Set();
      for(const key of ['saves','backups'])next[key]=value[key].map(({bytes,...item})=>{
        if(!/^[a-f0-9]{64}$/.test(item.hash)||!(bytes instanceof Uint8Array)){error=new Error('Original sin bytes o hash válido.');return item;}
        if(!hashes.has(item.hash)){hashes.add(item.hash);const existing=blobs.getKey(item.hash);existing.onsuccess=()=>{if(existing.result===undefined)blobs.put(bytes,item.hash);};}
        return item;
      });
      if(error){tx.abort();return;}
      // Only explicitly removed/unreferenced originals are collected, atomically.
      const cursor=blobs.openKeyCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(!hashes.has(c.key))blobs.delete(c.key);c.continue();}};
      store.put(next,'state');
      } catch(e) {error=e;tx.abort();}
    };
    tx.oncomplete=()=>resolve(revision+1);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error||new Error('Operación cancelada.'));
  });
}
