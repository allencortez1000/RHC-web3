import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:3002' },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://127.0.0.1:3002',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
