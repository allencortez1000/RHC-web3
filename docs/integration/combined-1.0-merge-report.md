# Combined 1.0 — Local merge report

Date: 2026-10-05. Branch: **combined-1.0**. Display name: **Combined 1.0**.

## Three independent statuses

1. **Source integration: resolved at source/index level**, following conflict/preservation review. Full backend execution is not established.
2. **Offline validation: BLOCKED overall.** Frontend, Web3, shared regression and lint gates passed. Genuine generated Prisma prerequisites block complete backend/database gates. Credential audit has three inherited test-fixture findings.
3. **Connected/production acceptance: NOT PERFORMED by this task.** No official progress or readiness change.

**No merge commit created.** Real merge remains in progress: HEAD is MAIN_SHA; MERGE_HEAD is REDESIGN_SHA. Do not commit until all required gates pass.

## Source selection

- Verified repository: allencortez1000/RHC-web3; origin on GitHub.
- Original: C:/Users/admin/Desktop/RHBC project/PHC WEB3 DEVELOPMENT.
- New worktree: C:/Users/admin/Desktop/RHBC project/RHC-web3-combined-1.0.
- External records: C:/Users/admin/Desktop/RHBC project/RHC-web3-combined-1.0-records.
- Windows/Git Bash MINGW64; Git 2.52.0.windows.1; Node 24.12.0; npm 11.6.2.
- No applicable repository/ancestor AGENTS.md, active custom hooks, custom hooks path, or existing Git operation found. Standard LFS/textconv configuration inspected. No safeguard bypassed.
- Fetch refspec updates origin tracking refs only. git fetch --no-tags origin succeeded; no pull/prune or local source pointer movement.
- Original main: aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e; zero local-only / 14 remote-only commits. Selected fetched origin/main.
- Original redesign: 04a726281c2ba153e2931201fb7a86af75bd6eb3; identical to fetched origin/redesigned-branch. No unpublished-commit ambiguity.
- **MAIN_SHA: cebe7d7da7dacb512f9e551d9bf9f8ae81176c17**.
- **REDESIGN_SHA: 04a726281c2ba153e2931201fb7a86af75bd6eb3**.
- **Merge base: aa7ae72bb08a4bdb64857e64ca14fb2305d21d8e**.
- Source divergence: 14 main-only / 7 redesign-only commits.
- Target name valid and absent locally/in fetched origin refs/other worktrees; sibling directory new.
- Created worktree/branch at MAIN_SHA, verified clean, merged pinned redesign using --no-ff --no-commit --no-autostash --no-rerere-autoupdate. Sources remained pinned.

## Excluded work and integrity

Original untracked **docs/development-status-2026-10-05.md is NOT included**. No tracked dirty/staged files existed at task start. Sidebar work is already committed in pinned redesign.

External starting-state.json records HEAD, source pointers, index/status/diff hashes and dirty-file hashes. source-integrity-check.json confirms all match after integration/testing. No dirty contents copied/published. Unsaved editor buffers were not captured or backed up by Git.

## Conflict inventory

- apps/admin-web/app/admin-data.tsx
- apps/admin-web/app/dashboard/page.tsx
- apps/admin-web/app/lib/supabase.ts
- apps/admin-web/app/management-controls.tsx
- apps/admin-web/app/page.tsx
- apps/admin-web/app/rhc-digital-ids/page.tsx
- apps/admin-web/app/verification-review.tsx
- apps/api/src/main.ts
- apps/api/src/modules/app.module.ts
- apps/api/src/modules/security/feature.guard.ts
- apps/api/src/modules/security/rbac.service.spec.ts
- apps/api/src/modules/security/rbac.service.ts
- apps/api/test/api-harness.ts
- apps/customer-web/app/admin/page.tsx
- apps/customer-web/app/components/demo-records.tsx
- apps/customer-web/app/components/digital-id-page.tsx
- apps/customer-web/app/lib/supabase.ts
- apps/customer-web/app/login/page.tsx
- apps/customer-web/app/marketplace/page.tsx
- apps/customer-web/app/page.tsx
- apps/customer-web/app/properties/[id]/page.tsx
- apps/customer-web/app/signin/page.tsx
- apps/customer-web/app/verify/rhc-id/[token]/page.tsx
- apps/customer-web/tests/fixtures.ts
- package-lock.json
- packages/ui/src/index.tsx
- packages/ui/src/runtime.tsx

## Preservation and conflict decisions

The following reviewed source decisions preserve both sides; passing frontend checks do not establish backend acceptance.

## Conflict decisions

Paths below are relative to the isolated worktree.

| Conflict | Decision and evidence |
| --- | --- |
| apps/admin-web/app/admin-data.tsx | Keep main effective grants, scoped reference filtering, capability coordinator, mutation intents, preflight revalidation, and conditional resource mounting. Integrate redesign grouped/mobile navigation, command menu, skip link, shell, workflow columns/pages and accessible table headers. Permission checks use /admin/capabilities, not flattened session roles. Demo-only workflows use existing server permissions and current-intent handling. |
| apps/admin-web/app/dashboard/page.tsx | Keep main guarded dashboard route instead of redesign redirect. Existing dashboard-access tests explicitly require /dashboard to remain addressable without redirect, with no unauthorized audit requests. |
| apps/admin-web/app/lib/supabase.ts | Keep redesign explicit demo/API adapter selection and main PKCE-only confirmation restrictions, verified exchange, local logout, and safe subscription when live config is absent. No automatic demo fallback. |
| apps/admin-web/app/management-controls.tsx | Main implementation retained: scope-aware mutations, reference restrictions, grant revalidation, cancellation and current-intent protection. Redesign callback renaming is not a behavior change and was not allowed to replace those guards. |
| apps/admin-web/app/page.tsx | Redesign dashboard layout/work queues combined with main capability-driven landing/redirect, no-access states, conditional requests, operational snapshot, and permitted workspace ordering. Do not mount denied queues/audit reads. |
| apps/admin-web/app/rhc-digital-ids/page.tsx | Redesign registry, filters and loaded summaries plus main global user.manage review gate, keyed review intent, and capability preflight props. Registry resources mount only inside the authorized shell. |
| apps/admin-web/app/verification-review.tsx | Main implementation retained, including actor/self-approval checks, expected status/reference, preflight grant revalidation, conflict refresh, and obsolete-intent suppression. |
| apps/customer-web/app/admin/page.tsx | Redesign dedicated-admin-origin redirect/not-found behavior. No customer-side inferred admin status or administrative records. |
| apps/customer-web/app/components/demo-records.tsx | Redesign persistent synthetic records, receipts, workflow forms and accessibility retained. Existing resource availability boundary remains; no live fallback to demo records. |
| apps/customer-web/app/components/digital-id-page.tsx | Redesign layout and real QR retained only when backend returns an opaque public_reference. Never manufacture a public token from rhc_id. Missing reference keeps main non-scannable placeholder/unavailable action. Main eligibility checks remain. Identity-review submission is demo-only; no invented API endpoint. QR is keyed to its reference. |
| apps/customer-web/app/lib/supabase.ts | Same explicit profile/PKCE/no-fallback resolution as admin adapter. |
| apps/customer-web/app/login/page.tsx | Retain redesign login page; do not resurrect ancestor's unconditional local credentials. |
| apps/customer-web/app/marketplace/page.tsx | Retain redesign public metadata/discovery. Preserve main authenticated API directories in the discovery component, separate from staged concepts; no public unauthorized directory reads or transactions. |
| apps/customer-web/app/page.tsx | Retain redesign public home, not ancestor login-with-demo-credentials page. |
| apps/customer-web/app/properties/[id]/page.tsx | Redesign detail presentation plus main linked-record-first access and abortable public fallback. Clear replacement records, key by id/mode/user/revision, suppress stale/error data and correct live/demo reservation and price labels. |
| apps/customer-web/app/signin/page.tsx | Retain redesign /login alias. |
| apps/customer-web/app/verify/rhc-id/[token]/page.tsx | Preserve anonymous public route and redesign public shell. Add backend UNAVAILABLE handling with no identity field rendering; keyed/aborted lookup, cleared replacement state and explicit API/demo provenance. Do not send credentials. Legacy base64 internal RHC IDs fail closed without lookup. Missing live configuration never selects demo data. |
| apps/customer-web/tests/fixtures.ts | Combine main disabled/expired-account 401 behavior and configurable sign-in destination with redesign synthetic admin session fixture and default admin landing. Preserve offline interception/deny-by-default routing. |

## Exact conflict decisions

| File | Decision and source evidence |
| --- | --- |
| main.ts | Retained main StructuredLogger startup errors and 30-second deadline; combined redesign development-only CORS origins (localhost 3000/3002/3003 and 127.0.0.1 3002/3003). Production origins remain configured-only. Base had localhost 3000/3002. |
| app.module.ts | Added redesign Web3Module and both controllers without losing main CapabilitiesController, logging, consent service and empty CONSENT_POLICY_CONFIG. All existing controllers/providers, guards, filter, interceptor and request context retained. No invented policy publication/version. |
| feature.guard.ts | Added redesign isEnabled and exact true environment preview opt-in. Database flags require enabled + GLOBAL + not in main MONTH_1_LOCKED_FEATURES. require delegates to that combined policy. Kept canonical mutation lockdown. Preview is not token activation or network approval. |
| rbac.service.ts | Retained main RbacDbClient and transaction propagation through grants/hasPermission/require. Added redesign persisted ACTIVE/unexpired/non-CUSTOMER capability query and scope consistency checks. Added defensive CUSTOMER rejection to capabilities, matching grants if an adapter returns an excluded row. No role-name bypass or global elevation. |
| rbac.service.spec.ts | Combined the full add/add suites: 3 main transaction-client tests plus 4 redesign capability tests, removing only the duplicate import. Added 2 boundary tests. |
| api-harness.ts | Kept main typed property projections, distinct transaction delegates and property/history/audit/event rollback, unique flag IDs/locked flags, logs and synthetic consent injection. Added redesign role/permission data, active/expiry/customer filtering, all-assignment capability query and optional grant role. Did not replace rollback with callback(prisma). |

## Security and behavior preserved

Main evidence: apps/api/src/modules/security/{supabase-jwt.service,application-user.service,auth.guard,permission.guard,rbac.service,company-api-key.service}.ts; modules/admin/{management.controller,admin.controller,capabilities.controller}.ts; modules/reservations/{reservations.controller,reservations.service}.ts; modules/directory/directory.controller.ts; platform/{api-exception.filter,structured-logger,request-context.middleware}.ts.

- Signed RS256/ES256 JWT verification, issuer/audience/required claims and authoritative current identity lookup remain. Main 5-second JWKS/Auth Admin bounds, redirect rejection, disabled/locked application-user denial, authenticated rate limiting and generic provider-unavailable classification/logging remain. Identity synchronization does not promote verification/account state from browser metadata.
- RBAC retains ACTIVE account/expiry/non-CUSTOMER checks, tenant-owned role and project consistency, resource-derived scope and deny-without-policy. Governance and machine-key permission rechecks still use the active transaction after locking.
- Reservation controllers/services are main content unchanged. Admin create requires property reservation permission plus an ACTIVE customer visible through effective customer.view tenant relationships. Customer operations use authenticated ownership, not a supplied customer ID.
- Reservation list predicates combine ownership/RBAC, requested tenant and status using AND; bounded take/skip and stable created_at/id ordering remain. Customer projections omit internal events/notes/actor IDs/metadata. Admin event history is bounded at 20. Create/cancel return final property state with the proper customer projection.
- Create requires AVAILABLE property and ACTIVE project/company/customer; existing active reservation blocks another. Confirmation rejects an expired pending reservation. State-machine/expected HELD or RESERVED checks, row locks, serializable transactions, partial unique index, reservation events, property history, audit and activity writes remain. Cancellation/remediation after company deactivation remains permitted and tested.
- Manual property changes retain atomic property/history/audit/event writes. Main harness rollback/evidence tests are retained, without claiming to simulate PostgreSQL concurrency.
- Public Digital ID verification remains UNAVAILABLE for all tokens, with no identity lookup/disclosure. No base64-ID verification was restored.
- New consent grants remain unavailable without approved publication inputs; withdrawals remain possible. Safe exception envelopes, allowlisted structured logs, redaction and request/correlation context remain.

Redesign evidence: apps/api/src/modules/web3/*.ts; read-only inspection of packages/web3/src/{index,config,read-provider,thirdweb-read-provider,transport}.ts from the redesign pin. No packages/web3 edits.

- GET web3/token retains AuthGuard, rate policy 60 and no-store. No wallet/signing/transfer/write route was added.
- GET admin/integrations/thirdweb retains AuthGuard + PermissionGuard, exact GLOBAL integration.view, rate policy 60 and no-store. Company/project grants cannot access deployment-wide status.
- Web3Service lazily imports/creates the provider only on authorized route execution, in connected context. Request input cannot select fixtures/demo. Module compilation does not create the provider.
- Provider configuration requires separate network-read approval and exact approved testnet/contract. APPROVED_TESTNETS is empty. Connected demo/fixture selection fails closed. Preview opt-in alone does not authorize egress.
- Status is configuration/last-observation only, not a connectivity probe. Transport permits four read RPC methods, rejects redirects, bounds bodies and carries abort through body consumption. Single-deadline transient retry, TTL/max-stale handling and controlled diagnostics remain. No provider acceptance is claimed.

## Complete migration set and same-name comparison

Reviewed every SQL file; redesign packages/database is unchanged from base. Retained main based on file-by-file evidence, not a blanket conflict-side selection:

| Migration directory | Comparison | Decision |
| --- | --- | --- |
| 202609110001_month1_foundation | Identical in all three | 26 foundation tables and historical indexes/FKs/enums; do not rewrite historical permissive deletions corrected later. |
| 202609120001_month1_auth_ledger_hardening | Identical | Drops obsolete password hash, backfills unique ledger references, adds history/ownership FKs. Not purely additive because of the column drop. |
| 202609140001_identity_history_seed_hardening | Identical | Email-confirmation timestamp, unique global-role code, ledger index correction, restrictive history deletion and composite account/customer ownership FKs. Duplicate/mismatched data intentionally fails; no silent repair. |
| 202609140002_application_postgrest_lockdown | Same-name difference: base/redesign c468b09b0644e3759d85ed4d4390c0691fe13960; main f930a775032bbf768a33167e31d439677bae44be | Main only removes property_status_history, reservations, reservation_events from the early allowlist: those tables are not created yet. Base/redesign would fail ordered fresh replay. Keep main unchanged. |
| 202609150001_authorization_scope_delete_restrict | Main-only | Restricts role/user_role scope-parent deletion, preventing nullable scopes from widening to global. Matches main schema Restrict relations. |
| 202609160001_reservation_foundation | Identical | Creates the three reservation/history tables, enums/FKs and partial unique active-reservation index; enables RLS on all three. Do not move creation into the early lockdown. |
| 202609210001_application_acl_hardening | Main-only | Final exact 29-table allowlist, prevalidation, browser-owner/run-as rejection, table/column/owned-sequence revocation and direct-ACL postchecks. No guessed creator-default/role/policy changes. |

Early lockdown revokes CURRENT_ROLE table/sequence defaults globally and in public. Final ACL correction does not invent creator defaults: application-acl-preflight.ts provides explicit creator/target approval. Default preflight verifies read-only controls (10s statement, 2s lock, 15s idle; 8s acquisition/30s transaction budgets), target matching and PostgreSQL 16+ role paths. Apply-defaults requires both explicit flags. Neither mode was run.

### Deployment question: blocked until answered

Has any target applied the base/redesign 202609140002 checksum, and what approved migration history/reconciliation applies? Main already changed this historical file. Source evidence justifies fresh replay, not a target checksum assumption. Parent must ask before deployment. Do not reset, edit the ledger, mark migrations applied, restore the broken early allowlist or invent corrective SQL from this review. Confirm creator/runtime roles and global-default impact separately. RLS alone does not prove runtime access or absence of inherited/view/RPC access.

## Evidence and decisions

1. Base-to-main changes in these four packages affect only UI runtime/index: main removes the old inline demo account/response/mock-mutation fallback, removes the role-name-based PortalProvider admin gate, adds AuthForm admin-aware routing, and removes Month 2 suffixes on disabled Send/Receive controls. It does NOT contain a general request deadline, standalone public transport or structured ApiError metadata. Those requested corrections are explicitly added compatibility work, not falsely attributed to the pinned main commit.
2. Redesign adds persistent demo cookies/hub/personas, api/demo data-mode separation, account scope arrays, request cancellation, capability-unavailable states, render-keyed resource state, the redesigned UI, browser-safe Web3 observations, and the server-only read connector. These survive. The base's inline demoResponse and fabricated reservation success do not return.
3. Resolved all four runtime conflict blocks and the AuthPage conflict intentionally. The shared index retains the redesigned components and passes admin plus explicit verificationPath/continuePath. AuthForm accepts all three props. Main's portal-local API-mode redirect is preserved, rather than redirecting based on arbitrary role names. The demo persona flow still intentionally navigates to its selected application.
4. PortalProvider accepts requireAdmin as a legacy presentation hint for existing redesign callers/tests, but deliberately does not restore the removed role-name gate. Admin capability/grant checks and backend guards remain authoritative. isAdminAccount remains available for presentation consumers, NOT permission enforcement.
5. Added packages/ui/src/api-transport.ts, retaining ApiError through the existing @rhc/ui export. Added packages/ui/test/transport-contract.test.cjs, without changing package scripts. Updated request-scope.ts and runtime.tsx to share response/error and cancellation behavior. No existing test was removed or rewritten.
6. packages/types, packages/config and packages/web3 match redesign file contents after CRLF/LF normalization. The Web3 package and its tests were retained unchanged; thirdweb remains pinned to 5.121.6. APPROVED_TESTNETS is still Object.freeze([]). No network approval, wallet, transaction capability or SDK upgrade was introduced.

## Web3, configuration, freshness and permissions review

- @rhc/types exposes browser-safe Web3 observation types, without SDK imports. Observed zero/false differs from unavailable/unsupported null. Amounts/block values stay strings; unknown decimals leave formatted:null. Demo certificate blockchain_status is a fixture label, not live evidence.
- @rhc/web3 retains its node-only export/browser guard and deferred SDK import. Disabled/synthetic/configuration diagnostics do not load the SDK. API Web3Service lazily passes process.env with connected context; do not pass a stripped RhcEnv object or let request input select demo/test.
- APPROVED_TESTNETS stays empty. Environment flags cannot approve networks/contracts. Connected fixtures are rejected; conflicting demo markers block connected egress. Do not run test:network.
- RPC allowlisting, redirect rejection, bounded bodies, sanitized errors, pinned block/reorg checks, bigint formatting, partial metadata, retry/backoff and cache invalidation are retained unchanged.
- getReadStatus never initiates network reads. Cache is stale at age >= ttlMs, absent at age > maxStaleMs. Stale retains the previous success timestamp, not current health. Wrong chain, missing contract, reorg and provider-auth errors discard observations. Default TTL/max-stale is 30s/120s but configurable.
- Web3ReadPanel keeps source/synthetic/testnet labels, timestamps, explicit stale/partial/absent states, exact supplies, observed-only finality, inactive capabilities, inert text and HTTPS server-provided explorer links. No wallets were added.
- packages/config is unchanged: pure validation, server-only Node utilities, required staging/production settings, explicit proxy/CORS restrictions, HTTPS and issuer/JWKS consistency remain intact. No demo relaxation.

### Inherited limitations deliberately not expanded into this merge

1. Browser freshness is snapshot-at-response, not a continuously updated lease. Web3ReadResult has timestamps but no TTL/expiry; Web3ReadPanel has no aging timer and useResource has no periodic/focus refresh. A long-open panel can retain an originally fresh label after server expiry. This is NOT fixed. Follow-up needs an explicit expiry/refresh contract and fake-clock tests, not guessed TTLs or automatic network polling in this merge.
2. Shared PERMISSIONS/PermissionCode omit reservation permissions used by backend capabilities/demo personas. This exists in base/main. Account/DemoPersona use string permissions, so no enum expansion is necessary here. Backend effective grants, not this incomplete convenience list or demo personas, authorize actions.
3. Account.permissions plus aggregate company_ids/project_ids cannot encode permission-to-scope pairing. The inherited admin Web3 panel fails closed but can hide valid global integration.view when unrelated grants are scoped. Frontend should use main /admin/capabilities grant maps for permission-specific global checks; backend independently requires global integration.view. Never infer authority from a role name, missing scopes or menu visibility. Preserve fresh pre-write capability revalidation.
4. isAdminAccount treats any non-CUSTOMER role as staff. It is retained for presentation, not authorization. requireAdmin is compatibility-only; sensitive pages need main capability/grant UI and server guards.
5. Initial session lookup/requests are bounded, but AuthForm login/register/reset/confirm SDK work still depends on app adapters. The inherited confirm started-ref is not a full cancellation/retry state machine. Failed SDK logout must clear local persisted credentials in the adapter; shared React cleanup does not guarantee storage revocation. Preserve adapter-local cleanup and test late responses. No claim of universal auth cancellation is made.
6. Connector SnapshotReader timeout relies on the injected reader honoring AbortSignal. Production owned fetch does; a never-settling injected reader ignoring abort can retain inflight work. This inherited limitation is separate from the newly bounded UI transport and was not broadened into an SDK refactor.

## Lockfile, configuration and remaining owners

Audited merged direct manifests match redesign lock input. Overlapping dependency versions agree; final npm-regenerated package keys/versions match redesign. Ran scripts-disabled lock regeneration and npm ci; no broad upgrade or lock concatenation. No original mutable artifacts or environment files were shared/copied. Prisma engine download was blocked.

CI synthetic build origins now match isolated browser ports 43102/43103 and intercepted API 43101; triggers unchanged. Test fixtures use no server reuse and portable offline guards. Historical reports remain historical. Redesign removal of the old whitepaper PDF is inherited source work.

Backend/database owner reviews generated Prisma prerequisites, full backend tests/build, historical migration checksum compatibility, ACL/seed/expiry/concurrency policy. Frontend/Web3 owner reviews design/permissions/demo mapping, inherited snapshot aging and UI gaps. Both review all three status categories before any commit/publication.

## Merge-base changed-file inventories

### Main

```text
M	apps/admin-web/app/admin-data.tsx
A	apps/admin-web/app/capability-request-coordinator.ts
A	apps/admin-web/app/capability-scopes.ts
M	apps/admin-web/app/dashboard/page.tsx
M	apps/admin-web/app/lib/supabase.ts
M	apps/admin-web/app/management-controls.tsx
M	apps/admin-web/app/page.tsx
M	apps/admin-web/app/providers.tsx
M	apps/admin-web/app/rhc-digital-ids/page.tsx
M	apps/admin-web/app/verification-review.tsx
M	apps/admin-web/playwright.config.ts
A	apps/admin-web/tests/capability-request-coordinator.spec.ts
A	apps/admin-web/tests/dashboard-access.spec.ts
M	apps/admin-web/tests/smoke.spec.ts
M	apps/api/scripts/bootstrap-admin.ts
M	apps/api/src/main.ts
M	apps/api/src/modules/admin/admin.controller.ts
A	apps/api/src/modules/admin/capabilities.controller.ts
M	apps/api/src/modules/admin/management.controller.ts
M	apps/api/src/modules/app.module.ts
M	apps/api/src/modules/customers/consent.controller.ts
A	apps/api/src/modules/directory/directory.controller.spec.ts
M	apps/api/src/modules/directory/directory.controller.ts
A	apps/api/src/modules/reservations/reservations.controller.spec.ts
M	apps/api/src/modules/reservations/reservations.controller.ts
M	apps/api/src/modules/reservations/reservations.service.spec.ts
M	apps/api/src/modules/reservations/reservations.service.ts
M	apps/api/src/modules/security/company-api-key.service.ts
A	apps/api/src/modules/security/consent-policy.service.spec.ts
A	apps/api/src/modules/security/consent-policy.service.ts
A	apps/api/src/modules/security/feature.guard.spec.ts
M	apps/api/src/modules/security/feature.guard.ts
M	apps/api/src/modules/security/permission.guard.ts
A	apps/api/src/modules/security/rbac.service.spec.ts
M	apps/api/src/modules/security/rbac.service.ts
M	apps/api/src/modules/security/supabase-jwt.service.spec.ts
M	apps/api/src/modules/security/supabase-jwt.service.ts
A	apps/api/src/platform/api-exception.filter.spec.ts
M	apps/api/src/platform/api-exception.filter.ts
A	apps/api/src/platform/controlled-errors.ts
M	apps/api/src/platform/request-context.middleware.ts
A	apps/api/src/platform/structured-logger.spec.ts
A	apps/api/src/platform/structured-logger.ts
M	apps/api/test/api-harness.ts
A	apps/api/test/application-acl-migration.spec.ts
M	apps/api/test/auth-flow.e2e-spec.ts
A	apps/api/test/authorization-scope-migration.spec.ts
M	apps/api/test/bootstrap-admin.spec.ts
A	apps/api/test/capabilities.e2e-spec.ts
M	apps/api/test/consent.e2e-spec.ts
A	apps/api/test/feature-locks.e2e-spec.ts
M	apps/api/test/management-security.spec.ts
M	apps/api/test/security.e2e-spec.ts
M	apps/customer-web/app/admin/page.tsx
M	apps/customer-web/app/components/consent-preferences.tsx
M	apps/customer-web/app/components/demo-records.tsx
M	apps/customer-web/app/components/digital-id-page.tsx
M	apps/customer-web/app/lib/supabase.ts
M	apps/customer-web/app/login/page.tsx
M	apps/customer-web/app/marketplace/page.tsx
M	apps/customer-web/app/page.tsx
M	apps/customer-web/app/properties/[id]/page.tsx
M	apps/customer-web/app/signin/page.tsx
M	apps/customer-web/app/verify/rhc-id/[token]/page.tsx
M	apps/customer-web/playwright.config.ts
M	apps/customer-web/tests/consent-registration.spec.ts
M	apps/customer-web/tests/fixtures.ts
M	apps/customer-web/tests/smoke.spec.ts
M	docs/api/api-overview.md
M	docs/database/schema.md
M	docs/month-1/acceptance-validation.md
A	docs/month-1/audit-corrections-progress.md
A	docs/month-1/checkpoint-4-handoff.md
A	docs/month-1/company-integration-activation.md
M	docs/month-1/deliverables.md
M	docs/month-1/known-limitations.md
M	docs/month-1/month-2-handoff.md
A	docs/month-1/staff-role-workflow-matrix.md
M	docs/month-1/targeted-completion-report.md
M	docs/month-1/testing.md
M	package-lock.json
M	packages/database/package.json
A	packages/database/prisma/application-acl-preflight.ts
M	packages/database/prisma/migrations/202609140002_application_postgrest_lockdown/migration.sql
A	packages/database/prisma/migrations/202609150001_authorization_scope_delete_restrict/migration.sql
A	packages/database/prisma/migrations/202609210001_application_acl_hardening/migration.sql
M	packages/database/prisma/schema.prisma
A	packages/database/prisma/seed.spec.ts
M	packages/database/prisma/seed.ts
M	packages/ui/src/index.tsx
M	packages/ui/src/runtime.tsx
```

### Redesign

```text
M	.gitignore
M	README.md
M	apps/admin-web/app/admin-data.tsx
A	apps/admin-web/app/certificates/page.tsx
M	apps/admin-web/app/dashboard/page.tsx
A	apps/admin-web/app/documents/page.tsx
M	apps/admin-web/app/globals.css
M	apps/admin-web/app/integrations/page.tsx
A	apps/admin-web/app/integrations/thirdweb-read-panel.tsx
M	apps/admin-web/app/layout.tsx
M	apps/admin-web/app/lib/supabase.ts
M	apps/admin-web/app/login/page.tsx
M	apps/admin-web/app/management-controls.tsx
M	apps/admin-web/app/page.tsx
A	apps/admin-web/app/payments/page.tsx
M	apps/admin-web/app/providers.tsx
A	apps/admin-web/app/reports/page.tsx
A	apps/admin-web/app/rewards-ledger/page.tsx
M	apps/admin-web/app/rhc-digital-ids/page.tsx
A	apps/admin-web/app/service-requests/page.tsx
M	apps/admin-web/app/verification-review.tsx
M	apps/admin-web/app/verification/page.tsx
A	apps/admin-web/app/verify-email/page.tsx
M	apps/admin-web/package.json
M	apps/admin-web/playwright.config.ts
A	apps/admin-web/public/images/rhc-token-front.png
M	apps/admin-web/tests/auth-callback.spec.ts
M	apps/admin-web/tsconfig.json
M	apps/api/package.json
M	apps/api/src/main.ts
M	apps/api/src/modules/app.module.ts
M	apps/api/src/modules/auth/auth.controller.ts
M	apps/api/src/modules/security/feature.guard.ts
A	apps/api/src/modules/security/rbac.service.spec.ts
M	apps/api/src/modules/security/rbac.service.ts
A	apps/api/src/modules/web3/web3.controller.ts
A	apps/api/src/modules/web3/web3.module.ts
A	apps/api/src/modules/web3/web3.service.ts
M	apps/api/test/api-harness.ts
M	apps/api/test/auth-flow.e2e-spec.ts
M	apps/api/test/consent.e2e-spec.ts
M	apps/api/test/env-startup.spec.ts
A	apps/api/test/web3-boundary.spec.ts
A	apps/api/test/web3-feature.spec.ts
M	apps/api/tsconfig.json
M	apps/customer-web/app/admin/page.tsx
M	apps/customer-web/app/administration/page.tsx
A	apps/customer-web/app/api/demo/[...segments]/route.ts
M	apps/customer-web/app/blockchain-activity/page.tsx
M	apps/customer-web/app/blockchain/page.tsx
M	apps/customer-web/app/components/customer-data.tsx
M	apps/customer-web/app/components/demo-records.tsx
M	apps/customer-web/app/components/digital-id-page.tsx
A	apps/customer-web/app/components/meridian-public/data.ts
A	apps/customer-web/app/components/meridian-public/ecosystem-directory.ts
A	apps/customer-web/app/components/meridian-public/ecosystem-discovery.tsx
A	apps/customer-web/app/components/meridian-public/ecosystem-orbit.tsx
A	apps/customer-web/app/components/meridian-public/future-technology.tsx
A	apps/customer-web/app/components/meridian-public/golden-thread-map.tsx
A	apps/customer-web/app/components/meridian-public/help-center.tsx
A	apps/customer-web/app/components/meridian-public/home-page.tsx
A	apps/customer-web/app/components/meridian-public/marketplace-discovery.tsx
A	apps/customer-web/app/components/meridian-public/meridian-icon.tsx
A	apps/customer-web/app/components/meridian-public/not-found-page.tsx
A	apps/customer-web/app/components/meridian-public/public-shell.tsx
A	apps/customer-web/app/components/web3-preview.tsx
M	apps/customer-web/app/dashboard/page.tsx
M	apps/customer-web/app/ecosystem/page.tsx
M	apps/customer-web/app/future-technology/page.tsx
M	apps/customer-web/app/globals.css
M	apps/customer-web/app/help/page.tsx
M	apps/customer-web/app/layout.tsx
A	apps/customer-web/app/lib/demo/router.ts
A	apps/customer-web/app/lib/demo/seed.ts
A	apps/customer-web/app/lib/demo/store.ts
A	apps/customer-web/app/lib/demo/web3-fixture.ts
M	apps/customer-web/app/lib/supabase.ts
M	apps/customer-web/app/login/page.tsx
M	apps/customer-web/app/marketplace/page.tsx
M	apps/customer-web/app/not-found.tsx
M	apps/customer-web/app/page.tsx
M	apps/customer-web/app/points/page.tsx
M	apps/customer-web/app/profile/page.tsx
M	apps/customer-web/app/properties/[id]/page.tsx
M	apps/customer-web/app/properties/page.tsx
M	apps/customer-web/app/providers.tsx
M	apps/customer-web/app/reservations/page.tsx
M	apps/customer-web/app/rhc-id/page.tsx
M	apps/customer-web/app/rhc-points/page.tsx
M	apps/customer-web/app/rhc-verify/page.tsx
M	apps/customer-web/app/security/page.tsx
M	apps/customer-web/app/settings/page.tsx
M	apps/customer-web/app/signin/page.tsx
M	apps/customer-web/app/token/page.tsx
M	apps/customer-web/app/transactions/page.tsx
M	apps/customer-web/app/verify/rhc-id/[token]/page.tsx
M	apps/customer-web/app/wallet/page.tsx
M	apps/customer-web/app/web3-nav.ts
M	apps/customer-web/app/white-paper/page.tsx
M	apps/customer-web/package.json
M	apps/customer-web/playwright.config.ts
D	apps/customer-web/public/documents/rhc-web3-whitepaper-v1.0.pdf
M	apps/customer-web/tests/approved-profile.spec.ts
M	apps/customer-web/tests/auth-callback-cases.ts
M	apps/customer-web/tests/fixtures.ts
M	apps/customer-web/tests/smoke.spec.ts
A	apps/customer-web/tests/web3-browser-harness.tsx
A	docs/clickup-github-integration-test.md
A	docs/current-system-inventory.md
A	docs/demo-guide.md
A	docs/design-system.md
A	docs/phase-2-handoff.md
A	docs/project-status-summary.md
A	docs/redesign-architecture.md
A	docs/route-coverage.md
A	docs/validation-report.md
A	docs/web3/api-retry-results.txt
A	docs/web3/api-unit-results.txt
A	docs/web3/browser-results.txt
A	docs/web3/browser-retry-results.txt
A	docs/web3/connector-offline-results.txt
A	docs/web3/connector-sdk-retry-results.txt
A	docs/web3/demo-store-results.txt
A	docs/web3/integration-readiness.md
A	docs/web3/sdk-offline-results.txt
A	docs/web3/thirdweb-readonly-handoff.md
A	docs/web3/thirdweb-readonly-implementation.md
A	docs/web3/thirdweb-readonly-test-plan.md
M	package-lock.json
M	package.json
A	packages/types/src/demo.ts
M	packages/types/src/index.ts
A	packages/types/src/web3.ts
A	packages/ui/src/api-capabilities.ts
M	packages/ui/src/index.tsx
A	packages/ui/src/request-scope.ts
M	packages/ui/src/runtime.tsx
A	packages/ui/src/web3-read-panel.tsx
A	packages/ui/styles/meridian-tokens.css
M	packages/ui/tsconfig.json
A	packages/web3/.env.example
A	packages/web3/package.json
A	packages/web3/scripts/testnet-read.cjs
A	packages/web3/src/config.ts
A	packages/web3/src/disabled-read-provider.ts
A	packages/web3/src/errors.ts
A	packages/web3/src/fixture-read-provider.ts
A	packages/web3/src/index.ts
A	packages/web3/src/read-provider.ts
A	packages/web3/src/sdk-snapshot.ts
A	packages/web3/src/snapshot.ts
A	packages/web3/src/thirdweb-read-provider.ts
A	packages/web3/src/transport.ts
A	packages/web3/test/readonly.test.cjs
A	packages/web3/test/sdk.test.cjs
A	packages/web3/tsconfig.json
A	packages/web3/tsconfig.offline.json
A	scripts/demo-browser-smoke.mjs
A	scripts/demo-smoke.mjs
A	scripts/demo-store-test.mjs
A	scripts/dev-demo.mjs
A	scripts/month1-closure-audit.test.mjs
A	scripts/month1-secret-audit.test.mjs
A	scripts/reset-demo.mjs
A	scripts/web3-browser-test.mjs
M	tsconfig.base.json
```
