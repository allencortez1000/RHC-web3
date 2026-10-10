# W01-P1 — Actual Offline Validation

**Date/device:** 2026-10-10 / `DESKTOP-5TQ68F9` (Boss Allen).  
**Source commit:** `aeff8976f993a75d584d4e7a6b61b008b94ad02a` on new isolated branch.  
**Actual runtime:** Node.js **22.20.0**, installed Thirdweb **5.121.6**, mocked HTTP/SDK, isolated offline Chromium.  
**Overall:** Automated suites PASS; strict OFF matrix **26 PASS / 2 FAIL** (two documented missing product behaviors). Human review pending.

## Sealed regression run

External latest authoritative ledger:

`C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w01-p1-offline-20261010T014521Z/RUN-LEDGER-V3.json`

Each entry has the precise command, exit, case count, start time, SHA-256 and owned log path. Earlier V1/V2 and initial browser logs are preserved as task-owned history; the latest V3 run was executed after final W01 test-file cleanup.

| Verified stage | Test-runner reported PASS | Fail |
|---|---:|---:|
| New W01 Node boundary | 20 | 0 |
| New W01 Chromium browser | 11 | 0 |
| Inherited Web3 core | 46 | 0 |
| Inherited installed Thirdweb SDK/JSON-RPC | 18 | 0 |
| Inherited W1 wallet foundation | 25 | 0 |
| Inherited W2A policy | 16 | 0 |
| Inherited W2B-P1 synthetic controller | 48 | 0 |
| Inherited Web3 read-only Chromium suite | 50 | 0 |
| **Total runner entries across 8 suites** | **234** | **0** |

The inherited W2A/W2B tests and SDK connector were copied/rebased to task-owned external fixtures with checksummed source. They did not overwrite the accepted worktree or original historical evidence. The inherited Web3 browser script was run read-only against the protected W2B source **whose tracked Web3 hashes match W01's same baseline**; it compiles bundles/CSS in memory. Its suite includes nested runner entries, so totals are not unique business UAT cases.

## Static validation

Latest `STATIC-LEDGER-V2.json`: new W01 CJS syntax checks PASS; full unchanged Web3 TypeScript build's `--noEmit` typecheck PASS via the protected, dependency-installed W2B worktree; targeted ESLint of both new W01 CJS test files PASS with **zero warnings/errors**.

This indirect typecheck does not certify a new application build or connected service. W01-P1 adds no TypeScript application source.

## OFF-01–OFF-28 disposition

See **`W01-P1-TEST-MATRIX.json`**, generated at final source seal. The strict acceptance outcomes are:

- **PASS:** OFF-01 through OFF-15, OFF-17 through OFF-24, and OFF-26 through OFF-28 = **26/28**.
- **FAIL:** OFF-16 (idle-tab elapsed staleness not reclassified) and OFF-25 (no authoritative metadata identity drift comparison against signed token spec). The corresponding negative/limitation tests execute and pass because they prove the missing capability, **not** because the product requirement is complete.
- **BLOCKED / NOT RUN:** CON-01 through CON-08 future connected checks. No actual provider test occurred.

### Scope of permissions and browser evidence

W01 browser fixtures run with service workers blocked, offline Chromium, external requests denied and sanitized assertions. It tests the real Web3 read panel. Actual RHC AuthGuard/Redis/DB, JWT revocation, connected account switching, vendor billing, official chain/RPC, and full accessibility are **NOT RUN / not accepted**. OFF-17–OFF-19 PASS means the *offline code and existing mocked browser checks* enforce the anticipated boundaries, not connected-role acceptance.

### Test harness corrections (preserved, not hidden)

1. First manual W01 browser test: 9/11 passed; external fixture lacked an explicit `testnet` case. Corrected only task-owned external fixture.
2. Second browser attempt: 9/11; render/test synchronization was checked, then missing fixture mode identified and fixed.
3. First aggregate runner: W01 unit 20 PASS, all 11 browser tests blocked by a **working-directory-dependent bundle input path assertion** in the new W01 test. Corrected new allowlisted test path assertion; this was not a Web3 runtime failure.
4. V2 aggregate 8/8 suites PASS, followed by removal of two unused CJS imports (ESLint warnings). V3 aggregate reran **all** suites and passed. Static V2 recheck had zero warnings.

No existing source, W1/W2A/W2B-P1 evidence or browser application routes were modified as part of the fixes.

## STOP

Do not claim the original proposal's wallet balance, history, official contract, production deployment, connected UAT or blockchain/token acceptance based on any of these results. The user authorized **W01-P1 verification only** and demanded a stop before Git publication/provider access.
