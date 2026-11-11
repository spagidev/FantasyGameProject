import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/balance.sim.ts'], testTimeout: 120000, maxWorkers: 1 },
});
