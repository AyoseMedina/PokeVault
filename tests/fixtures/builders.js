import { readFileSync } from 'node:fs';
import { crc16CCITT } from '../../dist/formats.js';
import { FORMAT_DATA as F } from '../../dist/formats-data.js';
const set16=(b,o,v)=>new DataView(b.buffer).setUint16(o,v,true),set32=(b,o,v)=>new DataView(b.buffer).setUint32(o,v,true);
const get16=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint16(o,true);
export const reference=g=>new Uint8Array(readFileSync(new URL(`./upstream.pk${g}`,import.meta.url)));
// PKHeX's decryption-position table, inverted here independently of the app's
// physical-order implementation. Public fixtures are decrypted .pk4/.pk5.
const positions=[
 [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,3,1,2],[0,2,3,1],[0,3,2,1],
 [1,0,2,3],[1,0,3,2],[2,0,1,3],[3,0,1,2],[2,0,3,1],[3,0,2,1],
 [1,2,0,3],[1,3,0,2],[2,1,0,3],[3,1,0,2],[2,3,0,1],[3,2,0,1],
 [1,2,3,0],[1,3,2,0],[2,1,3,0],[3,1,2,0],[2,3,1,0],[3,2,1,0]
];
export function encryptedReference(g,shuffle=null){
 const plain=reference(g);if(shuffle!==null)set32(plain,0,shuffle*8192+19);
 const raw=new Uint8Array(136);raw.set(plain.subarray(0,8));const selector=((new DataView(plain.buffer).getUint32(0,true)>>>13)&31)%24,physical=new Uint8Array(128);
 positions[selector].forEach((source,canonical)=>physical.set(plain.subarray(8+canonical*32,8+(canonical+1)*32),source*32));
 let seed=get16(plain,6);for(let i=0;i<128;i+=2){seed=Number((BigInt(seed)*0x41C64E6Dn+0x6073n)&0xFFFFFFFFn);set16(raw,8+i,get16(physical,i)^(seed>>>16));}return raw;
}
export const fixtureLayouts={
 diamond:[0xC100,0x121E0,0xC100,0x14,0x64,0x98,4,4080,73444],
 pearl:[0xC100,0x121E0,0xC100,0x14,0x64,0x98,4,4080,73444],
 platinum:[0xCF2C,0x121E4,0xCF2C,0x14,0x68,0xA0,4,4080,73444],
 heartgold:[0xF628,0x12310,0xF700,0x10,0x64,0x98,0,4096,0x12008],
 soulsilver:[0xF628,0x12310,0xF700,0x10,0x64,0x98,0,4096,0x12008]
};
export function encodeDS(text,g,length=40){const b=new Uint8Array(length).fill(255);[...text].slice(0,length/2-1).forEach((c,i)=>set16(b,i*2,g===5?c.charCodeAt(0):F.g4chars.indexOf(c)));return b;}
export function refreshG4(b,game){const [gsize,ssize,start,footer]=fixtureLayouts[game];for(const base of [0,0x40000])for(const [o,size] of [[base,gsize],[base+start,ssize]])set16(b,o+size-2,crc16CCITT(b.subarray(o,o+size-footer)));return b;}
export function fixtureG4(game,{storageBase=0x40000,partyBase=0,box=0,slot=0}={}){
 const b=new Uint8Array(524288),[gsize,ssize,start,footer,trainer,party,boxStart,stride,names]=fixtureLayouts[game];
 for(const base of [0,0x40000]){
  b.set(encodeDS(base===partyBase?'NUEVO':'ANTIGUO',4,16),base+trainer);set16(b,base+trainer+16,12345);b[base+trainer+0x19]=7;
  b[base+party-4]=1;b.set(encryptedReference(4),base+party);
  for(let i=0;i<18;i++)b.set(encodeDS('CAJA '+(i+1),4),base+start+names+i*40);
  for(const [o,size,counter] of [[base,gsize,base===partyBase?12:11],[base+start,ssize,base===storageBase?24:23]]){
   set32(b,o+size-20,counter);set32(b,o+size-16,1);set32(b,o+size-12,size);set32(b,o+size-8,0x20060623);
  }
 }
 b.set(encryptedReference(4),storageBase+start+boxStart+box*stride+slot*136);
 return refreshG4(b,game);
}
export function refreshG5(b,game){const blocks=F[game.endsWith('2')?'b2w2':'bw'];for(const [o,size,checksum,mirror] of blocks){const crc=crc16CCITT(b.subarray(o,o+size));set16(b,checksum,crc);set16(b,mirror,crc);}return b;}
export function fixtureG5(game,{box=0,slot=0}={}){
 const b=new Uint8Array(524288);b.set(encodeDS('TESÉLIA',5,16),0x19404);set16(b,0x19414,54321);b[0x1941E]=7;b[0x18E04]=1;b.set(encryptedReference(5),0x18E08);
 for(let i=0;i<24;i++)b.set(encodeDS('CAJA '+(i+1),5,20),4+i*40);
 b.set(encryptedReference(5),0x400+box*4096+slot*136);return refreshG5(b,game);
}
function encodeGB(text,len){const b=new Uint8Array(len).fill(0x50);[...text].slice(0,len-1).forEach((c,i)=>b[i]=F.g1chars.indexOf(c));return b;}
export function refreshYellow(b){let sum=0;for(let i=0x2598;i<0x3523;i++)sum=(sum+b[i])&255;b[0x3523]=(~sum)&255;return b;}
export function fixtureYellow({initialized=true,current=8}={}){
 const b=new Uint8Array(32768);b.set(encodeGB('AMARILLO',11),0x2598);b[0x2605]=0x12;b[0x2606]=0x34;b[0x284C]=current|(initialized?128:0);
 for(let i=0;i<12;i++)b[(i<6?0x4000:0x6000)+(i%6)*0x462+1]=255;
 b[0x30C1]=255;b[0x2F2D]=255;
 const write=(offset,capacity,party)=>{b[offset]=1;b[offset+1]=0x54;b[offset+2]=255;const size=party?44:33,o=offset+capacity+2;b[o]=0x54;b[o+3]=20;b[o+8]=33;b[o+12]=0x12;b[o+13]=0x34;b[o+14]=0;b[o+15]=0x1F;b[o+16]=0x40;b.set(encodeGB('ASH',11),o+capacity*size);b.set(encodeGB('PIKACHU',11),o+capacity*size+capacity*11);};
 write(0x30C0,20,false);write(0x2F2C,6,true);if(initialized)write(0x4000,20,false);
 return refreshYellow(b);
}
export function wrapDSV(raw,footerSize=122){const b=new Uint8Array(raw.length+footerSize);b.set(raw);b.set(new TextEncoder().encode('|-DESMUME SAVE-|'),b.length-16);set32(b,b.length-40,raw.length);set32(b,b.length-36,raw.length);set32(b,b.length-20,0);return b;}
