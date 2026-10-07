# Follow-up validation — 20261007T040805Z

**READY FOR SCOPED COMMIT REVIEW; not release, Week 1 gate, human UAT or production acceptance.** No additional product fix was necessary. [Commit review](commit-review.md) · [Decisions/handoff](decisions-and-handoff.md) · [Prior validation](../20261007T014758Z/validation.md) · [Prior fixes](../20261007T014758Z/issues-and-fixes.md).

## Identity and preservation

- Worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3`; branch `allen/frontend-web3-stabilization`; HEAD/base `579a007bb56e247836d97d7c9adcc157f848071f`.
- Tested **11-file product/source-test manifest**, including the three untracked files: `c4950c49575f5d165d5e59922e8665d5be20d6b98bc052110c35256d186d7532`. It matches the checkpoint by recomputation, not restoration. All validation ledger entries record this identity.
- Actual first timestamp: **2026-10-07 04:08:05.997Z / 12:08:06 UTC+08:00**. Folder follows the requested release hierarchy, not a claim of November execution. Final timestamps are in the manifests/ledger.
- Important change since prior report: **eight tracked fixes were already staged at entry**. Their bytes match the earlier candidate; no active Git operation or overlapping source edit was found. This run did not stage/unstage them. Initial index SHA-256: `dba4a84bcda482f6b5321c847d447f3ba5fa1e72ff1c36349f8caa411bcbf705`.
- Full task/original source/index inventory was captured at 04:27Z, after read-only discovery and new follow-up helper preparation, before builds/demo. Initial 04:08 source identity had already matched. [Before](evidence/preservation-before.json), [after](evidence/preservation-after.json), [comparison](evidence/preservation-comparison.json) and [manifest](evidence/source-evidence-manifest.json) provide byte/HEAD/index checks. Original checkout was read-only. Scope excludes ignored build/runtime files, dotenv contents and unsaved editor buffers; own new follow-up documents/helpers are separately manifested.
- Previous six reports, logs and screenshots remain intact. Database foundation was already committed in the base; it was not an excluded pending patch.

## Node 22 and runtime boundary

CI selects major 22; package engines require Node >=22.13.0/npm >=10. No patch is pinned. Selected **22.20.0 win-x64**, not an assertion of latest. Portable official distribution: `https://nodejs.org/dist/v22.20.0/node-v22.20.0-win-x64.zip`; SHA-256 matched official `SHASUMS256.txt`: `bb819d6eb8f5bfda294bbc83a7e4ec6539da67c4233d54b0d655b9248b15e29d`. Bundled **npm 10.9.3**. [Runtime evidence](evidence/node-runtime.json).

Absolute executable: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/tools/node-v22.20.0-win-x64/node.exe`. New [runner](evidence/run.cjs) supplies absolute bundled npm, controlled child PATH, isolated home/temp/config/cache and actual `process.execPath`/`process.version` audit records. Demo has its own actual listener/driver runtime audit. Global Node/PATH unchanged.

Only worktree-local locked dependencies were reused. No reinstall/version/lockfile change. Native SWC/Prisma N-API modules were actually loaded under Node22; no database client was instantiated for that probe. Task `.next`, compiled package/API output and frontend TS build info were cleared before fresh compilation. Prisma5.22 client was regenerated under Node22 with inspected local engines and inert port-1 datasource syntax; port1 was denied, and **no database call occurred**. Prior task Chromium153.0.8010.12 cache was reused, not another worktree's dependencies/output.

Automatic dotenv filenames were checked in root/apps/database before commands; none beyond examples. No real values were read/copied. Runtime sockets deny external traffic and unowned loopback, permitting only exact frontend endpoints or process-owned ephemeral HTTP fixtures. Browser suites intercept synthetic API/auth and deny unexpected origins; persistent demo uses only owned fixed 3002/3003 origins/HMR. No connected Nest server, database, Redis, Docker, Supabase or provider was started. Offline fixture HTTP tests replace DB/rate boundaries in memory.

## Executed checks

Commands use the absolute Node22 runner/npm above with explicit worktree cwd. Exact arguments, time limits, UTC/local timestamps, failures and cleanup are in [commands.jsonl](evidence/commands.jsonl); build/test/browser summaries preserve first outcomes. External log root **E** = `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/`.

| Check / actual command following bundled npm | Result | Log under E |
| --- | --- | --- |
| `run db:generate` (local codegen only) | PASS | `node22-prisma-generate.log` |
| `run typecheck` | PASS | `node22-typecheck.log` |
| `run build:customer` | PASS, fresh production-mode output | `node22-build-customer.log` |
| `run build:admin` | PASS, fresh production-mode output | `node22-build-admin.log` |
| `run build:api` | PASS, shared/Web3/API compile | `node22-build-api.log` |
| `run lint -w @rhc/customer-web -w @rhc/admin-web -w @rhc/ui -w @rhc/web3` | PASS, scoped lint | `node22-frontend-lint.log` |
| `run test -w @rhc/web3` | 64 PASS; core + installed-SDK fixture scenarios/parent | `node22-web3-unit.log` |
| Direct Node `scripts/web3-browser-test.mjs` | 50 PASS, synthetic harness | `node22-web3-browser.log` |
| Direct Node `--test packages/ui/test/*.test.cjs apps/customer-web/tests/frontend-merge-regression.cjs apps/customer-web/tests/frontend-mode-regression.cjs` | 31 PASS | `node22-ui-frontend-unit.log` |
| `run test:e2e -w @rhc/customer-web -- --reporter=line --output=E/customer-results` | 73 PASS | `node22-customer-browser.log` |
| `run test:e2e -w @rhc/admin-web -- --reporter=line --output=E/admin-results` | 138 PASS | `node22-admin-browser.log` |
| `run test -w @rhc/api -- --runInBand --runTestsByPath test/web3-boundary.spec.ts test/web3-feature.spec.ts` | First 33 PASS/2 FAIL; retry 35 PASS at unchanged limits | `node22-api-web3-boundary.log`, `node22-api-web3-boundary-warm.log` |
| `run test:e2e -w @rhc/api -- --runInBand --runTestsByPath test/security.e2e-spec.ts` | First guard failure; corrected-helper run 47 PASS | `node22-api-security-http.log`, `node22-api-security-http-guard-fixed.log` |
| Direct Node `evidence/guard-test.cjs` | Before 1 PASS/1 FAIL; after 2 PASS | `guard-before.log`, `guard-after.log` |
| `git --no-pager diff HEAD --check` | PASS | closeout ledger |

No suite count is a combined unique-acceptance total. No full API suite, root validate, all-workspace lint or SQL suite is claimed. Production builds preceded intercepted browser tests; all completed before demo dev servers reused `.next`. The final `.next` directories are demo-generated output, not untouched production artifacts.

### First failures and justified retries

1. Preservation helper initially resolved one parent too far and stopped before writing an inventory; corrected its task-owned path, then captured before inventory. No source/Git mutation.
2. API Web3 boundary first disabled-provider test exceeded its original **5000ms** limit; the next mock assertion observed its late invocation. This matches the prior timing pattern. Warm-transform-cache rerun passed35 at the **same** limit. Cache/timing is supported as an explanation, not proven a unique root cause; retain the cold-run reliability concern for review. No API/test assertion edits.
3. New offline guard registered a process-owned ephemeral port only on the `listening` event. Supertest reads `address()` and connects synchronously first. A focused regression reproduced the denial. Minimum helper correction registers the returned bound address immediately, while keeping unowned port1/5432/external-denial assertions. Focused2 and HTTP47 then passed. This is a validation-helper fix, not an application/authentication fix.
4. Demo attempts01/02 exposed helper-only accessible-name/response-capture/PID-reuse/skip-target assumptions; investigation records and original failures remain. Attempt03 hit its original **540-second** supervisor bound. No assertion/per-test/overall limit was increased. A separately predeclared two-cell fresh-store continuation completed the unfinished work without a full-matrix retry.

## Existing fix review — reviewed, not newly implemented

Automated diff/source review plus current tests verified mode-aware demo/connected wording and loaded-record scope; loading/unavailable versus real zero; neutral dashboard workflow stages; exact server max-age expiry and age-only partial diagnostics; last-response provider wording and exact Unix-second display. Customer Future Technology, admin Integrations and API Web3Service consumers were reviewed. Session replacement/logout, effective scoped/global permissions, unknown values, secret separation and read-only negative coverage remain intact. No confirmed in-scope product defect justified another edit. Human peer approval remains **PENDING**.

## Persistent synthetic exercise

Predeclared [five journeys × three failures](evidence/demo/expected-outcomes.json): (J1) supported login/profile; (J2) reservation/shared persistence; (J3) document/separate review; (J4) Digital ID/points; (J5) public/navigation/logout. Failures only at Web3 fixture GETs: HTTP503, aborted connection, or 2500ms delay followed by503. Expected core results were specified before execution; business responses were not fabricated or globally intercepted.

Both source-defined customers **Maya/Noah**, system-admin and a separate anonymous context used the real demo hub/shared store. Allowed/denied actions, cross-customer record isolation, shared admin/customer state and reload persistence were exercised. No old demo reset/import, real file upload/provider, connected backend or alternate origin was used.

| Journey | HTTP503 (attempt03) | Connection failure (attempt03) | Delayed503 (attempt03) | Targeted continuation (new store) |
| --- | --- | --- | --- | --- |
| J1 login/profile | PASS | PASS | PASS | NOT RUN |
| J2 reservations | PASS | PASS | PASS | NOT RUN |
| J3 documents/review | PASS | PASS | PASS | NOT RUN |
| J4 Digital ID/points | PASS | PASS | BLOCKED — original deadline | PASS |
| J5 public/navigation/logout | PASS | PASS | NOT RUN | PASS |

**13 passing cells in attempt03 + 2 selected passing cells in a separate fresh-store continuation. Not one clean 15/15 run on one store.** First failures are not erased or added to acceptance counts. See [full result/history](evidence/demo/RESULTS.md), [targeted result](evidence/demo/TARGETED-CONTINUATION.md), and their external manifests/screenshots/world records.

Supplemental attempt03 groups passed: unsupported/missing Web3 fields; verifier A→B/not-found/lookup-free unavailable; pending real account/ID requests during supported persona switch and logout. Six actual delayed DEMO responses were **browser-cancelled** after transitions: evidence proves cancellation/no stale-state resurrection, not successful delivery of stale bytes into a replacement component. Existing request-generation unit/intercepted negatives separately remain passing.

Loading→error, successful empty/filter-zero, real zero points, unavailable QR, keyboard/focus/mobile390/768/1440 and reduced-motion scrolling spot checks passed. Account-status PENDING and non-Web3 failure injection were NOT RUN in the persistent store; canonical customers are ACTIVE and only Web3 failures were authorized. Separate intercepted frontend tests cover loading/business-error/empty transitions. No server-restart persistence, formal accessibility certification, human UAT or live availability guarantee is claimed.

Ports were free at actual launch checks; all readiness was tied to recorded owned process/creation identities. Every attempt used a uniquely named external store, fresh browser profile and exact-origin denial. The last targeted process interval was **05:57:56.251Z–05:59:59.711Z**, with independent cleanup check06:01:40.753Z. Both supervisor and parent report zero owned survivors; fixed ports free. Final closeout rechecks are separately manifested.

### Safe later viewing/restart — servers stopped

From this worktree, only after confirming no build/test/other process writes `.next`:

```sh
sh docs/release/2026-11-10/allen/20261007T040805Z/evidence/demo/restart-targeted-bounded.sh
```

This is a **bounded automated viewing/exercise**, not a persistent unattended server. It uses the absolute selected Node22, unused exclusive log label, new store, fixed-port/env/ownership checks and finally cleanup. It refuses foreign listeners; never use kill-port, old PIDs, alternate ports or the old reset-capable smoke. Full-matrix bounded restart is also documented in `evidence/demo/RESULTS.md`, but previously reached the unchanged overall bound. Do not silently increase it. Prior stores/screenshots remain external and are not reset for viewing.

## Finite result

| Area | Result |
| --- | --- |
| Existing fix review | PASS automated; no new product fixes |
| Node22 validation | All listed final checks PASS; first failures retained |
| Persistent synthetic demo | Selected matrix covered across bounded attempts, with stated race/coverage limits |
| Exact automatic browser expiry | BLOCKED on authoritative backend contract; proposal prepared |
| Human peer review | PENDING |
| Connected/database/provider/deployment acceptance | NOT PERFORMED |

No protected product source, database/schema/migration/ACL, contract, live provider, cloud configuration, external message or deployment was changed. No fetch/pull/rebase, branch/worktree creation, stage/commit/push/merge/reset/stash or history rewrite. Task-generated builds/client/fixtures and new follow-up helpers/reports are the only writes in this continuation. Next actions and concrete owner inputs are in [decisions-and-handoff.md](decisions-and-handoff.md).
