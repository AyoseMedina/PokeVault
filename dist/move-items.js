import {ITEM_TRANSFER as I} from './item-transfer-data.js';
import {GAMES,put16} from './core.js';
const need=(v,m)=>{if(!v)throw new Error(m);};
export const itemFamily=game=>({crystal:'crystal',ruby:'gen3',sapphire:'gen3',emerald:'gen3',firered:'gen3',leafgreen:'gen3',diamond:'dp',pearl:'dp',platinum:'pt',heartgold:'hgss',soulsilver:'hgss',black:'gen5',white:'gen5',black2:'gen5',white2:'gen5'})[game];
export const itemName=(g,id)=>{if(!id)return 'Sin objeto / No item';const names=I.names[g===5?4:g];return `${names?.[0]?.[id]||'Objeto '+id} / ${names?.[1]?.[id]||'Item '+id}`;};
export function itemPlan(p,destinationGame){
 const source=p.generation,target=GAMES[destinationGame].generation,item=p.heldItem||0,notes=[];
 if(!item)return {targetItem:source===1?null:0,returnItem:0,notes};
 need(!I.mail[source]?.includes(item),'Cartas bloqueadas: tienen datos propios en la partida. Retírala dentro del juego.');
 need(I.held[itemFamily(p.game)]?.includes(item),'El objeto no es equipable en el juego de origen. No se corregirá silenciosamente.');
 let targetItem=item,returnItem=0;
 if(source===3&&target===5)throw new Error('III → IV → V con objeto bloqueado: no existe una mochila IV intermedia. Retíralo en el juego.');
 if(source===2&&target===3){targetItem=I.g2to3[item];need(targetItem,'Objeto de Cristal sin equivalente autorizado en GBA (MT, Carta o sin equivalencia).');}
 else if(source===3&&target===4){targetItem=I.g3to4[item];need(targetItem,'Objeto GBA sin equivalente autorizado en generación IV.');}
 else if(source===4&&target===5){targetItem=0;returnItem=item;}
 else need(source===target,'Ruta de objetos no verificada.');
 if(targetItem)need(I.held[itemFamily(destinationGame)]?.includes(targetItem),'El objeto no existe como equipable en el juego de destino. Retíralo dentro del juego.');
 notes.push(returnItem?`${itemName(source,item)} vuelve a la mochila del origen IV; llega sin objeto.`:source===target?`Viaja con ${itemName(source,item)}.`:`Objeto: ${itemName(source,item)} → ${itemName(target,targetItem)}.`);
 return {targetItem,returnItem,notes,sourceItem:item};
}
// PKHeX PlayerBag4*/InventoryPouch4 and pret Bag_TryAddItem/Bag_AddItem.
// Pinned layouts and native sorting references: docs/MOVE_IMPLEMENTATION.md.
export function returnItemToBag(w,item,count=1){
 need(w.parsed.generation===4&&Number.isSafeInteger(count)&&count>0,'Devolución a mochila no compatible.');
 const family=itemFamily(w.parsed.game),bag=I.bags[family],pocket=bag?.pockets.find(p=>p.items.includes(item));
 need(pocket&&I.held[family].includes(item)&&!I.mail[4].includes(item),'No se ha verificado el bolsillo del objeto.');
 const base=w.parsed.writeInfo.generalBase+bag.base+pocket.offset,read=(o)=>new DataView(w.bytes.buffer,w.bytes.byteOffset,w.bytes.byteLength).getUint16(o,true);
 const before=Array.from({length:pocket.capacity},(_,i)=>({id:read(base+i*4),count:read(base+i*4+2)})),ids=new Set();
 for(const s of before){need((s.id===0)===(s.count===0)&&s.count<=pocket.max,'Mochila incoherente: objeto vacío, cantidad o máximo inválidos.');if(s.id){need(pocket.items.includes(s.id)&&!ids.has(s.id),'Mochila con objetos desconocidos o duplicados. No se reorganizará automáticamente.');ids.add(s.id);}}
 const slots=before.map(s=>({...s})),index=slots.findIndex(s=>s.id===item),empty=slots.findIndex(s=>!s.id),at=index>=0?index:empty;need(at>=0,'La mochila de origen no tiene hueco para devolver el objeto.');need(slots[at].count+count<=pocket.max,'La mochila de origen alcanzaría el máximo de unidades del objeto.');
 slots[at]={id:item,count:slots[at].count+count};
 const sorted=['TMHMs','Berries'].includes(pocket.type);if(sorted)slots.sort((a,b)=>(a.id||Infinity)-(b.id||Infinity));
 // Verify the complete multiset before writing; no other item may change count.
 const expected=new Map(before.filter(s=>s.id).map(s=>[s.id,s.count]));expected.set(item,(expected.get(item)||0)+count);
 need(slots.filter(s=>s.id).length===expected.size&&slots.every(s=>!s.id||expected.get(s.id)===s.count),'Verificación de cantidades de mochila fallida.');
 slots.forEach((s,i)=>{if(s.id===before[i].id&&s.count===before[i].count)return;const b=new Uint8Array(4);put16(b,0,s.id);put16(b,2,s.count);w.patch(base+i*4,b);});w.markGeneral();
 for(let i=0;i<slots.length;i++)need(read(base+i*4)===slots[i].id&&read(base+i*4+2)===slots[i].count,'La mochila escrita no coincide con la revisada.');
 return {item,count,pocket:pocket.type,notes:`Mochila de ${w.parsed.game}: +${count} ${itemName(4,item)} en ${pocket.type}${sorted?'; bolsillo ordenado por ID como en el juego':''}.`};
}
