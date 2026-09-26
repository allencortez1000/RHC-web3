# Month 1 Checkpoint 4 Handoff

This is a preparation and review document. It is not authorization to run a
migration, seed, bootstrap, staging inspection, or deployment.

## Current handoff — Committed local security boundary (2026-09-26)

This section supersedes older current-state, uncommitted-worktree, and pending
local-proof wording in the historical records below. It does not rewrite those
records or upgrade them to live acceptance.

### Repository and publication state

- **Branch:** `main`.
- **Current committed HEAD:** `0551dbec29a1bf19bf1351eae278288e6c6fcffb`
  (`security: harden database acl preflight`).
- **Committed locally:** Commits 1, 2, 3, 4, 5A, 5B, and 6, in that order.
  The full verified hashes and messages are recorded in the current section of
  [audit-corrections-progress.md](audit-corrections-progress.md). The published
  local boundaries cover public Digital ID protection, reservation access,
  capability reporting, dashboard gating, Admin property/capability workflows,
  and ACL/migration tooling. Existing reviewed commits remain untouched.
- **Remote boundary:** no push has occurred in this publication sequence. The
  observed `origin/main` is only a cached local reference; no remote freshness or
  hosted publication claim is made. Local preparation/commit work through
  Commit 6 is complete, not remote publication or deployment.
- **Documentation boundary:** Commit 7 proposes only
  `docs/month-1/audit-corrections-progress.md` and
  `docs/month-1/checkpoint-4-handoff.md`. The index remains empty during this
  documentation review; staging and committing still require human approval.

### Current seven-migration inventory

Exactly seven `migration.sql` files exist under
`packages/database/prisma/migrations`, in this order:

1. `202609110001_month1_foundation`
2. `202609120001_month1_auth_ledger_hardening`
3. `202609140001_identity_history_seed_hardening`
4. `202609140002_application_postgrest_lockdown`
5. `202609150001_authorization_scope_delete_restrict`
6. `202609160001_reservation_foundation`
7. `202609210001_application_acl_hardening`

Migration 7 is additive and committed in Commit 6. It hardens existing
allowlisted application objects; it does not introduce disposable roles,
grants, or RLS policies, or automatically repair unsafe memberships/ledger
ownership. The six historical migrations were not rewritten, and no migration
eight was introduced. All seven retained their raw working-file fingerprints
through validation and staging; Git's CRLF-to-LF normalization is not a SQL
rewrite.

Commit 6 used actual `npm run db:migrate -w @rhc/database` / `prisma migrate
deploy` against an initially empty disposable PostgreSQL 16.15 database. All
seven migrations applied in order, their executed checksums matched seven
completed/non-rolled-back ledger entries, and the repeat deployment found no
pending migrations. This final validation is distinct from the earlier
September 25 CP4B direct-SQL execution evidence and says nothing about a hosted
Prisma deployment history.

### Bounded validation and retained qualifications

- **Earlier CP4B local HTTP/catalog proof:** F5 exact pagination, F6 rollback,
  non-owner runtime, and S1/S2 catalog cases were exercised locally. **F5 passed
  using a corrected execution copy only.** The original prepared harness was
  not silently replaced and must not be described as passing unchanged. Those
  source-snapshot results are not a fresh full validation of final HEAD.
- **Commit 6 maintained coverage:**
  `apps/api/test/application-acl-migration.spec.ts` passed **69/69** focused tests;
  the real package preflight passed **54/54** disposable catalog cases, rejecting
  42 unsafe configurations and accepting 12 safe controls. Database tooling
  typecheck, preflight/spec lint, and whitespace checks passed. No broad
  technical suite was rerun for this documentation update.
- **ACL assessment:**
  `packages/database/prisma/application-acl-preflight.ts` separately assesses
  ADMIN OPTION regrant paths, SET/INHERIT usability, migration-ledger ownership
  despite revoked DML, and implicit `pg_database_owner` paths. It retains
  special-role checks for SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE and the existing
  schema, table, column, sequence, application-owner, and ledger-mutation
  protections. Non-superuser ADMIN is not treated as permission to regrant a
  superuser role, and special attributes are not ordinary inherited privileges.
- **Actual command/transport:** `npm run db:acl:preflight -w @rhc/database` was
  run with explicit loopback target and creator/runtime arguments through
  Prisma. Its safe read-only baseline returned exit 0, no findings, and
  `ready: true`; this is a catalog readiness result, not live-policy approval.
- **Runtime distinction:** the preflight reports
  `runtimeAssessment: declared-not-executed`. A separate restricted non-owner
  TCP login executed SELECT with RLS active and was denied ledger UPDATE
  (`42501`). Its disposable SELECT grant and RLS policy are **not production
  policy** or comprehensive tenant-isolation proof.
- **Operation boundary:** no seed/bootstrap was run in the September 25 bounded
  pass, Commit 6 final validation, or this documentation update. Historical
  approved synthetic seed runs below are separate records, not new authority to
  seed. No Supabase/live/staging database was modified. Commit 6's disposable
  container and tmpfs data were removed; no deployment or push occurred.

### Documentation publication decisions

Only the two maintained documents named above belong in Commit 7. The following
untracked documents were reviewed, not edited or approved for inclusion:

| Document under `docs/month-1/` | Classification | Disposition |
| --- | --- | --- |
| `CHECKPOINT-4B-FINAL-EVIDENCE-UPDATE.md` | **B — preservation/evidence record** | Preserve outside the commit. It describes the September 25 `93a6213` source snapshot, 27-test/26-catalog-case results, and direct-SQL execution; it depends on excluded local evidence workspaces. |
| `CHECKPOINT-4B-FINAL-PRESERVATION.json` | **B — generated preservation record** | Preserve outside the commit. Its timestamp, verification program, old HEAD/fingerprints, and machine-specific command attest that historical snapshot, not Commit 6. Do not regenerate it as if it were current. |
| `Checkpoint 4B Git Readiness Review.md` | **C — stale/intermediate material** | Leave untracked. It is a conversation/tool-output export with an older Git inventory, commit proposal, and findings superseded by the reviewed publication sequence. |

The following directories and all their contents must remain excluded:

- `docs/month-1/cp4b-final-catalog-20260925/`
- `docs/month-1/cp4b-final-http-20260925/`

The following prepared harnesses must also remain excluded:

- `apps/api/test/checkpoint-4b-post-audit-f5-pagination.harness.cjs`
- `apps/api/test/checkpoint-4b-post-audit-f6-rollback.harness.cjs`
- `apps/api/test/checkpoint-4b-post-audit-http-support.harness.cjs`
- `apps/api/test/checkpoint-4b-post-audit-nonowner-runtime.harness.cjs`

Temporary validation snapshots/reports, dependencies, generated/database
artifacts, environment files, and credentials are not documentation commit
inputs. Excluded local/archive evidence is not promised as part of a clean
source checkout; maintained summaries preserve its qualifications, not a
requirement to publish the workspace.

### Acceptance and next approval gate

Local technical validation and local Git preparation through Commit 6 are
complete only within their reviewed scopes. This handoff does **not** declare
Checkpoint 4B or Month 1 DONE, production/staging validated, Supabase
ACL/runtime policy approved, or public deployment authorized.

**ClickUp remains the source of truth for live completion status.** No live
project-control evidence was accessed or updated during this pass. Provider,
staging, and live acceptance remain separate from repository publication.
F7 contention/replay, the recorded business/legal decisions, hosted runtime
policy, and operational activation remain open or separately gated. Read-only
staging inspection, any later migration/write, seed, bootstrap, and deployment
require their own approval; a local pass cannot combine those gates.

The next repository action is human review of the two-file Commit 7 allowlist.
This documentation pass stops before staging, commit, or push.

## Historical checkpoint records

All sections below describe their checkpoint-time state. Old HEADs, migration
counts, test totals, pending-proof statements, and uncommitted/no-publication
statements must not be substituted for the current handoff above.

## Historical — Checkpoint 3 branch and integration boundary

At Checkpoint 3, the work remained on local `main` at
`4953810a22bcaf61b8c8961c2439fffafd593549`. At that checkpoint's start,
`origin/main` was `53fc2fbe56481b2a26dc5676eff4a914548a976d`; local `main` was
zero commits ahead and three commits behind. The remote commits change
frontend/tooling/package paths, including `packages/ui/src/runtime.tsx`,
`packages/ui/src/index.tsx`, customer login/properties/Supabase browser files,
admin/customer CSS, package manifests/lockfile, editor settings, and
`schemas/package.schema.json`. They were not merged.

Checkpoint 3 added narrow admin portal capability wiring in:

- `apps/admin-web/app/page.tsx`
- `apps/admin-web/app/dashboard/page.tsx`
- `apps/admin-web/app/admin-data.tsx`
- `apps/admin-web/tests/smoke.spec.ts`
- `apps/customer-web/tests/fixtures.ts` (fixture support only)

Checkpoint 3 also made the customer consent component reflect configured
policy state. Before any later frontend integration, compare these local
changes with the incoming remote paths and preserve the existing visual
system. Do not replace `packages/ui/src/runtime.tsx` blindly. The deferred
acceptance test must cover loading, no-access, API 403, expired/disabled
account, and policy-not-configured states.

The backend contracts to preserve are:

- `GET /api/v1/admin/capabilities` — authenticated, no-store, caller-specific
  effective module read permissions and bounded RBAC scopes. It grants no
  permission and does not replace resource guards.
- `GET /api/v1/me/consents` — static type/purpose metadata plus
  `configured`, `consent_version`, and `publication_reference` state.
- `POST /api/v1/me/consents` — exact configured version required for grants;
  withdrawals remain historical and available without current configuration.
- `PATCH /api/v1/me` — authenticated self-contact update using
  `UserProfile.mobile_number`; signup metadata remains unverified and is not
  implicitly copied.

## Historical — Checkpoint 3 five-migration inventory

All migration source is under `packages/database/prisma/migrations`:

1. `202609110001_month1_foundation`
2. `202609120001_month1_auth_ledger_hardening`
3. `202609140001_identity_history_seed_hardening`
4. `202609140002_application_postgrest_lockdown`
5. `202609150001_authorization_scope_delete_restrict`

No migration was applied during Checkpoint 3. The fifth migration is additive
and protects nullable authorization scopes with restrictive foreign keys. A
later checkpoint must review the full chain in order, inspect SQL-specific
indexes/constraints/RLS/ACL behavior, and never edit historical migration
files.

## Historical — Checkpoint 3 disposable PostgreSQL verification plan

Create a newly isolated disposable PostgreSQL target only after the separate
approval gate is granted. Required tests include:

- apply all five migrations in order and verify the migration ledger;
- create a company-scoped role and assignment, attempt company deletion, and
  assert `RESTRICT`, unchanged assignment, and no global broadening;
- create a project-scoped assignment, attempt project deletion, and assert
  `RESTRICT`, unchanged assignment, and unrelated tenant denial;
- prove intentional NULL-scoped global assignments still authorize where
  intended;
- execute representative governance/key issuance operations with a
  PostgreSQL connection limit of one and bounded timeouts, proving nested RBAC
  reads use the active transaction client rather than an independent outer
  connection;
- verify transaction rollback for audit/event failures and concurrent
  idempotency/ID operations;
- inspect RLS enablement, policies, owner/BYPASSRLS behavior, direct/column/
  inherited grants, owned sequences, views, and SECURITY DEFINER paths;
- verify browser roles cannot directly read/write application tables while
  the approved backend role retains only intended access.

Fixture tests and Prisma mocks do not prove these PostgreSQL properties.

## Seed modes and expected records

The import-safe `runSeed(db, options)` helper is covered with injected test
doubles. A later approved real run must verify, without resetting existing
state:

- core mode always ensures exactly the existing eight catalog codes:
  `RHC`, `AMICA_CONDO`, `RHBC`, `AMICA_WATER`, `AMICA_MART`, `RBAC`, `RSSC`,
  and `COASTLINE` (additional legitimate target records are not deleted);
- new `RHC` and `AMICA_CONDO` defaults are `ACTIVE`; new other catalog rows
  are `PREPARED`; existing status/API/reward/integration state is preserved;
- core mode always ensures `AMICA-T1` / `Amica Residences Tower 1` owned by
  `AMICA_CONDO` and does not create sample properties;
- `SEED_SAMPLE_INVENTORY=true` adds only the four existing synthetic sample
  definitions, marked `synthetic-sample`; it does not reset or delete
  existing property status, ownership, price, or metadata;
- an existing AMICA-T1 or sample property owned by another company/project is
  a controlled conflict, never a silent reparenting;
- new role/permission/feature/service/setting definitions may be inserted,
  but existing operator mappings, statuses, flags, service state, settings,
  and acceptance state are not reconciled or reset;
- no users, passwords, assignments, customer-property links, consent
  records, partner credentials, or API clients are created by ordinary seed;
- no company API or future Web3 feature is enabled by seed execution.

Do not execute `db:seed` in this handoff. The source tests are fixture
verification only.

## Staff and workflow decisions remaining

See [the source-derived staff matrix](staff-role-workflow-matrix.md).
The main decision is first association of an otherwise unlinked customer:
`PROPERTY_ADMIN` may manage a target property but does not have
`customer.view`, and the API correctly refuses to treat a known customer UUID
as visibility. Business/security owners must approve either a documented
global-operator handoff or a least-privilege workflow; do not add a broad
permission merely for a dropdown.

Other decisions to retain for review:

- whether any role should receive additional existing permissions;
- who may perform formal company/integration activation and allowlist event
  types;
- whether verification approval should remain a separate global
  `user.manage` workflow for compliance roles;
- what finance, document, and rewards workflows are actually approved (no
  absent endpoints should be invented).

`AUDITOR` remains read-only. `CUSTOMER` remains denied from Admin API even if
legacy customer role rows contain read permission definitions. Disabled or
locked accounts and expired/mismatched grants remain denied.

## Approved policy inputs still missing

Production consent acceptance is not onboarding-ready until business/legal
owners provide, for each required policy and any optional purpose:

- approved Privacy Policy and Terms text;
- exact published version identifiers;
- publication references/locations and effective-policy decisions;
- retention/deletion requirements and an owner for future changes.

Checkpoint 3 uses only clearly synthetic policy fixtures in tests. Runtime
defaults expose no approved version and do not fabricate acceptance from the
registration checkbox or signup metadata. Historical withdrawal remains
available and must not require a newer policy.

## Company activation prerequisites

See [company-integration-activation.md](company-integration-activation.md).
A later operator process must evidence company approval, `ACTIVE` status,
approved `api_enabled`, intentional hashed client credential issuance,
minimum approved scopes, explicit existing event allowlist, applicable
customer consent, and audit evidence. Deactivation must disable API/status,
revoke affected clients, and invalidate applicable consent/replay paths.

The repository currently has no approved dedicated management path for
formally changing `company_events` or recording partner activation approval.
Do not add an unrestricted public endpoint or interpret an `ACTIVE`
metadata row as approval. This is a business/security gate.

## Staging inspection requirements

Only after a valid, explicitly approved target is identified, inspect before
any migration or seed approval:

- actual database host/project identity without recording credentials;
- migration and object-owner/runtime roles, memberships, inheritance,
  `BYPASSRLS`, and connection limits;
- table, column, sequence, schema, view, function, and default privileges;
- RLS flags, policies, SECURITY DEFINER functions, views, and indirect access;
- application/backend/browser role separation and expected grants;
- existing company/project/role/assignment/feature/service/settings state;
- whether any real user, customer, consent, integration, or API client data
  would be touched.

Inspection output must be sanitized and must not include connection strings,
keys, real identities, or customer data.

## Separate approval gates

1. **Migration gate:** approve target, role/ACL/RLS plan, backup/restore plan,
   and disposable migration/FK verification before any staging migration.
2. **Seed gate:** approve core versus sample mode and preservation/collision
   results before any target seed. Never use a rerun to reconcile role grants
   or operator state.
3. **Admin bootstrap gate:** separately approve identity verification,
   database target confirmation, review reference, and explicit grant; do not
   run the bootstrap CLI in Checkpoint 4 preparation.
4. **Provider/integration gate:** separately approve live Supabase/provider,
   partner activation, scopes/events/consent, and revocation ownership.
5. **Frontend integration gate:** after remote frontend work is intentionally
   integrated, run affected builds/browser acceptance against safe local
   fixtures; do not call the remote code a local merge.

## Status boundary

Checkpoint 3 source and fixture work can be reviewed locally. It is not live
PostgreSQL verification, staging initialization, legal approval, partner
acceptance, administrator bootstrap, or Month 1 release acceptance.

## Checkpoint 4A — Frontend integration completed for review

Checkpoint 4A integrated `origin/main` at `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e` after creating local safety commit `d3d2a9604c34073ad1b8b235a80343134255cb25`. The resulting merge preserves Checkpoints 1–3 and the colleague’s visual/frontend additions. The exact merge commit SHA is recorded in the Checkpoint 4A evidence bundle and final Git state.

### Integrated contracts

- Admin login uses real Supabase PKCE authentication, then lands at `/`; effective capabilities select the first usable module. Customer login remains `/dashboard`.
- `GET /admin/capabilities` now reports module usability using actual list-guard scope semantics, plus separate mutation permission data. Resource APIs remain authoritative.
- Admin controls distinguish read from write permissions. AUDITOR/read-only accounts can inspect permitted records but do not receive mutation controls; direct unauthorized writes remain 403.
- Missing Supabase configuration and all demo/mock browser shortcuts fail closed. No fake bearer token, client-generated admin identity, hardcoded demo password, or customer credential disclosure is part of the merged runtime.
- Customer property detail prefers authorized `/me/properties` records and only falls back to the public available-property lookup when no authorized relationship exists. Marketplace categories render existing API directory records; Month 2 settlement remains disabled.
- Local browser contracts use Customer `3002`, Admin `3003`, API `3001`; development CORS and Playwright configs are aligned.

### Remote paths and conflict decisions

Shared/runtime/auth-sensitive paths were manually reviewed rather than resolved with blind ours/theirs selection. The remote historical lockdown migration edit was not retained; the new reservation foundation migration remains pending and must be reviewed as migration six. The remote eager demo seed was not retained; the import-safe injected core/sample seed remains canonical. Conflicts and cumulative attribution are recorded in `audit-corrections-progress.md` and the Checkpoint 4A evidence bundle.

### Checkpoint 4B requirements

1. Review all six migration sources in order on a newly created disposable PostgreSQL target. Do not alter or apply them to staging.
2. Verify reservation migration ordering/checksums, authorization-scope deletion `RESTRICT`, reservation/property-status constraints, connection-limit-1 nested transaction behavior, rollback/concurrency/idempotency, and RLS/ACL/object ownership.
3. Run the import-safe seed helper only with injected doubles for source regression; separately approve any real core seed target/mode. Do not run `db:seed` here.
4. Inspect approved staging identity, migration/runtime roles, grants, RLS/policies/views/functions, existing data, and target ownership only after the migration gate is approved.
5. Keep company partner activation/event allowlisting, first unlinked-customer association, and legal policy/version inputs as explicit business/security decisions.
6. Re-run both browser suites after any future frontend merge or runtime contract change; no blind replacement of shared runtime is approved.

### Checkpoint 4A validation boundary

**SOURCE IMPLEMENTED / FIXTURE TESTED:** combined typecheck, lint, unit/service **289/289**, database seed **7/7**, focused reservation/Digital-ID/controller **20/20**, API E2E **167/167**, Customer browser **57/57**, Admin browser **76/76**, all three builds, both npm audits, and diff checks passed with synthetic/local fixtures. **LIVE VERIFIED:** none. No database connection, migration, seed, bootstrap, provider settings change, deployment, or Month 2 activation occurred. This handoff is not Month 1 release acceptance.

## Historical summary — Checkpoint 4A review corrections

The preceding statements that the frontend was not merged and that only five
migrations existed are **HISTORICAL CHECKPOINT 3 / PRE-INTEGRATION evidence**.
They are preserved for attribution and must not be read as the current state.
The following was the state after that reviewed merge and its bounded
review-correction pass; the current publication state is recorded at the top.

- Branch at that checkpoint: `main`.
- HEAD at that checkpoint: `93a62139143c02a5ebbb1b695bb6febe8f37280e`.
- Observed local `origin/main` snapshot: `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e`; this is not a claim about current GitHub state.
- Relation at that checkpoint: `origin/main..HEAD` = `2`; `HEAD..origin/main` = `0`; merge base = `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e`.
- The colleague frontend is already integrated by merge commit `93a6213`; no merge was repeated in the review-correction pass. Checkpoints 1–3 and their safety commit remain preserved.
- The review-correction working tree is intentionally uncommitted and contains only the bounded Admin scope, reservation, public Digital ID, fixture/test, and documentation changes recorded in the progress file.
- `.c4a-exporter.cjs` is absent; no exporter was recreated or cleaned by blanket deletion.

### HISTORICAL/SUPERSEDED six-migration inventory

This six-item list was the Checkpoint 4B planning inventory before migration
seven was present. It is preserved as historical evidence, not the current
inventory. The older five-item list above is historical and incomplete; the
current seven-item inventory is recorded in the post-Astra section below.

1. `202609110001_month1_foundation`
2. `202609120001_month1_auth_ledger_hardening`
3. `202609140001_identity_history_seed_hardening`
4. `202609140002_application_postgrest_lockdown`
5. `202609150001_authorization_scope_delete_restrict`
6. `202609160001_reservation_foundation`

No migration was applied, repaired, reset, or connected to a database in this
pass. Existing migration files and `schema.prisma` were not edited. Migration
six is source-only pending disposable PostgreSQL review, including ordering,
checksums, reservation constraints/RLS, and interaction with authorization
scope `RESTRICT`.

### Historical review-correction status

- **FIXED SOURCE:** Admin mutation/reference actions now evaluate typed effective
  company/project grants against the actual endpoint target; property metadata
  edits do not require status permission; status changes remain separately
  gated. Reservation creation enforces active project/company eligibility in the
  transaction and returns final customer-minimal/Admin-authorized projections.
- **FIXED SOURCE:** anonymous Digital ID verification no longer decodes/looks up
  guessed identifiers. The page and QR-style visual state honestly remain
  unavailable/non-scannable until an approved sharing contract exists.
- **FIXTURE TESTED:** API service/controller/Digital ID tests and synthetic Admin
  and Customer browser suites pass. These fixtures do not prove PostgreSQL
  locking, uniqueness, rollback, concurrency, RLS, ACL, or live provider state.
- **POLICY / APPROVAL OPEN:** public verification sharing contract; formal
  company activation/event allowlist management; first unlinked-customer
  association; legal policy/version inputs; reservation 72-hour/manual expiry/
  conversion policy confirmation.

### Historical validation and approval boundary

Final local results are recorded in `audit-corrections-progress.md` and the
external review-fix evidence bundle: API unit/service **289/289**, database seed
**7/7**, focused reservation/Digital-ID/controller **20/20**, API fixture E2E
**167/167**, Admin browser **76/76**, Customer browser **57/57**, all three
builds passed, and both npm audits reported zero vulnerabilities. No real
database/provider operation was performed.

Read-only staging inspection and staging-write/migration approval remain
separate gates. Before any staging write, an expressly approved target must be
inspected and its role/ACL/RLS/object ownership state recorded without secrets;
only then may a separate migration plan be approved. Checkpoint 4B must not
combine inspection, migration, seed, or bootstrap approval implicitly.

## Historical recovery continuation — Review-Corrections state

The power-outage recovery began from local `main` at
`93a62139143c02a5ebbb1b695bb6febe8f37280e`, with observed remote-tracking
snapshot `origin/main` at `aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e`.
The reviewed merge baseline remains in history; no merge or history operation
was repeated. Recovery found no staged files, no unresolved conflicts, no
truncated source, no partial documentation file, no package-manifest or
lockfile change, no schema/migration change, and no repository `.c4a-exporter.cjs`.
The external non-secret starting snapshots remain at
`C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4A-ReviewFix-starting-snapshots`.

The only resumed source correction was in
`apps/admin-web/app/capability-scopes.ts`: reservation row targets now derive
company/project ownership from the nested `property.project` response shape.
A synthetic Admin browser fixture and regression now prove a matching
company-scoped reservation grant offers actions only for the matching target.
All earlier Admin, reservation, Digital ID, and documentation work was
preserved.

The historical final verification is fixture/local only: typecheck, lint,
unit/service, database seed, focused reservation/Digital-ID/controller, API
E2E, Customer/Admin browser, all three builds, both audits, diagnostics, and
diff checks passed. No database, staging, provider, seed CLI, bootstrap,
deployment, or Month 2 operation was performed in that source-only record. The
six-migration inventory above is historical/superseded; the current inventory is
seven migrations and is recorded below.

## Checkpoint 4B — Final disposable PostgreSQL verification handoff

This section records the completed local-only verification run. It is not
permission for staging, production, Supabase, live providers, bootstrap,
deployment, Git publication, or Month 2 activation.

- **Run:** `rhc-cp4b-20260921T023035Z-89527f045404`.
- **Repository input:** current uncommitted working tree at `93a62139143c02a5ebbb1b695bb6febe8f37280e`, including the three required untracked corrections. Cached remote information remained labeled cached/not freshly fetched. No application source, tests, schema, migration, dependency manifest, or lockfile was changed.
- **Target:** one fresh run-owned PostgreSQL 16.15 container using the exact local cached image digest `sha256:3c5c8892d184f738f4fe282d14ddaa613a38f00f4189d2d94725ebe6f2909ddb`, TCP `127.0.0.1:56546`, fresh named volume, and dedicated run-owned network. Authenticated host-to-container SQL and wrong-password rejection passed.
- **Execution controls:** all application/seed execution used the sanitized external snapshot; child environments were explicit allowlists with exact `DATABASE_URL`/`DIRECT_URL`; the Node HTTP/TCP guard allowed only the registered loopback target and local tsx IPC. Native Prisma engines and Docker transport remain outside monkey-patch coverage. No real `.env`, credentials, private keys, provider URLs, or user data were exported.

### Acceptance summary

The external `results.json` is authoritative and contains one record for each
Astra Section 6 case. Totals are **6 PASS, 1 conditional FAIL, 5
OBSERVED_POLICY_OPEN**. Case 11’s FAIL is the intentionally retained adverse
ACL B/C reproduction: scenario A denied browser ACLs, while B/C broadened
defaults granted migration-six table privileges and allowed transactional
`TRUNCATE`; RLS still blocked inserts. This does not establish hosted exposure.

Cases 1–4 and 8–9 passed their executed invariants. Cases 5–7 and 12 remain
policy-open where source behavior is observable but the business cutoff,
replay/error contract, or legal/current-version rule is not approved. Case 10
preserved customized values and rejected foreign ownership without reparenting;
the same-project natural-key/provenance behavior remains explicitly reported.
F1–F7 remain open; F5/F6/F7 were reproduced or exercised but not fixed.

### Evidence and stop boundary

Full sanitized evidence, `results.json`, `migrations.json`,
`target-manifest.json`, source fingerprints, command ledger, run state, SQL
fixtures, scripts, logs, cleanup result, and the reproduction ZIP are retained
under:

`C:\Users\PC\Documents\RHC_WEB3\RHC-Checkpoint4B-20260921T023035Z-89527f045404`

The run used no Supabase/staging/production or existing database; no live
provider; no administrator bootstrap; no Git write/commit/push; no deployment;
no production-code/schema/migration edit; and no operational Month 2 activation.
This handoff does not mark Month 1 accepted or staging ready. The final cleanup
outcome is in the external `cleanup-result.json`; after evidence export, the run
stopped at the local disposable-target boundary.

## Checkpoint 4B review-corrections recovery completion

This append-only section records the completed continuation of the approved
correction run. It does not reopen the historical run or authorize any live
migration, provider, staging, bootstrap, deployment, or Month 2 action.

- **Recovery run:** `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4B-ReviewFix-20260921T170000Z-9d4e7a1c`; snapshot `recovery-20260922T053245Z`.
- **Source:** local `main` at `93a62139143c02a5ebbb1b695bb6febe8f37280e`. Initial, post-correction, and final external source fingerprints are preserved. The worktree remained intentionally unstaged and no Git history or branch operation was performed.
- **Container/scenario identity:** the run-owned PostgreSQL container, full ID, image digest, named volume/network, mount, labels, and `127.0.0.1:56571 -> 5432` binding matched the preserved ownership records. All four scenarios have matching markers, seven finished migrations, zero checksum mismatches, and `29/29` RLS-enabled application tables. Migration seven is the already-existing additive file with SHA-256 `6d5e73d0d69306d52f295e2b52b8afb10c2b89ddf70c14f5a6eabc4fea4a7573`; it was not rerun or rewritten.
- **ACL correction:** A was ready with zero defaults/findings. B/C were initially not ready with 40 default ACL findings each; explicit approved remediation was recorded, after which both were ready with zero defaults/findings. Browser roles lacked superuser, `BYPASSRLS`, and `CREATEROLE`; wrong-password TCP rejection passed. Existing synthetic runtime rows were preserved.
- **Clean seed state:** eight companies and four synthetic sample properties; zero users, user roles, customer-property links, consents, or API clients. No real seed command or blind write was run during recovery.
- **Completed local validation:** API unit **294/294**, API fixture E2E **170/170**, database seed regressions **7/7**, Admin browser **79/79**, Customer browser **57/57**; final typecheck, lint, and all-workspace build each returned status 0. The Customer failure was traced to missing synthetic public Supabase fixture configuration, corrected in the isolated harness, and the final suite passed. Interrupted/failed attempts remain preserved separately.
- **Approved correction set:** `apps/admin-web/app/admin-data.tsx` retains last-known capabilities while revalidation is loading; `apps/admin-web/tests/smoke.spec.ts` supplies the matching project property grant, waits for `Changes saved.`, and checks the intended no-access/data-minimization contract. No production schema or migration was changed.
- **Historical recovery boundary:** the prior recovery record described the approved F1–F6/local revalidation sequence as complete for that recovery. That is preserved historical evidence, not the current post-Astra unconditional closure classification. F7, formal activation/event allowlisting, first unlinked-customer association, legal policy/version inputs, administrator bootstrap, live Supabase/staging/production verification, deployment, and Month 2 remain open or separately gated.
- **Evidence:** the compact report, reproduction ZIP, full logs, source fingerprints, SQL summaries, and cleanup result are retained under the external recovery run directory. This handoff is not Month 1 release acceptance or staging readiness.

## Checkpoint 4B - Post-Astra bounded source-only correction pass

This was the source-only handoff for that Astra audit pass. It does not
reopen the historical disposable PostgreSQL run above and does not authorize a
new database, container, migration, provider, staging, bootstrap, deployment,
or Month 2 operation.

- **Source identity:** branch `main`, HEAD `93a62139143c02a5ebbb1b695bb6febe8f37280e`. Starting and final non-secret fingerprints, exact changed/new-file attribution, hashes, and command records are in `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4B-SourceCorrections-20260923T042323Z\CHECKPOINT-4B-SOURCE-CORRECTIONS-EVIDENCE.md`.
- **Current migration inventory:** seven sources, not six: `202609110001_month1_foundation`, `202609120001_month1_auth_ledger_hardening`, `202609140001_identity_history_seed_hardening`, `202609140002_application_postgrest_lockdown`, `202609150001_authorization_scope_delete_restrict`, `202609160001_reservation_foundation`, and `202609210001_application_acl_hardening`. The prior six-item heading is historical/superseded. Migration seven was not edited or executed in this pass.
- **F2 - FIXED SOURCE / FIXTURE TESTED:** the server capability contract keeps `/roles` under existing company/global semantics and makes `/user-roles` global-only. Endpoint authorization remains authoritative. API, frontend, fixture, deep-link, and browser regressions cover global/company/project role viewers and query non-execution after denial.
- **F3 - FIXED SOURCE / FIXTURE TESTED:** capability effect and imperative revalidation share latest-request identity. Older responses cannot overwrite newer denial/error/loading/authority state; display data is retained during refresh and current errors fail closed for mutations. Deterministic coordinator and browser mutation regressions are maintained.
- **ACL preflight - FIXED SOURCE / FIXTURE TESTED:** catalog/query assessment now follows browser and declared-runtime SET ROLE/inheritance paths to ordinary helpers and checks dangerous table/schema/ledger/ownership/role authority without automatic cleanup. Static injected fixtures cover reachable, unreachable, harmless, runtime, direct-browser, and creator/owner cases. Real PostgreSQL SET ROLE execution remains pending.
- **F1/F4/F5:** maintained source/fixture/browser regressions were added for Digital ID review eligibility and non-issuance, both dashboard routes and audit permission/no-request behavior, and reservation tenant filters/projections/RBAC/pagination/order/history bounds. F5's existing source query fix was not redesigned.
- **F6:** typed transaction history/audit/event writes and metadata-only behavior remain covered by source/fixture tests. Real PostgreSQL rollback proof remains pending separately.

### Validation result for that source-only pass

- API focused unit **25/25**; focused API fixture E2E **91/91**.
- Admin coordinator/browser focused rerun **59 passed**.
- API full unit **306/306**; API full fixture E2E **174/174**; database **7/7**.
- Full Admin browser **96/96**; full Customer browser **57/57**; the initial Admin **95/96** timing-only attempt is preserved in the external log and was corrected with an auto-retrying assertion.
- `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build:all` returned status 0. `git --no-pager diff --check` and conflict-marker checks are recorded in the final external ledger.

### Open proof and approval gates

- Combined HTTP + PostgreSQL proof is pending. This pass used no database connection and only synthetic/local fixture/browser configuration.
- Real PostgreSQL F6 rollback, real PostgreSQL SET ROLE/helper-role execution, seed value-preservation, hosted ACL/creator/runtime strategy, and live provider/staging/production verification remain pending.
- F7 remains open. Business/legal policy, formal company activation/event allowlisting, first unlinked-customer association, administrator bootstrap, and reservation lifecycle/replay decisions remain open or separately gated.
- Staging is not ready and Month 1 is not DONE.

**Source-only safety confirmation:** NO Git write; NO database/container operation;
NO migration execution/edit; NO Supabase/staging/production; NO live provider; NO
bootstrap; NO deployment; NO Month 2.

## Checkpoint 4B - Final local closure and disposable integration handoff

This append-only section records the completed bounded local closure run. It does not mark Month 1 DONE and does not authorize hosted, staging, production, bootstrap, deployment, or Month 2 activity.

- **Run/evidence:** `C:\Users\PC\Documents\RHC_WEB3\RHC-Month1-Checkpoint4B-FinalLocalClosure-20260924T014438Z`; starting fingerprint `a1c934d88b9312d6eb86d6b7e0c8d8883dc309347db89361f7333b1ae753e1ba`; sanitized fingerprint `975c7a243d8ebe30939aeff1a7647107ef04b88dc6e35b18412e0f39c90401a5`.
- **ACL source closure:** reachable dangerous column and owned-sequence privileges are assessed for usable browser/runtime membership and SET ROLE paths. `SUPERUSER`, `BYPASSRLS`, and `CREATEROLE` require usable SET ROLE semantics. Focused ACL suite passed 21/21 and real PostgreSQL controls passed.
- **Final validation:** sanitized typecheck, lint, full API unit/E2E, database unit, Admin 96/96, Customer 57/57, build, diff, and conflict scan passed. The runner retained failed diagnostics and one explicit interrupted timeout; neither was classified as success.
- **Disposable PostgreSQL:** fresh cached PostgreSQL 16 target at loopback port 55395, seven unchanged migrations, zero checksum mismatch, all expected schema/RLS/ACL checks, and final no-pending rerun.
- **Actual integration:** real HTTP/Nest/AuthGuard/PermissionGuard/RbacService/FeatureGuard/unmocked Prisma/PostgreSQL passed required success and denial cases. Denial cases had independent business-state no-mutation checks. Persisted F5 filtering, customer projection minimization, bounded Admin event history, F6 rollback at all three requested writes, connection-limit 1 PID evidence, and seed value preservation passed.
- **Cleanup:** exact container, volume, network, six private run files, and loopback listener were removed/verified. No blanket Docker cleanup was used.
- **Outputs:** `CHECKPOINT-4B-FINAL-LOCAL-CLOSURE-EVIDENCE.md`, `CHECKPOINT-4B-FINAL-LOCAL-CLOSURE-HANDOFF.md`, `CHECKPOINT-4B-FINAL-LOCAL-CLOSURE-REPRODUCTION.zip`, and `manifest.json` are outside the repository. ZIP SHA-256: `6927d5690ab1fec469d3092c2f3373afdf765b671e44ae1100602e749479c053`.
- **Remaining:** F7 contention/replay, business/legal policy, hosted ACL strategy, live-provider behavior, staging/production verification, bootstrap, deployment, and Month 2 remain open or separately gated. Final Git state is intentionally uncommitted: branch `main` ahead of `origin/main` by 2, 25 modified tracked files, 8 untracked entries, 0 staged, no conflicts.

### Final payload reconciliation

The final post-cleanup reproduction ZIP and manifest were regenerated after the final runner ledger refresh. Final ZIP SHA-256: `9b9a37a15693526a8aa9b4535b8413cec32d0866453f803d1351f9463d91302d`; payload count: 987. This supersedes the preliminary pre-final-ledger payload hash in the preceding append-only section.

### Final payload exclusion correction

The reproduction payload was regenerated after removing generated `.next`/cache output from the external sanitized source copy. Current final ZIP SHA-256: `926866b109ba5a15e9c68173ff1d8bc045a361aeb6cbee0d642ab748c2a33570`; payload count: 799, with the documented `.env*`/dependency/generated/database exclusions.

### Final ledger-refresh payload correction

The payload was refreshed once more to include the final fingerprinted current-worktree recheck. Authoritative final ZIP SHA-256: `092644c79090dd7e1be1c7d249d646e1190df5d4ba7be0b8f51de167336b8e7c`; payload count: 804, with the same exclusions.

## Historical — Checkpoint 4B targeted post-audit correction handoff

This append-only record follows the Astra audit and independent closure review. It is **not** a second full closure run and does not supersede the historical 2026-09-24 closure record above. The post-audit source corrections are limited to S1/S2 and separately named, opt-in future HTTP harnesses.

- **Starting identity:** branch `main`, HEAD `93a62139143c02a5ebbb1b695bb6febe8f37280e`; 25 tracked modifications, eight untracked entries, nothing staged, no conflicts. The full pre-edit non-secret snapshot is outside the repository at `C:\Users\PC\Documents\RHC_WEB3\RHC-Checkpoint4B-PostAudit-Corrections-starting-snapshot-20260924` (manifest SHA-256 `e9409884a8bde1ae1badddf9703b7249c482366cc50db3c67e1f50b0397db5e0`). The original working copy and prior F2/F3 repairs were retained.
- **S1 — source corrected / fixture tested:** `application-acl-preflight.ts` now includes column-only `INSERT`/`UPDATE` authority on `public._prisma_migrations` in ledger mutation assessment, in addition to existing table-level mutation checks. Collector-aware fixtures cover direct browser/runtime roles, reachable helpers, a superuser helper's actual column ACL path, legitimate application runtime DML, and table-level control.
- **S2 — source corrected / fixture tested:** a reachable `SUPERUSER` helper's bypass answer no longer fabricates inherited ordinary object privileges when `SET ROLE` is unavailable. Actual inheritable grants/ownership remain detectable, as does special-role authority through a usable `SET ROLE` path. Harmless and unreachable controls are covered. No PostgreSQL semantics are claimed as executed.
- **Prepared, not run:** `apps/api/test/checkpoint-4b-post-audit-f5-pagination.harness.cjs`, `...f6-rollback.harness.cjs`, and `...nonowner-runtime.harness.cjs`, plus `...http-support.harness.cjs`. F5 specifies fixed persisted timestamps with a tie, independent expected ordering, exact page IDs, and retained ownership/scope checks. F6 first proves a successful no-trigger status PATCH, then proves intended history/audit/activity failpoint reach and transaction rollback while requiring generic sanitized 500s. Non-owner coverage uses real HTTP guards/RBAC, unmocked Prisma, a distinct NOBYPASSRLS candidate login, and a run-owned invoker-trigger attestation of actual `session_user`/`current_user`. All three harnesses account for per-request Auth synchronization writes and restore only captured actor/profile fields; they require registration disabled and refuse a non-loopback/non-run-ID database target. **No prepared harness was executed.**
- **Final bounded validation:** focused ACL API unit 27/27; full API unit 325/325 across 21 suites; database fixture unit 7/7; typecheck, lint, API build, four `node --check` validations, and built workspace-resolution verification passed. An initial launcher quoting failure and first test run failures are preserved and explicitly excluded from successful totals. No frontend/browser suite was rerun.
- **Migrations/data:** seven migration SQL files hash-identical to the opening snapshot. No migration execution, seed CLI, SQL, database connection, Docker/container, or privilege edit took place. The bounded database fixture suite did run its existing two synthetic collision-rejection assertions; these were injected unit fixtures, not historical/live database collision scenarios. Historical seed-collision evidence remains preserved and no seed source changed.
- **External evidence:** `C:\Users\PC\Documents\RHC_WEB3\RHC-Checkpoint4B-PostAudit-Corrections-20260924\CHECKPOINT-4B-POST-AUDIT-CORRECTIONS-EVIDENCE.md`, `CHECKPOINT-4B-POST-AUDIT-CORRECTIONS-HANDOFF.md`, and `CHECKPOINT-4B-POST-AUDIT-SOURCE-DELTA.zip`. The evidence contains the proposed PostgreSQL 16 S1/S2/F5/F6/non-owner matrix, test-only grants/policies, SQLSTATE expectations, target attestation, and cleanup plan.

**Later approval still required:** provision a fresh, run-owned disposable PostgreSQL 16 target and execute the documented catalog/HTTP matrix. The runtime role/policy contract remains unresolved and is not approved by these synthetic proposals. No F7 retry/replay policy, business-policy change, Git publication, staging readiness, release acceptance, or checkpoint closure is claimed. Stop before any Docker/database operation.
