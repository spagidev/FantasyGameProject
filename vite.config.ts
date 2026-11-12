import { createAtlasService } from './worker/atlas-service';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emberwake-atlas-api',
      configureServer(server) {
        const handler = createAtlasService();
        server.middlewares.use('/api/atlas', async (req, res) => {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk));
          const origin = `http://${req.headers.host}`;
          const response = await handler(
            new Request(origin + '/api/atlas', {
              method: req.method,
              headers: { 'Content-Type': 'application/json' },
              ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}),
            }),
          );
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      output: { manualChunks: { 'atlas-geography': ['./src/game/atlas-geography.json'] } },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
});
