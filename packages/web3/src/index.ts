import { createHash } from 'node:crypto';
import { readConfig, type Environment, type RuntimeContext } from './config';
import { disabledReadProvider } from './disabled-read-provider';
import { fixtureReadProvider } from './fixture-read-provider';
import type { ReadProvider } from './read-provider';
import { ThirdwebReadProvider } from './thirdweb-read-provider';
export type { ReadProvider } from './read-provider';

export function createReadProvider(env: Environment, context: RuntimeContext = 'connected'): ReadProvider {
  if (typeof window !== 'undefined') throw new Error('RHC Web3 is server-only');
  let key = '';
  let provider: ReadProvider | undefined;
  const resolve = () => {
    const config = readConfig(env, context);
    // Includes source, chain, contract, timing, flags and credential rotation. Never logged/exposed.
    const nextKey = createHash('sha256').update(JSON.stringify(config)).digest('hex');
    if (nextKey !== key || !provider) {
      if (provider instanceof ThirdwebReadProvider) provider.dispose();
      key = nextKey;
      provider = !config.valid || !config.enabled ? disabledReadProvider(config)
        : config.source === 'synthetic' ? fixtureReadProvider(config)
        : new ThirdwebReadProvider(config, async (approved, signal) => {
          // SDK is not loaded during startup, disabled/fixture use, or configuration diagnostics.
          const { readSdkSnapshot } = await import('./sdk-snapshot');
          signal.throwIfAborted();
          return readSdkSnapshot(approved, signal);
        });
    }
    return provider;
  };
  return { getTokenSnapshot: () => resolve().getTokenSnapshot(), getReadStatus: () => resolve().getReadStatus() };
}
