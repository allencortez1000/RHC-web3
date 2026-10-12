# W01 / OFF-16 — Implementation Review and Evidence-Only Finalization

**Review date:** 2026-10-12 (Philippines).  
**Owner:** Boss Allen, frontend / Thirdweb read-only.  
**Disposition:** Existing correction reviewed. **OFF-16 implementation has passing offline evidence; human acceptance is pending.**  
**Review operation:** Evidence-only CONTINUE via ChatGPT GPT-6 and Remote Desktop Commander. The requested High reasoning setting is a user-specified preference; no separate agent/model setting or thread was changed. No source code was changed in this finalization.

## Protected source identity

- Authorized device: `DESKTOP-5TQ68F9` only.
- Project/root: `C:/Users/admin/Desktop/RHBC project`.
- Worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w01-off16-20261010`.
- Current branch: `allen/w01-off16-freshness-offline-20261010`.
- Exact base commit: `7b142c726520373a28932d57acd600aedabca62c`.
- Base tree: `1f87b973629c0ebbc7e901b854b59621647c961c`.
- Original protected W01-P1 partial acceptance: **26/28**; OFF-16 and OFF-25 were FAIL at that checkpoint. Correction here does not retroactively change the committed W01-P1 test matrix.

## Existing corrected implementation — reviewed, not recreated

1. **MODIFIED** `packages/ui/src/web3-read-panel.tsx` — adds an exclusively browser-side React hook that conservatively reclassifies an already received Thirdweb testnet `fresh` or `partial` observation to `stale`. It compares the received `lastSuccessAt` time with a one-second upper freshness window, retains the expired decision across backward clock changes for the same response identity, and reevaluates on a 250-ms timer, focus, and visibility change. The UI explicitly labels the browser classification as distinct from server/provider status.
2. **MODIFIED** `scripts/web3-browser-test.mjs` — updates the inherited elapsed-time/return-to-tab expectations, requiring locally degraded/stale labels and no new API/provider calls.
3. **NEW, untracked** `apps/customer-web/tests/w01-off16-freshness.browser.cjs` — 15 offline Chromium tests of the actual read-only panel (initial old observation, idle expiration, focus/visibility resume, rollback, new response, missing/invalid time, absent data, partial data, disabled/synthetic behavior, response labels, accessible status, responsive/reduced motion and bundle boundary).

The actual diff remains narrow: **two existing tracked modifications plus one new test**. No new production route, token contract, provider credential, backend change or new runtime dependency has been observed. The W1/W2A/W2B/W01 baselines are clean.

## Functionality boundary

- Corrected browser freshness is **display-only**, not an RPC request, independent chain finality check, chain/source verification or change to the server's `Web3ReadResult`.
- The one-second freshness bound is intentionally conservative because the server's exact TTL is not supplied to the browser. It can downgrade good observations sooner than a longer server cache TTL, which is a known UX tradeoff rather than proof of a provider failure.
- The UI continues to present historical token values as old observations; it does not invent current balances, token transactions or official RHC token provenance.
- **OFF-25 remains FAIL:** an approved issuer-signed name/symbol/decimals/chain/address specification is still absent. Do not call any generic token an official RHC asset from this evidence.

## This finalization's boundaries

Existing source and test file bytes were hashed and checked against V6 validation timestamps. This finalization creates only five new files in `docs/web3/w01-off16-20261010/` and separate checksum/audit artifacts under `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w01-off16-evidence-final-20261012`. No application source or test correction was attempted. No Git stage/commit/push/merge, production or connected environment operation was authorized.

**STOP for Boss Allen's review. OFF-16 must not be marked DONE solely from offline tests.**
