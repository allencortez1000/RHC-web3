import type { Web3ReadResult } from '@rhc/types';

// Local browser-safe observations only. Never import a connector, SDK, or environment config.
export function createSyntheticWeb3ReadResult(observedAt: string): Web3ReadResult {
  return {
    source: 'synthetic',
    connection: 'degraded',
    snapshot: 'partial',
    capability: 'read_only',
    restrictionAssessment: 'not_assessed',
    configuration: 'valid',
    diagnosticCode: 'SYNTHETIC_PARTIAL_FIXTURE',
    chain: null,
    contractAddress: null,
    explorerUrl: null,
    data: {
      name: { status: 'observed', value: 'Synthetic Demo Token' },
      symbol: { status: 'observed', value: 'DEMO' },
      decimals: { status: 'observed', value: 18 },
      totalSupply: { status: 'observed', value: { raw: '1000000000000000000000000', formatted: '1000000' } },
      cap: { status: 'unsupported', value: null },
      paused: { status: 'unavailable', value: null },
    },
    observedAt,
    lastSuccessAt: null,
    lastAttemptAt: observedAt,
    block: null,
    inactiveCapabilities: ['customer_wallets', 'transfers', 'rewards', 'sponsorship', 'public_release'],
  };
}
