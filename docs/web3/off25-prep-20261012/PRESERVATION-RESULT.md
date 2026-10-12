# OFF-25 Synthetic-Only Preparation — Source Preservation

**Machine:** DESKTOP-5TQ68F9 — Boss Allen.  
**Branch:** `allen/off25-synthetic-identity-offline-20261012`  
**New worktree:** `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-off25-offline-20261012`  
**Exact base commit:** `10e902e2af0912044739d6982dd93e789105f0e6`  
**Exact base tree:** `8fc928e22b51ca90474f4e5f94236666e147fe8b`

## Changes confined to new, untracked files

- `packages/web3/src/off25-synthetic-identity.ts` — standalone offline-only comparison helper, not exported from `index.ts`.
- `packages/web3/test/off25-synthetic-identity.offline.cjs` — 24 synthetic tests.
- Five new handoff reports and one new `handoff-manifest.json` in `docs/web3/off25-prep-20261012/`.

**Not changed:** tracked source, original W1/W2A/W2B/W01/OFF-16 branches/worktrees, `packages/web3/src/index.ts`, `config.ts`, API/backend, contracts, deployment configuration or manifests. No commit, push, merge, branch switch/reset/stash, provider/RPC call, wallet connection, signature or transaction is authorized for this checkpoint.

A Git-ignored `node_modules` junction to W1's already-installed dependency tree was used for bounded offline compiler/test execution. Package `dist` outputs generated inside this new isolated worktree are ignored build outputs; no new packages were installed and no protected worktree source was edited.

The manifest seals each new source/document's file SHA-256. External `FINAL-SEAL.json` contains the manifest's own SHA-256 and the original validation ledger SHA; final re-verification must confirm all five protected worktrees stayed clean and HEADs unchanged. Original W01-P1 partial acceptance and OFF-16 later acceptance were not reclassified.

**Stop for Boss Allen's review before Git publication or integration.**