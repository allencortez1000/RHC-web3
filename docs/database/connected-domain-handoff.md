# Connected-domain database handoff

**Date:** 2026-10-06  
**Starting branch / commit:** `combined-1.0` / `0abb97a23080ee4ca8429b9b7ee08d03d73be9fc`  
**Outcome:** **Schema and migrations implemented; offline checks passed; disposable testing and hosted development application pending authorization and acceptance gates.**

This is a working-tree implementation, not a commit, push, release approval or deployed database. Credentials in an environment file were not treated as connection authority. No disposable or hosted target was identified/authorized for this task; none was connected to.

## 1. Implementation scope and actual count

All **29 original application models** remain, with their scalar types, original defaults, indexes, authentication linkage and historical migration files retained. Exactly **16 distinct connected-domain models** were added, giving **45 source-defined application tables**. Auth/storage/provider tables, migration bookkeeping and optional operational tables are excluded.

| New domain | Physical tables |
| --- | --- |
| Documents and identity (4) | `documents`, `document_versions`, `document_reviews`, `identity_review_requests` |
| Payment evidence (2) | `payment_records`, `payment_record_events` |
| Certificates and verification (3) | `certificates`, `certificate_events`, `verification_references` |
| Service requests (2) | `service_requests`, `service_request_events` |
| Journey and turnover (4) | `saved_properties`, `project_milestones`, `turnover_cases`, `turnover_checklist_items` |
| Benefit catalog (1) | `rewards_benefits` |

Six nullable existing-table additions preserve missing legacy information honestly:

- `notifications.read_at`.
- `rewards_redemptions.benefit_id`, `benefit_company_id`, `accepted_points_cost`, `accepted_terms_snapshot`, `original_debit_id`.

No historical notification is marked read, and no historical benefit/price/terms/debit link is fabricated. Composite candidate keys/FKs protect service/company, payment/reservation/customer/property and redemption/benefit/account-company consistency. Reservations gain no retry/version column and retain their state/history/partial-unique protections. Approved profile values and Auth linkage are not redesigned or unlocked.

## 2. Files changed or added

### Schema and migration

- `packages/database/prisma/schema.prisma` — 16 models, proposed enums, inverse relations, nullable extensions and supporting keys/indexes.
- `packages/database/prisma/migrations/202610060001_connected_domains/migration.sql` — one atomic additive migration, ordered by dependencies; SQL checks, partial indexes, history protections, UTC guards, composite consistency, RLS and exact new-object ACL closure.
- `packages/database/prisma/application-acl-preflight.ts` — explicit independent inventory expanded from 29 to 45.

### Tools, tests and local artifacts

All following files are under `packages/database/prisma/`:

| File | Responsibility |
| --- | --- |
| `connected-domain-source.ts` | Independent inventory, migration parser, expected constraints/indexes/triggers/functions, ledger classification and byte binding |
| `connected-domain-structure.ts` | Expected column/default/type/enum structure |
| `connected-domain-baseline.json` | Pinned baseline source evidence |
| `connected-domain-manifest.json` | SHA-256 binding for schema and all eight migrations |
| `connected-domain-gates.ts` | Explicit authorization, exact target matching, dedicated environment variables and safe client/transaction controls |
| `connected-domain-verify.ts` | Read-only catalog/ledger/access inspection with redacted output |
| `connected-domain-disposable.ts` | Gated rollback-only SQL/runtime fixture runner |
| `connected-domain-fixtures.sql` | Synthetic positive/negative integrity fixtures, not a shared development seed |
| `connected-domain-upgrade.ts` | Gated populated-baseline preparation and read-only post-upgrade comparison |
| `connected-domain-upgrade-fixtures.sql` | One synthetic record per retained table, only on confirmed empty run-owned disposable target |
| `connected-domain.spec.ts` | Offline source and safety-gate regressions |
| `connected-domain-catalog.spec.ts` | Mocked catalog equality/drift/ACL reporting regressions |
| `connected-domain-upgrade.spec.ts` | Upgrade protocol and snapshot binding regressions |

Additional changed files:

- `packages/database/package.json` — local test/typecheck/manifest/verifier/disposable/upgrade scripts; dependency versions unchanged.
- `apps/api/test/application-acl-migration.spec.ts` — retain the historical 29-table migration contract while verifying the new 45-table preflight.
- `apps/api/test/migration-order.spec.ts` — cumulative ACL chronology and same-transaction new-table lockdown coverage.
- `.gitignore` — ignore only generated `connected-domain-snapshot-*.json` artifacts from future disposable upgrade runs.

### Documentation

- [Source map](connected-domain-source-map.md) — all 45 mappings and source-versus-proposal decisions.
- [Data dictionary](connected-domain-data-dictionary.md) — every persisted column, types, nullability, defaults, FKs, indexes and SQL guard semantics; 472 scalar columns across all models.
- [Access matrix](connected-domain-access-matrix.md) — database/API/pending boundaries and actual runtime limitations.
- [Development migration runbook](supabase-dev-migration-runbook.md) — version-compatible commands, authorization, history, backup, execution and recovery gates.
- [Validation record](connected-domain-validation.md) — actual commands, failures corrected, final offline results and unexecuted SQL stages.
- [Editable Mermaid ERD](connected-domain-erd.md) — all 45 models and 96 declared FKs in domain diagrams.
- This handoff.

The two earlier untracked user documents remain untouched. Generated Prisma/dist artifacts were local build outputs, not new migration history. `package-lock.json` and dependencies were not replaced or upgraded.

## 3. Migration status — do not conflate these columns

| Migration set | Prepared source | Tested in this task | Actually applied in this task |
| --- | --- | --- | --- |
| Seven historical migrations | Retained unchanged | Offline byte/history/preservation checks only | **No** |
| `202610060001_connected_domains` | Implemented, byte-bound | Prisma/offline/static tests passed; SQL execution **not run** | **No** |
| Hosted DEVELOPMENT | Target not identified | No catalog/role/data observation | **No** |
| Staging / production | Not authorized | Not accessed | **No** |

Final binding: `5fe6c4289c20c7bfec3e1df76558a049069abd8a16a11ba74ca6bfb78a0d9368`.

- Schema SHA-256: `d081c4053617cc6f6617499a62a5b8a3b71afea151174b3b19bbe8fed74b7cb6`.
- Added SQL SHA-256: `d765162a0abf53cd8dc01b98586c0af1461ac306448045bdb85bacadb9f1a99c`.

The combined-branch report documents divergent historical bytes for `202609140002_application_postgrest_lockdown`. Hosted ledger reconciliation remains mandatory. No automatic baseline/resolve, checksum rewrite or historical migration edit was performed. Any migration content change needs new review and renewed checksum-bound operator approval before application.

## 4. Design decisions and unresolved approvals

**Established source contracts retained:** application UUIDs distinct from Supabase Auth identifiers; existing Decimal money/points types; timestamp precision; company/project RBAC; restrictive evidence/ledger ownership; backend-only access; inactive rewards/Web3/public verification boundaries.

**Engineering proposals implemented but not business-authorized:**

- Single optional version-specific identity evidence; typed requested corrections with NULL meaning “not requested.” Multiple evidence and explicit field clearing need a separate design decision, potentially another table, before claiming that scope complete.
- Payment status is event-derived; one terminal review per submission, linked single reversal and caller/parent-scoped retry uniqueness. This is review of claimed payment, not collection, settlement or refunds.
- Certificate artifacts and lifecycle events are separate; exactly one typed property/document-version source, explicit issuer and conservative same-source supersession. Certificate event inserts require SERIALIZABLE with retry handling.
- Verification stores only a verifier hash; random 256-bit token generation/delivery and future lookup are separately specified, not activated. SQL requires disabled/NONE disclosure.
- Service progress/assignment event enums, milestone publication rules and turnover statuses are proposals. No one-case-for-all-time rule is invented; cardinality/active-case policy remains unresolved. Nullable turnover creator/responsible-user FKs preserve attribution without inventing required staff assignment; the creator cannot later change.
- Benefits remain SQL-hard-inactive; approved terms/costs are not populated. A redemption links one original REDEEM debit, with reversals using the retained ledger model.
- New timestamps use UTC without rewriting historical timestamp definitions. DB-normalized new `updated_at` and notification read time are documented; supplied factual timestamps are validated.

## 5. Validation summary

Final local results, not historical totals:

| Check | Result |
| --- | --- |
| Prisma 5.22 schema validation / generation | PASS |
| Shared/Web3/API build | PASS |
| All-workspace typecheck | PASS |
| Database/API lint | PASS |
| Connected-domain offline tests | **77 passed / 0 failed** |
| Database seed unit tests (injected delegates) | **7 passed / 0 failed** |
| API unit/static tests | **499 passed / 0 failed**, 24 suites |
| API fixture HTTP tests | **194 passed / 0 failed**, 10 suites |
| Source manifest, whitespace and documentation-link checks | PASS |
| Editor diagnostics | UNRESOLVED: missing Prisma exports/downstream errors despite passing CLI validation; see validation record |
| Real database test groups | **0 executed; 8 blocked/not-run groups** in validation record |

No SQL semantic, concurrency, RLS, PostgreSQL upgrade or real runtime-access pass is claimed.

## 6. Blocking gates and owners

| Blocker | Required owner/action |
| --- | --- |
| No disposable target approval | Operator/database owner: identify run-owned loopback PostgreSQL target, roles and fresh/upgrade fixture authorization; current narrow gate does not support ordinary Docker port mapping |
| Proposed lifecycle decisions | Domain/compliance/finance owners: approve states, permissions, evidence multiplicity, correction clearing, turnover cardinality, retention and publication scope |
| No actual backend SQL-role contract | Database/security/backend owners: approve least privilege and resolve invoker/RLS compatibility; do not grant owner/superuser/BYPASSRLS to make tests pass |
| Scope-sensitive existing rewards mutation blocker | Backend/database/security owners: evaluate the new linked-debit guard under the actual runtime role; active RLS can reject unlinked legacy updates too |
| Conservative catalog-expression comparison | Database/tooling owners: review PostgreSQL deparser output on authorized disposable target; never suppress unverified expressions merely to report success |
| Historical migration checksum divergence | Database/change owner: inspect approved target ledger and reconcile before any write |
| No DEVELOPMENT target/backup approval | Operator: exact Supabase project reference, environment, host/database/roles, separate read and migrate authorizations, backup/recovery evidence and reviewed immutable migration list |
| No connected-domain services | Backend/product owners: implement scoped APIs, DTOs and transaction/state machines before changing capability gates |

Named individuals were not available; these are ownership roles, not fabricated assignments or sign-offs.

## 7. Backend integration guidance

1. Generate Prisma Client 5.22.0 from the reviewed schema and use the existing `@rhc/database` export. The client is already generated locally; clean checkouts must regenerate. Do not instantiate a second database or use browser `.from(table)` calls.
2. Keep `packages/ui/src/api-capabilities.ts` and existing feature locks unchanged until each connected workflow exists and passes acceptance.
3. Implement controllers/services with authenticated customer identity, existing RBAC, resource-derived company/project scope and explicit permission definitions. A supplied actor/assignee/issuer UUID is not authority. No new permission catalog or user bootstrap is seeded here.
4. Map proposed enums and Decimal serialization explicitly to DTOs; do not copy demo shapes wholesale. Derive payment/certificate state from their histories. Keep internal evidence references, review notes and identity data out of public/customer projections unless approved.
5. Use scoped transactions, parent locking and retry handling. Certificate events require Prisma `Serializable`; other cross-row workflows also need tested isolation. Atomically update projections, append history, and write existing audit/activity evidence. Retry keys must compare request payload semantics, not merely catch uniqueness errors.
6. Integrate private uploads separately: stable private bucket/object IDs, server-side checksum/MIME/size checks, scanning decisions, immutable retained objects, scoped short-lived download authorization and approved retention. No bucket or storage policy is created here.
7. Apply approved identity corrections only through a reviewed service; request approval alone does not mutate `user_profiles`. Never unlock direct verified-field edits.
8. Implement redemption posting/reversal with actual ledger, account locks and overspend checks; a benefit row is not an active offer. Do not enable rewards, public references or financial actions from table presence.
9. Test cross-customer/company/project denial through new APIs and the real approved backend role. A rollback-only document RLS fixture is not the hosted policy contract.

## 8. Safety confirmation and next action

No production/staging/hosted development data, provider-managed `auth.*`/`storage.*` definitions, source branch history, original migration bytes, lockfile, demo-world data, feature flags, capability registry, real files/imports, external delivery, payment collection or Web3/financial activation was changed. Prisma bookkeeping was neither manually edited nor touched through deploy. No sample-data script was run against any database.

**Next operator request:** authorize and identify the disposable PostgreSQL target/roles first. After its tests and pending design/security decisions are resolved, provide checksum-bound read/application approval for the exact DEVELOPMENT Supabase project using the runbook. Until then, do not run migration deployment or claim hosted application.
