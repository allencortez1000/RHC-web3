# W01-P1 — Worktree Preservation and Scope Audit

**Scope to preserve:** Two new CJS tests plus W01-P1 docs only. No existing tracked source/config/route/API/contract files modified, no Git publication, no provider operation.

## Identity invariants

| Identity | Expected |
|---|---|
| Authorized device | DESKTOP-5TQ68F9 |
| Base W2B-P1 worktree | `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w2b-offline-20261009` |
| Exact W2B-P1 accepted SHA | `aeff8976f993a75d584d4e7a6b61b008b94ad02a` |
| Current W01-P1 branch | `allen/w01-w02-readonly-offline-20261010` |
| Current W01-P1 worktree | `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w01-w02-readonly-20261010` |
| Base tree, unchanged by new uncommitted files | `40d9b7dd0c3c2b4834dc0a6cd3c6cf93abb0c9d1` |
| Protected W1 | `allen/frontend-web3-stabilization`, `d951c91800f00d31a4ec4bd7b4da14e8a266e01d`, clean |
| Protected W2A | `allen/w2a-thirdweb-wallet`, `dcf2a81aa5158f2e56141dac8a2ebe60d7fd236b`, clean |
| Protected W2B-P1 | `allen/w2b-offline-auth-contract-20261009`, `aeff8976f993a75d584d4e7a6b61b008b94ad02a`, clean |

## New-file allowlist

- `packages/web3/test/w01-readonly-boundary.cjs`
- `apps/customer-web/tests/w01-readonly-browser.cjs`
- `docs/web3/w01-w02-20261010/**` including this report, `handoff-manifest.json` and `W01-P1-TEST-MATRIX.json`
- External synthetic fixtures, copied-inherited source wrappers, and logs only at `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w01-p1-offline-20261010T014521Z`

No `node_modules` symlink or dependency was installed in the new W01 worktree; the SDK and TS compiler were loaded from the already-installed protected W1 dependency tree for offline tests. The source tree itself contains only the two approved new test files and scoped new documentation.

## Forbidden operations

None performed: protected branch switch/rebase/reset/clean/stash, source modification outside allowlist, source token config activation, `APPROVED_TESTNETS` population, backend/DB/Redis/Docker, `.env`/private secrets, Git add/commit/push/merge, public PR, CI/deploy, Thirdweb dashboard, wallet connect/enroll, signatures, transactions, ERC-20 calls against real RPC or deployment.

The source-identity seal, allowed path inventory, file bytes and SHA-256 records, no-commit proof and protected worktree status are written by the task finalizer to the new `handoff-manifest.json` and external `PRESERVATION-FINAL.json`. The final archive is portable **documents and test code only** and contains no runtime dependencies, real secret files, local DB, private provider data or generated Next build.

## Gated conclusion

W01-P1 **offline verification delivered**; acceptance status TESTING until owner review, and strict W01 release acceptance remains **PARTIAL with OFF-16/OFF-25 failed**. W01-P2 connected remains NO-GO. W02 contract/chain/legal decisions remain open. No regression suite proves a safe production deployment.

## Windows checkout normalization note

The inherited committed `docs/wallet/w2b-offline-20261009/handoff-manifest.json` has LF bytes in the preserved W2B worktree but CRLF bytes in the new W01 checkout. Both `git hash-object` reads yield the **same tracked Git blob** `37436c2b3314a2430a8fb83345b77473a3853705`, and both worktrees are Git-clean. This is a checkout line-ending difference, **not** a source edit. The evidence records local byte SHA-256 separately from normalized content/Git blob identity; it does not overwrite the protected manifest.
