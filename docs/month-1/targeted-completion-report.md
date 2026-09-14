# Month 1 Targeted Completion Report

Documentation handoff: **2026-09-14**. **Prepare-only; staging migrations NO GO; no deployment.**

This report records the targeted implementation and final local validation on main at `dcc60d0` plus the uncommitted changes from this pass. It is not live acceptance or a certification of staging infrastructure. Final commands below were executed successfully; no staging services or database were changed.

## Executive status

| Area | Current state | Not established |
| --- | --- | --- |
| Authentication | Real Supabase JWT/JWKS verification plus server-only Auth Admin identity confirmation; no UUID bearer or runtime mock fallback. | Live project signing/configuration, provider availability and email flows. |
| Identity | Separate `auth_email_confirmed_at`; new business `PENDING`; reviewed approval, guarded ID issuance, approved identity lock with mobile edits allowed. | Live concurrency, migration constraints and operational review acceptance. |
| Browser auth | Same-browser PKCE code exchange for confirmation/recovery; implicit/hash-token links rejected. | Actual redirect/template/delivery behavior on approved origins. |
| Admin/customer | API-backed ownership/scoped lists, validated CRUD and global management, reference selectors, consent history and audit/events. | Live multi-tenant workflows; browser tests use intercepted fixtures. |
| Machine integration | Hashed company keys, delegated scopes, rotation/revocation, consent-bound verification and idempotent service-event receipts. | Live partner acceptance, delivery workers or business/ledger settlement. |
| Redis/proxy | Global IP and verified user/client limiting are wired; explicit CIDR validation exists. | Live Redis/multi-instance results and real proxy topology. |
| Database | Four migrations prepared, including public application-table RLS/revocation lockdown with no FORCE RLS. | Any applied migration/RLS/revocation or approved target/role/grants. |
| Validation | 210 unit tests, 140 API tests, 55 customer and 65 admin Playwright tests passed. All three builds, lint, typecheck, Prisma validation and audits passed. | Live PostgreSQL/provider testing, Node 22 and Docker runtime checks. |

The prior configuration check rejected database URL syntax. This report intentionally contains **no connection strings, credentials, secret values or live user identities**. A syntax failure is not a failed connectivity test and does not establish which database would be targeted.

## Implementation now reflected in the docs

### Authentication, registration and identity

- Supabase SDK performs browser password/signup/logout/recovery. Nest exposes `GET /auth/config` and protected `GET /auth/session`, not the obsolete POST password endpoints.
- `SupabaseJwtService` verifies ES256/RS256 signature, issuer, audience and required claims, then obtains authoritative identity/email confirmation from the Auth Admin API. Authentication does not trust browser metadata or an internal user UUID as a token.
- `ApplicationUserService` synchronizes the linked subject and `auth_email_confirmed_at`. It preserves existing business/account state and denies disabled/locked users. New provisioning checks `ENABLE_REGISTRATION`, creates business `PENDING`, and records evidence transactionally.
- `GET /auth/config` is a no-store registration precheck for the frontend. **Raw Supabase signup remains outside this flag**: externally disable provider signup or install an approved Auth hook when signup must be closed. The API cannot impose its Redis limits on direct Supabase requests.
- Both frontends use `flowType: 'pkce'` with URL auto-session detection disabled. Confirmation/recovery exchanges one query code using the browser's stored verifier; implicit access/refresh-token and token-hash links are rejected. Request and completion must share the same browser/storage context; invalid recovery does not fall back to an existing session.
- `POST /admin/users/:id/verification/approve` requires global `user.manage`, no self-approval, active confirmed linked identity, expected business status and `review_reference`. Approval updates user/profile and audit/event evidence together. Email confirmation or bootstrap does not substitute for this business review.
- `POST /me/rhc-id` requires enabled issuance, confirmed email, active account and business `VERIFIED`; it allocates an ID transactionally/idempotently. Approved/issued identity fields are not self-editable through `PATCH /me`, with `mobile_number` the only permitted contact change. A separate reviewed identity-correction workflow remains future work.

### Scoped lists, admin management and consent

- Resource-scoped permissions are resolved from database resources and actor grants; tenant list filters/metrics cannot expand access. Global role/user/settings governance is not delegated merely by possessing a company-local role.
- Strict DTOs validate create/update bodies, query filters, identifiers, dates and allowlisted settings. Company/project/property/customer-property mutations, integration/service metadata, feature flags, user status, roles, role permissions and role assignments are implemented; this is not unrestricted CRUD for every table.
- Admin management uses API-backed reference selectors, including the users endpoint. Displaying/selecting a user does not approve them: activation/assignment checks require active/confirmed/linked state as applicable, and business verification has its own approval action. External review references, expected-state checks, protected system roles and self-management restrictions remain authoritative in the API.
- `/me/consents` reads policy/history and appends grants/withdrawals with purpose/version/company constraints and audit/events. Inactive-company withdrawal remains possible. Signup checkbox metadata alone is not a persisted consent-history row or legal policy acceptance programme.
- A `month_1_acceptance_state` setting is typed metadata; setting it to `accepted` cannot authorize migration/deployment or replace these acceptance gates.

### Machine keys and integration receipts

- Company API keys use random secrets with stored `sha256:v1` hashes, timing-safe comparison, one-time issue/rotation disclosure and revocation. Lists omit credential hashes/secrets. Keys never become browser/user JWT sessions.
- Every issued/rotated scope requires the actor's corresponding company-wide rights; project-only grants cannot delegate whole-company scopes. Supported scopes are `company.read`, `projects.read`, `properties.read`, `identity.verify`, `events.write`.
- Company directory routes expose safe metadata. Internal identity verification returns a boolean, not customer PII, and requires issued identity, active confirmed account and current company data-sharing consent.
- Internal event ingestion uses UUID idempotency keys, strict event types/source/timestamps, enabled company events and additional service consent when identity-associated. Replays recheck applicable consent/account/allowlist state. Receipts/activity do not execute rewards postings, trusted business transitions or blockchain operations.

### Redis, environment and runtime

- The global pre-auth guard uses Express-resolved IP/socket fallback, not raw forwarding headers. Both `AuthGuard` and `CompanyApiGuard` call `consumeAuthenticated` only after successful identity/client resolution. Hashed stable-subject buckets supplement IP ceilings; excess returns 429/`Retry-After`, Redis failure 503/fail-closed. Process liveness is explicitly exempt; readiness is not.
- `TRUSTED_PROXY_CIDRS` is explicit validated IP/CIDR input; blank means no proxy trust. Real socket peers, ingress alternatives, header rewriting and direct-access restrictions require manual infrastructure evidence. No Render range, broad private alias, boolean trust or hop count has been assumed.
- API startup loads optional root `.env`, then `apps/api/.env` using Node `process.loadEnvFile` before validation/provider imports. Precedence is **injected runtime > root `.env` > API `.env`**, including empty injected values. `loadEnv(source)` remains pure; non-missing-file loader errors and startup failures are sanitized.
- Staging/production validation requires PostgreSQL URLs, Supabase server/JWKS/issuer, Redis and explicit HTTPS frontend/CORS configuration. URL syntax checks prove neither TLS/connectivity nor target identity/privileges. Secret files were not inspected during this docs pass; field requirements were read from source. API startup rejects `USE_MOCK_DATA=true` rather than falling back to fixtures.
- Node **22.13+** / npm **10+** is the supported design baseline; CI/Docker use Node 22. The preparation host used Node **24.21.0** / npm **11.19.0**. Do not claim a local Node 22 run from that evidence. Docker was unavailable in dependency preparation; no image build/container startup is established.
- Current bootstrap suppresses Nest framework logs and uses a 30-second startup watchdog. Health/readiness is not full Auth/security acceptance; safe operational logging and incident visibility need review.

## Database and migration release gate

All four migrations remain pending:

1. `202609110001_month1_foundation`
2. `202609120001_month1_auth_ledger_hardening`
3. `202609140001_identity_history_seed_hardening`
4. `202609140002_application_postgrest_lockdown`

The third migration adds the distinct confirmation timestamp, global-role partial uniqueness, history-preserving foreign keys and ledger ownership/index reconciliation. Existing conflicting records require explicit review, not silent merging. Static Prisma/schema review does not execute these constraints.

The fourth enables RLS on an explicit allowlist of 26 application tables in `public` and revokes direct table/column/owned-sequence privileges from `PUBLIC`, `anon` and `authenticated` where present. **It is not applied; no deployed RLS/revocations are claimed.**

- **No FORCE ROW LEVEL SECURITY:** owners retain normal bypass. No browser policies or new runtime/service grants are created. Owner/service backend access through the API is intended, not assumed proven.
- A non-owner Prisma SQL role needs explicit privileges plus `BYPASSRLS` or deliberately approved backend-only policies. Existing `service_role` grants remain unchanged; a service JWT is not a SQL role grant.
- Review ownership, inherited/column/direct grants, existing policies, exposed views, `SECURITY DEFINER` RPCs and all actual creator/runtime roles. Direct revocations do not close every indirect access path.
- Default ACL revocations affect objects subsequently created by `CURRENT_ROLE`; global defaults affect that creator across schemas. Existing auth/storage/system objects are not modified. Future application tables need explicit RLS enablement. Prisma diff cannot validate ACLs/policies.

**Required sequence:** securely correct/approve the target and migration/runtime role/grant plan; obtain authorization for disposable PostgreSQL execution; apply and verify the entire chain there, including representative client-role denial and intended backend access; review results before separately authorizing staging migration; then perform approved live verification and release review. Until the target/role/disposable gates pass, **staging migration remains NO GO**. Live acceptance and deployment approval remain separate even after a successful migration exercise.

Seeds/sample inventory and admin bootstrap are not install/build/startup/predeploy actions. Seed definitions do not prove any target was seeded; sample inventory is opt-in via `SEED_SAMPLE_INVENTORY=true` and must not be mistaken for real production inventory.

## Admin bootstrap CLI (reviewed, not executed)

Source: `apps/api/scripts/bootstrap-admin.ts`. There is **no `bootstrap-admin` package-script alias** in the API manifest. With repository dependencies already installed, the source CLI help can be invoked from the repository root as:

```sh
npm exec --offline --workspace @rhc/api -- tsx scripts/bootstrap-admin.ts --help
```

This docs pass inspected the help branch and argument parser; it did not execute bootstrap. `--help` returns before client creation/provider calls. **Every non-help invocation, including the default dry run and an already-granted user, performs a fresh live Supabase Auth Admin lookup and database transaction/read/locking operations.** Do not include a dry run in offline validation.

Exact argument contract (space-separated flags/values, no invented email/role aliases):

| Argument | Requirement |
| --- | --- |
| `--supabase-user-id UUID` | Required Auth subject UUID. |
| `--confirm-email EMAIL` | Required matching email, normalized lowercase. |
| `--confirm-database-host HOST` | Required exact hostname match against `DIRECT_URL` (not a whole URL or port). |
| `--user-id UUID` | Optional explicit existing application-user selection; required when intentionally linking a matching unlinked row rather than creating a new user. |
| `--apply` | Optional boolean switch enabling writes; absent means dry run, not offline. |
| `--confirm-grant GRANT_SUPER_ADMIN` | Required with `--apply`; exact literal confirmation. |
| `--help` | Prints help and exits before provider/database operations. |

Unknown/duplicate flags and missing values are rejected by the normal parser. Inject `DIRECT_URL`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` securely; this CLI does **not** call the API's local env-file loader. Do not place secrets in command-line arguments or docs. URL-host confirmation alone does not prove database/role/grant correctness or authorize an operation.

The operator must have approved target/role/schema/client state and exactly one preconfigured global system `SUPER_ADMIN` role with required permissions. Bootstrap never creates roles or permissions, never trusts a UUID/email without the live Admin API response, and refuses identity collisions, disabled/locked users and ambiguous/expiring existing grants. It may create/link an application user and profile, synchronize Auth confirmation and grant/audit `SUPER_ADMIN`; new business status stays `PENDING`, existing business/account statuses are not changed. Privilege is not granted by ordinary signup or seed identity creation. Live bootstrap acceptance is pending and separately authorized.

## Test evidence and historical reports

Final execution passed **210 unit tests / 11 suites**, **140 API tests / 8 suites**, **55 customer Playwright tests**, and **65 admin Playwright tests**. Local JWKS/Auth/Redis transport peers exercise real adapters and guards; database behavior uses test doubles and browser API/Auth calls are intercepted. These do not establish live PostgreSQL lock/concurrency behavior, applied RLS/ACLs, email delivery, real ingress attribution or deployment success. An earlier customer browser timeout passed in the full final rerun; no final suite failed or skipped.

The [dependency hardening report](dependency-hardening-report.md) preserves earlier version/audit/compatibility observations and application build failures as historical evidence. It is not a current application blocker list or fresh audit. The [proxy/environment report](proxy-env-hardening.md) now reflects completed authenticated-limit wiring but retains the unresolved live topology/runtime caveats.

## Final validation result

Executed on host Node `24.21.0`, npm `11.19.0`, from `main` at `dcc60d0` plus this pass's uncommitted changes. Original working tree was clean. Main remains one commit ahead of origin; no commits or pushes were created. Terminal tool output contains command evidence.

| Final result | Status to update |
| --- | --- |
| `npm.cmd install` | PASS; lockfile current, 933 packages audited. npm reports six unapproved install-script notices; generation/build succeeded, no blanket approval performed. |
| `npm.cmd run db:generate` | PASS; Prisma Client 5.22.0 generated locally. |
| `npx.cmd prisma format` / `npx.cmd prisma validate` | PASS from packages/database with existing env loading; neither applies migrations. |
| `npm.cmd run typecheck` | PASS across workspaces, including prerequisite shared builds. |
| `npm.cmd run lint` | PASS; deprecated next-lint and TypeScript parser compatibility warnings fixed. |
| `npm.cmd test` | PASS; 210 tests / 11 suites. |
| `npm.cmd run test:e2e` — API Jest | PASS; 140 tests / 8 suites. |
| `npm.cmd run test:e2e` — Customer Playwright | PASS; 55 tests, no skips/failures. |
| `npm.cmd run test:e2e` — Admin Playwright | PASS; 65 tests, no skips/failures. |
| `npm.cmd run build:customer` | PASS; Next.js 15.5.25 production build with shared prerequisites. |
| `npm.cmd run build:admin` | PASS; Next.js 15.5.25 production build with shared prerequisites. |
| `npm.cmd run build:api` | PASS; TypeScript build, actual entry apps/api/dist/main.js. |
| `npm.cmd audit` | PASS; 0 vulnerabilities including development dependencies. |
| `npm.cmd audit --omit=dev` | PASS; 0 runtime vulnerabilities. |
| Merge-marker scan / unmerged paths / diff whitespace | PASS; no unresolved markers or unmerged paths; diff check passes with Git LF/CRLF notices. |
| CSS and PNG asset diff against checkpoint | No changes; existing theme styles and artwork preserved. |
| Node 22 runtime / Docker image and container | Pending; host Node 24 and Docker source review are not execution evidence. |
| Target / migration-runtime roles / grants approval | Pending; previous URL syntax invalid, no target verified. |
| Disposable PostgreSQL migration/constraint/ACL/concurrency tests | Pending authorization and execution; all four migrations remain unapplied in this handoff. |
| Staging migration authorization | **NO GO** until approved valid target/roles/grants and disposable verification. |
| Live Supabase / Redis / PostgREST / actual ingress acceptance | Pending separately approved nonproduction execution. |
| Deployment/release decision | **No deployment; no release sign-off.** |

## Material files and dependencies

- Identity: `apps/api/src/modules/security/{supabase-jwt,application-user}.service.ts`, `auth.guard.ts`, `modules/identity/rhc-id.service.ts`.
- Policies/management: `apps/api/src/modules/security/{permission.guard,rbac.service,feature.guard,rate-limit.guard}.ts`, `modules/admin/{admin,management}.controller.ts`, `platform/dto.ts`.
- Integration: `modules/security/company-api-key.service.ts`, `company-api.controller.ts`, `internal-integration.{controller,service}.ts`; bootstrap `apps/api/scripts/bootstrap-admin.ts`.
- Context/health: `apps/api/src/platform/{api-exception.filter,request-context.middleware,health.controller,safe-data}.ts`, `modules/security/audit.service.ts`.
- Portals: `packages/ui/src/runtime.tsx`, shared component props, both app providers/auth adapters, customer data/consent/profile screens, admin data/management/approval controls. Styles and token PNGs are unchanged.
- Database: Prisma schema/seed and two additional unapplied migration directories. Existing migrations were preserved.
- Tooling: manifests/lockfile, ESLint/TypeScript and Next/Playwright configs, CI and prepare-only Docker/deployment guidance.

Installed resolutions verified with `npm.cmd ls`:

| Package group | Final version |
| --- | --- |
| Nest common/core/platform-express/testing | 11.2.3 |
| Nest Swagger / CLI / throttler | 11.4.7 / 11.0.24 / 6.5.0 |
| Next / eslint-config-next | 15.5.25 |
| React / ReactDOM | 19.3.0 |
| TypeScript / typescript-eslint parser/plugin | 5.9.3 / 8.70.0 |
| ESLint | 8.57.1 |
| Supabase JS / JOSE / Upstash Redis | 2.116.0 / 5.10.0 / 1.38.4 |
| Prisma client/CLI | 5.22.0 |
| Compatibility-tested overrides | Multer 2.3.0; PostCSS 8.5.28 |

The final aggregate browser/API command used explicit synthetic public configuration: API `http://127.0.0.1:3001/api/v1`, Supabase `https://rhc-e2e.supabase.co`, and fixture-only publishable key. CI builds use these same non-secret fixture values. No production credentials are in browser tests.

## Documentation scope and remaining work

This pass changed only root `README.md`, `docs/**/*.md`, and deployment Markdown. It corrected obsolete auth/routes/mock claims, management/integration/consent scope, environment/proxy wiring, database-role caveats and Month 2 boundaries. Application code, configuration, migrations, unrelated docs and the external planning document were not changed. No migration/seed/bootstrap/deployment/live-service call was made.

Documentation validation performed:

- `git diff --check -- README.md docs infrastructure/deployment` passed; Git emitted only LF-to-CRLF normalization warnings for existing working-copy files.
- A local Node filesystem check passed across **15 Markdown files and 45 local links/anchors**, including the new/untracked reports, and found no trailing whitespace.
- Controller/DTO/auth/guard/config/migration/bootstrap source was inspected to reconcile claims; no application suites, CLI bootstrap, database or provider probes were run.

These are documentation checks, not application acceptance. Final application command results belong above; the [acceptance matrix](acceptance-validation.md) supplies the ordered live gates. Future product scope remains in the [Month 2 handoff](month-2-handoff.md); [known limitations](known-limitations.md) records deliberate implementation and operational gaps.
