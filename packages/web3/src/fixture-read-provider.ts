import type { ReadConfig } from './config';
import type { ReadProvider } from './read-provider';
import { emptyResult, observed, unsupported } from './snapshot';
export function fixtureReadProvider(config: ReadConfig): ReadProvider {
  const result = () => ({ ...emptyResult(config), source: 'synthetic' as const, connection: 'ready' as const,
    snapshot: 'fresh' as const, diagnosticCode: 'SYNTHETIC_DEMO', observedAt: new Date().toISOString(),
    data: { name: observed('Synthetic Demo Token'), symbol: observed('DEMO'), decimals: observed(6),
      totalSupply: observed({ raw: '12345678901234567890123456', formatted: '12345678901234567890.123456' }),
      cap: unsupported<{ raw: string; formatted: string | null }>(), paused: unsupported<boolean>() } });
  return { getTokenSnapshot: async () => result(), getReadStatus: async () => result() };
}
