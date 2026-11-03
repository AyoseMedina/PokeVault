import { createInterface } from 'node:readline/promises';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { hashPassword } from './password.js';

function hidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error('Se necesita una terminal interactiva / An interactive terminal is required.'));
    process.stdout.write(prompt);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true); process.stdin.setEncoding('utf8'); process.stdin.resume();
    let value = '';
    const cleanup = () => { process.stdin.removeListener('data', input); process.stdin.setRawMode(wasRaw); process.stdin.pause(); process.stdout.write('\n'); };
    const input = chunk => {
      for (const char of chunk) {
        if (char === '\u0003') { cleanup(); reject(new Error('Cancelado / Cancelled.')); return; }
        if (char === '\r' || char === '\n') { cleanup(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') value = [...value].slice(0, -1).join('');
        else if (char >= ' ' && [...value].length < 129) value += char;
      }
    };
    process.stdin.on('data', input);
  });
}

try {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const username = (await rl.question('Usuario / Username (3–64): ')).trim();
  rl.close();
  if (!/^[a-zA-Z0-9_.@-]{3,64}$/.test(username)) throw new Error('Usuario inválido / Invalid username.');
  const password = await hidden('Contraseña / Password (15–128, oculta / hidden): ');
  const repeat = await hidden('Repite / Repeat: ');
  if (password !== repeat) throw new Error('Las contraseñas no coinciden / Passwords do not match.');
  const encoded = await hashPassword(password);
  const content = `POKEVAULT_USERNAME=${username}\nPOKEVAULT_PASSWORD_HASH=${encoded}\nPOKEVAULT_SESSION_SECRET=${randomBytes(32).toString('hex')}\n`;
  if (process.argv.includes('--write-env')) {
    await writeFile('.env', content, { flag: 'wx', mode: 0o600 });
    console.log('.env creado sin sobrescribir archivos / Created .env without overwriting files.');
  } else {
    console.log('\nCopia en las variables de Portainer. No publiques estos valores.\nCopy into Portainer variables. Do not publish these values.\n');
    process.stdout.write(content);
  }
} catch (error) {
  console.error(error.code === 'EEXIST' ? '.env ya existe; no se ha modificado / .env already exists; unchanged.' : error.message);
  process.exitCode = 1;
} finally {
  // Release the interactive input handle after restoring raw mode in hidden().
  process.stdin.destroy();
}
