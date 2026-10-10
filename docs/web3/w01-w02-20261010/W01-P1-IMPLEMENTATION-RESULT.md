# RHC Web3 — W01-P1 Offline Read-Adapter Verification

**Date:** October 10, 2026 (Philippines)  
**Owner:** Boss Allen, wallet/Web3 read-only frontend  
**Actual execution:** Direct ChatGPT GPT-6 / Remote Desktop Commander on `DESKTOP-5TQ68F9`; no Zed or Codex agent launched  
**Approved task:** NEW isolated W01-P1 branch/worktree, **new offline tests and documentation only**, maximum 90 minutes  
**Disposition:** TESTING — offline verification executed; human acceptance pending; two release requirements remain unmet.

## Verified repository scope

- New branch: `allen/w01-w02-readonly-offline-20261010`.
- New worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w01-w02-readonly-20261010`.
- Exact accepted base/HEAD: `aeff8976f993a75d584d4e7a6b61b008b94ad02a`.
- Base tree: `40d9b7dd0c3c2b4834dc0a6cd3c6cf93abb0c9d1`.
- Protected W1: `d951c91800f00d31a4ec4bd7b4da14e8a266e01d`.
- Protected W2A: `dcf2a81aa5158f2e56141dac8a2ebe60d7fd236b`.
- Protected W2B-P1: accepted base `aeff8976f993a75d584d4e7a6b61b008b94ad02a`.

## Exactly what was implemented

**Two NEW test files only**, within the approved allowlist:

1. `packages/web3/test/w01-readonly-boundary.cjs` — 20 isolated Node 22 test cases using the actual unchanged reader/config/transport TypeScript source, synthetic approvals, injected HTTP response mocks, socket guard and code/source checks; no provider request
2. `apps/customer-web/tests/w01-readonly-browser.cjs` — 11 Chromium checks rendering the real unchanged `Web3ReadPanel` with external disposable, synthetic fixture files; Chromium offline, external requests denied, service workers blocked

New handoff documents and test matrix live only under `docs/web3/w01-w02-20261010/**`. Logs and browser fixtures live outside Git at:

`C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w01-p1-offline-20261010T014521Z`

A disposable compiled `sdk-snapshot.bundle.cjs` and read-only copied inherited tests are only in that external evidence folder. They were generated from the **current new worktree's source** and accepted base; no protected prior test/log file was rewritten.

## What the reader actually proves

The existing `@rhc/web3` implementation supports guarded, testnet-only, **server-side contract-wide metadata** reads: name, symbol, decimals, totalSupply, optionally cap/paused, and block provenance. `APPROVED_TESTNETS` remains empty. Source denies mainnet and unapproved chain/address, uses server-only API credentials, permits only four JSON-RPC read methods, and exposes no signing.

The Web3 UI distinguishes synthetic versus testnet, absent/stale/partial, unsupported/unavailable and exact zero token supply without pretending it is official RHC token circulation. Authorization to access an actual testnet, or evidence of a real contract, **was not supplied or executed**.

## Critical gaps exposed by verification

- **OFF-16 — FAIL:** An old server snapshot marked `fresh` stays visually `fresh (at last response)` when the browser tab has been idle; the page warns that freshness is not automatically rechecked. The strict requirement to reclassify an elapsed observation as stale without a manual reload is not implemented. Do not call this a newly discovered live-data failure; it is a reproducible offline UI limitation.
- **OFF-25 — FAIL (full requirement):** Chain ID/address and code hash/reference conditions are exercised, and UI says testnet/not official, but there is no signed expected `name`/`symbol`/`decimals` token identity in `ReadConfig`; the reader cannot flag every metadata drift against a governing official RHC contract specification. Management/issuer must select the actual source first.
- Customer `balanceOf` and transfer/transaction history are **not implemented** in `Web3ReadResult`, by design; OFF-26 PASS means this absence was explicitly verified/reported, not that balances/history exist.
- RHC Points remain separate centralized accounting; no crypto conversion is supported or implied.

## Safety invariants

No code from `packages/web3/src/**`, `packages/types/src/**`, `packages/ui/src/**`, routes, API, admin app, `contracts/**`, package/lockfiles, `.env` or Boss Gal's workstream was changed. No live Thirdweb/RPC/provider call, wallet enrollment, auth token, signing, transaction, deployment or testnet CLI invocation. No Git add/commit/push/merge or release activation.

## Human stopping point

Boss Allen must review `W01-P1-VALIDATION.md`, `W01-P1-SECURITY-ISSUES.md`, `W01-P1-TEST-MATRIX.json` and the sealed handoff before accepting the **offline verification scope**. Fixes to OFF-16 or OFF-25 require **new exact-file authorization**, and W01-P2 connected verification requires separate chain/contract/provider/operations approval. Nothing in this report completes the November 10 public contract obligation.
