# Month 1 Audit Corrections Progress

## Current — Local publication through Commit 6 (2026-09-26)

This is the current repository and bounded-validation summary. The checkpoint
entries below it are historical, run-specific records: their HEADs, test counts,
open-proof statements, and no-commit statements describe those earlier passes,
not the publication state now recorded here. Historical results are not being
reclassified as fresh validation.

### Verified local publication sequence

- **Branch:** `main`.
- **Current committed HEAD:** `0551dbec29a1bf19bf1351eae278288e6c6fcffb`.
- **Publication state:** the seven isolated security commits below are committed
  locally. Their local preparation and commit steps are complete; no push has
  occurred in this publication sequence. Commit 7 documentation remains a
  proposed, unstaged two-file boundary.
- **Observed tracking state:** local `origin/main` remains
  `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e`; local `main` is nine commits ahead
  and zero behind that cached reference. No fetch or remote verification was
  performed for this documentation update.

| Commit | Verified hash | Commit message |
| --- | --- | --- |
| 1 | `b9685e27e227df31b43ad4efe8033e01cb835d5a` | `security: disable public digital id verification lookup` |
| 2 | `4261a6150dbd0a777525dac9db07cd68ad191cb3` | `security: harden reservation access boundaries` |
| 3 | `ed4f9ac7ff83aeb5c644f6b49059de9eb0b0e9f2` | `security: align admin capability reporting` |
| 4 | `06ed38a7a8274a67812e20af1744b56b5c8b4f97` | `security: gate admin dashboard by capabilities` |
| 5A | `b4ee980dc79deca07349ac604ec54e60ec5c9640` | `security: harden admin property workflows` |
| 5B | `acb0a627fee0ff900431b874ee004fde4f56b395` | `security: harden admin capability workflows` |
| 6 | `0551dbec29a1bf19bf1351eae278288e6c6fcffb` | `security: harden database acl preflight` |

The application, maintained regression tests, capability helpers, shared browser
fixture, and ACL/database changes assigned to those commits are no longer held
working-tree corrections. They must not be restaged as documentation work.

### Latest bounded local technical evidence

- **September 25 CP4B HTTP/catalog evidence:** records local F5 exact pagination,
  F6 rollback, non-owner runtime, and S1/S2 catalog results. F5 passed only with
  an **execution-copy correction**; the original prepared F5 harness did not pass
  unchanged and was not silently replaced. The four prepared CP4B harnesses and
  their generated workspaces remain excluded from publication. Those records
  concern an earlier source snapshot, not a rerun of every final committed file.
- **Commit 6 ACL corrections:** the preflight distinguishes ADMIN OPTION regrant
  authority from immediate SET/INHERIT access, including relevant transitive
  paths and alternative grantors. Migration-ledger ownership is assessed
  separately from table/column DML, including owners with revoked DML and the
  implicit current-database-owner path through `pg_database_owner`. Direct and
  usable special-role authority covers `SUPERUSER`, `BYPASSRLS`, `CREATEDB`, and
  `CREATEROLE`; special attributes are not treated as inherited ordinary ACLs.
  Existing schema/table/column/sequence/application-owner protections remain.
- **Focused Commit 6 validation:** the ACL migration/preflight spec passed
  **69/69**; the actual package command passed **54/54** PostgreSQL catalog cases
  (**42 unsafe configurations rejected, 12 safe controls accepted**). Database
  tooling TypeScript, ESLint on the preflight/spec, and whitespace checks passed.
  These are bounded results, not a new full-workspace/frontend validation claim.
- **Actual entry path:** `npm run db:acl:preflight -w @rhc/database` was exercised
  with explicit loopback host/database and creator/runtime arguments through
  Prisma against disposable PostgreSQL **16.15**. The safe baseline returned
  exit 0, `ready: true`, no findings, and a read-only transaction. Its
  `runtimeAssessment` remains **`declared-not-executed`**.
- **Separate runtime proof:** a TCP login as a non-owner, non-superuser runtime
  without BYPASSRLS/CREATEDB/CREATEROLE executed a SELECT with RLS active, and a
  ledger UPDATE was denied with SQLSTATE `42501`. The SELECT grant and RLS policy
  were disposable test configuration, not approved production policy or proof of
  comprehensive tenant isolation.
- **Migration sequence:** exactly **seven** migrations exist. Commit 6 deployed
  all seven in order from an empty disposable database using the actual
  `npm run db:migrate -w @rhc/database` / `prisma migrate deploy` entry path.
  Seven completed, non-rolled-back ledger entries matched the executed source
  checksums; a repeat deployment reported no pending migrations. This is newer
  Prisma-deployment evidence, not a retroactive claim about the September 25
  direct-SQL execution record. Migration 7 is additive; the six historical
  migrations were not rewritten. The full inventory is in
  [checkpoint-4-handoff.md](checkpoint-4-handoff.md).
- **Preservation:** the Commit 6 candidates matched their validated snapshot
  before staging. Git stored LF-normalized content; raw Windows checkout hashes
  must not be confused with staged blob hashes. No semantic migration change
  was made. The disposable Commit 6 container and its tmpfs data were removed.
- **Evidence scope:** Commit 6 reports remain outside the repository under the
  local temporary `rhc-commit6-H2Wbvn` validation workspace. Earlier CP4B evidence
  and preservation manifests attest their older inputs, not the final Commit 6
  collector/spec fingerprints. They are not maintained documentation inputs to
  stage automatically.

### Current acceptance and documentation boundary

Bounded local technical validation and local security-commit preparation are
complete for the scopes above. **Checkpoint 4B and Month 1 are not declared
DONE by this record.** Provider/staging/live acceptance, hosted ACL/runtime-policy
approval, read-only target inspection, any subsequent writes, deployment, and
public release remain separate gates. **ClickUp remains the source of truth for
live completion status**; no ClickUp evidence or live service was accessed or
updated in this documentation pass.

F7 contention/replay and the previously recorded business/legal decisions remain
open or separately gated. No seed/bootstrap was run during the September 25
bounded validation, Commit 6 final validation, or this documentation pass; older
expressly authorized synthetic seed runs below retain their historical scope.
No Supabase/live/staging database was modified, and no deployment or push is
inferred from local results.

The proposed Commit 7 allowlist is only this file and
`docs/month-1/checkpoint-4-handoff.md`. The handoff records the per-file
classification of the three untracked documents and the explicit evidence and
harness exclusions. This pass performs documentation/history/path/whitespace
checks only, not a broad technical rerun, staging, commit, or push.

## Historical checkpoint records

Everything below is preserved checkpoint-time evidence. Use the current summary
above for present publication and approval status.

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

## Checkpoint 4A review corrections

- **Timestamp:** 2026-09-18 (working-tree correction pass).
- **Branch:** `main`.
- **Current HEAD:** `93a62139143c02a5ebbb1b695bb6febe8f37280e`.
- **Observed remote-tracking snapshot:** `origin/main` = `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e`. This is a local observation, not proof of current GitHub state.
- **Actual relation:** `git rev-list --count origin/main..HEAD` = `2`; `git rev-list --count HEAD..origin/main` = `0`; merge base = `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e`.
- **Working-tree starting state:** clean, no staged files, no untracked files, no unresolved conflicts. The reviewed merge snapshot was preserved; no merge or history operation was repeated.
- **Attribution baseline:** non-secret starting snapshots for files edited in this pass are outside the repository at `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4A-ReviewFix-starting-snapshots`. The baseline was expanded before later-added `rhc-digital-ids/page.tsx`, `customer-web/app/components/demo-records.tsx`, and `customer-web/tests/smoke.spec.ts` edits.
- **Temporary exporter:** `.c4a-exporter.cjs` was absent from the repository and was not recreated or moved.

### Findings and source corrections

- **Admin scope-aware actions — CONFIRMED, FIXED.** Added typed effective-grant and target helpers in `apps/admin-web/app/capability-scopes.ts`; Admin row actions and reference choices now require the actual target company/project scope. Global-only governance and Digital ID review actions require global grants. Multiple required permissions must cover the same target. Property metadata editing uses `property.edit` alone; status fields and elevated creation statuses require target-matching `property.change_status`. API guards remain authoritative and were not broadened. The relationship list preserves its scalar-only data-minimization contract while returning bounded property scope/code scalars from a separate authorized lookup.
- **Reservation eligibility/projections — CONFIRMED, FIXED.** `ReservationsService.create` now checks property `AVAILABLE`, project `ACTIVE`, and company `ACTIVE` inside the serializable transaction. Transition/cancellation remediation does not reapply those creation checks. Final customer/Admin projections are read after all writes; customer responses omit internal event/note/actor/metadata fields, while Admin responses retain bounded authorized event history. Generated Prisma reservation delegates/selections replace the prior reservation `any` shims. The 72-hour hold default, manual early expiry, and conversion `BUYER` link side effect remain business-policy items.
- **Public Digital ID verification — CONFIRMED, FIXED SAFE.** Anonymous token decoding and profile lookup were removed. The API returns an honest `UNAVAILABLE`/not-configured state without identity data; the public page performs no guessed-identifier request. The existing visual pattern is explicitly labeled non-scannable, the public action is disabled, and no third-party QR service or public token secret was added. Private authenticated issuance and identity-field protections remain unchanged.
- **Migration/evidence hygiene — FIXED.** No schema or migration was edited. The repository exporter remains absent. The historical/superseded six-migration inventory and separate read-only staging inspection/write approval gates are recorded in `checkpoint-4-handoff.md` below.

### Test and build evidence (pre-recovery record)

The following results were recorded before the power outage. They are preserved
for attribution; the post-recovery reruns and final counts are in
`### Final recovery validation` below.

- `npm.cmd run db:generate` — passed; Prisma Client 5.22.0 generated from the current schema; no database connection was made.
- Focused reservation/Digital ID command `npm.cmd test -w @rhc/api -- --runInBand src/modules/reservations/reservations.service.spec.ts src/modules/reservations/reservations.controller.spec.ts src/modules/directory/directory.controller.spec.ts` — **17/17 passed** across 3 suites in the pre-recovery record. Earlier attempts failed only in the new test harness (TestingModule typing, synchronous controller assertion, then invalid synthetic non-UUID fixtures); those were corrected without weakening production assertions.
- Focused Admin browser command with invalid `--project=chromium` — failed because this repository defines no named Playwright project; no source conclusion was drawn. Correct focused command `env NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1 NEXT_PUBLIC_SUPABASE_URL=https://rhc-e2e.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-publishable-key npm.cmd run test:e2e -w @rhc/admin-web -- tests/smoke.spec.ts` — **38/38 passed**.
- Focused Customer command with the same explicit synthetic configuration and `tests/smoke.spec.ts` — **22/22 passed**.
- `npm.cmd run typecheck` — **passed** for all workspaces.
- `npm.cmd run lint` — **passed** for all workspaces.
- `npm.cmd test` — **286/286 passed** across 20 API unit/service suites.
- `npm.cmd test -w @rhc/database` — **7/7 passed** through the import-safe seed tests.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand` — final **167/167 passed** across 10 suites. An earlier post-change run was **166/167** because the existing scalar-only relationship test rejected an intermediate nested scope response; the source was corrected to a separate flattened lookup and the full command was rerun successfully.
- `npm.cmd run build:customer && npm.cmd run build:admin && npm.cmd run build:api` — all three builds passed.
- Full Admin browser command with explicit synthetic local API/Supabase configuration — **75/75 passed** in the pre-recovery record; the post-recovery rerun added the nested reservation-scope regression and passed **76/76**.
- Full Customer browser command with explicit synthetic local API/Supabase configuration — **57/57 passed** in the pre-recovery record and **57/57** after recovery.
- `npm.cmd audit` — **0 vulnerabilities**; `npm.cmd audit --omit=dev` — **0 vulnerabilities**.
- `git --no-pager diff --check` — passed; only normal LF/CRLF working-copy warnings were reported. Conflict-marker search found no markers; targeted fake-bearer/direct-browser-table regression search found no production matches.

### Attribution and boundaries

- **SOURCE IMPLEMENTED:** typed scope-aware Admin action/reference eligibility, reservation status eligibility and final/minimal projections, public Digital ID fail-closed boundary, scalar relationship scope metadata, generated reservation Prisma selections, and regression tests.
- **FIXTURE TESTED:** local Prisma/provider/controller doubles and browser-intercepted synthetic endpoints only. Browser `403` fixtures demonstrate UI behavior; they do not replace real server authorization. Fixture transactions do not prove PostgreSQL uniqueness, locking, rollback, concurrency, or connection-pool behavior.
- **DEFERRED / BUSINESS DECISION:** approved public Digital ID sharing contract; formal company activation and event-allowlist management; first association of an otherwise unlinked customer; approved legal policy/version inputs; current reservation hold/expiry/conversion policy confirmation.
- **UNEXECUTED REAL CHECKS:** no database connection, migration, disposable PostgreSQL run, staging inspection, real seed, Supabase/Redis/partner call, administrator bootstrap, deployment, or Month 2 activation. These remain Checkpoint 4B or separately approved business/security gates.
- **Checkpoints 1–3 and the reviewed frontend merge remain preserved.** No schema, migration, shared browser runtime, Git history, or remote branch was altered by publication; this pass leaves the listed source/test/docs changes uncommitted for review.

## Checkpoint 4A review-corrections recovery continuation

- **Recovery starting point:** local `main` at `93a62139143c02a5ebbb1b695bb6febe8f37280e`; observed remote-tracking `origin/main` snapshot `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e`; local relation remained `2` commits ahead and `0` behind. The preserved merge baseline was present in history and no merge/history operation was repeated.
- **Recovered worktree:** no staged files, no unresolved conflicts, and the expected 17 modified tracked files plus three untracked Review-Corrections source/test files. All inspected files were syntactically intact and diagnostics were clean. No file was truncated or corrupted; no package manifest/lockfile, schema, or migration changed. No generated/temp repository artifact or `.c4a-exporter.cjs` was present. External non-secret starting snapshots remain at `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4A-ReviewFix-starting-snapshots`.
- **Interrupted-work handling:** the pre-outage Customer suite, audit commands, and evidence-export attempt were not counted as final completion without verification. The Customer suite, both audits, diff checks, focused tests, full unit/API/seed suites, and builds were rerun after recovery. No partial evidence bundle was found or overwritten.
- **Resumed correction:** `apps/admin-web/app/capability-scopes.ts` now derives reservation row company/project targets from the nested `property.project` response shape. `apps/customer-web/tests/fixtures.ts` and `apps/admin-web/tests/smoke.spec.ts` add realistic reservation rows and a matching-versus-mismatched company-scope browser regression. The fix does not change server authorization.

### Final recovery validation

- `npm.cmd test -w @rhc/api -- --runInBand src/modules/reservations/reservations.service.spec.ts src/modules/reservations/reservations.controller.spec.ts src/modules/directory/directory.controller.spec.ts` — **20/20 passed** across 3 suites.
- `npm.cmd run typecheck` — **passed** for all workspaces.
- `npm.cmd run lint` — **passed** for all workspaces.
- `npm.cmd test` — **289/289 passed** across 20 API unit/service suites.
- `npm.cmd test -w @rhc/database` — **7/7 passed** through import-safe seed tests.
- `npm.cmd run test:e2e -w @rhc/api -- --runInBand` — **167/167 passed** across 10 API fixture suites.
- `env NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1 NEXT_PUBLIC_SUPABASE_URL=https://rhc-e2e.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-publishable-key npm.cmd run test:e2e -w @rhc/customer-web` — **57/57 passed** with synthetic local/intercepted endpoints.
- `env NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1 NEXT_PUBLIC_SUPABASE_URL=https://rhc-e2e.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-publishable-key npm.cmd run test:e2e -w @rhc/admin-web` — **76/76 passed** with synthetic local/intercepted endpoints, including the resumed nested reservation-scope regression.
- `npm.cmd run build:customer && npm.cmd run build:admin && npm.cmd run build:api` — all three builds **passed**.
- `npm.cmd audit` — **0 vulnerabilities**.
- `npm.cmd audit --omit=dev` — **0 vulnerabilities**.
- `git --no-pager diff --check` — **passed**; only normal LF/CRLF working-copy warnings were emitted. Conflict-marker search found no markers. Project and changed-file diagnostics reported no errors or warnings.

### Final correction status and boundaries

- **CORRECTED:** typed scope-aware Admin action eligibility, including nested reservation targets; property metadata/status permission separation; reservation project/company eligibility and final/customer-minimal projections; fail-closed public Digital ID verification and non-scannable QR state; historical/superseded six-migration and evidence-hygiene documentation.
- **FIXTURE TESTED:** local injected Prisma/provider/controller doubles and browser-intercepted synthetic endpoints only. Browser 403 fixtures demonstrate UI behavior and do not replace server authorization. Fixture transactions do not prove PostgreSQL uniqueness, locks, rollback, concurrency, RLS, ACL, or connection-pool behavior.
- **DEFERRED / BUSINESS DECISION:** approved public Digital ID sharing contract; formal company activation/event allowlist management; first association of an otherwise unlinked customer; approved legal policy/version inputs; reservation 72-hour/manual-expiry/conversion policy confirmation.
- **UNEXECUTED REAL CHECKS:** no database connection, migration, disposable PostgreSQL run, staging inspection, real seed CLI, Supabase/Redis/partner call, administrator bootstrap, deployment, or Month 2 activation.
- **SAFETY:** no reset, pull, merge, rebase, stash, clean, commit, amend, push, or publication was performed in the recovery/correction pass. The final worktree remains intentionally uncommitted for review.

## Checkpoint 4B — Disposable local PostgreSQL verification

- **Timestamp (UTC):** 2026-09-21; run `rhc-cp4b-20260921T023035Z-89527f045404`.
- **Authorization boundary:** the user expressly authorized one new disposable local PostgreSQL 16 container, all six unchanged migrations, synthetic core/sample seed testing, synthetic SQL/application fixtures, evidence export, and cleanup of only run-owned resources. Supabase, staging, production, existing databases, live Auth/JWKS/Redis/partner services, administrator bootstrap, deployment, Git writes, source/schema/migration fixes, and Month 2 activation remained out of scope.
- **Source input:** repository `main` at `93a62139143c02a5ebbb1b695bb6febe8f37280e`; cached remote `origin/main` was `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e` and was not freshly fetched. The current working tree and all three required untracked corrections were preserved in the external sanitized snapshot. No production source, schema, migration, package manifest, or lockfile was edited by this pass.
- **Disposable target:** Docker Desktop local context `desktop-linux`, PostgreSQL image `postgres@sha256:3c5c8892d184f738f4fe282d14ddaa613a38f00f4189d2d94725ebe6f2909ddb`, PostgreSQL `16.15`, container port published only as `127.0.0.1:56546`, run-owned named volume/network/container. Authenticated TCP and wrong-password checks passed. Credentials remain private under the external run directory and are excluded from evidence exports.
- **Runtime:** Node `v24.21.0`, npm `11.19.0`, Prisma CLI/client `5.22.0`, Docker `29.8.0`, Git Bash `/usr/bin/sh`. Installed tools and cached dependencies only; no package download or upgrade. Snapshot shared declarations were built only inside the external sanitized snapshot.

### Machine-readable case status

The authoritative records are in the external run directory’s `results.json`; totals are computed from its twelve records: **6 PASS, 1 FAIL (conditional ACL reproduction), 5 OBSERVED_POLICY_OPEN**.

| Audit case | Status | Result |
| --- | --- | --- |
| 1 | PASS | Six-migration baseline/rerun/catalog passed; populated migration-3 conflict failed as an intentionally preserved negative scenario. |
| 2 | PASS | All three restrictive authorization FKs returned PostgreSQL `23503`; scoped RBAC denied foreign tenant; global NULL grants worked; nullable global assignment duplicate behavior remains a documented caveat. |
| 3 | PASS | Actual management/key services and transaction-scoped RBAC completed with `connection_limit=1`; transaction backend PID remained consistent. |
| 4 | PASS | Six injected failure points rolled back real reservation/property/history/audit/activity state; manual property history path was exercised. |
| 5 | OBSERVED_POLICY_OPEN | Real lifecycle/projection/concurrency/partial-index checks passed; F5 tenant filters were reproduced as accepted-but-ignored and F7 contention/replay contract remains open. |
| 6 | OBSERVED_POLICY_OPEN | Deactivation and role-revocation interleavings were observed; commit-time authority/eligibility cutoff is not established policy. |
| 7 | OBSERVED_POLICY_OPEN | Repeat, expiry, number collision, concurrent transition, Prisma/SQLSTATE, and controller error observations were retained; no idempotent lost-response contract was inferred. |
| 8 | PASS | Same-user RHC ID issuance converged with exactly-once effects; different-user uniqueness, denial, injected rollback, capacity, and stale-counter collision passed. |
| 9 | PASS | Actual unchanged seed CLI passed core twice and sample twice/core with eight companies, AMICA-T1, four samples, idempotency, and no forbidden side effects. |
| 10 | OBSERVED_POLICY_OPEN | Preservation passed; foreign ownership collisions failed without reparenting; same-project operator record was preserved rather than relabeled, leaving provenance/collision policy open. |
| 11 | FAIL | Scenario A browser ACL denial passed, but adverse B/C default privileges granted migration-six ACLs and permitted transactional `TRUNCATE`; RLS blocked inserts. This is a conditional reproduced finding only, not a claim about hosted exposure. |
| 12 | OBSERVED_POLICY_OPEN | Consent append/history/isolation/version/rollback/withdrawal/timestamp checks passed; current-version grandfathering and withdrawal/use cutoff remain open. |

### F1–F7 and follow-up boundary

F1 registry verification review, F2 company-scoped `role.view`, F3 stale mutation capabilities, F4 dashboard audit permission, F5 ignored reservation tenant filters, F6 manual property-history robustness, and F7 contention/replay response contract remain open unless separately resolved by reviewed source/policy evidence. This run reproduced F5/F6/F7 conditions where applicable; it did not fix them. The conditional ACL result requires a future staging prerequisite/default-privilege decision and must not be described as hosted exposure.

Evidence, sanitized snapshot, scripts, SQL fixtures, logs, manifests, and the final reproduction ZIP are retained at `C:\Users\PC\Documents\RHC_WEB3\RHC-Checkpoint4B-20260921T023035Z-89527f045404`. This section does not mark Month 1 accepted, staging ready, feature DONE, or operationally activated. Final cleanup status is recorded in `cleanup-result.json` in that external run directory.

## Checkpoint 4B review-corrections recovery completion

- **Timestamp (UTC):** 2026-09-22.
- **Recovery run:** `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4B-ReviewFix-20260921T170000Z-9d4e7a1c`; recovery snapshot `recovery-20260922T053245Z`. This append-only section supersedes only the interrupted recovery handoff notes; earlier checkpoint records remain historical evidence.
- **Source identity:** local branch `main`, HEAD `93a62139143c02a5ebbb1b695bb6febe8f37280e` (`main` was two commits ahead of the observed `origin/main` snapshot). Initial and post-correction source fingerprints are retained outside the repository; the final fingerprint is recorded in the recovery snapshot after this documentation update. No Git staging, commit, push, fetch, pull, merge, rebase, reset, stash, clean, checkout, or branch change was performed.
- **Disposable target identity:** the exact run-owned container, image digest, volume, network, mount, labels, and `127.0.0.1:56571 -> 5432` binding matched the preserved ownership records. The full container ID and sanitized identity records are retained in the recovery snapshot. No replacement container, volume, network, migration repair, blind provisioning, seed CLI, or repeated synthetic write was performed.
- **Migration/ACL verification:** the six original migrations plus the already-existing migration seven were verified in all four scenarios (`a`, `b`, `c`, `clean`): seven finished ledger rows, zero checksum mismatches, matching scenario markers, and `29/29` application tables with RLS enabled. Migration seven remained byte-identical to the repository/snapshot at SHA-256 `6d5e73d0d69306d52f295e2b52b8afb10c2b89ddf70c14f5a6eabc4fea4a7573`. Scenario A was already ready; B/C had 40 default ACL findings in the preserved preflight, received the approved explicit remediation, and reached zero default ACL findings and ready status. Browser roles had no superuser, `BYPASSRLS`, or `CREATEROLE`; wrong-password TCP rejection passed.
- **Database fixtures:** existing synthetic runtime rows were preserved and reported. The clean scenario retained eight companies and four synthetic sample properties, with zero users, user roles, customer-property links, consents, or API clients. Full SQL/runtime/ledger/seed reports remain separate from the compact evidence report.
- **Historical recovery record:** the prior recovery run recorded its approved F1–F6/local revalidation as complete using preserved database evidence, actual PostgreSQL SQL checks, API/database regressions, explicit synthetic browser environment, and sequential final browser suites. That historical statement is preserved for attribution; it is not the current post-Astra closure classification. F7, business/legal policy decisions, and all live/integration boundaries remain open.
- **Historical final validation:** that recovery record reported API unit tests **294/294**, API fixture E2E **170/170**, database seed regressions **7/7**, Admin browser **79/79**, Customer browser **57/57**, typecheck status **0**, lint status **0**, and all-workspace `build:all` status **0**. Full logs remain retained under the recovery snapshot.
- **Approved corrections:** `apps/admin-web/app/admin-data.tsx` now retains last-known capability data during revalidation loading while clearing it on errors; `apps/admin-web/tests/smoke.spec.ts` now uses a matching project-scoped property grant, awaits the existing success status, and asserts the intended no-access/data-minimization state. Earlier failed/interrupted attempts remain preserved and were not counted as passes.
- **Evidence boundary:** the compact sanitized report and reproduction ZIP are retained in the recovery run directory. This record does not authorize Supabase/staging/production access, live providers, administrator bootstrap, deployment, Month 2 activation, or any F7/business/legal policy implementation. Cleanup was authorized only after evidence capture and is recorded separately with exact ownership checks.

## Checkpoint 4B - Post-Astra final audit source-only correction pass

- **Timestamp:** 2026-09-23 UTC.
- **Authority:** `CHECKPOINT-4B-FINAL-ASTRA-AUDIT.md` and the bounded correction specification. This section supersedes any unconditional wording that F1-F6 are complete; historical run records above remain preserved evidence.
- **Source boundary:** starting branch `main`, HEAD `93a62139143c02a5ebbb1b695bb6febe8f37280e`; the non-secret starting fingerprint is `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4B-SourceCorrections-20260923T042323Z\SOURCE-START-FINGERPRINT.txt`. The final fingerprint and exact attribution are in the external evidence report.
- **F2 - FIXED SOURCE / FIXTURE TESTED:** `/roles` retains company/global `role.view` semantics, while `/user-roles` is global-only in the server capability contract. The actual endpoint guard remains unchanged. API, frontend fallback, shared browser fixture, navigation, direct-page, and global/company/project regressions agree; company/project denial does not execute the assignment query.
- **F3 - FIXED SOURCE / FIXTURE TESTED:** effect-driven and imperative capability requests share a monotonically increasing latest-request coordinator. Superseded responses cannot restore data, denial, error, loading state, or mutation authority; last-known display data is retained during refresh and current errors fail closed for writes. Coordinator, invalidation, pending-submit, stale-target, and harmless-error regressions are maintained.
- **ACL preflight - FIXED SOURCE / FIXTURE TESTED:** `application-acl-preflight.ts` assesses browser and declared-runtime paths to ordinary helper roles, including SET ROLE/inheritance reachability, dangerous application-table privileges, schema CREATE, migration-ledger mutation, ownership, and dangerous role attributes. It remains assessment-only and does not revoke unrelated grants. Static catalog/query fixtures cover reachable and unreachable helpers, harmless helpers, runtime paths, direct browser privilege, and creator/owner checks. Real PostgreSQL SET ROLE execution remains separately pending.
- **F1 - MAINTAINED REGRESSIONS:** the actual RHC Digital ID registry covers eligible non-self global review, runtime actor presence, inactive/already-verified/invalid states, scoped-only denial, and no administrative RHC ID issuance. Public Digital ID sharing behavior was not changed.
- **F4 - MAINTAINED REGRESSIONS:** both `/` and `/dashboard` prove that dashboard access remains usable without `audit.view` and makes no audit request/link, while an `audit.view` grant exposes the designed activity/link. No audit permission was granted merely for the test.
- **F5 - MAINTAINED REGRESSIONS:** the existing source query fix was retained; API fixture/controller coverage protects company-only, project-only, combined, inconsistent, foreign filters, customer ownership, Admin RBAC, status, pagination, ordering, customer projection minimization, and bounded Admin history. This pass does not claim PostgreSQL result narrowing.
- **F6 - SOURCE FIXED / FIXTURE TESTED:** typed transaction writes remain `tx.propertyStatusHistory.create`, audit-on-`tx`, and event/activity-on-`tx`; metadata-only edits do not create history and rollback fixtures remain. Real PostgreSQL rollback proof is pending a separately authorized database pass.

### Source-only validation boundary

- Focused API unit: **25/25 passed** across three suites.
- Focused API fixture E2E: **91/91 passed** across three suites.
- Focused Admin browser/coordinator rerun: **59 passed**.
- Full API unit: **306/306 passed** across 21 suites; full API fixture E2E: **174/174 passed** across 10 suites.
- Database unit: **7/7 passed**.
- Full Admin browser: **96/96 passed** after one preserved 95/96 timing-only assertion attempt; full Customer browser: **57/57 passed**.
- `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build:all` returned status 0. The exact command ledger, timing, source fingerprint, counts, and logs are external.

### Remaining proof and approval boundary

- Combined HTTP + PostgreSQL proof remains pending; this pass used only local source, injected catalog/query fixtures, and synthetic/intercepted browser endpoints.
- F6 real PostgreSQL rollback proof, real PostgreSQL SET ROLE/helper-role execution, seed value-preservation proof, hosted role/creator/runtime ACL strategy, live provider behavior, and staging/production verification remain pending.
- F7 remains open. Formal activation/event allowlisting, first unlinked-customer association, legal policy/version inputs, and reservation lifecycle/replay policy remain business/security decisions.
- This record does not mark staging ready or Month 1 DONE. The current migration inventory is **seven**: the six historical entries plus `202609210001_application_acl_hardening`; all seven migration sources remain byte-preserved in this pass.
- This source-only pass performed **no Git write, no database/container operation, no migration execution or edit, no Supabase/staging/production access, no live provider call, no bootstrap, no deployment, and no Month 2 activation**.

## Checkpoint 4B - Final local closure and disposable integration revalidation

- **Timestamp:** 2026-09-24 UTC. External run: `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4B-FinalLocalClosure-20260924T014438Z`.
- **Source boundary:** branch `main`, HEAD `93a62139143c02a5ebbb1b695bb6febe8f37280e`; immutable non-secret starting fingerprint `a1c934d88b9312d6eb86d6b7e0c8d8883dc309347db89361f7333b1ae753e1ba`; sanitized source fingerprint `975c7a243d8ebe30939aeff1a7647107ef04b88dc6e35b18412e0f39c90401a5`. Existing F2/F3 corrections were preserved.
- **ACL closure:** reachable column `SELECT/INSERT/UPDATE/REFERENCES` and owned-sequence `USAGE/SELECT/UPDATE` authority are assessed through usable membership/SET ROLE paths. Special attributes are not treated as inherited ordinary object privileges. Focused ACL tests passed 21/21. Real PostgreSQL dangerous, harmless, unreachable, PUBLIC/default-ACL, SET ROLE, inheritance-only, runtime, and NOBYPASSRLS controls passed.
- **Phase A:** final sanitized typecheck, lint, full API unit/E2E, database unit, Admin browser 96/96, Customer browser 57/57, build, diff, and conflict scan passed. Failed diagnostic attempts and one bounded timeout remain preserved as explicit non-pass evidence; the timeout was classified `INTERRUPTED` with null exit status.
- **Disposable target:** one fresh cached PostgreSQL 16 target, Docker Desktop `desktop-linux`, `127.0.0.1:55395`, run-owned container/network/volume. All seven unchanged migrations applied and verified; rerun reported no pending migrations. No migration eight was created.
- **Real integration:** actual HTTP → Nest guards → RBAC → unmocked Prisma → PostgreSQL passed success/denial cases, independent denial no-mutation checks, F5 persisted reservation filtering/projection/bounded history, F6 rollback injection at property history/audit/activity, and connection-limit 1 transaction PID control. Local JWKS/admin identity and Redis doubles were loopback-only; no Supabase was contacted.
- **Seed:** guarded core/core/customize/sample/sample/core sequence passed with selected before/after value preservation, exactly four sample properties, collision/no-reparenting safety, and no forbidden seed side effects.
- **Cleanup:** exact run-owned container, volume, network, and private runtime files were removed; no loopback listener remained; no Docker system prune or blanket deletion was used.
- **Evidence:** final evidence, handoff, reproduction ZIP, and payload manifest are external. Final ZIP SHA-256 is `6927d5690ab1fec469d3092c2f3373afdf765b671e44ae1100602e749479c053`. The final Git worktree remains intentionally uncommitted with 25 modified tracked files, 8 untracked entries, 0 staged entries, and no conflicts.
- **Open boundary:** F7 contention/replay remains policy open. Local synthetic results do not infer hosted exposure. This record does not mark staging ready or Month 1 DONE; no Git write, deployment, administrator bootstrap, Supabase/production access, or Month 2 activation occurred.

### Final payload reconciliation

The final post-cleanup reproduction ZIP and manifest were regenerated after the final runner ledger refresh. The final ZIP SHA-256 is `9b9a37a15693526a8aa9b4535b8413cec32d0866453f803d1351f9463d91302d`, with 987 listed payload files. The earlier preliminary payload hash recorded in the preceding append-only section is superseded by this final post-cleanup payload.

### Final payload exclusion correction

The reproduction payload was regenerated after removing generated `.next`/cache output from the external sanitized source copy. The current final ZIP SHA-256 is `926866b109ba5a15e9c68173ff1d8bc045a361aeb6cbee0d642ab748c2a33570`, with 799 payload files and the documented `.env*`/dependency/generated/database exclusions.

### Final ledger-refresh payload correction

The payload was refreshed once more to include the final fingerprinted current-worktree recheck. The authoritative final ZIP SHA-256 is `092644c79090dd7e1be1c7d249d646e1190df5d4ba7be0b8f51de167336b8e7c`, with 804 payload files and the same exclusions.

## Checkpoint 4B — Targeted post-audit source corrections

- **Timestamp:** 2026-09-24 UTC. This is the narrowly authorized S1/S2 correction and test-preparation pass, not another closure run.
- **Authority:** the post-closure Astra audit and final-local-closure independent review. No conclusion below upgrades the earlier historical integration record to current closure or release acceptance.
- **Starting state:** local `main` at `93a62139143c02a5ebbb1b695bb6febe8f37280e`; observed relation `main...origin/main [ahead 2]`; 25 modified tracked files and eight untracked entries, no staged files or unresolved conflicts. The pre-edit, non-secret snapshot is `C:\Users\PC\Documents\RHC_WEB3\RHC-Checkpoint4B-PostAudit-Corrections-starting-snapshot-20260924`; its `manifest.json` SHA-256 is `e9409884a8bde1ae1badddf9703b7249c482366cc50db3c67e1f50b0397db5e0`. All existing work, reports, scripts, archives, failed attempts, F2 `/user-roles` capability alignment, and F3 request-coordinator repairs were preserved.
- **Correction-only source attribution:** `packages/database/prisma/application-acl-preflight.ts` and `apps/api/test/application-acl-migration.spec.ts` were corrected from their snapshotted versions. Four new standalone, opt-in `.harness.cjs` files were added under `apps/api/test/` for shared HTTP support, F5 exact pagination, F6 rollback, and non-owner runtime. This pass did not edit frontend/shared runtime source, seed source, schema, dependencies, or migrations.
- **S1 — FIXED SOURCE / COLLECTOR-AWARE FIXTURE TESTED:** migration-ledger assessment now collects table `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` and per-column `INSERT`/`UPDATE` rights on `public._prisma_migrations`. The superuser-helper catalog path uses underlying ACL/ownership evidence rather than privilege helpers that report the superuser bypass. Collector-to-assessment regressions exercise column-only direct browser/runtime and reachable-helper grants, a superuser-helper column grant, harmless application-runtime DML, and retained table-level detection.
- **S2 — FIXED SOURCE / COLLECTOR-TO-ASSESSMENT FIXTURE TESTED:** a helper's `SUPERUSER` flag is not attributed as ordinary inherited table/schema/sequence/column/ledger authority when the path cannot `SET ROLE`. For superuser helpers, the collector follows actual inheritable ACL/owner paths; the assessment still reports real grants, ownership, role attributes through usable `SET ROLE`, and unreachable/harmless controls. The tests are catalog-query fixtures, not PostgreSQL execution.
- **Prepared only — NOT EXECUTED:** `checkpoint-4b-post-audit-f5-pagination.harness.cjs` fixes persisted timestamp ties and exact expected IDs for `skip=0`, `skip=1`, boundary, and empty pages while retaining customer ownership and company/project-scope checks. `checkpoint-4b-post-audit-f6-rollback.harness.cjs` requires a successful no-trigger status-changing PATCH before testing the history/audit/activity failpoints, proves marker reach and rollback, requires generic sanitized HTTP 500s, and restricts cleanup to captured run-owned IDs. `checkpoint-4b-post-audit-nonowner-runtime.harness.cjs` uses real HTTP guards/RBAC and unmocked Prisma, checks an actual invoker-trigger-attested PostgreSQL application session, and probes insufficient privileges. Auth provisioning's per-request `users`/`user_profiles` synchronization is explicitly snapshotted/restored by all three HTTP harnesses; registration must be disabled to prevent a mismatched token from creating an unowned user. All harnesses require explicit opt-in and a loopback, run-ID-named disposable target. Their static syntax checks passed; no harness or database setup was run.
- **Bounded source/fixture validation:** after building shared declarations from the sanitized copy, focused ACL API unit **27/27**, full API unit **325/325** across 21 suites, database injected-fixture unit **7/7**, typecheck, lint, and API build all passed. All four prepared harness files passed `node --check`; post-build `@rhc/*` resolution pointed into the sanitized copy. The first npm launcher attempt and the initial pre-build/test-fixture failures are retained as failures and were not counted as passes. Exact commands, nullable status/signal, logs, and immutable pre-command fingerprints are in the external evidence directory below. No frontend browser suite was repeated.
- **Migration preservation:** all seven existing `migration.sql` files were SHA-256 compared with the pre-edit snapshot and remain byte-identical. No migration eight, migration execution, schema change, seed CLI/database seed run, or database privilege edit occurred.
- **Seed evidence qualification:** prior source-matched historical seed-collision reports remain historical and preserved. The bounded `@rhc/database` 7/7 unit command ran the existing injected `prisma/seed.spec.ts` fixtures, including its two synthetic collision-rejection assertions; it did not invoke the seed CLI, connect to a database, or repeat historical/live collision scenarios. No seed source changed.
- **External artifacts:** `C:\Users\PC\Documents\RHC_WEB3\RHC-Checkpoint4B-PostAudit-Corrections-20260924\CHECKPOINT-4B-POST-AUDIT-CORRECTIONS-EVIDENCE.md`, `CHECKPOINT-4B-POST-AUDIT-CORRECTIONS-HANDOFF.md`, and `CHECKPOINT-4B-POST-AUDIT-SOURCE-DELTA.zip`.
- **STOP / open proof:** no Docker/container, database connection, migration, seed, administrator bootstrap, live provider, deployment, or Git publication operation occurred. Real PostgreSQL S1/S2 catalog semantics and the F5/F6/non-owner harnesses remain for separate later authorization. No F7 or business-policy work was implemented. This record does not claim checkpoint closure, staging readiness, or release acceptance.
