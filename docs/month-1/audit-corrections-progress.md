# Month 1 Audit Corrections Progress

## Checkpoint 1 — Authorization scope and transaction consistency

- **Timestamp (UTC):** 2026-09-15 04:36:33
- **Starting branch:** `main`
- **Starting HEAD:** `4953810a22bcaf61b8c8961c2439fffafd593549`
- **Remote relation at start:** local `main` was clean and matched the reviewed commit; after `git fetch origin`, `origin/main` was at `53fc2fb` and local `main` was behind by three commits. No merge, pull, rebase, or history change was performed.
- **Pre-existing uncommitted files:** none.

## Findings evaluated

### Finding 1 — Authorization expansion through parent deletion

- **Initial status:** CONFIRMED.
- **Evidence:** the historical foundation migration used `ON DELETE SET NULL` for `roles.company_id`, `user_roles.company_id`, and `user_roles.project_id`; the nullable scopes represent broader authorization, so deletion could expand a grant.
- **Implementation status:** FIXED in the current schema definition and by a new additive migration.
- **Disposable PostgreSQL status:** BLOCKED because Docker is unavailable. The migration was not applied to any database.
- **Behavior intended by the fix:** scoped role and assignment references use `ON DELETE RESTRICT`; deletion fails instead of nulling a scope. Intentional rows with NULL scope remain unchanged.

### Finding 2 — Outer Prisma client used inside transaction authorization

- **Initial status:** CONFIRMED.
- **Implementation status:** FIXED. RBAC `grants`, `hasPermission`, and `require` accept an optional transaction-compatible client. Governance/delegation authorization reads now pass the active transaction client.
- **Disposable PostgreSQL connection-limit-1 status:** BLOCKED because Docker is unavailable. No live database connection was attempted.

## Files materially changed

- `apps/api/src/modules/admin/management.controller.ts`
- `apps/api/src/modules/security/company-api-key.service.ts`
- `apps/api/src/modules/security/rbac.service.ts`
- `apps/api/src/modules/security/rbac.service.spec.ts`
- `apps/api/test/authorization-scope-migration.spec.ts`
- `apps/api/test/management-security.spec.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/202609150001_authorization_scope_delete_restrict/migration.sql`
- `docs/month-1/audit-corrections-progress.md`

## Migration

Created, but **not applied**:

- `202609150001_authorization_scope_delete_restrict`

The migration replaces the three authorization-scope `SET NULL` foreign-key actions with `RESTRICT` and leaves intentional global assignments untouched. Historical migration files were not modified.

## Commands and results

- `git status`, branch/log/diff/unmerged checks — clean at start.
- `git fetch origin` — passed; remote advanced by three commits; no merge performed.
- `docker --version; docker info` — BLOCKED: Docker command unavailable.
- `npm.cmd run db:generate` — passed.
- `npx.cmd prisma format --schema packages/database/prisma/schema.prisma` — passed.
- Initial `npx.cmd prisma validate` — environment-only failure because the direct command did not have `DIRECT_URL` in its process environment.
- `DATABASE_URL=postgresql://127.0.0.1:5432/rhc_validation_placeholder DIRECT_URL=postgresql://127.0.0.1:5432/rhc_validation_placeholder npx.cmd prisma validate --schema packages/database/prisma/schema.prisma` — passed using synthetic loopback placeholders; no connection was made.
- Focused API tests — 15 passed across 3 suites.
- `npm.cmd run typecheck` — passed for all workspaces.
- `npm.cmd run lint` — passed for all workspaces.
- `npm.cmd test` — 214 passed across 13 suites.
- `npm.cmd run build:api` — passed.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand` — 140 passed across 8 suites.
- `git diff --check` — passed; Git reported only the normal LF/CRLF conversion warning for the Prisma schema.
- Repository merge-marker search — no matches.

## Database target

No disposable PostgreSQL target was created. Docker was unavailable, and no Supabase or other configured database URL was used for testing. No password, token, URL credential, or secret was recorded.

## Explicitly not executed

- No Supabase migration.
- No Supabase seed.
- No real Super Admin bootstrap.
- No live provider or Auth settings change.
- No deployment.
- No commit or push.

## Remaining risks and blocked checks

- PostgreSQL foreign-key behavior, rollback behavior, and authorization deletion regression remain unverified against a real disposable database until Docker or another explicitly approved isolated PostgreSQL target is available.
- `connection_limit=1` transaction behavior remains unverified for the same reason.
- Local schema/migration contract tests and mocked transaction-client tests are evidence of code intent, not proof of PostgreSQL runtime behavior.
- Local `main` remains three commits behind `origin/main`; this checkpoint intentionally did not merge newer remote frontend work.

## Next recommended checkpoint

Proceed only in a later checkpoint with Sections 5–7: sanitized structured logging, Supabase provider error classification, and Month 1 feature-lock enforcement. Before any database deployment, first run the new migration and the required deletion/connection-limit tests against a newly created disposable PostgreSQL instance, then separately verify the Supabase staging target and roles.

## Checkpoint 2 — Operational logging, provider failures, and phase locks

- **Timestamp (UTC):** 2026-09-15 06:44:33 UTC
- **Starting branch:** `main`
- **Starting HEAD:** `4953810a22bcaf61b8c8961c2439fffafd593549`
- **origin/main after fetch:** `53fc2fbe56481b2a26dc5676eff4a914548a976d`; local `main` was behind by three commits and ahead by zero. No merge, pull, rebase, commit, or push was performed. Incoming paths were frontend/tooling/package configuration only and did not overlap the Checkpoint 1 or Checkpoint 2 API/security files.
- **Pre-existing uncommitted changes:** Checkpoint 1 changes in `apps/api/src/modules/admin/management.controller.ts`, `apps/api/src/modules/security/company-api-key.service.ts`, `apps/api/src/modules/security/rbac.service.ts`, `apps/api/test/management-security.spec.ts`, `packages/database/prisma/schema.prisma`, `apps/api/src/modules/security/rbac.service.spec.ts`, `apps/api/test/authorization-scope-migration.spec.ts`, `packages/database/prisma/migrations/202609150001_authorization_scope_delete_restrict/migration.sql`, and this progress file. All were preserved.

### Findings evaluated before editing

- **Structured operational logging:** CONFIRMED missing/insufficient. `logger: false` and sanitized responses existed, but unexpected server errors had no structured safe event and startup failures used plain console output.
- **Supabase provider classification:** CONFIRMED broken. The service converted Admin API timeouts, transport failures, malformed responses, and HTTP 500–504 responses into `UnauthorizedException`.
- **Month 1 feature locks:** CONFIRMED missing. The operational guard accepted any enabled global database flag and the feature-flag mutation path had no phase policy.
- **Checkpoint 1 transaction test strengthening:** APPLICABLE. The RBAC test did not yet prove that a transaction denial could not fall back to an outer client, and a representative management governance assertion was added.

### Source implementation

- Added `StructuredLogger` with JSON-safe, allowlisted primitive fields, `LOG_LEVEL` enforcement, bounded identifiers/routes/numbers, injectable test sinks, and sink-failure isolation.
- Added controlled provider-unavailable metadata and `SupabaseProviderUnavailableException` without retaining or exposing upstream response bodies.
- Kept JWT signature/issuer/audience/claim and explicit identity rejection failures at 401. Admin identity transport failures, timeouts, malformed JSON, redirect/unexpected status, and HTTP 408/429/500/502/503/504 now fail closed at 503. JWKS transport/unavailability failures are also classified as provider-unavailable; invalid signatures and unmatched keys remain authentication rejection.
- `ApiExceptionFilter` continues returning generic sanitized 5xx responses, logs only 5xx events, uses request/correlation context and route templates, records bounded duration, and never serializes exception/request/header/body/provider objects.
- Request middleware now records a request start timestamp on the request only; it did not alter the audit/ALS persistence shape.
- Added the canonical immutable `MONTH_1_LOCKED_FEATURES` set. `FeatureService.require()` denies locked operational features even if persisted enabled, and feature-flag mutations reject requested `true` for locked keys while allowing false-to-false and true-to-false remediation.
- Added local HTTP test-harness fixtures for locked flags and provider status responses; no production database or provider configuration was changed.

### Files changed in Checkpoint 2

- `apps/api/src/main.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/security/feature.guard.ts`
- `apps/api/src/modules/security/supabase-jwt.service.ts`
- `apps/api/src/modules/security/supabase-jwt.service.spec.ts`
- `apps/api/src/platform/api-exception.filter.ts`
- `apps/api/src/platform/api-exception.filter.spec.ts`
- `apps/api/src/platform/controlled-errors.ts`
- `apps/api/src/platform/request-context.middleware.ts`
- `apps/api/src/platform/structured-logger.ts`
- `apps/api/src/platform/structured-logger.spec.ts`
- `apps/api/test/api-harness.ts`
- `apps/api/test/auth-flow.e2e-spec.ts`
- `apps/api/test/feature-locks.e2e-spec.ts`
- `apps/api/test/management-security.spec.ts`
- `apps/api/src/modules/security/feature.guard.spec.ts`

Checkpoint 1 files listed above remain uncommitted and were not recreated or discarded. No dependency manifests or migrations were changed by Checkpoint 2.

### Tests and commands

- `npm.cmd test -w @rhc/api -- --runInBand ...` focused logging/provider/feature/RBAC/management command: initial test-only redaction assertion failed because it matched the controlled event name; assertion narrowed and rerun passed **99/99** across 6 suites.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand test/auth-flow.e2e-spec.ts test/feature-locks.e2e-spec.ts`: **29/29 passed** across 2 suites.
- `npm.cmd run typecheck`: **passed** for all workspaces.
- `npm.cmd run lint`: initial run found three unnecessary regex escapes in the new route allowlist; corrected and rerun **passed** for all workspaces.
- `npm.cmd test -- --runInBand`: **257/257 passed** across 16 API unit/service suites. npm reported that the root script forwarded `--runInBand` as an unknown CLI config; Jest completed the suite successfully.
- `npm.cmd test`: **257/257 passed** across 16 API unit/service suites (exact root command).
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand`: **156/156 passed** across 9 API E2E suites.
- `npm.cmd run build:api`: **passed**.
- `git diff --check`: **passed**; only the existing Prisma LF/CRLF conversion warning was reported.
- Merge-marker search for `<<<<<<<`, `=======`, `>>>>>>>`: no matches.
- Unsafe raw error/secret logging search in tracked `apps/api`/`packages` source: no matches. Feature-lock references are confined to the canonical policy and existing false mock definitions.

### Not run / blocked

- No `npm.cmd ci` or package installation was performed.
- No frontend build or browser suite was rerun because no frontend/shared runtime source was changed.
- No disposable PostgreSQL verification was performed in Checkpoint 2; the Checkpoint 1 Docker-unavailable block remains. No Supabase or other configured database URL was contacted.
- No live Supabase/JWKS/Auth Admin, Redis, partner, Render, or Vercel operation was performed.

### Remaining risks

- PostgreSQL FK/migration behavior, RBAC transaction behavior with `connection_limit=1`, and database rollback/concurrency behavior remain source/test-double evidence only until a newly created disposable PostgreSQL target is available.
- Local `main` remains three commits behind `origin/main`; remote frontend/tooling work was intentionally not merged in this checkpoint.
- Supabase staging role/ACL/RLS and provider behavior still require separately authorized live review.

### Source implemented vs live verified

- **SOURCE IMPLEMENTED:** structured safe logging, provider 401/503 classification, Month 1 feature locks, and transaction-client regression tests are implemented and covered by local unit/API doubles.
- **LIVE VERIFIED:** none. No live provider, database, migration, seed, bootstrap, or deployment verification occurred.

## Next recommended checkpoint

Proceed only with Checkpoint 3 Sections 8–11: core pilot seed correction, company integration activation boundary, staff-role/workflow consistency, and registration contact/consent workflow. Preserve the uncommitted Checkpoint 1 and Checkpoint 2 changes and do not merge `origin/main` without an explicit integration checkpoint.

## Checkpoint 2 Review Corrections — Provider classification and policy cleanup

- **Timestamp (UTC):** 2026-09-15 08:09:17 UTC
- **Starting branch:** `main`
- **Starting HEAD:** `4953810a22bcaf61b8c8961c2439fffafd593549`
- **origin/main after fetch:** `53fc2fbe56481b2a26dc5676eff4a914548a976d`; local `main` was behind by three commits and ahead by zero. Incoming commits were `efabacd`, `8f40902`, and `53fc2fb`. Their changed paths were `.vscode/settings.json`, `.zed/settings.json`, `apps/admin-web/globals.css`, `apps/admin-web/package.json`, `apps/customer-web/globals.css`, `apps/customer-web/app/lib/supabase.ts`, `apps/customer-web/app/login/page.tsx`, `apps/customer-web/app/properties/page.tsx`, `apps/customer-web/package.json`, `package-lock.json`, `package.json`, `packages/ui/src/index.tsx`, `packages/ui/src/runtime.tsx`, and `schemas/package.schema.json`. No incoming path overlapped the files changed in this correction pass or the existing Checkpoint 1/2 API/security files. No merge, pull, rebase, commit, or push was performed.
- **Pre-existing uncommitted changes:** all Checkpoint 1/2 files shown by the opening `git status --short` were preserved. The opening state contained 15 modified tracked files and the existing untracked Checkpoint 1/2 tests, source, migration directory, and this progress file. No unrelated changes were observed. `.rhc-checkpoint2-exporter.cjs` was absent and was not recreated.

### Findings evaluated before editing

- **Admin credential error classification:** PARTIALLY FIXED. The service already had a distinct `SupabaseAdminCredentialRejectedException` and mapped Admin HTTP `401/403` to provider `503`, but the tests still expected customer `401`, and generic provider-status construction passed a number where controlled metadata was required.
- **JWKS failure classification:** PARTIALLY FIXED. The service already separated JWKS operation metadata and recognized the relevant JOSE/network failure classes, but the test suite lacked deterministic coverage for HTTP, timeout, connection, and TLS failures and used the same AbortError fixture for network and timeout labels.
- **Month 1 feature policy/test independence:** PARTIALLY FIXED. The production backing set was already private and enforced operationally, but unit/API tests and the harness still imported the removed production set instead of independently enumerating all ten locked flags.
- **Route-template limit alignment:** ALREADY FIXED in the production path by the shared `ROUTE_TEMPLATE_MAX_LENGTH` constant; boundary tests were added to protect the alignment.
- **Temporary exporter:** NOT APPLICABLE. `.rhc-checkpoint2-exporter.cjs` was absent at inspection time; no repository exporter was moved or deleted.

### Source implementation

- Corrected provider-unavailable construction so Admin identity transport/status/response-shape failures retain safe `provider_status` and the controlled `admin_identity_lookup` metadata. Admin `401/403` remain configuration/credential failures with `SUPABASE_ADMIN_CREDENTIAL_REJECTED`; Admin `404` remains a customer authentication rejection. No upstream body or credential is retained or returned.
- Added local-only Supabase JWT tests for Admin credential rejection, JWKS HTTP failure, `errors.JWKSTimeout`, connection failure, TLS certificate-validation failure, and unmatched-key authentication rejection. Network and timeout fixtures are distinct.
- Added assertions that provider failures remain fail-closed with no Admin lookup after JWKS failure and that the controlled operation is `jwks_fetch`.
- Replaced production-set imports in feature-lock tests/harness with independent explicit lists containing all ten required Month 1 locked flags. HTTP tests now exercise false-to-true rejection for every flag and false-to-false/true-to-false remediation for every flag.
- Added logging tests for Admin/JWKS controlled metadata and the shared 256-character route-template boundary. Existing generic 5xx responses and redaction behavior remain unchanged.

### Files changed in this correction pass

- `apps/api/src/modules/security/supabase-jwt.service.ts`
- `apps/api/src/modules/security/supabase-jwt.service.spec.ts`
- `apps/api/src/modules/security/feature.guard.spec.ts`
- `apps/api/test/api-harness.ts`
- `apps/api/test/auth-flow.e2e-spec.ts`
- `apps/api/test/feature-locks.e2e-spec.ts`
- `apps/api/src/platform/api-exception.filter.spec.ts`
- `apps/api/src/platform/structured-logger.spec.ts`
- `docs/month-1/audit-corrections-progress.md`

These are cumulative working-tree changes against HEAD because the files also contain preserved Checkpoint 1/2 work. No dependency manifests, migrations, schema files, frontend runtime files, or shared browser runtime files were changed in this correction pass.

### Commands and exact results

- `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, recent log, diff stats/names, and unresolved-conflict check — branch `main`, HEAD `4953810a22bcaf61b8c8961c2439fffafd593549`, no staged files, no unresolved paths; the expected uncommitted Checkpoint 1/2 inventory was preserved.
- `git fetch origin` — passed; `origin/main` is `53fc2fbe56481b2a26dc5676eff4a914548a976d`, local is behind by three commits and ahead by zero.
- Focused unit command `npm.cmd test -w @rhc/api -- --runInBand src/modules/security/supabase-jwt.service.spec.ts src/platform/api-exception.filter.spec.ts src/platform/structured-logger.spec.ts src/modules/security/feature.guard.spec.ts` — **93/93 passed across 4 suites**.
- Focused E2E command `npm.cmd run test:e2e -w @rhc/api -- --runInBand test/auth-flow.e2e-spec.ts test/feature-locks.e2e-spec.ts` — **31/31 passed across 2 suites**.
- `npm.cmd run typecheck` — **passed** for all workspaces.
- `npm.cmd run lint` — **passed** for all workspaces.
- `npm.cmd test` — **266/266 passed across 16 suites**.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand` — **158/158 passed across 9 suites**.
- `npm.cmd run build:api` — **passed**.
- `git --no-pager diff --check` — **passed**; only the existing Prisma LF/CRLF conversion warning was reported.
- Source-only searches for `<<<<<<<`/`>>>>>>>` — no matches. Review searches found no uncontrolled raw error serialization or secret-bearing structured-log fields in the production API logging path; test fixtures intentionally contain clearly synthetic secret-shaped values for redaction assertions.

### Not run / blocked

- No `npm.cmd ci` or package installation was performed.
- No frontend build or browser suite was rerun because no frontend/shared browser runtime source was changed.
- No Docker/PostgreSQL or connection-limit-1 verification was performed. The prior Docker-unavailable block remains; no configured or Supabase database URL was contacted.
- No migrations, seeds, bootstrap, live Supabase/JWKS/Auth Admin calls, Redis staging calls, partner calls, Render deployment, or Vercel deployment were performed.

### Remaining risks

- JWKS/provider classifications are covered by local doubles and a local JWKS HTTP server only; real Supabase provider behavior and TLS/network topology remain unverified.
- PostgreSQL migration/FK behavior, RBAC transaction behavior with `connection_limit=1`, database rollback/concurrency, and staging ACL/RLS behavior remain unverified.
- Local `main` remains three commits behind `origin/main`; newer remote frontend/tooling work was intentionally not merged.

### Source implemented vs live verified

- **SOURCE IMPLEMENTED:** corrected Admin credential metadata handling, deterministic JWKS failure classification coverage, independent feature-lock test fixtures, and logging boundary coverage.
- **LIVE VERIFIED:** none. No live provider, database, migration, seed, bootstrap, or deployment verification occurred.

### Explicit safety confirmations

- No merge, pull, rebase, commit, or push.
- No database migration or Supabase seed.
- No real bootstrap grant.
- No live provider settings changed.
- No deployment.
- No Month 2 feature was enabled.

## Next recommended checkpoint

Proceed only with Checkpoint 3 Sections 8–11: core pilot seed correction, company integration activation boundary, staff-role/workflow consistency, and registration contact/consent workflow. Preserve all uncommitted Checkpoint 1 and Checkpoint 2 work, and do not merge `origin/main` without an explicit integration checkpoint.

## Checkpoint 3 — Core pilot seed, activation boundary, and staff/customer workflows

- **Timestamp (UTC):** 2026-09-16T05:40:16Z
- **Starting branch:** `main`.
- **Starting HEAD:** `4953810a22bcaf61b8c8961c2439fffafd593549`.
- **origin/main after fetch:** `53fc2fbe56481b2a26dc5676eff4a914548a976d`.
- **Actual divergence:** `git rev-list --count origin/main..HEAD` returned `0`; `git rev-list --count HEAD..origin/main` returned `3`; merge base was `4953810a22bcaf61b8c8961c2439fffafd593549`. Incoming commits were `efabacd`, `8f40902`, and `53fc2fb`. Their paths are frontend/tooling/package configuration only (`.vscode/settings.json`, `.zed/settings.json`, Admin/Customer CSS and browser/auth pages, package manifests/lockfile, `packages/ui/src/index.tsx`, `packages/ui/src/runtime.tsx`, and `schemas/package.schema.json`); none overlap the Checkpoint 3 backend/database/docs source edits. No merge, pull, rebase, commit, or push was performed.
- **Reporting erratum:** earlier historical evidence incorrectly described the branch as `0/0` while listing different SHAs and three incoming commits. This record uses the actual count commands (`0 ahead / 3 behind`) and does not claim branch synchronization.

### Starting uncommitted inventory preserved

At the start there were 15 modified tracked files and 10 untracked files. The modified tracked inventory was:

- `apps/api/src/main.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/management.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/security/company-api-key.service.ts`
- `apps/api/src/modules/security/feature.guard.ts`
- `apps/api/src/modules/security/rbac.service.ts`
- `apps/api/src/modules/security/supabase-jwt.service.spec.ts`
- `apps/api/src/modules/security/supabase-jwt.service.ts`
- `apps/api/src/platform/api-exception.filter.ts`
- `apps/api/src/platform/request-context.middleware.ts`
- `apps/api/test/api-harness.ts`
- `apps/api/test/auth-flow.e2e-spec.ts`
- `apps/api/test/management-security.spec.ts`
- `packages/database/prisma/schema.prisma`

The untracked inventory at the start was the existing Checkpoint 1/2 source, tests, migration directory, and progress file:

- `apps/api/src/modules/security/feature.guard.spec.ts`
- `apps/api/src/modules/security/rbac.service.spec.ts`
- `apps/api/src/platform/api-exception.filter.spec.ts`
- `apps/api/src/platform/controlled-errors.ts`
- `apps/api/src/platform/structured-logger.spec.ts`
- `apps/api/src/platform/structured-logger.ts`
- `apps/api/test/authorization-scope-migration.spec.ts`
- `apps/api/test/feature-locks.e2e-spec.ts`
- `docs/month-1/audit-corrections-progress.md`
- `packages/database/prisma/migrations/202609150001_authorization_scope_delete_restrict/migration.sql`

No staged files or unresolved conflicts were present. Checkpoint 1/2 files were retained; `.rhc-checkpoint2-exporter.cjs` was absent and was not recreated. An external starting-content/hash snapshot was kept under `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint3-starting-snapshots` for planned non-secret files.

### Findings classified before editing

- **Core pilot seed:** CONFIRMED. `packages/database/prisma/seed.ts` created a Prisma client and ran `main()` during import, and AMICA-T1 was inside `SEED_SAMPLE_INVENTORY` logic. Existing role mappings and SUPER_ADMIN permissions could also be broadened on rerun.
- **Company integration activation:** PARTIALLY FIXED / REQUIRES BUSINESS DECISION. Runtime company/API/client/scope/event/consent/replay gates and hashed one-time credentials already exist in `apps/api/src/modules/security/company-api-key.service.ts` and `internal-integration.service.ts`. No approved dedicated partner-activation or company-event-allowlist management workflow exists; metadata status is not an activation approval.
- **Staff role/workflow consistency:** PARTIALLY FIXED. Seeded permissions are least-privilege and the customer-property linking API correctly requires both relationship management and customer visibility, but first association of an otherwise unlinked customer is blocked for tenant-only roles. Admin landing always requested `/admin/dashboard` and exposed unfiltered links, so the landing issue was CONFIRMED.
- **Registration contact:** ALREADY FIXED at the API source-of-truth boundary. Authenticated `PATCH /me` validates `UserProfile.mobile_number`, does not silently overwrite it during provisioning, does not log its value, and preserves identity locks. Signup metadata is not application verification or persisted contact evidence; an authenticated profile-completion step remains the safe flow.
- **Consent/published policy:** CONFIRMED. `consent.controller.ts` contained generic hard-coded descriptions and accepted arbitrary syntactically valid versions despite no approved legal policy catalog. Append-only history, company scope checks, withdrawals, audit, and event behavior were retained.

### Checkpoint 3 source implementation

- Refactored `packages/database/prisma/seed.ts` into injectable `runSeed(db, options)` orchestration. Prisma is constructed only inside the guarded CLI entry point and the CLI runs the helper in one transaction. Core mode now ensures the existing eight companies and AMICA-T1; sample properties are explicit opt-in and marked `synthetic-sample`. Existing rows/statuses/flags/services/settings/mappings are not reset or reconciled. Wrong-company/project collisions throw `SeedConflictError`; no users, assignments, credentials, consent, or customer-property rows are seeded.
- Added `packages/database/prisma/seed.spec.ts` and the explicit `@rhc/database` test script. Tests use injected doubles and cover core/sample modes, rerun preservation, collision rejection, customized role mappings, and no nested transaction/import side effects. No real seed CLI was run.
- Added `ConsentPolicyService` and static type/purpose definitions. Production defaults have no configured legal policy/version. New grants require an injected approved version and exact match; withdrawals remain available with historical versions even when current configuration is absent. Added controlled business-rule-unavailable metadata, API tests, and synthetic-only harness policy fixtures. No legal text/version was invented.
- Added authenticated `GET /admin/capabilities` with caller-specific effective module read permissions/scopes. Admin landing and module navigation now filter to those permissions, skip the dashboard when `company.view` is absent, and show a no-access state without granting permissions or replacing API checks. Existing styling/layout and Month 2 visuals remain intact; direct resource APIs remain authoritative.
- Added source-derived staff and integration activation documentation. The property-linking least-privilege behavior was preserved; the first-unlinked-customer handoff/permission decision remains unresolved.
- Updated current API/database/deliverable documentation to distinguish core AMICA-T1 from optional synthetic inventory and to list five pending migrations. Older report statements remain historical and received append-only current addenda.

### Files changed specifically in Checkpoint 3

Seed/database:

- `packages/database/prisma/seed.ts`
- `packages/database/prisma/seed.spec.ts`
- `packages/database/package.json`

API/policy/capability/tests:

- `apps/api/src/modules/admin/capabilities.controller.ts`
- `apps/api/src/modules/app.module.ts` (cumulative: preserved Checkpoint 2 logging plus Checkpoint 3 providers/controller)
- `apps/api/src/modules/customers/consent.controller.ts`
- `apps/api/src/modules/security/consent-policy.service.ts`
- `apps/api/src/modules/security/consent-policy.service.spec.ts`
- `apps/api/src/platform/controlled-errors.ts` (cumulative: preserved Checkpoint 2 metadata plus controlled service-unavailable base)
- `apps/api/test/api-harness.ts` (cumulative: preserved Checkpoint 2 fixtures plus synthetic consent policies)
- `apps/api/test/capabilities.e2e-spec.ts`
- `apps/api/test/consent.e2e-spec.ts`

Portal/fixture tests:

- `apps/admin-web/app/admin-data.tsx`
- `apps/admin-web/app/dashboard/page.tsx`
- `apps/admin-web/app/page.tsx`
- `apps/admin-web/tests/smoke.spec.ts`
- `apps/customer-web/app/components/consent-preferences.tsx`
- `apps/customer-web/tests/consent-registration.spec.ts`
- `apps/customer-web/tests/fixtures.ts`

Documentation:

- `docs/api/api-overview.md`
- `docs/database/schema.md`
- `docs/month-1/deliverables.md`
- `docs/month-1/acceptance-validation.md` (historical addendum)
- `docs/month-1/testing.md` (historical addendum)
- `docs/month-1/known-limitations.md` (historical addendum)
- `docs/month-1/targeted-completion-report.md` (historical addendum)
- `docs/month-1/month-2-handoff.md` (historical addendum)
- `docs/month-1/company-integration-activation.md`
- `docs/month-1/staff-role-workflow-matrix.md`
- `docs/month-1/checkpoint-4-handoff.md`
- `docs/month-1/audit-corrections-progress.md`

All files containing earlier Checkpoint 1/2 work remain cumulative working-tree changes against HEAD. No schema or migration file was changed in Checkpoint 3; the pre-existing Checkpoint 1 `schema.prisma` and additive migration were preserved.

### Validation commands and exact results

- `npm.cmd test -w @rhc/database` — **7/7 passed** through `tsx --test prisma/seed.spec.ts`.
- `npm.cmd test -w @rhc/api -- --runInBand src/modules/security/consent-policy.service.spec.ts src/modules/security/rbac.service.spec.ts src/modules/security/application-user.service.spec.ts test/management-security.spec.ts` — **38/38 passed** across 4 suites.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand test/consent.e2e-spec.ts test/capabilities.e2e-spec.ts` — **17/17 passed** across 2 suites after correcting test fixture/version/type mismatches.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand test/auth-flow.e2e-spec.ts test/internal-integration.e2e-spec.ts test/management.e2e-spec.ts test/business-verification.e2e-spec.ts test/month1.e2e-spec.ts` — **108/108 passed** across 5 suites.
- `npm.cmd run typecheck` — **passed** for all workspaces after the final edits; shared/database/API/Admin/Customer typechecks completed.
- `npm.cmd run lint` — **passed** for all workspaces after the final edits.
- `npm.cmd test` — **269/269 passed** across 17 API unit/service suites.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand` — **165/165 passed** across 10 API fixture HTTP suites.
- `npm.cmd run build:admin` — **passed**; Next.js 15.5.25 production build.
- `npm.cmd run build:customer` — **passed**; Next.js 15.5.25 production build.
- `npm.cmd run build:api` — **passed**; shared prerequisites and API TypeScript build.
- `npm.cmd run test:e2e -w @rhc/admin-web` — first attempt with existing `.env.local` endpoint values failed before fixture routing (`58/67` failed, including cascading fetch/timeouts); this was not treated as a source pass. Rerun with ephemeral synthetic public API/Supabase values and browser interception passed **67/67** across 67 tests.
- `npm.cmd run test:e2e -w @rhc/customer-web` — initial run with the changed UI and old synthetic policy fixture failed **3/55** because grants were correctly blocked without configured versions; after updating the fixture to explicit synthetic published versions, rerun passed **55/55** across 55 tests.
- `git diff --check` — **passed**; Git emitted only existing LF/CRLF normalization warnings for changed working-copy files.
- Source-only conflict-marker/security searches — no `<<<<<<<`, `=======`, or `>>>>>>>` in API source; no uncontrolled raw error serialization was found in the API logging path; no feature-lock bypass was found. Test fixtures contain only synthetic secret-shaped values and were not treated as live credentials.

### Deferred, blocked, and unresolved

- **SOURCE IMPLEMENTED:** core/sample seed separation, import-safe injected orchestration, preservation/collision behavior, consent policy/version boundary, authenticated capability endpoint, permission-aware Admin landing/navigation, role/workflow matrix, and activation/contact documentation.
- **FIXTURE TESTED:** all counts above use local injected Prisma/provider/Redis doubles, local HTTP/JWKS peers, or browser-intercepted synthetic fixtures. They do not prove PostgreSQL transactions, FK behavior, RLS/ACLs, or live provider behavior.
- **LIVE VERIFIED:** none. No database connection, migration, real seed, Supabase/Redis/partner call, bootstrap, staging inspection, or deployment occurred.
- Formal partner activation approval and `company_events` allowlist management path are missing; no unrestricted endpoint was added.
- First association of an otherwise unlinked customer needs an approved global-operator handoff or least-privilege policy decision; no broad permission was added.
- Approved Privacy Policy/Terms text, version identifiers, publication references, effective-policy decisions, and retention requirements are still business/legal inputs.
- Remote frontend/shared-runtime work remains intentionally unmerged. Checkpoint 4 must compare local Admin/Customer changes with incoming paths before integration, especially `packages/ui/src/runtime.tsx` and customer auth/property files.
- Disposable PostgreSQL tests for all five migrations, restrictive deletion, connection-limit-1 transaction behavior, rollback/concurrency, RLS/ACL, and staging role/grant inspection remain Checkpoint 4 work.
- Node 22 and Docker execution were not run. `npm.cmd run validate` was not run as a single command; its relevant constituent checks were executed explicitly, and it does not include browser/API E2E or runtime audit by definition.

### Checkpoint 4 handoff

`docs/month-1/checkpoint-4-handoff.md` is a preparation document only. The next checkpoint should obtain separate migration, seed, provider, bootstrap, and frontend-integration approvals before executing any real database/provider operation. Month 2 remains disabled and no feature was enabled by this checkpoint.

## Next recommended checkpoint

Proceed only with the separately approved Checkpoint 4 disposable PostgreSQL/migration and staging-inspection preparation described in `docs/month-1/checkpoint-4-handoff.md`. Do not merge `origin/main`, run a real seed, apply migrations, bootstrap an administrator, contact live providers, deploy, or activate Month 2 as part of this handoff.

## Checkpoint 4A — Frontend integration and combined validation

- **Timestamp (UTC):** 2026-09-18T03:30:00Z (working-tree record; exact command times are retained in the terminal evidence).
- **Starting branch:** `main`.
- **Starting HEAD:** `d3d2a9604c34073ad1b8b235a80343134255cb25`, the local safety commit `checkpoint: preserve month 1 audit corrections before frontend integration` containing the intended uncommitted Checkpoints 1–3.
- **origin/main after fetch:** `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e`.
- **Merge base:** `4953810a22bcaf61b8c8961c2439fffafd593549`.
- **Actual divergence before merge:** `git rev-list --count origin/main..HEAD` = `1`; `git rev-list --count HEAD..origin/main` = `5`. The five incoming commits were `efabacd`, `8f40902`, `53fc2fb`, `9f3d199`, and `aa7ae72`. No pull, rebase, cherry-pick, or force operation was used.
- **Starting uncommitted inventory:** before the safety commit, 34 modified tracked files and 18 untracked intended Checkpoint 1–3 files were present; nothing was staged and there were no unresolved conflicts. They were reviewed, secret-scanned, and preserved in the local safety commit before merging.
- **Starting snapshot attribution:** established relative to the local safety commit above. Cumulative diffs against the historical reviewed HEAD also include all preserved Checkpoints 1–3; they are not correction-only diffs.

### Remote integration and conflicts

The colleague commits included shared UI/runtime/auth files, Admin/Customer pages and CSS, package manifests/lockfile, reservation and Digital ID source, Prisma schema/migration/seed changes, a whitepaper asset, and workspace settings. The remote paths overlapped Checkpoint 3 Admin capability files, API module wiring, database schema/seed/migration history, and documentation.

Manual conflicts were resolved in:

- `apps/admin-web/app/admin-data.tsx` — retained the colleague’s Command Center visual layout and added capability/scope-aware navigation and mutation controls.
- `apps/admin-web/app/page.tsx` — retained the colleague’s landing design while routing through caller capabilities and avoiding `/admin/dashboard` for restricted staff.
- `apps/api/src/modules/app.module.ts` — retained logging, consent-policy, capabilities, and reservation providers/controllers.
- `docs/api/api-overview.md`, `docs/database/schema.md`, and `docs/month-1/deliverables.md` — combined reservation documentation with the earlier authorization/consent/seed boundaries.
- `packages/database/prisma/seed.ts` — deliberately retained the reviewed import-safe injected seed instead of the remote eager Prisma/demo seed. Reservation permission definitions were added without creating users, credentials, assignments, or sample records.

The remote edit to historical `202609140002_application_postgrest_lockdown/migration.sql` was reverted to the local safety-commit version; its checksum/history must not change. The new additive `202609160001_reservation_foundation` source was retained for later approved migration review. The schema now contains the reservation/property-status foundation plus the preserved Checkpoint 1 `RESTRICT` authorization relationships. No migration was applied.

### Checkpoint 4A implementation

- Restored the real Supabase PKCE adapters in `apps/customer-web/app/lib/supabase.ts` and `apps/admin-web/app/lib/supabase.ts`. Missing public Supabase configuration fails closed; no client-forged demo bearer token, hardcoded demo password, browser demo cookie, or UUID bearer fallback remains.
- Retained the colleague’s shared visual components in `packages/ui/src/index.tsx`, while aligning `packages/ui/src/runtime.tsx` with real Supabase session -> bearer JWT -> API behavior. Admin login explicitly goes to `/`; Customer login remains `/dashboard`. API `401` remains session/account rejection, while `503` is displayed as an availability error without forced sign-out.
- Added scope-aware `GET /admin/capabilities` module results based on the same list semantics used by `PermissionGuard`. Project-scoped `company.view` cannot activate the company list/dashboard. Separate mutation permission/grant data drives UI controls; read permissions no longer imply writes. API authorization remains authoritative.
- Filtered Admin navigation/actions to effective modules, gated company/project/property/user/role/permission/feature/integration/settings/reservation mutations by their actual permissions, and preserved AUDITOR read-only behavior. Added browser coverage for restricted landing, no-admin access, disabled/expired session, capabilities 403, and direct unauthorized mutation 403.
- Added the colleague’s reservation API only with narrow boundary fixes: admin reservation creation rechecks customer visibility through `customer.view`; expired holds cannot be confirmed; a changed property status cannot be overwritten by a reservation transition. Added local service regression tests.
- Kept the Customer visual design while restoring API-backed Marketplace service/company/project records and authorized customer-property detail reads. Public property lookup is only a fallback when `/me/properties` has no authorized record; sold/linked customer records do not use the public available-only endpoint. Public RHC ID verification fails closed when API configuration is absent.
- Aligned Customer/Admin Playwright base URLs with the merged package ports (`3002` and `3003`) and API development CORS. Removed hardcoded demo credentials from customer login screens. Browser fixture helpers remain synthetic and intercepted only.

### Files materially changed during Checkpoint 4A

- Shared/runtime/auth: `packages/ui/src/runtime.tsx`, `packages/ui/src/index.tsx`, `apps/customer-web/app/lib/supabase.ts`, `apps/admin-web/app/lib/supabase.ts`, `apps/admin-web/app/providers.tsx`, `apps/customer-web/app/providers.tsx`.
- Admin integration: `apps/admin-web/app/page.tsx`, `apps/admin-web/app/admin-data.tsx`, `apps/admin-web/app/rhc-digital-ids/page.tsx`, `apps/admin-web/playwright.config.ts`, `apps/admin-web/tests/smoke.spec.ts`.
- Customer integration: `apps/customer-web/app/components/digital-id-page.tsx`, `apps/customer-web/app/properties/[id]/page.tsx`, `apps/customer-web/app/marketplace/page.tsx`, `apps/customer-web/app/admin/page.tsx`, login pages, public verification page, `apps/customer-web/playwright.config.ts`, and `apps/customer-web/tests/fixtures.ts`.
- API/reservation/capability: `apps/api/src/main.ts`, `apps/api/src/modules/app.module.ts`, `apps/api/src/modules/admin/capabilities.controller.ts`, reservation controller/service/spec, directory/permission integration paths, and `apps/api/test/capabilities.e2e-spec.ts`.
- Database/package integration: `packages/database/prisma/schema.prisma`, retained historical lockdown migration, new `202609160001_reservation_foundation` migration, `packages/database/prisma/seed.ts`, `package.json`, and `package-lock.json`.
- Documentation: this progress record, `docs/month-1/checkpoint-4-handoff.md`, and merged API/database/deliverable context files.

These files are cumulative where they contain Checkpoint 1–3 work. No Checkpoint 1–3 protection was discarded. The remote whitepaper/assets, CSS, navigation, reservation pages, and other colleague frontend additions remain in the merged tree; external evidence bundles, `.env` files, build output, and test-result artifacts were not staged.

### Exact validation commands and results

- `npm.cmd ci` — first attempt correctly failed because the merged lockfile was missing `@emnapi/core@1.11.3` and `@emnapi/runtime@1.11.3`. `npm.cmd install --package-lock-only --ignore-scripts --no-audit` repaired only lock metadata; the rerun `npm.cmd ci` passed with 923 packages installed, 933 audited, and 0 vulnerabilities. Existing deprecation/install-script warnings remain.
- `npm.cmd run db:generate` — passed with Prisma Client 5.22.0.
- `npx.cmd prisma format --schema packages/database/prisma/schema.prisma` — passed.
- `DATABASE_URL=postgresql://127.0.0.1:5432/rhc_validation_placeholder DIRECT_URL=postgresql://127.0.0.1:5432/rhc_validation_placeholder npx.cmd prisma validate --schema packages/database/prisma/schema.prisma` — passed using loopback placeholders; no connection was made.
- Focused `npm.cmd test -w @rhc/database` — **7/7 passed**.
- Focused reservation unit test — **5/5 passed**.
- Focused capability E2E — **6/6 passed**.
- `npm.cmd run typecheck` — **passed** for all workspaces.
- `npm.cmd run lint` — **passed** for all workspaces.
- `npm.cmd test` — **274/274 passed** across 18 API unit/service suites.
- `npm.cmd test -w @rhc/database` — **7/7 passed**.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand` — **167/167 passed** across 10 API fixture suites.
- Customer browser suite with synthetic `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1`, `NEXT_PUBLIC_SUPABASE_URL=https://rhc-e2e.supabase.co`, and synthetic publishable key — **55/55 passed**.
- Admin browser suite with the same synthetic configuration — **71/71 passed**, including the new AUDITOR/disabled/expired/403 regressions.
- `npm.cmd run build:customer` — **passed**; Next.js 15.5.25 production build.
- `npm.cmd run build:admin` — **passed**; Next.js 15.5.25 production build.
- `npm.cmd run build:api` — **passed**; shared prerequisites and API TypeScript build.
- `npm.cmd audit` — **0 vulnerabilities**.
- `npm.cmd audit --omit=dev` — **0 vulnerabilities**.
- `git diff --check` and `git diff --cached --check` — passed with only Git’s LF/CRLF normalization warnings.
- Merge-marker and source regression searches — no unresolved markers; no fake UUID bearer auth, raw production secret/error logging, or unsafe demo session fallback found. Synthetic test redaction fixtures and generated build output were excluded from source claims.

### Remaining blockers and safety boundary

- **SOURCE IMPLEMENTED:** merged colleague frontend, shared auth/runtime contract, scope-aware Admin capabilities/landing/navigation, permission-aware mutation controls, reservation boundary fixes, port/test alignment, and preserved Checkpoint 1–3 source protections.
- **FIXTURE TESTED:** all listed tests use injected doubles, local HTTP/JWKS peers, or browser-intercepted synthetic endpoints. They do not prove PostgreSQL transaction/FK/RLS/ACL behavior, concurrency, or live provider behavior.
- **LIVE VERIFIED:** none. No database connection, migration, real seed, Supabase/Redis/partner call, staging inspection, administrator bootstrap, deployment, or Month 2 activation occurred.
- Checkpoint 4B still requires an explicitly approved disposable PostgreSQL target and six-migration review, including reservation migration ordering, authorization-scope `RESTRICT`, connection-limit-1 transaction behavior, rollback/concurrency, RLS/ACL/object ownership, and browser-role denial.
- Formal partner activation/event-allowlist management, first unlinked-customer association policy, and approved legal policy/version inputs remain unresolved Checkpoint 3 business decisions.
- The remote reservation foundation is source-only and must not be interpreted as live reservation acceptance or data initialization.

### Checkpoint 4A safety confirmations

- No push, pull, rebase, cherry-pick, or force operation.
- No database connection, migration, seed CLI, bootstrap, staging inspection, or live provider/settings call.
- No deployment and no Month 2 feature activation.
- The local safety commit preserves Checkpoints 1–3; the final merge commit contains the integrated remote source and this append-only record. Exact final SHA is recorded in the evidence bundle and final Git state.

## Next recommended checkpoint

Proceed only to the separately approved Checkpoint 4B disposable PostgreSQL and migration verification gate. Do not apply migrations, run the real seed, bootstrap an administrator, inspect staging, contact live providers, deploy, or activate Month 2 as part of Checkpoint 4A.
