# RHC W03-2C — Contract-Ready Offline Wallet Adapter

**Checkpoint date:** October 13, 2026 (PHT)
**Owner:** Boss Allen, wallet/Thirdweb workstream. Boss Gal remains independent backend owner.
**State:** LOCAL IMPLEMENTED / TESTED, **NOT approved as connected feature**.
**Agent:** NEW thread `RHC Allen W03-2C Contract-Ready Wallet`; ChatGPT GPT-6 direct tool execution. Requested thinking profile: High; actual runtime thinking selector not independently verified. No Zed/Codex thread was launched.
**Machine:** DESKTOP-5TQ68F9 (Boss Allen).
**Project root:** `C:/Users/admin/Desktop/RHBC project`
**Worktree:** `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-2c-contract-ready-offline-20261013`
**Branch:** `allen/w03-2c-contract-ready-offline-20261013`
**Exact base SHA:** `d0013612af6ce215dc0b07848819905e4c5164c9`
**Prior published branch:** `allen/w03-2b-wallet-react-offline-20261012`

## Implemented

Created isolated source under `apps/customer-web/app/components/wallet-thirdweb/w03-contract-ready-offline/`:

- `draft-contract.ts`: strict runtime decoder of the proposed **UNAPPROVED** `w03.proposal.v0.1` shape, exact `rhc_user_id` and source revision matching, null/zero/stale/coverage semantics, disabled capabilities, refusal of real token source/network/address and malformed/PII-bearing fields.
- `mock-contract.ts`: invented response producer for mock-only points/zero/stale/unlinked/simulated linked/empty states. No production data.
- `offline-adapter.ts`: only registered in-memory synthetic transport accepted, asynchronous request generation fencing, account A/B and session change invalidation, logout/permission/outage fail-closed treatment, hard-disabled `refuseConnectedBackend` path. No HTTP/RPC/Thirdweb SDK calls.
- `thirdweb-simulator.ts`: **pure simulated lifecycle**, no Thirdweb SDK import. Models disconnected, connecting, simulated connected, wrong-network, unavailable, late request rejection and clears on account switch/disconnect; never authorizes real wallet link, signing, transfers or blockchain transactions.
- `ContractReadyWalletLab.tsx`: isolated client React harness wired to the mock adapter and previously published read-only `OfflineWalletOverview`. Prevents old-scope value display during prop switching, no existing route mounts this component.
- `contract.test.mjs`: deterministic runtime validator/contract/controller/thirdweb-simulator/SSR tests. Browser preview generator and six synthetic HTML scenarios are source code/evidence only, not deployed Next.js routes.

## Validation summary

- New W03-2C tests: **95/95 PASS** after stricter ISO UTC timestamp validation.
- Inherited W03 model: **54/54 PASS**.
- Inherited W03-2B React SSR: **37/37 PASS**.
- Full Customer Web TypeScript: **PASS**; new-source ESLint: **PASS**.
- Offline Chrome QA: **235/235 PASS**, six preview scenarios × desktop/mobile/small-mobile, including axe scans with zero confirmed automated violations, no script/action elements, no external HTTP(S)/RPC/provider requests, and no horizontal overflow.
- A later repeat Chrome run after the UTC-validator hardening **stalled inside axe-core and was stopped**. That repeat is INCOMPLETE and is **not counted as another PASS**. The earlier 235/235 completed browser evidence is retained; the final decoder separately passed 95 tests, Customer Web TypeScript, and ESLint. A full post-change browser recheck remains a review recommendation.
- Automated accessibility is **not** a full WCAG 2.2 AA certification; browser QA tests static preview outputs, not hydrated connected customer flows.
- All prior 13 registered worktrees preserved at recorded HEADs/dirty-file counts. No existing tracked files edited; only new allowed source/docs.

## Not implemented

Real authenticated RHC data source, runtime connection to Supabase/Redis/DB, actual Thirdweb wallet/provider, EOA/EIP-1271 ownership proof, signing, transactions, token RPC/indexer, customer route mounting, approved points ledger projection, account UAT, public deployment and mainnet token release.

**STOP:** Await Boss Allen review before Git commit/non-force push. Joint backend contract BG-01..BG-12 remains PENDING. Token identity OFF-25 remains FAIL/BLOCKED. Original fifty W03 acceptance scenarios remain zero executed; W01 connected scenarios NOT RUN.
