export type Environment = Readonly<Record<string, string | undefined>>;
export type RuntimeContext = 'connected' | 'demo' | 'test';
export interface ApprovedTestnet {
  readonly id: number;
  readonly name: string;
  readonly contractAddress: `0x${string}`;
  readonly explorerOrigin: string;
  readonly optionalReads: readonly ('cap' | 'paused')[];
  readonly approvalReference: string;
}

// Intentionally empty. An environment variable is not network/contract approval.
// Add only an explicitly reviewed testnet + exact contract + explorer + ABI reference.
export const APPROVED_TESTNETS: readonly ApprovedTestnet[] = Object.freeze([]);
export interface ReadConfig {
  source: 'disabled' | 'synthetic' | 'thirdweb_testnet';
  enabled: boolean;
  valid: boolean;
  code: string | null;
  approval?: ApprovedTestnet;
  secretKey?: string;
  timeoutMs: number;
  ttlMs: number;
  maxStaleMs: number;
}
const defaults = { timeoutMs: 5000, ttlMs: 30000, maxStaleMs: 120000 };
export function readConfig(env: Environment, context: RuntimeContext, approvals = APPROVED_TESTNETS): ReadConfig {
  const base: ReadConfig = { ...defaults, source: 'disabled', enabled: false, valid: true, code: null };
  const demo = context === 'demo' || env.RHC_APP_PROFILE === 'demo' || env.RHC_DEMO_MODE === '1' || env.NEXT_PUBLIC_RHC_DATA_MODE === 'demo';
  // Connected Nest must never substitute fixtures, even when inherited demo env conflicts.
  if (demo) return context === 'connected'
    ? { ...base, valid: false, code: 'DEMO_EGRESS_BLOCKED' }
    : { ...base, source: 'synthetic', enabled: true };
  const provider = env.RHC_WEB3_PROVIDER || 'disabled';
  if (!['disabled', 'fixture', 'thirdweb'].includes(provider)) return { ...base, valid: false, code: 'INVALID_PROVIDER' };
  if (provider === 'disabled') return base;
  const source = provider === 'fixture' ? 'synthetic' : 'thirdweb_testnet';
  if (provider === 'fixture') return context === 'test'
    ? { ...base, source, enabled: true }
    : { ...base, source, valid: false, code: 'FIXTURE_NOT_ALLOWED' };
  for (const key of ['ENABLE_WEB3_READ_PREVIEW', 'RHC_WEB3_ALLOW_NETWORK_READS']) {
    if (env[key] !== undefined && !['true', 'false'].includes(env[key]!)) return { ...base, source, valid: false, code: 'INVALID_BOOLEAN' };
  }
  if (env.ENABLE_WEB3_READ_PREVIEW !== 'true') return { ...base, source };
  const invalid = (code: string): ReadConfig => ({ ...base, source, enabled: true, valid: false, code });
  if (env.RHC_WEB3_ALLOW_NETWORK_READS !== 'true') return invalid('NETWORK_READS_NOT_AUTHORIZED');
  if ((env.RHC_WEB3_NETWORK_MODE || 'testnet') !== 'testnet') return invalid('TESTNET_ONLY');
  const id = env.RHC_WEB3_CHAIN_ID || '';
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return invalid('CHAIN_NOT_CONFIGURED');
  const approval = approvals.find((chain) => chain.id === Number(id));
  if (!approval) return invalid('CHAIN_NOT_APPROVED');
  const address = env.RHC_WEB3_TOKEN_CONTRACT_ADDRESS || '';
  if (!/^0x[0-9a-fA-F]{40}$/.test(address) || /^0x0{40}$/.test(address)) return invalid('CONTRACT_NOT_CONFIGURED');
  if (address.toLowerCase() !== approval.contractAddress.toLowerCase()) return invalid('CONTRACT_NOT_APPROVED');
  try {
    const explorer = new URL(approval.explorerOrigin);
    if (explorer.protocol !== 'https:' || explorer.username || explorer.password || explorer.search || explorer.hash || explorer.pathname !== '/') return invalid('INVALID_APPROVAL');
  } catch { return invalid('INVALID_APPROVAL'); }
  if (!approval.approvalReference || !approval.name || approval.name.length > 100) return invalid('INVALID_APPROVAL');
  if (!env.THIRDWEB_SECRET_KEY || env.THIRDWEB_SECRET_KEY.length > 512 || /[\s.]/.test(env.THIRDWEB_SECRET_KEY)) return invalid('SECRET_NOT_CONFIGURED');
  const timing = (key: string, fallback: number, min: number, max: number) => {
    const value = env[key];
    return value === undefined || value === '' ? fallback : /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max ? Number(value) : NaN;
  };
  const timeoutMs = timing('RHC_WEB3_READ_TIMEOUT_MS', 5000, 100, 10000);
  const ttlMs = timing('RHC_WEB3_CACHE_TTL_SECONDS', 30, 1, 300) * 1000;
  const maxStaleMs = timing('RHC_WEB3_MAX_STALE_SECONDS', 120, 1, 3600) * 1000;
  if (![timeoutMs, ttlMs, maxStaleMs].every(Number.isFinite) || maxStaleMs < ttlMs) return invalid('INVALID_TIMING');
  return { source, enabled: true, valid: true, code: null, approval, secretKey: env.THIRDWEB_SECRET_KEY, timeoutMs, ttlMs, maxStaleMs };
}
