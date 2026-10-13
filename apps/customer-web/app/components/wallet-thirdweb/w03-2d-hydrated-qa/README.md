# W03-2D — Hydrated synthetic wallet QA

This directory is an **unmounted, browser-only test harness** for verifying W03-2C's client-side React state transitions. It contains no connected RHC backend, user credentials, real Thirdweb provider or blockchain operations.

## Ownership and baseline

- Owner: Boss Allen, wallet/Thirdweb frontend.
- Base commit: `a5bb6d3163695d9158d9b6ac7bdec2f63c915cfd`.
- Branch: `allen/w03-2d-hydrated-wallet-qa-20261013`.
- Neither Boss Gal's backend nor any existing Next.js application route is modified.

## Reproduction on Boss Allen's Windows QA machine

The checkout must have the repository's locked dependencies installed. During this checkpoint only, the isolated worktree uses an ignored `node_modules` junction to an already-installed matching-lockfile diagnostic worktree.

1. From the repository root, execute:
   `node apps/customer-web/app/components/wallet-thirdweb/w03-2d-hydrated-qa/build-harness.mjs`
2. Open the generated local-only HTML file under external evidence:
   `../RHC-web3-allen-wallet-w2a-20261009-evidence/w03-2d-hydrated-qa-20261013/interactive-preview/index.html`
3. Run the test runner on Boss Allen's QA machine:
   `node apps/customer-web/app/components/wallet-thirdweb/w03-2d-hydrated-qa/hydrated-browser-qa.cjs`

Build and test scripts intentionally refuse to overwrite existing evidence. For another run, use a separately approved clean test-evidence location and preserve the previous files first. The run uses an installed local Chrome binary and Playwright, with network offline and all HTTP(S) requests aborted.

**Important:** The QA buttons are for synthetic fixture inspection only; they are not real wallet buttons or customer-facing features. The generated JS bundle (about 1.3 MB) is external test evidence and is not committed. The browser audit uses a separate CSP-bypassed test context solely to inject axe-core. All functional tests retain the strict preview CSP, and no production CSP or app route is modified.

## Acceptance boundary

- What the completed suite proves: hydration, mock account switching, late promise rejection, state clearing on 401/403/429/503 and bad DTOs, simulated provider lifecycle, small-screen layout and a bounded automated axe scan.
- What it does not prove: a real Supabase/JWT session, connected RHC account permissions, tenant isolation, actual Thirdweb SDK, live blockchain RPC, signature verification, wallet linking, wallet transfers, manual WCAG 2.2 AA acceptance, or the original 50 W03 acceptance scenarios.

BG-01 through BG-12 and OFF-25 remain gating decisions. Never use invented Points balances as a fallback from an unavailable real API. Never mark full customer wallet functionality DONE based on this test.
