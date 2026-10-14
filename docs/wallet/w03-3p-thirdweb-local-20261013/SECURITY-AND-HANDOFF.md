# W03-3P — Thirdweb Real Provider QA Security and Handoff

**Checkpoint:** October 13, 2026
**Owner:** Boss Allen — wallet, Thirdweb, blockchain-side integration
**Status:** Real SDK code implemented in isolated local-QA-only route; actual provider login remains subject to RHC authorization and a valid public Client ID.

## Agent/worktree handoff

| Field | Exact value |
|---|---|
| Agent thread | NEW — RHC Allen W03-3P Thirdweb Local Provider Integration |
| Executor | ChatGPT GPT-6 directly via Remote Desktop Commander; no Zed/Codex thread started |
| Thinking level | Runtime thinking selector not independently known; use High/Max for any follow-up security review |
| Root | `C:/Users/admin/Desktop/RHBC project` |
| Branch | `allen/w03-3p-thirdweb-gated-qa-20261013` |
| Worktree | `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-3p-thirdweb-qa-20261013` |
| Exact base commit | `a247af0f85efbb0ef1d1697ef47cb2a23aaf06f7` |
| Allowed files | New QA-only route, RHC wallet QA guard and connector, bounded QA tests/docs and dependency manifest/lockfile for Thirdweb SDK runtime peers |
| Prohibited changes | Boss Gal API/Auth/DB/rewards, existing wallet release-lock or customer account routes, other worktrees, token contracts, production/mainnet, signing/transfers/trading, force pushes, merges |
| Required tests | Gate negative matrix, real thirdweb React SSR, full Customer TypeScript and lint, inherited W03 tests, deterministic production build, production-route 404, 16 previous worktrees preserved |
| Handoff evidence | Updated package/lock, local test/build logs, manifest SHA-256, reconciliation notes, runbook and external checksummed evidence |
| Stopping point | No authorized Thirdweb test project Client ID/chain/QA approval yet; production wallet activation and connected RHC contract remain blocked |

## Security boundaries

The actual SDK may initialize only inside the separately guarded `/thirdweb-qa` server route under Next development mode, no Vercel platform env, a true loopback Host, explicit RHC test reference, non-secret public Client ID, chain ID `11155111` and one of the allowlisted wallet modes. A string matching the reference syntax is only a *record locator* and not evidence the CEO authorized the test. The test runner must verify the signed RHC approval independently.

The normal `/account` route and `W2A_RELEASE_LOCK='OFFLINE_REVIEW_ONLY'` remain untouched. The new UI never imports `RHC useRuntime`, fetches protected backend endpoints or makes token/Points API reads. It does not submit any signature/transaction, deploy a contract, mint, transfer, trade or store private keys. Do not substitute wallet address/Thirdweb identity for the verified Supabase JWT and RHC `users.id` authorization context.

The test modal intentionally restricts wallet choices to separately approved email-embedded or MetaMask options and Sepolia. Connecting an email embedded wallet can involve Thirdweb-hosted authentication, storage and privacy responsibilities. Actual provider authentication must wait for RHC account ownership, dedicated QA user, cost limits, and privacy review.

## Dependency-review note

The pinned `thirdweb@5.121.6` wallet runtime imports `@base-org/account` → `@coinbase/cdp-sdk@1.57.0`, which references optional peer exports from `@x402/core`, `@x402/evm`, `@x402/extensions`, `@x402/svm`. The original workspace omitted these. The isolated runtime dependency resolution pins the peers to version `2.25.0`; **this does not turn on x402 payments**, nor is it proof of a full supply-chain audit. No x402 payment flow is called by the new component.

Do not use unvetted Webpack ignore/mocking shims to conceal missing packages. Test dependency installation with a clean, task-owned `node_modules`, preserve the original lockfile diff, and review any advisories before production.

## Remaining RHC integration gates

1. **Thirdweb provider setup:** RHC-owned project, public Client ID, allowed domain, approved Sepolia network, wallet test identity, service/billing limit and written QA scope.
2. **Shared backend contract:** BG-01..BG-12 and versioned `w03.v1` DTO jointly signed by Boss Gal and Boss Allen. Server owns nonce challenge, wallet proof, durable link, revocation and account/tenant authorization.
3. **Official token:** OFF-25 issuer/token/network/contract identity remains FAIL/BLOCKED; do not display a guessed or demo token as official.
4. **Human UAT:** Test real connection/disconnection/account/wrong-network behavior; then independently test RHC authenticated linked wallet A/B, roles, scopes, session expiry and provider outages.
5. **Release:** Separate App and Token GO/NO-GO with authorized RHC signers, legal/privacy/security review, rollback/runbook and accepted UAT.

**No production or public wallet functionality is accepted as DONE from this local source checkpoint.**


## Continued 14 October — actual HTTP denial and reproducible dependencies

The previous partial dependency directory and failed build output were preserved outside the worktree, then replaced by a complete lockfile-based npm ci with install scripts disabled. No manually copied declarations are required by the new install. A real production-server test demonstrated that page-level notFound() alone could return an HTTP 200 streamed response. The new apps/customer-web/middleware.ts matches only /thirdweb-qa/:path* and rejects denied requests with a direct HTTP 404, no-store headers and an empty body before the page or SDK is rendered. A defensive pathname check prevents any change to normal customer routes. This middleware does not implement RHC identity/authentication or replace Boss Gal authorization.

Production-denial tests use deliberately synthetic negative-test settings; they are not approval references or provider credentials. They also test forwarded-host manipulation, nested QA paths and a normal root-page control. Actual wallet connection/enrollment, account linking, token operations and connected UAT remain NOT RUN. The final validation ledger, rather than preliminary reports, controls which tests passed.
