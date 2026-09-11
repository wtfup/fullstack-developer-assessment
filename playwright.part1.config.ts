import { defineConfig } from '@playwright/test';

const server = process.env.PART1_SERVER || 'part1/server/server.mjs';

export default defineConfig({
  testDir: './tests/part1',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30000,
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4318', headless: true },
  reporter: 'list',
  webServer: {
    command: `node ${server}`,
    url: 'http://127.0.0.1:4318/health',
    env: { PORT: '4318' },
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 60000,
  },
});
