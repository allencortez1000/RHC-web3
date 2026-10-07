# Next actions — Allen / 20261007T014758Z

**Partially completed locally; external and connected acceptance gates remain pending.** All changes are uncommitted. Do not interpret successful fixtures as production or database acceptance.

## Next three priorities

1. **Allen + frontend/Web3 reviewer:** review the 11 source/test files and new reports at the frozen base. Retain scoped/session/negative tests. Review shared Web3ReadPanel consumers in customer Future Technology and admin Integrations, plus provider API consumer Web3Service. Obtain authoritative expiry metadata from the separately named backend owner before implementing exact browser TTL lifecycle. Revalidate on CI-compatible Node 22 (do not change global Node automatically).
2. **Management + named backend/database/security/deployment owners:** confirm NestJS/Prisma/Supabase ownership, obtain roadmap pages 3/9/11 and exact existing deployment logs, decide connected API/lifecycle/privacy and historical runtime/RLS/checksum questions. Galiver is not the default backend owner. No migration, preflight, target connection or deployment authorized by this handoff.
3. **Allen + current local listener owners; Galiver for blockchain evidence:** arrange release of occupied 3002/3003 without killing foreign processes, complete safe demo supervisor/fixtures and remaining journeys. In parallel Galiver supplies chain/address/versioned ABI/deploy/restriction evidence; management approves read scope/provider quote and budget separately. Price/approval pending; no live read/wallet action now.

## Open the correct worktree

Folder: C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3
Branch: allen/frontend-web3-stabilization
Original stays protected: C:/Users/admin/Desktop/RHBC project/RHC-web3-combined-1.0
Base: 579a007bb56e247836d97d7c9adcc157f848071f
Final modified-source manifest SHA-256: c4950c49575f5d165d5e59922e8665d5be20d6b98bc052110c35256d186d7532

Open that sibling folder in Zed. No staging/commit/push is requested. Dependencies/generated clients/builds belong solely to it. No real env file should be added or loaded for these fixture commands. Do not use the original demo store or unguarded root dev/test/reset commands.

## Exact bounded local viewing / restart and retest commands

Run in the isolated folder using its current task dependencies. The external runner always supplies explicit isolated cwd, sanitized synthetic environment and offline guard. Its first label names a log; use a NEW label on subsequent runs so current evidence is retained. The commands below have not been rerun as human headed sessions; their equivalent automated suites passed. No persistent server was left running.

Restart a temporary customer browser/server with intercepted fixtures and visible Chromium (exits when checks finish):
```sh
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-view-customer offline 600000 "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run test:e2e -w @rhc/customer-web -- --headed --reporter=line tests/frontend-state-regression.spec.ts --output="C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/allen-view-customer-results"
```
Restart the admin fixture browser/server in the same bounded way:
```sh
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-view-admin offline 600000 "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run test:e2e -w @rhc/admin-web -- --headed --reporter=line --output="C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/allen-view-admin-results"
```
Ports 43102/43103 must be free; configs refuse reuse. Never free a port with a killer. These are automated viewing sessions, not a live account/app preview. Headed/manual interaction beyond the test script is NOT reviewed evidence.

Retest the pure read-only browser harness (no listener/store), then Web3 unit/SDK checks:
```sh
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-retest-web3-browser offline 120000 scripts/web3-browser-test.mjs
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-retest-web3-unit offline 120000 "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run test -w @rhc/web3
```
If source or Next output changed, regenerate/rebuild sequentially using the same fixture environment before portal suites:
```sh
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-regenerate offline 120000 "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run db:generate
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-typecheck offline 480000 "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run typecheck
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-build-customer offline 480000 "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build:customer
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-build-admin offline 480000 "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build:admin
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-build-api offline 480000 "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build:api
```
Client generation is codegen only. Do NOT substitute migrate/seed/preflight/db push. No locked install rerun is necessary for the retained worktree.

## Persistent demo restart is currently BLOCKED

There is deliberately no unsafe dev:demo launch instruction. Fixed 3002/3003 were occupied by foreign PIDs 11848/28592 at final inspection; app owners must release them voluntarily. Do not infer current ownership from stale PIDs. Existing launcher/smoke are not adequate isolation on their own. Next dev and production builds share .next, so never run them together.
Recheck port/store/dotenv conditions only after builds are complete:
```sh
node "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/run.cjs" allen-demo-preflight offline 20000 "C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/demo-preflight.cjs" --parent-builds-complete
```
This command only inspects; it does NOT start servers, create a store or guarantee the rest of the boundary. Detailed supervisor plan: [demo-exercise.md](<C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/demo-exercise.md>). Fresh store reserved but NOT created: C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z/demo-store.
Before a later demo launch, implement the documented bounded owned-PID supervisor, exact-origin browser denial, fresh store/profile, no reset, and finally cleanup. Do not use alternate ports/origin relaxations or run the old external-observation-only smoke unchanged.

## Remaining human/authorized acceptance checklist — NOT RUN

- On the safe demo: public/customer/admin navigation; Maya/Noah separate records; scoped/denied staff; switch/logout and late response replacement; changed/not-found/unavailable verification and QR invalidation.
- Observe loading/error/empty/unsupported and real zero distinctions; focus return, keyboard nav, mobile layouts, reduced motion, contrast/zoom/screen reader. Automated narrow checks are not accessibility certification.
- Inject ONLY fixture Web3 failures; exercise login/profile/reservations/documents/Digital ID/points without claiming unsupported connected workflows. No provider/chain transactions.
- After separate authorization: approve exact read-only testnet chain/address/ABI and provider budget; compare bounded same-block observations with independent evidence; no signing or wallet enrollment.
- Database/backend owners separately resolve non-owner runtime/RLS/checksum and domain API readiness. No schema count or successful client build proves SQL acceptance.
- Obtain exact existing deployment ID/commit/time/stage log before root-cause claims; local green build is not a hosted deployment.

Reports: run-context.json, validation.md, issues-and-fixes.md, integration-handoff.md, coordination-and-eod.md. Screenshots/logs/command ledger: C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T014758Z.
