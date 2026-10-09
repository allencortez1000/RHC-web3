# Real local smoke checklist — NOT EXECUTED

Companion to [integration-readiness.md](integration-readiness.md). **Backend API is NOT READY. All boxes remain unchecked.** This checklist is not permission to start/recover the backend or contact it now.

## 1. Release the blockers before connected launch

- [ ] Receive and identify the Backend–Wallet Integration Contract version/hash and latest backend recovery result (commit/source identity, timestamp, result and remaining failures). Neither was available during this preparation.
- [ ] **Galiver confirms API readiness.** Record that confirmation; backend/database ownership remains with the designated backend owner, not inferred from who relays readiness.
- [ ] Backend owner supplies the authorized local API base URL including prefix, intended runtime mode, safe test window and already-ready dependencies. Allen does not start/change backend services or run migrations.
- [ ] Obtain the backend's **exact effective CORS allowlist** as sanitized origin strings, not `.env` contents. Record exact customer and admin origins and verify both belong to it. Compare scheme/hostname/port; `localhost` and `127.0.0.1` are different. Do **not** assume3002/3003 or test43102/43103 are approved. Stop on mismatch; owner decides configuration rather than frontend bypass.
- [ ] Confirm the approved Supabase project, public configuration and exact same-browser PKCE callback/redirect URLs for each chosen frontend origin. No secret/service-role/provider/database key belongs in frontend config, source, logs or reports.
- [ ] Reconcile the standalone contract with the report's endpoint/envelope/auth/scope/projection table. Any unknown endpoint or new wallet/auth scheme is a contract decision, not permission to guess, merge backend source or bypass gates.
- [ ] Agree an explicit allowlist of permitted network destinations, read/write actions, disposable/preprovisioned customers and scoped/global staff, data retention and cleanup ownership. `GET /auth/session` can provision rows; registration/recovery can send email. These effects require separate authorization.
- [ ] Confirm frontend ports are free and build output is not in use; never kill/reuse foreign listeners. Rebuild each frontend with approved **public** configuration; existing offline bundles contain synthetic values. Keep API mode explicit with no demo fallback.
- [ ] Keep Web3/provider mode disabled unless separately authorized. API readiness does not authorize RPC, wallet linking/signing, payments, deployment, token writes or points redemption.

No connected launch command is prescribed while the exact origins/base URL and readiness are missing.

## 2. Execute only the agreed smoke scope

Record UTC time, frontend/backend commits, origins, browser, test-persona aliases, result and safe request IDs—not bearer tokens/private profile payloads.

| Check | Expected result |
| --- | --- |
| CORS/preflight from **each actual frontend origin** | After readiness/authorization only: exact origin accepted with needed GET/POST/PATCH/OPTIONS and Authorization/Content-Type handling. Unauthorized origin denied. This is not an authorization bypass test using real private records. |
| Auth/config/session | Real Supabase flow and bearer `/auth/session` agree; expired/invalid token401, inactive/denied access safe; no cookie-only assumption or login redirects passed off as JSON. Abort test if unintended provisioning/email occurs. |
| Account/profile | `/profile` reads `/me`; missing profile, loading, empty, error/retry stay distinct. Approved contact edit persists if writes authorized; locked identity fields and unknown fields remain denied. `/account` demo aggregate remains unavailable in API mode unless a separate contract implements it. |
| Digital ID | GET never issues; loading/503 never means unissued; genuinely null remains unissued. Existing issued ID without approved public reference has no QR. Explicit issuance test only with approval and eligible disposable account; verify idempotence/denial without weakening gates. Public verification remains UNAVAILABLE where contracted. |
| Property directory | Returned fields/null decimal values render correctly, loaded counts do not claim global totals, available detail works, unavailable/unauthorized detail is safely404. Document the200 loaded-slice/search limit; no complete-inventory claim. Own linked properties do not expose another customer. |
| Reservations | If synthetic business writes authorized: available create sends only property_id; UI opens owner-scoped reservations and reference survives reload. Duplicate/conflict/403/503 stay errors, no fabricated success. Nonowner list/cancel denied. Cancellation reason persistence must match agreed contract—not assumed from sent text. Do not interpret hold as payment/title/ownership. |
| Admin capabilities | Effective global/company/project grants match backend decisions. Denied modules hidden; direct access denied by backend. Permission loss before confirmation sends no unauthorized mutation. Missing/malformed grants do not become global; nested/scalar company target representations agree. |
| Session races | Switch customer/logout with pending reads/mutations: old profile/ID/QR/reservation/capability state cannot reappear or trigger late navigation. Backend may have accepted a cancelled client write; re-read authoritative state before any retry. |
| Unsupported workflows | Documents/payment/service/certificate/identity-review/points demo-only calls remain locally unavailable without misleading empty/success states. No direct business-table fallback. |
| Points versus tokens | Centralized points remain separate from blockchain observations, money and wallet balances. No conversion/redemption/transfer promise or activation. |
| Disabled read-only Web3 | Customer disabled/unavailable states do not block core workflows. Admin diagnostic access requires global integration.view and remains non-probing. Do not simulate outages by contacting a chain. Any real provider comparison is a separately approved task. |

UI spot checks: keyboard access/focus, mobile layout, reduced-motion preference and error announcements. This sample is not full accessibility certification or human release approval.

## 3. Stop and report

- [ ] Stop on CORS/contract/auth mismatch, unexpected external request, private-data exposure, feature bypass or unresolved backend error. Preserve sanitized request ID/status; hand backend recovery back to its owner.
- [ ] Do not alter backend contracts, migrations, services, CI, CORS allowlists, credentials, token approvals or wallet/chain activation to make smoke pass.
- [ ] Record PASS/FAIL/BLOCKED/NOT RUN per check, keeping owner confirmation separate from automated evidence. A health endpoint/local build alone is not core API readiness.
- [ ] Close only Allen-owned frontend/browser processes. Backend remains under owner control. Any test-record cleanup uses the separately agreed owner procedure; no direct SQL/reset/import.
- [ ] Review scoped frontend diffs and results with a human. No commit/push/deploy is part of this checklist.
