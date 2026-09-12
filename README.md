# Rabino Holdings Corporation Digital Platform

Month 1 foundation for the RHC Digital & Web3 Ecosystem pilot, initially supporting Amica Residences Tower 1.

## Scope

This repository implements the operational Month 1 foundation only:

- Supabase/PostgreSQL database model through Prisma migrations
- Supabase Auth integration boundary with NestJS authorization enforcement
- RHC Digital ID issuance
- Customer profiles and customer-property relationships
- Company-scoped RBAC and permissions
- RHC corporate ecosystem and business-service catalog
- Amica Tower 1 project and property inventory foundation
- Consent, feature flags, activity events, audit logging
- Rewards/RHC Points data foundation with rewards disabled by default
- Customer Portal and Admin Command Center
- CI/CD, Docker, OpenAPI, tests, and Month 1 documentation

Public token, token sale, staking, custody, exchange, and production blockchain deployment are intentionally out of scope for Month 1.

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

```bash
npm install
npm run dev
```

Local development runs with mock data automatically when no `DATABASE_URL` is configured, so you can open the system without Supabase/PostgreSQL credentials.

Default local URL:

```text
RHC Web3 System: http://localhost:3002
```

`npm run dev` intentionally starts only one local port: `3002`.

If port `3002` is already occupied, stop the other process or run:

```bash
npm run free:admin-port
npm run dev
```

For real database development:

```bash
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

For local development without paid external services, mock data is used by default. SMS, email, object storage, Sentry, Upstash, and Supabase are accessed through abstractions and can be configured later. To force mock mode even when a database URL exists, set `USE_MOCK_DATA=true`; to force real database mode, set `USE_MOCK_DATA=false` with valid database credentials.

## Common commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run validate
```

## Environment

All applications load environment from their respective `.env.example` files plus the root `.env.example`. No production secrets are committed.

## Month 2 handoff

See `docs/month-1/month-2-handoff.md` for Wallet, RHC Points activation, Marketplace, Web3 Gateway, and blockchain extension points.
