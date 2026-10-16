# RHC W03 Task 14 — Thirdweb provider-mode consistency and QA status

**16 October 2026 | Boss Allen wallet-side security hardening | LOCAL ONLY / REVIEW & ACCEPTANCE PENDING**

## 1. Observed wallet-side issue

The W03-3P server already restricts the development-only Thirdweb QA page to an explicit `embedded-email`, `external-metamask`, or `both` mode, plus a separately approved local testnet gate. But the provider display helper previously checked only a valid wallet ID/address and Thirdweb's `connected` status. It could therefore show **a positive-looking QA connection notice for an already-active wallet method disallowed by the current server-gated mode** (for example, MetaMask still active when the page runs email-only QA). That is a misleading QA result, not proof of a server or wallet authorization bypass. Do not claim an exploit or completed RHC account link.

## 2. Exact bounded fix

- `provider-view.ts` now receives the **server-approved QA mode** as part of its provider snapshot. Pure `isQaWalletMethodPermitted` only allows pinned Thirdweb's known `inApp` identifier in embedded-email/both, and `io.metamask` in external-metamask/both. Unknown IDs and malformed modes are never accepted.
- A connected wallet must additionally be on the previously selected **Sepolia testnet** to be labelled `qaEligible`. Eligibility is **a QA presentation state only**, never token capability, RHC authorization, or account link proof.
- When an active wallet method is disallowed, the panel displays **method not permitted**, hides its masked address instead of presenting an approved-looking balance/identity, and **still permits disconnection**. It does not silently enroll another wallet, fallback to MetaMask or connect with email.
- Unknown provider IDs are represented as `Unapproved provider (disconnect only)`, not echoed as untrusted raw strings. The active wallet must be removed through Thirdweb's existing `disconnect` handler; no new SDK command was added.
- The provider connection status still comes from live SDK hooks and remains distinct from RHC JWT/identity status. A pending or failed disconnect does **not** count as QA eligibility or a completed disconnect. A historical canceled modal does not override a new observed, currently connected SDK status.
- `ThirdwebLocalQa.tsx` passes the already server-gated `mode` into the presentation helper, uses the sanitized provider label, and exposes a passive `data-qa-method-eligible` diagnostic attribute. It retains the existing Thirdweb SDK, client ID binding, modal options, connect/disconnect flows and separate strict server route gate.

**Source boundary:** Only Boss Allen-owned Customer Web wallet/Thirdweb QA helper, component, regression tests and this document. No `packages/web3` shared provider, backend API/Auth/DB/Points, root package versions, lockfile, CI workflow, deployed chain, token supply/contract or bridge implementation changes.

## 3. Regression and acceptance coverage

Existing 16 provider-view cases still execute after supplying the explicit approved mode; all old assertions remain. Additional mode-integrity tests cover:
- permitted `inApp` and `io.metamask` IDs by email/external/both mode,
- cross-mode wallet carry-over and unknown provider IDs,
- hiding an unapproved wallet address without blocking disconnection,
- wrong/missing/Mainnet chain, invalid account/address and malformed mode,
- canceled, busy, disconnected, pending/failed-disconnect SDK states,
- no full address or secret in derived UI state, no new actions,
- component wiring to the server-approved mode, not public flags or caller mode.

The required local quality gate also runs inherited Thirdweb, wallet, Points, dependency and Task10 suites, Customer TypeScript/lint/build, shared types/UI builds and local production QA HTTP-denial tests with a scripts-disabled offline clean install and unchanged dependency lock. These tests are **not** a new connected Thirdweb email/wallet login, full RHC customer linking UAT, independent accessibility certification or Linux/Node22 CI release acceptance.

## 4. Owner and release stop conditions

Boss Allen owns the Thirdweb wallet UI and QA. Boss Gal retains backend account identity, roles, JWT, wallet linking, API/Points ledger, business logic and the backend-owned critical dependency finding. The shared `BG-01..12` agreement and official token OFF-25 remain pending. Any actual connected wallet/customer integration must be separately approved and tested using agreed synthetic accounts.

The W03 Task13 critical/high runtime audit findings remain unresolved; do not change npm audit thresholds or force-downgrade Thirdweb. PR #5/#6 remain draft/unmerged, and Customer Wallet is still ClickUp **TESTING**, never DONE on this evidence alone. No token/RPC/chain operations or mainnet/L2 deployment are authorized.

## 5. Agent handoff

**Thread:** NEW — W03-14 Provider Mode Integrity Fence
**Model:** GPT-6; preferred thinking **High**
**Executor:** ChatGPT + Desktop Commander; no external Zed/Codex agent started
**Device:** DESKTOP-5TQ68F9
**Project root / worktree:** `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-14-provider-mode-fence-20261016`
**Working branch:** `allen/w03-14-provider-mode-fence-20261016`
**Exact base:** `d4abe01f41571da2c522eec4361adc0720285d2c`
**Allowed:** wallet-only QA model, view, tests, local test evidence and documentation.
**Prohibited:** changes to Boss Gal backend/DB/Auth/API, shared package-lock/SDK, approved QA activation route, real wallet/provider calls, transactions/signatures, public deployment, CI audit bypass or modifying earlier protected worktrees.
**Required tests:** direct method/chain/SDK-state negative tests, existing wallet regressions, local TS/lint/build/denial checks, exact source/lock/worktree hashes.
**Required outputs:** source/commit/patch SHA-256, local PASS/FAIL test logs, preservation receipts and review handoff.
**Stop point:** local tested candidate; no push/merge or project release without review and owner acceptance.

The correct status is **wallet-side QA hardening tested locally**, not completed connected Thirdweb integration, security acceptance or production readiness.
