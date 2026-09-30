# Read-only validation evidence and remaining acceptance

Date: 2026-09-30. Identity: starting HEAD `28dea6bcbf9e42fa8bc8bfded79bbc728f1dc325` plus uncommitted scoped changes described in this handover; no new commit/build release identity is claimed. Host: Windows, Node 24.12.0 / npm 11.6.2.

## Authorized installation retry — completed

The user authorized a longer installation retry on 2026-09-30. `npm install --ignore-scripts --no-audit --no-fund` succeeded in about three minutes with a 900-second timeout, reporting 31 changed local packages and UUID deprecation warnings. `npm ls thirdweb --depth=0` confirmed exact `5.121.6`. No force/legacy flags, lifecycle scripts, provider traffic, database operations or demo resets were used.

Fresh retry results (supersede the initial SDK blocker below):

| Command/check | Result | Evidence |
| --- | --- | --- |
| `npm run build -w @rhc/types` | Passed | Terminal build output |
| `npm run build -w @rhc/web3` | Passed, including installed SDK types | Also rebuilt by full test command |
| `npm run test -w @rhc/web3` | **52 passed, 0 failed, 0 skipped**: 34 core tests + 17 SDK scenarios + parent test | [Full connector retry output](connector-sdk-retry-results.txt) |
| `npm run typecheck -w @rhc/api` | Passed against successfully built connector | Terminal output |
| `npm run build -w @rhc/api` | Passed | Terminal output |
| `npm run lint -w @rhc/web3` | Passed | Terminal output |
| `npm run test -w @rhc/api -- --runInBand` | **15 suites, 252 passed, 0 failed** | [API retry output](api-retry-results.txt) |
| `node scripts/web3-browser-test.mjs` | **41 passed, 0 failed, 0 skipped** | [Browser retry output](browser-retry-results.txt) |
| Editor diagnostics, `packages/web3/src/sdk-snapshot.ts` | Refreshed: no errors/warnings | Prior three missing-import errors cleared |

The SDK ran as CommonJS with all RPC requests intercepted; none reached a provider. No connector source fixes were needed. These are offline results on Node 24.12.0, not Node 22 or connected testnet acceptance. Do not sum prior and retry runs as unique coverage. Demo-store and selected e2e results below belong to the earlier implementation pass and were not rerun in this retry.

## Initial implementation pass — historical results

| Command/check | Actual result | Evidence |
| --- | --- | --- |
| `npm run test:offline -w @rhc/web3` | **34 passed, 0 failed**; dependency-independent core typecheck plus source-transpiled unit tests | [connector output](connector-offline-results.txt), `packages/web3/test/readonly.test.cjs` |
| `node --test packages/web3/test/sdk.test.cjs` | **0 passed, 0 failed, 1 blocked/skipped suite**; installed SDK missing | [SDK output](sdk-offline-results.txt) |
| `npm run test -w @rhc/api -- --runInBand` | **15 suites / 252 passed, 0 failed** | [API output](api-unit-results.txt) |
| Focused API Web3/feature specs | **2 suites / 35 passed**; included in 252 above, not additive | `apps/api/test/web3-boundary.spec.ts`, `web3-feature.spec.ts` |
| Selected auth-config e2e | **2 passed, 8 intentionally skipped** | Updated `apps/api/test/consent.e2e-spec.ts`; exact command below |
| `npm run test:demo:store` | **28 passed, 0 failed**, isolated temporary directories | [demo output](demo-store-results.txt) |
| `node scripts/web3-browser-test.mjs` | **41 passed, 0 failed** (40 scenarios plus parent test) | [browser output](browser-results.txt) |
| Types build/lint | Passed | `npm run build -w @rhc/types`; `npm run lint -w @rhc/types` |
| API typecheck/build/lint | Passed **against emitted connector declarations**, not full SDK proof | `npm run typecheck -w @rhc/api`; `npm run build -w @rhc/api`; `npm run lint -w @rhc/api` |
| UI typecheck/lint | Passed | `npm run typecheck -w @rhc/ui`; `npm run lint -w @rhc/ui` |
| Customer/admin typecheck/lint | Passed | `npm run typecheck -w @rhc/customer-web -- --incremental false`; same for `@rhc/admin-web`; each workspace lint |
| Connector lint | Passed after correcting intentional control-character regex lint annotation | `npm run lint -w @rhc/web3` |
| Browser harness lint | Passed | `npm exec --no -- eslint scripts/web3-browser-test.mjs` |
| Whitespace diff check | Passed (Git emitted LF/CRLF notices) | `git --no-pager diff --check` |
| Full connector build | **Blocked/failed: 3 TS2307 missing-SDK import errors** | `npm run build -w @rhc/web3`: `thirdweb`, `thirdweb/rpc`, `thirdweb/utils` unavailable |
| Dependency installs | **2 timed out at 180 seconds**, incomplete local SDK installation | root npm install and workspace-scoped install; both `--ignore-scripts --no-audit --no-fund` |
| Lockfile-only install | Passed in 46 seconds | `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` |

The initial pass reran 217 inherited API unit tests alongside 35 new tests. No inherited test failure was observed. Its introduced connector lint error was fixed. The initial failed build and skipped SDK test remain recorded honestly above and in `sdk-offline-results.txt`; they were subsequently superseded by the successful authorized retry, not retroactively counted as passes.

Exact focused commands:

```sh
npm run test -w @rhc/api -- --runInBand --runTestsByPath test/web3-boundary.spec.ts test/web3-feature.spec.ts
npm run test:e2e -w @rhc/api -- --runInBand --runTestsByPath test/consent.e2e-spec.ts --testNamePattern='returns registration and preview availability|keeps global rate limiting on public config'
```

## Isolation and coverage

- API suite uses mocked persistence/Redis/SDK or real disabled-provider paths; JWT/proxy cases use bounded local fixtures. No hosted auth/database/RPC calls. The selected e2e harness uses local fixture listeners, not production bootstrap.
- Demo tests allocate `os.tmpdir()` stores through `RHC_DEMO_STORE_DIR`; only those temporary stores are reset/removed. Existing `.rhc-demo/world.json` is not a test target.
- Browser harness bundles real preview components and compiles existing CSS/Tailwind/tokens in memory. All requests are fulfilled/blocked locally; explorer activation is prevented. It proves styled component behavior in Chromium, not full Next shells or production end-to-end behavior.
- Core tests cover disabled zero-egress, synthetic fixtures, demo/config conflicts, approval validation, exact large/zero/non-18 amounts, unknown fields, explorer validation, bounded text, single flight/cache isolation, one transient retry, no retry for forbidden classes, backoff, stale timestamps/expiry, body-stall abort and zero remaining active mock requests, write-RPC rejection, safe error strings and body limits.
- API tests cover authentication before disabled response, real JWT rejection of demo tokens, normal account-state denial, exact global integration permission/scopes/expiry, response envelopes, throttling, no startup provider creation, deployment flag mapping, and stale DB flag values unable to authorize reads.
- Demo tests cover customer/staff/global-scope permissions, GET-only reads, no writes/SDK imports, conflicting provider configuration and unchanged points behavior, plus existing demo regressions.
- Browser tests cover public no-read, active customer/session changes, admin permissions, loading/absent/partial/stale/error states, exact disclosures, false/zero display, inert HTML-like metadata, safe explorer links, keyboard retry/focus, and dark/light 390px/768px layout with long fields. Bundle/DOM/console checks exclude SDK/server-secret identifiers; this is not a comprehensive production secret audit.

### SDK-specific coverage — passed after installation retry

`packages/web3/test/sdk.test.cjs` now executes actual installed SDK functions with intercepted JSON-RPC, not SDK stubs. Its 17 scenarios cover network-ID mismatch, absent code, exact ABI/string/amount/decimal decoding, optional cap/paused unsupported/unavailable/true/false, same-height provenance, genesis, reorg, observed finality, partial data and forbidden-RPC assertions. All passed, with the parent test, as part of the 52-test full connector run. CommonJS execution and installed SDK types are validated locally; no monorepo module-format conversion was needed. The earlier missing-dependency skip is historical.

## Not run / not authorized

- Any live testnet/mainnet/provider traffic; no approved network, contract, key, budget or explicit execution authorization.
- Connected browser/Supabase/Nest/provider end-to-end acceptance.
- Full Next builds, full customer/admin page-journey smoke, broader e2e suite, cross-browser/formal accessibility, production bundle audit, Node 22 runtime, fresh npm vulnerability audit.
- The existing general demo HTTP/browser smoke commands were not run because they can mutate/reset the working demo world. Component/browser and temporary-store regression tests were used instead.
- Database/Docker execution, migrations, seeds, bootstrap-admin execution, deployment, subscription operations, wallet/transaction operations.
- Proposed 100-snapshot performance/field comparison, independent same-block verification, and 15 app-journey outage checks.

## Reproducible checks

Dependency-independent checks remain available separately from the full SDK gate:

```sh
npm run build -w @rhc/types
npm run test:offline -w @rhc/web3
npm run test:demo:store
node scripts/web3-browser-test.mjs
```

Full validation commands (installation and connector/API checks completed in the authorized retry; installation may require several minutes on a fresh checkout):

```sh
npm install --ignore-scripts --no-audit --no-fund
npm run build -w @rhc/types
npm run test -w @rhc/web3
npm run typecheck -w @rhc/api
npm run build -w @rhc/api
npm run test -w @rhc/api -- --runInBand
```

The full connector `test` runs its full TypeScript build before Node tests. An offline-core pass cannot substitute for that gate. Do not run a Next build against a `.next` directory used by a running dev server.

## Later authorized network acceptance (plan, not results)

1. Record separate approval, chain/contract/ABI identity, environment, SDK/Node revision, account budget, observation/finality policy and independent endpoint permission.
2. Run the single bounded cold-process read described in the handoff. Inspect six agreed fields: name, symbol, decimals, supply, optional cap and paused state. Missing optional methods are unsupported/unavailable, not failures converted into successes.
3. Only after a separate batch approval, collect **100 bounded snapshots and 100 durations** with explicit cache state and request count; no uncontrolled parallelism. At TTL 1 second and <=10 seconds per snapshot, plan a bounded overall run rather than a zero-TTL bypass. Proposed goal: at least 95 within 3 seconds in the recorded environment; not a vendor SLA.
4. Compare at the same recorded block using a separately approved independent endpoint if available. Report supported/unsupported/failed/not-run fields individually. Never claim 600 passes if optional methods or independent verification are absent.
5. Exercise five core journeys (login/session, reservations, documents, Digital ID, demo points) during three simulated provider failures (timeout, rate limit, unavailable): **15 planned checks**. Keep all business tests in an approved isolated store/environment; do not convert demo-only domains into claims of connected readiness.
6. No deployment, transaction, customer allocation, permit, spending approval or paid-service activation at any step. Preserve failed observations and truthful last-success timestamps; stop on unintended egress or secret leakage.
