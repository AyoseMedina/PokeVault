// Hash ledger survives retirement of a save. Old schema-1 banks have no ledger.
export function consumedLedger(state){
  const ledger={...(state.consumed||{})};
  for(const s of state.saves||[])if(s.consumedBy)ledger[s.hash]={consumedBy:s.consumedBy,consumedAt:s.consumedAt};
  for(const [hash,entry] of Object.entries(ledger))if(!/^[a-f0-9]{64}$/.test(hash)||!entry||typeof entry.consumedBy!=='string'||!Number.isFinite(Date.parse(entry.consumedAt)))throw new Error('Registro de versiones consumidas inválido.');
  return ledger;
}
export function assertUnconsumed(state,hash){if(consumedLedger(state)[hash])throw new Error('Versión consumida: no puede reutilizarse ni importarse desde originales/. Importa el resultado o anula la exportación si no la instalaste.');}
export function mergeConsumed(state,incoming){
  const own=consumedLedger(state),other=consumedLedger(incoming);
  // Restoring old metadata can never undo a consumption. Conflicting claims
  // stay blocked and cannot be annulled as though they were one export.
  for(const [hash,entry] of Object.entries(other)){
    if(own[hash]&&own[hash].consumedBy!==entry.consumedBy)throw new Error('Versiones consumidas por exportaciones diferentes. No se fusionará el respaldo.');
    own[hash]=entry;
  }
  state.consumed=own;
  for(const s of state.saves)if(own[s.hash])Object.assign(s,own[s.hash]);
}
export function consumeVersions(state,saves,id,at){
  for(const s of saves){assertUnconsumed(state,s.hash);if(!state.saves.some(x=>x.id===s.id&&x.hash===s.hash))throw new Error('Una versión ya no está en el banco.');}
  state.consumed=consumedLedger(state);
  for(const s of saves){const entry={consumedBy:id,consumedAt:at};state.consumed[s.hash]=entry;Object.assign(state.saves.find(x=>x.id===s.id),entry);}
}
export function annulExport(state,id,confirmed,at){
  if(confirmed!==true)throw new Error('Confirma que no has instalado ninguno de los resultados.');
  const plan=state.plans.find(p=>p.id===id&&p.type==='export');
  if(!plan||plan.cancelledAt)throw new Error('Exportación no disponible para anular.');
  state.consumed=consumedLedger(state);
  const entries=Object.entries(state.consumed).filter(([,e])=>e.consumedBy===id);
  if(!entries.length)throw new Error('No hay versiones consumidas por esta exportación.');
  // Do not allow rollback after any result has entered the bank or a later move.
  if((plan.files||[]).some(f=>state.saves.some(s=>s.hash===f.after)||state.consumed[f.after]))throw new Error('Ya se importó o utilizó un resultado. No se puede anular esta exportación.');
  for(const [hash] of entries)delete state.consumed[hash];
  for(const s of state.saves)if(s.consumedBy===id){delete s.consumedBy;delete s.consumedAt;}
  plan.cancelledAt=at;state.backupNeeded=true;
}
