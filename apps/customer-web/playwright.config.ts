import { defineConfig } from '@playwright/test';


// Portable protection for ordinary npm run test:e2e and all spawned Next workers.
import path from 'node:path';
import './tests/offline-network.cjs';
const offlineGuard = path.resolve(__dirname, '../customer-web/tests/offline-network.cjs');
const guardedNodeOptions = [process.env.NODE_OPTIONS, '--require ' + JSON.stringify(offlineGuard)].filter(Boolean).join(' ');
const e2eEnvironment = {
  NODE_ENV: 'production',
  NODE_OPTIONS: guardedNodeOptions,
  NEXT_PUBLIC_RHC_DATA_MODE: 'api',
  NEXT_PUBLIC_API_URL: 'http://127.0.0.1:43101/api/v1',
  NEXT_PUBLIC_SUPABASE_URL: 'https://rhc-e2e.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-e2e-key',
  NEXT_PUBLIC_CUSTOMER_WEB_URL: 'http://127.0.0.1:43102',
  NEXT_PUBLIC_ADMIN_WEB_URL: 'http://127.0.0.1:43103',
};
Object.assign(process.env, e2eEnvironment);

export default defineConfig({
  testDir: './tests',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:43102',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'] },
  },
  webServer: {
    command: 'node ../../node_modules/next/dist/bin/next start -H 127.0.0.1 -p 43102',
    cwd: __dirname,
    url: 'http://127.0.0.1:43102',
    reuseExistingServer: false,
    timeout: 60000,
    env: e2eEnvironment,
  },
});
