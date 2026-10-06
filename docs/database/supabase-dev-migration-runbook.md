# Supabase development migration runbook

**Source review: 2026-10-06 · existing branch `combined-1.0` · baseline HEAD `0abb97a`.**

> **NO disposable or hosted target is authorized. No SQL was executed. No database/network connection, migration deployment, seed, role/grant change, storage operation or hosted acceptance was performed for this documentation task.** All database steps below are future operator procedures requiring independent approval; this document is not that approval.

Local versions inspected: **Node 24.12.0**, **npm 11.6.2**, installed **Prisma 5.22.0**. This runbook describes future database operations. Local source/Git/hash and Prisma help review informed its commands; actual generation/build/offline regression results are recorded in [validation results](connected-domain-validation.md). No database test or live runtime success is claimed.

## 1. Scope, authoritative sources and release blockers

Read together:

- [Access matrix](connected-domain-access-matrix.md), [source map](connected-domain-source-map.md), [data dictionary](connected-domain-data-dictionary.md), [ERD](connected-domain-erd.md).
- [`schema.prisma`](../../packages/database/prisma/schema.prisma), [`migrations`](../../packages/database/prisma/migrations), [`connected-domain-manifest.json`](../../packages/database/prisma/connected-domain-manifest.json), [`connected-domain-baseline.json`](../../packages/database/prisma/connected-domain-baseline.json).
- [`connected-domain-source.ts`](../../packages/database/prisma/connected-domain-source.ts), [`connected-domain-gates.ts`](../../packages/database/prisma/connected-domain-gates.ts), [`connected-domain-verify.ts`](../../packages/database/prisma/connected-domain-verify.ts), [`connected-domain-disposable.ts`](../../packages/database/prisma/connected-domain-disposable.ts), [`connected-domain-upgrade.ts`](../../packages/database/prisma/connected-domain-upgrade.ts), their fixtures/tests, and [`application-acl-preflight.ts`](../../packages/database/prisma/application-acl-preflight.ts).
- [Combined integration report, migration comparison and deployment question](../integration/combined-1.0-merge-report.md#complete-migration-set-and-same-name-comparison).

The final source retains **29 original tables** and adds **16**, for **45 application tables**. The seven historical migrations remain untouched; `202610060001_connected_domains` is the eighth migration. It wraps its changes in one transaction, adds six nullable existing-table fields, candidate keys and integrity guards, and locks down the 16 new tables/14 new trigger functions. It creates no backend grants, RLS policies, role topology, provider objects or feature activation.

**Deployment, catalog acceptance and application activation are separate decisions.** Existing table grants survive and cover added columns; the new-only lockdown does not certify legacy exposure. RLS has no FORCE contract. Actual backend CRUD is blocked pending a runtime/grant/ownership decision, and several invoker guards reject active RLS even under an all-row non-owner policy. In particular, scope-sensitive updates on **existing `rewards_transactions`** fail if `row_security_active('public.rewards_redemptions')` is true, before checking for a linked row. Certificate/service event guards have analogous history-visibility blockers. Do not solve this by recommending owner, superuser, BYPASSRLS, disabling RLS, or disabling triggers. A separately approved design and non-owner runtime regression tests are needed.

The current ACL preflight and SQL deployment-gate comment cover all 45 tables. Compilation of metadata, relations, issuer/assignee fields or new models is **not** evidence that connected features work. Benefits and verification references are SQL-hard-disabled; turnover DRAFT is only a default. API capability gates and all business/privacy approvals remain independent.

## 2. Approval record: complete before any connection

Use an access-controlled change record, not this repository, for target details and evidence. It must contain:

| Required item | Owner / acceptance requirement |
| --- | --- |
| Authorization type | Explicitly distinguish catalog-only reads, disposable writes, committed upgrade fixtures, hosted development migration, runtime tests and storage work. Approval for one is not approval for the others. |
| Exact target | Environment/project identity, host, **port**, database, login role, session/current-role expectation, connection mode and approved TLS mode. No guessed hosted project, pooled endpoint, tunnel or default port. |
| Identities/authority | Database/security owners approve migration role, object/ledger owners, every application creator, browser roles and candidate non-owner runtime. Review membership/SET ROLE/admin paths, defaults, views/RPCs and extensions. |
| Source binding | Reviewed branch/commit plus working-source manifest binding, schema hash and all eight migration byte hashes. Baseline `0abb97a` alone does not include all current working additions. |
| History reconciliation | Answer whether any target applied the alternate same-name `202609140002` bytes. Record authorized read evidence and an explicit reconciliation decision; no automatic resolve. |
| Backup/recovery | Database/operations owners confirm backup coverage, retention, restoration evidence, recovery point/time objectives and exact restoration destination before hosted writes. Include data, schema, ACL/role dependencies and migration ledger; coordinate provider Auth/storage recovery separately. Do not run backup/restore under this document's current authorization. |
| Window and locking | App/backend owner coordinates traffic and background jobs, locks on existing tables/index creation, migration time budget and abort/escalation procedure. One designated deployer, not simultaneous workers. |
| Acceptance plan | Fresh and historical-upgrade disposable targets, catalog comparison, legacy data preservation, browser denial, runtime regressions, API scope and storage separation; identify known unverified results. |
| Named approvals | Database/change owner, security owner, backend owner and impacted domain owners. Privacy/storage approval is separate. No names or approvals are inferred here. |

### Historical checksum blocker

The integration report records **different Git blobs for the same migration name**:

| `202609140002_application_postgrest_lockdown` source | Git blob ID recorded by the report |
| --- | --- |
| Base/redesign | `c468b09b0644e3759d85ed4d4390c0691fe13960` |
| Selected main | `f930a775032bbf768a33167e31d439677bae44be` |

Main removed `property_status_history`, `reservations`, and `reservation_events` from the early allowlist because they are created later. That supports ordered **fresh** replay; it does not establish which bytes a hosted target applied. These 40-character Git object IDs are **not Prisma's SHA-256 migration checksum**. Compare authorized `_prisma_migrations` records with the exact deployed SQL bytes and reviewed current manifest, accounting for byte-level line endings without rewriting files.

If the name exists with another checksum, an unfinished/rolled-back record is ambiguous, a migration is missing/out of order, or target objects disagree: **STOP**. Database/change owners must reconcile the actual history and choose a separately reviewed recovery/forward plan. Do not edit seven historical files, restore the broken early allowlist, edit `_prisma_migrations`, mark anything applied/rolled back, or run `migrate resolve` automatically. The report's old merge-in-progress status is historical; the locally inspected baseline for this document is `combined-1.0` / `0abb97a`.

## 3. Reviewed byte manifest

At documentation time, local SHA-256 checks verified the schema and all eight SQL files against `connected-domain-manifest.json` and verified its aggregate binding. Git showed no tracked historical migration differences from `0abb97a`. This is **source evidence only**, not a hosted checksum comparison.

| Source under `packages/database/prisma` | SHA-256 at this review |
| --- | --- |
| `schema.prisma` | `d081c4053617cc6f6617499a62a5b8a3b71afea151174b3b19bbe8fed74b7cb6` |
| `202609110001_month1_foundation/migration.sql` | `d04710f1ba9811acfdabdbcfaf7535642cad70321e3763f5174a3283d7b451a0` |
| `202609120001_month1_auth_ledger_hardening/migration.sql` | `e1da6755fd835120f185abd55368819945bce2635f3ce8735034a23f037b5dde` |
| `202609140001_identity_history_seed_hardening/migration.sql` | `7d2c377e8cc4b9be93e06bda58e895e6f1c3b8ab3d413ba5c4419f84587a9d0e` |
| `202609140002_application_postgrest_lockdown/migration.sql` | `c3cf68259b18d20d706c099c62333701dd57d16c56671f412a3df4db160c82e2` |
| `202609150001_authorization_scope_delete_restrict/migration.sql` | `56d4528c384c433dac7225a47d4878b5c8bf803efdd0e4cf042c8b235bcdbfa4` |
| `202609160001_reservation_foundation/migration.sql` | `24508734dac5329afec6c179190f63d3ad65e14cccb66a580ca8b558d9f9bb74` |
| `202609210001_application_acl_hardening/migration.sql` | `6d5e73d0d69306d52f295e2b52b8afb10c2b89ddf70c14f5a6eabc4fea4a7573` |
| `202610060001_connected_domains/migration.sql` | `d765162a0abf53cd8dc01b98586c0af1461ac306448045bdb85bacadb9f1a99c` |

SQL paths in the table are beneath `migrations/`. Aggregate binding: `5fe6c4289c20c7bfec3e1df76558a049069abd8a16a11ba74ca6bfb78a0d9368`.

Recheck the manifest before each stage. The existing offline checker is:

```sh
npm run db:connected-domain:manifest -w @rhc/database
```

No arguments verifies bytes without database access. **Do not use `--write` to make a mismatch disappear.** It deliberately rebinds the source manifest and requires independent source review. Any approved source change invalidates prior bindings and calls for a refreshed review, not silent normalization.

## 4. CLI syntax, environments and non-executable templates

All examples assume repository-root working directory. **Every block containing `REPLACE_...` is documentation-only and is not executable as supplied.** An operator must replace every placeholder with literal values from the signed approval, review the complete command and obtain the relevant authorization before running it. Quoted uppercase placeholders are intentionally invalid gate inputs; do not treat them as target suggestions. No secret or connection URL is embedded in a command.

Inspect installed local help without a database connection (these two commands were inspected during this task):

```sh
node node_modules/prisma/build/index.js migrate deploy --help
node node_modules/prisma/build/index.js migrate status --help
```

Prisma 5.22 help advertises `--schema` for both commands. **There is no supported `migrate deploy --migrations-dir` option in this help.** The isolated historical replay below uses the supported `--schema` path and its adjacent `migrations` directory; it does not invent a staging npm script.

Connected tool help is available through existing scripts; the help implementations return before connection:

```sh
npm run db:connected-domain:verify -w @rhc/database -- --help
npm run db:connected-domain:disposable -w @rhc/database -- --help
npm run db:connected-domain:upgrade -w @rhc/database -- --help
npm run db:acl:preflight -w @rhc/database -- --help
```

Use the installed pinned dependencies, not `npx`/automatic downloads. The dedicated connected-domain client requires a generated Prisma **5.22.0** client and disables both Prisma env-file lookup paths; a different client version fails closed. Client generation was performed locally as recorded in the validation report; repeat it for a clean approved checkout before using these tools. Do not upgrade to evade a gate.

### Environment separation

Provision secrets into the **specific process environment** using the operator's approved secret mechanism. Never paste passwords/URLs into shell history, command arguments, issue trackers, checked-in `.env` files or evidence output. Keep migration and runtime credentials separate; clear target-specific environments when switching databases.

| Tool | Explicit environment | Important behavior |
| --- | --- | --- |
| Connected read-only verifier | `CONNECTED_DOMAIN_READONLY_URL` | Does not fall back to `DATABASE_URL`, `DIRECT_URL` or env files. Requires explicit read authorization and exact URL/CLI host, port, decoded database and decoded login match. |
| Disposable rollback suite and **both** upgrade phases | `CONNECTED_DOMAIN_DISPOSABLE_URL` | Does not deploy migrations. Both upgrade phases use disposable gates even though compare is transaction-read-only. |
| Application ACL preflight | `DIRECT_URL` | Explicit process variable required; no fallback to `DATABASE_URL`. Default operation is read-only. CLI target matching is host/database, **not** the newer full host/port/database/role gate; independently verify approved port/login. |
| Prisma CLI deploy/status | `DIRECT_URL` and `DATABASE_URL` as required by the schema | Schema has `directUrl = env("DIRECT_URL")`. Supply both explicitly for the approved target; never leave a stale runtime/other-target URL. Prisma CLI can load env files and does **not** enforce the connected tool authorization flags. Review environment precedence and all selected-schema/root env locations; do not rely on implicit env loading. |

New connected gates accept database/role identifiers only matching **`[a-z_][a-z0-9_]*`, maximum 63 characters** (implemented as `^[a-z_][a-z0-9_]{0,62}$`). This applies to login, fixture and browser roles. A hosted pooler login containing a dot, such as the common role/project suffix form, is **unsupported**; URL encoding the dot does not help because the decoded login must match and pass the identifier gate. Prefer an approved **direct** endpoint with a supported login. If hosted connectivity is available only through such a pooler, stop for a separate gate/connection review. Do not remove the suffix, falsify `--target-role`, broaden the regex locally or switch to privileged credentials.

Connected URLs permit only `postgres:`/`postgresql:`, no fragment, and at most one approved `sslmode` query parameter (`disable`, `require`, `verify-ca`, `verify-full`). Host/schema overrides, arbitrary `options`, pooler parameters, sockets, multi-host lists and file-based TLS secret parameters are rejected. Approve suitable TLS for the real target; do not weaken it to fit a template. The tool adds its own connection/time limits and rejects DEBUG/RUST_LOG/PRISMA_LOG_LEVEL logging.

## 5. Read-only catalog and ACL review — future authorization required

### Exact-target verifier

After **separate read-only authorization** and secure environment provisioning:

```sh
npm run db:connected-domain:verify -w @rhc/database -- \
  --authorize-read-only \
  --target-host "REPLACE_APPROVED_HOST" \
  --target-port "REPLACE_APPROVED_PORT" \
  --target-database "REPLACE_APPROVED_DATABASE" \
  --target-role "REPLACE_APPROVED_LOGIN_ROLE"
```

Repeat `--browser-role "REPLACE_ADDITIONAL_BROWSER_ROLE"` only for additional explicitly reviewed roles. `anon` and `authenticated` are always included by the verifier; absent browser roles block acceptance. Do not pass disposable flags to read-only mode.

The verifier checks source binding before constructing the client, sets read-only startup/transaction controls, verifies database/current user/session user, and inspects the ledger, columns/defaults/enums, constraints, indexes, triggers, functions, RLS and conservative ACL paths. Loopback connections also require matching server-reported address/port. A remote host is compared against the URL; these gates do not establish a provider project identity or independently attest remote server address. Operator approval and secure endpoint verification remain necessary.

**CHECK/predicate deparser limitation:** the verifier compares source CHECK expressions to `pg_get_expr` with only trim and CRLF-to-LF handling. It does not erase parentheses, casts or operator order. PostgreSQL may deparse equivalent expressions differently, producing `unverifiedDefinitions` and blocking acceptance. This is **likely unverified until an authorized live comparison**; the manifest/source fingerprint is not a server-deparser approval. Do not call the catalog clean, normalize arbitrary SQL, suppress mismatches, or relabel an unverified result as equivalent. Database/tool owners must review the exact definitions in a controlled authorized comparison and approve any later verifier change with tests.

Ledger classifications (`empty`, `missing`, `failed`, `drift`, `pending`, `consistent`) are not interchangeable. The recognized seven-migration/29-table stage reports `historical-29` / `migration-pending`; this is expected staging evidence, **not final catalog acceptance**. Inspect issues, unverified definitions, unexpected objects and ACL findings even at that stage. Final acceptance needs reviewed structural/catalog evidence, not just the right count or zero pending migration names. Conservative checks can also flag unrelated public/provider views/RPCs/defaults; stop for scoped review, never delete provider objects to obtain a pass.

### Independent 45-table application ACL preflight

After an exact-target read approval, use its existing syntax (repeat creator/runtime flags for each declared identity):

```sh
npm run db:acl:preflight -w @rhc/database -- \
  --target-host "REPLACE_APPROVED_HOST" \
  --target-database "REPLACE_APPROVED_DATABASE" \
  --creator-role "REPLACE_ACTUAL_CREATOR_ROLE" \
  --runtime-role "REPLACE_CANDIDATE_NONOWNER_RUNTIME_ROLE" \
  --require-runtime-role
```

It checks ownership, RLS, effective table/column/owned-sequence privileges, creator defaults, browser presence, views/functions, membership/SET ROLE/admin authority (including PostgreSQL 16+ paths), ledger authority and declared runtime identity risk. Its read-only controls include 10-second statement, 2-second lock and 15-second idle timeouts. Reports include role/catalog metadata; retain them only in the approved evidence store.

At historical-29 or empty stages the expanded preflight will report missing new tables. Record the expected stage mismatch and still investigate all other findings; do not shrink its inventory or claim a pass. Run again on all 45 after deployment. Runtime assessment remains `declared-not-executed` or `blocked-unassessed`; `ready: true` is not a positive CRUD test.

**Do not append `--apply-defaults --approve-global-defaults` here.** Together they enable writes revoking declared creators' table/sequence defaults both globally and in public. They supply no runtime grants and affect future objects beyond this application. If needed, database/security owners must authorize a separate change. Historical `202609140002` already changes its CURRENT_ROLE defaults globally and in public; review that impact for fresh replay too. The eighth migration does not change defaults and rejects unexpected non-owner grants on new tables/functions, including grants inherited from creator defaults.

## 6. Disposable prerequisites — topology is a hard gate

Prepare **two distinct, run-owned, initially empty disposable databases** through a separately authorized operator provisioning procedure: one for fresh eight-migration replay, one for historical-seven upgrade. No real customer data, restored hosted snapshot, hosted database or persistent shared developer database is eligible for synthetic fixture tools.

Current disposable gates require:

1. Numeric loopback host exactly `127.0.0.1` or `[::1]`; no hostname, tunnel, redirect or pooler discovery.
2. PostgreSQL's `inet_server_addr()` must equal that loopback address and `inet_server_port()` must equal the approved URL/CLI port. **Docker bridge networking and host-to-container port mapping fail this gate** when PostgreSQL reports a bridged address or a different port. A host URL that looks loopback is insufficient. Only native loopback or genuinely host-networked PostgreSQL with matching server address/port is supported by this runbook. Other container arrangements await a separate gate review; do not weaken the check or provide a generic Docker recipe.
3. Four distinct approved roles: the connecting migration/object-owner role, one precreated fixture role, and two precreated browser-test roles. Fixture/browser roles must be NOLOGIN, non-owner, without superuser/BYPASSRLS/CREATEROLE/CREATEDB/replication authority, no membership edges as members, no table/function/schema ownership and no public-schema CREATE. They must start without effective application table/column privileges.
4. Connecting role must own the expected application tables and actually be able to SET ROLE to the three restricted roles. Tables must have RLS enabled, not forced; new tables must have no policies. These are **synthetic tool prerequisites**, not a hosted runtime-role recommendation. Provisioning authority is approved separately; no role-creation SQL is provided here.
5. All command target values must match `CONNECTED_DOMAIN_DISPOSABLE_URL`, with exact confirmation `HOST:PORT/DATABASE`. `--confirm-run-owned-initially-empty` attests provisioning provenance; it does not mean a database remains schema-empty after migration. Upgrade prepare independently checks that all 29 business tables are still empty.
6. For catalog browser-role coverage, arrange the approved local browser-test identities consistently with the verifier's mandatory `anon`/`authenticated` inspection. The tools never create missing roles for you.

### Fresh replay: deploy all eight twice

After explicit disposable **deployment** approval, secure Prisma CLI environment setup and review of all eight SQL files, run from the authoritative repository tree:

```sh
node node_modules/prisma/build/index.js migrate deploy --schema packages/database/prisma/schema.prisma
```

Record the first result and inspect target history/catalog. If it fails, stop; do not blindly repeat a failed deployment. After successful first deployment, run the **same command a second time** to establish that Prisma finds no pending migrations. This is ledger-backed repeat deployment, not a claim that raw migration SQL can be replayed idempotently. Then inspect status:

```sh
node node_modules/prisma/build/index.js migrate status --schema packages/database/prisma/schema.prisma
```

The exact workspace command for normal development migration application is:

```sh
npm run db:migrate -w @rhc/database
```

**That script is `prisma migrate deploy`, not `prisma migrate dev`.** It applies pending migration files and is a database write command, requiring the same approval. Do not substitute `migrate dev` or run both forms reflexively.

Run separately authorized read-only verifier and ACL review against the fresh target, using the full templates above. Keep any deparser/ACL findings blocked; do not promise `catalog-consistent`. An owner-approved diagnostic test run may gather additional evidence, but cannot silently waive an unresolved catalog gate.

### Rollback-only fixture suite

After dedicated disposable-write authorization, secure `CONNECTED_DOMAIN_DISPOSABLE_URL` setup and successful role/ledger prerequisites:

```sh
npm run db:connected-domain:disposable -w @rhc/database -- \
  --authorize-disposable-writes \
  --target-host "REPLACE_NUMERIC_LOOPBACK" \
  --target-port "REPLACE_APPROVED_PORT" \
  --target-database "REPLACE_FRESH_DATABASE" \
  --target-role "REPLACE_APPROVED_OWNER_LOGIN" \
  --confirm-disposable "REPLACE_LOOPBACK:REPLACE_PORT/REPLACE_FRESH_DATABASE" \
  --confirm-run-owned-initially-empty \
  --fixture-role "REPLACE_PRECREATED_FIXTURE_ROLE" \
  --browser-role "REPLACE_PRECREATED_BROWSER_A" \
  --browser-role "REPLACE_PRECREATED_BROWSER_B"
```

The tool deploys/resets/seeds nothing. It checks the eight-migration ledger, tests certificate isolation rejection under RepeatableRead, then uses Serializable fixtures and deliberate rollback. It tests browser denials, grant-only/no-policy denial, a scoped positive **document fixture** policy, and selected immutable-history negative operations. Its temporary grants/policies/data are rolled back; success is `passed-and-rolled-back`. It does **not** prove general non-owner certificate/service/rewards CRUD, hosted authorization, concurrent two-session races, replica-session trigger behavior or upgraded-data preservation. Do not copy fixture policies to hosted environments.

## 7. Historical upgrade: staged seven, committed synthetic baseline, then eighth

Use the **other** approved initially empty disposable target. Never point these commands at hosted development or customer data. Preparation is intentionally a write that **commits one synthetic row in each of all 29 retained tables**; it is not the rollback suite.

### Stage a byte-for-byte historical subset outside the authoritative tree

There is no repository staging command. The operator should perform and record this explicit file-copy procedure:

1. Choose a fresh local staging directory **outside the authoritative repository/migration tree**. No symlinks/junctions to the authoritative migration directory and no network share. Record its absolute path. Do not move, rename, hide or edit any authoritative file to exclude the eighth migration.
2. Copy current `packages/database/prisma/schema.prisma` byte-for-byte into that directory as `schema.prisma`. Do not generate a second schema or remove new models: `migrate deploy` uses the checked-in SQL history, not schema diff generation.
3. Create an adjacent `migrations` directory and copy **only the first seven directories in the manifest**, preserving their exact names and SQL bytes. Exclude `202610060001_connected_domains` from this staging copy. The reviewed source inventory contains eight migration directories; if a migration lock file is present in a later approved source, review and copy it unchanged as applicable, rather than inventing one here.
4. Independently compute SHA-256 of the staged schema and each of the seven staged `migration.sql` files. Compare each with both its authoritative original and the reviewed manifest above. Verify exactly seven migration directories, no eighth, no extra SQL, and no staged `.env` or credentials. Preserve line endings; no formatter/editor save or Git conversion during copying. Record this copy inventory/hash comparison in the change evidence.
5. Recheck the authoritative full manifest. **This staged subset is not a second migration history**, baseline, replacement ledger, squash or new set of migration names: it is a byte-for-byte prefix of the single authoritative eight-migration history, used only to stop the disposable replay at seven.

Illustrative layout only (replace the root, do not execute this text):

```text
REPLACE_EXTERNAL_STAGE/
  schema.prisma                         # exact current schema copy
  migrations/
    202609110001_month1_foundation/migration.sql
    202609120001_month1_auth_ledger_hardening/migration.sql
    202609140001_identity_history_seed_hardening/migration.sql
    202609140002_application_postgrest_lockdown/migration.sql
    202609150001_authorization_scope_delete_restrict/migration.sql
    202609160001_reservation_foundation/migration.sql
    202609210001_application_acl_hardening/migration.sql
```

Use installed Prisma from repository root with the supported schema argument and the explicitly approved **upgrade disposable** CLI environment:

```sh
node node_modules/prisma/build/index.js migrate deploy --schema "REPLACE_ABSOLUTE_EXTERNAL_STAGE/schema.prisma"
node node_modules/prisma/build/index.js migrate status --schema "REPLACE_ABSOLUTE_EXTERNAL_STAGE/schema.prisma"
```

Run the second command only after successful deploy. Confirm seven finished matching records, 29 retained application tables and `_prisma_migrations`, no connected tables, no unrelated public tables and no business rows. The upgrade tool enforces exact public-table topology, history and role requirements. Read-only verification uses the authoritative tools/manifest and recognizes historical-29/pending; do not require the staged schema to become an alternative manifest.

### Prepare — explicit persistent synthetic baseline confirmation

Choose a new lowercase UUID snapshot ID and record it. It must not already have a local snapshot artifact. Supply the same four-role topology and the upgrade target's dedicated disposable URL:

```sh
npm run db:connected-domain:upgrade -w @rhc/database -- \
  --phase prepare \
  --snapshot-id "REPLACE_NEW_LOWERCASE_UUID" \
  --confirm-preserve-synthetic-baseline \
  --authorize-disposable-writes \
  --target-host "REPLACE_NUMERIC_LOOPBACK" \
  --target-port "REPLACE_APPROVED_PORT" \
  --target-database "REPLACE_UPGRADE_DATABASE" \
  --target-role "REPLACE_APPROVED_OWNER_LOGIN" \
  --confirm-disposable "REPLACE_LOOPBACK:REPLACE_PORT/REPLACE_UPGRADE_DATABASE" \
  --confirm-run-owned-initially-empty \
  --fixture-role "REPLACE_PRECREATED_FIXTURE_ROLE" \
  --browser-role "REPLACE_PRECREATED_BROWSER_A" \
  --browser-role "REPLACE_PRECREATED_BROWSER_B"
```

Prepare locks the retained tables, rechecks topology/history and emptiness under ReadCommitted after lock acquisition, inserts the synthetic baseline, and **commits**. It rejects any nonempty retained table. Hashing is performed inside PostgreSQL over exact old-column projections, with sorted aggregate SHA-256 and counts; business row contents do not cross the driver boundary.

The local artifact is `packages/database/prisma/connected-domain-snapshot-UUID.json`. It binds source, exact target and database OID, and stores counts/digests, not row content. Creation is exclusive; do not overwrite/reuse an ID. Only state `committed` can be compared. A failure can leave `outcome-unknown` or `prepared-not-commit-proven`: **do not retry prepare against a possibly populated target, delete the marker to force success, or infer whether the database committed**. Stop for operator investigation and a separately approved new disposable run if needed.

### Deploy the final eighth migration from the authoritative tree

Obtain the separate eighth-migration deployment approval. Keep the same upgrade database and approved owner identity; preserve the prepared snapshot/source binding. Recheck the full source manifest, then run:

```sh
node node_modules/prisma/build/index.js migrate deploy --schema packages/database/prisma/schema.prisma
node node_modules/prisma/build/index.js migrate status --schema packages/database/prisma/schema.prisma
```

Run status after successful deploy. The same target ledger contains the matching seven prefix entries, so the authoritative eight-migration tree should apply only `202610060001_connected_domains`. Stop if Prisma proposes unexpected history or failure. Do not copy the eighth into a competing history, regenerate SQL from the final schema, or mark the first seven applied manually.

### Compare — read-only hashes, same target and snapshot

Use the same snapshot UUID and **`CONNECTED_DOMAIN_DISPOSABLE_URL`**, not the read-only verifier variable. The CLI intentionally still requires all disposable authorization/provenance flags, but compare sets its transaction READ ONLY. Do **not** pass `--confirm-preserve-synthetic-baseline` for compare:

```sh
npm run db:connected-domain:upgrade -w @rhc/database -- \
  --phase compare \
  --snapshot-id "REPLACE_SAME_LOWERCASE_UUID" \
  --authorize-disposable-writes \
  --target-host "REPLACE_SAME_NUMERIC_LOOPBACK" \
  --target-port "REPLACE_SAME_PORT" \
  --target-database "REPLACE_SAME_UPGRADE_DATABASE" \
  --target-role "REPLACE_SAME_OWNER_LOGIN" \
  --confirm-disposable "REPLACE_SAME_LOOPBACK:REPLACE_SAME_PORT/REPLACE_SAME_UPGRADE_DATABASE" \
  --confirm-run-owned-initially-empty \
  --fixture-role "REPLACE_SAME_FIXTURE_ROLE" \
  --browser-role "REPLACE_SAME_BROWSER_A" \
  --browser-role "REPLACE_SAME_BROWSER_B"
```

Compare requires eight consistent migrations, all 45 tables, the same database OID/target/source binding and committed snapshot. It verifies exact retained-column counts/digests and that `notifications.read_at` plus the five redemption extension columns remain NULL on the baseline. Success is `baseline-preserved`. This demonstrates preservation of the synthetic baseline only, not all possible hosted data or CHECK/trigger semantics. Synthetic baseline rows intentionally remain; neither phase offers deletion/cleanup.

Run separately authorized catalog/ACL review and, if approved, the rollback fixture suite on this upgraded target as additional evidence. Use the upgraded target values, never the fresh target's stale environment. Preserve the baseline for investigation; later disposable decommissioning is a separate operator action, not a reset step here.

## 8. Hosted development deployment — still NO GO

Do not progress merely because local source checks or disposable tests succeed. Require a new signed hosted-development authorization, actual checksum reconciliation, backup/recovery readiness and role/default/owner review. First perform the separately authorized catalog/preflight procedure against the exact hosted target. Direct connectivity with a supported role identifier is recommended; an unsupported dotted pooler login or required unsupported URL options remain blockers.

For a target with the seven historical migrations, verify their exact checksums and object state and identify only the eighth as pending. For an actually empty hosted target, all eight migrations and historical global-default effects require explicit approval. Never assume a target is empty because a migration ledger is missing. Existing objects without matching history require reconciliation, not reset or automatic baselining.

Only after approval and secure exact-target Prisma environment setup may the operator use:

```sh
npm run db:migrate -w @rhc/database
```

This is deploy, not dev. It does not inherit authorization protections from the connected verifier. After successful deployment, collect status and separately authorized read-only verifier/45-table ACL evidence. Require independent backend regression results using the approved runtime identity, especially linked-debit mutation compatibility and parent/history visibility. No hosted synthetic prepare/disposable fixtures, generic seed, bucket changes or feature activation belong in this procedure.

Private storage has a **separate** approval plan: private buckets, upload identity, immutable object retention, checksum/MIME/malware validation, download authorization, deletion/legal retention, backup and restore coordination. The migration stores metadata only. **No buckets, storage policies or storage objects were modified by this task.**

## 9. Stop conditions, forbidden shortcuts and acceptance record

Stop on source/hash drift; unknown exact target or role; unsupported pooler/topology; missing approvals/backups; unsafe defaults/memberships; unresolved history; unexpected objects/ACLs; unverified CHECK/predicate definitions; failed deployment; snapshot ambiguity; or runtime scope/visibility failures. Capture sanitized results and escalate to database/security/backend owners. An atomic eighth migration can roll back its own DDL/data changes, but Prisma may retain a failed ledger record outside that transaction. Atomic SQL is not permission for blind retries or an automatic rollback of a completed release.

**Forbidden in this runbook:** `prisma migrate reset`, `prisma db push`, `prisma migrate dev`, automatic `migrate resolve`/mark-applied/mark-rolled-back, manual ledger writes, editing historical migration bytes, unapproved schema diff execution, arbitrary SQL-console fixes, seed against hosted targets, blanket schema/database drops, broad grant/revoke cleanup, trigger/RLS disabling, owner/superuser/BYPASSRLS runtime workarounds, and fixture execution against hosted data. Do not alter Auth/storage/provider objects or force normalizations simply to make a verifier report pass. Recovery needs a separately reviewed restore/forward plan and exact authorization.

Keep an acceptance record with **distinct** results:

- Source/tool versions, schema/eight SQL hashes and aggregate binding; seven historical files preserved.
- Exact approved target/connection mode and roles, authorization references, backup/restore and lock-window evidence (no credentials).
- Fresh deploy #1 and successful no-pending deploy #2, status, catalog/preflight findings, disposable rollback suite result.
- Historical staging copy hashes, seven-migration deployment, committed snapshot marker, eighth deployment, read-only comparison, post-upgrade catalog/preflight and fixture evidence.
- Hosted history reconciliation and deployment evidence, if separately authorized later; none exists from this task.
- CHECK/predicate deparser acceptance or explicit unresolved status; concurrency/replica tests not covered by the supplied suite remain separately pending.
- Non-owner runtime positive/negative tests, legacy rewards regression, API permission/tenant tests and feature acceptance; none is inferred from metadata compilation or owner fixture success.
- Privacy/private-storage approval and business lifecycle decisions; no feature/bucket activation bundled with schema deployment.

**Current disposition: documentation and local source/help/hash review only. Disposable execution: NOT AUTHORIZED / NOT RUN. Hosted reads/deployment: NOT AUTHORIZED / NOT RUN. SQL executed: NONE. Catalog cleanliness and backend CRUD: NOT PROVEN; runtime/grant and live-deparser decisions remain blocked.**
