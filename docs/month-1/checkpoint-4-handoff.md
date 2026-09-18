# Month 1 Checkpoint 4 Handoff

This is a preparation and review document. It is not authorization to run a
migration, seed, bootstrap, staging inspection, or deployment.

## Current branch and integration boundary

The work remains on local `main` at the historical local HEAD
`4953810a22bcaf61b8c8961c2439fffafd593549`. At the Checkpoint 3 start,
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

## Complete migration inventory discovered

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

## Required disposable PostgreSQL verification

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

**SOURCE IMPLEMENTED / FIXTURE TESTED:** combined typecheck, lint, unit/service, seed, API E2E, Customer browser, Admin browser, build, audit, and diff checks passed with synthetic/local fixtures. **LIVE VERIFIED:** none. No database connection, migration, seed, bootstrap, provider settings change, deployment, or Month 2 activation occurred. This handoff is not Month 1 release acceptance.
