# RHC W2A — Protected Workstream and Preservation

**Preliminary expected final state:** Final `handoff-manifest.json` contains the SHA-256 audited file list and final preservation result. No Git commit, stage, push or merge is authorized in W2A.

## Protected owners and workspaces
- Owner: Boss Allen, `DESKTOP-5TQ68F9`.
- New isolated branch: `allen/w2a-thirdweb-wallet`, base and current HEAD `d951c91800f00d31a4ec4bd7b4da14e8a266e01d`.
- New isolated worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009`.
- Accepted original W1 worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3` remains on `allen/frontend-web3-stabilization` at the accepted commit and clean.
- Boss Gal backend source, machine, database, Docker, Redis/SRH, authentication and migrations: NOT TOUCHED.
- Original RHC chain contracts/provider identity/trading: NOT TOUCHED.

## Changes allowed by W2A
- MODIFIED: `apps/customer-web/app/account/page.tsx`.
- MODIFIED: `apps/customer-web/package.json`.
- MODIFIED: `package-lock.json` (only customer workspace Thirdweb dependency).
- NEW: `apps/customer-web/app/components/wallet-thirdweb/{policy.ts,sdk-preparation.ts,ThirdwebWalletReadiness.tsx}`.
- NEW: `apps/customer-web/tests/w2a-thirdweb.{offline.cjs,browser.cjs}`.
- NEW handoff files: `docs/wallet/w2a-20261009/`.

Tracked build/distribution files were untouched; transient `packages/types/dist`, `packages/web3/dist` and `apps/customer-web/.next` are local, ignored outputs created solely for offline validation.

## Local dependency arrangement
A Git-ignored W2A `node_modules` Windows junction points to the previously installed dependencies of W1, in read-only use. No install/download occurred and no package state was changed in W1. This junction is a local development convenience and must not be committed or treated as a standalone reproducible install; future CI should perform ordinary pinned dependency installation.

## Final audit
The protected W1 branch has remained unchanged. W2A modifies only the three intended tracked files and adds the new Thirdweb frontend/test/documentation set. Git tracked diff passes `git diff --check`. The generated production Account chunk was checked for absence of live SDK client/wallet-factory and key markers. No unauthorized listener is expected on 3002, 3003, 43102 or 43103. Final hashes/listeners/source paths are recorded in the W2A manifest and external `preservation-final.json`.

## Remaining gates
No commit/push, PR, merge, deploy, live wallet connection, user or smart-wallet creation, signatures, token/crypto activity, real CORS/JWKS changes, or acceptance claim. **W2A review is pending Boss Allen's assessment and formal internal UAT.**
