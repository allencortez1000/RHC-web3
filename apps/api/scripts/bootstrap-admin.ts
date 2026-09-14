import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const optionsSchema = z.object({
  'user-id': z.string().uuid().optional(),
  'supabase-user-id': z.string().uuid(),
  'confirm-email': z.string().email().transform((email) => email.toLowerCase()),
  'confirm-database-host': z.string().min(1),
  'confirm-grant': z.literal('GRANT_SUPER_ADMIN').optional(),
  apply: z.boolean().default(false),
}).strict();
export type BootstrapOptions = z.infer<typeof optionsSchema>;

export function parseOptions(args: string[]): BootstrapOptions {
  const values: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i].replace(/^--/, '');
    if (!args[i].startsWith('--') || key in values) throw new Error('Invalid or duplicate argument');
    if (key === 'apply') values[key] = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('Missing argument value');
      values[key] = value;
    }
  }
  return validateOptions(values);
}

function validateOptions(values: unknown) {
  const options = optionsSchema.parse(values);
  if (options.apply && options['confirm-grant'] !== 'GRANT_SUPER_ADMIN') throw new Error('Explicit grant confirmation is required');
  return options;
}

export async function verifySupabaseIdentity(subject: string, email: string) {
  z.string().uuid().parse(subject);
  const base = new URL(z.string().url().parse(process.env.SUPABASE_URL));
  const secret = z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY);
  const local = ['development', 'test'].includes(process.env.NODE_ENV ?? '') && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && local)) || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Invalid Supabase server URL');
  try {
    const response = await fetch(new URL(`/auth/v1/admin/users/${subject}`, base), {
      headers: { Authorization: `Bearer ${secret}`, apikey: secret },
      redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Identity lookup failed');
    const identity = z.object({
      id: z.string().uuid(), email: z.string().email(),
      email_confirmed_at: z.string().datetime({ offset: true }),
      is_anonymous: z.boolean().optional(),
      banned_until: z.string().datetime({ offset: true }).nullable().optional(),
      deleted_at: z.string().datetime({ offset: true }).nullable().optional(),
    }).parse(await response.json());
    const confirmedAt = new Date(identity.email_confirmed_at);
    if (identity.id !== subject || identity.email.toLowerCase() !== email.toLowerCase() || confirmedAt > new Date() || identity.is_anonymous || identity.deleted_at || (identity.banned_until && new Date(identity.banned_until) > new Date())) throw new Error('Identity mismatch');
    return { subject: identity.id, email: identity.email.toLowerCase(), confirmedAt };
  } catch {
    // Never include the Auth response, service secret, email or upstream diagnostics.
    throw new Error('Live Supabase identity verification failed');
  }
}

export async function bootstrapAdmin(prisma: PrismaClient, options: BootstrapOptions, databaseUrl: string) {
  options = validateOptions(options);
  const url = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== options['confirm-database-host']) throw new Error('Database host confirmation does not match');
  if (process.env.USE_MOCK_DATA === 'true') throw new Error('A real database and Supabase identity are required');
  // Even dry runs and already-granted users must pass a fresh server-side lookup.
  const identity = await verifySupabaseIdentity(options['supabase-user-id'], options['confirm-email']);
  const requestId = randomUUID();
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Nullable global-grant uniqueness needs serialization; retry stale serializable snapshots.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(734821906)`;
        const linked = await tx.user.findUnique({ where: { supabase_user_id: identity.subject }, include: { profile: true } });
        let user = options['user-id'] ? await tx.user.findUnique({ where: { id: options['user-id'] }, include: { profile: true } }) : linked;
        if (options['user-id'] && !user) throw new Error('Explicit application user not found');
        if (linked && user?.id !== linked.id) throw new Error('Supabase subject already belongs to another application user');
        const emailMatches = await tx.user.findMany({ where: { email: { equals: identity.email, mode: 'insensitive' } }, select: { id: true }, take: 2 });
        if (emailMatches.length > 1 || emailMatches.some((match) => match.id !== user?.id)) throw new Error('Email collision; only an explicitly selected matching unlinked user may be linked');
        if (user && (user.email.toLowerCase() !== identity.email || (user.supabase_user_id && user.supabase_user_id !== identity.subject))) throw new Error('Application identity mismatch');
        if (user && ['DISABLED', 'LOCKED'].includes(user.account_status)) throw new Error('Disabled or locked application users require manual review');

        const roles = await tx.role.findMany({ where: { code: 'SUPER_ADMIN', company_id: null, is_system: true }, include: { role_permissions: { include: { permission: true } } } });
        if (roles.length !== 1 || !['role.manage', 'user.manage', 'integration.manage', 'feature_flag.manage'].every((code) => roles[0].role_permissions.some((grant) => grant.permission.code === code))) throw new Error('Exactly one preconfigured SUPER_ADMIN role with required permissions is required');
        const role = roles[0];
        const existing = user ? await tx.userRole.findMany({ where: { user_id: user.id, role_id: role.id, company_id: null, project_id: null } }) : [];
        if (existing.length > 1) throw new Error('Duplicate grants require manual review');
        if (existing.length && existing[0].expires_at !== null) throw new Error('An expiring grant requires manual review');
        const operation = !user ? 'create_user' : !user.supabase_user_id ? 'link_user' : 'existing_user';
        if (!options.apply) return { status: 'dry_run', operation, would_grant: existing.length ? null : 'SUPER_ADMIN', ...(user ? { user_id: user.id } : {}) };

        const audit = (action: string, entityType: string, entityId: string, data: Prisma.InputJsonObject = {}) => tx.auditLog.create({ data: { action, actor_role: 'BOOTSTRAP_CLI', entity_type: entityType, entity_id: entityId, request_id: requestId, after_data: data } });
        // The main-owned schema/client must contain this field. No fallback to business verification.
        const authData = { auth_email_confirmed_at: identity.confirmedAt };
        if (!user) {
          user = await tx.user.create({ data: { ...authData, supabase_user_id: identity.subject, email: identity.email, account_status: 'ACTIVE', verification_status: 'PENDING', profile: { create: { email: identity.email, account_status: 'ACTIVE', verification_status: 'PENDING' } } }, include: { profile: true } });
          await audit('admin.bootstrap.user_create', 'user', user.id);
        } else {
          const previousConfirmation = (user as typeof user & { auth_email_confirmed_at?: Date | null }).auth_email_confirmed_at;
          if (!user.supabase_user_id || previousConfirmation?.getTime() !== identity.confirmedAt.getTime()) {
            user = await tx.user.update({ where: { id: user.id, AND: [{ supabase_user_id: user.supabase_user_id }] }, data: { ...authData, ...(!user.supabase_user_id ? { supabase_user_id: identity.subject } : {}) }, include: { profile: true } });
            await audit(operation === 'link_user' ? 'admin.bootstrap.user_link' : 'admin.bootstrap.auth_confirm', 'user', user.id);
          }
          if (!user.profile) {
            const profile = await tx.userProfile.create({ data: { user_id: user.id, email: user.email, account_status: user.account_status, verification_status: user.verification_status } });
            await audit('admin.bootstrap.profile_create', 'user_profile', profile.id);
          }
        }
        if (existing.length) return { status: 'already_granted', user_id: user.id };
        const grant = await tx.userRole.create({ data: { user_id: user.id, role_id: role.id } });
        await audit('admin.bootstrap', 'user_role', grant.id, { user_id: user.id, role_id: role.id });
        return { status: 'granted', user_id: user.id };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (attempt >= 2 || !(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2034', 'P2002'].includes(error.code)) throw error;
    }
  }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Dry run by default; always verifies the subject through the live Supabase Admin API. Required: --supabase-user-id UUID --confirm-email EMAIL --confirm-database-host HOST. Optional --user-id UUID explicitly selects an existing unlinked user. To write, also pass --apply --confirm-grant GRANT_SUPER_ADMIN. Uses DIRECT_URL, SUPABASE_URL, SUPABASE_SECRET_KEY. May create/link an application user; never creates roles or permissions or changes existing business statuses.');
    return;
  }
  const options = parseOptions(process.argv.slice(2));
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) throw new Error('A real DIRECT_URL is required');
  const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try { console.log(JSON.stringify(await bootstrapAdmin(prisma, options, directUrl))); }
  finally { await prisma.$disconnect(); }
}

if (require.main === module) main().catch(() => {
  console.error('Bootstrap refused or failed. Check explicit confirmations, live Supabase identity, application identity collisions, existing role/grants, schema/client version, and database availability.');
  process.exitCode = 1;
});
