# Month 1 Deliverables

## Implemented/prepared in the repository

- Monorepo with Customer Web, Admin Web, NestJS API, shared packages, Prisma database package, CI, Docker/deployment preparation and documentation.
- PostgreSQL domain schema and **four pending migrations**, including identity/history/ledger reconciliation and application PostgREST lockdown. Migration source is not deployed protection.
- Seed definitions for eight RHC companies, AMICA-T1 and marked sample inventory; **no target seeding is claimed**.
- Supabase SDK browser auth with PKCE confirmation/recovery, backend JWT verification and authoritative Auth Admin confirmation. No opaque UUID bearer tokens or runtime mock fallback.
- Separate Auth confirmation timestamp and business verification; reviewed approval, guarded/idempotent RHC ID issuance, and approved-identity self-edit protection with mobile contact updates allowed.
- API-backed customer profile, property relationships, directory, notifications and append-only consent history; explicit loading/empty/error/disabled states rather than successful fixture fallback.
- Scoped admin lists/dashboard and validated company/project/property/relationship mutations; global user status/verification, role/assignment/permission management; integration/service metadata, typed settings and feature controls. Admin reference data is not authorization.
- Company-bound hashed machine credentials, delegated scopes, one-time issue/rotation, revocation, safe metadata reads, consent-bound identity checks and idempotent allowlisted event receipts.
- Backend authorization, transactional audit/activity evidence, response envelopes, redaction, and wired Redis IP plus authenticated user/client rate limits.
- Disabled RHC Points/rewards data foundation and inactive future-feature surfaces; no active token/wallet/marketplace/blockchain product.
- Substantive unit/API/browser fixture suites; see [testing](testing.md) for the exact supplied results versus pending reruns.

## Not delivered as operational acceptance

No deployment, migration application, production identity bootstrap, live provider acceptance, or applied RLS/revocation verification occurred in this handoff. Staging migrations remain **NO GO**: the prior database URL syntax check failed and target/role/grants approval, disposable PostgreSQL migration execution, and live verification remain outstanding. Docker and local Node 22 validation are unestablished; frontend final reruns are pending.

This implementation inventory does not certify the historical documentation, test assertions, infrastructure configuration, or every business workflow as complete. Use the [targeted completion report](targeted-completion-report.md) and [acceptance checklist](acceptance-validation.md) as the current handoff, not a blanket Month 1 completion claim.
