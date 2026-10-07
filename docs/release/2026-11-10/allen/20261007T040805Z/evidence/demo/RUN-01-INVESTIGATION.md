# Attempt 01 — preserved failure and bounded helper-only retry rationale

Authorization was received before launch. Invocation used the parent's async offline CLI, official absolute Node v22.20.0, outer 900000ms and unchanged supervisor 540000ms / per-check 75000ms limits.

External first attempt: `../RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/demo/attempt-2026-10-07T04-56-04-609Z-6b2cb6/`.
Parent logs: external `demo-owned-exercise-01.log` and `demo-owned-exercise-01-runtime.jsonl`.

## Original outcomes (not overwritten)

| Journey | HTTP503 | Connection failure | Delayed503 |
| --- | --- | --- | --- |
| J1 profile/login | PASS | FAIL | FAIL |
| J2 reservation | FAIL | BLOCKED | BLOCKED |
| J3 documents | PASS | BLOCKED | BLOCKED |
| J4 DigitalID/points | PASS | BLOCKED | BLOCKED |
| J5 public/navigation/logout | FAIL | BLOCKED | BLOCKED |

Totals: 3 PASS, 4 FAIL, 8 BLOCKED, 0 NOT RUN. The blocked cells depend on failed login setup, not product outage failures.

- Real late verifier A→B / real not-found / lookup-free unavailable: PASS.
- Pending real account/ID responses across persona change: PASS.
- Pending real account/ID responses across logout: PASS.
- All six held actual hub responses were HTTP200 DEMO responses and **BROWSER_CANCELLED**, with hashes retained. This is cancellation/isolation coverage, not a claim that stale data was delivered to a new scope.
- Baseline unsupported field supplemental: FAIL at helper exact-text locator.
- Browser report: zero unexpected errors and zero boundary-blocked requests. This does not erase separate server-log failures below.
- Customer/admin listener PIDs and browser-driving Node all attested the official executable and v22.20.0. Both supervisor and parent cleanup reports show no remaining owned processes; supervisor final listener list empty. No timeout exceeded.

## Evidence-based helper defects

1. **Admin login response body race.** Both later J1 failures are Chromium `Network.getResponseBody: No resource with given identifier found`, explicitly saying the response was navigated away from. Product `DemoPersonaForm.openResult` uses `window.location.assign` for admin after the adapter writes `rhc_admin_demo_session`. The helper awaited `enter.click()` before reading the response body. Correction: retain the actual POST HTTP200 assertion and URL/heading assertions, then read/validate the actual application session cookie written by supported login. No cookie/session fabrication or product change.
2. **Reservation selector.** J2 could not find exact `getByLabel('Available property')`; real hub request succeeded, no HTTP errors, persisted world still has 32 AVAILABLE properties. Source wraps the select and all option text inside its label. Correction: scope the combobox to the explicit 'Available property' label, retain visibility and accessible-name assertions. Do not bypass the UI with a create API request.
3. **Command trigger accessible name.** J5 exact `'Navigate'` failed. `packages/ui/src/index.tsx` renders a label span plus visible `Ctrl K` kbd text inside the button. Correction: match the Navigate prefix and assert the full name includes Ctrl K plus `aria-haspopup=dialog`. All focus/keyboard assertions remain.
4. **Web3 field exact-text matcher.** Baseline locator could not find an exact phrase although the region existed. `TokenField` puts the status span and fallback text together inside the dd. Correction: scope by Cap/Paused flag dt, assert visible dd contains the expected phrase AND assert exact status span unsupported/unavailable. No weaker product expectation.
5. **Runtime audit PID reuse.** Customer server log contains `EEXIST node-runtime-6336-0.json` (and other PIDs) from our preload's exclusive per-PID file. Next short-lived workers can reuse Windows PIDs; this is an owned-helper defect, not a product bug. Correction: append immutable JSONL instance records containing estimated process start time; supervisor matches the record to current OS creation identity and parent PID. Preserve all earlier records. Also make server Error/TypeError/etc. and network-guard diagnostics visible in supervisor status instead of relying only on browser errors.

## Retry boundaries

Retry 02 will start only after syntax/pure/preload/dry-run validation, through the same parent runner with a unique label and a new absent canonical store. Previous store/logs/screenshots remain untouched. No reset/import or product changes. All 15 cells and supplemental checks run again; no selected failures are removed and no deadlines are increased. The supervisor rechecks fixed ports/dotenv names and owns only its newly spawned trees. New screenshots also retain sanitized accessibility snapshots to make any further selector failure diagnosable without guessing.

No protected product failure has been established by these first-attempt errors. Any actual product assertion failure discovered on retry must be reported to its owner, not fixed here.
