# Month 1 Testing

## Prepare-only validation

Use Node 22.13+ and npm 10+. Coordinate broad runs with the schema/application owners during parallel work. The preparation host ran Node 24.21.0; a local Node 22 run is not established. Dependency-specific results in [the hardening report](dependency-hardening-report.md) are historical snapshots, not the latest application verdict.

```bash
npm ci
npm run audit:runtime
npm run db:generate
npm run lint
npm run typecheck
npm run test -w @rhc/api -- --runInBand
npm run test:e2e -w @rhc/api -- --runInBand
npm run build
npx playwright install chromium
npm run test:e2e -w @rhc/customer-web
npm run test:e2e -w @rhc/admin-web
```

`db:generate` generates local Prisma client code only. Do not run migrations, seeds, deployment commands, or identity bootstrap as part of this validation. Live-environment acceptance requires a separately approved plan and credentials.

## What the commands actually cover

- Root `test` runs the API's Jest suite. Workspaces without unit tests no longer contain successful `echo` placeholders.
- API and browser test commands no longer allow missing tests to pass. Current API suites exercise controllers/security behavior with explicit provider/Prisma/Redis doubles, rather than treating route-string discovery as acceptance. They do not execute the PostgreSQL migrations, constraints, row/advisory locks, or real Supabase/Redis services.
- Frontend Playwright suites are browser tests, not component typechecks. They use customer port **3000** and admin port **3002**. `--list` only checks discovery, not browser behavior.
- Locally, Playwright builds and starts its application unless a server is already running at the configured URL. In CI, applications must already be built, servers are started from those artifacts, and existing servers are never reused. CI forbids focused tests and retains failure traces.
- Root `typecheck` builds shared libraries before checking workspaces. API TypeScript and Node now resolve compiled workspace entry points, while Next retains explicit source aliases for UI/types.
- `npm run validate` runs lint, typecheck, API tests, and builds. It does **not** include the runtime audit or browser/E2E suites; CI runs those separately.

## CI

`.github/workflows/ci.yml` uses Node 22, `npm ci`, a runtime high/critical audit gate, Prisma client generation, lint, typecheck, API Jest and E2E runners, production builds, and both Chromium browser suites. It installs Chromium system dependencies and uploads browser failure artifacts.

There is no CI-wide `USE_MOCK_DATA=true` or `NODE_ENV=test`. `NODE_ENV=test` applies only to API test steps. Tests may explicitly inject controlled test doubles, but the workflow must not silently turn the whole application into a mock implementation or depend on production services/secrets.

Browser installation downloads binaries and may require network access. Supabase-backed acceptance is separate from the local/CI fixture-based test run and must not use production data.

## Current handoff status

The following results were **reported by main for this handoff**, not rerun during the documentation refresh:

| Validation | Latest supplied status | Boundary |
| --- | --- | --- |
| API unit Jest | **210 passed / 11 suites** | Fixtures/test doubles only. |
| API request/E2E Jest | **140 passed / 8 suites** | Fixture-backed HTTP/security checks, not live database/provider acceptance. |
| Customer Playwright | **Final rerun pending; approximately 55 tests expected** | Do not publish as 55 passed; browser/API/Auth fixtures are not a live Supabase workflow. |
| Admin Playwright | **Final rerun pending; approximately 65 tests expected** | Do not publish as 65 passed; management changes need final browser results. |
| Final lint/typecheck/build/audit | **Await main's final command evidence** | Earlier dependency checks/build failures are historical, not a current pass/fail verdict. |
| Node 22 / Docker | **Not established locally / Docker not tested** | Host Node 24 results do not validate Node 22 or a container image. |
| Migrations / live acceptance | **Not run; four migrations pending** | No applied RLS/revocations, live PostgreSQL, Supabase, Redis, or ingress evidence. |

The prior configuration check rejected database URL syntax; it did not establish connectivity or an approved target. Staging migrations remain **NO GO** until target roles/grants are approved and the chain is validated on disposable PostgreSQL. No deployment is authorized by fixture test counts.

Record final commands, exact counts, runtime, revision/snapshot, and failures/skips in the [pending final-result section](targeted-completion-report.md#pending-final-result-main-to-update). Do not replace pending entries with discovery counts or recycle historical results as fresh validation.
