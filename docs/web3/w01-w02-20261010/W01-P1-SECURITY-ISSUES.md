# W01-P1 — Security Issues, Acceptance Gaps and Release Gates

**As of October 10, 2026:** This is a source-preserving offline security test report, not a production audit, penetration test, regulator authorization or live acceptance.

## Verified offline controls

- W01 source compilation never added or enabled `APPROVED_TESTNETS` (remains `[]`); runtime `RHC_WEB3_PROVIDER` flags alone cannot grant provider access.
- Connected mode rejects synthetic fixtures; RHC demo markers deny connected provider egress.
- Source-approved chain/address/explorer gating, no zero address, no mainnet and no arbitrary origin approval.
- Server credential validation remains backend-only; no Thirdweb SDK or secret in the browser panel bundle.
- Transport only permits `eth_chainId`, `eth_getBlockByNumber`, `eth_getCode`, `eth_call`. Signing and transaction methods are rejected before mocked fetch.
- Mock fetch validates same-height contract observations, no-code/reorg errors, HTTP auth/rate failures, bounded response, cache staleness/expiry and string-safe token units.
- No private `.env`, token key, customer record, wallet mnemonic, JWT or hosted provider was read. Only invented test fixture values were used.
- Customer reader requires current RHC session, active non-admin account; admin integration diagnostics require an effective **global** `integration.view` grant. The tests exercise offline guards and prior intercepted browser scenarios, not real hosted Auth acceptance.

## Two unmet W01-P1 requirements — NOT accepted as working features

| ID | Finding | Severity relative to the read-only release | Required future action |
|---|---|---|---|
| OFF-16 | Browser tab continues displaying the server's last `fresh` status even after a synthetic observation is years old; manual reload disclosure exists, but no client-side elapsed-time stale reclassification | **Release review required**; risk of consumers mistaking last response for current | Propose a minimal change scoped to `packages/ui/src/web3-read-panel.tsx` (and tests), with time/visibility handling, offline failure tests and separate Allen approval |
| OFF-25 | Contract identity cannot be compared against an approved name/symbol/decimals set because no signed token identity contract is configured; chain/address/code checks and “not official” label do work | **Hard blocker for calling any displayed token official RHC** | Obtain signed W02 issuer spec and exact chain/address/source/ABI/decimals; propose reviewed expected-metadata validation in a separate scoped code change |

**Do not fix either by adding a guessed chain, editing `APPROVED_TESTNETS`, hiding disclosures, inventing official token metadata or modifying existing source under W01-P1 authority.**

## Additional known limitations and owner decisions

1. `Web3ReadResult` has no per-customer wallet balance or transaction/transfer history. Both are original-proposal deliverables; require a future approved design/change decision. Contract totalSupply is not a customer balance.
2. The current implementation's last-height hash comparison is **observed block provenance**, not independent consensus/finality or production token provenance.
3. The W01 browser laboratory is an external synthetic React/Chromium fixture. It does not certify full integrated Customer/Admin routing, production WCAG 2.2 AA, real JWT revocation, full-session scope teardown or real connected behavior.
4. The inherited installed Thirdweb SDK suite uses intercepted JSON-RPC calls; zero live provider access has been granted. Source and approved-testnet allowlist remain unchanged.
5. The decision pack's D01–D20 token, issuer, chain, ABI, budget, legal and release choices remain OPEN unless separately signed. A 100-million-supply Ethereum L2 **draft** and older 15-billion-token/points direction cannot be swapped without a governing release decision.
6. Thirdweb billing/allowed domains and Boss Gal's connected Auth/Redis/API/CORS baseline were not validated in this run. Existing Gate-0 blockers remain separate.
7. GitHub/Vercel operational failures from the previous wallet branch are not remedied by local offline tests.
8. No proof of public-chain deployment, independent source/bytecode/roles verification, token legal classification or accepted APP/TOKEN release decision exists from this run.

## Test classification

- 8 offline suites / **234 runner-reported test entries passed**, 0 failed, 0 skipped on final execution. Includes nested existing browser suite counts; they are not 234 independent acceptance scenarios.
- **26 of 28 OFF case acceptance requirements supported; OFF-16 and OFF-25 unmet.** New tests called “OFF-16” and “OFF-25” pass because they demonstrate and document limitations; those test results are **not** product acceptance PASS for their strict criteria.
- 8 connected cases `CON-01`–`CON-08` **BLOCKED / NOT RUN**.

## Release decision

**W01-P1 test implementation: technically runnable and source-preserved, but W01-P1 acceptance criteria PARTIAL (26/28). W01-P2 live provider: NO-GO. W02 official contract: decision pending. Full November 10 release: not certified.** No code patch, network access, Git publication or platform task status change is implied.
