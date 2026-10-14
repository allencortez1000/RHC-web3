import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { evaluateLocalThirdwebQa } from '../app/components/wallet-thirdweb/real-provider-qa/gate.ts';

// Read-only setup check. Never imports thirdweb, starts Next, or connects a wallet.
// Run: node --import tsx apps/customer-web/scripts/thirdweb-qa-preflight.mjs
export const REQUIRED_KEYS = Object.freeze([
  'RHC_THIRDWEB_QA_PERMISSION_REF',
  'RHC_THIRDWEB_QA_CLIENT_ID',
  'RHC_THIRDWEB_QA_CHAIN_ID',
  'RHC_THIRDWEB_QA_WALLET_MODE',
]);

export function inspectQaConfiguration(env, host = '127.0.0.1:3002') {
  const missingKeys = REQUIRED_KEYS.filter(key => typeof env[key] !== 'string' || !env[key].trim());
  const decision = evaluateLocalThirdwebQa({
    // This checks the intended `next dev` mode, not a running server.
    nodeEnv: env.NODE_ENV ?? 'development',
    vercel: env.VERCEL,
    vercelEnv: env.VERCEL_ENV,
    host,
    approvalReference: env.RHC_THIRDWEB_QA_PERMISSION_REF,
    clientId: env.RHC_THIRDWEB_QA_CLIENT_ID,
    chainId: env.RHC_THIRDWEB_QA_CHAIN_ID,
    mode: env.RHC_THIRDWEB_QA_WALLET_MODE,
  });
  return {
    schema: 'rhc-thirdweb-local-setup-preflight-v1',
    configuration: decision.allowed ? 'CONFIGURED_REQUIRES_OWNER_REVIEW'
      : missingKeys.length ? 'MISSING_CONFIGURATION' : 'INVALID_CONFIGURATION',
    intendedRuntime: 'local next dev only',
    settings: REQUIRED_KEYS.map(name => ({ name, present: !missingKeys.includes(name) })),
    missingKeys,
    gateAllowed: decision.allowed,
    denialReason: decision.allowed ? null : decision.reason,
    authorization: 'NOT_VERIFIED_BY_THIS_CHECK',
    providerProjectAndDomainRestrictions: 'NOT_VERIFIED',
    serverStarted: false,
    walletConnected: false,
    nextAction: decision.allowed
      ? 'Review actual RHC authorization, provider project, domains, QA identity and cost/privacy limits before manually starting the local QA session.'
      : 'Complete or correct the listed local QA settings using approved values; do not invent a permission reference or use a Secret Key.',
    exitCode: decision.allowed ? 0 : 2,
  };
}

export function loadLocalQaPreflight(appDirectory, host = '127.0.0.1:3002') {
  const require = createRequire(import.meta.url);
  // Resolve the same installed loader Next uses; no new dependency or custom dotenv parser.
  const requireFromNext = createRequire(require.resolve('next/package.json'));
  const { loadEnvConfig } = requireFromNext('@next/env');
  let failed = false;
  const logger = { info() {}, error() { failed = true; } };
  try {
    const loaded = loadEnvConfig(appDirectory, true, logger, true);
    if (failed) throw new Error('ENV_LOAD_FAILED');
    return {
      ...inspectQaConfiguration(process.env, host),
      loadedEnvironmentFiles: loaded.loadedEnvFiles.map(file => path.basename(file.path)),
    };
  } catch {
    // Never emit dotenv exception text, paths containing secrets, or raw environment values.
    return { schema: 'rhc-thirdweb-local-setup-preflight-v1', configuration: 'ENV_LOAD_FAILED',
      authorization: 'NOT_VERIFIED_BY_THIS_CHECK', serverStarted: false, walletConnected: false,
      message: 'Environment loading failed. Inspect local configuration privately; no values were logged.', exitCode: 1 };
  }
}

const ownPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === ownPath) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !args[0].startsWith('--host='))) {
    console.error('Usage: node --import tsx apps/customer-web/scripts/thirdweb-qa-preflight.mjs [--host=127.0.0.1:3002]');
    process.exitCode = 1;
  } else {
    const host = args[0]?.slice('--host='.length) ?? '127.0.0.1:3002';
    const appDirectory = path.resolve(path.dirname(ownPath), '..');
    try {
      const report = loadLocalQaPreflight(appDirectory, host);
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.exitCode;
    } catch {
      console.error('Local QA preflight could not run. Verify the locked dependencies; no configuration values were logged.');
      process.exitCode = 1;
    }
  }
}
