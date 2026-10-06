# System error review and corrective validation

**Date:** 2026-10-06  
**Checkout:** `combined-1.0`, HEAD `0abb97a23080ee4ca8429b9b7ee08d03d73be9fc`  
**Scope:** Existing editor diagnostics, local compilation/builds, regression suites and API Docker workspace preparation. Existing uncommitted connected-domain implementation and documents were preserved.

## Summary

One concrete Docker dependency-preparation defect was reproduced with a regression test and fixed. Application lint, typechecking, production builds and the completed offline suites pass. The customer browser suite passes. The admin browser run exceeded its time limit and is not claimed complete.

The editor errors are now resolved. The count grew from 88 to 92 as additional affected files were checked, while command-line validation continued passing. Restarting the verified worktree-local TypeScript worker under Zed's existing vtsls supervisor cleared the diagnostics. Refreshed project and focused file checks report no errors or warnings. No type suppressions or application rewrites were introduced.

## 1. Fix implemented

### Missing Web3 workspace manifest during API Docker dependency installation

The root npm workspaces include `packages/web3`, and `build:api` builds that workspace. The Docker dependency stage copied all the other workspace manifests but omitted `packages/web3/package.json` before `npm ci`. Consequently that stage did not contain the complete declared workspace dependency graph.

Changed:

- [`infrastructure/docker/Dockerfile.api`](../infrastructure/docker/Dockerfile.api): copy the Web3 manifest before the locked dependency installation.
- [`apps/api/test/docker-workspaces.spec.ts`](../apps/api/test/docker-workspaces.spec.ts): discover the existing root workspace manifests and assert each is copied before `npm ci` in the dependency stage.

Verification sequence:

1. Added the regression without changing the Dockerfile.
2. Ran `npm run test -w @rhc/api -- --runInBand --runTestsByPath test/docker-workspaces.spec.ts`.
3. Observed the exact failure: missing `packages/web3/package.json`.
4. Added the single missing COPY instruction.
5. Reran the full API unit/static suite: **500 tests passed across 25 suites**. API lint/typecheck also passed.

**Boundary:** `docker --version` returned `command not found`. The static dependency graph is verified; no image build/container execution is claimed. This fixes the source omission, not all deployment acceptance gates.

## 2. Editor diagnostics investigation

Initial refreshed diagnostics reported **88 errors across nine files**, including missing `Prisma` and `PrismaClient` exports and downstream delegate/implicit-type errors.

Read-only investigation established:

- Installed TypeScript is **5.9.3**, Prisma CLI/Client **5.22.0**.
- All affected files belong to their expected API/database tsconfigs.
- Fresh TypeScript resolution follows the correct worktree-local declarations:

```text
node_modules/@prisma/client/default.d.ts
  -> node_modules/.prisma/client/default.d.ts
  -> node_modules/.prisma/client/index.d.ts
```

- A fresh compiler sees `Prisma`, `PrismaClient`, domain enums, `Prisma.TransactionClient`, and model delegates.
- The generated client directories are real worktree-local directories, not links into another checkout.
- The `@rhc/database` workspace link targets the correct local package.
- No Prisma path override or ambient module replacement was found.
- Project Zed settings have no TypeScript override. Disabling the Prisma schema language server does not remove TypeScript's generated client exports.
- Full CLI lint/typecheck/build validation passes.

### Resolution — follow-up on 2026-10-06

1. Reran `npm run db:generate && npm run build:api && npm run typecheck`: all passed; editor diagnostics still reported 92 errors.
2. Inspected the TypeScript processes and confirmed the semantic worker was a child of Zed's vtsls supervisor and used this worktree's `node_modules/typescript/lib/tsserver.js`.
3. Revalidated that exact worker's process ID, parent ID, executable and project path immediately before stopping only that worker. No broad process termination, Zed shutdown, development-server shutdown or editor configuration change was used.
4. Confirmed the existing vtsls supervisor remained running and automatically started replacement TypeScript workers.
5. Refreshed project diagnostics: **no errors or warnings**. Follow-up checks of `admin.controller.ts` and `application-acl-preflight.ts` also reported no errors or warnings.

This isolates the observed failures to stale editor TypeScript state; the precise internal cache mechanism was not inspected. No user action is needed for the resolved diagnostics. If they recur after client generation, prefer Zed's normal language-server restart command; do not reuse old process IDs or suppress types.

## 3. Commands and results

No historical results are counted as new test execution. Commands ran from the repository root.

| Check | Result |
| --- | --- |
| `npm run lint` | PASS across configured workspaces |
| `npm run typecheck` | PASS across configured workspaces |
| `npm run build` | PASS: shared packages, Web3, both Next.js portals and API |
| API unit/static suite, after Docker fix | **500 passed**, 25 suites |
| `npm run test:e2e -w @rhc/api -- --runInBand` | PASS; fixture-based request tests, not a live database/provider run |
| `npm run test:connected-domain -w @rhc/database` | **77 passed** |
| `npm run test -w @rhc/database` | **7 passed**; seed-unit delegates only |
| `npm run test:demo:store` | **28 passed**; isolated temporary stores |
| `node --test packages/ui/test/runtime-session.test.cjs packages/ui/test/transport-contract.test.cjs` | **17 passed** |
| `npm run test -w @rhc/web3` | **52 passed**; offline/synthetic SDK and transport checks |
| Customer browser suite | **59 passed**, approximately 1.9 minutes |
| Admin browser suite | **TIMEOUT / INCOMPLETE** after reporting 138 completed tests; no final suite result |
| `npm run db:connected-domain:manifest -w @rhc/database` | PASS; schema/migration bytes unchanged by this review |
| `git --no-pager diff --check` | PASS; line-ending warnings are not whitespace failures |
| Docker image build | NOT RUN: Docker executable unavailable |
| Hosted/disposable SQL, Supabase/provider acceptance | NOT RUN: no target access authorized |
| Editor diagnostics | RESOLVED in follow-up: zero errors/warnings after verified TypeScript worker restart; focused file checks also clean |

### Browser test conditions and timeout

Both portals were separately built with the synthetic values declared by their Playwright configurations: API at loopback port 43101, customer at 43102, admin at 43103, synthetic Supabase endpoint/key, API data mode and the existing offline network guard. These were child-process environment values, not edits to environment files. Test workers block external traffic and browser service workers.

The admin command combined its production build and test run under a **225-second child-process limit** and a 240-second outer tool limit. It exceeded the child limit (`ETIMEDOUT`) before a final result. Reported progress is not whole-suite acceptance. It was not rerun with a longer limit without operator approval. A subsequent read-only process inspection found no remaining matching Playwright/admin-test-server process.

After browser testing, `npm run build` was rerun successfully without the synthetic overrides, so ignored build outputs are not deliberately left pinned to the test configuration. No development/presentation server was left running by this task.

## 4. What was not changed

- No database connection, migration, seed, reset, SQL grant or provider policy operation.
- No changes to the reviewed schema/migration manifest or connected-domain source implementation.
- No changes to saved `.rhc-demo` data; store tests used temporary directories.
- No feature activation, live Thirdweb request, wallet/payment/rewards activation, storage upload, email or SMS.
- No commits, branch changes, pushes, dependency upgrades or lockfile replacement.
- No controller or service edits made solely to silence editor diagnostics.

## 5. Follow-up

1. Completed: restart the verified TypeScript worker and confirm clean project/focused diagnostics.
2. If authorized, rerun the admin browser suite with a longer bounded limit and the documented synthetic build configuration; do not treat this timeout as a pass or an application failure.
3. Build/smoke the API container when Docker is available.
4. Keep real-database and hosted acceptance subject to the existing [development migration runbook](database/supabase-dev-migration-runbook.md).

**Current assessment:** the tested local application paths compile/build and pass their completed suites. The Docker workspace-copy defect is fixed. Editor-state recovery is complete. The incomplete admin browser run, container execution and hosted/database acceptance remain separate outstanding checks.
