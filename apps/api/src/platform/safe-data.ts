import { Prisma } from '@prisma/client';

const sensitive = /password|token|secret|authorization|otp|private.?key|credential|api.?key|cookie|email|mobile|phone|birth|address|first.?name|last.?name|middle.?name/i;
export function safeData(input: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (depth > 12) return '[TRUNCATED]';
  if (input === null || input === undefined) return null;
  if (input instanceof Date) return input.toISOString();
  if (input instanceof Prisma.Decimal) return input.toString();
  if (Array.isArray(input)) return input.slice(0, 200).map((value) => safeData(value, depth + 1));
  if (typeof input === 'object') return Object.fromEntries(Object.entries(input).slice(0, 200).map(([key, value]) => [key, sensitive.test(key) ? '[REDACTED]' : safeData(value, depth + 1)]));
  if (typeof input === 'string') return input.slice(0, 4000);
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input === 'boolean') return input;
  return String(input);
}
