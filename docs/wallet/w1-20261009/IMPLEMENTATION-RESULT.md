# W1 — Implementation result

**Verdict:** Isolated offline lifecycle candidate implemented and validated; no live wallet or embedded-wallet capability is accepted.

## New application files (all Allen-owned and previously absent)

- `apps/customer-web/app/components/wallet-foundation/types.ts`: typed RHC session, policy, lifecycle, synthetic link and snapshot boundaries.
- `apps/customer-web/app/components/wallet-foundation/controller.ts`: isolated dependency-injected synthetic adapter with fail-closed authorization gates, connection/disconnection, cancellation/timeouts, revision-scoped invalidation, late-result cleanup and disposal.
- `apps/customer-web/app/components/wallet-foundation/WalletFoundation.tsx`: accessible client-only, strictly labeled synthetic preview component, scope-safe renders, keyboard actions, focus restoration and reduced-motion-compatible layout.
- `apps/customer-web/tests/wallet-foundation.unit.mjs`: 24 Node22 offline unit cases.
- `apps/customer-web/tests/wallet-foundation.browser.cjs`: seven isolated Playwright/Chromium cases; loads file:// fixture bundle outside normal application, with all network requests denied and offline mode enabled.

## Implemented lifecycle safeguards

- Disabled, absent, denied and unsupported-chain cases execute zero synthetic adapter calls.
- Connected synthetic address does not change RHC authentication, permissions, Digital ID, property relationships, backend link or rewards.
- Connect, cancel, timeout, error, retry, disconnect and disconnect failure are handled without inventing a successful backend link.
- Stale completion after logout, account switch, policy or chain change, cancellation and disposal is discarded and cleaned up by exact synthetic handle ID.
- A stale previous handle cleanup never closes the new handle in the test-double contract.
- Context fingerprints prevent rendering a previous account's address before the React effect updates its controller.
- Controller has no fetch, Thirdweb SDK import, signing, on-chain call or localStorage persistence. The 'linked' observation is **synthetic only**, with `backendLinkVerified` always false.

## Boundaries and explicit limitations

- The thirdweb@5.121.6 dependency already existed but is **not called by W1**. No embedded-wallet login, real Thirdweb wallet, real provider session or wallet ownership signature is implemented.
- No new app route or UI activation. `/wallet` remains its existing redirect.
- No backend wallet-link endpoint/model exists in the portable handoff; ownership proof must be engineered by Boss Gal and Allen jointly.
- No contract address/deployment evidence or public token enablement inferred. Thirdweb project token list was empty at the last inspected dashboard session.
- No transaction signing, token or points transfers, gas sponsorship, custodial private key, mainnet/testnet access, DB migrations or hosted work.
- React/browser checks are limited to a guarded local synthetic harness; no live connected or human UAT certification.
- If future real adapters use a provider-wide disconnect, they MUST NOT be substituted for the unique-handle-only synthetic `releaseOwned` contract without a separate security/lifecycle design.
- Failed cleanup is fail-closed for the displayed address; later real-provider reconciliation and recovery require separate approved design.

## Next stage

Obtain human review of this candidate and Boss Gal's versioned backend wallet ownership/linking contract. Implement future live Thirdweb adapter only on a separately approved chain/provider, public configuration, authentication/JWKS architecture and billing arrangement, with fresh connected acceptance. Do not modify the locked token deployment gates without an approved scope decision.

## Technical-review correction — 2026-10-09

A new failing unit test (`W1-25`) proved that a release timeout previously reported `DISCONNECT_FAILED`. The synthetic controller now distinguishes `DISCONNECT_TIMEOUT` from actual adapter rejection; late completion cannot restore wallet-address visibility. Verified green with all 25 W1 unit and seven isolated browser tests. See `ACCEPTANCE-REVIEW.md`. The original read-only and no-production-activation boundaries remain intact.
