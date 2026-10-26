import { defineConfig } from 'vite';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  server: { port: 8082, strictPort: true },
  preview: { port: 8082, strictPort: true },
  plugins: [
    {
      name: 'little-lantern-download',
      // This endpoint exists only in the development server. The published game is static.
      configureServer(server) {
        server.middlewares.use('/__game-export', (request, response) => {
          // A separate process keeps Vite's development and production settings apart.
          execFile(
            process.execPath,
            ['scripts/build.js', '--stdout'],
            {
              cwd: root,
              maxBuffer: 16 * 1024 * 1024,
            },
            (error, html) => {
              response.setHeader('Content-Type', 'text/html; charset=utf-8');
              response.setHeader('Cache-Control', 'no-store');
              response.statusCode = error ? 500 : 200;
              response.end(error ? 'The game export could not be built.' : html);
              if (error) server.config.logger.error(error.message);
            },
          );
        });
      },
    },
  ],
});
