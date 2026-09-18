import { ServiceUnavailableException } from '@nestjs/common';

export type ErrorLogCategory = 'validation' | 'authentication' | 'authorization' | 'rate_limit' | 'conflict' | 'business_rule' | 'provider_unavailable' | 'database_unavailable' | 'internal_error';

export type ControlledErrorLogMetadata = {
  category: ErrorLogCategory;
  internal_code: string;
  provider?: 'supabase';
  operation?: string;
  provider_status?: number;
};

const CONTROLLED_ERROR_METADATA = Symbol('rhc.controlled-error-metadata');

type MetadataCarrier = { [CONTROLLED_ERROR_METADATA]?: unknown };

const categories = new Set<ErrorLogCategory>([
  'validation', 'authentication', 'authorization', 'rate_limit', 'conflict',
  'business_rule', 'provider_unavailable', 'database_unavailable', 'internal_error',
]);

function safeCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9_.:-]{1,96}$/.test(value);
}

function safeOperation(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,96}$/.test(value);
}

export class ControlledServiceUnavailableException extends ServiceUnavailableException {
  readonly [CONTROLLED_ERROR_METADATA]: ControlledErrorLogMetadata;

  constructor(metadata: ControlledErrorLogMetadata = { category: 'provider_unavailable', internal_code: 'SERVICE_UNAVAILABLE' }) {
    super('Service temporarily unavailable');
    this[CONTROLLED_ERROR_METADATA] = { ...metadata };
  }
}

export class ProviderUnavailableException extends ControlledServiceUnavailableException {}

export function getControlledErrorLogMetadata(exception: unknown): ControlledErrorLogMetadata | undefined {
  if (!exception || typeof exception !== 'object') return undefined;
  const value = (exception as MetadataCarrier)[CONTROLLED_ERROR_METADATA];
  if (!value || typeof value !== 'object') return undefined;
  const metadata = value as Record<string, unknown>;
  if (!categories.has(metadata.category as ErrorLogCategory) || !safeCode(metadata.internal_code)) return undefined;

  const result: ControlledErrorLogMetadata = {
    category: metadata.category as ErrorLogCategory,
    internal_code: metadata.internal_code,
  };
  if (metadata.provider === 'supabase') result.provider = 'supabase';
  if (safeOperation(metadata.operation)) result.operation = metadata.operation;
  if (typeof metadata.provider_status === 'number' && Number.isInteger(metadata.provider_status) && metadata.provider_status >= 100 && metadata.provider_status <= 599) {
    result.provider_status = metadata.provider_status;
  }
  return result;
}
