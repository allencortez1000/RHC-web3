# Database Schema

The schema is defined in `packages/database/prisma/schema.prisma` and includes normalized Month 1 tables:

- users, user_profiles, rhc_id_sequences
- companies, projects
- roles, permissions, user_roles, role_permissions
- properties, property_status_history, customer_properties
- business_services
- company_integrations, company_api_clients, company_events, integration_logs
- notifications, consent_records, feature_flags
- audit_logs, activity_events
- rewards_accounts, rewards_rules, rewards_transactions, rewards_redemptions
- reservations, reservation_events
- system_settings

UUIDs are internal identifiers, not authentication credentials. RHC Digital IDs are server-generated public identifiers in `RHC-YYYY-XXXXXXXX` format; knowing an ID is not authorization. Treat its association with a person as personal data even though the identifier is not a secret.

## Migration status: five pending, none applied in this handoff

| Migration | Purpose |
| --- | --- |
| `202609110001_month1_foundation` | Initial Month 1 schema. |
| `202609120001_month1_auth_ledger_hardening` | Auth/ledger hardening following the foundation. |
| `202609140001_identity_history_seed_hardening` | Separate Auth confirmation timestamp, global-role uniqueness, history-preserving foreign keys, ledger ownership and index reconciliation. |
| `202609140002_application_postgrest_lockdown` | Backend-only application table RLS and client-role privilege lockdown. |
| `202609160001_reservation_foundation` | Additive reservation, reservation event, and property status history foundation. |

Migration source lives under `packages/database/prisma/migrations`. **No applied constraints, RLS, or revocations are claimed.** The prior configuration check found invalid database URL syntax; target connectivity/roles/grants are unknown. Staging migration is **NO GO** until a valid target and role/grant plan are approved and all five migrations are exercised on disposable PostgreSQL. Do not rewrite migration history or run seeds/bootstrap to disguise an unverified database.

## Identity and history invariants

- `users.auth_email_confirmed_at` records authoritative Supabase Auth confirmation, separate from account state and business `verification_status`. Existing rows are left unconfirmed by the additive migration until authoritative synchronization; migration does not approve users.
- New application users start business `PENDING`. Reviewed admin approval and ID issuance use transactions/user-row coordination; approved/issued identity self-edits are blocked except mobile contact changes.
- `rhc_id_sequences` is an application table, not a SQL sequence. ID issuance uses a yearly atomic counter, user locking and serializable retries, with one audit/event committed with issuance. Real concurrency still needs PostgreSQL validation.
- A partial global-role code unique index handles null `company_id`; Prisma 5 cannot express that index. Preserve it in future migrations and inspect SQL-specific invariants separately from Prisma diff.
- Customer-property, consent, notification and reward history uses restrictive deletion relationships in the hardening migration. Consent decisions are appended rather than replacing prior grants/withdrawals.
- Reservations use `reservations`, `reservation_events`, and `property_status_history`. Active property reservations are constrained by a partial unique index for `PENDING`/`CONFIRMED`, while status transitions retain auditable event and property-status history.
- Rewards transactions are an inactive Month 1 ledger foundation: corrections use reversals/adjustments, not silent mutation. Composite account/customer foreign keys prevent mismatched ownership; populated-data conflicts deliberately fail for manual reconciliation.
- Machine client `credential_ref` holds a versioned key hash, not plaintext key material. Service event receipts are transactional and scoped/idempotent; they do not post rewards or other business transitions.

## PostgREST lockdown design and required role review

The fourth migration targets an explicit allowlist of 26 application tables in `public`. It enables RLS and revokes direct table, column and owned-sequence privileges from `PUBLIC`, `anon`, and `authenticated` (where roles exist), without changing existing auth/storage/system objects. It does **not** use `FORCE ROW LEVEL SECURITY`, add browser policies, or create backend grants.

Owners retain their normal bypass; existing `service_role` grants are unchanged. The intended data boundary is owner/service backend access through the API. A non-owner Prisma SQL role needs explicit object privileges **and** `BYPASSRLS` or deliberately approved backend-only policies; grants alone are insufficient. A service JWT is not a SQL role grant. Browser roles must not own objects or inherit backend privileges.

Default privilege revocations apply only to objects subsequently created by `CURRENT_ROLE`, not every member/creator role. Global defaults affect that creator across schemas; schema-local revocation alone cannot cancel a global default grant. Review that impact if the migration role creates unrelated objects. Future application tables still need explicit RLS enablement.

Before approval, inspect actual database identity, migration/creator/runtime roles, object ownership, direct/column/inherited grants, policies, views and `SECURITY DEFINER` RPCs. Existing indirect access paths are not closed merely by these direct revocations. Missing application tables/insufficient rights fail the SQL rather than being skipped; grant chains need review rather than `CASCADE`. Prisma diff and fixture tests cannot prove this ACL boundary.

## Seed boundary

Seed code defines the eight-company RHC catalog, AMICA-T1 and clearly identified sample inventory (opt-in via `SEED_SAMPLE_INVENTORY=true`); definitions are not evidence that a target was seeded. Do not interpret prepared rewards/service records as active features or sample records as production inventory. Seed execution and admin identity bootstrap are separate approved operator steps, never automatic install/build/startup actions. See [acceptance](../month-1/acceptance-validation.md).
