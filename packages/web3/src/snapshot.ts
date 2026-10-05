import type { Web3Field, Web3ReadResult, Web3TokenData } from '@rhc/types';
import type { ReadConfig } from './config';
export const observed = <T>(value: T): Web3Field<T> => ({ status: 'observed', value });
export const unavailable = <T>(): Web3Field<T> => ({ status: 'unavailable', value: null });
export const unsupported = <T>(): Web3Field<T> => ({ status: 'unsupported', value: null });
export function emptyResult(config: ReadConfig): Web3ReadResult {
  const approval = config.approval;
  return {
    source: config.source, connection: !config.valid ? 'not_configured' : 'disabled',
    configuration: !config.valid ? 'invalid' : config.enabled ? 'valid' : 'disabled',
    snapshot: 'absent', capability: 'read_only', restrictionAssessment: 'not_assessed',
    diagnosticCode: config.code, chain: approval ? { id: approval.id, name: approval.name } : null,
    contractAddress: approval?.contractAddress ?? null,
    explorerUrl: approval ? `${approval.explorerOrigin.replace(/\/$/, '')}/address/${approval.contractAddress}` : null,
    data: null, observedAt: null, lastSuccessAt: null, lastAttemptAt: null, block: null,
    inactiveCapabilities: ['customer_wallets', 'transfers', 'rewards', 'sponsorship', 'public_release'],
  };
}
export function formatAmount(value: bigint, decimals: number): string {
  if (value < 0n || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Invalid amount');
  if (!decimals) return value.toString();
  const digits = value.toString().padStart(decimals + 1, '0');
  const fraction = digits.slice(-decimals).replace(/0+$/, '');
  return `${digits.slice(0, -decimals)}${fraction ? `.${fraction}` : ''}`;
}
export function boundText(value: string): string {
  // Strip untrusted control and bidi characters rather than interpreting metadata markup.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, 120);
}
export function amountField(value: Web3Field<bigint>, decimals: Web3Field<number>): Web3TokenData['totalSupply'] {
  return value.status === 'observed' ? observed({ raw: value.value.toString(), formatted: decimals.status === 'observed' ? formatAmount(value.value, decimals.value) : null }) : { status: value.status, value: null };
}
