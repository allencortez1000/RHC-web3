# RHC W03-11 — Real-browser QA of synthetic multi-network wallet preview

**16 October 2026 | Boss Allen wallet workstream | Local QA; not connected functionality or release acceptance**

## Scope and reason

W03-10 already implemented an **unmounted, synthetic-only** network-partition decoder and presentation. Its 55 offline checks and 337 inherited wallet/Points regressions passed locally, but the component had **not** been inspected in an actual browser. This task adds a standalone, task-owned browser QA harness without mounting a Next customer page or connecting real data.

The Project's 16 October L1-first to future L2 architecture review is **conditional only**. It does not authorize Mainnet token development, new chain selection, transfer/approve changes, bridge, canonical supply, native gas, token issuance or real RPC. No approved RHC token chain/address exists in this test.

## Bounded implementation

New standalone script:

`apps/customer-web/scripts/w03-network-partition-browser-qa.mjs`

It renders W03-10's **existing** React component using `react-dom/server` with strictly invented fixture scopes and asset keys. It creates a task-owned HTTP server on an ephemeral **127.0.0.1-only** port, with no authentication or other RHC routes and the following defensive controls:

- `Content-Security-Policy` denies scripts, outbound connections, frames, form submissions, objects and external assets; inline task-local styles only
- `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex,nofollow`
- Real Chrome/Chromium via locally installed Playwright; test-side browser request interception rejects any non-fixture network request
- Task-owned evidence directory stores output JSON and static screenshots; no screenshots, account identifiers, environment secrets or browser traces are written to the source branch
- The server and browser are stopped in `finally` after pass or failure; the source branch contains **no new Next route or production logic**

Covered scenarios: two separate invented L1/L2 slots, observed synthetic decimal amounts, actual observed zero versus unavailable and stale, synthetic unconfirmed bridge in-flight state, account switch, source revision switch, duplicate synthetic asset, forged contract address/action, and hostile asset text. Browser viewports: 320, 375, 768, 1440 pixels. Verify semantic heading/landmark/status, absence of actionable controls or focusable wallet buttons, no horizontal overflow, no combined supply, zero outbound requests and no browser exceptions.

The browser covers **Chromium on Windows with viewport emulation**, not actual iOS/Safari, keyboard-only assistive tech certification, formal WCAG 2.2 AA, audited smart-contract behavior or linked RHC customer acceptance.

## Boundary from earlier W03 tasks

- Task 5 frontend security patch and Task 6 read-only Points route remain unchanged.
- Task 8 QA loopback listener protection and the Thirdweb Sepolia-only *separately authorized development gate* remain unchanged.
- Task 9 security findings remain open: one critical `proxy-addr` package on the Boss Gal API side and high `ws`/`js-yaml` shared dependencies. No audit suppression or automatic forced upgrade.
- Task 10 pure module, synthetic data constraints and source hash remain unchanged (this task only adds a browser harness).

## Project ownership and approval gates

Boss Gal owns backend authentication, RHC account/company/tenant permissions, Points ledger/business rules and API response authorization. Boss Allen owns wallet UI/Thirdweb/provider-side behavior. The jointly approved `BG-01..BG-12` versioned identity and wallet DTO is still required before real account linking or connected read-only Points/token data.

The issuer/CEO/security must approve any real ERC-20 source, network and address, canonical supply/bridge/gas architecture and restricted-mode enforcement. W03-11 does not satisfy those gates. No signing, token transfer, minting, wallet enrollment, actual network read or contract deployment is permitted.

## Agent handoff

- Agent thread: **NEW — RHC W03-11 Synthetic Multi-Network Browser QA**
- Model: **GPT-6**, thinking preference **High**
- Executor: ChatGPT + Desktop Commander; no Zed/Codex agent launched
- Workstation: `DESKTOP-5TQ68F9`
- Root/worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-11-browser-qa-20261016`
- Branch: `allen/w03-11-network-browser-qa-20261016`
- Exact base: `9ab9446c8820b1e40a2e9c8ac632d1a79b9aea39`
- Allowed: new standalone wallet browser test script, this documentation, task-owned test logs/screenshots/checksums
- Prohibited: application route mounting, Boss Gal backend changes, shared provider/dependency/CI modifications, L1/L2 token/bridge/gas logic, real credentials/wallet/RPC, remote push/merge/deploy and protected worktree changes
- Required tests: browser viewport/keyboard/synthetic security cases, inherited wallet/Points regressions, Customer TypeScript/lint/build and Thirdweb production denial, exact source hash and worktree preservation
- Required result files: browser logs and screenshots, failure/pass receipt, local commit and SHA-256 manifests, review handoff
- **Stop point:** clean local tested checkpoint; external review and internal acceptance remain pending

The existing W03-10 screenshot-free unit evidence is not retroactively counted as real-browser evidence. A browser test is not automatically human UAT or a completed feature.
