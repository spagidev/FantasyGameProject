import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks: { 'atlas-geography': ['./src/game/atlas-geography.json'] } },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
});
