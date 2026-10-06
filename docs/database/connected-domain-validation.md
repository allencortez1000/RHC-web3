# Connected-domain validation record

**Date:** 2026-10-06  
**Starting checkout:** `combined-1.0` at `0abb97a23080ee4ca8429b9b7ee08d03d73be9fc`  
**Status:** Schema, additive migration, verification tools and offline tests implemented. **Disposable SQL execution and hosted development application are blocked pending authorization.**

## 1. Evidence boundaries

No PostgreSQL/Supabase target was connected to, inspected, migrated or seeded during this task. No target identity, hosted version, grants, applied migration state or live policy is asserted. Historical September disposable results are not included in this run's totals. A generated Prisma client and passing mocked tests cannot validate PostgreSQL SQL/locking/RLS semantics.

The repository started without tracked modifications. Two pre-existing untracked documents were preserved: `docs/database-table-requirements.md` and `docs/system-status-2026-10-05.md`. Initial checks found no MERGE_HEAD, CHERRY_PICK_HEAD, REVERT_HEAD, rebase directories or BISECT_LOG. No branch, index, commit, push, reset, stash or merge action was performed.

## 2. Versions and source binding

| Item | Observed / scope |
| --- | --- |
| Host | Windows, Git Bash shell |
| Node | `v24.12.0` |
| npm | `11.6.2` |
| Prisma CLI / Client | `5.22.0` / `5.22.0`, retained without dependency updates |
| Required project engine | Node >=22.13.0, npm >=10; CI/container configuration uses Node 22 |
| PostgreSQL | Not connected; no version observed for this run. Existing handoff describes historical disposable PostgreSQL 16.15; this does not authorize or identify a current target. PG16+ membership semantics matter to ACL review. |
| Supabase development project | Not identified or authorized |
| Existing migration files | Seven; preserved byte-for-byte against the checked-out baseline |
| Added migration | `202610060001_connected_domains` |
| Final schema SHA-256 | `d081c4053617cc6f6617499a62a5b8a3b71afea151174b3b19bbe8fed74b7cb6` |
| Added migration SHA-256 | `d765162a0abf53cd8dc01b98586c0af1461ac306448045bdb85bacadb9f1a99c` |
| Schema/eight-migration manifest binding | `5fe6c4289c20c7bfec3e1df76558a049069abd8a16a11ba74ca6bfb78a0d9368` |

The byte manifest is `packages/database/prisma/connected-domain-manifest.json`. The final refresh includes the corrected 45-table preflight comment and two nullable turnover actor FKs required by the mission. No hosted checksum approval existed to invalidate. Future source changes require refreshed review, manifest, tests and any operator authorization; never regenerate a manifest merely to conceal a mismatch.

## 3. Commands and final results

Commands below ran from the repository root unless stated otherwise. They did not execute real business SQL.

| Command / check | Final result |
| --- | --- |
| `git --no-pager --no-optional-locks status --short --branch`, `git --no-pager rev-parse HEAD`, recent log and active-operation checks | PASS: baseline recorded; unrelated work preserved |
| Installed Prisma 5.22 format/validate and offline schema-to-schema structural diff, schema implementation review | PASS: source structural parity; not database execution |
| `node node_modules/prisma/build/index.js validate --schema packages/database/prisma/schema.prisma` with process-only synthetic URLs pointing at loopback port 1 | PASS: valid schema; validation does not connect |
| `npm run db:generate -w @rhc/database` | PASS: Prisma Client 5.22.0 generated locally; no migration or seed |
| `npm run build:api` | PASS: config/types/shared/validation/UI/database/Web3/API builds |
| `npm run typecheck` | PASS: shared builds and all configured workspace typechecks, including both portals |
| `npm run lint -w @rhc/database` | PASS |
| `npm run lint -w @rhc/api` | PASS |
| `npm run test:connected-domain -w @rhc/database` | **77 passed, 0 failed, 0 skipped**; offline source, mocked catalog, CLI authorization and upgrade protocol tests |
| `npm run test -w @rhc/database` | **7 passed, 0 failed, 0 skipped**; injected seed delegates only, no seed execution against a database |
| `npm run test -w @rhc/api -- --runInBand` | **499 passed, 0 failed; 24 suites**; unit/static/fixture coverage |
| `npm run test:e2e -w @rhc/api -- --runInBand` | **194 passed, 0 failed; 10 suites**; fixture-backed HTTP tests, not live Supabase/PostgreSQL |
| `npm run typecheck:connected-domain -w @rhc/database` | PASS in tooling validation |
| `npm run db:connected-domain:manifest -w @rhc/database` | PASS: exact schema/migration bytes verified |
| Connected CLI `--help`, Prisma `migrate deploy --help` / `migrate status --help` | PASS: installed syntax inspected; no connection |
| `git --no-pager diff --check` | PASS; Git warned about future LF/CRLF conversion, not whitespace errors |
| Local documentation links | PASS: seven handover documents, zero broken local links |
| Final editor diagnostics | UNRESOLVED: 88 errors across nine files; focused errors include missing `Prisma` / `PrismaClient` exports despite successful generation and CLI typechecks/builds |

The synthetic validation URL was supplied through a child-process environment, not saved into repository environment files. Prisma's update notice was informational; no upgrade was performed.

### Failures encountered and corrected

- Before client generation, tooling's full database typecheck encountered seven missing generated Prisma-export errors. Client generation resolved them; the final database and all-workspace typechecks passed.
- The first database lint pass found three errors (require-style import and unnecessary regex escapes) and one unused-import warning in new tooling. These were corrected; final lint passed.
- The first API unit run had **497 passing / 1 failing** test because `migration-order.spec.ts` assumed exactly two ACL migration blocks and that the last block covered every table. Updated the regression to preserve historical coverage and union the new-table-only lockdown, plus a same-transaction new-table test. Final rerun: **499 passing / 0 failing**. The chained E2E command did not run on the failed attempt; the successful rerun executed it separately afterward.
- After adding the two required nullable turnover actor FKs, the first offline rerun exposed two outdated inventory-count assertions (470 columns / 50 new-table FKs). Updated them to 472 / 52 and explicitly asserted both actor FKs and creator freezing. Final counts below refer to the corrected rerun.
- Counts above describe final checks, not a sum of multiple attempts.
- Editor diagnostics still report missing Prisma exports and downstream typing errors after successful CLI validation. Stale language-server module resolution is an inference, not a verified cause. No code was removed or weakened to silence it. Restart/reload the TypeScript language server and inspect generated-client resolution if the discrepancy persists; editor diagnostics are not claimed clean.

## 4. Source inventory versus database observation

The tooling derives the following **expected source catalog**, not an inspected database catalog:

| Object | Expected count |
| --- | ---: |
| Application tables / Prisma models | 45 |
| Existing tables retained | 29 |
| New tables | 16 |
| Scalar columns | 472 |
| PostgreSQL enum definitions | 29 |
| Primary keys | 45 |
| Foreign keys | 96 |
| CHECK constraints | 79 |
| Non-primary indexes | 139 |
| New/expected user triggers | 61 |
| New trigger functions | 14 |

Existing defaults, scalar fields, enums and indexes are compared with the pinned Git baseline. Existing relations retain their behavior; redundant candidate keys support new composite FKs. New code adds no optional operational tables, no provider-managed models, no raw verification token/file-content fields, no data backfill and no feature activation.

## 5. Real-database checks: separate status

**Executed real SQL test groups: 0. Passed: 0. Failed: 0. Blocked/not run: 8 groups below.** These are execution-stage groups, not invented assertion counts; fixture statement count is only emitted after an actual authorized harness run.

| Group | Prepared evidence / remaining work | Status |
| --- | --- | --- |
| Fresh historical chain + additions, repeat deploy | Runbook has exact Prisma deploy/status commands and byte-bound history | BLOCKED: authorized run-owned disposable target absent |
| Populated upgrade preservation | Executable prepare phase commits one synthetic row in each retained table on an empty approved disposable; compare checks old-column count/hash and six NULL extensions | BLOCKED: target/fixture-commit authorization absent |
| Catalog, SQL constraints and history protection | Read-only verifier plus executable SQL positive/negative fixtures for tables/FKs/CHECKs/version/reversal/scope/history | BLOCKED: no SQL execution; CHECK/predicate deparser acceptance also needs review |
| Browser denial and non-owner operations | Rollback harness creates only temporary explicitly gated fixture grants/policies; positive documents test, immutable-history negatives | BLOCKED: precreated fixture/browser roles and target absent; not the intended hosted runtime contract |
| Intended backend runtime access | Access matrix identifies missing role/policy contract and invoker/RLS restrictions | BLOCKED: actual role unknown; owner fixture access is insufficient |
| Multi-session contention/replay | Required races documented; no two-session harness execution or replica-role acceptance performed | NOT RUN: target absent; additional concurrency test implementation/approval still required |
| Hosted read-only baseline and application | Exact-target verifier, expanded 45-table preflight, historical checksum conflict and backup gate documented | BLOCKED: project reference, target, roles, read/write approval and recovery evidence absent |
| New API/frontend workflow acceptance | Existing API scope regressions pass; no new connected-domain endpoints implemented | NOT RUN: domain services, permissions, DTOs and integration work remain |

Browser E2E, production frontend builds, Docker, Node 22 execution, dependency/network audit, storage/provider tests and legal/business UAT were not run for this database task. No existing demo smoke/reset script was executed.

## 6. Important tool/design limitations

1. **Catalog expression comparison is deliberately conservative.** PostgreSQL deparsing may add casts/parentheses; `unverifiedDefinitions` blocks acceptance. Passing mocked catalogs proves fail-closed comparison logic, not that a clean real server will pass. Authorized disposable evidence must guide any reviewed normalization/fingerprint changes.
2. **No backend runtime role was invented.** New tables use deny-all RLS with no non-owner policies/grants. Some invoker guards explicitly reject active RLS even with a permissive all-row policy. Certificate/service writes and scope-sensitive existing ledger mutations need a reviewed role/guard design before actual runtime acceptance. Do not bypass these blockers with privileged runtime credentials.
3. **Network topology gates are narrow.** Disposable tooling requires server-reported loopback address/port to match the URL; ordinary Docker bridge/port mapping fails. Dotted pooler logins fail current identifier validation. See runbook rather than weakening gates ad hoc.
4. **Proposed business rules are not approvals.** Single evidence, correction clearing, lifecycle enum mappings, same-source supersession, PHP scope, turnover cardinality and retention need owner decisions.
5. **Safety flags are attestations, not proof of organizational approval.** Only run after explicit operator authorization; neither credentials nor a passing source manifest authorize a connection.
6. **The combined branch carries an older same-name migration divergence.** Inspect actual target checksums before writes; never repair the Prisma ledger automatically.

## 7. Next evidence required

Provide explicit approval for a run-owned disposable PostgreSQL target and fixture-role topology, then execute fresh/upgrade/runtime/catalog checks, fix any SQL defects, and rebind the reviewed migration bytes. Only afterward obtain exact DEVELOPMENT Supabase project/target/role/backup approval, perform authorized read-only preflight, and apply the reviewed pending migration set with Prisma deploy. Any failed/drifted history stops writes.

See [runbook](supabase-dev-migration-runbook.md), [access matrix](connected-domain-access-matrix.md), and [handoff](connected-domain-handoff.md). Current valid completion wording: **“Schema and migrations implemented; offline checks passed; disposable testing and hosted development application pending authorization and acceptance gates.”**
