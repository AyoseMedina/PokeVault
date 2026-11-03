"""Rebuild the custom-conversion gender and PP tables from pinned PKHeX (GPL-3.0)."""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
REVISION = '0660d1e1f4924b8478daec73281bb8071a82ad19'
CACHE = ROOT / '.test-output' / 'custom-data' / REVISION

def fetch(path):
    CACHE.mkdir(parents=True, exist_ok=True)
    target = CACHE / Path(path).name
    if not target.exists():
        with urlopen(Request(f'https://raw.githubusercontent.com/kwsch/PKHeX/{REVISION}/{path}',
                             headers={'User-Agent':'PokeVault-data-builder'}), timeout=60) as response:
            target.write_bytes(response.read())
    return target.read_bytes()

def main():
    personal = fetch('PKHeX.Core/Resources/byte/personal/personal_c')
    moves = fetch('PKHeX.Core/Moves/MoveInfo3.cs').decode('utf-8')
    pp = [int(n) for n in re.findall(r'\d+', moves.split('PP =>')[1].split('[')[1].split(']')[0])]
    assert len(personal) == 252*32 and len(pp) == 355
    data = {'gender2':[personal[i*32+13] for i in range(252)], 'pp3':pp}
    output=f'// PKHeX {REVISION}; GPL-3.0. See docs/CUSTOM_TRANSFER.md.\n'
    output+='export const CUSTOM_DATA='+json.dumps(data,separators=(',',':'))+';\n'
    ROOT.joinpath('dist/custom-transfer-data.js').write_text(output,encoding='utf-8',newline='\n')
    print('Generated custom conversion tables.')

if __name__ == '__main__':
    main()
