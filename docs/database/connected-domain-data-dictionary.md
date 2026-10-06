# Connected-domain data dictionary

**Source snapshot: 2026-10-06 — 45 application models (29 existing + 16 new).**

This dictionary, the [source map](connected-domain-source-map.md), and [ERD](connected-domain-erd.md) are authoritative connected-domain design/source documentation until the next reviewed design update. Exact executable definitions remain in [schema.prisma](../../packages/database/prisma/schema.prisma) and [202610060001_connected_domains/migration.sql](../../packages/database/prisma/migrations/202610060001_connected_domains/migration.sql). Schema presence is not deployment, business approval or API availability. All new enums/lifecycle choices are proposals pending business approval.

## How to read the inventory

The appendix inventories **every persisted scalar/enum field of all 45 models**, not relation-array pseudo-columns. Each row records the PostgreSQL type, nullability, exact Prisma scalar declaration/default, a conservative sensitivity label and FK participation. Model blocks list all Prisma composite unique/index declarations and owning-side relations. New SQL-only invariants are described below; historical migration-only rules for existing tables remain authoritative in [migration history](../../packages/database/prisma/migrations). Do not mistake the Prisma appendix for a complete inventory of historical SQL triggers/checks/partial indexes.

- `String @db.Uuid` is PostgreSQL `UUID`; plain `String` is `TEXT`; SHA-256 fields use `VARCHAR(64)`; `Int` is `INTEGER`; `BigInt` is `BIGINT`; `Boolean` is `BOOLEAN`; `Json` is `JSONB`; `Decimal` uses the shown precision/scale. Enums are named PostgreSQL types, not unrestricted strings.
- `DateTime` uses `TIMESTAMP(3)` **without time zone**, matching the existing schema. Birth/due/target dates are not SQL DATE columns. New defaults and factual-time guards use UTC independently of session timezone; existing timestamp defaults/rows are not converted. API serialization and compatibility with legacy stored timestamps still need acceptance.
- New IDs use Prisma `@default(uuid())`: **no SQL UUID default**. The new tables have **23** `@default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` timestamp defaults: 16 factual creation/submission/decision fields plus seven `updated_at` fields. These are UTC **transaction time**, not wall time, preserving same-transaction chronology. Supplied factual timestamps are not overwritten; guards validate them. The seven new mutable `updated_at` fields retain Prisma `@updatedAt`, but SQL overrides their insert/update value with UTC **wall time** before other guards. Existing `@default(now())`/`@updatedAt` definitions remain unchanged; do not apply this new-only behavior to historical models. Literal enum/string/boolean/numeric defaults remain SQL defaults. Nullable fields otherwise have no default; redemption scope has trigger-derived semantics described below.
- `@id` means primary key; `@unique` means a single-column unique index. `@@unique`/`@@index` list ordered column groups. PostgreSQL nullable uniqueness ordinarily allows multiple NULLs; SQL partial indexes can strengthen this. New FKs and new redemption FKs use **ON DELETE RESTRICT / ON UPDATE RESTRICT**. Existing relations retain their declared/historical actions; omitted Prisma actions are not a claim of new restrictive behavior.
- Each new table has a UUID primary key. References and idempotency keys are opaque internal identifiers, not credentials or user-entered PII. UUID identifiers are not authorization.

### Sensitivity classification (documentation recommendation, not an implemented policy engine)

| Label | Treatment |
| --- | --- |
| I — Internal | Operational metadata/status/time/config. Not automatically publishable; aggregate linkage may increase sensitivity. |
| P — Personal/linkable | User/customer/staff identifiers, profile/contact/address fields and user-linked references. Restrict to authorized purpose/scope. |
| R — Restricted | Identity/evidence metadata, financial/points amounts, token/credential hashes or references, free text and JSON that may carry PII/security details. Redact logs and public projections; apply least privilege and retention review. |

No field in a new model is automatically public. Classification is conservative and context-dependent: a timestamp or status attached to a customer is personal record data even when its stand-alone label is I. Catalog titles/descriptions may become public only through an approved allowlisted projection. Credentials, raw verification tokens, signed URLs, file bytes, passwords and private keys must not be added to generic JSON/text columns. No real values or secrets are reproduced here.

## Common new SQL rules

These are **source-defined guards**, not executed-test results.

1. `updated_at >= created_at` on documents, identity requests, service requests, milestones, turnover cases/items and benefits. On exactly these **seven new mutable tables**, ALWAYS trigger `aaa_connected_updated_at` runs BEFORE INSERT/UPDATE, alphabetically before other same-kind guards, and calls `connected_normalize_updated_at` to replace `NEW.updated_at` with `(clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3)`. It overrides Prisma/client clock skew; it does not rewrite `created_at` or relax immutable-row guards.
2. Opaque identifiers use `^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$` (3–120 characters): every new `idempotency_key`; document-review/identity/payment-event/certificate-event `review_reference`; payment/certificate/service `reference`; milestone/item/benefit codes; turnover `case_number`. Nullable references can remain NULL unless a decision requires them.
3. `connected_recorded_time` rejects future factual timestamps: all new creation/submission/decision timestamps, mutable updated timestamps, payment `paid_at`, identity `decided_at`, reference `revoked_at`, milestone review/completion/publication, checklist completion and benefit approval. Scheduled due/target/expiry/availability timestamps are excluded. Comparison uses database UTC wall time. Notifications use the separate `connected_notification_read_time` stamping trigger and chronological CHECK described below, not the new-table recorded-time trigger.
4. Seven tables reject UPDATE/DELETE: `document_versions`, `document_reviews`, `payment_records`, `payment_record_events`, `certificates`, `certificate_events`, `service_request_events`. Ten reject TRUNCATE: those seven plus `identity_review_requests`, `turnover_checklist_items`, `rewards_redemptions`. ALWAYS triggers have no actor/owner/session-setting bypass; only independently authorized DDL could change enforcement.
5. Mutable headers freeze contextual keys: document ID/customer/property/creation; service ID/customer/requester/company/service/property/retry/reference/creation; turnover ID/customer/property/case-number/creation/creator (including a NULL creator); benefit ID/company/code/creation; verification ID/hash/target/creation; checklist ID/case/code/creation; milestone ID/project/milestone-code/creation. This prevents reparenting retained evidence. It does not make every other header field immutable.
6. Strict RLS enablement and browser/PUBLIC table/column ACL revocation cover **only the 16 NEW tables**. Existing table/column grants and RLS configuration, including notifications/redemptions, are preserved; old table privileges also cover new columns. The function ACL allowlist covers all **14** new trigger functions, including the notification trigger attached to an existing table. Unexpected non-owner ACLs on those new objects cause rollback. No new policy, runtime grant or role contract is supplied. Owner/superuser RLS bypass is not authorization; some invoker guards reject filtered history. The preflight inventory now includes 45 tables, but target execution/assessment is still required.

The 14 function definitions are `connected_normalize_updated_at`, `connected_notification_read_time`, `connected_recorded_time`, `connected_reject_mutation`, `connected_freeze_columns`, `connected_check_evidence`, `connected_identity_transition`, `connected_payment_event`, `connected_certificate_event`, `connected_service_event`, `connected_turnover_evidence`, `connected_verification_target`, `connected_redemption_source` and `connected_protect_linked_debit`. This is a function count, not a trigger-instance count.

## New models: semantics, checks and operational boundaries

Exact column types, defaults, FKs, index groups and sensitivity labels appear in the appendix. The following sections define the meaning and additional invariants for each model.

### 30. Document / `documents`

`customer_id` is the subject/owner; `property_id` is optional contextual property, from which project/developer scope is derived. `title` is the display label and `category` a free-text classification, **not an approved category enum**. `status` is a mutable header projection defaulting DRAFT; `created_at`/`updated_at` record header timing. No current-version pointer, file content, issuer string or signed URL is stored.

Checks: trimmed title 1–240 and category 1–80 characters; shared updated/factual-time rules. Context columns are frozen. Customer+status and property indexes support owner/scoped lookup. One logical document has zero or more versions; a header with no version is structurally possible. Status is not automatically derived from reviews by SQL. The API must define version selection, status consistency, authorized categories and property-less compliance scope.

### 31. DocumentVersion / `document_versions`

`document_id` identifies the logical document; `version_number` is its positive ordinal. `storage_bucket`/`storage_object` are stable private-object identifiers, not public/signed URLs. `checksum_sha256` is lowercase hex of content; `size_bytes` is positive BIGINT; `mime_type` is normalized declared media type. `uploaded_by_id` identifies the submitting actor, distinct from document customer where appropriate. `idempotency_key` is scoped by document+uploader; `created_at` cannot predate its document. Every field is immutable after insert.

Unique groups: document+version number, bucket+object, document+uploader+retry key. Uploader index supports actor lookup. Positive version and size checks; hash `^[0-9a-f]{64}$`; bucket `^[a-z0-9][a-z0-9._-]{0,62}$`; object `^[A-Za-z0-9][A-Za-z0-9._/-]{0,1023}$`, excluding dot/dot-dot path components, double slash and trailing slash. MIME length ≤127 and token/token syntax follow M's exact regex. These checks do not fetch/scan content or prove bytes match metadata. Storage must independently prohibit retained-object overwrite/deletion. Version numbers need not be consecutive under SQL.

### 32. DocumentReview / `document_reviews`

`document_version_id` fixes the exact immutable version; `reviewer_user_id` identifies the deciding actor; `decision` is APPROVED or REJECTED. `review_reference` is an opaque review identifier, `note` optional restricted commentary, `idempotency_key` scoped to version+reviewer, and `decided_at` the review time. Every field is append-only.

Reviewer cannot be document customer or version uploader; decision time cannot predate version. Version+reviewer+retry uniqueness prevents duplicate keys, not multiple different decisions on the same version. Version+decision-time and reviewer indexes support history lookup. Latest/final review policy, conflict resolution, actual reviewer authority and header status synchronization remain service decisions.

### 33. IdentityReviewRequest / `identity_review_requests`

`customer_id` is the identity subject; `requested_by_id` the authenticated submitting actor. `kind` defaults VERIFICATION; `status` defaults PENDING and an INSERT trigger **requires PENDING**, even if a caller explicitly requests APPROVED. `evidence_version_id` is **one optional** exact version belonging to the same customer. `reason` is restricted submission rationale; `idempotency_key` is scoped to customer+requester.

The twelve typed proposal fields are `requested_first_name`, `requested_middle_name`, `requested_last_name`, `requested_suffix`, `requested_birth_date`, `requested_nationality`, `requested_address_line`, `requested_barangay`, `requested_city`, `requested_province`, `requested_postal_code`, `requested_country`. Each means a requested replacement of the corresponding profile identity field, not an immediately applied value. All nullable strings must be trimmed length 1–500 when present; birth timestamp must not exceed request creation. **NULL means not requested, not field clearing.** There are no requested email/mobile/RHC ID/account-status/verification-status fields.

`reviewer_user_id`, `review_reference`, `decision_note`, `decided_at` form the decision; `created_at` and `updated_at` bound its chronology. Reason trimmed length 1–2000. CORRECTION iff at least one typed correction value is non-NULL; VERIFICATION requires them all NULL. PENDING requires all four decision fields NULL. APPROVED/REJECTED require reviewer, review reference and decision time (`created_at <= decided_at <= updated_at`), with optional note. Reviewer differs from both customer and requester. Evidence cannot postdate request creation.

Submitted fields are immutable, even while pending; only decision/status/update timestamp can change. Decided rows reject all updates; deletion/TRUNCATE is prohibited. Requester+customer+retry is unique; customer/status, reviewer/status and evidence are indexed. Single evidence, field clearing and multiple correction/evidence requirements remain unapproved. **A reviewed request never updates/unlocks UserProfile or issues an ID.** Existing direct admin verification approval is a separate API path, not this request's decision consumer.

### 34. PaymentRecord / `payment_records`

`customer_id`/`property_id` identify the claimed payment context; `submitted_by_id` is the actor. Optional `reservation_id` participates with customer/property in a composite FK, so a linked reservation must match both. `reference` is an indexed opaque business reference, deliberately not globally unique. `amount` is DECIMAL(16,2), positive and non-NaN; `currency` defaults PHP and is **CHECK-locked to PHP**. `due_date` is optional scheduling, `paid_at` an optional claimed payment time no later than `submitted_at`. `description` is trimmed 1–2000. `evidence_version_id` optionally fixes evidence; `idempotency_key` is unique within customer+submitter; `submitted_at` records insertion/submission time.

The entire row is immutable. Evidence must match customer and, when evidence has property context, the property; submission cannot predate evidence or reservation. Customer/time, property, reference, evidence and reservation-scope indexes are provided. There is **no payment status column** and no settlement/accounting/gateway confirmation. A corrected submission is a new row, not editing an accepted claim. Required customer-property entitlement and evidence approval remain API/policy checks.

### 35. PaymentRecordEvent / `payment_record_events`

`payment_record_id` identifies the claim; `event_type` is SUBMITTED/VERIFIED/REJECTED/REVERSED/NOTE; `actor_user_id` the actor; `review_reference` required for verification/rejection/reversal; `note` optional restricted text. `reversal_of_id` is non-NULL iff REVERSED and targets the same payment's VERIFIED event (never itself, NOTE, rejection or another reversal). `idempotency_key` scopes to payment+actor; `created_at` is event time.

Append-only; parent row locking and unique indexes are source-defined. Event time ≥ submission; a SUBMITTED event must match submitter and exact submitted timestamp. Review/reversal cannot be by customer or submitter. Reversal time ≥ original verification. Unique nullable reversal target permits at most one reversal per verification. **SQL-only partial unique indexes:** `payment_record_events_one_review_key` permits one VERIFIED-or-REJECTED event per payment; `payment_record_events_one_submission_key` permits one SUBMITTED event. Reversal does not reopen review. SQL does not require a submission event to exist before a review. Status/read-model mapping is future API work, not a mutable payment field.

### 36. Certificate / `certificates`

`customer_id` is recipient; `reference` a globally unique internal business reference; `certificate_type` a code matching `^[A-Z][A-Z0-9_]{1,79}$`, not an approved type catalog. **`issuer_company_id` is required and has a real Company FK**. `source_document_version_id` and `source_property_id` are nullable individually but **exactly one must be present**. `supersedes_id` optionally identifies a predecessor, unique and non-self. `created_by_id` is creator; `expires_at` optional validity end after creation; `idempotency_key` scoped to customer+creator; `created_at` is artifact creation, not issuance.

Entire row immutable. Document source must have the same customer and precede artifact creation. Supersession requires same customer/type/issuer and a predecessor no newer than replacement, plus the **same property or versions of the same logical document**. Property/document source-kind changes and unrelated sources are blocked. A different version of the same document is allowed; no higher-version-number requirement is added. This conservative source-retention policy remains a business proposal, despite being SQL-enforced. Source, issuer/time and customer/time indexes support lookup. Issuer need not equal property developer; FK existence is not authority over source or recipient. No generic entity ID, raw public token, public URL, mutable status or blockchain field. Without an ISSUED event the artifact remains pending; actual issuance/revocation/supersession and expiry determine the future status projection.

### 37. CertificateEvent / `certificate_events`

`certificate_id`, `event_type`, `actor_user_id`, required `review_reference`, optional `note`, scoped `idempotency_key`, and `created_at` record immutable lifecycle facts. `replacement_certificate_id` is non-NULL iff SUPERSEDED, differs from subject and is unique when set.

Unique certificate+event-type allows one event of each kind; **SQL-only partial unique** `certificate_events_one_terminal_key` allows only one REVOKED-or-SUPERSEDED event. Issuance cannot occur after expiry. Terminal events require prior issuance. Supersession requires the explicitly linked successor (`successor.supersedes_id = subject.id`), already issued by event time, not expired or terminal. Later event times cannot predate relevant existing lifecycle/replacement history. Locks are acquired in stable UUID order; filtered history is rejected. **Every certificate-event insert, including ISSUED, requires SERIALIZABLE**, otherwise SQLSTATE `25000`. Callers must retry serialization failures (`40001`). Other new cross-row lifecycle APIs are advised to use SERIALIZABLE, but only certificate events enforce that isolation check here. Business authorization and database concurrency acceptance remain pending. There is no blanket SQL self-issuance prohibition or independent issuer-permission model; do not infer one.

### 38. VerificationReference / `verification_references`

`token_hash` is unique lowercase 64-character SHA-256 of a high-entropy opaque token, **not the raw token**. Exactly one of `user_profile_id`/`certificate_id` is set. `enabled` defaults false; `disclosure_scope` defaults NONE; `expires_at` and `revoked_at` optionally bound use; `created_at` records reference creation. ID/hash/targets/creation are frozen.

SQL `verification_references_inactive_check` **hard-requires NOT enabled AND disclosure_scope = NONE**, not just safe defaults. Hash syntax is enforced. Expiry > creation; revocation ≥ creation and not future. A profile target must actually have nonempty RHC ID and issuance time ≤ reference creation, checked under a parent lock on insert/update. Certificate FK does not require issuance at reference creation. Targets are indexed. Future verifier must recheck current identity/certificate validity, disclosure and revocation; an approved activation migration and API/privacy contract are required before any public use.

### 39. ServiceRequest / `service_requests`

`customer_id` is beneficiary; `requested_by_id` submitter; `company_id` service provider; `service_id` chosen catalog entry; optional `property_id` context. Composite `(service_id, company_id)` FK guarantees provider consistency. `reference` is unique; `title` trimmed 1–240; `description` optional restricted free text. `status` defaults PENDING; **`assignee_user_id` optionally references User**. `idempotency_key` scoped to customer+requester; `created_at`/`updated_at` header timing.

Provider can differ from property developer; customer/property link, company/project rights, service eligibility and assigner/assignee staff permissions are service-layer obligations. Status and assignee are mutable projections. Indexes cover customer/status, provider/status, service/provider, property and assignee/status. SQL does not force PENDING-only insertion or a specific transition graph, does not auto-append history, and does not synchronize later event state with the header. Future API must authenticate actors and atomically lock/update projection and append event.

### 40. ServiceRequestEvent / `service_request_events`

`service_request_id` is parent; `actor_user_id` performer; `event_type` distinguishes CREATED/STATUS_CHANGED/ASSIGNMENT_CHANGED/NOTE; `event_number` is a positive per-request sequence. `previous_assignee_user_id`/`next_assignee_user_id` are actual nullable User FKs; NULL next represents unassignment. `status` captures progress, `note` commentary, `idempotency_key` scoped request+actor, `created_at` event time.

Append-only. Unique request+sequence and request+actor+retry; previous/next assignee, actor and parent/time indexes. First event must be CREATED #1 with no previous assignee and capture header assignment/status. Subsequent numbers must be contiguous, timestamps nondecreasing and previous assignee equal prior next assignee. ASSIGNMENT_CHANGED must change assignee; STATUS_CHANGED/NOTE retain assignee; only STATUS_CHANGED changes progress relative to prior history and it must change it. NOTE requires nonblank text. Parent locking and unfiltered history are required. Equal TIMESTAMP(3) values are ordered by event_number. No SQL policy grants authority to listed actors/assignees.

### 41. SavedProperty / `saved_properties`

`customer_id`, `property_id`, `created_at` identify an owner bookmark. Unique customer/property pair prevents duplicate saves; property index supports reverse lookup. Both FKs RESTRICT delete/update. No approval/status/retry column, ownership entitlement, hold or purchase implication. API visibility rules and supported unsave behavior remain to be implemented; this table is not append-only.

### 42. ProjectMilestone / `project_milestones`

`project_id` and `milestone_code` (unique within project) identify a milestone. `title` trimmed 1–240 and `description` convey the update. `status` (progress) defaults PLANNED independently of `publication_status` default DRAFT. `target_date` schedules progress; `completed_at` records completion; `reviewer_user_id`/`reviewed_at` review; `published_at` publication; `created_at`/`updated_at` bound factual times.

Reviewer and review time are both NULL or both set, within creation/update bounds. COMPLETED iff completion time exists; completion ≥ creation and requires review at/after completion. DRAFT requires no publication time; PUBLISHED/ARCHIVED require publication time and review, `reviewed_at <= published_at <= updated_at`. Progress and publication are separate; COMPLETED does not imply public. Indexes cover project/progress, project/publication/time and reviewer. `connected_milestone_scope` freezes `id`, `project_id`, `milestone_code` and `created_at` on UPDATE; this is identity/scope freezing, not an immutable published-content workflow. No append-only publication history or SQL publishing permission exists; no public endpoint is activated. Progress/publication enum values remain explicit proposals pending business approval.

### 43. TurnoverCase / `turnover_cases`

`customer_id`/`property_id` identify context; `case_number` is unique; `status` defaults DRAFT; `note` restricted case commentary; timestamps track mutable header. `created_by_id` optionally identifies the recorded creator, while `responsible_user_id` optionally identifies the currently responsible user. Both are nullable UUIDs with **no default**, classified P (personal/linkable), and reference `users.id` with ON DELETE RESTRICT / ON UPDATE RESTRICT. Each has a nonunique single-column index, in addition to customer/status and property/status indexes. User inverse relations are `created_turnover_cases` (`TurnoverCreator`) and `responsible_turnover_cases` (`TurnoverResponsible`); these are navigation fields, not User columns. Customer/property pair deliberately **not unique**: case cardinality needs approval.

Both actor fields are **optional engineering proposals pending business approval**. No historical actor, creator or staff assignment is inferred. `created_by_id` is frozen by `connected_turnover_scope` from insertion, **including NULL**: ordinary UPDATE cannot fill, clear or replace it. `responsible_user_id` remains nullable and mutable, including assignment/reassignment/clearing at the schema level; the future API must authorize the acting user, chosen responsible user and case scope. The FK establishes identity, not staff eligibility or permission. There is no dedicated responsibility-change history table or automatic assignment event.

DRAFT is **not a SQL hard lock**; other proposed enum values can be stored. Context/number/creation are frozen. No date/check policy makes case completion imply legal handover, ownership or completion of required checklist items. Transition authority, activation, cardinality and audit policy remain pending API/product decisions.

### 44. TurnoverChecklistItem / `turnover_checklist_items`

`turnover_case_id` is case; `item_code` unique per case; `label` trimmed 1–240; `sort_order` nonnegative default 0; `required` default true. `completed_at`/`completed_by_id` jointly record completion or both remain NULL. `evidence_version_id` optionally references one exact version; `note` restricted commentary; creation/update timestamps track attachment and state.

Creation cannot predate case. Completion is within creation/update bounds. Evidence matches case customer and, if document has property, case property. Evidence may be uploaded **after item creation**: attachment uses updated_at, and completion must not predate upload. Once evidence is attached it cannot be replaced/cleared; evidence-bearing/completed rows cannot be deleted. Completed rows reject all updates; all checklist TRUNCATE is blocked. Empty incomplete items may be deleted. No mandatory evidence-on-completion CHECK exists. Indexes cover case/order, completing actor and evidence.

### 45. RewardsBenefit / `rewards_benefits`

`company_id` optionally scopes issuer/catalog; `benefit_code` globally unique. `title` trimmed 1–240 and `description` describe the proposal. `active` defaults false and **SQL hard-requires NOT active**. `points_cost` is optional positive non-NaN DECIMAL(18,2), not approved cash value. `approved_eligibility_terms`, `terms_version`, `approved_by_id`, `approved_at` capture an all-or-none approval tuple. `available_from`/`available_until` are proposed scheduling; timestamps track catalog writes.

Approval tuple is all NULL or all four present; terms nonblank, version trimmed 1–120, approval within creation/update bounds and not future. End availability requires start and end > start. Company/active and approver indexes, plus unique `(id, company_id)` for the redemption scoped-benefit FK. Scope/code/creation freeze, but other fields remain mutable: accepted redemption snapshots preserve historical terms independently. No offers/prices/eligibility are approved or seeded. SQL activation requires separate approval and migration; writing approval metadata does not activate the benefit.

## Existing-table extensions (all)

| Table / column or constraint | Type / null / default | Meaning and integrity |
| --- | --- | --- |
| `notifications.read_at` | TIMESTAMP(3), nullable, no default; P | Read state separate from delivery. On INSERT with non-NULL read_at, or UPDATE OF read_at when changed to non-NULL, an ALWAYS trigger stamps UTC wall time. NULL/unchanged values and created_at/sent_at/defaults remain untouched. CHECK NULL or ≥ created_at. No new index, endpoint, or monotonic-once-read policy. |
| `rewards_redemptions.benefit_id` | UUID, nullable, no default; P | FK to rewards_benefits.id, RESTRICT both ways; indexed. Optional only for preserving legacy requests without inferred catalog mapping. |
| `rewards_redemptions.benefit_company_id` | UUID, nullable, no default; I (linkable in context) | DB-derived scope snapshot from locked benefit, not caller authority. Composite FKs `(rewards_account_id, benefit_company_id)` → rewards_accounts(id, company_id) and `(benefit_id, benefit_company_id)` → rewards_benefits(id, company_id), RESTRICT delete/update. Scoped-account pair indexed; snapshot is immutable once benefit-linked. NULL for legacy/unlinked rows and global benefits. |
| `rewards_redemptions.accepted_points_cost` | DECIMAL(18,2), nullable, no default; R | Positive/non-NaN accepted cost, equals existing redemption.amount when benefit is set. Immutable once benefit-linked. |
| `rewards_redemptions.accepted_terms_snapshot` | TEXT, nullable, no default; R | Nonblank exact accepted terms snapshot, retained independently of later catalog edits. No automatic snapshot is generated. |
| `rewards_redemptions.original_debit_id` | UUID, nullable, no default; P | Unique FK to rewards_transactions.id, RESTRICT both ways. Link original REDEEM debit once, not an adjustment or a reversal row. |
| `reservations(id, customer_id, property_id)` | New unique candidate key `reservations_id_customer_property_key` | Redundant identity key supporting payment composite FK; no new reservation column, idempotency, revision or transition behavior. |
| `business_services(id, company_id)` | New unique candidate key | Supports request service/provider composite FK, preserves existing service-code identity. |
| `rewards_accounts(id, company_id)` | New unique candidate key `rewards_accounts_id_company_id_key` | Supports scoped-account FK, so a linked non-NULL company cannot later change or become NULL. No new account column or blanket freeze on unlinked accounts. |
| `rewards_benefits(id, company_id)` | Unique candidate key on the new benefit table | Supports scoped-benefit FK. Global benefits retain NULL scope. |
| `rewards_transactions` linked-debit guard | Trigger only, no new scalar column | Protects referenced debit identity/customer/account/type/reversal link/amount; prevents linked status moving outside POSTED/REVERSED. Existing reversal rows still link through reversal_of_id. |
| Existing Prisma inverse relations | No physical column | User, UserProfile, Company, Project, Property, Reservation, BusinessService, RewardsAccount and RewardsTransaction gain relation navigation to new records. They are not extra tables or columns. |

`rewards_redemptions_benefit_snapshot_check` allows either all five redemption extension fields NULL (legacy) or benefit+positive cost+nonblank terms, with debit link still optionally NULL. Snapshot cost must equal existing amount. `connected_redemption_source` derives `benefit_company_id` from the visible, locked benefit rather than trusting input; NULL remains valid for global benefits. Benefit scope must match account company when benefit company is non-NULL; account customer must match redemption. The two composite FKs retain this scoped linkage across later parent changes, including setting account company NULL, without depending on visibility of child rows under RLS. Existing single benefit FK remains, so a global benefit still needs to exist. New `(id, company_id)` candidate keys exist on accounts and benefits, and `(rewards_account_id, benefit_company_id)` is indexed on redemptions. Unlinked legacy accounts/global-benefit links acquire no new non-NULL company blocker. Original debit must match customer/account, be REDEEM, have no reversal_of_id, have status POSTED or REVERSED, and `abs(amount) = accepted_points_cost`. Absolute magnitude deliberately does not invent a signed/unsigned historical ledger convention. Once set, original debit cannot be replaced/cleared. Benefit-linked rows cannot be deleted or change identity/ownership/amount/snapshot; TRUNCATE is blocked for the entire table including legacy rows. Snapshot/debit insertion is not an approved redemption engine: active eligibility, terms verification, overspend protection, posting and idempotent atomic processing are not supplied.

## New enum inventory and approval boundary

The appendix lists all current enum values. The eleven new types are DocumentStatus, ReviewDecision, IdentityReviewStatus, IdentityReviewKind, PaymentRecordEventType, CertificateEventType, ServiceRequestStatus, ServiceRequestEventType, ProjectMilestoneStatus, MilestonePublicationStatus and TurnoverCaseStatus. Their presence in SQL is a source fact; **each set of values and its business interpretation remains a proposal**. Payment/certificate enums are event types, not status columns. Verification disclosure is TEXT hard-fixed to NONE, benefits use hard-false BOOLEAN, and document categories/certificate types are not approved enumerated taxonomies.

## Outstanding design/verification caveats

See the [explicit gap register](connected-domain-source-map.md#open-designsource-gaps--explicit-handoff). In particular: no live database acceptance; no inferred permission from actor FKs; no automatic identity correction; no policy for field clearing/multiple evidence; no automatic projection reconciliation; no approved offers or public disclosure; no new reservation retry protection; and the expanded 45-table ACL preflight still requires target execution and assessment, especially for preserved existing grants covering added columns. The inventory extraction below is documentation generation, **not Prisma validation or SQL execution**. No generated client was used.

## Appendix A — Complete current scalar-column inventory

The following blocks are generated from the local Prisma source text, preserving each scalar declaration and owning-side relation rather than relying on a potentially stale generated client. Index declarations retain Prisma syntax; SQL-only additions described above must be read alongside them. Counts and source fingerprints identify this snapshot and are not database observations.

**Source SHA-256:**

- Prisma: `d081c4053617cc6f6617499a62a5b8a3b71afea151174b3b19bbe8fed74b7cb6`
- Connected SQL: `d765162a0abf53cd8dc01b98586c0af1461ac306448045bdb85bacadb9f1a99c`

### A1. User — `users` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `supabase_user_id` | `TEXT` | Yes | `supabase_user_id String? @unique` | P | — |
| `auth_email_confirmed_at` | `TIMESTAMP(3)` | Yes | `auth_email_confirmed_at DateTime?` | P | — |
| `email` | `TEXT` | No | `email String @unique` | P | — |
| `mobile_number` | `TEXT` | Yes | `mobile_number String? @unique` | P | — |
| `account_status` | `AccountStatus` | No | `account_status AccountStatus @default(PENDING)` | I | — |
| `verification_status` | `VerificationStatus` | No | `verification_status VerificationStatus @default(UNVERIFIED)` | I | — |
| `last_login_at` | `TIMESTAMP(3)` | Yes | `last_login_at DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@index([email])`; `@@index([account_status, verification_status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

None. Inverse relation fields are not columns.

### A2. RhcIdSequence — `rhc_id_sequences` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `year` | `INTEGER` | No | `year Int @id` | I | — |
| `last_value` | `INTEGER` | No | `last_value Int @default(0)` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** No model-level composite index declarations. Single-column PK/unique keys are marked above.

**Owning-side relations:**

None. Inverse relation fields are not columns.

### A3. UserProfile — `user_profiles` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `user_id` | `UUID` | No | `user_id String @unique @db.Uuid` | P | `(user_id) → users(id)` |
| `first_name` | `TEXT` | Yes | `first_name String?` | P | — |
| `middle_name` | `TEXT` | Yes | `middle_name String?` | P | — |
| `last_name` | `TEXT` | Yes | `last_name String?` | P | — |
| `suffix` | `TEXT` | Yes | `suffix String?` | P | — |
| `birth_date` | `TIMESTAMP(3)` | Yes | `birth_date DateTime?` | P | — |
| `nationality` | `TEXT` | Yes | `nationality String?` | P | — |
| `address_line` | `TEXT` | Yes | `address_line String?` | P | — |
| `barangay` | `TEXT` | Yes | `barangay String?` | P | — |
| `city` | `TEXT` | Yes | `city String?` | P | — |
| `province` | `TEXT` | Yes | `province String?` | P | — |
| `postal_code` | `TEXT` | Yes | `postal_code String?` | P | — |
| `country` | `TEXT` | No | `country String @default("Philippines")` | P | — |
| `email` | `TEXT` | No | `email String` | P | — |
| `mobile_number` | `TEXT` | Yes | `mobile_number String?` | P | — |
| `rhc_id` | `TEXT` | Yes | `rhc_id String? @unique` | P | — |
| `rhc_id_issued_at` | `TIMESTAMP(3)` | Yes | `rhc_id_issued_at DateTime?` | P | — |
| `account_status` | `AccountStatus` | No | `account_status AccountStatus @default(PENDING)` | I | — |
| `verification_status` | `VerificationStatus` | No | `verification_status VerificationStatus @default(UNVERIFIED)` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@index([rhc_id])`; `@@index([last_name, first_name])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `user User @relation(fields: [user_id], references: [id], onDelete: Cascade)`

### A4. Company — `companies` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `company_code` | `TEXT` | No | `company_code String @unique` | I | — |
| `legal_name` | `TEXT` | No | `legal_name String` | I | — |
| `display_name` | `TEXT` | No | `display_name String` | I | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `business_type` | `TEXT` | Yes | `business_type String?` | I | — |
| `status` | `CompanyStatus` | No | `status CompanyStatus @default(ACTIVE)` | I | — |
| `logo_url` | `TEXT` | Yes | `logo_url String?` | I | — |
| `integration_status` | `IntegrationStatus` | No | `integration_status IntegrationStatus @default(NOT_CONFIGURED)` | I | — |
| `rewards_enabled` | `BOOLEAN` | No | `rewards_enabled Boolean @default(false)` | I | — |
| `digital_services_enabled` | `BOOLEAN` | No | `digital_services_enabled Boolean @default(true)` | I | — |
| `api_enabled` | `BOOLEAN` | No | `api_enabled Boolean @default(false)` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@index([status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

None. Inverse relation fields are not columns.

### A5. Project — `projects` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `company_id` | `UUID` | No | `company_id String @db.Uuid` | I | `(company_id) → companies(id)` |
| `project_code` | `TEXT` | No | `project_code String @unique` | I | — |
| `project_name` | `TEXT` | No | `project_name String` | I | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `location` | `TEXT` | Yes | `location String?` | I | — |
| `status` | `ProjectStatus` | No | `status ProjectStatus @default(PLANNED)` | I | — |
| `start_date` | `TIMESTAMP(3)` | Yes | `start_date DateTime?` | I | — |
| `target_completion` | `TIMESTAMP(3)` | Yes | `target_completion DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@index([company_id, status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `company Company @relation(fields: [company_id], references: [id])`

### A6. Permission — `permissions` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `code` | `TEXT` | No | `code String @unique` | I | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |

**Keys/indexes:** No model-level composite index declarations. Single-column PK/unique keys are marked above.

**Owning-side relations:**

None. Inverse relation fields are not columns.

### A7. Role — `roles` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | `(company_id) → companies(id)` |
| `code` | `TEXT` | No | `code String` | I | — |
| `name` | `TEXT` | No | `name String` | I | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `is_system` | `BOOLEAN` | No | `is_system Boolean @default(false)` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@unique([company_id, code])`; `@@index([code])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `company Company? @relation(fields: [company_id], references: [id], onDelete: Restrict)`

### A8. RolePermission — `role_permissions` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `role_id` | `UUID` | No | `role_id String @db.Uuid` | I | `(role_id) → roles(id)` |
| `permission_id` | `UUID` | No | `permission_id String @db.Uuid` | I | `(permission_id) → permissions(id)` |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |

**Keys/indexes:** `@@unique([role_id, permission_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `role Role @relation(fields: [role_id], references: [id], onDelete: Cascade)`
- `permission Permission @relation(fields: [permission_id], references: [id], onDelete: Cascade)`

### A9. UserRole — `user_roles` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `user_id` | `UUID` | No | `user_id String @db.Uuid` | P | `(user_id) → users(id)` |
| `role_id` | `UUID` | No | `role_id String @db.Uuid` | I | `(role_id) → roles(id)` |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | `(company_id) → companies(id)` |
| `project_id` | `UUID` | Yes | `project_id String? @db.Uuid` | I | `(project_id) → projects(id)` |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `expires_at` | `TIMESTAMP(3)` | Yes | `expires_at DateTime?` | I | — |

**Keys/indexes:** `@@unique([user_id, role_id, company_id, project_id])`; `@@index([user_id])`; `@@index([company_id, project_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `user User @relation(fields: [user_id], references: [id], onDelete: Cascade)`
- `role Role @relation(fields: [role_id], references: [id], onDelete: Cascade)`
- `company Company? @relation(fields: [company_id], references: [id], onDelete: Restrict)`
- `project Project? @relation(fields: [project_id], references: [id], onDelete: Restrict)`

### A10. Property — `properties` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `project_id` | `UUID` | No | `project_id String @db.Uuid` | I | `(project_id) → projects(id)` |
| `property_code` | `TEXT` | No | `property_code String @unique` | I | — |
| `tower` | `TEXT` | Yes | `tower String?` | I | — |
| `floor` | `TEXT` | Yes | `floor String?` | I | — |
| `unit_number` | `TEXT` | Yes | `unit_number String?` | I | — |
| `asset_type` | `AssetType` | No | `asset_type AssetType` | I | — |
| `area` | `DECIMAL(12,2)` | Yes | `area Decimal? @db.Decimal(12, 2)` | I | — |
| `list_price` | `DECIMAL(16,2)` | Yes | `list_price Decimal? @db.Decimal(16, 2)` | R | — |
| `currency` | `TEXT` | No | `currency String @default("PHP")` | I | — |
| `status` | `PropertyStatus` | No | `status PropertyStatus @default(AVAILABLE)` | I | — |
| `metadata` | `JSONB` | No | `metadata Json @default("{}")` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@index([project_id, status])`; `@@index([asset_type])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `project Project @relation(fields: [project_id], references: [id])`

### A11. PropertyStatusHistory — `property_status_history` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `property_id` | `UUID` | No | `property_id String @db.Uuid` | I | `(property_id) → properties(id)` |
| `previous_status` | `PropertyStatus` | Yes | `previous_status PropertyStatus?` | I | — |
| `next_status` | `PropertyStatus` | No | `next_status PropertyStatus` | I | — |
| `reason` | `TEXT` | Yes | `reason String?` | R | — |
| `actor_user_id` | `UUID` | Yes | `actor_user_id String? @db.Uuid` | P | `(actor_user_id) → users(id)` |
| `reservation_id` | `UUID` | Yes | `reservation_id String? @db.Uuid` | P | `(reservation_id) → reservations(id)` |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |

**Keys/indexes:** `@@index([property_id, created_at])`; `@@index([actor_user_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `property Property @relation(fields: [property_id], references: [id], onDelete: Restrict)`
- `actor User? @relation("PropertyStatusActor", fields: [actor_user_id], references: [id], onDelete: SetNull)`
- `reservation Reservation? @relation(fields: [reservation_id], references: [id], onDelete: SetNull)`

### A12. Reservation — `reservations` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `reservation_number` | `TEXT` | No | `reservation_number String @unique` | I | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `property_id` | `UUID` | No | `property_id String @db.Uuid` | I | `(property_id) → properties(id)` |
| `status` | `ReservationStatus` | No | `status ReservationStatus @default(PENDING)` | I | — |
| `expires_at` | `TIMESTAMP(3)` | No | `expires_at DateTime` | I | — |
| `confirmed_at` | `TIMESTAMP(3)` | Yes | `confirmed_at DateTime?` | I | — |
| `cancelled_at` | `TIMESTAMP(3)` | Yes | `cancelled_at DateTime?` | I | — |
| `converted_at` | `TIMESTAMP(3)` | Yes | `converted_at DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@unique([id, customer_id, property_id], map: "reservations_id_customer_property_key")`; `@@index([customer_id, status])`; `@@index([property_id, status])`; `@@index([expires_at, status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation("CustomerReservations", fields: [customer_id], references: [id], onDelete: Restrict)`
- `property Property @relation(fields: [property_id], references: [id], onDelete: Restrict)`

### A13. ReservationEvent — `reservation_events` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `reservation_id` | `UUID` | No | `reservation_id String @db.Uuid` | P | `(reservation_id) → reservations(id)` |
| `event_type` | `ReservationEventType` | No | `event_type ReservationEventType` | I | — |
| `actor_user_id` | `UUID` | Yes | `actor_user_id String? @db.Uuid` | P | `(actor_user_id) → users(id)` |
| `note` | `TEXT` | Yes | `note String?` | R | — |
| `metadata` | `JSONB` | No | `metadata Json @default("{}")` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |

**Keys/indexes:** `@@index([reservation_id, created_at])`; `@@index([actor_user_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `reservation Reservation @relation(fields: [reservation_id], references: [id], onDelete: Restrict)`
- `actor User? @relation("ReservationEventActor", fields: [actor_user_id], references: [id], onDelete: SetNull)`

### A14. CustomerProperty — `customer_properties` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `property_id` | `UUID` | No | `property_id String @db.Uuid` | I | `(property_id) → properties(id)` |
| `relationship_type` | `CustomerPropertyRelationship` | No | `relationship_type CustomerPropertyRelationship` | I | — |
| `status` | `RelationshipStatus` | No | `status RelationshipStatus @default(ACTIVE)` | I | — |
| `effective_from` | `TIMESTAMP(3)` | No | `effective_from DateTime @default(now())` | I | — |
| `effective_to` | `TIMESTAMP(3)` | Yes | `effective_to DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@unique([customer_id, property_id, relationship_type, effective_from])`; `@@index([customer_id, status])`; `@@index([property_id, status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation(fields: [customer_id], references: [id], onDelete: Restrict)`
- `property Property @relation(fields: [property_id], references: [id], onDelete: Restrict)`

### A15. BusinessService — `business_services` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `company_id` | `UUID` | No | `company_id String @db.Uuid` | I | `(company_id) → companies(id)` |
| `service_code` | `TEXT` | No | `service_code String` | I | — |
| `service_name` | `TEXT` | No | `service_name String` | I | — |
| `service_type` | `TEXT` | No | `service_type String` | I | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `status` | `ServiceStatus` | No | `status ServiceStatus @default(PREPARED)` | I | — |
| `rewards_eligible` | `BOOLEAN` | No | `rewards_eligible Boolean @default(false)` | I | — |
| `wallet_eligible` | `BOOLEAN` | No | `wallet_eligible Boolean @default(false)` | I | — |
| `requires_property` | `BOOLEAN` | No | `requires_property Boolean @default(false)` | I | — |
| `requires_resident_status` | `BOOLEAN` | No | `requires_resident_status Boolean @default(false)` | I | — |
| `integration_status` | `IntegrationStatus` | No | `integration_status IntegrationStatus @default(PREPARED)` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@unique([id, company_id])`; `@@unique([company_id, service_code])`; `@@index([status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `company Company @relation(fields: [company_id], references: [id])`

### A16. CompanyIntegration — `company_integrations` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `company_id` | `UUID` | No | `company_id String @db.Uuid` | I | `(company_id) → companies(id)` |
| `integration_key` | `TEXT` | No | `integration_key String` | I | — |
| `name` | `TEXT` | No | `name String` | I | — |
| `status` | `IntegrationStatus` | No | `status IntegrationStatus @default(PREPARED)` | I | — |
| `config` | `JSONB` | No | `config Json @default("{}")` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@unique([company_id, integration_key])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `company Company @relation(fields: [company_id], references: [id])`

### A17. CompanyApiClient — `company_api_clients` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `company_id` | `UUID` | No | `company_id String @db.Uuid` | I | `(company_id) → companies(id)` |
| `client_name` | `TEXT` | No | `client_name String` | I | — |
| `client_id` | `TEXT` | No | `client_id String @unique` | I | — |
| `credential_ref` | `TEXT` | Yes | `credential_ref String?` | R | — |
| `scopes` | `TEXT[]` | Prisma required list; see note | `scopes String[]` | R | — |
| `status` | `CompanyStatus` | No | `status CompanyStatus @default(ACTIVE)` | I | — |
| `last_used_at` | `TIMESTAMP(3)` | Yes | `last_used_at DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@index([company_id, status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `company Company @relation(fields: [company_id], references: [id])`

### A18. CompanyEvent — `company_events` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `company_id` | `UUID` | No | `company_id String @db.Uuid` | I | `(company_id) → companies(id)` |
| `event_type` | `TEXT` | No | `event_type String` | I | — |
| `enabled` | `BOOLEAN` | No | `enabled Boolean @default(true)` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |

**Keys/indexes:** `@@unique([company_id, event_type])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `company Company @relation(fields: [company_id], references: [id])`

### A19. IntegrationLog — `integration_logs` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `integration_id` | `UUID` | Yes | `integration_id String? @db.Uuid` | I | `(integration_id) → company_integrations(id)` |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | `(company_id) → companies(id)` |
| `direction` | `TEXT` | No | `direction String` | I | — |
| `event_type` | `TEXT` | No | `event_type String` | I | — |
| `status` | `EventStatus` | No | `status EventStatus @default(PENDING)` | I | — |
| `request_ref` | `TEXT` | Yes | `request_ref String?` | I | — |
| `error_code` | `TEXT` | Yes | `error_code String?` | I | — |
| `error_message` | `TEXT` | Yes | `error_message String?` | R | — |
| `metadata` | `JSONB` | No | `metadata Json @default("{}")` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |

**Keys/indexes:** `@@index([company_id, event_type])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `integration CompanyIntegration? @relation(fields: [integration_id], references: [id])`
- `company Company? @relation(fields: [company_id], references: [id], onDelete: Restrict)`

### A20. Notification — `notifications` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `user_id` | `UUID` | No | `user_id String @db.Uuid` | P | `(user_id) → users(id)` |
| `channel` | `TEXT` | No | `channel String` | I | — |
| `subject` | `TEXT` | No | `subject String` | R | — |
| `body` | `TEXT` | No | `body String` | R | — |
| `status` | `TEXT` | No | `status String @default("QUEUED")` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `sent_at` | `TIMESTAMP(3)` | Yes | `sent_at DateTime?` | I | — |
| `read_at` | `TIMESTAMP(3)` | Yes | `read_at DateTime?` | P | — |

**Keys/indexes:** `@@index([user_id, status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `user User @relation(fields: [user_id], references: [id], onDelete: Restrict)`

### A21. ConsentRecord — `consent_records` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `user_id` | `UUID` | No | `user_id String @db.Uuid` | P | `(user_id) → users(id)` |
| `consent_type` | `ConsentType` | No | `consent_type ConsentType` | I | — |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | `(company_id) → companies(id)` |
| `consent_version` | `TEXT` | No | `consent_version String` | I | — |
| `granted` | `BOOLEAN` | No | `granted Boolean` | I | — |
| `granted_at` | `TIMESTAMP(3)` | Yes | `granted_at DateTime?` | I | — |
| `withdrawn_at` | `TIMESTAMP(3)` | Yes | `withdrawn_at DateTime?` | I | — |
| `metadata` | `JSONB` | No | `metadata Json @default("{}")` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |

**Keys/indexes:** `@@index([user_id, consent_type, company_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `user User @relation(fields: [user_id], references: [id], onDelete: Restrict)`
- `company Company? @relation(fields: [company_id], references: [id], onDelete: Restrict)`

### A22. FeatureFlag — `feature_flags` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `key` | `TEXT` | No | `key String @unique` | I | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `enabled` | `BOOLEAN` | No | `enabled Boolean @default(false)` | I | — |
| `scope` | `TEXT` | No | `scope String @default("GLOBAL")` | I | — |
| `metadata` | `JSONB` | No | `metadata Json @default("{}")` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** No model-level composite index declarations. Single-column PK/unique keys are marked above.

**Owning-side relations:**

None. Inverse relation fields are not columns.

### A23. AuditLog — `audit_logs` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `actor_user_id` | `UUID` | Yes | `actor_user_id String? @db.Uuid` | P | `(actor_user_id) → users(id)` |
| `actor_role` | `TEXT` | Yes | `actor_role String?` | I | — |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | — |
| `project_id` | `UUID` | Yes | `project_id String? @db.Uuid` | I | — |
| `action` | `TEXT` | No | `action String` | I | — |
| `entity_type` | `TEXT` | No | `entity_type String` | I | — |
| `entity_id` | `TEXT` | Yes | `entity_id String?` | I | — |
| `before_data` | `JSONB` | Yes | `before_data Json?` | R | — |
| `after_data` | `JSONB` | Yes | `after_data Json?` | R | — |
| `ip_address` | `TEXT` | Yes | `ip_address String?` | P | — |
| `user_agent` | `TEXT` | Yes | `user_agent String?` | R | — |
| `request_id` | `TEXT` | Yes | `request_id String?` | I | — |
| `correlation_id` | `TEXT` | Yes | `correlation_id String?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |

**Keys/indexes:** `@@index([entity_type, entity_id])`; `@@index([actor_user_id])`; `@@index([created_at])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `actor User? @relation("AuditActor", fields: [actor_user_id], references: [id])`

### A24. ActivityEvent — `activity_events` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `event_type` | `TEXT` | No | `event_type String` | I | — |
| `actor_user_id` | `UUID` | Yes | `actor_user_id String? @db.Uuid` | P | `(actor_user_id) → users(id)` |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | — |
| `project_id` | `UUID` | Yes | `project_id String? @db.Uuid` | I | — |
| `entity_type` | `TEXT` | Yes | `entity_type String?` | I | — |
| `entity_id` | `TEXT` | Yes | `entity_id String?` | I | — |
| `payload` | `JSONB` | No | `payload Json @default("{}")` | R | — |
| `status` | `EventStatus` | No | `status EventStatus @default(PENDING)` | I | — |
| `request_id` | `TEXT` | Yes | `request_id String?` | I | — |
| `correlation_id` | `TEXT` | Yes | `correlation_id String?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `processed_at` | `TIMESTAMP(3)` | Yes | `processed_at DateTime?` | I | — |

**Keys/indexes:** `@@index([event_type, status])`; `@@index([company_id, project_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `actor User? @relation("ActivityActor", fields: [actor_user_id], references: [id])`

### A25. RewardsAccount — `rewards_accounts` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | `(company_id) → companies(id)` |
| `status` | `RewardsAccountStatus` | No | `status RewardsAccountStatus @default(DISABLED)` | I | — |
| `balance` | `DECIMAL(18,2)` | No | `balance Decimal @default(0) @db.Decimal(18, 2)` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** `@@unique([id, company_id])`; `@@unique([id, customer_id])`; `@@unique([customer_id, company_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation(fields: [customer_id], references: [id], onDelete: Restrict)`
- `company Company? @relation(fields: [company_id], references: [id], onDelete: Restrict)`

### A26. RewardsRule — `rewards_rules` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | `(company_id) → companies(id)` |
| `rule_code` | `TEXT` | No | `rule_code String @unique` | I | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `active` | `BOOLEAN` | No | `active Boolean @default(false)` | I | — |
| `rule_definition` | `JSONB` | No | `rule_definition Json @default("{}")` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** No model-level composite index declarations. Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `company Company? @relation(fields: [company_id], references: [id], onDelete: Restrict)`

### A27. RewardsTransaction — `rewards_transactions` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `rewards_account_id` | `UUID` | No | `rewards_account_id String @db.Uuid` | P | `(rewards_account_id, customer_id) → rewards_accounts(id, customer_id)` |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(rewards_account_id, customer_id) → rewards_accounts(id, customer_id)`; `(customer_id) → users(id)` |
| `source_company_id` | `UUID` | Yes | `source_company_id String? @db.Uuid` | I | `(source_company_id) → companies(id)` |
| `rule_id` | `UUID` | Yes | `rule_id String? @db.Uuid` | I | `(rule_id) → rewards_rules(id)` |
| `transaction_number` | `TEXT` | No | `transaction_number String @unique` | I | — |
| `idempotency_key` | `TEXT` | Yes | `idempotency_key String? @unique` | P | — |
| `source_reference` | `TEXT` | Yes | `source_reference String?` | P | — |
| `transaction_type` | `RewardsTransactionType` | No | `transaction_type RewardsTransactionType` | I | — |
| `amount` | `DECIMAL(18,2)` | No | `amount Decimal @db.Decimal(18, 2)` | R | — |
| `reason` | `TEXT` | No | `reason String` | R | — |
| `authorization_ref` | `TEXT` | Yes | `authorization_ref String?` | R | — |
| `status` | `RewardsTransactionStatus` | No | `status RewardsTransactionStatus @default(PENDING)` | I | — |
| `reversal_of_id` | `UUID` | Yes | `reversal_of_id String? @db.Uuid` | P | `(reversal_of_id) → rewards_transactions(id)` |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `posted_at` | `TIMESTAMP(3)` | Yes | `posted_at DateTime?` | I | — |

**Keys/indexes:** `@@index([customer_id, created_at])`; `@@index([source_company_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `account RewardsAccount @relation(fields: [rewards_account_id, customer_id], references: [id, customer_id], onDelete: Restrict)`
- `customer User @relation(fields: [customer_id], references: [id], onDelete: Restrict)`
- `source_company Company? @relation("RewardsSourceCompany", fields: [source_company_id], references: [id], onDelete: Restrict)`
- `rule RewardsRule? @relation(fields: [rule_id], references: [id], onDelete: Restrict)`
- `reversal_of RewardsTransaction? @relation("RewardsReversal", fields: [reversal_of_id], references: [id], onDelete: Restrict)`

### A28. RewardsRedemption — `rewards_redemptions` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)`; `(rewards_account_id, customer_id) → rewards_accounts(id, customer_id)` |
| `rewards_account_id` | `UUID` | No | `rewards_account_id String @db.Uuid` | P | `(rewards_account_id, customer_id) → rewards_accounts(id, customer_id)`; `(rewards_account_id, benefit_company_id) → rewards_accounts(id, company_id)` |
| `amount` | `DECIMAL(18,2)` | No | `amount Decimal @db.Decimal(18, 2)` | R | — |
| `status` | `RedemptionStatus` | No | `status RedemptionStatus @default(REQUESTED)` | I | — |
| `reason` | `TEXT` | Yes | `reason String?` | R | — |
| `authorization_ref` | `TEXT` | Yes | `authorization_ref String?` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |
| `benefit_id` | `UUID` | Yes | `benefit_id String? @db.Uuid` | I | `(benefit_id, benefit_company_id) → rewards_benefits(id, company_id)`; `(benefit_id) → rewards_benefits(id)` |
| `benefit_company_id` | `UUID` | Yes | `benefit_company_id String? @db.Uuid` | I | `(rewards_account_id, benefit_company_id) → rewards_accounts(id, company_id)`; `(benefit_id, benefit_company_id) → rewards_benefits(id, company_id)` |
| `accepted_points_cost` | `DECIMAL(18,2)` | Yes | `accepted_points_cost Decimal? @db.Decimal(18, 2)` | R | — |
| `accepted_terms_snapshot` | `TEXT` | Yes | `accepted_terms_snapshot String?` | R | — |
| `original_debit_id` | `UUID` | Yes | `original_debit_id String? @unique @db.Uuid` | P | `(original_debit_id) → rewards_transactions(id)` |

**Keys/indexes:** `@@index([rewards_account_id, benefit_company_id], map: "rewards_redemptions_scoped_account_idx")`; `@@index([benefit_id])`; `@@index([customer_id, status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation(fields: [customer_id], references: [id], onDelete: Restrict)`
- `account RewardsAccount @relation(fields: [rewards_account_id, customer_id], references: [id, customer_id], onDelete: Restrict)`
- `scoped_account RewardsAccount? @relation("RedemptionAccountScope", fields: [rewards_account_id, benefit_company_id], references: [id, company_id], onDelete: Restrict, onUpdate: Restrict, map: "rewards_redemptions_scoped_account_fkey")`
- `scoped_benefit RewardsBenefit? @relation("RedemptionBenefitScope", fields: [benefit_id, benefit_company_id], references: [id, company_id], onDelete: Restrict, onUpdate: Restrict, map: "rewards_redemptions_scoped_benefit_fkey")`
- `benefit RewardsBenefit? @relation(fields: [benefit_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `original_debit RewardsTransaction? @relation("RedemptionOriginalDebit", fields: [original_debit_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A29. SystemSetting — `system_settings` (existing)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `key` | `TEXT` | No | `key String @unique` | I | — |
| `value` | `JSONB` | No | `value Json` | R | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(now())` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @updatedAt` | I | — |

**Keys/indexes:** No model-level composite index declarations. Single-column PK/unique keys are marked above.

**Owning-side relations:**

None. Inverse relation fields are not columns.

### A30. Document — `documents` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `property_id` | `UUID` | Yes | `property_id String? @db.Uuid` | I | `(property_id) → properties(id)` |
| `title` | `TEXT` | No | `title String` | R | — |
| `category` | `TEXT` | No | `category String` | I | — |
| `status` | `DocumentStatus` | No | `status DocumentStatus @default(DRAFT)` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')")) @updatedAt` | I | — |

**Keys/indexes:** `@@index([customer_id, status])`; `@@index([property_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation("DocumentCustomer", fields: [customer_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `property Property? @relation(fields: [property_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A31. DocumentVersion — `document_versions` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `document_id` | `UUID` | No | `document_id String @db.Uuid` | P | `(document_id) → documents(id)` |
| `version_number` | `INTEGER` | No | `version_number Int` | I | — |
| `storage_bucket` | `TEXT` | No | `storage_bucket String` | R | — |
| `storage_object` | `TEXT` | No | `storage_object String` | R | — |
| `checksum_sha256` | `VARCHAR(64)` | No | `checksum_sha256 String @db.VarChar(64)` | R | — |
| `size_bytes` | `BIGINT` | No | `size_bytes BigInt` | I | — |
| `mime_type` | `TEXT` | No | `mime_type String` | I | — |
| `uploaded_by_id` | `UUID` | No | `uploaded_by_id String @db.Uuid` | P | `(uploaded_by_id) → users(id)` |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@unique([document_id, version_number])`; `@@unique([storage_bucket, storage_object])`; `@@unique([document_id, uploaded_by_id, idempotency_key], map: "document_versions_retry_key")`; `@@index([uploaded_by_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `document Document @relation(fields: [document_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `uploaded_by User @relation("DocumentUploader", fields: [uploaded_by_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A32. DocumentReview — `document_reviews` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `document_version_id` | `UUID` | No | `document_version_id String @db.Uuid` | P | `(document_version_id) → document_versions(id)` |
| `reviewer_user_id` | `UUID` | No | `reviewer_user_id String @db.Uuid` | P | `(reviewer_user_id) → users(id)` |
| `decision` | `ReviewDecision` | No | `decision ReviewDecision` | I | — |
| `review_reference` | `TEXT` | No | `review_reference String` | P | — |
| `note` | `TEXT` | Yes | `note String?` | R | — |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `decided_at` | `TIMESTAMP(3)` | No | `decided_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@unique([document_version_id, reviewer_user_id, idempotency_key], map: "document_reviews_retry_key")`; `@@index([document_version_id, decided_at])`; `@@index([reviewer_user_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `version DocumentVersion @relation(fields: [document_version_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `reviewer User @relation("DocumentReviewer", fields: [reviewer_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A33. IdentityReviewRequest — `identity_review_requests` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `requested_by_id` | `UUID` | No | `requested_by_id String @db.Uuid` | P | `(requested_by_id) → users(id)` |
| `kind` | `IdentityReviewKind` | No | `kind IdentityReviewKind @default(VERIFICATION)` | I | — |
| `status` | `IdentityReviewStatus` | No | `status IdentityReviewStatus @default(PENDING)` | I | — |
| `evidence_version_id` | `UUID` | Yes | `evidence_version_id String? @db.Uuid` | P | `(evidence_version_id) → document_versions(id)` |
| `reason` | `TEXT` | No | `reason String` | R | — |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `requested_first_name` | `TEXT` | Yes | `requested_first_name String?` | P | — |
| `requested_middle_name` | `TEXT` | Yes | `requested_middle_name String?` | P | — |
| `requested_last_name` | `TEXT` | Yes | `requested_last_name String?` | P | — |
| `requested_suffix` | `TEXT` | Yes | `requested_suffix String?` | P | — |
| `requested_birth_date` | `TIMESTAMP(3)` | Yes | `requested_birth_date DateTime?` | P | — |
| `requested_nationality` | `TEXT` | Yes | `requested_nationality String?` | P | — |
| `requested_address_line` | `TEXT` | Yes | `requested_address_line String?` | P | — |
| `requested_barangay` | `TEXT` | Yes | `requested_barangay String?` | P | — |
| `requested_city` | `TEXT` | Yes | `requested_city String?` | P | — |
| `requested_province` | `TEXT` | Yes | `requested_province String?` | P | — |
| `requested_postal_code` | `TEXT` | Yes | `requested_postal_code String?` | P | — |
| `requested_country` | `TEXT` | Yes | `requested_country String?` | P | — |
| `reviewer_user_id` | `UUID` | Yes | `reviewer_user_id String? @db.Uuid` | P | `(reviewer_user_id) → users(id)` |
| `review_reference` | `TEXT` | Yes | `review_reference String?` | P | — |
| `decision_note` | `TEXT` | Yes | `decision_note String?` | R | — |
| `decided_at` | `TIMESTAMP(3)` | Yes | `decided_at DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')")) @updatedAt` | I | — |

**Keys/indexes:** `@@unique([customer_id, requested_by_id, idempotency_key], map: "identity_review_requests_retry_key")`; `@@index([customer_id, status])`; `@@index([reviewer_user_id, status])`; `@@index([evidence_version_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation("IdentityCustomer", fields: [customer_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `requested_by User @relation("IdentityRequester", fields: [requested_by_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `reviewer User? @relation("IdentityReviewer", fields: [reviewer_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `evidence DocumentVersion? @relation(fields: [evidence_version_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A34. PaymentRecord — `payment_records` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)`; `(reservation_id, customer_id, property_id) → reservations(id, customer_id, property_id)` |
| `property_id` | `UUID` | No | `property_id String @db.Uuid` | I | `(property_id) → properties(id)`; `(reservation_id, customer_id, property_id) → reservations(id, customer_id, property_id)` |
| `submitted_by_id` | `UUID` | No | `submitted_by_id String @db.Uuid` | P | `(submitted_by_id) → users(id)` |
| `reservation_id` | `UUID` | Yes | `reservation_id String? @db.Uuid` | P | `(reservation_id, customer_id, property_id) → reservations(id, customer_id, property_id)` |
| `reference` | `TEXT` | No | `reference String` | P | — |
| `amount` | `DECIMAL(16,2)` | No | `amount Decimal @db.Decimal(16, 2)` | R | — |
| `currency` | `TEXT` | No | `currency String @default("PHP")` | I | — |
| `due_date` | `TIMESTAMP(3)` | Yes | `due_date DateTime?` | I | — |
| `paid_at` | `TIMESTAMP(3)` | Yes | `paid_at DateTime?` | I | — |
| `description` | `TEXT` | No | `description String` | R | — |
| `evidence_version_id` | `UUID` | Yes | `evidence_version_id String? @db.Uuid` | P | `(evidence_version_id) → document_versions(id)` |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `submitted_at` | `TIMESTAMP(3)` | No | `submitted_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@unique([customer_id, submitted_by_id, idempotency_key], map: "payment_records_retry_key")`; `@@index([customer_id, submitted_at])`; `@@index([property_id])`; `@@index([reference])`; `@@index([evidence_version_id])`; `@@index([reservation_id, customer_id, property_id], map: "payment_records_reservation_scope_idx")` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation("PaymentCustomer", fields: [customer_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `property Property @relation(fields: [property_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `submitted_by User @relation("PaymentSubmitter", fields: [submitted_by_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `evidence DocumentVersion? @relation(fields: [evidence_version_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `reservation Reservation? @relation(fields: [reservation_id, customer_id, property_id], references: [id, customer_id, property_id], onDelete: Restrict, onUpdate: Restrict, map: "payment_records_reservation_scope_fkey")`

### A35. PaymentRecordEvent — `payment_record_events` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `payment_record_id` | `UUID` | No | `payment_record_id String @db.Uuid` | P | `(payment_record_id) → payment_records(id)` |
| `event_type` | `PaymentRecordEventType` | No | `event_type PaymentRecordEventType` | I | — |
| `actor_user_id` | `UUID` | No | `actor_user_id String @db.Uuid` | P | `(actor_user_id) → users(id)` |
| `review_reference` | `TEXT` | Yes | `review_reference String?` | P | — |
| `note` | `TEXT` | Yes | `note String?` | R | — |
| `reversal_of_id` | `UUID` | Yes | `reversal_of_id String? @unique @db.Uuid` | P | `(reversal_of_id) → payment_record_events(id)` |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@unique([payment_record_id, actor_user_id, idempotency_key], map: "payment_record_events_retry_key")`; `@@index([payment_record_id, created_at])`; `@@index([actor_user_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `payment PaymentRecord @relation(fields: [payment_record_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `actor User @relation(fields: [actor_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `reversal_of PaymentRecordEvent? @relation("PaymentVerificationReversal", fields: [reversal_of_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A36. Certificate — `certificates` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `reference` | `TEXT` | No | `reference String @unique` | P | — |
| `certificate_type` | `TEXT` | No | `certificate_type String` | I | — |
| `issuer_company_id` | `UUID` | No | `issuer_company_id String @db.Uuid` | I | `(issuer_company_id) → companies(id)` |
| `source_document_version_id` | `UUID` | Yes | `source_document_version_id String? @db.Uuid` | P | `(source_document_version_id) → document_versions(id)` |
| `source_property_id` | `UUID` | Yes | `source_property_id String? @db.Uuid` | I | `(source_property_id) → properties(id)` |
| `supersedes_id` | `UUID` | Yes | `supersedes_id String? @unique @db.Uuid` | P | `(supersedes_id) → certificates(id)` |
| `created_by_id` | `UUID` | No | `created_by_id String @db.Uuid` | P | `(created_by_id) → users(id)` |
| `expires_at` | `TIMESTAMP(3)` | Yes | `expires_at DateTime?` | I | — |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@unique([customer_id, created_by_id, idempotency_key], map: "certificates_retry_key")`; `@@index([customer_id, created_at])`; `@@index([source_document_version_id])`; `@@index([source_property_id])`; `@@index([issuer_company_id, created_at])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `issuer Company @relation("CertificateIssuer", fields: [issuer_company_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `customer User @relation("CertificateCustomer", fields: [customer_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `created_by User @relation("CertificateCreator", fields: [created_by_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `source_version DocumentVersion? @relation(fields: [source_document_version_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `source_property Property? @relation(fields: [source_property_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `supersedes Certificate? @relation("CertificateSupersession", fields: [supersedes_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A37. CertificateEvent — `certificate_events` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `certificate_id` | `UUID` | No | `certificate_id String @db.Uuid` | P | `(certificate_id) → certificates(id)` |
| `event_type` | `CertificateEventType` | No | `event_type CertificateEventType` | I | — |
| `actor_user_id` | `UUID` | No | `actor_user_id String @db.Uuid` | P | `(actor_user_id) → users(id)` |
| `replacement_certificate_id` | `UUID` | Yes | `replacement_certificate_id String? @unique @db.Uuid` | P | `(replacement_certificate_id) → certificates(id)` |
| `review_reference` | `TEXT` | No | `review_reference String` | P | — |
| `note` | `TEXT` | Yes | `note String?` | R | — |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@unique([certificate_id, event_type])`; `@@unique([certificate_id, actor_user_id, idempotency_key], map: "certificate_events_retry_key")`; `@@index([certificate_id, created_at])`; `@@index([actor_user_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `certificate Certificate @relation("CertificateEvents", fields: [certificate_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `replacement Certificate? @relation("CertificateEventReplacement", fields: [replacement_certificate_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `actor User @relation(fields: [actor_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A38. VerificationReference — `verification_references` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `token_hash` | `VARCHAR(64)` | No | `token_hash String @unique @db.VarChar(64)` | R | — |
| `user_profile_id` | `UUID` | Yes | `user_profile_id String? @db.Uuid` | I | `(user_profile_id) → user_profiles(id)` |
| `certificate_id` | `UUID` | Yes | `certificate_id String? @db.Uuid` | P | `(certificate_id) → certificates(id)` |
| `enabled` | `BOOLEAN` | No | `enabled Boolean @default(false)` | I | — |
| `disclosure_scope` | `TEXT` | No | `disclosure_scope String @default("NONE")` | I | — |
| `expires_at` | `TIMESTAMP(3)` | Yes | `expires_at DateTime?` | I | — |
| `revoked_at` | `TIMESTAMP(3)` | Yes | `revoked_at DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@index([user_profile_id])`; `@@index([certificate_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `profile UserProfile? @relation(fields: [user_profile_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `certificate Certificate? @relation(fields: [certificate_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A39. ServiceRequest — `service_requests` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `requested_by_id` | `UUID` | No | `requested_by_id String @db.Uuid` | P | `(requested_by_id) → users(id)` |
| `company_id` | `UUID` | No | `company_id String @db.Uuid` | I | `(company_id) → companies(id)`; `(service_id, company_id) → business_services(id, company_id)` |
| `service_id` | `UUID` | No | `service_id String @db.Uuid` | I | `(service_id, company_id) → business_services(id, company_id)` |
| `property_id` | `UUID` | Yes | `property_id String? @db.Uuid` | I | `(property_id) → properties(id)` |
| `reference` | `TEXT` | No | `reference String @unique` | P | — |
| `title` | `TEXT` | No | `title String` | R | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `status` | `ServiceRequestStatus` | No | `status ServiceRequestStatus @default(PENDING)` | I | — |
| `assignee_user_id` | `UUID` | Yes | `assignee_user_id String? @db.Uuid` | P | `(assignee_user_id) → users(id)` |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')")) @updatedAt` | I | — |

**Keys/indexes:** `@@unique([customer_id, requested_by_id, idempotency_key], map: "service_requests_retry_key")`; `@@index([customer_id, status])`; `@@index([company_id, status])`; `@@index([service_id, company_id])`; `@@index([property_id])`; `@@index([assignee_user_id, status])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `assignee User? @relation("ServiceAssignee", fields: [assignee_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `customer User @relation("ServiceCustomer", fields: [customer_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `requested_by User @relation("ServiceRequester", fields: [requested_by_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `company Company @relation(fields: [company_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `service BusinessService @relation(fields: [service_id, company_id], references: [id, company_id], onDelete: Restrict, onUpdate: Restrict)`
- `property Property? @relation(fields: [property_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A40. ServiceRequestEvent — `service_request_events` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `service_request_id` | `UUID` | No | `service_request_id String @db.Uuid` | P | `(service_request_id) → service_requests(id)` |
| `actor_user_id` | `UUID` | No | `actor_user_id String @db.Uuid` | P | `(actor_user_id) → users(id)` |
| `event_type` | `ServiceRequestEventType` | No | `event_type ServiceRequestEventType` | I | — |
| `event_number` | `INTEGER` | No | `event_number Int` | I | — |
| `previous_assignee_user_id` | `UUID` | Yes | `previous_assignee_user_id String? @db.Uuid` | P | `(previous_assignee_user_id) → users(id)` |
| `next_assignee_user_id` | `UUID` | Yes | `next_assignee_user_id String? @db.Uuid` | P | `(next_assignee_user_id) → users(id)` |
| `status` | `ServiceRequestStatus` | No | `status ServiceRequestStatus` | I | — |
| `note` | `TEXT` | Yes | `note String?` | R | — |
| `idempotency_key` | `TEXT` | No | `idempotency_key String` | P | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@unique([service_request_id, event_number], map: "service_request_events_sequence_key")`; `@@unique([service_request_id, actor_user_id, idempotency_key], map: "service_request_events_retry_key")`; `@@index([previous_assignee_user_id])`; `@@index([next_assignee_user_id])`; `@@index([service_request_id, created_at])`; `@@index([actor_user_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `previous_assignee User? @relation("ServicePreviousAssignee", fields: [previous_assignee_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `next_assignee User? @relation("ServiceNextAssignee", fields: [next_assignee_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `request ServiceRequest @relation(fields: [service_request_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `actor User @relation("ServiceEventActor", fields: [actor_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A41. SavedProperty — `saved_properties` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `property_id` | `UUID` | No | `property_id String @db.Uuid` | I | `(property_id) → properties(id)` |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |

**Keys/indexes:** `@@unique([customer_id, property_id])`; `@@index([property_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation(fields: [customer_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `property Property @relation(fields: [property_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A42. ProjectMilestone — `project_milestones` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `project_id` | `UUID` | No | `project_id String @db.Uuid` | I | `(project_id) → projects(id)` |
| `milestone_code` | `TEXT` | No | `milestone_code String` | I | — |
| `title` | `TEXT` | No | `title String` | R | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `status` | `ProjectMilestoneStatus` | No | `status ProjectMilestoneStatus @default(PLANNED)` | I | — |
| `publication_status` | `MilestonePublicationStatus` | No | `publication_status MilestonePublicationStatus @default(DRAFT)` | I | — |
| `published_at` | `TIMESTAMP(3)` | Yes | `published_at DateTime?` | I | — |
| `target_date` | `TIMESTAMP(3)` | Yes | `target_date DateTime?` | I | — |
| `completed_at` | `TIMESTAMP(3)` | Yes | `completed_at DateTime?` | I | — |
| `reviewer_user_id` | `UUID` | Yes | `reviewer_user_id String? @db.Uuid` | P | `(reviewer_user_id) → users(id)` |
| `reviewed_at` | `TIMESTAMP(3)` | Yes | `reviewed_at DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')")) @updatedAt` | I | — |

**Keys/indexes:** `@@unique([project_id, milestone_code])`; `@@index([project_id, status])`; `@@index([project_id, publication_status, published_at], map: "project_milestones_publication_idx")`; `@@index([reviewer_user_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `project Project @relation(fields: [project_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `reviewer User? @relation(fields: [reviewer_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A43. TurnoverCase — `turnover_cases` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `customer_id` | `UUID` | No | `customer_id String @db.Uuid` | P | `(customer_id) → users(id)` |
| `property_id` | `UUID` | No | `property_id String @db.Uuid` | I | `(property_id) → properties(id)` |
| `case_number` | `TEXT` | No | `case_number String @unique` | I | — |
| `status` | `TurnoverCaseStatus` | No | `status TurnoverCaseStatus @default(DRAFT)` | I | — |
| `note` | `TEXT` | Yes | `note String?` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')")) @updatedAt` | I | — |
| `created_by_id` | `UUID` | Yes | `created_by_id String? @db.Uuid` | P | `(created_by_id) → users(id)` |
| `responsible_user_id` | `UUID` | Yes | `responsible_user_id String? @db.Uuid` | P | `(responsible_user_id) → users(id)` |

**Keys/indexes:** `@@index([customer_id, status])`; `@@index([property_id, status])`; `@@index([created_by_id])`; `@@index([responsible_user_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `customer User @relation(fields: [customer_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `property Property @relation(fields: [property_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `created_by User? @relation("TurnoverCreator", fields: [created_by_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `responsible User? @relation("TurnoverResponsible", fields: [responsible_user_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A44. TurnoverChecklistItem — `turnover_checklist_items` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | P | — |
| `turnover_case_id` | `UUID` | No | `turnover_case_id String @db.Uuid` | P | `(turnover_case_id) → turnover_cases(id)` |
| `item_code` | `TEXT` | No | `item_code String` | I | — |
| `label` | `TEXT` | No | `label String` | R | — |
| `sort_order` | `INTEGER` | No | `sort_order Int @default(0)` | I | — |
| `required` | `BOOLEAN` | No | `required Boolean @default(true)` | I | — |
| `completed_at` | `TIMESTAMP(3)` | Yes | `completed_at DateTime?` | I | — |
| `completed_by_id` | `UUID` | Yes | `completed_by_id String? @db.Uuid` | P | `(completed_by_id) → users(id)` |
| `evidence_version_id` | `UUID` | Yes | `evidence_version_id String? @db.Uuid` | P | `(evidence_version_id) → document_versions(id)` |
| `note` | `TEXT` | Yes | `note String?` | R | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')")) @updatedAt` | I | — |

**Keys/indexes:** `@@unique([turnover_case_id, item_code])`; `@@index([turnover_case_id, sort_order])`; `@@index([completed_by_id])`; `@@index([evidence_version_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `evidence DocumentVersion? @relation(fields: [evidence_version_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `turnover_case TurnoverCase @relation(fields: [turnover_case_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `completed_by User? @relation(fields: [completed_by_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

### A45. RewardsBenefit — `rewards_benefits` (new)

| Column | PostgreSQL type | Nullable | Prisma declaration / default | Class | FK participation |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | No | `id String @id @default(uuid()) @db.Uuid` | I | — |
| `company_id` | `UUID` | Yes | `company_id String? @db.Uuid` | I | `(company_id) → companies(id)` |
| `benefit_code` | `TEXT` | No | `benefit_code String @unique` | I | — |
| `title` | `TEXT` | No | `title String` | R | — |
| `description` | `TEXT` | Yes | `description String?` | R | — |
| `active` | `BOOLEAN` | No | `active Boolean @default(false)` | I | — |
| `points_cost` | `DECIMAL(18,2)` | Yes | `points_cost Decimal? @db.Decimal(18, 2)` | R | — |
| `approved_eligibility_terms` | `TEXT` | Yes | `approved_eligibility_terms String?` | R | — |
| `terms_version` | `TEXT` | Yes | `terms_version String?` | R | — |
| `approved_by_id` | `UUID` | Yes | `approved_by_id String? @db.Uuid` | P | `(approved_by_id) → users(id)` |
| `approved_at` | `TIMESTAMP(3)` | Yes | `approved_at DateTime?` | I | — |
| `available_from` | `TIMESTAMP(3)` | Yes | `available_from DateTime?` | I | — |
| `available_until` | `TIMESTAMP(3)` | Yes | `available_until DateTime?` | I | — |
| `created_at` | `TIMESTAMP(3)` | No | `created_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"))` | I | — |
| `updated_at` | `TIMESTAMP(3)` | No | `updated_at DateTime @default(dbgenerated("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')")) @updatedAt` | I | — |

**Keys/indexes:** `@@unique([id, company_id])`; `@@index([company_id, active])`; `@@index([approved_by_id])` Single-column PK/unique keys are marked above.

**Owning-side relations:**

- `company Company? @relation(fields: [company_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`
- `approved_by User? @relation(fields: [approved_by_id], references: [id], onDelete: Restrict, onUpdate: Restrict)`

**Inventory totals:** 45 models; 472 persisted scalar/enum fields; 96 owning-side Prisma relations. Six added existing-table fields are included (one notification field and five redemption fields). The 16 new tables contain 186 scalar/enum columns, including the two optional turnover actor fields.

List note: Prisma required scalar lists do not establish historical PostgreSQL NOT NULL constraints; inspect historical SQL before direct-SQL use. New fields are all non-list scalars/enums.

## Appendix B — Current enum values

| Enum | Values | Approval/source boundary |
| --- | --- | --- |
| `CompanyStatus` | `ACTIVE`, `INACTIVE`, `PREPARED`, `SUSPENDED` | Existing source definition; deployment not inferred |
| `IntegrationStatus` | `NOT_CONFIGURED`, `PREPARED`, `ACTIVE`, `SUSPENDED`, `ERROR` | Existing source definition; deployment not inferred |
| `AccountStatus` | `PENDING`, `ACTIVE`, `DISABLED`, `LOCKED` | Existing source definition; deployment not inferred |
| `VerificationStatus` | `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED` | Existing source definition; deployment not inferred |
| `ProjectStatus` | `PLANNED`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED` | Existing source definition; deployment not inferred |
| `AssetType` | `RESIDENTIAL`, `COMMERCIAL`, `PARKING` | Existing source definition; deployment not inferred |
| `PropertyStatus` | `AVAILABLE`, `HELD`, `RESERVED`, `CONTRACTED`, `SOLD`, `FOR_TURNOVER`, `TURNED_OVER`, `BLOCKED` | Existing source definition; deployment not inferred |
| `ReservationStatus` | `PENDING`, `CONFIRMED`, `EXPIRED`, `CANCELLED`, `CONVERTED` | Existing source definition; deployment not inferred |
| `ReservationEventType` | `CREATED`, `CONFIRMED`, `EXPIRED`, `CANCELLED`, `CONVERTED`, `NOTE` | Existing source definition; deployment not inferred |
| `CustomerPropertyRelationship` | `RESERVEE`, `BUYER`, `CO_BUYER`, `OWNER`, `TENANT`, `AUTHORIZED_REPRESENTATIVE` | Existing source definition; deployment not inferred |
| `RelationshipStatus` | `ACTIVE`, `INACTIVE`, `EXPIRED`, `REVOKED` | Existing source definition; deployment not inferred |
| `ServiceStatus` | `ACTIVE`, `PREPARED`, `COMING_SOON`, `DISABLED` | Existing source definition; deployment not inferred |
| `ConsentType` | `PRIVACY_POLICY`, `TERMS`, `MARKETING`, `COMPANY_SERVICE`, `DATA_SHARING` | Existing source definition; deployment not inferred |
| `RewardsAccountStatus` | `DISABLED`, `ACTIVE`, `SUSPENDED`, `CLOSED` | Existing source definition; deployment not inferred |
| `RewardsTransactionType` | `EARN`, `REDEEM`, `ADJUSTMENT_CREDIT`, `ADJUSTMENT_DEBIT`, `EXPIRY`, `REVERSAL` | Existing source definition; deployment not inferred |
| `RewardsTransactionStatus` | `PENDING`, `APPROVED`, `POSTED`, `REVERSED`, `REJECTED` | Existing source definition; deployment not inferred |
| `RedemptionStatus` | `REQUESTED`, `APPROVED`, `REJECTED`, `FULFILLED`, `CANCELLED` | Existing source definition; deployment not inferred |
| `EventStatus` | `PENDING`, `PROCESSED`, `FAILED` | Existing source definition; deployment not inferred |
| `DocumentStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED` | New engineering proposal; business approval pending |
| `ReviewDecision` | `APPROVED`, `REJECTED` | New engineering proposal; business approval pending |
| `IdentityReviewStatus` | `PENDING`, `APPROVED`, `REJECTED` | New engineering proposal; business approval pending |
| `IdentityReviewKind` | `VERIFICATION`, `CORRECTION` | New engineering proposal; business approval pending |
| `PaymentRecordEventType` | `SUBMITTED`, `VERIFIED`, `REJECTED`, `REVERSED`, `NOTE` | New engineering proposal; business approval pending |
| `CertificateEventType` | `ISSUED`, `REVOKED`, `SUPERSEDED` | New engineering proposal; business approval pending |
| `ServiceRequestStatus` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REJECTED` | New engineering proposal; business approval pending |
| `ServiceRequestEventType` | `CREATED`, `STATUS_CHANGED`, `ASSIGNMENT_CHANGED`, `NOTE` | New engineering proposal; business approval pending |
| `ProjectMilestoneStatus` | `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | New engineering proposal; business approval pending |
| `MilestonePublicationStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` | New engineering proposal; business approval pending |
| `TurnoverCaseStatus` | `DRAFT`, `IN_PROGRESS`, `READY`, `COMPLETED`, `CANCELLED` | New engineering proposal; business approval pending |
