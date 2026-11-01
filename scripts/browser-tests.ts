import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

// Start before launching Playwright. Each run gets fresh compiled modules and
// its own port, without depending on or stopping a developer's running server.
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: false } });
try {
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string')
    throw new Error('Browser test server did not open a TCP port.');
  const require = createRequire(import.meta.url);
  const child = spawn(
    process.execPath,
    [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: { ...process.env, LITTLE_LANTERN_TEST_URL: `http://127.0.0.1:${address.port}` },
    },
  );
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', reject);
  });
} finally {
  await server.close();
}
