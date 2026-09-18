import { Injectable } from '@nestjs/common';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type StructuredLogFields = {
  event: string;
  request_id?: string;
  correlation_id?: string;
  method?: string;
  route?: string;
  status?: number;
  category?: string;
  internal_code?: string;
  duration_ms?: number;
  service?: string;
  module?: string;
  provider?: string;
  operation?: string;
  provider_status?: number;
};

export type StructuredLogEntry = {
  timestamp: string;
  level: LogLevel;
  event: string;
  request_id?: string;
  correlation_id?: string;
  method?: string;
  route?: string;
  status?: number;
  category?: string;
  internal_code?: string;
  duration_ms?: number;
  service?: string;
  module?: string;
  provider?: string;
  operation?: string;
  provider_status?: number;
};

export type StructuredLogSink = (entry: StructuredLogEntry) => void;
export const ROUTE_TEMPLATE_MAX_LENGTH = 256;

const priority: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const categories = new Set(['validation', 'authentication', 'authorization', 'rate_limit', 'conflict', 'business_rule', 'provider_unavailable', 'database_unavailable', 'internal_error']);

function isLogLevel(value: string): value is LogLevel {
  return Object.prototype.hasOwnProperty.call(priority, value);
}

function safeToken(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === 'string' && value.length <= 128 && pattern.test(value) ? value : undefined;
}

function safeIdentifier(value: unknown): string | undefined {
  return safeToken(value, /^[A-Za-z0-9_-]{1,128}$/);
}

function safeRoute(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= ROUTE_TEMPLATE_MAX_LENGTH && /^\/[A-Za-z0-9_./:{}*+-]{0,255}$/.test(value) ? value : undefined;
}

function safeNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum ? Math.round(value) : undefined;
}

function defaultSink(entry: StructuredLogEntry): void {
  process.stderr.write(`${JSON.stringify(entry)}\n`);
}

@Injectable()
export class StructuredLogger {
  private readonly minimumLevel: LogLevel;

  constructor(level: string | undefined = process.env.LOG_LEVEL, private readonly sink: StructuredLogSink = defaultSink) {
    const configured = level ?? 'info';
    if (!isLogLevel(configured)) throw new Error('Invalid LOG_LEVEL');
    this.minimumLevel = configured;
  }

  debug(fields: StructuredLogFields): void { this.log('debug', fields); }
  info(fields: StructuredLogFields): void { this.log('info', fields); }
  warn(fields: StructuredLogFields): void { this.log('warn', fields); }
  error(fields: StructuredLogFields): void { this.log('error', fields); }

  private log(level: LogLevel, fields: StructuredLogFields): void {
    if (priority[level] < priority[this.minimumLevel]) return;
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event: safeToken(fields.event, /^[A-Za-z0-9_.:-]{1,128}$/) ?? 'unclassified',
    };
    const request_id = safeIdentifier(fields.request_id);
    const correlation_id = safeIdentifier(fields.correlation_id);
    const method = safeToken(fields.method, /^[A-Z]{1,16}$/);
    const route = safeRoute(fields.route);
    const status = safeNumber(fields.status, 100, 599);
    const category = typeof fields.category === 'string' && categories.has(fields.category) ? fields.category : undefined;
    const internal_code = safeToken(fields.internal_code, /^[A-Z0-9_.:-]{1,96}$/);
    const duration_ms = safeNumber(fields.duration_ms, 0, 86_400_000);
    const service = safeToken(fields.service, /^[A-Za-z0-9_.:-]{1,64}$/);
    const module = safeToken(fields.module, /^[A-Za-z0-9_.:-]{1,64}$/);
    const provider = fields.provider === 'supabase' ? fields.provider : undefined;
    const operation = safeToken(fields.operation, /^[A-Za-z0-9_.:-]{1,96}$/);
    const provider_status = safeNumber(fields.provider_status, 100, 599);

    Object.assign(entry, {
      ...(request_id ? { request_id } : {}),
      ...(correlation_id ? { correlation_id } : {}),
      ...(method ? { method } : {}),
      ...(route ? { route } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(category ? { category } : {}),
      ...(internal_code ? { internal_code } : {}),
      ...(duration_ms !== undefined ? { duration_ms } : {}),
      ...(service ? { service } : {}),
      ...(module ? { module } : {}),
      ...(provider ? { provider } : {}),
      ...(operation ? { operation } : {}),
      ...(provider_status !== undefined ? { provider_status } : {}),
    });

    try {
      this.sink(entry);
    } catch {
      // Logging is best effort and must never change the request outcome.
    }
  }
}
