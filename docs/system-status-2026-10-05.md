# RHC Digital — System Status

Reviewed: October 5, 2026.

This report distinguishes implemented source, synthetic demo functionality, and live acceptance. It is based on static review; no tests, builds, migrations, deployments, or live-provider checks were run for this report.

## Overall status

A substantial local-demo MVP and connected-backend foundation are implemented. Full connected-mode parity and staging/production acceptance remain outstanding. Earlier documentation describes the local demo as ready for internal UAT, not production release.

## Applications

| System | Current status | Boundary |
| --- | --- | --- |
| Public/customer Next.js app | Implemented; 40 page routes including aliases | Not every route represents an independent completed workflow |
| Admin Next.js app | Implemented; 31 page routes including auth pages | Some workspaces operate only against synthetic data |
| NestJS API | Connected foundations implemented | Requires approved/configured external services |
| Prisma/PostgreSQL | 29 models and seven migration directories | Hosted migration state and production policy unverified |
| Persistent local demo | Shared customer/admin synthetic world | Not a distributed production datastore |
| Thirdweb adapter | Read-only testnet implementation, disabled by default | Approved network/contract allowlist is empty |

## Public website

Implemented surfaces include the RHC homepage, marketplace discovery and filters, ecosystem directory, Help Center, Future Technology page, white-paper summary, responsive navigation, theme controls, and public credential-result pages.

- Marketplace is discovery, not checkout or payment settlement.
- Token artwork and roadmap content do not activate a token.
- Wallet and transaction routes redirect to account pages; they are not wallet functionality.
- Connected public Digital ID verification currently returns `UNAVAILABLE`.
- White-paper publication remains subject to content/legal approval.
- The public ecosystem route uses authenticated resource loading; anonymous behavior needs runtime review.

## Customer systems

| Area | Implemented functionality | Connected-mode status |
| --- | --- | --- |
| Authentication | Demo personas; Supabase login, signup, confirmation and recovery adapters | Live provider acceptance unverified |
| Dashboard/account | Summaries, account records and property journey | Partial; aggregate demo projections unavailable |
| Profile | Read/update; identity-field restrictions after approval/issuance | Backend implemented; reviewed identity correction remains incomplete |
| RHC Digital ID | Eligibility, company identity display, review separation and issuance | Issuance implemented; customer review submission demo-only; public verification unavailable |
| Properties | Inventory, detail, customer relationships and journey views | Core directory/relationship backend implemented |
| Saved properties | Save/unsave | Demo-only |
| Reservations | Create/list/cancel, history and admin transitions | Backend implemented; live concurrency acceptance pending |
| Payment records | Synthetic evidence, review status and reversal history | Demo-only; no gateway, collection, settlement or actual refunds |
| Documents | Synthetic text records, versions, review and preview/download | Demo-only; no production storage/scanning |
| RHC Points | Balance/history, synthetic benefits and redemption safeguards | Demo-only; connected schema exists but operational rewards are disabled |
| Certificates | Company records, references and lifecycle management | Demo-only |
| Service requests | Creation, progression and history | Demo-only |
| Notifications | Notification views | Connected reads exist; read-status mutations demo-only; provider delivery absent |
| Security/consent | Logout/session handling and consent preferences | Backend consent foundation exists; approved policy configuration required for grants |
| Settings | Appearance and account-facing controls | Not a complete production security console |

RHC Digital ID and certificates are company records, not government identification, land title or legal ownership proof. Demo points are not cash, cryptocurrency or investment value. MFA, passkeys, device inventory and remote device management are not established capabilities.

## Admin command center

Implemented workspaces cover:

- Command center and dashboard.
- Customers, verification and Digital ID registry.
- Companies, projects, properties, Amica tower inventory and customer-property relationships.
- Reservations, payments, documents, certificates, service requests and rewards ledger.
- Users, roles, permissions, scoped role assignments, feature flags and settings.
- Business services, integration metadata, audit logs and reports.

Navigation and actions are permission-aware, with company/project scope, confirmation controls, capability refresh and stale-request handling. Server-side checks remain authoritative.

Payments, documents, certificates, service requests and operational rewards remain demo workflows. Integration metadata is not proof of an active connector. Reports support six record families; API mode retains reservations and audit reporting subject to permissions. Exports represent loaded records, not necessarily a complete database export.

## Connected API

| Domain | Source implementation | Remaining boundary |
| --- | --- | --- |
| Authentication | JWT validation, authoritative Supabase identity lookup, application-user synchronization and account restrictions | Live Supabase, JWKS and database validation required |
| Authorization | Company/project RBAC, capabilities, role delegation and protected roles | Production role configuration and security acceptance required |
| Customer identity | Profile restrictions, reviewed business approval and transactional ID issuance | No complete correction workflow; public verification disabled |
| Directory/inventory | Public directories, property detail, admin management and customer relationships | Directory entries do not execute provider services |
| Reservations | Holds, cancellation, confirmation, expiry/conversion transitions, history and audit | No automatic expiry worker found; live contention/replay remains gated |
| Consent | Append-only grants/withdrawals and policy validation | Application module supplies an empty approved-policy list, blocking new grants until configured |
| Machine integrations | Hashed API keys, rotation/revocation, scopes, consent-bound checks and idempotent event intake | Incoming events record observations, not external workflow execution |
| Events/audit | Database persistence, correlation and redaction | No outbound event dispatcher, retry/dead-letter worker or provider delivery found |
| Notifications | Customer read endpoint | No real email/SMS delivery workflow established |
| Rewards | Accounts/rules/transactions/redemptions data foundation | No connected operational ledger/redemption service; activation locked |
| Web3 | Authenticated read snapshot and permissioned diagnostics | Configuration status is not provider connectivity proof |
| Operations | Health/readiness, CORS, headers, validation, controlled errors and rate limits | Readiness checks PostgreSQL/Redis, not all external providers |

Connected documents, payment evidence, certificates, service requests and rich demo-account projections are known implementation gaps, not problems solved simply by adding environment variables. The shared capability registry deliberately prevents unsupported API requests instead of substituting fixtures.

## Database and local persistence

The Prisma schema contains 29 models. Seven migration directories cover the foundation, identity/history, authorization, reservations and application ACL hardening. Definitions include active-reservation uniqueness, history-preserving relationships, reward ownership constraints, RLS enablement and browser/public privilege revocations.

The September 26 checkpoint handoff records successful application of all seven migrations through Prisma against disposable PostgreSQL, repeat deployment with no pending migrations, 69 focused ACL tests and 54 catalog cases. These are historical, bounded results, not fresh checks or proof of hosted production policy. Some earlier pagination evidence used a corrected execution copy; the original harness was not declared passing unchanged.

The local demo uses `.rhc-demo/world.json`, shared through the customer app fixture API. It supports persistent synthetic changes, serialized writes, revisions, sessions, audit/history and explicit reset/recovery. Its queue is process-local, not distributed concurrency control. Demo resets and smoke tests can change synthetic state.

## Authentication and security

Implemented controls include Supabase JWT/identity checks, PKCE browser auth, ownership checks, scoped permissions, separate machine-client authentication, reviewed identity approval, feature gates, CORS/security headers, rate limits, request cancellation, audit logging and sensitive-key redaction.

Important limits:

- Application registration gates do not disable direct Supabase signup; provider policy requires separate configuration.
- New consent grants need approved policy publication/configuration.
- Redis-backed rate limiting requires the provider and fails closed when unavailable.
- Proxy trust, deployed grants/RLS, role ownership, recovery and multi-instance behavior require environment-specific acceptance.
- Demo sessions are distinct from real API sessions.
- Synthetic security tests do not replace an independent security review.

## Web3 and financial features

A server-only Thirdweb read adapter now exists, with controlled RPC methods, chain/contract checks, bounded responses, timeouts, caching and synthetic test/demo support. The SDK is pinned to version 5.121.6.

Activation remains blocked by the empty approved testnet/contract allowlist and explicit network/preview configuration requirements. Environment variables alone cannot approve a network. The UI distinguishes synthetic observations, configuration state and read outcomes.

Not active: public token issuance, wallet custody, signing/transfers, token sale, staking, exchange, crypto payments, tokenized ownership or production blockchain deployment. The contracts directory contains boundary documentation, not Solidity implementations or deployment scripts. Payment evidence and demo points are not financial infrastructure.

## Shared packages and design system

| Package | Responsibility |
| --- | --- |
| `packages/ui` | Themes, shells, navigation, cards/tables, auth/runtime, transport, resource states and capability boundaries |
| `packages/types` | Domain, permission, demo and Web3 contracts |
| `packages/config` | Environment validation, proxy/CORS constraints and environment loading |
| `packages/validation` | Shared Zod input schemas |
| `packages/shared` | IDs, response envelopes and sensitive-key redaction |
| `packages/database` | Prisma schema, migrations, seed and ACL tooling |
| `packages/web3` | Disabled, synthetic and testnet-read provider boundary |

The visual system includes RHC navy/gold styling, light/dark/system themes, responsive shells, focus/keyboard support and reduced-motion treatment. Formal accessibility, performance and cross-browser acceptance remain separate work.

## Infrastructure and CI

CI configuration includes Node 22, dependency installation, runtime dependency audit, lint/typecheck, API tests, application builds and Chromium browser suites. Docker and Render/Vercel preparation documents exist.

Open verification items:

- The API Docker dependency stage does not copy the Web3 workspace manifest before installation even though the API build builds that package. Clean-image behavior needs reproduction before treating the image as ready.
- Dedicated shared-UI/Web3 regression tests do not have explicit execution steps in the inspected CI workflow.
- Local Compose publishes development database/Redis ports and uses development authentication settings; it is not production configuration.
- Container build/smoke, actual ingress/proxy behavior, provider setup, backups/restore, monitoring, alerting and operational ownership need acceptance evidence.
- Historical audit success is not a current vulnerability assessment.

## Testing status

Test source includes API unit and HTTP suites; customer/admin Playwright tests; demo-store, HTTP and browser smoke scripts; database/ACL checks; and Web3 boundary/presentation tests.

Current source inspection found five customer and six admin Playwright spec files, plus 28 top-level demo-store test declarations. These are inventory counts, not passing results.

Earlier records report differing totals across revisions. The README reports 217 API unit tests, 143 API request tests, 55 customer browser tests and 65 admin browser tests. Later acceptance and checkpoint documents describe additional focused coverage. Those totals must not be combined into a current pass count.

No suite was rerun for this documentation task. API HTTP fixtures do not establish PostgreSQL isolation; intercepted browser/provider responses do not establish live integration. Root `npm test` runs API tests, not the entire browser/demo suite. Root `validate` does not include every separate demo/browser check.

## Main remaining work

1. Revalidate the current revision with lint, typecheck, builds and relevant API, UI, Web3 and demo suites.
2. Complete connected backend parity for documents, payment evidence, certificates, service requests, rewards and account projections.
3. Publish approved consent policies and decide the public verification/identity-correction requirements.
4. Validate hosted database target, roles, ACL/RLS and migration authority; separately approve any migration, seed or bootstrap.
5. Complete contention/replay, expiry/background processing and external-delivery acceptance.
6. Verify real Supabase flows, Redis, proxy topology and approved storage/provider integrations.
7. Validate Docker/deployment paths, backups, monitoring and incident operations.
8. Obtain security, privacy, legal/finance, accessibility and business UAT/release approvals.
9. Keep Web3 disabled until separately reviewed testnet approval and bounded live-read acceptance; do not infer transaction approval from read access.

## Documentation reconciliation

Older summaries are useful history but contain stale current-state claims:

- Four/five-migration wording is superseded by the seven-migration inventory and later disposable-database evidence.
- Statements that no Thirdweb integration exists are superseded by the read-only adapter; this does not mean live activation.
- Older 25-test demo-store totals differ from the current 28 declarations, which were not executed here.
- Route documentation has some stale access/redirect classifications; source and runtime checks should govern updates.

This report summarizes repository state, not live project-management completion. The checkpoint handoff identifies ClickUp as the live completion authority; no live project-control evidence was accessed.

## Evidence and related documents

- [README](../README.md) — application setup and earlier readiness statement.
- [Demo guide](demo-guide.md) — synthetic environment, safety boundaries and reset behavior.
- [Route coverage](route-coverage.md) — route inventory, with the drift noted above.
- [Phase 2 handoff](phase-2-handoff.md) — connected implementation and approval work.
- [Validation report](validation-report.md) — historical local validation.
- [Checkpoint 4 handoff](month-1/checkpoint-4-handoff.md) — seven migrations, bounded database evidence and acceptance gates.
- [Acceptance validation](month-1/acceptance-validation.md) — release requirements and historical checks.
- [Thirdweb handoff](web3/thirdweb-readonly-handoff.md) — read-only integration boundary.
- `apps/customer-web/app` and `apps/admin-web/app` — portal implementation.
- `apps/api/src/modules` — connected domain implementation.
- `packages/ui/src/api-capabilities.ts` — explicit connected feature gaps.
- `packages/database/prisma` — schema, migration and ACL tooling.
- `packages/web3/src/config.ts` — empty approval allowlist and activation gates.
- `.github/workflows/ci.yml` and `infrastructure` — CI/deployment preparation.

**Bottom line:** The strongest completed scope is the shared synthetic demo and substantial connected foundations. The next major milestone is verified connected operation and formal acceptance, not merely more pages or enabling a token feature.
