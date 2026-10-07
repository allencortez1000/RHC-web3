# Bounded demo execution result — incomplete, servers stopped

## Final attempt (03)

**13 PASS, 0 FAIL, 1 BLOCKED, 1 NOT RUN.** The original 540000ms supervisor deadline interrupted delayed503 J4. J5 delayed503 had not started. No limit was increased and no further launch was made after the deadline. Parent's 900000ms outer timeout did not expire.

| Journey | HTTP503 | Connection failure | Delayed503 |
| --- | --- | --- | --- |
| J1 supported login/profile/denial | PASS | PASS | PASS |
| J2 create/shared reservation/denied foreign cancel/cancel/reload/zero | PASS | PASS | PASS |
| J3 synthetic documents/separate approval/isolation/empty search | PASS | PASS | PASS |
| J4 DigitalID/unavailable QR/pending business review/points | PASS | PASS | BLOCKED — supervisor deadline |
| J5 public/navigation/focus/reduced motion/logout/staff independence | PASS | PASS | NOT RUN |

All four final supplemental groups **PASS**:
- Actual synthetic Web3 unsupported cap and unavailable paused field.
- Real verifier A→B late-response isolation, genuine not-found, lookup-free legacy-ID unavailable state, no stale fields/QR.
- Pending real account/ID reads during supported persona change; Maya data does not return in Noah's workspace.
- Pending real account/ID reads across logout; protected state stays cleared.

The six delayed actual successful DEMO responses were **BROWSER_CANCELLED** after the UI transitions. Their SHA-256/timing records are preserved. This demonstrates cancellation and stale-state isolation; it does not claim stale bytes reached the new component.

## Evidence and immutable history

External base:
`../RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/demo/`

Consolidated new report:
`summary-2026-10-07T05-30-02-509Z/summary.json` and `summary.md`.

| Attempt | External directory | Original outcome | Evidence |
| --- | --- | --- | --- |
| 01 | `attempt-2026-10-07T04-56-04-609Z-6b2cb6` | 3 PASS / 4 FAIL / 8 BLOCKED | 39 screenshots; original helper failures and 10 runtime-preload PID-reuse error lines preserved |
| 02 | `attempt-2026-10-07T05-06-16-237Z-40019e` | 12 PASS / 3 FAIL | 71 screenshots + 71 accessibility snapshots; all supplemental groups pass; remaining helper assumed customer skip target on admin |
| 03 | `attempt-2026-10-07T05-17-27-449Z-57305b` | 13 PASS / 1 BLOCKED / 1 NOT RUN | 54 screenshots + 54 accessibility snapshots; all supplemental groups pass; original overall deadline honored |

Earlier failures were investigated in `RUN-01-INVESTIGATION.md` and `RUN-02-INVESTIGATION.md` before retry. Corrections were only to owned helpers: response-body eviction after admin navigation, field/label accessible-name matching, PID reuse in runtime audit, and admin skip target. No product changes and no expectations or limits weakened.

Each attempt used a new absent canonical external store, initialized by the real hub. Each attempt's cells shared that persistent world. All three worlds remain preserved; no reset/import or direct business-record rewrite occurred. The final world contains all three created-and-cancelled reservations and all three approved exercise documents; the interruption did not erase earlier writes. Summary includes world revisions/hashes and mutation counts without logging session tokens.

**Do not read the final raw top-level `results.json.status: NOT RUN` as zero execution:** the worker was killed during the supervisor's deadline cleanup before its final summary assignment. Its durable per-cell rows contain 13 PASS, one RUNNING, one NOT RUN. Only the new consolidated report normalizes that interrupted RUNNING row to BLOCKED. Original files and hashes remain intact. Attempt 02's delayed503 J4 PASS is historical, not promoted to an attempt 03 pass. There is no fabricated single-run 15/15.

Parent outer logs/audits are in the external timestamp root:
- `demo-owned-exercise-01.log` / `demo-owned-exercise-01-runtime.jsonl`
- `demo-owned-exercise-02.log` / `demo-owned-exercise-02-runtime.jsonl`
- `demo-owned-exercise-03.log` / `demo-owned-exercise-03-runtime.jsonl`

## Runtime, network and cleanup

- Actual Node executable for supervisor, both direct Next roots, actual customer/admin listener PIDs and browser-driving Node: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/tools/node-v22.20.0-win-x64/node.exe`, version **v22.20.0**.
- Final actual listener PIDs: customer **29224**, admin **28792**; browser-driving Node **18776**. These are historical evidence only, **not safe future kill targets**.
- Chromium **153.0.8010.12**, installed `chromium-1243/chrome-win64/chrome.exe`; fresh profile/contexts, service workers blocked.
- New runtime files are append-only `node-runtime-<pid>-<thread>.jsonl`, matched to parent PID and OS process creation identity. Historical attempt 01 `.json` files remain unchanged.
- Child NODE_OPTIONS intentionally replaces the parent's 43102/43103 intercepted-suite preload with demo runtime auditing plus exact-owned 3002/3003 guard. Browser requests/WS permit only the owned exact origins/HMR endpoints. Selected injected failures remain only the two Web3 endpoints; timing-only holds release actual business bytes unchanged.
- Final browser unexpected-error list: **empty**. Final forbidden/boundary-blocked request list: **empty**. Final server-error scan: **empty**. These findings are separate from the deadline result and do not turn it into a pass.
- Each attempt's supervisor and parent report zero remaining owned processes. Final independent OS check at **2026-10-07T05:29:58Z** found **no 3002/3003 listeners**, no creation-identity-matched recorded owned processes and no real dotenv filenames. No foreign process was contacted or killed.
- All three parent runs retained the same protected source manifest SHA-256: `c4950c49575f5d165d5e59922e8665d5be20d6b98bc052110c35256d186d7532`. Existing staged/untracked product work was not edited, staged or committed by this task.

## Owner handoffs

1. **Parent/release owner:** final acceptance remains incomplete because of the original bound, not a proven product fault. Delayed503 J4 was interrupted; corrected delayed503 J5 has not completed. Decide on a separately authorized bounded targeted follow-up. A full restart may hit the same overall deadline; do not silently increase limits or merge historical passes into a clean 15/15.
2. **Protected frontend owners:** no confirmed protected-code defect was established. All observed assertion failures were traced to owned-helper mistakes; first failures remain available for review. No broad product fix is requested or made.
3. **Acceptance owner:** account-status PENDING, non-Web3 synthetic failure metrics, real backend/provider/database, formal accessibility certification and server-restart persistence remain NOT RUN/outside the demonstrated scope. Business-review pending and pending network requests are not account-status PENDING.

## Exact safe bounded restart (not executed)

Coordinate exclusive `.next` access with the parent first. From the worktree:

```sh
sh docs/release/2026-11-10/allen/20261007T040805Z/evidence/demo/restart-bounded.sh
```

That script contains only this exact bounded parent-runner invocation:

```sh
'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/tools/node-v22.20.0-win-x64/node.exe' \
  'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/run.cjs' \
  demo-owned-exercise-04 offline 900000 \
  'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/demo/supervisor.cjs' \
  --execute --parent-builds-complete --parent-intercepted-suites-complete \
  --runner 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/run.cjs'
```

The unused label `demo-owned-exercise-04` refuses log overwrite if already used. This is a full bounded fresh-store rerun, **not** an unattended server or a reset/reuse of an earlier store. Ports and dotenv filenames are rechecked immediately; any foreign listener means BLOCKED with no contact/kill/reuse/alternate origin. The original 540000ms supervisor limit and 900000ms outer limit remain. Owned cleanup runs on completion/failure/deadline. Servers remain stopped now.
