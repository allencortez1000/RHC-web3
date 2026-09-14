# Known Limitations

## Release and validation blockers

- **Prepare-only; staging migrations NO GO; no deployment performed.** All four migrations remain pending. A prior configuration check rejected database URL syntax; no valid live target, migration/runtime roles, ownership, or grants have been verified. No secret values are recorded here.
- Required next gates are target/role/grants approval, approved execution of the full chain on disposable PostgreSQL, and separately approved live acceptance. Generated Prisma code, static SQL review, or schema diff is not evidence that migrations, constraints, RLS, or revocations have been applied.
- Main reports **210 unit tests / 11 suites** and **140 API tests / 8 suites** passing using fixtures/test doubles only. Final customer/admin browser reruns remain pending (approximately **55 / 65**, not confirmed pass counts). Historical hardening reports describe earlier runs and are not the current acceptance verdict.
- The preparation host used Node **24.21.0**; Node **22.13+** is the design/runtime baseline and CI/Docker use Node 22. A local Node 22 run and Docker build/container smoke test are not established. Docker was unavailable during dependency preparation.

## Authentication, privacy, and authorization boundaries

- Supabase JWT/JWKS verification and server-side Auth Admin confirmation are implemented, **not** future boundaries. There is no opaque user-ID bearer token or runtime mock fallback. Missing dependencies cause errors rather than demo success; API startup rejects `USE_MOCK_DATA=true`.
- Supabase email confirmation populates `auth_email_confirmed_at`, distinct from business `PENDING`/`VERIFIED`. Business approval requires a reviewed admin action. Approved/issued identity fields cannot be changed through `/me` except `mobile_number`; a reviewed administrative identity-correction workflow is not implemented.
- Confirmation/recovery is PKCE-only and must complete in the same browser/storage context that requested the link. Implicit bearer-token and token-hash links are intentionally rejected. Live email delivery/templates, redirect allowlists, provider settings and cross-environment behavior still need acceptance.
- `GET /auth/config` and `ENABLE_REGISTRATION` gate registration UX/new application provisioning, **not raw Supabase signup**. An external Supabase signup-disable setting or approved Auth hook is required to stop direct provider signup. API Redis limits also do not cover direct Supabase auth requests.
- Admin CRUD/management is implemented with strict DTOs, scope and delegation enforcement, reference lists and audit evidence. It is not arbitrary CRUD: protected system roles, global user state, allowlisted settings, self-management restrictions, and review references are deliberate constraints. A listed user is not automatically approved; backend checks remain authoritative.
- Consent history is implemented and append-only. Signup metadata acceptance is not a substitute for a persisted consent decision or legally approved policy/version and retention process.
- Frontend sessions use Supabase SDK browser persistence, not an HttpOnly-cookie session design. XSS controls, token lifecycle, provider outage behavior, and operational observability require ongoing review.

## Infrastructure and integration boundaries

- PostgREST lockdown is **pending SQL only** for application tables in `public`; no applied RLS/revocations are claimed. It uses **no FORCE RLS**, preserving owner bypass and leaving existing service-role grants unchanged. Non-owner backend roles require privileges plus bypass or deliberate backend-only policies. Inherited grants, views/RPCs, creator-specific default ACLs and target topology need manual review; see [schema](../database/schema.md).
- Redis IP and authenticated user/client limits are wired. Actual Upstash connectivity/multi-instance limits and fail-closed behavior are not live-verified. `TRUSTED_PROXY_CIDRS` requires an explicit, manually verified ingress topology; no default cloud range/hop count is safe to assume.
- Hashed machine keys, delegated scopes, company-bound directory reads, consent-bound identity checks, and idempotent allowlisted service event ingestion are implemented. They are not a general integration executor, webhook delivery/retry queue, identity-data export, or rewards settlement workflow.
- R2, Resend, Twilio, Sentry and hosting configuration are not proof of working storage, messaging, telemetry, or deployments. Only supply provider credentials for approved integrations; configuration inventories do not imply those adapters are operational.
- RHC Points/rewards activation, Wallet, Marketplace, Blockchain, token transfer/sale, crypto payment, staking and custody remain intentionally inactive/out of Month 1 scope. Seed definitions/sample inventory do not prove any target was seeded, nor that sample properties are real production inventory.

See [targeted completion report](targeted-completion-report.md) for current evidence and the pending final-result section, and [Month 2 handoff](month-2-handoff.md) for actual extension boundaries.
