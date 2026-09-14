import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: { baseURL: 'http://127.0.0.1:3002', trace: 'retain-on-failure' },
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run build && npm run start',
    url: 'http://127.0.0.1:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
