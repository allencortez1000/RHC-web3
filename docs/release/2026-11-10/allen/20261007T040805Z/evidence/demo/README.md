# Owned persistent demo exercise — execution evidence

Scope: `allen/frontend-web3-stabilization`, worktree `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3`. Only new helper/evidence files in this directory were authored. No product, contract, backend, dependency, existing helper, staged-file, or branch changes. No staging or commit.

**Current result: incomplete, servers stopped.** Parent authorized execution after builds and intercepted suites completed. Three bounded attempts are preserved. Final attempt: **13 PASS / 0 FAIL / 1 BLOCKED / 1 NOT RUN**, all four supplemental groups PASS; original supervisor deadline interrupted delayed503 J4. See [RESULTS.md](RESULTS.md) for the authoritative matrix, cleanup/runtime evidence, prior failures, owner handoffs and exact bounded restart command. No new launch is pending automatically. Future runs still require exclusive `.next` use and parent coordination.

## Files

- `expected-outcomes.json`: five selected journeys × three failures, written before any execution; all 15 cells initially **NOT RUN**. Includes explicit coverage gaps.
- `supervisor.cjs`: Windows-only bounded direct-Next process supervisor; default action is not execution (exactly one explicit mode required).
- `boundary.cjs`: exact-origin HTTP/WS policy, OS process/listener metadata, canonical path/filename checks, strict child Node outbound guard.
- `exercise.cjs`: supported browser login, persistent synthetic workflows, deterministic Web3-only failure injection, separate identity contexts, screenshots and incremental outcomes.
- `runtime-preload.cjs`: actual Node PID/PPID/thread/execPath/version/role evidence for Next roots, server descendants and browser-driving Node; installs the exact-owned guard before app code.
- `real-response-delay.cjs`: narrow page/session/GET-only holds of actual successful DEMO hub responses, no business-data replacement.
- `races.cjs`: same-document late-verifier, pending-account switch/logout, real not-found and lookup-free unavailable/stale-QR assertions.
- `real-response-delay.test.cjs`: in-memory tests of scope, one real-response forwarding operation, byte hash/response identity, cancellation classification and bounded expiry; no browser or network.
- `self-test.cjs`: pure parser/denial/matrix checks, no sockets or servers.
- `validate.cjs`: syntax + self-test + OS-only dry-run, retaining separate logs externally for every validation attempt.
- `summarize.cjs`: preserves raw attempts and writes a NEW external normalized summary; independently checks OS listeners/recorded process identities without requests or kills.
- `RESULTS.md`, `RUN-01-INVESTIGATION.md`, `RUN-02-INVESTIGATION.md`: actual outcomes and evidence-based helper-only retry rationale.
- `restart-bounded.sh`: exact manual bounded parent-runner invocation, not executed after the final timeout.

## Safe invocation now

From the worktree, use the supplied absolute official Node v22.20.0 executable:

```sh
'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/tools/node-v22.20.0-win-x64/node.exe' docs/release/2026-11-10/allen/20261007T040805Z/evidence/demo/validate.cjs
```

This never launches Next/Chromium, imports the parent runner, requests application URLs, or creates a store. It runs one **no-app** Node child to exercise the runtime audit preload (not server/browser runtime evidence). It checks filenames only for real dotenv files and reads local `netstat.exe -ano`/`Win32_Process` metadata, without probing listeners.

Node22 preparation validation passed at **2026-10-07T04:45:51Z**: nine syntax checks, pure boundary tests, in-memory delay tests, no-app runtime-preload check, and OS-only dry-run. Both 3002/3003 were free and no real dotenv filenames were found. Runtime evidence recorded the exact supplied executable and `v22.20.0`, role `validation-no-app`. Logs: external `demo/validation-2026-10-07T04-45-45-588Z/`. That preparation-only report recorded `interceptedSuitesComplete: false`; the later parent authorization enabled the three recorded runs. Availability is a point-in-time observation, never permission to reuse a later listener.

## Parent invocation AFTER explicit follow-up

Use the supplied absolute **Node v22.20.0** executable and parent module `docs/release/2026-11-10/allen/20261007T040805Z/evidence/run.cjs` (inside the worktree, not the external evidence root). The supervisor consumes `worktree`, `executable`, `environment('offline')` and the already-installed browser path. It checks its own executable against the parent's selected executable. No download or install is attempted.

In the parent's Node22 context, with the absolute `runnerModulePath` pointing to that module and `runner = require(runnerModulePath)`, `worktree = runner.worktree`:

```js
const path = require('node:path');
const supervisor = path.join(worktree,
  'docs/release/2026-11-10/allen/20261007T040805Z/evidence/demo/supervisor.cjs');
runner.run('demo-owned-exercise', [
  supervisor,
  '--execute',
  '--parent-builds-complete',
  '--parent-intercepted-suites-complete', // only after the parent's next launch notice
  '--runner', runnerModulePath,
], { timeout: 900000 });
```

Do not issue this invocation before the parent's explicit launch authorization, despite passing builds and an installed runtime. Parent outer timeout must exceed the 540-second exercise supervisor deadline plus cleanup; **900 seconds** is recommended. A hard OS kill of the supervisor cannot be handled by JavaScript; do not externally kill it or set a shorter wrapper timeout. Cooperative SIGINT/SIGTERM, child exit, normal failure and internal deadlines enter owned-tree cleanup.

## Process/store/network boundaries

1. Reject real `.env*` filenames (except `.example`) in root/customer/admin; never read their values. Check before launch and each child spawn. Reconstruct child environment from a small OS allowlist plus explicit synthetic demo settings; no inherited API keys, provider values, DB URL, proxy, preload or dotenv contents. Preserve only the parent-provided installed browser-cache path.
2. Use a unique new external attempt directory, canonicalize it and reject symlink/junction ancestors. Pass its **absent** `store` path as absolute `RHC_DEMO_STORE_DIR`. The fixture hub auto-initializes `world.json`. Never call reset/import, never write the world directly, and never reuse an existing store. All 15 cells share that one persistent store, including normal mutations. Do not reseed between failures/personas. Preserve the final world.
3. Check fixed ports 3002/3003 by OS metadata before launch, recheck immediately before each spawn, and inspect during execution. **Any foreign/wildcard occupancy = BLOCKED.** No connection to it, no port-based kill, no reuse, no alternate origin/port.
4. Direct `process.execPath` + installed `next/dist/bin/next dev -H 127.0.0.1 -p 3002/3003`, explicit app cwd, no npm launcher. Demo store forbids production mode, so this is development serving after the parent releases shared `.next` build paths. No API/backend server starts.
5. Record spawned root PIDs, creation identities and descendant trees. Attest that each listener belongs to the corresponding live root tree and is bound exactly to loopback before the browser's first request. **Require the listener PID and Next root PID runtime-preload files** to show the actual selected executable, `v22.20.0`, correct child role and exact guard before browser launch. Capture the browser-driving Node child's audit plus Chromium version/executable in results. The browser's supported login/title assertions provide application readiness; mere port occupancy or supervisor-only Node evidence is insufficient.
6. The prior `offline-network.cjs` allows arbitrary loopback and the new parent runner's intercepted-run preload permits 43102/43103; **neither authorizes demo traffic**. Child `NODE_OPTIONS` intentionally replaces the parent's preload with `runtime-preload.cjs`, which installs `boundary.cjs` and records actual child runtime evidence. No environment values, bearer tokens or command arguments are logged by that preload. This child preload rejects TCP outside exact owned 127.0.0.1:3002/3003 listeners (checked against current socket metadata and fresh supervisor ownership proof), hostname DNS, TLS, UDP and arbitrary named socket connections. If Next unexpectedly requires another endpoint, **BLOCKED** is the result—not a broader allowlist.
7. New temporary Chromium profile and fresh service-worker-blocked context per persona; exact HTTP origins only, including loopback rejection elsewhere. Only the two owned `/_next/webpack-hmr` WS endpoints can connect. No Playwright request client bypass, real providers, browser extensions, downloads, external images/proxies or remote fonts. Local optimized image paths are allowed; remote image proxy URLs are rejected. Chromium background networking/update/sync/resolver options are disabled/restricted. Reset/import and control mutations are blocked; harmless control GET is allowed.
8. Failures are injected **only GET** `/api/demo/web3/token` and `/api/demo/admin/integrations/thirdweb`: synthetic HTTP 503, connection abort, or 2500ms delayed 503. Never generic `fail_next_request`, account/profile/verifier business mocks, global latency, record overrides, DB manipulation, or store editing. Genuine authorization denials are normal hub responses, not injected failures. Parent-authorized timing-only holds are a separate operation, described below.
9. Finally close browser/contexts; supervisor stops only recorded live spawned trees with `taskkill /PID <owned> /T /F` and creation-identity-matched recorded survivors. Keep all logs, inspect remaining owned PIDs and listeners, and report CLEANUP FAILED/UNVERIFIED rather than claiming zero if cleanup cannot be verified. Actual failure and supervisor-deadline cleanup were exercised; both process owners and the independent final OS check found no owned processes/listeners remaining. This does not guarantee cleanup after an uncatchable OS kill.

## Expected coverage and honest limits

| Journey | Planned core assertions under each of the 3 Web3 failures |
| --- | --- |
| J1 | Supported Maya/Noah/staff login; source identities; allowed profile mobile edit persists; locked identity field genuinely denied |
| J2 | Create reservation; staff reads shared record; Noah cancellation denied; Maya cancel/reload; successful filtered-empty inventory metrics remain zero |
| J3 | Synthetic text submit/marked preview; separate staff approval; shared approved result after reload; Noah isolation; empty search |
| J4 | Maya issued Digital ID; Noah unissued ID/unavailable QR/disabled public verification; real eligibility denial; business-review pending; both real fixture points ledgers |
| J5 | Anonymous masked valid/revoked references; public mobile/skip navigation; 390/768/1440 customer layout; reduced motion; command-menu focus containment/return; customer logout leaves staff signed in |

Before the matrix, a separate real synthetic Web3 read checks unsupported cap and unavailable paused-field labels. Each matrix cell must observe the selected failure on **both** authorized Web3 preview surfaces before testing core workflows. No blanket 15/15 claim; incremental result cells can be PASS/FAIL/BLOCKED/NOT RUN. Fatal termination can leave RUNNING, meaning interrupted—not passed. Unexpected HTTP/page/console/network errors remain in evidence; expected fixture outages and genuine denials are separately labeled.

### Timing-only supplemental checks (actual results in RESULTS.md)

The follow-up explicitly permits delaying **actual** hub reads. `real-response-delay.cjs` only matches one chosen page and these exact customer-hub GET paths: Maya's canonical opaque verification reference, `/api/demo/me`, `/api/demo/me/rhc-id`. Private reads must carry that actor's exact currently selected real demo token; public verification must have no authorization header. No query variants, other pages, other sessions, other endpoints or writes match. At most six matching requests can enter one gate (to tolerate bounded duplicate reads), and each hold is capped at **8000ms**. Existing 75-second check and 540-second supervisor deadlines are unchanged.

A matched request uses `route.fetch({ maxRedirects: 0, maxRetries: 0, timeout: 7000 })` only after ownership validation. It must return HTTP200, `success: true`, `meta.provenance: DEMO`. Its actual response is retained and fulfilled without status/header/body overrides; SHA-256 is checked before release. There is no independent request-client bypass, second lookup, redirect following, broad business interception or non-Web3 error fabrication. Gate failures remain failures and close with the context/supervisor, never substitute business data. Browser-initiated cancellation after a transition is recorded as **BROWSER_CANCELLED**, not falsely claimed as late data delivered to the new scope. Holds are released in finally blocks.

- **Verifier A→B:** warm real routes, hold actual A, assert loading, use supported back/form navigation to revoked B, require the **same document marker**, render B before releasing A, and assert no return to VALID/A identity. This covers the supported navigation/unmount cancellation path; it does not bypass the application's abort mechanism to force stale data into React.
- **Not found / unavailable:** navigate to a genuinely absent opaque reference; assert the hub's real not-found state clears prior status/holder data. Then submit a legacy encoded internal ID: assert the product's own unavailable state and **zero verifier lookups**, not a fabricated unavailable response. No stale QR/public link remains.
- **Pending account reads → persona switch:** hold Maya's actual `/me` and `/me/rhc-id` after Refresh status; assert loading, sign out and select Noah via supported UI in the same document; only then release Maya. Assert Noah persists, old private profile/ID/QR does not return, and Noah's real unissued credential has the placeholder and disabled public-verification action.
- **Pending account reads → logout:** hold the same real reads, sign out, release, remain on login with no protected records/QR, and deny protected deep-link access. The login's intentional public source-persona labels are not misreported as leaked protected data.
- **Account-status PENDING remains NOT RUN:** pending requests and Noah's business-review PENDING do not mean account-status PENDING. Both canonical customer accounts remain ACTIVE; no status/seed rewrite is performed.
- **Non-Web3 failure metrics remain NOT RUN:** selected synthetic failures remain Web3-only. Natural read loading and successful filtered-empty zero are separate checks; no unchanged all-business regression interceptor is run.
- **Unavailable QR:** both J4's natural Noah case and the transition supplemental cover it, without QR-library mocking or payload replacement.
- No formal accessibility certification, real backend/provider/database certification, or server-restart persistence claim. Shared-store/reload assertions are narrower. Screenshots are synthetic only; no downloads are requested.

## External artifacts

All generated logs, copied pre-execution matrices, process snapshots, failures, screenshots and eventual store remain under the new path:

`../RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/demo/`

- `validation-*/`: syntax, pure self-test and dry-run logs plus exact command metadata.
- `prepare-*/`: OS-only preflight report and untouched expected matrix; no store.
- `attempt-*/`: supervisor report, pre-execution matrix, append-only browser/process logs, `node-runtime-<pid>-<thread>.jsonl` append-only process-instance audits (attempt 01 retains its original `.json` files), child stdout/stderr, per-cell and supplemental results/screenshots, unique canonical store. Actual server/listener/browser-driving Node runtime and race outcomes are now recorded in each authorized attempt; immutable helper snapshots accompany attempts 02/03.

Tokens/bearer headers are never intentionally logged by browser helpers; request query strings/bodies and session responses are not recorded. Raw synthetic world data stays external. Parent should consult both `results.json` and `supervisor.json` (especially cleanup) before reporting acceptance. Execution is stopped. The final deadline is a real incomplete result, not a clean 15/15. Use RESULTS.md and the new consolidated report alongside raw evidence.
