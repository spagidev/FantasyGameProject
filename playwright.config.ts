import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Prefer a system Chromium when one is installed (managed environments); CI installs its own.
const localChromium = ['/usr/bin/chromium', '/opt/pw-browsers/chromium'].find(existsSync);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    launchOptions:
      !process.env.CI && localChromium
        ? { executablePath: localChromium, args: ['--no-sandbox'] }
        : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
