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

The implementation is extensive, but it is **not deployed or live-accepted**. The final local rerun passed **217 API unit tests / 13 suites**, **143 API request/E2E tests / 8 suites**, **55 customer browser tests**, and **65 admin browser tests** using fixtures or intercepted synthetic providers only. These results are local engineering evidence, not production or UAT acceptance.

All **five migrations remain pending**. RLS/revocations are migration source, not applied protection. The prior configuration check rejected database URL syntax; no connection target, role, or grants have been verified. Do not migrate staging until a valid target and role/grants are approved and the migration chain is verified on disposable PostgreSQL. Live verification and separate release approval remain mandatory. Docker and a local Node 22 runtime run are unverified; the preparation host used Node 24.

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

`npm run dev` starts the two frontend applications in the normal connected-development profile. It does not start or emulate the API:

| Application | Command                | Default URL           |
| ----------- | ---------------------- | --------------------- |
| Customer    | `npm run dev:customer` | http://localhost:3002 |
| Admin       | `npm run dev:admin`    | http://localhost:3003 |
| API         | `npm run dev:api`      | http://localhost:4000 |
| All live    | `npm run dev:all`      | ports above           |

For the intentional self-contained local presentation profile, use:

```bash
npm run dev:demo
```

On Windows, `npm.cmd run dev:demo` is equivalent when invoking npm directly. Demo mode starts only the customer and admin frontends at `http://127.0.0.1:3002` and `http://127.0.0.1:3003`, hosts a loopback-only fixture hub under the customer app, and persists synthetic state in ignored `.rhc-demo/` files. It does not initialize Supabase, the Nest API, PostgreSQL, Redis, storage, payments, wallet/RPC providers, email, or SMS. It is refused outside the explicit local demo profile. See `docs/demo-guide.md`.

Before starting the API from a clean checkout, generate the Prisma client and build shared libraries:

```bash
npm run db:generate
npm run build:shared
```

Generation creates local client code; it does not apply migrations or seed a database. Coordinate generation with the schema owner while schema changes are in progress. The API resolves shared packages through their compiled `dist` entry points, so rebuild shared libraries after changing them.

Configure application environment variables before using Supabase authentication or database-backed API routes. Connected mode remains fail-closed: missing credentials never become successful fixture responses, and API startup still rejects `USE_MOCK_DATA=true`. The explicit frontend-only `dev:demo` profile uses mock-only opaque sessions and a local fixture hub; those sessions are never accepted by the real API. `dev:mock` is retained only as a compatibility alias for `dev:demo`.

This hardening handoff is **prepare-only**: do not deploy, migrate, seed, or bootstrap production identities as part of dependency installation or validation. See [the dependency/configuration report](docs/month-1/dependency-hardening-report.md) for exact versions, audit results, and pending validation.

## Common commands

```bash
npm run audit:runtime
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run test:demo:store
npm run test:demo
npm run test:demo:browser
npm run validate
```

## Environment

Use `.env.example` files as inventories, not runtime files. Next.js reads frontend-local environment files (for example, `apps/customer-web/.env.local`). API startup uses Node's `process.loadEnvFile` before validation/provider imports to load optional root `.env`, then `apps/api/.env`; precedence is **runtime injection > root `.env` > API `.env`**, including injected empty values. Other CLIs (including admin bootstrap) do not automatically inherit that loader.

Frontends require `NEXT_PUBLIC_API_URL` including `/api/v1`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback). Server-side Supabase identity confirmation needs `SUPABASE_SECRET_KEY`; never put it, database credentials, or Redis tokens in `NEXT_PUBLIC_*`. Do not commit local environment files; Docker excludes them from its build context. See [environment/proxy hardening](docs/month-1/proxy-env-hardening.md).

Confirmation/recovery uses same-browser PKCE code exchange, not implicit/hash-token links. Supabase email confirmation (`auth_email_confirmed_at`) is separate from business verification, which starts `PENDING`. Approval requires a reviewed admin action; approved/issued identity fields cannot be self-edited, except `mobile_number`. `GET /auth/config` gates the registration UI and new API provisioning, **not direct Supabase signup**; disable signup or implement an approved Auth hook externally when signup must be closed.

`npm run test` invokes the API Jest suite; it does not represent frontend unit coverage. Browser checks run through `npm run test:e2e`. See [testing](docs/month-1/testing.md) and [Render preparation](infrastructure/deployment/render.md).

## Month 2 handoff

See `docs/month-1/month-2-handoff.md` for Wallet, RHC Points activation, Marketplace, Web3 Gateway, and blockchain extension points.
