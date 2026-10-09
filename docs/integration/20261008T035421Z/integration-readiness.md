# Allen frontend / read-only Thirdweb integration readiness

**2026-10-08 — OFFLINE PREPARATION COMPLETE; CONNECTED LAUNCH BLOCKED.** Backend API remains **NOT READY**, per the task. Backend/database recovery belongs to its owner; no recovery action was attempted. [Conditional real-local smoke checklist](local-smoke-checklist.md).

## Evidence and missing inputs

Worktree `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3`, branch `allen/frontend-web3-stabilization`, HEAD `4c83c23d4341303cbe031db8f32f296d7df838b6`. Git started clean with no active operation; the previous stabilization changes are now committed. No branch/index/history operation was performed. Before/after source and index records are in `evidence/`; existing work and previous reports were preserved.

**The named Backend–Wallet Integration Contract and latest local backend recovery result were not supplied or located.** Checked this checkout and relevant neighboring project documentation filenames, not private environments or a standalone backend import. Requested paths/sanitized copies from the user. Consequently:

- The compatibility matrix below is against **checked-in API source**, not a claim about the separate backend contract or its recovery result.
- Standalone API version/base URL, exact effective CORS allowlist and recovery acceptance are **UNVERIFIED/BLOCKED**.
- No connected launch configuration is proposed until those inputs are reconciled and Galiver confirms API readiness. That confirmation does not transfer database ownership to Allen or imply blockchain activation.

## Existing consumer compatibility

Paths are relative to the configured API base, expected to include `/api/v1`. Both frontends use `NEXT_PUBLIC_API_URL` with no automatic backend URL fallback.

| Consumer | Checked-in endpoint / expected fields | Authentication, state handling and compatibility limits |
| --- | --- | --- |
| Account/auth | Anonymous `GET /auth/config`: `registration_enabled`, optional preview flag. Bearer `GET /auth/session`: `{authenticated,user}`; user identity/status/verification/roles/permissions/scopes. Password login/confirmation/recovery use Supabase SDK, not Nest password endpoints. | Same-browser PKCE; implicit/token-hash links rejected. Email confirmation is distinct from business verification. Session GET may provision application rows: it is not guaranteed read-only. `/account` itself requests demo records, not a connected account aggregate. |
| Profile | Bearer `GET /me` → `{user,profile}`; nullable profile includes names/contact/address/status/ID fields. Strict nonempty `PATCH /me` → updated profile. | Existing profile editor aligns with checked-in allowlisted fields. Verified/ID-issued identity allows mobile-only self-service changes. Loading/error/retry and mutation busy/error states retained. Backend may return generic `Access denied`, not the detailed message used by some older fixtures. |
| Digital ID | Bearer `GET /me/rhc-id` → `{rhc_id,rhc_id_issued_at}`; `POST /me/rhc-id` has no body/empty object → `{rhc_id}`. Feature/ACTIVE/business-VERIFIED/email-confirmed eligibility enforced server-side. | Reads never issue. Frontend now waits for both identity reads before issuance/eligibility claims. Current controller supplies **no `public_reference`**; QR remains unavailable without it. Customer identity-review submission is demo-only. |
| Public verification | `GET /verify/rhc-id/:token` → `{valid:false,status:'UNAVAILABLE',message}` without identity lookup. | Intentional current backend privacy boundary, not “invalid customer.” No internal-ID/base64 sharing workaround. |
| Property directory | `GET /properties` supports strict filters/take/skip; returns ID/code, location, type, area, nullable decimal price/currency/status/metadata and project/company fields. `GET /properties/:id` is AVAILABLE-only. Bearer `GET /me/properties` returns current own relationship records with nested property. | API directory routes are public/feature-gated, while current frontend directory is inside the authenticated portal. Loading/error versus genuine empty/zero preserved. Customer loads200 and filters locally; it is not a global total. List may contain records unavailable through public detail. `/me/properties` caps200 without pagination. Do not broaden backend visibility to fix navigation. |
| Customer reservations | Bearer `GET /me/reservations`; strict `POST {property_id}`; `POST /me/reservations/:id/cancel` owner/feature checked. Response: ID/reference/status/expiry/creation/update times and limited nested property/project/company—not customer/admin event history. | New successful detail-create flow opens the existing owner-scoped reservations page and re-reads the reference; errors do not navigate/fabricate success. List currently uses one default100 page. Frontend sends cancellation `reason`, but checked-in controller ignores it and records fixed audit text. Full-Property frontend typing is broader than this projection; current rendered fields fit. |
| Admin capabilities | Bearer `GET /admin/capabilities`: `permissions`, scoped `grants`, `mutation_permissions`, `mutation_grants`, optional `modules[{path,permission,usable}]`. | Navigation uses usable modules when supplied; missing modules falls back to permission names, not equivalent scope proof. Pre-write capability revalidation and target-specific grants retained. Missing/malformed scopes are not global. Nested company normalization now matches scalar IDs; backend resource authorization remains mandatory. |
| Read-only Web3 | Bearer `GET /web3/token`; `GET /admin/integrations/thirdweb` additionally requires **global** `integration.view`. Fields separate source/configuration/connection/snapshot/completeness, timestamps/provenance and optional observed values. | Customer preview separately checks app session. Admin diagnostics remain non-probing; no chain call initiated by that endpoint. Last-response wording is not continuous provider health or automatic browser expiry. Unknown/unsupported values are not zero/false. |

Sources: `apps/customer-web/app/{providers.tsx,profile/page.tsx,reservations/page.tsx,properties/page.tsx,properties/[id]/page.tsx}`; `components/{customer-data.tsx,digital-id-page.tsx,web3-preview.tsx}`; `apps/admin-web/app/{admin-capabilities.ts,capability-scopes.ts,integrations/thirdweb-read-panel.tsx}`; `packages/ui/src/{runtime.tsx,api-transport.ts,api-capabilities.ts}`; checked-in `apps/api/src/modules/{auth,customers,identity,directory,reservations,admin,web3}` and `platform/dto.ts`.

### Common transport requirements

`api-transport.ts` unwraps `{success:true,data,meta}` (also accepts raw JSON); failures use HTTP status and `{success:false,error:{code,message},meta:{request_id}}`. Invalid JSON fails. Authenticated requests send Bearer tokens, omit cookies, reject redirects and disable caching. Public requests strip Authorization. Cookie-only auth or login redirects would not match this client. Ten-second request deadlines, session-generation invalidation and resource cleanup remain. `401` invalidates session state; other failures show safe error/retry rather than demo fallback.

Unsupported API-mode paths remain locally gated with `FEATURE_UNAVAILABLE` before a request: demo account aggregate, identity-review submission, payments, documents, certificates, service requests, rewards/points ledger and related demo-only operations. Backend readiness alone does not implement or unlock them. **Centralized RHC Points are business-ledger units, not blockchain tokens, cryptocurrency, wallet balances or promised conversion.** Connected points acceptance is not claimed.

## Origin / CORS check — NO CONNECTED LAUNCH APPROVAL

| Configuration evidence | Value / interpretation |
| --- | --- |
| Normal frontend scripts | Customer `next dev/start -p 3002`; admin `-p 3003`; normal scripts do not explicitly constrain hostname. These ports are defaults, **not approved origins**. |
| Browser API base | Each frontend requires public `NEXT_PUBLIC_API_URL`; no proxy/base URL fallback in Next config. Build-time public values must be rebuilt when changed. |
| Cross-frontend links | `NEXT_PUBLIC_ADMIN_WEB_URL` / `NEXT_PUBLIC_CUSTOMER_WEB_URL`; shared admin URL helper can fall back to current hostname/scheme +3003. Do not rely on that fallback for integration. |
| Checked-in API default only | `packages/config/src/index.ts:112` defaults omitted `CORS_ORIGINS` to `http://localhost:3002` where permitted. |
| Checked-in development expansion only | `apps/api/src/main.ts:22–34` unions configured origins with `http://localhost:3000`, `http://localhost:3002`, `http://localhost:3003`, `http://127.0.0.1:3002`, `http://127.0.0.1:3003` **only in development**. Test mode does not get this expansion; staging/production require explicit HTTPS origins. |
| Actual standalone backend allowlist | **MISSING — exact comparison cannot be completed.** No real `.env` values were read. Source defaults and successful fixture tests are not operational approval. |
| This run's test origins | `http://127.0.0.1:43102` / `:43103`; synthetic intercepted API `:43101/api/v1`. Test-only; not proposed integration origins. |

Origin equality requires exact **scheme + hostname + port**. `localhost` ≠ `127.0.0.1`; customer approval does not approve admin. Demo hub allowlists do not configure Nest/standalone CORS. Obtain the backend owner's sanitized exact allowlist and intended frontend origins, then compare both literal origins and approved auth redirect URLs **before** any connected browser launch. No allowlist/port/config workaround was made.

## Confirmed frontend-only corrections

| Correction | Focused regression evidence |
| --- | --- |
| Digital ID loading/failure no longer claims pending/unissued or offers issuance prematurely; QR copy requires an approved public reference. Design/components and eligibility rules retained. | New `apps/customer-web/tests/integration-preparation.spec.ts`: deferred/503/retry for each identity endpoint and issued-without-public-reference cases. |
| Successful detail reservation navigates to existing `/reservations` rather than losing local confirmation on revision-remount/HELD detail404. Reference comes from owner-scoped GET; not client-fabricated. | Same new spec: create/reload/reference, subsequent detail404, account isolation;403/409/503 do not navigate; logout during pending request cannot restore success. |
| Admin project/integration/business-service target resolves `company.id` correctly via `nestedId`; no broadened grant or global fallback. | Updated `apps/admin-web/tests/capability-request-coordinator.spec.ts`: equivalent scalar/nested scopes; malformed/missing/mismatched/global/precedence negatives. Pure red25 pass/3 fail → green28 pass. |

Customer first red run contained three broad test-locator failures; locators were corrected **before product edits**, preserving that log. Valid red then had **6 expected failures/4 passes**, followed by **10 focused passes**. Full suites retained all prior negative assertions. No pagination redesign, backend contract change, new domain API or capability activation.

## Offline validation

Selected existing portable **Node22.20.0 x64**, bundled npm10.9.3; actual child execPath/version logged. Prior official checksum record retained; no new tool/package download or dependency/lockfile change. Sanitized child environment, real-dotenv filename checks, strict socket guards and intercepted API/auth responses. Only owned frontend fixture servers were started; no backend/Supabase/DB/Redis service or provider was contacted. No database generation/migration/seed or backend build/start was needed.

| Check | Result |
| --- | --- |
| Config/types/shared/validation/UI/Web3 workspace build | PASS |
| Customer and admin production-mode workspace builds | PASS / PASS |
| Customer/admin/UI/Web3 typecheck and scoped lint | PASS |
| Customer focused browser / full intercepted suite | 10 / 83 PASS |
| Admin focused pure spec / full intercepted suite | 28 / 148 PASS |
| Web3 core + installed SDK fixtures | 64 PASS |
| Web3 synthetic browser harness | 50 PASS |
| Shared UI/frontend Node tests | 31 PASS |

Do not sum overlapping focused/full suites or parent-test counts. All final rows passed; red evidence remains. Exact commands/timeouts/times/source hashes: [evidence/commands.jsonl](evidence/commands.jsonl). External logs/traces: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261008T035421Z/`. Test-only public configuration in build output is not suitable for connected launch.

No real local smoke, backend recovery, CORS preflight against the backend, provider acceptance, wallet enrollment/signing/token write, deployment or human UAT occurred. Thirdweb allowlist remains empty; no financial activation. Automatic browser expiry still awaits the [separate proposed contract](../../release/2026-11-10/allen/20261007T040805Z/decisions-and-handoff.md).

## Next input / owner boundary

Provide paths or sanitized copies of **(1) Backend–Wallet Integration Contract, (2) latest local recovery result, (3) exact effective CORS allowlist and API base URL**. Reconcile versions/envelopes/auth/capability/expiry fields, then obtain Galiver's readiness confirmation and the backend owner's authorized smoke window. Until then, use the checklist as preparation only. Allen owns the frontend corrections/read-only integration; backend/database recovery stays with its owner. Nothing committed, pushed, merged or deployed.
