import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

async function testsIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? testsIn(path) : entry.name.endsWith('.test.ts') ? [path] : [];
    }),
  );
  return groups.flat().sort();
}
const root = fileURLToPath(new URL('../', import.meta.url));
const tests = await testsIn(resolve(root, 'src'));
const child = spawn(process.execPath, ['--import=tsx', '--test', ...tests], { stdio: 'inherit' });
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
