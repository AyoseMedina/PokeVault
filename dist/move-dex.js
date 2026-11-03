import {FORMAT_DATA as F} from './formats-data.js';
import {decryptPK45} from './formats.js';
// Native capture routines / PKHeX layouts, pinned in docs/MOVE_IMPLEMENTATION.md.
const need=(v,m)=>{if(!v)throw new Error(m);};
const byte=(w,o,v)=>w.patch(o,Uint8Array.of(v));
const get=(w,o,i)=>!!(w.bytes[o+(i>>3)]&(1<<(i&7)));
const bit=(w,o,i,value=true)=>{const at=o+(i>>3),mask=1<<(i&7);byte(w,at,value?w.bytes[at]|mask:w.bytes[at]&~mask);};
function append(w,o,count,form,empty=255){const list=w.bytes.subarray(o,o+count);if(list.includes(form))return;const slot=list.indexOf(empty);need(slot>=0,'Registro de formas lleno o incoherente. No se sobrescribirá.');byte(w,o+slot,form);}
function forms4(w,base,p,seen,hgss,dp,gender){
 const s=p.species,f=p.form||0,form2=base+0x108+(hgss?0x3C:0x20)+0x1F4;
 if(s===201){need(f<28,'Forma Unown inválida.');append(w,base+0x10C,28,f);if(hgss)append(w,base+0x128,28,f);return;}
 let offsets,bits,count;
 if(s===386){offsets=[base+0x43,base+0x83];bits=4;count=4;}
 else if([422,423,412,413].includes(s)){offsets=[base+0x108+[422,423,412,413].indexOf(s)];bits=s<=413?2:1;count=bits===1?2:3;}
 else if(!dp&&[479,492,487].includes(s)){offsets=s===479?[form2,form2+1,form2+2,form2+3]:[form2+(s===492?4:5)];bits=s===479?3:1;count=s===479?6:2;}
 else if(hgss&&s===172){offsets=[form2+6];bits=2;count=3;}
 else return;
 const form=hgss&&s===172?(f===1?2:gender):f;need(form<count,'Forma de Pokédex inválida.');
 let packed=offsets.reduce((a,o,i)=>(a|(w.bytes[o]<<(i*8)))>>>0,0),mask=(1<<bits)-1;
 if(bits===1){if(!seen)packed=(packed&~3)|(form?3:0);else if((packed&1)===((packed>>>1)&1)&&form!==(packed&1))packed=(packed&~2)|(form<<1);}
 else{
  const forms=Array.from({length:count},(_,i)=>(packed>>>(bits*i))&mask);
  if(!forms.includes(form)){const index=forms.indexOf(mask);need(index>=0,'Lista de formas incoherente o llena.');packed=((packed&~(mask<<(index*bits)))|(form<<(index*bits)))>>>0;}
 }
 offsets.forEach((o,i)=>byte(w,o,(packed>>>(i*8))&255));
}
const forms5={201:[0,28],386:[28,4],492:[32,2],487:[34,2],479:[36,6],422:[42,2],423:[44,2],412:[46,3],413:[49,3],351:[52,4],421:[56,2],585:[58,4],586:[62,4],648:[66,2],555:[68,2],550:[70,2]};
export function registerDex(w,p){
 const g=w.parsed.generation,s=p.species,i=s-1;need(s>0&&s<=[0,151,251,386,493,649][g],'Especie de Pokédex no válida.');
 if(g===1){bit(w,0x25A3,i);bit(w,0x25B6,i);return;}
 if(g===2){
  for(const delta of [0,-0xE00]){bit(w,0x2A27+delta,i);bit(w,0x2A47+delta,i);
   if(s===201){const dv=(p.raw[21]<<8)|p.raw[22],form=Math.floor((((dv>>>12&6)<<5)|((dv>>>8&6)<<3)|((dv>>>4&6)<<1)|((dv&6)>>>1))/10)+1;append(w,0x2A67+delta,26,form,0);if(!w.bytes[0x2A82+delta])byte(w,0x2A82+delta,form);}
  }w.markGeneral();return;
 }
 if(g===3){const small=w.parsed.active.sectors[0],seen=get(w,small+0x5C,i);
  if(!seen&&[201,327].includes(s))w.dword(small+(s===201?0x1C:0x20),p.pid);
  bit(w,small+0x28,i);bit(w,small+0x5C,i);w.sectors.add(0);
  const game=w.parsed.game,offsets=['ruby','sapphire'].includes(game)?[0x938,0x3A8C]:game==='emerald'?[0x988,0x3B24]:[0x5F8,0x3A18];
  for(const logical of offsets){const o=logical+(i>>3),section=1+Math.floor(o/0xF80),at=w.parsed.active.sectors[section]+o%0xF80;bit(w,at,i&7);w.sectors.add(section);}return;
 }
 const plain=decryptPK45(p.raw),gender=(plain[0x40]>>>1)&3;need(gender<=2,'Género de Pokédex inválido.');
 if(g===4){
  const game=w.parsed.game,hgss=['heartgold','soulsilver'].includes(game),dp=['diamond','pearl'].includes(game),base=w.parsed.writeInfo.generalBase+({diamond:0x12DC,pearl:0x12DC,platinum:0x1328,heartgold:0x12B8,soulsilver:0x12B8}[game]),seen=get(w,base+0x44,i);
  if(!seen){bit(w,base+0x84,i,gender===1);bit(w,base+0xC4,i,gender===1);if(s===327)w.dword(base+0x104,p.pid);}
  else if(get(w,base+0x84,i)!==(gender===1))bit(w,base+0xC4,i,gender===1);
  forms4(w,base,p,seen,hgss,dp,gender);
  const lang={1:0,2:1,3:2,4:4,5:3,7:5}[p.language]; // pret/pokeplatinum src/pokedex_language.c (Spanish is bit 5).
  need(lang!==undefined,'Idioma de Pokédex no verificado.');
  const limited=[23,25,54,77,120,129,202,214,215,216,228,278,287,315],index=dp?limited.indexOf(s)+1:s;
  if(index>0)bit(w,base+0x108+(hgss?0x3C:0x20)+index,lang);
  bit(w,base+4,i);bit(w,base+0x44,i);w.markGeneral();return;
 }
 const b2=w.parsed.writeInfo.family==='b2w2',base=b2?0x21400:0x21600,len=b2?11:9,region=(gender===1?1:0)+(p.shiny?2:0),seen=[0,1,2,3].some(n=>get(w,base+0x5C+n*0x54,i));
 if(s===327&&!seen)w.dword(base+0x2FC+4*len+432,p.pid);
 bit(w,base+8,i);bit(w,base+0x5C+region*0x54,i);
 if(![0,1,2,3].some(n=>get(w,base+0x1AC+n*0x54,i)))bit(w,base+0x1AC+region*0x54,i);
 if(s<=493){const language={1:0,2:1,3:2,4:3,5:4,7:5}[p.language];need(language!==undefined,'Idioma de Pokédex no verificado.');bit(w,base+0x2FC+4*len,i*7+language);}
 const entry=(b2?{646:[72,3],647:[75,2],642:[77,2],641:[79,2],645:[81,2]}:{})[s]||forms5[s];
 if(entry){
  // PKHeX SetDex currently sets the base form's seen bit even for non-base
  // forms. Until corroborated against native Gen V code, fail closed.
  need(!p.form,'Pokédex V: registro nativo de formas no base pendiente de verificar. Cambia a la forma base en el juego; no se normalizará aquí.');
  const [start,count]=entry;bit(w,base+0x2FC+(p.shiny?len:0),start);
  if(!Array.from({length:count},(_,n)=>[2,3].some(r=>get(w,base+0x2FC+r*len,start+n))).some(Boolean))bit(w,base+0x2FC+(p.shiny?3:2)*len,start);
 }
 const table=F[w.parsed.writeInfo.family],block=table.findIndex(([o,n])=>base>=o&&base<o+n);need(block>=0,'Bloque Pokédex no verificado.');w.blocks.add(block);
}
export function verifyDex(before,after,species){
 const changed=new Set(species);for(let i=0;i<before.maxSpecies;i++)for(const key of ['seen','caught'])need(changed.has(i+1)?after[key][i]===true:after[key][i]===before[key][i],'Las marcas de Pokédex no coinciden con las especies autorizadas.');
}
