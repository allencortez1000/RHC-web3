# Route Coverage

**Evidence snapshot:** 2026-09-21 (Month 1 offline closure audit)  
**Inventory basis:** App Router `page.tsx` files in `apps/customer-web/app` and `apps/admin-web/app`. Current inventory is **40 customer routes** and **31 admin routes**. A page file proves a surface exists; it does not prove live API, database, provider, authorization, browser, or release acceptance.

## Classification

- **Public** — reachable without a portal session.
- **Adapter-backed** — uses the selected connected or demo transport; production acceptance is separate.
- **Demo workflow** — implemented against the local fixture hub; an equivalent accepted live domain is not established by the page.
- **Redirect** — compatibility or bridge route; not a separate capability.
- **Inactive** — intentional future boundary with no active wallet/token/blockchain capability.
- **Approval hold** — source exists but external distribution requires an owner/legal decision.

## Customer routes — 40/40

Public customer paths configured in `apps/customer-web/app/providers.tsx` are `/`, `/login`, `/signin`, `/register`, `/forgot-password`, `/reset-password`, `/verification`, `/auth/confirm`, `/marketplace`, and `/verify/rhc-id/*`. The `/rhc-verify` entry form is now part of the authenticated customer portal.

|   # | Route                    | Access / class             | Current intent and boundary                                                                             |
| --: | ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
|   1 | `/`                      | Public                     | Meridian public landing page; no longer a duplicate sign-in page.                                       |
|   2 | `/account`               | Protected · Demo workflow  | Account/activity overview from the shared fictional record world.                                       |
|   3 | `/admin`                 | Redirect                   | Redirects to the configured admin origin root; returns not found when that origin is absent.            |
|   4 | `/administration`        | Redirect                   | Same admin-origin bridge as `/admin`.                                                                   |
|   5 | `/auth/confirm`          | Public · Auth support      | Same-browser Supabase PKCE confirmation in connected mode; no provider call in demo mode.               |
|   6 | `/blockchain`            | Redirect · Inactive        | Redirects to `/future-technology#verification-infrastructure`.                                          |
|   7 | `/blockchain-activity`   | Redirect · Inactive        | Redirects to `/future-technology#verification-infrastructure`.                                          |
|   8 | `/certificates`          | Protected · Demo workflow  | Fictional company credentials with public-reference links; not government title.                        |
|   9 | `/dashboard`             | Protected · Adapter-backed | Customer summary across profile, property, reservation, record, and rewards projections.                |
|  10 | `/digital-id`            | Protected · Adapter-backed | Identity status, review submission, eligibility, and separate customer issuance flow.                   |
|  11 | `/documents`             | Protected · Demo workflow  | Synthetic text submission, versioning, review state, hash, and receipt flow; no real object storage.    |
|  12 | `/ecosystem`             | Protected · Presentation   | Categorized RHC ecosystem discovery; no provider or partner activation is implied.                      |
|  13 | `/forgot-password`       | Public · Auth support      | Supabase recovery request in connected mode; provider actions are unavailable in demo mode.             |
|  14 | `/future-technology`     | Protected · Inactive       | Approval-gated roadmap for verification infrastructure, wallet, token, and blockchain concepts.         |
|  15 | `/help`                  | Protected · Presentation   | Meridian help content; not a connected support desk.                                                    |
|  16 | `/login`                 | Public · Adapter-backed    | Named persona chooser in demo mode; real Supabase sign-in in connected mode.                            |
|  17 | `/marketplace`           | Public · Presentation      | Service directory/discovery surface; no order, settlement, or commerce provider.                        |
|  18 | `/my-properties`         | Protected · Demo workflow  | Fictional linked-property lifecycle and turnover state.                                                 |
|  19 | `/notifications`         | Protected · Adapter-backed | Notification list plus single/read-all mutations in the demo hub.                                       |
|  20 | `/payment-records`       | Protected · Demo workflow  | Submit and view synthetic payment evidence; no money collection or settlement.                          |
|  21 | `/points`                | Redirect                   | Redirects to `/rhc-points`.                                                                             |
|  22 | `/profile`               | Protected · Adapter-backed | Profile reads and allowlisted edits; verified identity fields remain locked.                            |
|  23 | `/project-updates`       | Protected · Demo workflow  | Fictional project milestones; not official construction reporting.                                      |
|  24 | `/properties`            | Protected · Adapter-backed | Inventory search plus local save/unsave behavior.                                                       |
|  25 | `/properties/[id]`       | Protected · Adapter-backed | Property detail and reservation request.                                                                |
|  26 | `/register`              | Public · Auth support      | Connected Supabase registration boundary; demo mode uses personas instead of signup.                    |
|  27 | `/reservations`          | Protected · Adapter-backed | Create, list, conflict, cancel, and release behavior in the shared demo world.                          |
|  28 | `/reset-password`        | Public · Auth support      | Same-browser Supabase recovery completion in connected mode.                                            |
|  29 | `/rhc-id`                | Redirect                   | Redirects to `/digital-id`.                                                                             |
|  30 | `/rhc-points`            | Protected · Demo workflow  | Ledger-derived fictional balance and idempotent benefit redemption.                                     |
|  31 | `/rhc-verify`            | Protected · Demo workflow  | Customer portal verification entry for opaque references; public result URLs remain under `/verify/rhc-id/*`. |
|  32 | `/security`              | Protected · Adapter-backed | Security boundaries, sign-out, and consent history/decisions; MFA/device inventory remains unconnected. |
|  33 | `/settings`              | Protected · Presentation   | Appearance/status/navigation settings; no future capability activation.                                 |
|  34 | `/signin`                | Redirect · Public          | Redirects to `/login`.                                                                                  |
|  35 | `/token`                 | Redirect · Inactive        | Redirects to `/future-technology#future-token`.                                                         |
|  36 | `/transactions`          | Redirect                   | Redirects to `/account`; no blockchain transaction ledger exists.                                       |
|  37 | `/verification`          | Public · Auth support      | Email-verification guidance/resend, distinct from business identity approval.                           |
|  38 | `/verify/rhc-id/[token]` | Public · Adapter-backed    | Minimal verification projection; demo and API token/privacy contracts differ (D1). No blockchain claim. |
|  39 | `/wallet`                | Redirect                   | Redirects to `/account`; no custody, keys, address ownership, send, or receive capability.              |
|  40 | `/white-paper`           | Protected · Approval hold  | Rendered in-app summary of Whitepaper v1.0; content-owner/legal approval remains required.              |

### Customer redirect map

| Route                                 | Target                                           |
| ------------------------------------- | ------------------------------------------------ |
| `/admin`, `/administration`           | Configured admin origin `/`                      |
| `/blockchain`, `/blockchain-activity` | `/future-technology#verification-infrastructure` |
| `/points`                             | `/rhc-points`                                    |
| `/rhc-id`                             | `/digital-id`                                    |
| `/signin`                             | `/login`                                         |
| `/token`                              | `/future-technology#future-token`                |
| `/transactions`, `/wallet`            | `/account`                                       |

## Admin routes — 31/31

Public admin paths configured in `apps/admin-web/app/providers.tsx` are `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, and `/auth/confirm`. Other routes require an admin account. Demo visibility and mutations are fixture-authorized; that is not production RBAC acceptance.

|   # | Route                    | Access / class             | Current intent and boundary                                                                                   |
| --: | ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
|   1 | `/`                      | Protected · Adapter-backed | Canonical command center with queues, metrics, audit activity, and workspace links.                           |
|   2 | `/amica-tower-inventory` | Protected · Adapter-backed | Amica-filtered property inventory view.                                                                       |
|   3 | `/audit-logs`            | Protected · Adapter-backed | Permission/scoped audit records.                                                                              |
|   4 | `/auth/confirm`          | Public · Auth support      | Admin Supabase PKCE confirmation in connected mode.                                                           |
|   5 | `/business-services`     | Protected · Adapter-backed | Service metadata management; not an active provider connector.                                                |
|   6 | `/certificates`          | Protected · Demo workflow  | Issue synthetic credentials and revoke/supersede active records. Live gateway/storage work remains.           |
|   7 | `/companies`             | Protected · Adapter-backed | Scoped company directory and management.                                                                      |
|   8 | `/customer-properties`   | Protected · Adapter-backed | Customer/property relationship management.                                                                    |
|   9 | `/customers`             | Protected · Adapter-backed | Scoped customer directory and reviewed account actions.                                                       |
|  10 | `/dashboard`             | Redirect                   | Redirects to canonical `/`.                                                                                   |
|  11 | `/documents`             | Protected · Demo workflow  | Review and approve/reject synthetic document versions. No real storage pipeline.                              |
|  12 | `/feature-flags`         | Protected · Adapter-backed | Governed flags; future wallet/token/blockchain flags cannot be activated by the demo.                         |
|  13 | `/forgot-password`       | Public · Auth support      | Connected Supabase recovery request.                                                                          |
|  14 | `/integrations`          | Protected · Adapter-backed | Integration metadata; not a live connector or job runner.                                                     |
|  15 | `/login`                 | Public · Adapter-backed    | Connected admin sign-in; demo mode redirects to the shared customer-hosted persona chooser.                   |
|  16 | `/payments`              | Protected · Demo workflow  | Verify synthetic evidence or append a reversal; no payment movement.                                          |
|  17 | `/permissions`           | Protected · Adapter-backed | Permission catalog.                                                                                           |
|  18 | `/projects`              | Protected · Adapter-backed | Scoped project management.                                                                                    |
|  19 | `/properties`            | Protected · Adapter-backed | Scoped property inventory and management.                                                                     |
|  20 | `/reservations`          | Protected · Adapter-backed | Confirm, cancel, expire, or convert allowed reservation states.                                               |
|  21 | `/reports`               | Protected · Mixed          | API: reservations/audit. Demo: six report families. Loaded-record filters, escaped CSV, print, provenance. |
|  22 | `/reset-password`        | Public · Auth support      | Connected Supabase recovery completion.                                                                       |
|  23 | `/rewards-ledger`        | Protected · Demo workflow  | Idempotent points credits and append-only fictional activity. No cash/token settlement.                       |
|  24 | `/rhc-digital-ids`       | Protected · Adapter-backed | Customer ID readiness/registry and business review; customer-owned issuance, not an admin issuance API. |
|  25 | `/roles`                 | Protected · Adapter-backed | Governed role management with protected-role restrictions.                                                    |
|  26 | `/service-requests`      | Protected · Demo workflow  | Scoped operator progression for customer service requests. No external service dispatch.                      |
|  27 | `/system-settings`       | Protected · Adapter-backed | Typed settings management; a setting is not a release approval.                                               |
|  28 | `/user-roles`            | Protected · Adapter-backed | Scoped role assignments.                                                                                      |
|  29 | `/users`                 | Protected · Adapter-backed | User directory and governed account state.                                                                    |
|  30 | `/verification`          | Protected · Adapter-backed | Maker-checker business verification queue; ID issuance remains separate.                                      |
|  31 | `/verify-email`          | Public · Auth support      | Admin email-verification guidance/resend page.                                                                |

The seven routes added beyond the earlier 24-route inventory are `/payments`, `/documents`, `/certificates`, `/service-requests`, `/rewards-ledger`, `/reports`, and `/verify-email`.

## Runtime boundaries

### Connected/default development

- Customer: `http://localhost:3002`
- Admin: `http://localhost:3003`
- Real Nest API default: `http://localhost:4000`, with frontend `NEXT_PUBLIC_API_URL` expected to include `/api/v1`
- Browser authentication: configured Supabase project

`npm run dev` starts the two frontends. `npm run dev:all` also starts the API. Adapter paths and page controls do not establish that a live Supabase project, PostgreSQL database, storage service, job runner, or other provider has been connected or accepted.

### Isolated local demo

`npm run dev:demo` starts only the customer and admin frontends on `127.0.0.1`. The customer Next app owns the catch-all fixture route `apps/customer-web/app/api/demo/[...segments]/route.ts` at `http://127.0.0.1:3002/api/demo/**`.

Implemented families include:

- personas, session, scenario controls, and reset;
- profile, identity review/issuance, properties, saves, reservations, notifications, consents, receipts, and activity;
- documents, payment evidence, rewards, certificates, and service requests;
- public opaque-reference verification;
- scoped admin directories, governance resources, review actions, audit projections, and operational report exports.

Unknown demo routes return an explicit `404`; they are not proxied to `/api/v1`.

## Publication boundary

The former public PDF duplicate has been removed in the existing working tree. The only repository PDF is the confidential source at `documents/RHC WEB3 WHITEPAPER v1.0.pdf`. The client-gated `/white-paper` route still embeds a substantial summary in a client module. Client route gating is **not a confidentiality boundary for bundled text**. Content-owner/legal approval, or removal/server-protected delivery of unapproved content, is required before external distribution. No separate token whitepaper or approved token launch plan is established.

## Month 1 closure result

**Local route/navigation coverage is complete for the Month 1 Local MVP and ready for internal UAT.** This is not production/security acceptance and does not authorize deployment, live providers, token issuance, payments, wallet custody, blockchain activity, database migrations, or connected-mode launch.

### Actual-file and browser evidence

Route coverage is based on the current filesystem routes, navigation data, runtime public/protected route arrays, automated smoke tests, and final browser validation:

- **40 customer and 31 admin `page.tsx` files** are represented in the tables above.
- Customer/public navigation covers home, marketplace, ecosystem/help, verification, future technology/token concept, login, dashboard, profile/account, Digital ID, properties, reservations, payments, documents, points, certificates, service requests, notifications/history, and logout.
- Admin navigation covers dashboard, customers/users, companies/projects/properties, reservations, payments, documents, certificates, service requests, rewards ledger, reports, roles/user roles, settings/governance workspaces, and logout.
- Final browser smoke validated public, customer, and admin route matrices at representative 390px, 768px, 1440px, and 1920px widths.
- Protected route behavior was validated for anonymous customer/admin deep links and logout redirects. Admin protected routes use the shared customer login surface in demo mode.
- Public/protected classification still remains a user-experience boundary. Authoritative connected-mode authorization belongs in the Nest API and remains Phase 2/connected acceptance work.

### Confirmed local-MVP route and workflow fixes

| File | Defect and correction | Evidence |
| --- | --- | --- |
| `apps/customer-web/app/components/meridian-public/marketplace-discovery.tsx` | Marketplace search/select controls lacked robust labels/test targets for browser QA. Added explicit IDs, labels, ARIA, `onInput`, result count, and empty-state markers. | `npm run test:demo:browser` PASS. |
| `apps/customer-web/app/components/meridian-public/ecosystem-discovery.tsx` | Ecosystem service selector needed a stable label/ID for accessible control lookup. | `npm run test:demo:browser` PASS. |
| `apps/customer-web/app/components/customer-data.tsx` | Disabled future transaction wording implied a near-term workflow. Updated wording to explicit future/unavailable state. | Source review and browser smoke. |
| `scripts/demo-browser-smoke.mjs` | Browser acceptance coverage did not fully exercise Month 1 journeys, responsive widths, shared-world workflows, or known Next/browser false positives. Expanded and stabilized the suite while preserving real console/error gates. | `npm run test:demo:browser` PASS. |
| `apps/api/tsconfig.json` / `apps/api/test/env-startup.spec.ts` | API test diagnostics used stricter env typing than the project tsconfig covered. Included tests in API tsconfig and tightened invalid-env fixture input. | Diagnostics PASS; API typecheck/test suites PASS. |

Earlier route/navigation fixes for duplicate active states, admin reports discoverability, report unavailable states, missing-value rendering, and certificate issuance refresh remain part of the retained working tree.

## Actual API auth and security boundary

The offline TypeScript AST audit found **73 unique Nest HTTP method/path pairs** in controller files. `apps/api/src/modules/app.module.ts` registers the corresponding controllers. Its global guards are rate limiting and feature gating, **not global authentication**; endpoint/class auth decorators therefore matter.

| Boundary | Count | Actual routes and enforcement |
| --- | ---: | --- |
| Explicitly public GET | 9 | `/api/v1/auth/config`, `/health`, `/health/ready`, `/companies`, `/business-services`, `/projects`, `/properties`, `/properties/:id`, `/verify/rhc-id/:token` (all paths after the first also use `/api/v1`). Catalog reads have feature gates; public ID verification currently does not. |
| JWT self-service/session | 12 | `/auth/session`; `/me` GET/PATCH; `/me/rhc-id` GET/POST; `/me/properties`; `/me/notifications`; consent GET/POST; reservation GET/POST/cancel. `AuthGuard` plus current-user ownership/service checks. |
| Admin | 47 | Admin directories, dashboard, review, governance, property/reservation management, audit/settings/flags, and API-client management. Every method has `AuthGuard`, `PermissionGuard`, and explicit `RequirePermission` metadata. |
| Machine-to-machine | 5 | `/company-api/company`, `/company-api/projects`, `/company-api/properties`, `/internal/identity/verify`, `/internal/events`. `CompanyApiGuard` verifies the API key and per-method machine scope; these are not user JWT sessions. |

The counts are static coverage, not 73 executed HTTP tests. Exact public routes are asserted so a newly unguarded endpoint fails the offline audit.

### Evidence-backed controls

- `security/supabase-jwt.service.ts`: signature verification through configured JWKS; issuer/audience checks; ES256/RS256 only; required subject/expiry/issued-at claims. Identity/email confirmation is rechecked through the server-only Auth admin lookup with a timeout and redirects rejected. Failures close authentication. No secrets were printed or used to exercise this provider.
- `security/auth.guard.ts` and `application-user.service.ts`: strict bearer parsing, persisted application identity, blocked disabled/locked accounts, registration flag for first provisioning, no browser-supplied role grants. Auth synchronization does not turn business verification into approval.
- `security/permission.guard.ts` and `rbac.service.ts`: missing policies deny access; list queries use grant-specific predicates; detail/body references resolve company/project scope; expired/cross-company assignments are filtered. CUSTOMER self-service is ownership-based, not seeded admin permissions.
- `admin/admin.controller.ts`: business approval requires global `user.manage`, forbids self-approval, checks linked confirmed active identity and expected status, and commits audit/event with the update. ID issuance remains a separate customer operation.
- `security/company-api.controller.ts` / `company-api-key.service.ts`: separate machine principal, scoped company queries, reviewed delegation, and one-time credential issuance/rotation with `no-store`. Emergency revoke remains available with its feature switch off. No new admin API-client screen exists; machine credential management is an API/operator surface, not completed UI functionality.
- `main.ts`, config, and `rate-limit.guard.ts`: Helmet, exact CORS origins, explicit trusted proxy allowlist, pre-auth IP and post-auth stable-subject quotas, Redis failures return unavailable rather than bypassing limits. Liveness alone bypasses quotas. Production dependencies/configuration remain unverified.
- `api-exception.filter.ts`, `safe-data.ts`, audit/events: controlled public exception text, key-based nested redaction, typed settings projection and selected integration fields. Key-based redaction does not prove arbitrary free-text fields are secret-free.
- Demo boundary: `api/demo/[...segments]/route.ts` requires configured Host/Origin (Origin mandatory for writes); `lib/demo/store.ts::assertDemoServer` requires explicit demo profile/mode and denies production/staging/preview. The fixture router enforces persona/permission/record scope. Headers are not a substitute for loopback binding or deployment exclusion; keep the fixture hub local. No demo code was modified or server started by this pass.

## Admin functionality, reports, and incomplete surfaces

- The command center, directories, inventory, relationship management, reservations, governance, verification, and ID registry are real component/request surfaces, not proof that the live services are accepted. Search/pagination generally apply to **loaded** records.
- Connected backend gaps explicitly registered in `packages/ui/src/api-capabilities.ts` include payment evidence, documents, certificates, service requests, rewards, demo account projections, saved properties, identity-review submission, activity/receipts, and notification-read mutations. API mode reports unavailability rather than sending those known-gap requests. Implementing the domains requires separate owned API/database work; do not enable them by toggling flags.
- Reports use `/admin/reservations` and `/admin/audit-logs` in API mode. Demo additionally supports payments, documents, rewards ledger, and service requests. There is no dedicated backend `/admin/reports` aggregation/export endpoint.
- Report filters use selected columns, status, and inclusive Asia/Manila date boundaries. CSV/print contain only the filtered **loaded** rows and selected columns, not all database records. CSV adds provenance and filtered/loaded counts, quotes delimiters/newlines, and prefixes formula-like cells. An offline component harness checks boundary timestamps, excluded statuses/invalid dates, omitted source fields, CSV, and the print callback. Browser download behavior, print layout/pagination, spreadsheet applications, and large-dataset exports remain unvalidated.
- Certificate issuance/review, payment reversal, synthetic document review, append-only points commands, and resident-service progression are demo workflows. They are not government title, money movement, external dispatch, or deployed blockchain functionality.
- Verification review uses expected status, a review reference, and separate user issuance; it is not an evidence-upload/review provider. `digitalIdState()` currently calls active/verified customers “Eligible” without proving email confirmation or the issuance flag. Treat that as preliminary readiness, not guaranteed issuance.
- Remaining admin UX debt (not an API bypass): command-center queues/quick links and several mutation buttons are not individually capability-filtered, so read-only/scoped staff can see controls that the backend rejects. Apply per-action capability/mode checks and test read-only/scoped personas; retain backend enforcement. Some global-only actions cannot be inferred from the current flat capability payload.
- Source scan found no explicit TODO/FIXME/HACK/XXX markers in the searched application/package implementation trees. This is not completion evidence. Most `placeholder` hits are input hints. Intentional incomplete surfaces include customer wallet/transaction “coming soon” copy, inactive future-technology redirects, disabled shared transaction search, and seeded `web3_placeholder_status`. `EventsService.publish()` records an activity event; it does not demonstrate a delivery worker, provider dispatch, or settlement pipeline.

## Safe secret-exposure audit

`node --test scripts/month1-secret-audit.test.mjs` is offline and emits **file/line/rule metadata only**, never matching values or environment contents. The latest scan covered **261 source/config/document files and 5 environment files**. It excludes dependency/build output, `.git` history, browser bundles, and local `.rhc-demo` state; it is a heuristic, not a credential-validation service or release attestation.

- Root `.env` exists, is untracked, and is ignored. Four tracked `.env.example` files are templates. No privileged public-environment variable/value match was reported in those files.
- The browser-source check passed: no direct privileged server-environment references were found in the scanned browser code. API handlers, server demo modules, and browser test fixtures are excluded from that particular assertion. No bundle/transitive-import security guarantee is inferred.
- **The credential heuristic is not green:** three credential-shaped URL candidates were reported at `apps/api/test/env-config.spec.ts:11`, `apps/api/test/env-config.spec.ts:94`, and `apps/api/test/security.e2e-spec.ts:150`. Value-withheld structural inspection places them in configuration-test inputs and a mocked exception. These are **test-fixture candidates, not confirmed live credential exposure**. They remain unsuppressed pending private owner verification; no values were echoed, copied into this document, or submitted to any service.
- Action: privately verify those three literals are intentionally synthetic. Replace them with unmistakably non-secret reserved-host fixtures or add narrowly reviewed scanner exceptions in a follow-up. If any is genuine, rotate/revoke through the provider and perform a private history/artifact scan; do not paste it into an issue or terminal output. Do not use a broad test-directory exclusion.

## Connected-mode route risks deferred to Phase 2

The following are **not open Critical/High defects for the isolated Month 1 local MVP**, because `npm run dev:demo` does not use the live Nest API, Supabase, production database, providers, wallets, payments, or blockchain paths. They are retained here as connected-mode risks that must be owned before production or external release:

| ID / priority for Phase 2 | Evidence | Required owner action |
| --- | --- | --- |
| D1 · High · public verification privacy | `apps/api/src/modules/directory/directory.controller.ts` connected verification decodes base64url into sequential-looking `RHC-YYYY-NNNNNNNN` references and returns a minimal identity projection. Demo opaque references do not establish this connected boundary. | API/privacy owner: introduce non-enumerable revocable verification references and an explicitly approved minimal projection; add feature/revocation/privacy tests, generic invalid handling, and appropriate abuse limits. |
| D2 · High · activation policy only in UI | Connected admin feature-flag activation policy must not rely only on UI presentation for future wallet/token/blockchain restrictions. | API/governance owner: deny unapproved future activation server-side or require a distinct reviewed release policy; add direct-API tests. No flag/provider was enabled during Month 1 closure. |
