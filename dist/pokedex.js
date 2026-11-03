// Read-only national species flags, after the existing save validation succeeds.
// Offsets and bit order: PKHeX, pinned references in docs/POKEDEX.md.
function flags(bytes, offsets, maxSpecies) {
  const size = Math.ceil(maxSpecies / 8);
  if (offsets.some(o => !Number.isInteger(o) || o < 0 || o + size > bytes.length)) {
    throw new Error('Bloque de Pokédex incompleto.');
  }
  return Array.from({length:maxSpecies}, (_, i) => offsets.some(o => !!(bytes[o + (i >> 3)] & (1 << (i & 7)))));
}

export function readPokedex(bytes, game, parsed) {
  let caught, seen, maxSpecies;
  if (game === 'yellow') {
    maxSpecies=151; caught=[0x25A3]; seen=[0x25B6];
  } else if (game === 'crystal') {
    maxSpecies=251; caught=[0x2A27]; seen=[0x2A47];
  } else if (parsed.generation === 3) {
    const base=parsed.active.sectors[0];
    maxSpecies=386; caught=[base+0x28]; seen=[base+0x5C];
  } else if (parsed.generation === 4) {
    const offset={diamond:0x12DC,pearl:0x12DC,platinum:0x1328,heartgold:0x12B8,soulsilver:0x12B8}[game];
    const base=parsed.writeInfo.generalBase+offset;
    maxSpecies=493; caught=[base+4]; seen=[base+0x44];
  } else if (parsed.generation === 5) {
    const base=game.endsWith('2')?0x21400:0x21600;
    maxSpecies=649; caught=[base+8]; seen=[0,1,2,3].map(i=>base+0x5C+i*0x54);
  } else throw new Error('Pokédex no compatible.');
  const caughtFlags=flags(bytes,caught,maxSpecies),seenFlags=flags(bytes,seen,maxSpecies);
  return {maxSpecies,caught:caughtFlags,seen:seenFlags,
    caughtCount:caughtFlags.filter(Boolean).length,seenCount:seenFlags.filter(Boolean).length,
    inconsistent:caughtFlags.filter((value,i)=>value&&!seenFlags[i]).length};
}
