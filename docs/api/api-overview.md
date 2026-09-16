# API Overview

Base path: `/api/v1`. Paths below are relative to that base. Swagger is opt-in at `/api/docs` only when `ENABLE_SWAGGER=true`; Zod schemas/controller code remain authoritative for request bodies.

## Authentication and responses

Browser password login/signup, logout, email confirmation, and recovery use the Supabase SDK directly. The Nest API does **not** implement `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/verify`, or `/auth/session`.

Protected user routes require `Authorization: Bearer <Supabase access JWT>`. The API verifies signature (ES256/RS256), issuer, audience, and required time/subject claims, then confirms the identity through the server-only Supabase Auth Admin API. Internal user UUIDs are identifiers, not bearer credentials. Machine routes use `X-API-Key`, never a user session.

Success envelope:

```json
{ "success": true, "data": {}, "meta": { "request_id": "uuid" } }
```

Error envelope:

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Readable description" }, "meta": { "request_id": "uuid" } }
```

Expect 400 for invalid input, 401 for invalid/missing authentication, 403 for denied permissions/features, 404 for unavailable resources, 409 for conflicting state, 429 for rate limits, and 503 for unavailable dependencies where mapped. There is no runtime fixture fallback. Redis rate limits apply globally by IP and, after authentication, by stable user/client identity; see [security](../security/security-baseline.md).

## Public and customer endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/health` | Process liveness only; exempt from IP rate limiting. |
| GET | `/health/ready` | PostgreSQL/Redis readiness, rate-limited; not Auth, migration or RLS acceptance. |
| GET | `/auth/config` | No-store `{ registration_enabled }`; missing/disabled database flag returns false. Registration UI precheck only; new API-user provisioning independently checks the flag. Does not disable raw Supabase signup. |
| GET | `/auth/session` | Verified Supabase identity synchronized to an application user; returns `{ authenticated, user }`. May provision on first access if registration is enabled. |
| GET / PATCH | `/me` | Own user/profile read and allowlisted profile updates. Approved or ID-issued identity fields are locked; only `mobile_number` remains self-editable. |
| GET / POST | `/me/rhc-id` | Read / explicitly issue ID; POST accepts an empty body, needs enabled `ENABLE_RHC_ID`, confirmed Auth email, active account, and business `VERIFIED`. |
| GET | `/me/properties` | Own active, currently effective customer-property relationships; `ENABLE_PROPERTIES`. |
| GET / POST | `/me/reservations` | Own reservation history / create an atomic property hold for an available property; `ENABLE_PROPERTIES`. |
| POST | `/me/reservations/:id/cancel` | Customer cancellation for own active reservation, with audit/event history. |
| GET | `/me/notifications` | Own notifications, bounded and ordered. |
| GET / POST | `/me/consents` | Policy/history read / append a grant or withdrawal; no historical record overwrite. |
| GET | `/companies` | Public allowlisted directory fields; `ENABLE_COMPANY_DIRECTORY`. |
| GET | `/business-services` | Public service catalog filtered by service/company status; `ENABLE_INTEGRATION_FRAMEWORK`. |
| GET | `/projects` | Active public projects and companies; `ENABLE_PROPERTIES`. |
| GET | `/properties/:id` | Available property in an active project/company only; no customer identity; `ENABLE_PROPERTIES`. |

Email confirmation populates `auth_email_confirmed_at`; it does **not** set business `verification_status=VERIFIED`. New application users start business `PENDING`. Existing disabled/locked accounts cannot be revived through login.

Consent POST accepts `consent_type`, matching `purpose`, `consent_version`, `granted`, and `company_id` where required. Types are `PRIVACY_POLICY`, `TERMS`, `MARKETING`, `DATA_SHARING`, and `COMPANY_SERVICE`. The last two require a company; account-level types must not be company-scoped. Read policy purposes from GET rather than inventing them. Withdrawal remains available for inactive companies. A signup metadata checkbox is not a persisted consent-history record.

## Admin read and management endpoints

Admin endpoints require user JWT authentication and database permissions. Tenant-aware lists intersect filters with company/project grants; a supplied `company_id` or `project_id` never grants access. Global governance routes require unscoped permissions, not merely a company-scoped role. Inputs use strict allowlisted Zod bodies and validated IDs/queries; list limits/order are enforced server-side. Not every list accepts every query field.

GET routes:

- `/admin/dashboard` (each metric uses its own domain permission)
- `/admin/users`, `/admin/customers`
- `/admin/companies`, `/admin/projects`, `/admin/properties`, `/admin/reservations`, `/admin/customer-properties`
- `/admin/roles`, `/admin/permissions`, `/admin/user-roles`
- `/admin/integrations`, `/admin/business-services`, `/admin/api-clients`
- `/admin/feature-flags`, `/admin/audit-logs`, `/admin/system-settings`

| Method | Path | Required permission / constraints |
| --- | --- | --- |
| POST / PATCH | `/admin/companies` / `/admin/companies/:id` | `company.manage`; creation is global, update target-scoped. |
| POST / PATCH | `/admin/projects` / `/admin/projects/:id` | `project.create` / `project.edit`; validated company/target scope, property feature gate. |
| POST / PATCH | `/admin/properties` / `/admin/properties/:id` | `property.create` / `property.edit`; project/target scope, property feature gate. |
| POST / PATCH | `/admin/customer-properties` / `/admin/customer-properties/:id` | `customer_property.manage`; property/relationship scope, effective-date checks. |
| POST | `/admin/reservations` | `reservation.create`; property-scoped atomic reservation creation. |
| POST | `/admin/reservations/:id/confirm`, `/:id/expire`, `/:id/cancel`, `/:id/convert` | `reservation.manage` or `reservation.cancel`; reviewed transition with reservation event, property status history and audit evidence. |
| POST | `/admin/users/:id/verification/approve` | Global `user.manage`; `expected_status` and `review_reference`; no self-approval; active confirmed linked identity/profile required. |
| PATCH | `/admin/users/:id/status` | Global `user.manage`; `account_status`, `expected_status`, `review_reference`; activation needs confirmed linked identity; self-disable/bootstrap-admin protections. |
| POST / PATCH / DELETE | `/admin/roles` / `/admin/roles/:id` | Global `role.manage`; system/reserved-role protections; deletion requires review reference and no assignments. |
| PUT | `/admin/roles/:id/permissions` | Global `role.manage` and `permission.manage`; `permission_ids` and `review_reference`; no delegation beyond actor rights; protected roles. |
| POST / DELETE | `/admin/user-roles` / `/admin/user-roles/:id` | Global `role.manage` and `user.manage`; review reference, scope consistency, active confirmed linked target; no self-assignment or `SUPER_ADMIN` management. |
| POST / PATCH | `/admin/integrations` / `/admin/integrations/:id` | Scoped `integration.manage`, integration feature gate; metadata/status only, no arbitrary secret editing. |
| POST / PATCH | `/admin/business-services` / `/admin/business-services/:id` | Scoped `integration.manage`, integration feature gate. |
| PATCH | `/admin/feature-flags/:id` | Global `feature_flag.manage`; guarded enable/disable, not arbitrary configuration. |
| PUT | `/admin/system-settings/:key` | Global `system_settings.manage`; review reference; only `support_contact`, `maintenance_notice`, `month_1_acceptance_state` with typed values. |

Approval updates user/profile business status transactionally with audit/event evidence. `review_reference` identifies external review, not free-form PII. Management screens use API-backed reference lists, including `/admin/users` for assignments; selecting a listed user is not approval or authorization. The API rechecks target state and actor rights. There is no general customer-identity edit override, arbitrary permission creation, or delete-everything CRUD contract. An `accepted` settings value is metadata, not release sign-off.

## Machine keys and internal integration

- `POST /admin/api-clients` issues a company-bound key with strict `company_id`, `client_name`, `scopes` input.
- `POST /admin/api-clients/:id/rotate` replaces the credential; `POST /admin/api-clients/:id/revoke` disables it. Both require empty bodies and target-scoped `integration.manage`; emergency revocation remains available with the integration feature off.
- Keys are disclosed once on issue/rotation with no-store responses. Only `sha256:v1` hashes are persisted; list responses omit hashes/secrets.
- Issuance/rotation checks company-wide delegated permissions for every scope. Project-only access cannot mint company-wide rights.

| Method | Path | Scope |
| --- | --- | --- |
| GET | `/company-api/company` | `company.read` |
| GET | `/company-api/projects` | `projects.read` |
| GET | `/company-api/properties` | `properties.read` |
| POST | `/internal/identity/verify` | `identity.verify` |
| POST | `/internal/events` | `events.write` |

The read routes expose allowlisted metadata for the key's company only. Both internal POSTs require a UUID `Idempotency-Key` header and reject extra query/body fields. Identity verification accepts `{ rhc_id }` and returns only `{ verified }`; current company data-sharing consent, active confirmed identity, and an issued ID are required. Replays recheck current consent/account availability.

Events accept `event_type` (`SERVICE.REQUESTED`, `SERVICE.COMPLETED`, or `SERVICE.CANCELLED`), UUID `source_reference`, `occurred_at`, and optional `rhc_id`. The company event must be enabled; identity-associated events require current company `DATA_SHARING` and `COMPANY_SERVICE` consent. Accepted reports create integration activity/receipts, not trusted business transitions, points postings, or blockchain transactions. Reusing an idempotency key with a different payload conflicts.

## Evidence boundary

The endpoint implementation and fixture tests are not live acceptance. All five migrations are pending, including PostgREST lockdown; browser direct table access must not be assumed blocked on an unknown target. See [current report](../month-1/targeted-completion-report.md) and [acceptance gates](../month-1/acceptance-validation.md).
