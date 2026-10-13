# RHC W03-2D — Hydrated Offline Wallet QA

**Date:** October 13, 2026 (PHT)  
**Owner:** Boss Allen, wallet/Thirdweb workstream  
**Classification:** Offline test implementation; does **not** constitute approved connected wallet functionality.

## Worktree and source identity

- **Thread:** NEW — `RHC Allen W03-2D Hydrated Wallet QA`.
- **Executor:** ChatGPT GPT-6 with Remote Desktop Commander; no Zed/Codex thread was started, and the effective thinking configuration is not independently recorded.
- **Device:** `DESKTOP-5TQ68F9` (Boss Allen). Boss Gal's separate device and backend workstream were not modified.
- **Project root:** `C:/Users/admin/Desktop/RHBC project`.
- **Working branch:** `allen/w03-2d-hydrated-wallet-qa-20261013`.
- **Dedicated worktree:** `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-2d-hydrated-qa-20261013`.
- **Verified base commit:** `a5bb6d3163695d9158d9b6ac7bdec2f63c915cfd` (W03-2C published/preview-build-verified).

## Implementation

New sources only in `apps/customer-web/app/components/wallet-thirdweb/w03-2d-hydrated-qa/`:

- `hydrated-probe.tsx`: isolated interactive React QA harness using the W03-2C *in-memory synthetic transport*. Test-only buttons simulate account A/B, session refresh, errors 401/403/429/503, wrong-customer responses, invalid token provenance, disabled backend mode, and pure mock wallet connection/network/disconnect lifecycle.
- `build-harness.mjs`: bundled test-only browser entry using installed local esbuild. Outputs HTML/JS only into external QA evidence, never a Next.js route or committed runtime asset. Rejects imports from backend/database/actual Thirdweb and Supabase packages.
- `hydrated-browser-qa.cjs`: self-contained Playwright Chrome regression runner usable from this branch on Boss Allen's machine with installed locked dependencies; exercises **real React hydration and state updates**, not merely static SSR.
- `README.md`: exact local reproduction, allowed scope and security limitations.

The generated `app.js` and `index.html` are only in the external `...-evidence/w03-2d-hydrated-qa-20261013/interactive-preview/` directory. They do not appear in the Git diff and are never mounted into the authenticated product.

## Completed validation

- **Hydrated Chrome tests:** **58/58 PASS**, across account A/B, late A response, session replacement, synthetic denied/conflict/outage, disabled connected mode, fake wallet lifecycle, desktop/mobile/narrow layout, tap target sizes, one bounded automated axe check, and zero outside network requests/errors.
- **Reproduced browser suite directly from new tracked test source:** **58/58 PASS**, separate output under `repro-run/`.
- **Inherited W03-2C adapter/lifecycle tests:** 95/95 PASS.
- **Inherited W03-2B React tests:** 37/37 PASS.
- **Inherited W03 model tests:** 54/54 PASS.
- **Full Customer Web TypeScript check:** PASS.
- **New-source ESLint:** PASS.
- **Bundle input graph review:** rejected actual backend/DB, Supabase, Thirdweb dependencies; React bundled locally.
- **Protected worktrees:** 14 baseline worktrees inventoried at their preflight SHA/status state; final integrity check required before publication.

The first hydrated browser run **failed 2/57** solely because an inline axe script was blocked by the HTML CSP. That first run and logs were preserved. The QA test was corrected to use a *separate CSP-bypassed audit context*, without weakening the application's CSP. The subsequent and reproducible runs passed.

## Still NOT DONE

No live Auth, RHC API, Thirdweb SDK provider connection, EOA/EIP-1271 link proof, token balance, transaction history, on-chain RPC, wallet signature, transaction submission, real customer/tenant authorization, production deployment, or authenticated connected acceptance was performed.

**BG-01–BG-12 remain pending joint agreement. OFF-25 official token identity is FAIL/BLOCKED. Original 50 W03 acceptance scenarios remain zero executed, and W01 connected provider cases remain NOT RUN.** Do not convert these offline test cases into accepted project completion.

**STOP:** Review the test-only checkpoint; bounded GitHub publication requires preflight evidence and must never merge, activate live data, or deploy to production.
