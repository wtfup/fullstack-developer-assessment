import { defineConfig } from '@playwright/test';

const server = process.env.PART2_SERVER || 'part2/app/server.mjs';

export default defineConfig({
  testDir: './tests/part2',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30000,
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4320', headless: true },
  reporter: 'list',
  webServer: {
    command: `node ${server}`,
    url: 'http://127.0.0.1:4320/health',
    env: { PORT: '4320' },
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 60000,
  },
});
