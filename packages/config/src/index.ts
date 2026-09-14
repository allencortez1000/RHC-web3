import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_JWKS_URL: z.string().url().optional(),
  JWT_AUDIENCE: z.string().min(1).default('authenticated'),
  JWT_ISSUER: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  USE_MOCK_DATA: z.enum(['true', 'false']).default('false'),
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  CUSTOMER_WEB_URL: z.string().optional(),
  ADMIN_WEB_URL: z.string().optional(),
  API_URL: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3002'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type RhcEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): RhcEnv {
  const env = envSchema.parse(source);
  const nonDevelopment = env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';
  if (nonDevelopment) {
    if (env.USE_MOCK_DATA === 'true') throw new Error('USE_MOCK_DATA is not allowed outside development or test');
    for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_JWKS_URL', 'JWT_ISSUER', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const) {
      if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  return env;
}
