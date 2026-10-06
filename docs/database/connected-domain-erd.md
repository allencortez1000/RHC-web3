# Connected-domain ERD

**Source snapshot: 2026-10-06 — 45 application models: 29 existing + 16 new.**

These editable Mermaid diagrams, the [source map](connected-domain-source-map.md) and [data dictionary](connected-domain-data-dictionary.md) are the authoritative connected-domain design/source documentation until the next reviewed design update. [Prisma schema](../../packages/database/prisma/schema.prisma) and [connected-domain SQL](../../packages/database/prisma/migrations/202610060001_connected_domains/migration.sql) control exact definitions. The diagrams describe **source**, not deployed tables, activated APIs or approved business lifecycles. Provider Auth/storage, Prisma bookkeeping and optional operational proposals are excluded.

## Reading the diagrams

- Physical `@@map` table names are used. Diagrams split by child/owning-side domain; shared parent entities repeat for context and are **not additional tables**. Each model has one home diagram; each declared owning-side FK is drawn once in its child's home diagram.
- `||` at parent means exactly one parent is required; `o|` means zero or one. At child, `o{` means zero or more, and `o|` means zero or one where the FK columns themselves are unique. All parent collections may be empty. Dashed connectors are non-identifying FKs because child identities do not incorporate parent keys.
- Entity blocks show primary keys and FK scalar columns, not every attribute. Full types/nullability/defaults/checks/indexes and every scalar column are in the dictionary. A `FK` label identifies declared relation participation, not authorization or a polymorphic reference. Composite FKs are explained below and preserved in dictionary relation declarations.
- RHC ID counters, feature flags and settings are intentionally unconnected. `audit_logs`/`activity_events` company/project/entity IDs are contextual scalars, **not declared company/project/entity FKs**; no invented edges are drawn. External Auth linkage is not an application-table FK.
- Unique nullable FK cardinality applies only when non-NULL. Exact-one-source/target checks across multiple nullable FKs cannot be expressed by a single Mermaid edge; read the XOR notes below.
- All new FK delete/update actions are RESTRICT. Historical FK actions vary (including CASCADE/SET NULL); consult the dictionary/schema before deleting anything. Retention triggers impose stronger restrictions than diagram cardinality.

## Cross-domain invariants not expressible as edges

1. **Documents:** logical document → immutable versions → immutable version-specific reviews. Customer/property context is frozen. Identity/payment/checklist/certificate evidence points to an exact version, never “latest.” Customer consistency and applicable property/time checks are SQL guards, not extra FK edges. Storage paths are private identifiers; storage objects are outside this 45-table ERD.
2. **Identity:** PENDING-only request insertion, typed correction proposals, separate reviewer, immutable submissions/terminal decisions. A request decision has **no automatic write-through edge** to approved `user_profiles`. One optional evidence version is provisional; multi-evidence and field clearing need design approval.
3. **Payments:** `(reservation_id, customer_id, property_id)` references `reservations(id, customer_id, property_id)` when reservation is present. Reversal targets one VERIFIED event of the same payment. Partial unique indexes permit one review and one submission event. Payment headers are immutable; status is event-derived, not a stored mutable column or settlement guarantee.
4. **Certificates:** exactly one source: document version **XOR** property. Required issuer-company FK exists and remains distinct from creator and property developer. Same customer/type/issuer and **same property or same logical document** supersession is enforced; different versions of that document are allowed, cross-source/source-kind replacement is blocked pending approval. An event naming replacement must match its `supersedes_id`; replacement must already be issued and valid. One issuance and one terminal event are permitted. Certificate status derives from events and expiry, not a status column. **All certificate-event inserts require SERIALIZABLE** (SQLSTATE 25000 otherwise), with caller retries for 40001 serialization failures.
5. **Verification:** issued profile **XOR** certificate target. SQL hard-disables references (`enabled=false`, `disclosure_scope=NONE`). A target edge is not publication authorization; certificate-target references do not by themselves prove issuance. Raw tokens/public URLs are absent.
6. **Service requests:** `(service_id, company_id)` references `business_services(id, company_id)`. Provider company need not equal property's developer. Actual nullable current assignee and previous/next assignment user FKs exist; ordered immutable events retain assignment/unassignment. SQL identity links are not staff authorization. API must atomically synchronize mutable header status/assignee and history.
7. **Rewards:** existing account/customer composite FKs protect transaction/redemption subject. Redemption has a DB-derived nullable `benefit_company_id` snapshot: `(rewards_account_id, benefit_company_id)` → accounts `(id, company_id)` and `(benefit_id, benefit_company_id)` → benefits `(id, company_id)`. New candidate keys on both parents support these RESTRICT FKs, protecting non-NULL scoped links against later parent company changes, including NULLing; global benefits/unlinked legacy accounts do not acquire that blocker. The single benefit FK remains alongside scoped_benefit. Redemption has a unique optional original REDEEM debit; ledger reversals use the existing transaction self-link. Hard-inactive benefit catalog does not constitute an approved redemption/posting engine. Company/account eligibility and immutable accepted snapshots need the SQL/service rules in the dictionary.
8. **Journey:** saved-property uniqueness conveys no ownership. Milestone progress and reviewed publication are separate; ID/project/code/creation are frozen, not all published content. Turnover DRAFT is a **default, not a hard lock**; multiple cases per customer/property are allowed. Optional `created_by_id` and `responsible_user_id` are separate User FKs with nonunique indexes and inverse relations (`created_turnover_cases`, `responsible_turnover_cases`). Creator is immutable from insertion, including NULL; responsibility is mutable subject to future API authorization. Both fields are optional proposals: no actor or assignment is inferred, and existence of a User FK grants no authority. Optional checklist evidence is attach-once and completion freezes the item. Case completion is not automatically tied to checklist completion.
9. **Authorization:** new enum values, explicitly including service progress/assignment, milestone publication and turnover, remain proposals pending business approval. Strict RLS/table ACL lockdown covers only the **16 NEW tables**; existing notifications/redemptions grants and RLS configuration are preserved. The function ACL allowlist covers **14** new trigger functions. New-table RLS supplies no approved runtime grant; owner bypass is not authorization. Preflight now inventories all **45 tables**, but actual effective privileges, including existing grants covering added columns, still require target assessment. See the [source-map gap register](connected-domain-source-map.md#open-designsource-gaps--explicit-handoff).
10. **Clocks:** 23 timestamp defaults on new tables are explicit UTC transaction-time `dbgenerated` values. Seven new mutable-table updated_at fields are normalized by an alphabetically early DB trigger to UTC wall time before guards. Supplied factual timestamps remain validated, not overwritten. New/changed non-NULL notification read_at is separately DB-stamped UTC; NULL/unchanged values and existing timestamp defaults/rows remain untouched.

## Editable source diagrams

The diagram inventory is generated from local Prisma declarations, without a client or database. This is documentation extraction, not migration execution or runtime validation. Entity field type aliases use `enum` for enum attributes and Mermaid-safe names; exact native SQL types are in the dictionary.

### 1. Accounts and access control

Home models: `User`, `RhcIdSequence`, `UserProfile`, `Permission`, `Role`, `RolePermission`, `UserRole`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    users {
        UUID id PK
    }
    rhc_id_sequences {
        INTEGER year PK
    }
    user_profiles {
        UUID id PK
        UUID user_id FK
    }
    permissions {
        UUID id PK
    }
    roles {
        UUID id PK
        UUID company_id FK
    }
    role_permissions {
        UUID id PK
        UUID role_id FK
        UUID permission_id FK
    }
    user_roles {
        UUID id PK
        UUID user_id FK
        UUID role_id FK
        UUID company_id FK
        UUID project_id FK
    }
    companies {
        UUID id PK
    }
    projects {
        UUID id PK
    }
    users ||..o| user_profiles : "user"
    companies o|..o{ roles : "company"
    roles ||..o{ role_permissions : "role"
    permissions ||..o{ role_permissions : "permission"
    users ||..o{ user_roles : "user"
    roles ||..o{ user_roles : "role"
    companies o|..o{ user_roles : "company"
    projects o|..o{ user_roles : "project"
```

### 2. Companies, properties and reservations

Home models: `Company`, `Project`, `Property`, `PropertyStatusHistory`, `Reservation`, `ReservationEvent`, `CustomerProperty`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    companies {
        UUID id PK
    }
    projects {
        UUID id PK
        UUID company_id FK
    }
    properties {
        UUID id PK
        UUID project_id FK
    }
    property_status_history {
        UUID id PK
        UUID property_id FK
        UUID actor_user_id FK
        UUID reservation_id FK
    }
    reservations {
        UUID id PK
        UUID customer_id FK
        UUID property_id FK
    }
    reservation_events {
        UUID id PK
        UUID reservation_id FK
        UUID actor_user_id FK
    }
    customer_properties {
        UUID id PK
        UUID customer_id FK
        UUID property_id FK
    }
    users {
        UUID id PK
    }
    companies ||..o{ projects : "company"
    projects ||..o{ properties : "project"
    properties ||..o{ property_status_history : "property"
    users o|..o{ property_status_history : "actor"
    reservations o|..o{ property_status_history : "reservation"
    users ||..o{ reservations : "customer"
    properties ||..o{ reservations : "property"
    reservations ||..o{ reservation_events : "reservation"
    users o|..o{ reservation_events : "actor"
    users ||..o{ customer_properties : "customer"
    properties ||..o{ customer_properties : "property"
```

### 3. Service catalog and integrations

Home models: `BusinessService`, `CompanyIntegration`, `CompanyApiClient`, `CompanyEvent`, `IntegrationLog`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    business_services {
        UUID id PK
        UUID company_id FK
    }
    company_integrations {
        UUID id PK
        UUID company_id FK
    }
    company_api_clients {
        UUID id PK
        UUID company_id FK
    }
    company_events {
        UUID id PK
        UUID company_id FK
    }
    integration_logs {
        UUID id PK
        UUID integration_id FK
        UUID company_id FK
    }
    companies {
        UUID id PK
    }
    companies ||..o{ business_services : "company"
    companies ||..o{ company_integrations : "company"
    companies ||..o{ company_api_clients : "company"
    companies ||..o{ company_events : "company"
    company_integrations o|..o{ integration_logs : "integration"
    companies o|..o{ integration_logs : "company"
```

### 4. Governance, notifications and activity

Home models: `Notification`, `ConsentRecord`, `FeatureFlag`, `AuditLog`, `ActivityEvent`, `SystemSetting`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    notifications {
        UUID id PK
        UUID user_id FK
    }
    consent_records {
        UUID id PK
        UUID user_id FK
        UUID company_id FK
    }
    feature_flags {
        UUID id PK
    }
    audit_logs {
        UUID id PK
        UUID actor_user_id FK
    }
    activity_events {
        UUID id PK
        UUID actor_user_id FK
    }
    system_settings {
        UUID id PK
    }
    users {
        UUID id PK
    }
    companies {
        UUID id PK
    }
    users ||..o{ notifications : "user"
    users ||..o{ consent_records : "user"
    companies o|..o{ consent_records : "company"
    users o|..o{ audit_logs : "actor"
    users o|..o{ activity_events : "actor"
```

### 5. Rewards and benefit linkage

Home models: `RewardsAccount`, `RewardsRule`, `RewardsTransaction`, `RewardsRedemption`, `RewardsBenefit`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    rewards_accounts {
        UUID id PK
        UUID customer_id FK
        UUID company_id FK
    }
    rewards_rules {
        UUID id PK
        UUID company_id FK
    }
    rewards_transactions {
        UUID id PK
        UUID rewards_account_id FK
        UUID customer_id FK
        UUID source_company_id FK
        UUID rule_id FK
        UUID reversal_of_id FK
    }
    rewards_redemptions {
        UUID id PK
        UUID customer_id FK
        UUID rewards_account_id FK
        UUID benefit_id FK
        UUID benefit_company_id FK
        UUID original_debit_id FK
    }
    rewards_benefits {
        UUID id PK
        UUID company_id FK
        UUID approved_by_id FK
    }
    users {
        UUID id PK
    }
    companies {
        UUID id PK
    }
    users ||..o{ rewards_accounts : "customer"
    companies o|..o{ rewards_accounts : "company"
    companies o|..o{ rewards_rules : "company"
    rewards_accounts ||..o{ rewards_transactions : "account composite FK"
    users ||..o{ rewards_transactions : "customer"
    companies o|..o{ rewards_transactions : "source_company"
    rewards_rules o|..o{ rewards_transactions : "rule"
    rewards_transactions o|..o{ rewards_transactions : "reversal_of"
    users ||..o{ rewards_redemptions : "customer"
    rewards_accounts ||..o{ rewards_redemptions : "account composite FK"
    rewards_accounts o|..o{ rewards_redemptions : "scoped_account composite FK"
    rewards_benefits o|..o{ rewards_redemptions : "scoped_benefit composite FK"
    rewards_benefits o|..o{ rewards_redemptions : "benefit"
    rewards_transactions o|..o| rewards_redemptions : "original_debit"
    companies o|..o{ rewards_benefits : "company"
    users o|..o{ rewards_benefits : "approved_by"
```

### 6. Documents and identity requests

Home models: `Document`, `DocumentVersion`, `DocumentReview`, `IdentityReviewRequest`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    documents {
        UUID id PK
        UUID customer_id FK
        UUID property_id FK
    }
    document_versions {
        UUID id PK
        UUID document_id FK
        UUID uploaded_by_id FK
    }
    document_reviews {
        UUID id PK
        UUID document_version_id FK
        UUID reviewer_user_id FK
    }
    identity_review_requests {
        UUID id PK
        UUID customer_id FK
        UUID requested_by_id FK
        UUID evidence_version_id FK
        UUID reviewer_user_id FK
    }
    users {
        UUID id PK
    }
    properties {
        UUID id PK
    }
    users ||..o{ documents : "customer"
    properties o|..o{ documents : "property"
    documents ||..o{ document_versions : "document"
    users ||..o{ document_versions : "uploaded_by"
    document_versions ||..o{ document_reviews : "version"
    users ||..o{ document_reviews : "reviewer"
    users ||..o{ identity_review_requests : "customer"
    users ||..o{ identity_review_requests : "requested_by"
    users o|..o{ identity_review_requests : "reviewer"
    document_versions o|..o{ identity_review_requests : "evidence"
```

### 7. Payment evidence and events

Home models: `PaymentRecord`, `PaymentRecordEvent`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    payment_records {
        UUID id PK
        UUID customer_id FK
        UUID property_id FK
        UUID submitted_by_id FK
        UUID reservation_id FK
        UUID evidence_version_id FK
    }
    payment_record_events {
        UUID id PK
        UUID payment_record_id FK
        UUID actor_user_id FK
        UUID reversal_of_id FK
    }
    users {
        UUID id PK
    }
    properties {
        UUID id PK
    }
    document_versions {
        UUID id PK
    }
    reservations {
        UUID id PK
    }
    users ||..o{ payment_records : "customer"
    properties ||..o{ payment_records : "property"
    users ||..o{ payment_records : "submitted_by"
    document_versions o|..o{ payment_records : "evidence"
    reservations o|..o{ payment_records : "reservation composite FK"
    payment_records ||..o{ payment_record_events : "payment"
    users ||..o{ payment_record_events : "actor"
    payment_record_events o|..o| payment_record_events : "reversal_of"
```

### 8. Certificates and disabled verification

Home models: `Certificate`, `CertificateEvent`, `VerificationReference`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    certificates {
        UUID id PK
        UUID customer_id FK
        UUID issuer_company_id FK
        UUID source_document_version_id FK
        UUID source_property_id FK
        UUID supersedes_id FK
        UUID created_by_id FK
    }
    certificate_events {
        UUID id PK
        UUID certificate_id FK
        UUID actor_user_id FK
        UUID replacement_certificate_id FK
    }
    verification_references {
        UUID id PK
        UUID user_profile_id FK
        UUID certificate_id FK
    }
    companies {
        UUID id PK
    }
    users {
        UUID id PK
    }
    document_versions {
        UUID id PK
    }
    properties {
        UUID id PK
    }
    user_profiles {
        UUID id PK
    }
    companies ||..o{ certificates : "issuer"
    users ||..o{ certificates : "customer"
    users ||..o{ certificates : "created_by"
    document_versions o|..o{ certificates : "source_version"
    properties o|..o{ certificates : "source_property"
    certificates o|..o| certificates : "supersedes"
    certificates ||..o{ certificate_events : "certificate"
    certificates o|..o| certificate_events : "replacement"
    users ||..o{ certificate_events : "actor"
    user_profiles o|..o{ verification_references : "profile"
    certificates o|..o{ verification_references : "certificate"
```

### 9. Service requests and assignments

Home models: `ServiceRequest`, `ServiceRequestEvent`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    service_requests {
        UUID id PK
        UUID customer_id FK
        UUID requested_by_id FK
        UUID company_id FK
        UUID service_id FK
        UUID property_id FK
        UUID assignee_user_id FK
    }
    service_request_events {
        UUID id PK
        UUID service_request_id FK
        UUID actor_user_id FK
        UUID previous_assignee_user_id FK
        UUID next_assignee_user_id FK
    }
    users {
        UUID id PK
    }
    companies {
        UUID id PK
    }
    business_services {
        UUID id PK
    }
    properties {
        UUID id PK
    }
    users o|..o{ service_requests : "assignee"
    users ||..o{ service_requests : "customer"
    users ||..o{ service_requests : "requested_by"
    companies ||..o{ service_requests : "company"
    business_services ||..o{ service_requests : "service composite FK"
    properties o|..o{ service_requests : "property"
    users o|..o{ service_request_events : "previous_assignee"
    users o|..o{ service_request_events : "next_assignee"
    service_requests ||..o{ service_request_events : "request"
    users ||..o{ service_request_events : "actor"
```

### 10. Saved properties, milestones and turnover

Home models: `SavedProperty`, `ProjectMilestone`, `TurnoverCase`, `TurnoverChecklistItem`. Other entities repeat only as FK context.

```mermaid
erDiagram
    direction TB
    saved_properties {
        UUID id PK
        UUID customer_id FK
        UUID property_id FK
    }
    project_milestones {
        UUID id PK
        UUID project_id FK
        UUID reviewer_user_id FK
    }
    turnover_cases {
        UUID id PK
        UUID customer_id FK
        UUID property_id FK
        UUID created_by_id FK
        UUID responsible_user_id FK
    }
    turnover_checklist_items {
        UUID id PK
        UUID turnover_case_id FK
        UUID completed_by_id FK
        UUID evidence_version_id FK
    }
    users {
        UUID id PK
    }
    properties {
        UUID id PK
    }
    projects {
        UUID id PK
    }
    document_versions {
        UUID id PK
    }
    users ||..o{ saved_properties : "customer"
    properties ||..o{ saved_properties : "property"
    projects ||..o{ project_milestones : "project"
    users o|..o{ project_milestones : "reviewer"
    users ||..o{ turnover_cases : "customer"
    properties ||..o{ turnover_cases : "property"
    users o|..o{ turnover_cases : "created_by"
    users o|..o{ turnover_cases : "responsible"
    document_versions o|..o{ turnover_checklist_items : "evidence"
    turnover_cases ||..o{ turnover_checklist_items : "turnover_case"
    users o|..o{ turnover_checklist_items : "completed_by"
```

## Coverage index

| # | Model | Physical table | Home diagram |
| ---: | --- | --- | --- |
| 1 | `User` | `users` | 1. Accounts and access control |
| 2 | `RhcIdSequence` | `rhc_id_sequences` | 1. Accounts and access control |
| 3 | `UserProfile` | `user_profiles` | 1. Accounts and access control |
| 4 | `Company` | `companies` | 2. Companies, properties and reservations |
| 5 | `Project` | `projects` | 2. Companies, properties and reservations |
| 6 | `Permission` | `permissions` | 1. Accounts and access control |
| 7 | `Role` | `roles` | 1. Accounts and access control |
| 8 | `RolePermission` | `role_permissions` | 1. Accounts and access control |
| 9 | `UserRole` | `user_roles` | 1. Accounts and access control |
| 10 | `Property` | `properties` | 2. Companies, properties and reservations |
| 11 | `PropertyStatusHistory` | `property_status_history` | 2. Companies, properties and reservations |
| 12 | `Reservation` | `reservations` | 2. Companies, properties and reservations |
| 13 | `ReservationEvent` | `reservation_events` | 2. Companies, properties and reservations |
| 14 | `CustomerProperty` | `customer_properties` | 2. Companies, properties and reservations |
| 15 | `BusinessService` | `business_services` | 3. Service catalog and integrations |
| 16 | `CompanyIntegration` | `company_integrations` | 3. Service catalog and integrations |
| 17 | `CompanyApiClient` | `company_api_clients` | 3. Service catalog and integrations |
| 18 | `CompanyEvent` | `company_events` | 3. Service catalog and integrations |
| 19 | `IntegrationLog` | `integration_logs` | 3. Service catalog and integrations |
| 20 | `Notification` | `notifications` | 4. Governance, notifications and activity |
| 21 | `ConsentRecord` | `consent_records` | 4. Governance, notifications and activity |
| 22 | `FeatureFlag` | `feature_flags` | 4. Governance, notifications and activity |
| 23 | `AuditLog` | `audit_logs` | 4. Governance, notifications and activity |
| 24 | `ActivityEvent` | `activity_events` | 4. Governance, notifications and activity |
| 25 | `RewardsAccount` | `rewards_accounts` | 5. Rewards and benefit linkage |
| 26 | `RewardsRule` | `rewards_rules` | 5. Rewards and benefit linkage |
| 27 | `RewardsTransaction` | `rewards_transactions` | 5. Rewards and benefit linkage |
| 28 | `RewardsRedemption` | `rewards_redemptions` | 5. Rewards and benefit linkage |
| 29 | `SystemSetting` | `system_settings` | 4. Governance, notifications and activity |
| 30 | `Document` | `documents` | 6. Documents and identity requests |
| 31 | `DocumentVersion` | `document_versions` | 6. Documents and identity requests |
| 32 | `DocumentReview` | `document_reviews` | 6. Documents and identity requests |
| 33 | `IdentityReviewRequest` | `identity_review_requests` | 6. Documents and identity requests |
| 34 | `PaymentRecord` | `payment_records` | 7. Payment evidence and events |
| 35 | `PaymentRecordEvent` | `payment_record_events` | 7. Payment evidence and events |
| 36 | `Certificate` | `certificates` | 8. Certificates and disabled verification |
| 37 | `CertificateEvent` | `certificate_events` | 8. Certificates and disabled verification |
| 38 | `VerificationReference` | `verification_references` | 8. Certificates and disabled verification |
| 39 | `ServiceRequest` | `service_requests` | 9. Service requests and assignments |
| 40 | `ServiceRequestEvent` | `service_request_events` | 9. Service requests and assignments |
| 41 | `SavedProperty` | `saved_properties` | 10. Saved properties, milestones and turnover |
| 42 | `ProjectMilestone` | `project_milestones` | 10. Saved properties, milestones and turnover |
| 43 | `TurnoverCase` | `turnover_cases` | 10. Saved properties, milestones and turnover |
| 44 | `TurnoverChecklistItem` | `turnover_checklist_items` | 10. Saved properties, milestones and turnover |
| 45 | `RewardsBenefit` | `rewards_benefits` | 5. Rewards and benefit linkage |

Total: **45 unique models**, **29 existing + 16 new**, with 96 owning-side FK relations drawn. The dictionary inventories 472 scalar/enum columns, including 186 on the new tables. Repeated context entities are not counted twice. SQL-only checks/partial indexes/triggers are in the dictionary, not invented diagram relationships.
