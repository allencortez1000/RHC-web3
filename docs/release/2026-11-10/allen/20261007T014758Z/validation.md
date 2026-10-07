# Validation — 20261007T014758Z

**Partially completed locally.** Final selected checks pass; full persistent demo, exact browser expiry, Node 22 and external acceptance remain pending. No release/deployment acceptance.

## Source, environment and isolation

- Frozen base: 579a007bb56e247836d97d7c9adcc157f848071f. Branch: allen/frontend-web3-stabilization. Final source manifest SHA-256: c4950c49575f5d165d5e59922e8665d5be20d6b98bc052110c35256d186d7532. Includes modified AND new source/tests, not reports/generated artifacts.
- All build/test/install child commands used cwd C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3. Registered original project was only an outer terminal launcher because the editor rejected sibling cwd. Absolute paths and explicit child cwd kept task writes isolated.
- Windows/Git Bash; Git 2.52.0.windows.1; Node 24.12.0; npm 11.6.2; TypeScript 5.9.3; Prisma CLI/Client 5.22.0; thirdweb 5.121.6; Next 15.5.25; Playwright 1.63.0, Chromium 153.0.8010.12 (revision 1243). CI uses Node 22: this is NOT a Node 22 result.
- Locked npm ci, lifecycle scripts disabled, no audit/fund/force/legacy-peer-deps. Required registry tarballs, Prisma engines and Chromium downloads were separate from runtime traffic. No dependency/lockfile edits. Optional install hooks not run; esbuild used installed platform binary.
- External run.cjs constructs child environments from an OS-variable whitelist, removes inherited auth/debug/preload/provider configuration and supplies inspected synthetic public API/auth values. Empty task npm configs and task npm/browser/tool caches; no real dotenv values copied or loaded.
- Prisma generate used inert datasource syntax at 127.0.0.1:1 and explicit task-owned downloaded engine paths. Generation is NOT a DB test and made no database connection.
- Node runtime rejects non-loopback sockets. Portal browsers intercept API/auth, reject unexpected origins, disable service workers and restrict DNS. Web3 harness fulfills documents/data in memory and denies external traffic. Loopback guard alone is not DB authorization; only inspected fixture-backed API suites ran.
- Production builds sequential; fresh task dependencies/output only, no original caches. Later task-local compiler caches retained.

## Baseline to final

| Check | Unmodified-base baseline | Final | Scope |
| --- | --- | --- | --- |
| Root typecheck | PASS | PASS | Shared build + workspace typechecks, no SQL |
| Customer production build | PASS | PASS | Synthetic public API config |
| Admin production build | PASS | PASS | Synthetic public API config |
| API build | PASS | PASS | Compile only |
| Customer/admin/UI lint | PASS | PASS | Final includes Web3 lint |
| Web3 core/SDK | 52 passed | 64 passed | Installed SDK, offline fixtures |
| Shared UI unit | 17 passed | 31 passed | Final includes 11 existing scope + 3 demo controls |
| Web3 browser | 42 passed | 50 passed | In-memory synthetic fixtures |
| Customer browser | 59 passed | 73 passed | Intercepted API/auth |
| Admin browser | 138 passed | 138 passed | Intercepted API/auth |
| API Web3 boundary/feature | 33 passed / 2 failed | 35 passed | Unchanged 5-second test timeout |
| API HTTP security | NOT RUN | 47 passed | In-memory DB/rate fixtures, ephemeral owned HTTP |
| Offline connector | NOT RUN | 46 passed | Overlaps full 64 |
| Persistent synthetic demo | BLOCKED | BLOCKED | Occupied 3002/3003; no store/journeys |

All final suites listed have zero failures/skips. Counts overlap targeted/full reruns and may include parent tests; do not sum them. Builds provide no test counts. Root npm test is API-only; root validate omits browser/connector suites. Full API unit/E2E, all-workspace lint and DB offline/SQL suites were NOT RUN.

## Failures and interpretation

- Initial install hit bounded 600-second timeout. Cached retry at SAME limit, with 60-second fetch timeout/one retry, passed. No longer timeout substituted.
- Prisma generation twice blocked an attempted engine download under offline guard. Explicit paths to task-owned engines then allowed offline generation; no schema change/stubbing.
- API baseline: one disabled-provider test exceeded 5000ms, then next mock assertion failed after late work. Final run passed at unchanged limit with no API edits. Warm cache/reduced contention is plausible, not a proven root cause.
- Red regressions before product changes: frontend 8 failed/1 passed; Web3 core 6 failures plus separate expired-partial failure; Web3 browser 5 scenarios plus parent failed. First frontend green exposed a broad NEW alert locator; it was narrowed without weakening original negative assertions. See issues-and-fixes.md.
- Initial external runner/preflight syntax errors occurred before intended commands and were corrected, not product failures. Initial runner SyntaxError did not reach npm or enter ledger.
- Demo preflight exit 2 is BLOCKED, not an assertion failure. Foreign listeners 3002/3003 were not contacted/reused/killed. No reset/store/server/demo journey launched.

## Browser evidence and limits

1. **Isolated synthetic:** scripts/web3-browser-test.mjs exercises disabled/synthetic/testnet-shaped, fresh/partial/stale/expired/error/wrong-chain/unknown/zero, global-versus-scoped grants, logout/session replacement, malicious metadata/links and simulated resume. These are NOT real testnet observations. Three no-network TSX controls retain demo wording/examples, not full browser journeys.
2. **Intercepted API-shaped:** production Next listeners on 43102/43103 with API/auth fixtures, scope denial, session invalidation, capability revalidation, error/empty/unsupported and selected verifier/ID states. No connected API/Supabase acceptance.
- New responsive checks: 320/375/768/1440 x 900, explicit test choices, reduced-motion media. Skip focus/mobile navigation/no horizontal overflow pass. No manual human review, screen-reader/contrast certification or cross-browser acceptance claimed.
- Core login/reservation/document/ID/points journeys under full Web3 outage and expanded in-flight verifier/QR A/B matrix remain incomplete. Current last-response labeling mitigates stale claims; DTO lacks authoritative expiry metadata, so timed browser expiry remains pending.
- Failure screenshots are retained as failure evidence; final screenshots are synthetic, not visual-baseline certification. No persistent-demo screenshot exists.

## Blocked and not run

- Full demo: BLOCKED foreign listeners. [demo-exercise.md](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/demo-exercise.md>).
- Exact browser TTL: BLOCKED contract metadata dependency; no guessed TTL, polling or DTO change.
- Node 22, full accessibility/cross-browser and production-wide SDK/bundle audit: NOT RUN. Harness SDK/secret exclusion passed, narrower scope.
- Roadmap attachment/pages 3, 9, 11 unavailable / NOT VERIFIED; confidential whitepaper not substituted.
- Hosted failure cause NOT VERIFIED: no current deploy ID/commit/time/stage log or permitted authenticated connector. Exact request in coordination-and-eod.md.
- DB execution, actual testnet/provider reads, independent block comparison, live auth/storage, provider pricing/spending and release approval: NOT RUN / outside authority. Historical runtime/RLS/checksum matters are owner questions.

## Full executed command ledger

[commands.jsonl](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/commands.jsonl>) records exact executable/args, cwd, start/end UTC, duration, exit/signal, runtime, frozen base and per-command tracked-diff hash. Tracked-diff hashes exclude then-untracked regressions; final-source-identity.json includes them for final identity. No final hash is retroactively claimed for earlier test revisions. All rows use isolated cwd above.

| Log / label | Start UTC | Seconds | Exit |
| --- | --- | ---: | ---: |
| [install.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/install.log>) | 2026-10-07T02:12:07.226Z | 600.12 | TIMEOUT |
| [install-retry-cached.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/install-retry-cached.log>) | 2026-10-07T02:22:41.658Z | 383.76 | 0 |
| [prisma-engine-download.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/prisma-engine-download.log>) | 2026-10-07T02:29:46.633Z | 1.90 | 0 |
| [chromium-download.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/chromium-download.log>) | 2026-10-07T02:29:46.614Z | 31.91 | 0 |
| [prisma-generate.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/prisma-generate.log>) | 2026-10-07T02:30:28.606Z | 6.00 | 1 |
| [baseline-web3-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-web3-browser.log>) | 2026-10-07T02:30:28.733Z | 19.49 | 0 |
| [prisma-generate-diagnostic.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/prisma-generate-diagnostic.log>) | 2026-10-07T02:31:11.008Z | 5.04 | 1 |
| [prisma-generate-isolated-engines.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/prisma-generate-isolated-engines.log>) | 2026-10-07T02:31:26.627Z | 3.53 | 0 |
| [baseline-typecheck.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-typecheck.log>) | 2026-10-07T02:31:39.355Z | 95.50 | 0 |
| [baseline-build-customer.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-build-customer.log>) | 2026-10-07T02:33:14.866Z | 90.40 | 0 |
| [baseline-build-admin.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-build-admin.log>) | 2026-10-07T02:34:45.264Z | 60.52 | 0 |
| [baseline-build-api.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-build-api.log>) | 2026-10-07T02:35:45.784Z | 31.64 | 0 |
| [baseline-web3-unit.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-web3-unit.log>) | 2026-10-07T02:36:17.425Z | 9.51 | 0 |
| [baseline-ui-unit.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-ui-unit.log>) | 2026-10-07T02:36:26.933Z | 0.85 | 0 |
| [baseline-api-web3-boundary.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-api-web3-boundary.log>) | 2026-10-07T02:36:56.991Z | 33.60 | 1 |
| [baseline-frontend-lint.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-frontend-lint.log>) | 2026-10-07T02:37:30.592Z | 40.51 | 0 |
| [baseline-customer-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-customer-browser.log>) | 2026-10-07T02:36:56.970Z | 86.33 | 0 |
| [baseline-admin-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/baseline-admin-browser.log>) | 2026-10-07T02:38:23.306Z | 160.30 | 0 |
| [web3-regression-before-core.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/web3-regression-before-core.log>) | 2026-10-07T02:44:11.074Z | 1.29 | 1 |
| [web3-regression-before-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/web3-regression-before-browser.log>) | 2026-10-07T02:44:11.107Z | 36.29 | 1 |
| [web3-regression-before-expired-partial.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/web3-regression-before-expired-partial.log>) | 2026-10-07T02:45:09.054Z | 1.11 | 1 |
| [frontend-state-red-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-state-red-browser.log>) | 2026-10-07T02:44:47.823Z | 77.59 | 1 |
| [web3-regression-after-full.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/web3-regression-after-full.log>) | 2026-10-07T02:46:16.176Z | 15.47 | 0 |
| [web3-regression-after-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/web3-regression-after-browser.log>) | 2026-10-07T02:46:16.091Z | 28.63 | 0 |
| [frontend-mode-baseline.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-mode-baseline.log>) | 2026-10-07T02:47:00.682Z | 0.96 | 0 |
| [web3-regression-after-offline.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/web3-regression-after-offline.log>) | 2026-10-07T02:47:28.496Z | 4.64 | 0 |
| [web3-regression-after-lint.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/web3-regression-after-lint.log>) | 2026-10-07T02:47:28.544Z | 8.47 | 0 |
| [web3-regression-after-diff-check.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/web3-regression-after-diff-check.log>) | 2026-10-07T02:48:20.746Z | 0.45 | 0 |
| [frontend-mode-green.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-mode-green.log>) | 2026-10-07T02:49:01.825Z | 1.29 | 0 |
| [frontend-state-customer-build.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-state-customer-build.log>) | 2026-10-07T02:49:01.871Z | 54.24 | 0 |
| [frontend-state-green-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-state-green-browser.log>) | 2026-10-07T02:50:09.270Z | 19.22 | 1 |
| [frontend-preservation-node-tests.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-preservation-node-tests.log>) | 2026-10-07T02:51:25.481Z | 2.08 | 0 |
| [frontend-customer-lint.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-customer-lint.log>) | 2026-10-07T02:51:25.519Z | 14.12 | 0 |
| [frontend-state-green-browser-final.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-state-green-browser-final.log>) | 2026-10-07T02:51:25.481Z | 21.49 | 0 |
| [frontend-customer-typecheck.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-customer-typecheck.log>) | 2026-10-07T02:51:39.646Z | 13.12 | 0 |
| [frontend-customer-full-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/frontend-customer-full-browser.log>) | 2026-10-07T02:52:11.123Z | 94.35 | 0 |
| [demo-exercise-preflight.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/demo-exercise-preflight.log>) | 2026-10-07T02:59:03.456Z | 0.24 | 1 |
| [demo-exercise-preflight-final.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/demo-exercise-preflight-final.log>) | 2026-10-07T02:59:23.893Z | 0.61 | 2 |
| [final-typecheck.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-typecheck.log>) | 2026-10-07T03:01:59.384Z | 50.63 | 0 |
| [final-build-customer.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-build-customer.log>) | 2026-10-07T03:02:50.021Z | 45.39 | 0 |
| [final-build-admin.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-build-admin.log>) | 2026-10-07T03:03:35.409Z | 52.42 | 0 |
| [final-build-api.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-build-api.log>) | 2026-10-07T03:04:27.831Z | 32.56 | 0 |
| [final-api-web3-boundary.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-api-web3-boundary.log>) | 2026-10-07T03:05:37.475Z | 12.34 | 0 |
| [final-api-security-http.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-api-security-http.log>) | 2026-10-07T03:05:49.817Z | 16.28 | 0 |
| [final-web3-unit.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-web3-unit.log>) | 2026-10-07T03:06:20.062Z | 10.82 | 0 |
| [final-ui-frontend-unit.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-ui-frontend-unit.log>) | 2026-10-07T03:06:30.889Z | 2.35 | 0 |
| [final-web3-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-web3-browser.log>) | 2026-10-07T03:06:33.236Z | 30.46 | 0 |
| [final-frontend-lint.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-frontend-lint.log>) | 2026-10-07T03:07:03.699Z | 33.20 | 0 |
| [final-customer-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-customer-browser.log>) | 2026-10-07T03:06:20.001Z | 136.53 | 0 |
| [final-admin-browser.log](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-admin-browser.log>) | 2026-10-07T03:08:36.536Z | 166.82 | 0 |

## Preservation and final review

[preservation-comparison.json](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/preservation-comparison.json>) confirms original HEAD, index SHA-256, source branch pointers, 386 tracked fingerprints and empty untracked inventory match start. Ignored runtime/build artifacts and unsaved editor buffers are NOT covered. No protected edit or staged path in task worktree; 11 source/test files changed. Existing negative tests retained.
Final socket inspection: no listener on 43101/43102/43103; unrelated 3002/3003 remain untouched. Browser suites finished and owned servers exited; no task-owned demo processes were started. See run-context.json and [final-source-identity.json](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-source-identity.json>).

## Final synthetic screenshots

- [synthetic-mobile-dashboard.png](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/final-customer-results/frontend-state-regression--9efc3-ced-motion-scrolling-at-375/synthetic-mobile-dashboard.png>)
