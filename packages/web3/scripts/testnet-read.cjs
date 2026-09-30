// Operator-only. Load a local backend env file with Node --env-file; never paste secrets in chat.
const { performance } = require('node:perf_hooks');
const { createReadProvider } = require('../dist');

async function main() {
  if (process.env.RHC_WEB3_ACCEPTANCE_AUTHORIZED !== 'true' || process.env.RHC_WEB3_ALLOW_NETWORK_READS !== 'true' || process.env.RHC_WEB3_PROVIDER !== 'thirdweb') {
    console.error('Blocked: separate operator authorization and approved testnet configuration are required. No read attempted.');
    process.exitCode = 2; return;
  }
  const provider = createReadProvider(process.env, 'connected');
  const status = await provider.getReadStatus();
  if (status.configuration !== 'valid' || status.source !== 'thirdweb_testnet') {
    console.error(`Blocked: ${status.diagnosticCode || 'preview disabled'}. No read attempted.`);
    process.exitCode = 2; return;
  }
  const start = performance.now();
  const result = await provider.getTokenSnapshot();
  console.log(JSON.stringify({ durationMs: performance.now() - start, cache: 'cold process', result }, null, 2));
  if (!result.data) process.exitCode = 1;
}
main().catch(() => { console.error('Read check failed. Raw provider errors are suppressed.'); process.exitCode = 1; });
