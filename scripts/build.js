// Vite combines the JavaScript modules and imports the pictures for us.
// This small packaging step puts everything into one HTML file for offline play.
import { build } from 'vite';
import { zipSync, strToU8 } from 'fflate';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const stdoutOnly = process.argv.includes('--stdout');

const result = await build({
  configFile: false,
  root,
  logLevel: 'silent',
  build: {
    write: false,
    lib: {
      entry: resolve(root, 'src/main.js'),
      name: 'LittleLantern',
      formats: ['iife'],
      fileName: () => 'game.js',
      cssFileName: 'game',
    },
  },
});

const files = (Array.isArray(result) ? result : [result]).flatMap((bundle) => bundle.output);
const javascript = files.find((file) => file.type === 'chunk' && file.isEntry)?.code;
const css = files
  .filter((file) => file.type === 'asset' && file.fileName.endsWith('.css'))
  .map((file) => String(file.source))
  .join('\n');
if (!javascript || !css) throw new Error('Vite did not produce the game code and styles.');

// A classic inline script also works when an HTML file is opened without a server.
const template = await readFile(resolve(root, 'index.html'), 'utf8');
const html = template
  .replace('</head>', () => `<style id="gameStyles">${css.replace(/<\/style/gi, '<\\/style')}</style>\n</head>`)
  .replace(
    '<script type="module" src="/src/main.js"></script>',
    () => `<script id="gameCode">${javascript.replace(/<\/script/gi, '<\\/script')}</script>`,
  );
if (!html.includes('id="gameCode"')) throw new Error('The game entry script is missing from index.html.');

if (stdoutOnly) {
  // Vite's development server uses this to export current, unsaved source changes.
  process.stdout.write(html);
} else {
  const name = 'LittleLantern-Offline.html';
  const zip = zipSync({ [name]: strToU8(html) }, { level: 9 });
  for (const directory of ['dist', 'exports']) {
    await mkdir(resolve(root, directory), { recursive: true });
    await writeFile(resolve(root, directory, name), html);
    await writeFile(resolve(root, directory, 'LittleLantern-Offline.zip'), zip);
  }
  await writeFile(resolve(root, 'dist/index.html'), html);
  console.log('Built dist/index.html for Sites and exports/LittleLantern-Offline.html + .zip for downloads.');
}
