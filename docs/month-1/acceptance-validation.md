# Month 1 Acceptance Validation

**Current decision: prepare-only; staging migrations NO GO; no deployment.** Source implementation and fixture suites are substantial, but they do not constitute live acceptance. The prior configuration check rejected database URL syntax; no valid target, role/grants or applied migrations have been established.

## Evidence available

- Static implementation review: real Supabase JWT/Admin identity verification, separate email/business state, PKCE-only browser flows, scoped/validated management, hashed delegated machine keys, consent, and wired Redis IP/subject limits.
- Main-reported fixture results: **210 unit tests / 11 suites**, **140 API tests / 8 suites** passing.
- Final frontend reruns pending: approximately **55 customer / 65 admin** tests, not final pass counts.
- Four migration directories prepared; **none applied in this handoff**, including RLS/revocation lockdown. Historical dependency/audit evidence remains a dated snapshot; Docker was not tested and host Node 24 is not a Node 22 run.

## Required gates, in order

1. **Finish offline validation.** Main records exact final lint/typecheck/build/audit and test commands, results, runtime and revision/snapshot in the [completion report](targeted-completion-report.md#pending-final-result-main-to-update). Rerun both frontend suites after the final changes. Verify Node 22 and, where intended, the Docker image/container separately. Do not turn missing services into mock runtime success.
2. **Approve the target and security model before database execution.** Correct URL syntax securely, identify the intended nonproduction/disposable database, and obtain explicit migration/creator/runtime role, ownership and grants approval. Review direct/column/inherited grants, RLS policies, views/RPCs, backend bypass/policies, and creator default-ACL effects. Do not print URLs, passwords, keys, tokens, or user identities into evidence.
3. **Execute the migration chain only on approved disposable PostgreSQL first.** Apply all four migrations in order, validate SQL-only indexes/constraints, retained history, account/customer ledger ownership, and role/ACL effects. Exercise the lockdown with representative Supabase client roles; if those roles are absent the SQL skips them, so that case alone does not prove client denial. Test owner/service access and intended non-owner backend behavior. Check actual concurrent provisioning/approval/ID issuance/idempotency, not merely mocked transactions.
4. **Review the disposable results and explicitly authorize staging migration.** Until steps 2–3 pass, staging remains NO GO. Approve backups, reconciliation of conflicting existing data, rollback/recovery procedures, actual ingress topology, and operational owners. Seeds/sample inventory and bootstrap remain separate decisions; never automatic predeploy/startup work.
5. **Run separately approved live nonproduction acceptance.** After authorized migration/configuration, verify the matrix below through the actual applications/API and direct database/provider access paths. A migration success alone is not release acceptance.
6. **Release sign-off.** Only after live checks and all blockers are resolved may owners approve deployment separately. A UI setting `month_1_acceptance_state=accepted`, fixture count, generated Prisma client, or passing health probe cannot replace sign-off.

## Live acceptance matrix (all pending)

| Area | Required evidence |
| --- | --- |
| Supabase identity | Correct JWKS/issuer/audience and authoritative confirmation; invalid/expired/wrong-project JWT denial; disabled/locked/banned/deleted identity behavior; no UUID-token fallback. |
| Browser auth | Actual delivery and redirect allowlists; same-browser PKCE signup confirmation and recovery; reject implicit/hash-token, expired/replayed/missing-verifier links without using an existing session. |
| Registration | `/auth/config` UI behavior plus new API provisioning gate; verify direct Supabase signup policy independently using external disablement/hook when closed. |
| Business identity | Confirmation leaves business `PENDING`; reviewed non-self admin approval with expected status/reference; eligible ID issuance is idempotent under real concurrency; approved identity edits denied, mobile allowed. |
| Admin authorization | Cross-company/project list, metric, reference and body-target isolation; expired/mismatched grants; global governance restrictions; status/role/permission/settings protections and transactional audit evidence. |
| Consent and machine access | Append/withdraw history; company/purpose boundaries; hashed key issue/rotate/revoke and delegation checks; internal event allowlist/idempotency; withdrawal/disablement invalidates positive replay results. |
| PostgreSQL/PostgREST | All migration records, SQL-specific constraints, RLS flags, table/column/sequence ACLs, creator defaults, indirect view/RPC/inherited access, denied browser reads/writes, preserved approved backend access. No FORCE RLS means owner bypass must be understood. |
| Redis/ingress | Live multi-instance IP/user/client limits, 429/Retry-After and 503 fail-closed behavior; actual peer CIDRs, forwarding rewrite, forged-XFF rejection and separate client buckets. |
| Operations | Health/readiness distinction, safe logs/errors, protected secrets/build context, current audit, Node 22, container if used, backup/restore and agreed incident/recovery ownership. |

This documentation pass did not run migrations, seeds, bootstrap, live probes, deployments, or application test suites. Its validation is limited to source/document consistency and local documentation checks. See [known limitations](known-limitations.md).
