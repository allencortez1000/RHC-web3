# RHC W03-10 — Offline L1/L2 network-partition safety

**16 October 2026 | Boss Allen wallet workstream | UNMOUNTED / SYNTHETIC ONLY**

## Why this is the next independent task

The latest RHC Project architecture review describes Ethereum Mainnet ERC-20 first as a *conditional working direction*, with an Ethereum-settled future L2 requiring prior decisions on transfer/approval restrictions, canonical supply, bridge mechanics, L2 gas and governance. It is explicitly **read-only, not authorization for Mainnet/L2 implementation or token operations**.

The existing W03 offline wallet model already invalidates stale asynchronous results when its account/session/chain/source fingerprint changes. This task adds a **distinct safety proof for *multiple* potential networks in one offline view**, without approving, configuring, calling or selecting any actual chain. No new token/ERC-20/bridge code is implemented.

## Implemented boundary

- Additive, unmounted `apps/customer-web/app/components/wallet-thirdweb/w03-network-partition-offline/partition.ts` and `OfflineNetworkPartitionPreview.tsx`, plus `partition.test.mjs`.
- The only accepted network labels are **synthetic-l1**, **synthetic-l2-a** and **synthetic-l2-b**. They do **not** correspond to chain IDs, contract addresses or a selected rollup stack.
- The source and account scope must contain an explicit synthetic marker, invented customer ID, positive session epoch, synthetic wallet-link revision and synthetic source revision.
- Each record repeats the exact scope and has a network + invented asset composite key; cross-account, cross-session, cross-source, duplicate slot and foreign network records reject the **entire** result.
- Only precise decimal-string base units and explicit synthetic status may display a **SIMULATED** slot value. Unavailable, stale and observed zero remain distinct.
- An invented in-flight bridge marker does not confer a confirmed deposit, withdrawal, canonical supply or total. **No combined L1/L2 balance is ever calculated.** A real L1 token and an L2 representation may be the same economic unit, so careless summing can double-count.
- All ability flags (connect, link, approve, transfer, bridge, mint, redeem) remain permanently false. No RPC, SDK, secrets, real data or customer authentication is read. The preview is **unmounted** from the application and has no actionable elements.

## Important limitations

This is not an approved backend wallet/account/Points API decoder, a signed token specification, verified token holdings, L1/L2 chain selector, real provider adapter, bridge, gas model or release feature. The accepted synthetic marker is only a development fixture marker, **not an authorization credential**. Test data can be fabricated; it is never suitable for customer display.

Do not treat the code as approval to mint a token on Ethereum or to select Optimism/Arbitrum. The Project handoff explicitly stops before on-chain implementation. Do not substitute `synthetic-l1` for Ethereum Mainnet in a production config. Keep `packages/web3/src/config.ts` `APPROVED_TESTNETS = []`, the existing Sepolia development-only QA gate and OFF-25 unverified status unchanged.

## Gates before any connected version

1. **Boss Gal + Boss Allen** approve BG-01..BG-12 identity/tenant, RHC JWT, wallet ownership/link proofs, session/revision, approved read-only DTO/schema, trusted server response provenance and company isolation.
2. **Issuer/CTO/counsel** approve the ERC-20 restrictions, chain identity, cap/issuance, upgrade/custody governance, actual L1/L2 compatibility, canonical supply invariant, bridge design and gas plan. No official token contract/address/explorer receipt exists in this checkpoint.
3. **Security/QA** review and fix the critical/high dependency audit findings in their respective workstreams, then pass Ubuntu/Node22 CI, wallet provider read-only tests, connected API negative tests, browser regression/accessibility and internal UAT.
4. Publish separate APP/TOKEN GO/NO-GO decisions only after accepted evidence. Wallet display is not a token release.

## Required tests and handoff

Run Node/tsx offline tests for synthetic scope and data partitioning, immutable outputs, no aggregate balance, fail-closed behavior, inaccessible action flags, and unmounted preview SSR. Then run the inherited wallet regression, Customer TypeScript/lint/build and local production denied-QA HTTP checks where feasible. Preserve any failed attempts; do not call unexecuted test cases PASS.

**Thread:** NEW — W03-10 Offline L1/L2 Network Partition
**Model:** GPT-6; preferred thinking High
**Executor:** Direct ChatGPT / Remote Desktop Commander (no external agent launched)
**Project/worktree:** `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-10-network-isolation-offline-20261016`
**Branch:** `allen/w03-10-network-isolation-offline-20261016`
**Exact base:** `ba17f2410d9f9ea4fb967d3c472c3135a9ebef52`
**Allowed:** The three new isolated module/test files, this handoff and independently stored checksummed evidence.
**Prohibited:** Boss Gal backend, `packages/web3` shared provider changes, thirdweb/chain selection, new contract/bridge, Mainnet/testnet calls, wallet transactions, source merges or live deployment, forced package upgrades or audit bypass, protected worktree alteration.
**Stop/approval:** Finish an isolated test-verified local commit and report. Subsequent integration requires explicit reviewed Gal/Allen DTO agreement and issuer-chain decisions.
