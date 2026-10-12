# W01 / OFF-25 — Synthetic Identity Comparison Preparation

**Date:** October 12, 2026 (Philippines). **Owner:** Boss Allen.  
**Scope:** New isolated offline-only preparation, **not OFF-25 acceptance**.  
**Implementation method:** Direct ChatGPT GPT-6 / Remote Desktop Commander, separate from Boss Gal's Sprint A backend work.  
**Decision:** Preparation completed and tested; human review pending. **Official RHC token verification remains BLOCKED**.

## Exact source and scope

- Machine: `DESKTOP-5TQ68F9` only.
- New branch: `allen/off25-synthetic-identity-offline-20261012`.
- Worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-off25-offline-20261012`.
- Base: `10e902e2af0912044739d6982dd93e789105f0e6`; accepted OFF-16 correction branch.
- NEW `packages/web3/src/off25-synthetic-identity.ts` — pure, disconnected helper for comparing **invented** chain ID, contract address, name, symbol and decimals. It returns `UNVERIFIABLE`, `MISMATCH` or `MATCHES_SYNTHETIC_FIXTURE`, but permanently returns `officialTokenVerified:false`, `issuerSignatureVerified:false`, and `releaseAuthorized:false`.
- NEW `packages/web3/test/off25-synthetic-identity.offline.cjs` — 24 offline tests with fake data, fail-closed cases and static proof that the helper is not exported into the existing Web3 reader.
- New checksummed documents under `docs/web3/off25-prep-20261012/` and external evidence under `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/off25-offline-20261012/`.

## Implementation invariants

The module imports `Web3ReadResult` **as a TypeScript type only**. It does not call Thirdweb, RPC, fetch, sign, write, use wallet state, read environment credentials, or modify API/backend code. Existing `packages/web3/src/index.ts`, `config.ts` and `APPROVED_TESTNETS=[]` are unchanged. A synthetic fixture match can **never** elevate a contract to official-RHC status or enable a provider. Arbitrary environment or user data is not an issuer's signed approval.

The helper rejects invalid synthetic expectations, missing/unpinned observations, unavailable required metadata, stale or disabled sources, and checks exact case-sensitive token name/symbol/decimals. EVM hex addresses are compared case-insensitively, without silently converting other metadata. Optional `cap`/`paused` absence is not fabricated as success.

## Non-goals and stop

No issuer-signed metadata exists, and no real chain/address/ABI or contract provenance is approved here. **OFF-25 remains FAIL/BLOCKED pending management, issuer, security and legal decisions**. W01-P2 connected tests remain NOT RUN. This preparation is not proof of authorized ERC-20 existence, customer balance/history, official token price, RHC Points, production readiness or November 10 contract completion.

No commits, pushes, merges, PRs, SDK upgrades or deployment operations were performed. The new worktree and original worktrees must remain protected until Boss Allen reviews this evidence. **STOP for owner review.**
