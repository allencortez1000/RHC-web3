# RHC Digital Project Status Summary

_Last updated: 2026-09-21_

## Current position

**Month 1 Local MVP technically complete and ready for internal acceptance/UAT.**

The project is a multi-portal RHC Digital local MVP/product prototype with a shared navy/gold design system, public discovery pages, a customer portal, an admin command center, and an isolated local demo fixture hub. This status applies to the local demo/product-prototype boundary only; it is not production-ready and does not authorize live provider, payment, token, wallet, blockchain, or connected-mode launch.

The internal design-system codename remains **RHC Meridian** for internal documentation and source organization. Normal customer-facing UI uses public RHC language such as **RHC Digital**, **RHC Admin**, and **RHC**.

## Main applications

| Area | Location | Local URL | Current role |
| --- | --- | --- | --- |
| Public/customer web | `apps/customer-web` | `http://127.0.0.1:3002` | Public marketing/discovery, customer portal, local demo fixture API |
| Admin web | `apps/admin-web` | `http://127.0.0.1:3003` | Admin command center and workflow operations |
| API | `apps/api` | Default `4000` | Real Nest API boundary for connected mode; not used by `dev:demo` |
| Shared UI | `packages/ui` | Package | Shared shells, tokens, runtime/auth forms, UI primitives |
| Shared types | `packages/types` | Package | Demo contracts and shared type definitions |
| Database package | `packages/database` | Package | Database/migration-related package for connected phases |

## Implemented Month 1 local MVP

### Public RHC Digital

Implemented and validated for the local MVP:

- Public home/landing experience
- Marketplace discovery with accessible filters and empty state
- Ecosystem discovery and service-request preview controls
- RHC Verify/public verification paths
- Help center
- Future Technology page
- Token concept presentation at `/future-technology#future-token`
- `/token` redirect to the governed Future Technology section
- Responsive navigation and public terminology checks

Token artwork remains at:

```text
apps/customer-web/public/images/rhc-token-front.png
apps/customer-web/public/images/rhc-token-back.png
```

The token section is explicitly concept-only and inactive. It does not imply issuance, wallet custody, exchange, staking, payments, ownership, investment value, or conversion.

### Customer portal

Implemented and validated local demo workflows include:

- Authentication by named persona and demo credential shortcut
- Dashboard
- Profile/account data
- RHC Digital ID
- Property records
- Reservations and status/history
- Payment evidence/status records
- Documents and document versions
- RHC Points balance, history, redemptions, and authorized adjustments
- Certificates and public references
- Service requests
- Notifications/history where implemented
- Logout/session behavior

RHC Digital ID and certificates are company-issued demo/account records only. They are not government ID, land title, legal ownership proof, or production identity verification.

### Admin command center

Implemented and validated local demo workspaces include:

- Admin authentication
- Dashboard
- Customers/users
- Companies/projects/properties
- Reservations
- Payments
- Documents
- Certificates
- Service requests
- Rewards ledger
- Reports
- Roles/user roles
- Settings/governance-related workspaces
- Operational history/audit views where implemented

Existing navigation either routes to an implemented local-MVP workspace or is clearly bounded as unavailable/future functionality.

### Shared local demo world

The fixture hub lives in the customer Next app:

```text
apps/customer-web/app/api/demo/[...segments]/route.ts
apps/customer-web/app/lib/demo/router.ts
apps/customer-web/app/lib/demo/store.ts
apps/customer-web/app/lib/demo/seed.ts
```

The persistent local world is stored in:

```text
.rhc-demo/world.json
```

Validated behavior:

- Explicit demo mode only via `npm run dev:demo`
- No Supabase, Postgres, live API, wallet, RPC, payment gateway, email, SMS, storage provider, or external provider required
- Shared reads/writes between customer and admin apps
- State persists across refreshes and normal restarts
- Reset restores canonical seed data
- Corrupt/missing/unsupported state fails safely or recovers through explicit reset
- Demo sessions use local opaque tokens, not Supabase sessions

### Demo authentication

Demo credentials work only in explicit demo mode:

| Account | Email | Password | Maps to | Destination |
| --- | --- | --- | --- | --- |
| Customer demo | `demo@rhc.local` | `Demo123456!` | Maya Santos | Customer dashboard |
| Admin demo | `superadmin@example.com` | `Demo123456!` | Elena Garcia / system admin | Admin command center |

If the login page reports missing Supabase public configuration, the app is running in connected mode rather than demo mode. Stop it and run:

```sh
npm run dev:demo
```

Demo credentials are not Supabase, Nest API, production, or database credentials.

## Tested during final Month 1 closure

The following checks passed during the final closure pass:

```sh
npm run typecheck -w @rhc/ui
npm run lint -w @rhc/ui

npm run typecheck -w @rhc/customer-web
npm run lint -w @rhc/customer-web

npm run typecheck -w @rhc/admin-web
npm run lint -w @rhc/admin-web

npm run typecheck -w @rhc/api
npm run lint -w @rhc/api

npm run typecheck -w @rhc/types
npm run lint -w @rhc/types

npm run typecheck -w @rhc/database
npm run lint -w @rhc/database

npm run test -w @rhc/api -- --runInBand
npm run test:e2e -w @rhc/api -- --runInBand
npm run test:demo:store
npm run test:demo
npm run test:demo:browser
```

Editor/project diagnostics were refreshed after the final fixes and reported no errors or warnings.

## Implemented vs tested vs blocked

### Implemented

- Public RHC Digital experience
- Customer local portal workflows
- Admin local command-center workflows
- Shared UI/tokens/runtime foundation
- Demo credential bridge
- Local persistent demo world
- Demo reset and recovery paths
- Reports page and synthetic export/print behavior
- Demo RBAC/persona boundaries
- Future Technology/token concept boundary

### Tested

- Static typecheck/lint for UI, customer, admin, API, types, and database packages
- API unit and e2e suites
- Demo store tests
- Demo HTTP smoke tests
- Browser smoke/E2E acceptance across public, customer, admin, responsive widths, auth, shared-world workflows, and console/request gates
- Security/RBAC review within the local fixture architecture

### Blocked / external decision required

No Critical or High Month 1 local-MVP blocker remains from this repository pass.

External approvals remain required before production or connected-mode release, including legal/compliance, security, finance, provider, deployment, monitoring, and UAT sign-off.

### Deferred to Month 2 / connected mode

- Real Supabase integration and production auth policy
- Production database, migrations, transactions, concurrency, and backup/restore evidence
- Real Nest API contracts for all connected workflows
- Private object storage and document security controls
- Email/SMS/provider notifications
- Live payment gateway or reconciliation integrations, if approved
- Production monitoring, logging, alerting, runbooks, and deployment
- Formal accessibility, cross-browser, performance, privacy, security, and UAT sign-off

### Future technology only

- Public token issuance
- Wallet custody
- Crypto payments
- Exchange
- Staking
- Tokenized ownership/title
- Blockchain transaction execution or public-network anchoring

## Security and product boundaries

- RHC Points are fictional centralized demo points; they are not money, crypto, investment value, merchant settlement, or a conversion promise.
- Payment records are demo evidence/status records only; no real collection, gateway, settlement, refund, or crypto payment is implemented.
- Documents use demo text/version records only; no production object storage or provider scanning is implemented.
- Public verification exposes only approved synthetic/demo references and must not be treated as legal, governmental, financial, or blockchain proof.
- Connected-mode authentication remains separate from the demo fixture bridge.

## Important docs

| Document | Purpose |
| --- | --- |
| `docs/design-system.md` | Design-system principles, tokens, components, vocabulary, and accessibility baseline |
| `docs/route-coverage.md` | Current customer/admin route coverage and route-boundary notes |
| `docs/demo-guide.md` | How the local demo works and what workflows it supports |
| `docs/phase-2-handoff.md` | Handoff notes for connected-mode/live-provider work |
| `docs/validation-report.md` | Final Month 1 validation and test results |
| `docs/project-status-summary.md` | This summary |

## How to run the local MVP

### Start demo

```sh
npm run dev:demo
```

Open:

```text
http://127.0.0.1:3002
http://127.0.0.1:3002/login
http://127.0.0.1:3003
```

### Reset demo state

```sh
npm run demo:reset
```

### Re-run validation

```sh
npm run typecheck -w @rhc/ui
npm run lint -w @rhc/ui
npm run typecheck -w @rhc/customer-web
npm run lint -w @rhc/customer-web
npm run typecheck -w @rhc/admin-web
npm run lint -w @rhc/admin-web
npm run test:demo:store
npm run test:demo
npm run test:demo:browser
```

## Current overall status

The Month 1 Local MVP is technically complete and ready for internal UAT/acceptance. It should not be described as production-ready. The next major phase is connected-mode implementation and formal acceptance with real providers, infrastructure, security controls, and business approvals.