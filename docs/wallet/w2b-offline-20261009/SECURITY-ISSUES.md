# RHC W2B-P1 — Security Review, Residual Risks and Blocking Issues

**Scope reviewed:** Local synthetic-only, disconnected adapter and UI, with a pinned Thirdweb compile-time type boundary. Not a penetration test, production security assessment, connected provider audit or WCAG certification.

## PASS — properties supported by code and offline tests

- New W2B files are isolated under `wallet-thirdweb/w2b-offline/**`. No existing W2A route, provider initialization, feature flag, dependency manifest/lockfile, backend, database, wallet ownership, chain contract or rewards code changed.
- The accepted W2A hard lock remains `OFFLINE_REVIEW_ONLY`. Mock controller snapshots always report `sdkLoaded=false`, `walletEnrollmentExecuted=false`, `rhcIdentityVerified=false`, `backendLinkVerified=false`, `signingEnabled=false` and `transactionsEnabled=false`.
- No real SDK factory, token issuer, provider JWT, challenge, RPC, wallet connection, wallet enrollment, signing, gas sponsorship, token or financial action is implemented or invoked.
- Offline tests gate ineligible sessions, missing consent, fake/expired tickets, wrong chain/project/origin, disallowed wallet mode, missing/mock billing readiness, spoofed client-side grants and unresolved provider failures.
- Generation-fenced connect/disconnect, cancellation and timeouts discard stale responses; late-result cleanup is per-*fixture handle*. React UI hides prior-customer mock wallet address before effect callbacks.
- Unit/browser fixtures run with non-loopback socket guard; Chromium contexts are offline, service workers blocked, and external URL requests denied. This is observed coverage, not proof against malicious runtime injection.

## PARTIAL / RESIDUAL DESIGN RISKS

| ID | Risk | Treatment before any live change | Owner |
|---|---|---|---|
| S01 | The injected `MockOnlyWalletDriver` is a TypeScript/mock interface, not a hardened real-provider trust boundary; untrusted caller could supply a side-effecting object. | Keep the entire module **unmounted, offline and test-only**. A real adapter must get separate audit, trusted runtime bridge, feature gate and allowed action list. | Boss Allen |
| S02 | `releaseFixture(handleId)` is a synthetic per-handle contract. Thirdweb's real `wallet.disconnect()` may affect a provider-global session. | Re-design owned provider instance/cleanup separately; never substitute real SDK disconnect for this fake operation without scoped authorization. | Boss Allen |
| S03 | Valid-looking synthetic RHC UUID and `fixtureSubject` may be present in the in-memory test fixture; no real Supabase Auth is checked. | Keep `rhcIdentityVerified=false`; no RHC authority until Boss Gal's signed server contract. Future subject must be stable/opaque, not raw RHC UUID in provider payload. | Boss Gal + Allen |
| S04 | The mocked `linked` observation is deliberately unauthoritative but could be misread if reused as a real UI. | Keep explicit "synthetic only" labels, `backendLinkVerified=false`. Production link must be server-derived W3 result; consider disallowing `linked` mock outside test harness. | Both |
| S05 | Mock chain `43210` / loopback origin `43102` / test Client ID are fixtures, **not approved real network/provider configuration**. | Get management-approved chain, domain, provider ID, JWKS origins and test spend. | Allen/security |
| S06 | Thirdweb custom JWT and JWKS issuer/subject/audience/rotation still unapproved. | Dedicate short-lived provider identity token or alternative signed design, public key-only JWKS, verified remote compatibility; never reuse Supabase JWT blindly. | Boss Gal |
| S07 | Allen's standalone backend is not API-accepted; retained lock/worker and CORS mismatch are unresolved in latest known handoff. | Backend owner authorizes bounded recovery and connected Auth/API/Redis readback; no workaround via broad localhost CORS. | Boss Gal |
| S08 | Thirdweb billing/service health, recovery and method restrictions unverified. | Provider owner validates non-secret project readiness, account recovery and explicit method allowlist before live enrollment. | Allen/billing |
| S09 | The unit driver can be made to return fixture addresses without actual cryptographic possession. | Never treat mock connect as wallet proof or as permission to call business functions. W3 needs server nonce and signature validation. | Boss Gal |
| S10 | Browser fixture coverage includes keyboard, reduced motion and responsive widths but does not certify WCAG 2.2 AA. | Full application accessibility/UAT under separately approved connected workstream. | Allen |
| S11 | Offline Next production build does not exercise this unmounted W2B mock UI as a product route. | Keep unmounted; future runtime integration requires exact release authorization and test/QA in approved route. | Allen |
| S12 | Shared Git-ignored `node_modules` junction uses installed W1 dependencies locally, not an independently installed CI runtime. | Future CI should install pin/lockfile in its own isolated environment before release. | Allen/CI |

## Critical go/no-go findings

**Connected W2B: NO-GO** until the 20 open decisions in the readiness pack are answered and backend/service/chain prerequisites validated. **W3 linked wallets: NO-GO** because server challenge/proof and persistence are absent. **Token/contract/production: OUT OF SCOPE**.

W2B-P1 candidate's automated tests can pass without allowing these activities. Human internal review is pending, and the broader Customer Wallet ClickUp parent task remains incomplete (fresh ClickUp status rate-limited at session start).

## Release-lock and source-preservation invariant

A user-supplied `NEXT_PUBLIC` setting, mock eligibility flag, fabricated provider ticket, mock address or browser locale cannot lift the existing `W2A_RELEASE_LOCK`. All new mock code remains unmounted. No production route imports `w2b-offline/**`. This is not permission to add one.

No private .env, provider secret, wallet key, user JWT, real customer data, Docker/private backend state or real chain address was inspected or changed.

## Later exit criteria

Review every matrix case as PASS/FAIL/BLOCKED/NOT RUN from its actual test evidence. Record exact branch, tests/build logs and source hashes. A candidate is **TESTING** until Boss Allen explicitly accepts the offline scope; W2B connected and W3 require separate approvals.
