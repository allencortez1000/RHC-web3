# Attempt 02 — complete matrix, admin skip-target helper defect

External attempt: `../RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/demo/attempt-2026-10-07T05-06-16-237Z-40019e/`.
Parent label `demo-owned-exercise-02`. All original logs, immutable helper snapshot, JSONL runtime-instance audit, store, screenshots and accessibility snapshots remain unchanged.

All 15 cells executed: **12 PASS, 3 FAIL, 0 BLOCKED, 0 NOT RUN**. J1/J2/J3/J4 passed under each HTTP503, connection abort, delayed503. All three J5 failures occurred at the final admin-mobile skip-focus assertion, after customer/public layout, command-menu focus, customer logout and independent staff session checks.

All supplemental checks passed: baseline unsupported/unavailable token fields; real verifier A→B plus not-found/unavailable; pending real account/ID reads during persona switch; pending real reads during logout. All six held successful real DEMO responses were browser-cancelled after transition, not falsely labeled delivered.

Both supervisors report zero remaining owned processes. Post-cleanup 3002/3003 listener list empty. Parent outer timer did not expire; no internal limit increased. Browser unexpected-error list and blocked-request list empty; supervisor server-log findings empty. Actual customer/admin listener/root and browser-driving Node version/path attestations passed. The prior runtime PID-reuse collision did not recur with append-only creation-identity-matched audits.

## Why one final helper-only rerun is justified

`results.json` J5 failures point to `layout(staff,390)` and `locator('#main-content')`, not a focus mismatch on an existing element: the element was absent. The retained `J5-http503-staff-failure.aria.txt` starts with the real skip link URL **#admin-main-content**. Product `apps/admin-web/app/admin-data.tsx:1409` uses that href and `:1437` defines the focusable target with `tabIndex={-1}`. The owned common layout helper incorrectly hardcoded the customer/public target for admin.

Correction is confined to that helper: select the source-defined target by exact current origin, assert the skip link href equals it, press Enter, and assert that actual target receives focus. No assertion is removed, no timeout widened, no product edited. A final full 15-cell run with a fresh canonical store and the original 540000ms supervisor/900000ms outer limits is planned, with port/env ownership rechecked before any request. Earlier failures remain evidence; they are not rewritten as passes.

No protected product defect is established by this failure. If the corrected assertion fails on the actual admin target, report to the admin frontend owner without editing protected code.
