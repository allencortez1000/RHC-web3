# W01 / OFF-16 — Validated Evidence and Test Limitations

**Finalization review:** 2026-10-12. **Last executed offline suite:** 2026-10-10.  
**Source:** `allen/w01-off16-freshness-offline-20261010` at base `7b142c726520373a28932d57acd600aedabca62c`.  
**Current decision:** **OFF-16 offline correction test evidence PASS; human acceptance pending. OFF-25 remains FAIL.**

## Authoritative preserved historical V6 ledger

- Original sealed ledger: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w01-off16-correction-20261010/FINAL-REGRESSION-LEDGER-V6.json`.
- SHA-256: `f84edbf7810a177389cf11ac5f83847a0391efa6dabaea8fca6c90fd1f3d9c8a`.
- V6 recorded at **2026-10-10T08:23:57.237Z**; all **11 recorded stages exited 0**: two TypeScript package builds and nine unit/browser test stages.
- **247 test-runner reported entries PASS** across nine test stages, zero reported failures/skips in those stages. Includes parent/nested reported entries; this is NOT 247 unique independent business acceptance scenarios.
- **15/15 new OFF-16 actual-panel Chromium tests PASS**; 20 prior W01 unit entries PASS; 10 selected prior W01 browser entries PASS; 46 Web3 core; 18 intercepted Web3 SDK; 25 W1; 15 selected W2A; 48 W2B; 50 existing Web3 browser entries PASS.
- The previous W01-P1 **negative** OFF-16 browser case was deliberately excluded from the inherited browser rerun, and replaced by the 15 dedicated positive correction checks. One inherited W2A version-check case was also filtered in a re-based fixture. Neither filtered case should be claimed to have passed in V6.
- V6 reports `realRpcCalls=0`, `walletActions=0`, `signatures=0`, `backendChanges=0`, `commit=false`, `push=false`.
- Every V6 stage's existing log SHA-256 was independently checked and matched on October 12.

## Preserved static validation

- Sealed `STATIC-LEDGER.json` SHA-256 `783e12a6bf63d92e460257df72b6247f9be86b58ac4b67025d0bbb076f9678ba`, recorded 2026-10-10T08:08:07.622Z.
- Four checks PASS: new JS syntax, shared UI TypeScript typecheck, Customer Web TypeScript typecheck, and scoped ESLint. Each existing log's SHA-256 matched.
- The three corrected source/test files were last modified **before** the V6 execution time; current byte hashes are included in `handoff-manifest.json`.
- **No tests were re-executed on October 12**; today's action is reproducible evidence verification and custody sealing, not a fresh runtime test.

## Acceptance and connected boundary

| Gate | Result | Interpretation |
|---|---|---|
| OFF-16 — browser elapsed-time freshness correction | **OFFLINE TEST PASS / HUMAN ACCEPTANCE PENDING** | Existing corrected UI and 15 positive tests; full connected behavior not proved |
| OFF-25 — compare observed token identity with signed official specification | **FAIL / NOT CORRECTED** | Issuer/network/contract/name/symbol/decimals source not approved |
| Inherited OFF-01–OFF-28 baseline | **Original W01-P1 matrix remains 26 PASS / 2 FAIL** | Do not rewrite the historical signed/handoff matrix |
| Connected W01 CON-01..CON-08 | **BLOCKED / NOT RUN** | No live Thirdweb, RPC, hosted auth or contract verification |
| Full connected Customer/Admin browser E2E | **NOT RUN** | Offline synthetic Chromium is not internal UAT |
| Deployment/security/regulatory signoff | **NOT RUN / NOT APPROVED** | No production readiness claim |

The external `TEST-LOG-VERIFICATION.json` and final checksum seal document actual log identities and reverified hashes without modifying historical logs.
