/** Browser-safe read observations only; no SDK, credentials, or transaction types. */
export type Web3Field<T> =
  | { status: 'observed'; value: T }
  | { status: 'unsupported' | 'unavailable'; value: null };

export interface Web3TokenData {
  name: Web3Field<string>;
  symbol: Web3Field<string>;
  decimals: Web3Field<number>;
  totalSupply: Web3Field<{ raw: string; formatted: string | null }>;
  cap: Web3Field<{ raw: string; formatted: string | null }>;
  paused: Web3Field<boolean>;
}

export interface Web3ReadResult {
  source: 'disabled' | 'synthetic' | 'thirdweb_testnet';
  connection: 'disabled' | 'not_configured' | 'ready' | 'degraded' | 'unavailable';
  snapshot: 'absent' | 'fresh' | 'stale' | 'partial';
  capability: 'read_only';
  restrictionAssessment: 'not_assessed';
  configuration: 'disabled' | 'invalid' | 'valid';
  diagnosticCode: string | null;
  chain: { id: number; name: string } | null;
  contractAddress: string | null;
  explorerUrl: string | null;
  data: Web3TokenData | null;
  observedAt: string | null;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  block: { number: string; hash: string; timestamp: string; finality: 'observed' } | null;
  inactiveCapabilities: readonly ['customer_wallets', 'transfers', 'rewards', 'sponsorship', 'public_release'];
}
