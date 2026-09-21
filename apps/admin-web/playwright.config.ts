import { defineConfig } from '@playwright/test';

const e2eEnvironment = {
  NEXT_PUBLIC_RHC_DATA_MODE: 'api',
  NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001/api/v1',
  NEXT_PUBLIC_SUPABASE_URL: 'https://rhc-e2e.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-e2e-key',
  NEXT_PUBLIC_CUSTOMER_WEB_URL: 'http://127.0.0.1:3002',
  NEXT_PUBLIC_ADMIN_WEB_URL: 'http://127.0.0.1:3003',
};
Object.assign(process.env, e2eEnvironment);

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: { baseURL: 'http://127.0.0.1:3003', trace: 'retain-on-failure' },
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run build && npm run start',
    url: 'http://127.0.0.1:3003',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: e2eEnvironment,
  },
});
