/**
 * OFF-25 preparation ONLY. Pure, disconnected comparison of one read snapshot
 * against an invented synthetic reference. Not part of @rhc/web3 exports.
 *
 * No signed issuer specification, production approval, or provider is present.
 * A matching result CANNOT establish an official RHC asset or authorize a read.
 */
import type { Web3ReadResult } from '@rhc/types';

export const SYNTHETIC_REFERENCE_SCOPE = 'OFFLINE_TEST_FIXTURE_ONLY' as const;

export interface SyntheticTokenReference {
  readonly scope: typeof SYNTHETIC_REFERENCE_SCOPE;
  readonly chainId: number;
  readonly contractAddress: `0x${string}`;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
}

export type IdentityField = 'chainId' | 'contractAddress' | 'name' | 'symbol' | 'decimals';
export type SyntheticComparison = 'UNVERIFIABLE' | 'MISMATCH' | 'MATCHES_SYNTHETIC_FIXTURE';
export type IdentityReason =
  | 'NO_ISSUER_APPROVAL'
  | 'INVALID_SYNTHETIC_REFERENCE'
  | 'INVALID_READ_SOURCE'
  | 'MISSING_PINNED_OBSERVATION'
  | 'REQUIRED_METADATA_UNAVAILABLE'
  | 'METADATA_DIFFERENT'
  | 'SYNTHETIC_VALUES_AGREE';

export interface SyntheticIdentityResult {
  readonly comparison: SyntheticComparison;
  readonly reason: IdentityReason;
  readonly mismatchedFields: readonly IdentityField[];
  readonly officialTokenVerified: false;
  readonly issuerSignatureVerified: false;
  readonly releaseAuthorized: false;
  readonly scope: typeof SYNTHETIC_REFERENCE_SCOPE;
}

function result(
  comparison: SyntheticComparison,
  reason: IdentityReason,
  fields: readonly IdentityField[] = [],
): SyntheticIdentityResult {
  return Object.freeze({
    comparison,
    reason,
    mismatchedFields: Object.freeze([...fields]),
    officialTokenVerified: false as const,
    issuerSignatureVerified: false as const,
    releaseAuthorized: false as const,
    scope: SYNTHETIC_REFERENCE_SCOPE,
  });
}

function validAddress(address: unknown): address is `0x${string}` {
  return typeof address === 'string' &&
    /^0x[0-9a-fA-F]{40}$/.test(address) &&
    !/^0x0{40}$/i.test(address);
}

function validName(value: unknown): value is string {
  // The offline test vector must be printable ASCII; no normalization or
  // visually confusable characters are silently treated as equivalents.
  return typeof value === 'string' &&
    value.length >= 1 && value.length <= 80 &&
    /^[\x20-\x7e]+$/.test(value) &&
    value === value.trim();
}

function validSymbol(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9]{1,12}$/.test(value);
}

function validReference(value: SyntheticTokenReference): boolean {
  return value.scope === SYNTHETIC_REFERENCE_SCOPE &&
    Number.isSafeInteger(value.chainId) && value.chainId > 0 &&
    validAddress(value.contractAddress) && validName(value.name) &&
    validSymbol(value.symbol) &&
    Number.isInteger(value.decimals) &&
    value.decimals >= 0 && value.decimals <= 255;
}

/**
 * Compare **invented** input vectors. No network, SDK, environment reads,
 * signature verification, token approval, or writes. A matching vector is
 * intentionally never an official-token decision.
 */
export function compareSyntheticTokenMetadata(
  snapshot: Web3ReadResult | null,
  expected: SyntheticTokenReference | null,
): SyntheticIdentityResult {
  if (!expected) return result('UNVERIFIABLE', 'NO_ISSUER_APPROVAL');
  if (!validReference(expected)) return result('UNVERIFIABLE', 'INVALID_SYNTHETIC_REFERENCE');
  if (!snapshot || snapshot.source !== 'thirdweb_testnet' ||
    snapshot.configuration !== 'valid' ||
    !['fresh', 'partial'].includes(snapshot.snapshot)) {
    return result('UNVERIFIABLE', 'INVALID_READ_SOURCE');
  }
  if (!snapshot.block || snapshot.block.finality !== 'observed' ||
    !/^(0|[1-9][0-9]*)$/.test(snapshot.block.number) ||
    typeof snapshot.block.hash !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(snapshot.block.hash) ||
    !Number.isSafeInteger(snapshot.chain?.id) ||
    !validAddress(snapshot.contractAddress)) {
    return result('UNVERIFIABLE', 'MISSING_PINNED_OBSERVATION');
  }
  const fields = snapshot.data;
  if (!fields ||
    fields.name?.status !== 'observed' ||
    fields.symbol?.status !== 'observed' ||
    fields.decimals?.status !== 'observed' ||
    typeof fields.name.value !== 'string' ||
    typeof fields.symbol.value !== 'string' ||
    !Number.isInteger(fields.decimals.value) ||
    fields.decimals.value < 0 || fields.decimals.value > 255) {
    return result('UNVERIFIABLE', 'REQUIRED_METADATA_UNAVAILABLE');
  }
  const drift: IdentityField[] = [];
  if (snapshot.chain?.id !== expected.chainId) drift.push('chainId');
  if (snapshot.contractAddress.toLowerCase() !== expected.contractAddress.toLowerCase()) drift.push('contractAddress');
  if (fields.name.value !== expected.name) drift.push('name');
  if (fields.symbol.value !== expected.symbol) drift.push('symbol');
  if (fields.decimals.value !== expected.decimals) drift.push('decimals');
  if (drift.length) return result('MISMATCH', 'METADATA_DIFFERENT', drift);
  return result('MATCHES_SYNTHETIC_FIXTURE', 'SYNTHETIC_VALUES_AGREE');
}
