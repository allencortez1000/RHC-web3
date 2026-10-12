# W03 — Proposed Critical Path and Bounded Follow-On Work

**Owner:** Boss Allen. **Date:** 12 October 2026. **Status:** Future PLAN ONLY, no implementation authorization beyond source review and documentation.

## Priority and dependencies

| Gate | Responsibility | Outcome/acceptance | Earliest proposed checkpoint |
|---|---|---|---|
| W03-0 Source/contract inventory | Boss Allen / ChatGPT | Read-only evidence, DTO and offline matrix, hashes/preservation | **This review** |
| W03-1 Backend/API schema approval | Boss Gal + Allen | Agreed RHC JWT identity, linking/proof owner, read-only overview/history DTO, account scopes | Oct 13–16, **pending response** |
| W03-2 Synthetic offline view tests | Allen **after new authorization** | Render source-labeled points/token panels and account switch/empty/stale/zero/error cases; no real wallet/provider | After W03-1 |
| W03-3 Backend implemented contract | Boss Gal **after his approval** | Backend server-side authorization, ledger projections, signed challenge only if specifically authorized | Separate scope |
| W03-4 Connected RHC browser QA | Both + tester | Real connected authenticated A/B, role/tenant/caches, code reviewed and accepted | Separate environment authorization |
| W01-P2 Connected token reads | Allen + security/issuer | Exact authorized nonproduction chain/contract/provider, budget and bounded tests CON-01..08 | Blocked pending token OFF-25 and network approvals |
| W02 restricted ERC-20 | Issuer/security/Allen | Source, direct restriction tests, corporate custody, independent review and token release GO | Not authorized; do not combine into W03 |

## Practical sequence for fastest safe progress

1. Hand Boss Gal `02-PROPOSED-DATA-API-CONTRACT.md` and `04-BOSS-GAL-DECISION-REQUEST.md`. Ask for versioned response, not backend changes on Allen's machine.
2. Ask CEO/issuer for official token metadata/chain/address/source/roles and Thirdweb billing/test-budget confirmation in parallel. **OFF-25 remains blocked** regardless of synthetic comparator tests.
3. Once the shared contract is accepted, grant Allen a **new scoped offline frontend implementation task**, allowing only exact UI/test paths. Start with points view-only and unlinked/unknown token presentation; do not mount provider or add wallet enrolment without full approval.
4. Allow Boss Gal separately to design/implement backend wallet proof/link/read DTO and points projection, tested under his own source, branch and QA gates.
5. Run **negative cross-account/role/zero-vs-unknown/cursor isolation tests first** before any live provider calls. Independent UAT signatory and privacy review needed.
6. After approved connected environment, run minimal account journey and genuinely sourced read-only balances/history, or clearly report what remains unsupported.
7. Release gates: **APP GO/NO-GO** and **TOKEN GO/NO-GO are separate**. No Mainnet or public claims without chain contract source, legal/security/issuer sign-off and an independent explorer/bytecode verification receipt.

## Planned handoff requirements for future Zed/Codex implementation

- **NEW** agent thread recommended: `RHC Allen W03 Wallet View Offline UI`; use GPT-6 High if available (actual model/effort must be recorded, not assumed).
- **Root:** `C:/Users/admin/Desktop/RHBC project`.
- **Branch/worktree:** MUST be newly named, isolated, and based on the exact then-current *reviewed* W03/Allen GitHub commit, not a guessed future SHA. Current contract-review W03 branch is not yet published.
- **Allowed paths:** only frontend read-only wallet view and offline tests, with an explicit separately signed path allowlist.
- **Forbidden:** Boss Gal API/DB/auth/points implementation, env, secret, real provider, network, signing, token deployment, Go-live, Git commit/push/merge without separate approval.
- **Required tests:** table in `05-W03-OFFLINE-ACCEPTANCE-MATRIX.json`, lint/typecheck/isolated browser negative states, existing W1/W2A/W2B/W01/OFF16/OFF25 regressions.
- **Handoff:** new `IMPLEMENTATION-RESULT`, `VALIDATION`, `SECURITY-ISSUES`, `PRESERVATION`, test ledger and SHA-256 manifest.
- **STOP:** human review before publication or integration.

## Current acceptance

W03 **documentation source verification only**. Original wallet task remains **TESTING**, linked properties task **TESTING**, rewards balance/history **IN PROGRESS**, token-contract integration **BACKLOG** according to ClickUp on October 12. No new progress percentage inferred. Future test cases all remain **NOT RUN**, and the proposal's customer token balance/history obligations remain unaccepted.
