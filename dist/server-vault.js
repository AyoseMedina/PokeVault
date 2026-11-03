// Server-side bank adapter (docs/SERVER_VAULT.md). Same interface as the
// IndexedDB backend: read/write/dump/close. Parsing and writing of saves stay
// in the browser; the server stores encrypted state revisions and originals.
import { sha256 } from './core.js';
import { validateState, shareBytes } from './vault.js';

const HASH=/^[a-f0-9]{64}$/;
export class VaultConflict extends Error {}

export function serverBackend(access){
  const known=new Set();
  async function call(path,{method='GET',body,headers={},raw=false}={}){
    let response;
    try{
      response=await fetch('/api/vault'+path,{method,credentials:'same-origin',cache:'no-store',
        headers:{...(method==='GET'?{}:{'X-CSRF-Token':access.csrf()}),...headers},body});
    }catch{throw new Error('Sin conexión con el servidor. No se ha guardado nada; vuelve a intentarlo.');}
    if(response.status===401){access.unauthorized?.();throw new Error('Tu sesión ha terminado. No se ha guardado el cambio; vuelve a entrar e inténtalo de nuevo.');}
    if(!response.ok){
      let detail={};try{detail=await response.json();}catch{}
      const message=detail.message||`El servidor rechazó la operación (${response.status}).`;
      if(response.status===409&&detail.error==='conflict')throw new VaultConflict(message);
      throw new Error(message);
    }
    return raw?new Uint8Array(await response.arrayBuffer()):response.json();
  }
  async function blob(hash){
    const bytes=await call(`/blob/${hash}`,{raw:true});
    // The browser verifies every original it receives, independently of the server.
    if(await sha256(bytes)!==hash)throw new Error('Un original descargado no coincide con su SHA-256. No se usará.');
    return bytes;
  }
  async function hydrate(record){
    const state=record.state;if(!state)return null;
    if(state.schema!==2||!Array.isArray(state.saves)||!Array.isArray(state.backups))throw new Error('Estructura del banco del servidor no compatible.');
    const groups=new Map();
    for(const item of [...state.saves,...state.backups]){if(!HASH.test(item?.hash||''))throw new Error('Referencia de original no válida.');if(!groups.has(item.hash))groups.set(item.hash,[]);groups.get(item.hash).push(item);}
    const hashes=[...groups.keys()];
    for(let i=0;i<hashes.length;i+=6)await Promise.all(hashes.slice(i,i+6).map(async hash=>{const bytes=await blob(hash);for(const item of groups.get(hash))item.bytes=bytes;known.add(hash);}));
    return {...state,schema:1,revision:record.revision};
  }
  return {
    kind:'server',
    async read(){return hydrate(await call('/'));},
    async write(value,revision,{onlyEmpty=false,reason=''}={}){
      validateState(value);shareBytes(value);
      const uploads=new Map();
      for(const item of [...value.saves,...value.backups])if(!known.has(item.hash)&&!uploads.has(item.hash))uploads.set(item.hash,item.bytes);
      for(const [hash,bytes] of uploads){
        if(await sha256(bytes)!==hash)throw new Error('Un original cambió en memoria. No se subirá.');
        await call(`/blob/${hash}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:bytes});known.add(hash);
      }
      const strip=items=>items.map(({bytes,...item})=>item);
      const {revision:_r,...meta}=value;
      const state={...structuredClone({...meta,saves:[],backups:[]}),schema:2,saves:strip(value.saves),backups:strip(value.backups)};
      const result=await call('/',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':String(revision)},body:JSON.stringify({state,onlyEmpty,reason})});
      return result.revision;
    },
    async dump(){return {format:'pokevault-server-recovery',...await call('/')};},
    history(){return call('/history').then(r=>r.revisions);},
    restore(target,revision){return call(`/restore/${target}`,{method:'POST',headers:{'If-Match':String(revision)}}).then(r=>r.revision);},
    close(){},
  };
}
