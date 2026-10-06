# RHC Digital — Database Table Requirements

**Prepared:** October 6, 2026  
**Scope:** Existing database tables and proposed additions for connected customer/admin workflows  
**Sources:** [Prisma schema](../packages/database/prisma/schema.prisma), [demo contracts](../packages/types/src/demo.ts), and the preceding repository review

> The project currently defines **29 application tables** in Prisma. This document proposes **16 additional domain tables** for connected feature parity, giving a possible **45-table application design** before optional operational additions. Proposed tables are recommendations, not implemented schema or approved migrations. Existing definitions do not prove that tables have been deployed to a hosted database.

## 1. Database and storage architecture

The customer portal, admin portal, and backend should share the same authoritative business database. Separate databases per portal or company are not required for the current design; company/project authorization controls access.

| Component | Responsibility |
| --- | --- |
| PostgreSQL through Supabase | Authoritative application accounts, company/property records, reservations, governance, and business workflows |
| Supabase Auth | Authentication identities, passwords, sessions, confirmation, and recovery |
| Private object storage | Uploaded documents, payment evidence, and certificate files; PostgreSQL stores metadata and object references |
| Redis / Upstash | Rate limiting and approved temporary operational state, not authoritative business records |

Supabase-managed authentication/storage tables and Prisma migration bookkeeping are not included in the 29 application-table count. Do not manually recreate provider-managed tables.

The local `.rhc-demo/world.json` file is a synthetic fixture store, not the production database.

## 2. Existing application tables — 29

These names are the physical table names declared by Prisma `@@map` mappings.

### A. Users, identity, and access control

| # | Table | Purpose |
| ---: | --- | --- |
| 1 | `users` | Application accounts, Supabase identity linkage, contact details, account status, and verification status |
| 2 | `user_profiles` | Personal information, address, RHC Digital ID, and issuance timestamp |
| 3 | `rhc_id_sequences` | Year-based counters for generating unique RHC Digital ID numbers |
| 4 | `roles` | Customer/staff/admin role definitions |
| 5 | `permissions` | Individual permissions such as property editing or reservation management |
| 6 | `role_permissions` | Permissions assigned to each role |
| 7 | `user_roles` | User role assignments, company/project scope, and expiration |

Customers and administrators both use `users`; their roles distinguish access. A separate password table is unnecessary because Supabase Auth owns authentication credentials.

### B. Companies, projects, and properties

| # | Table | Purpose |
| ---: | --- | --- |
| 8 | `companies` | RHC companies, business status, and integration/service enablement |
| 9 | `projects` | Property developments such as Amica Residences Tower 1 |
| 10 | `properties` | Units, parking/commercial assets, tower/floor details, area, price, and availability |
| 11 | `property_status_history` | Inventory status changes, reasons, and responsible actors |
| 12 | `customer_properties` | Customer-to-property relationships, status, and effective dates |

The current schema stores tower and floor details in `properties`. Separate `towers` and `floors` tables are only needed if those become independently managed entities with their own metadata or rules.

### C. Reservations

| # | Table | Purpose |
| ---: | --- | --- |
| 13 | `reservations` | Customer reservations, property links, status, expiration, and transition timestamps |
| 14 | `reservation_events` | Reservation actions, history, notes, and responsible actors |

### D. Business services and integrations

| # | Table | Purpose |
| ---: | --- | --- |
| 15 | `business_services` | Company service catalog and eligibility/availability settings |
| 16 | `company_integrations` | Integration definitions and configuration metadata |
| 17 | `company_api_clients` | Machine/API clients, company scope, credential references, and access scopes |
| 18 | `company_events` | Event types a company is permitted to submit |
| 19 | `integration_logs` | Integration outcomes, references, errors, and processing metadata |

`company_events` is an event allowlist, not a table of customer service requests. Integration configuration should not become a place to store plaintext provider secrets.

### E. Rewards / RHC Points

| # | Table | Purpose |
| ---: | --- | --- |
| 20 | `rewards_accounts` | Customer rewards accounts, status, and stored balance |
| 21 | `rewards_rules` | Earning rules and eligibility configuration |
| 22 | `rewards_transactions` | Points ledger entries, source references, idempotency keys, and reversals |
| 23 | `rewards_redemptions` | Redemption requests and status |

These tables are defined, but the connected rewards workflow is not complete or activated. A stored balance does not replace transactional ledger validation. Demo points are not cash, cryptocurrency, or investment value.

### F. Governance, notifications, and auditing

| # | Table | Purpose |
| ---: | --- | --- |
| 24 | `notifications` | User notifications, channel, content, and delivery status |
| 25 | `consent_records` | Versioned customer consent grants and withdrawals |
| 26 | `feature_flags` | Governed feature enablement |
| 27 | `audit_logs` | Administrative/security actions, actors, and before/after context |
| 28 | `activity_events` | Business activity events and processing state |
| 29 | `system_settings` | Supported application configuration |

## 3. Proposed domain additions — 16

These tables would persist workflows already represented in the demo but lacking dedicated connected models. This is a proposed normalized design, not a requirement that every feature use exactly this structure. Confirm domain rules, retention, access scope, and migration strategy before implementation.

### A. Identity review

| # | Proposed table | Purpose | Main relationships |
| ---: | --- | --- | --- |
| 1 | `identity_review_requests` | Customer submissions, review status, reviewer, decision reason, and timestamps | Customer/reviewer in `users`; evidence document references |

Keep the existing RHC ID fields in `user_profiles` initially. Consider a separate Digital ID lifecycle table only if replacement, expiry, suspension, or revocation is introduced. Approval must remain a reviewed action separate from customer self-editing.

### B. Documents and uploaded evidence

| # | Proposed table | Purpose | Main relationships |
| ---: | --- | --- | --- |
| 2 | `documents` | Logical document record, category, owner, property context, and lifecycle status | `users`, optionally `properties` |
| 3 | `document_versions` | Immutable version metadata, private object-storage reference, checksum, size, MIME type, and uploader | `documents`, `users` |
| 4 | `document_reviews` | Review decisions and comments against a specific version | `document_versions`, reviewer in `users` |

Store file contents in private object storage rather than large text/blob fields in ordinary business tables. Record stable object identifiers, not expiring signed download URLs. Approval must identify the exact approved version. Production upload handling also needs size/type restrictions, access controls, scanning decisions, and retention rules.

### C. Payment evidence

| # | Proposed table | Purpose | Main relationships |
| ---: | --- | --- | --- |
| 5 | `payment_records` | Submitted payment evidence, amount, currency, reference, customer/property context, and review status | `users`, `properties`, optionally `reservations` and evidence documents |
| 6 | `payment_record_events` | Submission, verification, rejection, and reversal history | `payment_records`, actor in `users` |

This supports the current payment-evidence scope, not a gateway or full accounting ledger. Preserve reviewed history and use linked reversal records rather than silently overwriting posted evidence. Store monetary values using an agreed fixed-precision decimal or integer-minor-unit convention, never floating-point arithmetic.

If real billing and collection are approved later, separately design invoices, payment allocations, provider transactions, refunds, and reconciliation. Those are outside this 16-table proposal.

### D. Certificates and public verification

| # | Proposed table | Purpose | Main relationships |
| ---: | --- | --- | --- |
| 7 | `certificates` | Company-issued certificate, recipient, source record/version, validity, and status | `users`, issuing `companies`, relevant source records |
| 8 | `certificate_events` | Issuance, revocation, supersession, and lifecycle history | `certificates`, actor in `users` |
| 9 | `verification_references` | Revocable/expiring public verification references and permitted disclosure scope | Certificate or issued Digital ID record |

Use opaque, unguessable public references and avoid exposing internal user IDs. Define explicit foreign keys and a constraint ensuring each reference targets the intended record type; avoid unvalidated generic IDs. Public verification must return only approved fields and respect revocation/expiry.

Company-issued IDs and certificates are not government identification, land title, or legal ownership proof. Connected public Digital ID verification is currently unavailable; this proposal does not activate it.

### E. Customer service requests

| # | Proposed table | Purpose | Main relationships |
| ---: | --- | --- | --- |
| 10 | `service_requests` | Customer request, selected service, company, optional property, assignee, and status | `users`, `business_services`, `companies`, optionally `properties` |
| 11 | `service_request_events` | Status changes, assignments, notes, and progression history | `service_requests`, actor in `users` |

Validate that the selected service belongs to the request's company and that any property/assignee is within the authorized scope. A request record does not itself execute an external provider workflow.

### F. Property journey and turnover

| # | Proposed table | Purpose | Main relationships |
| ---: | --- | --- | --- |
| 12 | `saved_properties` | Customer bookmarks | `users`, `properties`; unique customer/property pair |
| 13 | `project_milestones` | Project updates, milestones, dates, and publication status | `projects` |
| 14 | `turnover_cases` | Customer/property handover case and progress | `users`, `properties` |
| 15 | `turnover_checklist_items` | Handover requirements, completion state, and completion evidence | `turnover_cases` |

### G. Redeemable rewards catalog

| # | Proposed table | Purpose | Main relationships |
| ---: | --- | --- | --- |
| 16 | `rewards_benefits` | Available benefits, points cost, eligibility, availability, and validity | Optional issuing `companies`; referenced by `rewards_redemptions` |

Extend redemptions with a benefit reference, ledger linkage, and a snapshot of the cost/terms accepted at redemption. Redemption and ledger updates need atomic transactions, duplicate protection, and overspend prevention before activation.

## 4. Optional operational additions

These depend on the chosen production architecture and are not included in the proposed 45-table domain total. Do not introduce duplicate systems without clear responsibilities.

| Candidate table | When useful |
| --- | --- |
| `consent_policies` | Approved consent text, versions, purposes, and effective dates managed in the database instead of versioned configuration |
| `notification_deliveries` | Per-channel delivery attempts, provider references, retries, and failure history |
| `notification_preferences` | Customer channel/category preferences beyond legal consent |
| `outbox_events` | Reliable asynchronous dispatch of committed business changes; alternatively, deliberately extend `activity_events` for this role |
| `idempotency_requests` | Shared write-request retry protection where domain-specific unique keys are insufficient |
| `webhook_receipts` | Provider callbacks requiring signature verification, duplicate detection, and replay handling |

For an outbox, event creation must be atomic with the business change. A table alone does not provide a dispatcher, retries, locking, or monitoring. For idempotency, define caller/operation scope, request fingerprints, retention, and behavior for concurrent retries.

## 5. Existing tables needing extension

Some gaps need columns, relationships, or constraints rather than new tables.

| Existing table/area | Likely extension |
| --- | --- |
| `notifications` | Separate read state, such as `read_at`, from delivery status |
| `rewards_redemptions` | Benefit reference, accepted cost/terms snapshot, and ledger linkage |
| `reservations` | Request retry protection and an agreed concurrency/versioning approach |
| `user_profiles` | Controlled identity-correction workflow; do not simply unlock verified fields |
| New workflow tables | Appropriate company/project ownership, indexes, actor references, and timestamps |

## 6. Shared database requirements

- Use foreign keys and deliberate deletion policies; preserve reviewed financial, identity, and audit history.
- Preserve company/project ownership through explicit fields or unambiguous relationships, and validate consistency when scope fields are duplicated.
- Enforce authorization in the backend and define RLS/grants for the actual deployed access model.
- Add indexes for ownership, status, dates, foreign-key lookups, and actual query patterns.
- Use uniqueness and transactional constraints for identifiers, bookmarks, active reservations, and retry protection.
- Define immutable history/version records where decisions need to remain traceable.
- Keep secrets and sensitive evidence out of public projections, integration metadata, and ordinary logs.
- Establish retention, deletion/anonymization, backup/restore, and recovery policies before production acceptance.
- Verify migrations and concurrency on disposable PostgreSQL before any separately approved hosted rollout.

## 7. Tables not needed for the current scope

Do not create the following merely because the UI contains corresponding labels:

- Separate customer and administrator databases or duplicate account tables.
- Duplicate password/auth-session tables already owned by Supabase Auth.
- Tables for every dashboard card, report, or public marketing page; most can be derived from authoritative records.
- A second `rhc_points` ledger alongside `rewards_transactions`.
- Wallet balances, private keys, token sales, staking positions, or blockchain transaction tables.

The current Web3 boundary is a disabled-by-default read-only adapter. It does not require custody or transactional blockchain tables. Later approved features may justify additional persistence, but that is a separate design decision.

## 8. Recommended implementation order

1. **Retain and validate the existing 29 tables**, including relationships, migration history, grants, and tenant boundaries.
2. Add **documents and identity-review persistence**.
3. Add **payment evidence, certificates, verification references, and service requests**, with explicit product/privacy approvals.
4. Add **saved properties, project milestones, and turnover workflows**.
5. Extend **rewards and notification functionality** when operational rules are approved.
6. Add **delivery, outbox, webhook, and idempotency persistence** according to the chosen integration design; build these alongside the features that require them.
7. Complete real-database tests, API/frontend integration, operational validation, and release approval before activation.

## 9. Summary

| Category | Count/status |
| --- | --- |
| Existing Prisma application tables | 29 defined |
| Proposed connected-domain additions | 16 recommended |
| Possible application-domain total | 45, subject to design review |
| Operational additions | Conditional; not included in the total |
| Provider-managed Auth/storage tables | Managed separately; not included in the total |
| Schema or migration changes made for this document | None |

**Bottom line:** The core database foundation already exists. The largest missing pieces are persistence and backend behavior for workflows currently represented only in the synthetic demo. This document is a planning inventory, not SQL, a migration authorization, or evidence that the database has been deployed.
