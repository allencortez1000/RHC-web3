# Rabino Holdings Corporation Digital Platform

Month 1 foundation for the RHC Digital & Web3 Ecosystem pilot, initially supporting Amica Residences Tower 1.

## Scope

This repository contains the implemented/prepared Month 1 foundation only; operational acceptance remains gated:

- Supabase/PostgreSQL database model through Prisma migrations
- Supabase Auth JWT verification and server-side Auth identity confirmation with NestJS authorization enforcement
- RHC Digital ID issuance
- Customer profiles and customer-property relationships
- Company-scoped RBAC and permissions
- RHC corporate ecosystem and business-service catalog
- Amica Tower 1 project and property inventory foundation
- Consent, feature flags, activity events, audit logging
- Rewards/RHC Points data foundation with rewards disabled by default
- Customer Portal and Admin Command Center
- CI, Docker/deployment preparation, opt-in OpenAPI, fixture-based tests, and Month 1 documentation

Public token, token sale, staking, custody, exchange, and production blockchain deployment are intentionally out of scope for Month 1.

## Current status: prepare-only, staging NO GO

The implementation is extensive, but it is **not deployed or live-accepted**. Main reports **210 unit tests / 11 suites** and **140 API tests / 8 suites** passing with fixtures/test doubles only. Final frontend reruns are pending (approximately 55 customer and 65 admin tests); these are not confirmed pass counts.

All **four migrations remain pending**. RLS/revocations are migration source, not applied protection. The prior configuration check rejected database URL syntax; no connection target, role, or grants have been verified. Do not migrate staging until a valid target and role/grants are approved and the migration chain is verified on disposable PostgreSQL. Live verification and separate release approval remain mandatory. Docker and a local Node 22 runtime run are unverified; the preparation host used Node 24.

See the [targeted completion report](docs/month-1/targeted-completion-report.md), [acceptance gates](docs/month-1/acceptance-validation.md), and [known limitations](docs/month-1/known-limitations.md). Historical hardening reports are not current acceptance evidence.

## Repository layout

```text
apps/customer-web    Customer Portal (Next.js)
apps/admin-web       Admin Command Center (Next.js)
apps/api             NestJS API
packages/database    Prisma schema, migrations, seeds
packages/types       Shared TypeScript contracts and enums
packages/validation  Shared Zod schemas
packages/config      Environment validation
packages/shared      Shared utilities
packages/ui          Shared React/Tailwind components
contracts            Month 2 blockchain boundary documentation only
docs                 Architecture, API, database, security, Month 1 docs
infrastructure       Docker and deployment notes
```

## Quick start

Use Node.js 22.13+ (CI and Docker use Node 22) and npm 10+. The locked Supabase SDK requires Node 22 or newer.

```bash
npm ci
npm run dev
```

`npm run dev` starts only the customer portal. Start other applications in separate terminals:

| Application | Command                         | Default URL           |
| ----------- | ------------------------------- | --------------------- |
| Customer    | `npm run dev`                   | http://localhost:3000 |
| Admin       | `npm run dev -w @rhc/admin-web` | http://localhost:3002 |
| API         | `npm run dev -w @rhc/api`       | http://localhost:4000 |

Before starting the API from a clean checkout, generate the Prisma client and build shared libraries:

```bash
npm run db:generate
npm run build:shared
```

Generation creates local client code; it does not apply migrations or seed a database. Coordinate generation with the schema owner while schema changes are in progress. The API resolves shared packages through their compiled `dist` entry points, so rebuild shared libraries after changing them.

Configure application environment variables before using Supabase authentication or database-backed API routes. There is no opaque UUID bearer-token or runtime mock fallback: API startup rejects `USE_MOCK_DATA=true`. Tests explicitly replace provider boundaries; missing credentials must not become demo success. The legacy `dev:mock` command is only an alias for `dev`, not a mock mode.

This hardening handoff is **prepare-only**: do not deploy, migrate, seed, or bootstrap production identities as part of dependency installation or validation. See [the dependency/configuration report](docs/month-1/dependency-hardening-report.md) for exact versions, audit results, and pending validation.

## Common commands

```bash
npm run audit:runtime
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run validate
```

## Environment

Use `.env.example` files as inventories, not runtime files. Next.js reads frontend-local environment files (for example, `apps/customer-web/.env.local`). API startup uses Node's `process.loadEnvFile` before validation/provider imports to load optional root `.env`, then `apps/api/.env`; precedence is **runtime injection > root `.env` > API `.env`**, including injected empty values. Other CLIs (including admin bootstrap) do not automatically inherit that loader.

Frontends require `NEXT_PUBLIC_API_URL` including `/api/v1`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback). Server-side Supabase identity confirmation needs `SUPABASE_SECRET_KEY`; never put it, database credentials, or Redis tokens in `NEXT_PUBLIC_*`. Do not commit local environment files; Docker excludes them from its build context. See [environment/proxy hardening](docs/month-1/proxy-env-hardening.md).

Confirmation/recovery uses same-browser PKCE code exchange, not implicit/hash-token links. Supabase email confirmation (`auth_email_confirmed_at`) is separate from business verification, which starts `PENDING`. Approval requires a reviewed admin action; approved/issued identity fields cannot be self-edited, except `mobile_number`. `GET /auth/config` gates the registration UI and new API provisioning, **not direct Supabase signup**; disable signup or implement an approved Auth hook externally when signup must be closed.

`npm run test` invokes the API Jest suite; it does not represent frontend unit coverage. Browser checks run through `npm run test:e2e`. See [testing](docs/month-1/testing.md) and [Render preparation](infrastructure/deployment/render.md).

## Month 2 handoff

See `docs/month-1/month-2-handoff.md` for Wallet, RHC Points activation, Marketplace, Web3 Gateway, and blockchain extension points.
