import { spawn } from 'node:child_process';

const deploymentProfile = (
  process.env.RHC_ENVIRONMENT ||
  process.env.VERCEL_ENV ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  'development'
).toLowerCase();

if (['production', 'staging', 'preview'].includes(deploymentProfile)) {
  console.error(`RHC demo mode is unavailable for the ${deploymentProfile} environment.`);
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmCli = process.env.npm_execpath;
const executable = npmCli ? process.execPath : npm;
const npmArguments = (args) => (npmCli ? [npmCli, ...args] : args);
const sharedEnvironment = {
  ...process.env,
  NODE_ENV: 'development',
  RHC_APP_PROFILE: 'demo',
  RHC_DEMO_MODE: '1',
  NEXT_PUBLIC_RHC_DATA_MODE: 'demo',
  NEXT_PUBLIC_RHC_DEMO_HUB_URL: 'http://127.0.0.1:3002/api/demo',
  NEXT_PUBLIC_CUSTOMER_WEB_URL: 'http://127.0.0.1:3002',
  NEXT_PUBLIC_ADMIN_WEB_URL: 'http://127.0.0.1:3003',
  RHC_DEMO_ALLOWED_HOSTS: '127.0.0.1:3002,localhost:3002',
  RHC_DEMO_ALLOWED_ORIGINS:
    'http://127.0.0.1:3002,http://127.0.0.1:3003,http://localhost:3002,http://localhost:3003',
  RHC_DEMO_CUSTOMER_EMAIL: 'demo@rhc.local',
  RHC_DEMO_CUSTOMER_PASSWORD: 'Demo123456!',
  RHC_DEMO_CUSTOMER_PERSONA: 'customer-maya',
  RHC_DEMO_ADMIN_EMAIL: 'superadmin@example.com',
  RHC_DEMO_ADMIN_PASSWORD: 'Demo123456!',
  RHC_DEMO_ADMIN_PERSONA: 'system-admin',
  NEXT_PUBLIC_API_URL: '',
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
};

const children = [
  spawn(executable, npmArguments(['run', 'dev:demo', '-w', '@rhc/customer-web']), {
    env: sharedEnvironment,
    stdio: 'inherit',
    windowsHide: false,
    shell: !npmCli && process.platform === 'win32',
  }),
  spawn(executable, npmArguments(['run', 'dev:demo', '-w', '@rhc/admin-web']), {
    env: sharedEnvironment,
    stdio: 'inherit',
    windowsHide: false,
    shell: !npmCli && process.platform === 'win32',
  }),
];

let exiting = false;
function stop(signal = 'SIGTERM') {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stop(signal);
    process.exit(0);
  });
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!exiting && code && code !== 0) {
      stop();
      process.exitCode = code;
    }
  });
}

console.log('RHC Meridian demo profile starting:');
console.log('  Customer and fixture hub: http://127.0.0.1:3002');
console.log('  Admin command center:     http://127.0.0.1:3003');
console.log('  Listener boundary:        loopback only');
console.log('  Store:                    .rhc-demo/world.json');
console.log('No Supabase, real API, database, wallet, RPC, payment, email, or storage provider is used.');
