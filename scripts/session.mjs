import { writeFile, appendFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const [, , cmd, part] = process.argv;
const dir = new URL('../session/', import.meta.url);
await mkdir(dir, { recursive: true });

function gitHead() {
  // Fixed argument list, no shell involved: not injectable.
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; }
}

if (cmd === 'start' || cmd === 'end') {
  if (!part) { console.error('usage: session.mjs start|end <part>'); process.exit(2); }
  const record = { part, action: cmd, at: new Date().toISOString(), node: process.version, gitHead: gitHead() };
  await writeFile(new URL(`${part}-${cmd}.json`, dir), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record));
} else if (cmd === 'note') {
  await appendFile(
    new URL('notes.jsonl', dir),
    JSON.stringify({ at: new Date().toISOString(), part: part || null, note: process.argv.slice(4).join(' ') }) + '\n',
  );
} else {
  console.error('usage: session.mjs start|end <part>   |   session.mjs note <part> <text...>');
  process.exit(2);
}
