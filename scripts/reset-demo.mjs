import { link, lstat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const deployments = [process.env.NODE_ENV, process.env.VERCEL_ENV, process.env.RHC_ENVIRONMENT, process.env.APP_ENV];
if (
  deployments.some((value) => ['production', 'staging', 'preview'].includes((value || '').toLowerCase())) ||
  (process.env.RHC_APP_PROFILE !== undefined && process.env.RHC_APP_PROFILE !== 'demo') ||
  (process.env.RHC_DEMO_MODE !== undefined && process.env.RHC_DEMO_MODE !== '1')
) {
  console.error('Demo reset is unavailable outside local development. No store was changed.');
  process.exit(1);
}
if (process.argv[2] !== 'RESET RHC DEMO') {
  console.error('Reset cancelled. Run: npm run demo:reset -- "RESET RHC DEMO"');
  process.exit(1);
}

const cwd = process.cwd();
const root = path.basename(cwd) === 'customer-web' ? path.resolve(cwd, '../..') : cwd;
const directory = process.env.RHC_DEMO_STORE_DIR ? path.resolve(process.env.RHC_DEMO_STORE_DIR) : path.join(root, '.rhc-demo');
const store = path.join(directory, 'world.json');

try {
  const entry = await lstat(store).catch((error) => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (entry) {
    if (!entry.isFile()) throw new Error('world.json must be a regular file, not a directory or symbolic link. Inspect the path manually.');
    const backup = path.join(directory, `world.backup-${Date.now()}-${randomUUID()}.json`);
    // Exclusive, same-filesystem backup preserves even malformed/unreadable bytes
    // without a delete-before-backup window. This is not a cross-process lock.
    await link(store, backup);
    await unlink(store);
    console.log(`Confirmed demo reset. Original store preserved at: ${backup}`);
  } else {
    console.log('No demo store exists; no files were changed.');
  }
  console.log('Stop/restart the demo servers before continuing. The next local demo request will initialize the deterministic baseline.');
} catch (error) {
  console.error(`Demo reset failed (${error?.code || 'INVALID_STORE_PATH'}): ${error.message}`);
  console.error(`Inspect ${store} and its directory permissions. No existing backup was overwritten.`);
  process.exitCode = 1;
}
