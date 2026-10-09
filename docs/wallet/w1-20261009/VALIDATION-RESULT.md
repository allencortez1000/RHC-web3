# W1 — Offline validation ledger

**Evidence date:** 2026-10-09; **device:** DESKTOP-5TQ68F9; **runtime:** local pinned Node v22.20.0; **network:** synthetic-only.

## Final new W1 runs

| Test suite | Actual result | Evidence |
|---|---|---|
| `wallet-foundation.unit.mjs` | **24 PASS / 0 FAIL** | `followup-unit.log` |
| `wallet-foundation.browser.cjs` | **7 PASS / 0 FAIL** | `followup-browser.log` |
| Customer-web TypeScript typecheck | **PASS** (exit 0; no emit/incremental) | `followup-typescript.log` |
| Scoped ESLint (three TS/TSX files) | **PASS** (exit 0; no output/warnings) | `followup-eslint.log` |

Final exact executable arguments, UTC timestamps, checksums, exits and elapsed times: `verification-followup-ledger.json` in the external W1 evidence folder. The separate initial run is retained as `verification-ledger.json`.

## Existing offline regression runs (separate from W1 tests)

| Suite | Result |
|---|---|
| Customer synthetic mode/provenance | **3 PASS** |
| Frontend scope and integration guard | **11 PASS** |
| Thirdweb read-provider offline tests | **46 PASS** |
| Installed Thirdweb SDK offline test | **18 PASS** (one parent + 17 child assertions; no skips) |
| Existing Web3 browser synthetic suite | **50 PASS** (one parent + 49 child assertions) |

All these were run with existing source/fixtures only, without reconfiguration or deployment. Count each suite's reported tests as its runner reports them; overlapping high-level functionality is not independent feature acceptance.

## Planned 26 W1 acceptance categories

| Category | Status | Evidence or qualification |
|---|---|---|
| 01 Disabled/unconfigured policy | PASS | unit01, browser UI04 |
| 02 Missing/denied RHC session | PASS | unit02 |
| 03 Synthetic connect success | PASS | unit03, browser UI01 |
| 04 Cancellation and late cleanup | PASS | unit04, browser UI02 |
| 05 Connection timeout/rejection/retry | PASS | unit05–06 |
| 06 Duplicate connect refused | PASS | unit07 |
| 07 Disconnect success | PASS | unit08, browser UI01 |
| 08 Disconnect failure | PASS | unit09 |
| 09 Logout during connect | PASS | unit10 |
| 10 Account A→B isolation | PASS | unit11–12, browser UI03 |
| 11 Intentional synthetic wallet switch | PASS | unit24 (release, reconnect, distinct handle) |
| 12 Chain change/unsupported | PASS | unit13–14, browser UI05 |
| 13 Disabled/config revision change | PASS | unit15–16, browser UI04 |
| 14 Unmount/dispose | PASS | unit17–18, strict-mode browser mount |
| 15 Old cleanup vs newer wallet | PASS | unit19 |
| 16 Unknown vs unlinked state | PASS | unit20 |
| 17 Synthetic linked/revoked/conflict states | PASS | unit21; never server-authoritative |
| 18 No RHC role escalation | PASS | unit22 + immutable false verification |
| 19 No token/points conflation | PASS | unit22 + UI warning |
| 20 Forbidden real wallet/API calls absent | PASS | unit23 static negative |
| 21 Browser persistence isolation | PASS | browser UI07 reload |
| 22 Offline egress guard | PASS | Node socket guard + browser offline/routing denies |
| 23 Keyboard/focus/status/accessibility sample | PASS | browser UI01/UI02 focus restoration and status |
| 24 Mobile/reduced-motion sample | PASS | browser UI06 at width 375 |
| 25 Prior application/Web3 regression sample | PASS | 3 + 11 + 46 + 18 + 50 existing tests |
| 26 Preservation, cleanup and no unrelated work | PENDING until final preservation check | `PRESERVATION-RESULT.md` |

## Historical red-to-green notes

- First isolated harness build failed because the external evidence directory could not resolve `react/jsx-runtime`; fixed by adding the checked-in workspace node_modules search path in the **new browser test only**.
- Next browser trial used ambiguous Playwright substring matching; fixed by using exact button names in the **new browser test only**.
- Initial scoped lint identified a single `prefer-const` error and three warnings; updated only new TS/TSX files, then scoped ESLint became clean.
- Final W1 tests, browser, typecheck and lint all PASS. Historical failures were not reclassified as successes.

## Explicit limitations

This is **synthetic offline test acceptance only**. No independent security audit, production readiness, live Thirdweb custom auth/wallet enrollment, backend link, customer UAT, deployed contract/supply verification, public network, signing, or client release acceptance is claimed.

## Acceptance-review superseding test result — 2026-10-09

The first candidate's **24-unit/7-browser** results above remain historical. After technical review and the disconnect-timeout fix, the **authoritative current W1 result is 25 unit PASS and 7 browser PASS**, with customer TypeScript `--noEmit` PASS and scoped ESLint PASS. Five existing regression suites also passed: 3, 11, 46, 18 and 50 runner-reported tests. No skipped or failed acceptance-review suite. See `ACCEPTANCE-REVIEW.md` and external `w1-acceptance-review-20261009/acceptance-test-ledger.json`. Human internal UAT remains NOT RUN / NOT ACCEPTED.
