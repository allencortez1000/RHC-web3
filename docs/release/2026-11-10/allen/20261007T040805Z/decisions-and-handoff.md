# Decisions and handoff — 20261007T040805Z

Drafts only; nothing sent or approved. Continue the [existing integration handoff](../20261007T014758Z/integration-handoff.md), not a new Week 1/Week 2 plan. Local results: [follow-up validation](follow-up-validation.md). Management must name accountable **NestJS/backend, Prisma/Supabase/database, and deployment owners**. Galiver's blockchain role does not assign those responsibilities.

## Browser-expiry decision — PENDING backend owner

Current source still has `observedAt`, `lastSuccessAt`, `lastAttemptAt` and block provenance, but **no authoritative response clock or expiry deadlines**: `packages/types/src/web3.ts:15–31`; the API envelope adds only `request_id`. Server cache uses `age >= ttlMs` for stale and `age >= maxStaleMs` for discard (`packages/web3/src/thirdweb-read-provider.ts:16–58`). A failed refresh does not renew success time. Existing last-response wording is truthful, but is **not automatic browser expiry**.

Nothing about this design changed since the previous run. This follow-up independently reviewed the source and revalidated it on Node 22; it adds this decision proposal, not timers, polling, DTO fields, serialization changes or approval.

All field names and timing semantics below are **PROPOSED**, not agreed or implemented:

| Decision | PROPOSED semantics |
| --- | --- |
| Observation authority | Server snapshot-completion `observedAt`, including partial successes; never browser receipt time, block time or last-attempt time. Cached/failed responses cannot renew it. |
| Metadata | Server response-generation time plus absolute `freshUntil` and `discardAt`, bound to a snapshot/source/chain/address and versioned freshness policy. Require valid ordered timestamps. Names are proposals. |
| Clock comparison | Compare in server time, not directly against browser wall time. Use measured monotonic round-trip duration to establish a conservative server-time interval at receipt; use its upper bound to avoid overstating freshness. Owner must define acceptable uncertainty. Large delays or inconsistent/uncertain clocks fail closed. |
| Boundaries | Before `freshUntil`: temporally fresh; at/after it and before `discardAt`: stale; at/after discard: remove token/block/current-observation fields. Equal deadlines have no stale interval. Historical attempts/successes may remain explicitly historical. |
| Delayed responses/races | Evaluate age when consumed, so already-expired results never flash fresh. Reject obsolete request generations and source/account changes. Rerenders, retries and cached responses cannot reset age. |
| Partial data | Completeness and freshness are separate. Missing values stay missing; never fill fields from older snapshots or invent zero/false. Partial snapshots share the authoritative temporal boundaries. |
| Failed refresh | Never extend deadlines. Initially retain the existing clear-on-reload/error behavior; any proposal to retain old observations requires a separate decision and may not exceed discard time. Honor server invalidation/absence immediately. |
| Missing metadata | No copied server defaults or guessed browser timer. Propose “freshness unverifiable” and withholding testnet token/block observations until valid metadata exists. Backend owner must decide compatibility/rollout behavior. Synthetic mode stays explicitly fictional. |
| Tab suspension/resume | Re-evaluate before current claims on visibility/focus/pageshow; withhold/discard if elapsed time cannot be established safely. Local expiry must not trigger network polling. |
| Account/capability changes | Immediately clear resources, invalidate requests and reject late old-scope responses. Logout, contract/source/config changes and loss of admin global permission must remain fail-closed. |

**Touchpoints:** customer `app/components/web3-preview.tsx` mounted by Future Technology; admin `app/integrations/thirdweb-read-panel.tsx`; shared `packages/ui/src/web3-read-panel.tsx` and `runtime.tsx`; API `modules/web3/web3.controller.ts`, `web3.service.ts`; public types and read provider. `GET /api/v1/web3/token` may initiate a read when separately enabled. `GET /api/v1/admin/integrations/thirdweb` is global-permission diagnostics and must remain non-probing.

**PROPOSED consumer acceptance:** both customer/admin at deadline −1/exact/+1 and equal deadlines; delayed/cached responses; partial fields; clock skew/jumps and long RTT; hidden tab/sleep/BFCache; absent/malformed/inconsistent metadata; failed refresh through discard; late success after denial/logout/account/capability/source change. Assert no invented values, no provider request from admin diagnostics/local expiry, and no Web3 outage blocking core journeys. Existing elapsed-tab tests deliberately assert last-response behavior; they do not accept exact browser expiry.

## First connected-core work package — preparation only

API paths below are relative to `/api/v1`; exact source map and error/permission detail remain in the [prior handoff](../20261007T014758Z/integration-handoff.md#actual-api-map).

| Order | Available contract and consumer | Missing work / owner decision | Acceptance prerequisites |
| --- | --- | --- | --- |
| Account/profile | Browser Supabase auth; `GET /auth/config`, `/auth/session`; `GET /me` returns user/profile; strict nonempty `PATCH /me`. `/profile` and `components/customer-data.tsx` consume it. Verified/ID-issued identities allow mobile-only edits. | `/account` still mounts demo records; `/me/demo-records` is capability-blocked in API mode. Decide connected account entry versus a separately specified aggregate. No new password API or direct table client. | Named backend/auth owner; approved target/auth configuration and least-privilege runtime. Cross-account isolation, auth errors, locked-field/strict DTO behavior, logout and pending-request invalidation. Session GET may provision/write; it is not a harmless live read. |
| Digital ID | `GET /me/rhc-id` returns ID/issued time; strict empty `POST` issues idempotently subject to feature, ACTIVE, business VERIFIED and confirmed-email gates. `components/digital-id-page.tsx` consumes it. | No connected `public_reference`; public `/verify/rhc-id/:token` returns UNAVAILABLE without identity lookup. Customer identity-review submission/correction and public disclosure/revocation contracts are missing. Existing admin approval is not that new domain. | Keep issuance disabled until separately approved; verify eligibility, denial, idempotence and no issuance on GET. Never fabricate QR/base64 internal IDs. Name identity/privacy approval owner. |
| Properties/reservations | `/properties`, `/properties/:id`, `/me/properties`; customer GET/POST `/me/reservations`, POST `/:id/cancel`; scoped admin list/create/actions. Customer inventory/detail/reservations and admin `admin-data.tsx` consume these. POST customer accepts only `{property_id}`; admin actions require review reference. | Decide first customer-property association, post-hold navigation, 72-hour/manual-expiry policy, conversion meaning, cancellation evidence and replay. Customer cancellation reason is sent but ignored by current controller. Schema alone adds no APIs. | Preserve feature gates, effective resource permissions and owner-derived customer IDs. Test held-property reload, duplicates, cross-customer cancellation, permission loss, null/zero/count scope and transaction/runtime concurrency separately. |

Read-only source references rechecked: `apps/api/src/modules/customers/me.controller.ts`; `modules/identity/rhc-id.service.ts`; `modules/directory/directory.controller.ts`; `modules/reservations/reservations.controller.ts` and `reservations.service.ts`; `apps/api/src/platform/dto.ts`; `packages/ui/src/api-capabilities.ts`; customer `/account`, `/profile`, `/properties/[id]`, `/reservations` and Digital ID consumers.

**Source-derived risk, not a reproduced regression:** reservation creation makes an AVAILABLE property HELD but creates no customer-property link; conversion creates BUYER. An initially unlinked customer can therefore lose public detail access after hold/reload. Backend/domain owner should settle the navigation/association contract before connected acceptance. Journey ordering does not imply Digital ID is currently a reservation prerequisite. No protected component was edited.

## Owner inputs — one concrete request each

- **Management:** identify accountable backend/database/deployment owners and decide provider read scope/spending. Names and business approval remain PENDING.
- **Backend owner (name PENDING):** approve/revise the proposed expiry contract above before browser lifecycle implementation.
- **Database/security owner (name PENDING):** separately authorize and resolve target migration-ledger/checksum and non-owner runtime/RLS/invoker validation. The foundation is already COMMITTED at `579a007`; client generation is codegen, not database acceptance. See existing [database handoff](../../../../database/connected-domain-handoff.md) and [migration runbook](../../../../database/supabase-dev-migration-runbook.md).
- **Frontend/Web3 human reviewer:** review the exact [commit allowlist](commit-review.md), preserved negatives and cross-consumer behavior. Automated review is not human peer approval.
- **Deployment owner (name PENDING):** supply exact deployment ID, commit SHA, UTC time and sanitized failed-stage log (including failing command/exit code). No current incident logs supplied; cause remains unverified. A passing local build is not a hosted fix. No cloud access/redeployment requested.

## Galiver message — DRAFT / NOT SENT

> Please provide the exact chain ID/name and contract address; official-versus-generic designation; versioned ABI and verified source/build provenance; deployment transaction, block/receipt and evidence; proxy implementation/upgrade authority where applicable. Confirm read-method signatures and restriction semantics, including what cap/paused do and do not establish. Please include provenance/explorer references. All evidence is currently PENDING; fixtures are not deployment proof. No secret keys, signing, activation or live reads are requested.

Approved testnet allowlist remains empty. Management must independently approve provider scope, quote/budget and any later bounded network acceptance. No assignee, quote, approval, deployment cause or external task status is invented here.
