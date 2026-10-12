# W03 — Wallet Balance/History & Backend Integration Contract Review

**Owner:** Boss Allen (wallet, Thirdweb, wallet-side UX/reads). **Backend counterpart:** Boss Gal (RHC Auth, API, DB, points ledger, wallet-link verification).  
**Status:** DOCUMENTATION / DESIGN REVIEW ONLY — not implemented, not tested as connected functionality, and not DONE.  
**Date:** October 12, 2026 (Asia/Manila). **Release target:** conditional November 10 initial pilot.

## Run boundary and agent handoff

- Agent/thread: **NEW** bounded task-owned workstream — `RHC Allen W03 Offline Wallet Contract Review`, executed directly by ChatGPT GPT-6 through Remote Desktop Commander (no separate Zed/Codex agent process was started). High thinking effort was requested; this is not an independently verifiable runtime selector.
- Device: `DESKTOP-5TQ68F9` **only**; never touch Boss Gal's `DESKTOP-F5ADSD0`.
- Project root: `C:/Users/admin/Desktop/RHBC project`.
- New branch: `allen/w03-wallet-contract-offline-20261012`.
- Isolated new worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-20261012`.
- Exact approved base: `72f1d68d87a4f0779c028813eb495f6c138cae2c`; base tree `01459fbb113e14b2c23536c6f24bdd157dcea3f7`.
- Allowed new writes: `docs/wallet/w03-contract-20261012/**` and the unique external task evidence directory only.
- Absolutely prohibited: modifying existing production/types/API/auth/wallet/contract config files, provider/RPC access, wallet connect/enroll, signing, transactions, contract deployment, migrations, Docker, Git commit/push/merge, or touching protected worktrees.
- Required verification: exact source/commit identities, SHA-256 of inspected tracked paths, static source boundary checks, a **future** offline acceptance matrix marked NOT RUN, five/six protected worktrees checked before and after, checksummed documentation handoff, then **STOP for Boss Allen approval**.

## Existing accepted vs incomplete work

W1, W2A and W2B-P1 have prior bounded offline acceptance/preservation. W01-P1 was accepted **partially**; OFF-16 freshness was later separately accepted and published offline. OFF-25 synthetic comparator prep was accepted and published offline at the base commit above, but **official OFF-25 acceptance remains FAIL** for lack of an issuer-approved token specification. **CON-01–CON-08 connected tests remain NOT RUN**.

Current ClickUp at review: Wallet/Account Interface **TESTING** (`14yr2e4vkbf`); Property/Services to Wallet **TESTING** (`14yr2e4vkbg`); Rewards Balance/History **IN PROGRESS** (`14yr2e4vkbj`); Wallet–Token Contract Integration **BACKLOG** (`14yr2e4vkby`). No task status or weighted progress is updated by W03.

## Deliverable map

Start with `01-AS-IS-GAPS.md`, `02-PROPOSED-DATA-API-CONTRACT.md`, `03-IDENTITY-AND-STATE-RULES.md`, `04-BOSS-GAL-DECISION-REQUEST.md`, `05-OFFLINE-ACCEPTANCE-MATRIX.json`, `06-IMPLEMENTATION-AND-RELEASE-GATES.md`, `07-SECURITY-AND-SCOPE-ISSUES.md`, `08-SOURCE-AND-PRESERVATION.md`, and the immutable `handoff-manifest.json`.

**No endpoint, transaction, customer wallet balance/history, issuer contract or test in the proposed contract is represented as already working.**
