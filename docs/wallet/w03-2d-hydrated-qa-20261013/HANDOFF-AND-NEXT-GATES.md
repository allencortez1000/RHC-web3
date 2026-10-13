# W03-2D — Handoff and next approval gates

**Agent handoff format**

- **Thread:** NEW — `RHC Allen W03-2D Hydrated Wallet QA`; GPT-6, High requested in the planning context (runtime selector not independently verified).
- **Project/root:** `C:/Users/admin/Desktop/RHBC project`.
- **Branch:** `allen/w03-2d-hydrated-wallet-qa-20261013`.
- **Worktree:** `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-2d-hydrated-qa-20261013`.
- **Exact base SHA:** `a5bb6d3163695d9158d9b6ac7bdec2f63c915cfd`.
- **Allowed:** new W03-2D test entry, local build/test scripts, README, new W03-2D review docs and task-owned external QA logs/screenshots/manifest.
- **Prohibited:** Boss Gal backend, Auth, DB, Prisma, API or rewards code; all existing customer routes, live Thirdweb/RPC/provider calls, JWT and real customer records, wallet linking/signatures, transactions, mainnet, force pushes, merges and production deployment.
- **Required checks:** exact allowlist/hash/preservation, 58 hydrated browser assertions (two completed runs), inherited 95/37/54 offline regressions, full Customer TypeScript, ESLint, empty external network request log, source bundle import graph.
- **Handoff files:** implementation, security review, this stop/next-gates doc, validation ledger, SHA-256 manifest and external closure seal.
- **Stop:** No live integration or production release; coordinate shared contract and connected testing first.

## What happens after W03-2D?

1. **Boss Allen** reviews W03-2D as *test-only* browser QA and approves or requests changes to its bounded source branch.
2. **Boss Gal + Boss Allen** review the `BG-01..BG-12` decision request, document accepted `w03.v1` DTO, JWT `users.id`/tenant authority, wallet-link proof owner, negative security cases and exact backend commit/test environment.
3. **Boss Gal** implements authorized backend wallet overview and centralized read-only RHC Points from his own worktree; he remains owner of business/data/security rules.
4. **Boss Allen** only then connects an approved frontend **read-only** adapter in a new worktree/branch and performs connected customer A/B, role, logout, expiry, stale/zero, outage and permissions QA.
5. Any actual Thirdweb/RPC/contract token read, wallet linking, signature or on-chain action remains separate and gated by network/issuer/security/business approvals. OFF-25 is still **FAIL/BLOCKED**.
6. Internal reviewer accepts TESTING→DONE only after implementation, review, testing and written acceptance; do not infer milestone progress from code, merges or Vercel READY.

No backend contract has been accepted through ClickUp at the start of this checkpoint; the existing wallet task remains TESTING, and the public token-contract integration task remains gated BACKLOG.

**Next stopping point:** W03-2D bounded publication/review after test-seal verification; no PR merge or production release.
