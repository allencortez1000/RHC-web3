# OFF-25 Synthetic-Only Preparation — Validation Results

**Executed October 12, 2026** on Boss Allen's `DESKTOP-5TQ68F9`, from new isolated branch `allen/off25-synthetic-identity-offline-20261012` based on `10e902e2af0912044739d6982dd93e789105f0e6`.

## Local validation ledger

Authoritative ledger: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/off25-offline-20261012/VALIDATION-LEDGER.json`.

| Bounded local stage | Result |
|---|---|
| Local `@rhc/types` TypeScript build | **PASS** |
| Full `@rhc/web3` TypeScript typecheck | **PASS** |
| New TypeScript and test CJS scoped ESLint | **PASS** |
| New OFF25 synthetic-only tests | **24 PASS, 0 FAIL** |
| Inherited Web3 core tests | **46 PASS, 0 FAIL** |
| Full Web3 TypeScript compile | **PASS** |
| Inherited SDK/JSON-RPC intercepted suite | **18 PASS, 0 FAIL** |
| **Total** | **7/7 stages PASS; 88 test-runner entries PASS** |

Tests ran using an existing Node.js 22.20.0 binary and dependency installation from the protected W1 worktree through a Git-ignored junction in this new worktree. No dependency download or version change. The `offline-network.cjs` guard was preloaded in every subprocess; provider access remained disabled in a sanitized test environment. Inherited SDK tests intercepted RPC; they did not validate any live Thirdweb account or chain.

## Specific tests

All 24 new cases passed: matching synthetic values remain not official; missing/untrusted expected record; invalid reference scope, chain ID, address, name/symbol/decimals; synthetic/disabled/stale sources; no pinned block or contract; required metadata unavailable; all five identity drifts; address hex-case equivalence; valid zero decimals; optional metadata missing; immutable input/result; no SDK, network, or production export.

**This does not resolve historic W01 OFF-25 acceptance.** It proves a safe unmounted comparison candidate only. The original W01-P1 matrix remains historical **26 PASS / OFF-16 FAIL / OFF-25 FAIL**; later owner acceptance of the separate OFF-16 correction does not alter that snapshot. OFF-25 still lacks an approved signed issuer specification, real contract, code provenance and connected verification. Connected W01 CON-01..CON-08 remain **NOT RUN**.

Original package/code files outside the explicitly new-file scope were not modified. New local ignored `dist` build outputs and dependency junction are test-only, not committed code or deployed artifacts. This is not human UAT, contract security audit, public verification or wallet feature acceptance.

Each stage's stdout/stderr, exit code, reported counts and SHA-256 are in `VALIDATION-LEDGER.json`; every log's hash is validated again by the final seal.
