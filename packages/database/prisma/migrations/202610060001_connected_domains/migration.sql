-- Connected-domain foundation: engineering proposals, not business approval.
-- OFFLINE REVIEW ONLY: no target database, role topology or runtime acceptance verified.
-- UUIDs remain Prisma uuid() values (no SQL UUID default), timestamps TIMESTAMP(3).
-- No provider objects, historical migrations, grants to backend roles, policies,
-- default privileges, feature flags or approved identity values change.
-- Reservations gain only a redundant candidate key for the payment-scope FK;
-- existing reservation fields, constraints, indexes and workflows are retained.
-- All new enum/lifecycle values are engineering proposals pending approval, never
-- product authorization. Issuer authority and assignee authorization remain API gates.
-- Runtime is BLOCKED pending an explicit role/ownership/RLS and API permission decision.
-- Non-owner roles have no policies; owner/superuser bypass of RLS is not authorization.
-- Append-only triggers have no caller/owner/session-setting bypass. Controlled
-- maintenance requires separately authorized ALTER; do not grant runtime DDL.
BEGIN;
-- The generated, quoted DDL below targets public, matching all prior migrations.
SET LOCAL search_path = public;

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IdentityReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IdentityReviewKind" AS ENUM ('VERIFICATION', 'CORRECTION');

-- CreateEnum
CREATE TYPE "PaymentRecordEventType" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED', 'REVERSED', 'NOTE');

-- CreateEnum
CREATE TYPE "CertificateEventType" AS ENUM ('ISSUED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceRequestEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNMENT_CHANGED', 'NOTE');

-- CreateEnum
CREATE TYPE "ProjectMilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestonePublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TurnoverCaseStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "read_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rewards_redemptions" ADD COLUMN     "accepted_points_cost" DECIMAL(18,2),
ADD COLUMN     "accepted_terms_snapshot" TEXT,
ADD COLUMN     "benefit_company_id" UUID,
ADD COLUMN     "benefit_id" UUID,
ADD COLUMN     "original_debit_id" UUID;

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "property_id" UUID,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "storage_object" TEXT NOT NULL,
    "checksum_sha256" VARCHAR(64) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_reviews" (
    "id" UUID NOT NULL,
    "document_version_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "review_reference" TEXT NOT NULL,
    "note" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "document_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_review_requests" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "kind" "IdentityReviewKind" NOT NULL DEFAULT 'VERIFICATION',
    "status" "IdentityReviewStatus" NOT NULL DEFAULT 'PENDING',
    "evidence_version_id" UUID,
    "reason" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "requested_first_name" TEXT,
    "requested_middle_name" TEXT,
    "requested_last_name" TEXT,
    "requested_suffix" TEXT,
    "requested_birth_date" TIMESTAMP(3),
    "requested_nationality" TEXT,
    "requested_address_line" TEXT,
    "requested_barangay" TEXT,
    "requested_city" TEXT,
    "requested_province" TEXT,
    "requested_postal_code" TEXT,
    "requested_country" TEXT,
    "reviewer_user_id" UUID,
    "review_reference" TEXT,
    "decision_note" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "identity_review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "reservation_id" UUID,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "evidence_version_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_record_events" (
    "id" UUID NOT NULL,
    "payment_record_id" UUID NOT NULL,
    "event_type" "PaymentRecordEventType" NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "review_reference" TEXT,
    "note" TEXT,
    "reversal_of_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "payment_record_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "certificate_type" TEXT NOT NULL,
    "issuer_company_id" UUID NOT NULL,
    "source_document_version_id" UUID,
    "source_property_id" UUID,
    "supersedes_id" UUID,
    "created_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3),
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_events" (
    "id" UUID NOT NULL,
    "certificate_id" UUID NOT NULL,
    "event_type" "CertificateEventType" NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "replacement_certificate_id" UUID,
    "review_reference" TEXT NOT NULL,
    "note" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "certificate_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_references" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_profile_id" UUID,
    "certificate_id" UUID,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "disclosure_scope" TEXT NOT NULL DEFAULT 'NONE',
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "verification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "property_id" UUID,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "assignee_user_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_request_events" (
    "id" UUID NOT NULL,
    "service_request_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "event_type" "ServiceRequestEventType" NOT NULL,
    "event_number" INTEGER NOT NULL,
    "previous_assignee_user_id" UUID,
    "next_assignee_user_id" UUID,
    "status" "ServiceRequestStatus" NOT NULL,
    "note" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "service_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_properties" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "saved_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_milestones" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "milestone_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "publication_status" "MilestonePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "target_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "reviewer_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnover_cases" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "case_number" TEXT NOT NULL,
    "status" "TurnoverCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "created_by_id" UUID,
    "responsible_user_id" UUID,

    CONSTRAINT "turnover_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnover_checklist_items" (
    "id" UUID NOT NULL,
    "turnover_case_id" UUID NOT NULL,
    "item_code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" UUID,
    "evidence_version_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "turnover_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards_benefits" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "benefit_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "points_cost" DECIMAL(18,2),
    "approved_eligibility_terms" TEXT,
    "terms_version" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "available_from" TIMESTAMP(3),
    "available_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "rewards_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_customer_id_status_idx" ON "documents"("customer_id", "status");

-- CreateIndex
CREATE INDEX "documents_property_id_idx" ON "documents"("property_id");

-- CreateIndex
CREATE INDEX "document_versions_uploaded_by_id_idx" ON "document_versions"("uploaded_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "document_versions"("document_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_storage_bucket_storage_object_key" ON "document_versions"("storage_bucket", "storage_object");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_retry_key" ON "document_versions"("document_id", "uploaded_by_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "document_reviews_document_version_id_decided_at_idx" ON "document_reviews"("document_version_id", "decided_at");

-- CreateIndex
CREATE INDEX "document_reviews_reviewer_user_id_idx" ON "document_reviews"("reviewer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_reviews_retry_key" ON "document_reviews"("document_version_id", "reviewer_user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "identity_review_requests_customer_id_status_idx" ON "identity_review_requests"("customer_id", "status");

-- CreateIndex
CREATE INDEX "identity_review_requests_reviewer_user_id_status_idx" ON "identity_review_requests"("reviewer_user_id", "status");

-- CreateIndex
CREATE INDEX "identity_review_requests_evidence_version_id_idx" ON "identity_review_requests"("evidence_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "identity_review_requests_retry_key" ON "identity_review_requests"("customer_id", "requested_by_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "payment_records_customer_id_submitted_at_idx" ON "payment_records"("customer_id", "submitted_at");

-- CreateIndex
CREATE INDEX "payment_records_property_id_idx" ON "payment_records"("property_id");

-- CreateIndex
CREATE INDEX "payment_records_reference_idx" ON "payment_records"("reference");

-- CreateIndex
CREATE INDEX "payment_records_evidence_version_id_idx" ON "payment_records"("evidence_version_id");

-- CreateIndex
CREATE INDEX "payment_records_reservation_scope_idx" ON "payment_records"("reservation_id", "customer_id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_retry_key" ON "payment_records"("customer_id", "submitted_by_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_record_events_reversal_of_id_key" ON "payment_record_events"("reversal_of_id");

-- CreateIndex
CREATE INDEX "payment_record_events_payment_record_id_created_at_idx" ON "payment_record_events"("payment_record_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_record_events_actor_user_id_idx" ON "payment_record_events"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_record_events_retry_key" ON "payment_record_events"("payment_record_id", "actor_user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_reference_key" ON "certificates"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_supersedes_id_key" ON "certificates"("supersedes_id");

-- CreateIndex
CREATE INDEX "certificates_customer_id_created_at_idx" ON "certificates"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "certificates_source_document_version_id_idx" ON "certificates"("source_document_version_id");

-- CreateIndex
CREATE INDEX "certificates_source_property_id_idx" ON "certificates"("source_property_id");

-- CreateIndex
CREATE INDEX "certificates_issuer_company_id_created_at_idx" ON "certificates"("issuer_company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_retry_key" ON "certificates"("customer_id", "created_by_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_events_replacement_certificate_id_key" ON "certificate_events"("replacement_certificate_id");

-- CreateIndex
CREATE INDEX "certificate_events_certificate_id_created_at_idx" ON "certificate_events"("certificate_id", "created_at");

-- CreateIndex
CREATE INDEX "certificate_events_actor_user_id_idx" ON "certificate_events"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_events_certificate_id_event_type_key" ON "certificate_events"("certificate_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_events_retry_key" ON "certificate_events"("certificate_id", "actor_user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "verification_references_token_hash_key" ON "verification_references"("token_hash");

-- CreateIndex
CREATE INDEX "verification_references_user_profile_id_idx" ON "verification_references"("user_profile_id");

-- CreateIndex
CREATE INDEX "verification_references_certificate_id_idx" ON "verification_references"("certificate_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_reference_key" ON "service_requests"("reference");

-- CreateIndex
CREATE INDEX "service_requests_customer_id_status_idx" ON "service_requests"("customer_id", "status");

-- CreateIndex
CREATE INDEX "service_requests_company_id_status_idx" ON "service_requests"("company_id", "status");

-- CreateIndex
CREATE INDEX "service_requests_service_id_company_id_idx" ON "service_requests"("service_id", "company_id");

-- CreateIndex
CREATE INDEX "service_requests_property_id_idx" ON "service_requests"("property_id");

-- CreateIndex
CREATE INDEX "service_requests_assignee_user_id_status_idx" ON "service_requests"("assignee_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_retry_key" ON "service_requests"("customer_id", "requested_by_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "service_request_events_previous_assignee_user_id_idx" ON "service_request_events"("previous_assignee_user_id");

-- CreateIndex
CREATE INDEX "service_request_events_next_assignee_user_id_idx" ON "service_request_events"("next_assignee_user_id");

-- CreateIndex
CREATE INDEX "service_request_events_service_request_id_created_at_idx" ON "service_request_events"("service_request_id", "created_at");

-- CreateIndex
CREATE INDEX "service_request_events_actor_user_id_idx" ON "service_request_events"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_request_events_sequence_key" ON "service_request_events"("service_request_id", "event_number");

-- CreateIndex
CREATE UNIQUE INDEX "service_request_events_retry_key" ON "service_request_events"("service_request_id", "actor_user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "saved_properties_property_id_idx" ON "saved_properties"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_properties_customer_id_property_id_key" ON "saved_properties"("customer_id", "property_id");

-- CreateIndex
CREATE INDEX "project_milestones_project_id_status_idx" ON "project_milestones"("project_id", "status");

-- CreateIndex
CREATE INDEX "project_milestones_publication_idx" ON "project_milestones"("project_id", "publication_status", "published_at");

-- CreateIndex
CREATE INDEX "project_milestones_reviewer_user_id_idx" ON "project_milestones"("reviewer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_milestones_project_id_milestone_code_key" ON "project_milestones"("project_id", "milestone_code");

-- CreateIndex
CREATE UNIQUE INDEX "turnover_cases_case_number_key" ON "turnover_cases"("case_number");

-- CreateIndex
CREATE INDEX "turnover_cases_customer_id_status_idx" ON "turnover_cases"("customer_id", "status");

-- CreateIndex
CREATE INDEX "turnover_cases_property_id_status_idx" ON "turnover_cases"("property_id", "status");

-- CreateIndex
CREATE INDEX "turnover_cases_created_by_id_idx" ON "turnover_cases"("created_by_id");

-- CreateIndex
CREATE INDEX "turnover_cases_responsible_user_id_idx" ON "turnover_cases"("responsible_user_id");

-- CreateIndex
CREATE INDEX "turnover_checklist_items_turnover_case_id_sort_order_idx" ON "turnover_checklist_items"("turnover_case_id", "sort_order");

-- CreateIndex
CREATE INDEX "turnover_checklist_items_completed_by_id_idx" ON "turnover_checklist_items"("completed_by_id");

-- CreateIndex
CREATE INDEX "turnover_checklist_items_evidence_version_id_idx" ON "turnover_checklist_items"("evidence_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "turnover_checklist_items_turnover_case_id_item_code_key" ON "turnover_checklist_items"("turnover_case_id", "item_code");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_benefits_benefit_code_key" ON "rewards_benefits"("benefit_code");

-- CreateIndex
CREATE INDEX "rewards_benefits_company_id_active_idx" ON "rewards_benefits"("company_id", "active");

-- CreateIndex
CREATE INDEX "rewards_benefits_approved_by_id_idx" ON "rewards_benefits"("approved_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_benefits_id_company_id_key" ON "rewards_benefits"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_id_customer_property_key" ON "reservations"("id", "customer_id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_services_id_company_id_key" ON "business_services"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_accounts_id_company_id_key" ON "rewards_accounts"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_redemptions_original_debit_id_key" ON "rewards_redemptions"("original_debit_id");

-- CreateIndex
CREATE INDEX "rewards_redemptions_scoped_account_idx" ON "rewards_redemptions"("rewards_account_id", "benefit_company_id");

-- CreateIndex
CREATE INDEX "rewards_redemptions_benefit_id_idx" ON "rewards_redemptions"("benefit_id");

-- AddForeignKey
ALTER TABLE "rewards_redemptions" ADD CONSTRAINT "rewards_redemptions_scoped_account_fkey" FOREIGN KEY ("rewards_account_id", "benefit_company_id") REFERENCES "rewards_accounts"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "rewards_redemptions" ADD CONSTRAINT "rewards_redemptions_scoped_benefit_fkey" FOREIGN KEY ("benefit_id", "benefit_company_id") REFERENCES "rewards_benefits"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "rewards_redemptions" ADD CONSTRAINT "rewards_redemptions_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "rewards_benefits"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "rewards_redemptions" ADD CONSTRAINT "rewards_redemptions_original_debit_id_fkey" FOREIGN KEY ("original_debit_id") REFERENCES "rewards_transactions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_review_requests" ADD CONSTRAINT "identity_review_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_review_requests" ADD CONSTRAINT "identity_review_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_review_requests" ADD CONSTRAINT "identity_review_requests_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_review_requests" ADD CONSTRAINT "identity_review_requests_evidence_version_id_fkey" FOREIGN KEY ("evidence_version_id") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_evidence_version_id_fkey" FOREIGN KEY ("evidence_version_id") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_reservation_scope_fkey" FOREIGN KEY ("reservation_id", "customer_id", "property_id") REFERENCES "reservations"("id", "customer_id", "property_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_record_events" ADD CONSTRAINT "payment_record_events_payment_record_id_fkey" FOREIGN KEY ("payment_record_id") REFERENCES "payment_records"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_record_events" ADD CONSTRAINT "payment_record_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_record_events" ADD CONSTRAINT "payment_record_events_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "payment_record_events"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuer_company_id_fkey" FOREIGN KEY ("issuer_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_source_document_version_id_fkey" FOREIGN KEY ("source_document_version_id") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_source_property_id_fkey" FOREIGN KEY ("source_property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificate_events" ADD CONSTRAINT "certificate_events_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificate_events" ADD CONSTRAINT "certificate_events_replacement_certificate_id_fkey" FOREIGN KEY ("replacement_certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "certificate_events" ADD CONSTRAINT "certificate_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "verification_references" ADD CONSTRAINT "verification_references_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "verification_references" ADD CONSTRAINT "verification_references_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_company_id_fkey" FOREIGN KEY ("service_id", "company_id") REFERENCES "business_services"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_previous_assignee_user_id_fkey" FOREIGN KEY ("previous_assignee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_next_assignee_user_id_fkey" FOREIGN KEY ("next_assignee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "turnover_cases" ADD CONSTRAINT "turnover_cases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "turnover_cases" ADD CONSTRAINT "turnover_cases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "turnover_cases" ADD CONSTRAINT "turnover_cases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "turnover_cases" ADD CONSTRAINT "turnover_cases_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "turnover_checklist_items" ADD CONSTRAINT "turnover_checklist_items_evidence_version_id_fkey" FOREIGN KEY ("evidence_version_id") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "turnover_checklist_items" ADD CONSTRAINT "turnover_checklist_items_turnover_case_id_fkey" FOREIGN KEY ("turnover_case_id") REFERENCES "turnover_cases"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "turnover_checklist_items" ADD CONSTRAINT "turnover_checklist_items_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "rewards_benefits" ADD CONSTRAINT "rewards_benefits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "rewards_benefits" ADD CONSTRAINT "rewards_benefits_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- SQL-only invariants: Prisma 5.22 does not model CHECKs, partial indexes or triggers.
ALTER TABLE public.documents
  ADD CONSTRAINT documents_text_check CHECK (length(btrim(title)) BETWEEN 1 AND 240 AND length(btrim(category)) BETWEEN 1 AND 80);
ALTER TABLE public.document_versions
  ADD CONSTRAINT document_versions_positive_check CHECK (version_number > 0 AND size_bytes > 0),
  ADD CONSTRAINT document_versions_checksum_check CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT document_versions_storage_check CHECK (
    storage_bucket ~ '^[a-z0-9][a-z0-9._-]{0,62}$'
    AND storage_object ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,1023}$'
    AND storage_object !~ '(^|/)\.{1,2}(/|$)' AND storage_object !~ '//|/$'),
  ADD CONSTRAINT document_versions_mime_check CHECK (length(mime_type) <= 127 AND mime_type ~ '^[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]*$');
ALTER TABLE public.identity_review_requests
  ADD CONSTRAINT identity_review_requests_reason_check CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  ADD CONSTRAINT identity_review_requests_self_review_check CHECK (reviewer_user_id IS NULL OR (reviewer_user_id <> customer_id AND reviewer_user_id <> requested_by_id)),
  ADD CONSTRAINT identity_review_requests_decision_check CHECK (
    (status = 'PENDING' AND reviewer_user_id IS NULL AND decided_at IS NULL AND review_reference IS NULL AND decision_note IS NULL)
    OR (status IN ('APPROVED', 'REJECTED') AND reviewer_user_id IS NOT NULL AND decided_at IS NOT NULL AND decided_at >= created_at AND decided_at <= updated_at AND review_reference IS NOT NULL)),
  ADD CONSTRAINT identity_review_requests_birth_date_check CHECK (requested_birth_date IS NULL OR requested_birth_date <= created_at),
  ADD CONSTRAINT identity_review_requests_correction_check CHECK (
    (kind = 'CORRECTION') = (num_nonnulls(requested_first_name, requested_middle_name, requested_last_name, requested_suffix, requested_birth_date, requested_nationality, requested_address_line, requested_barangay, requested_city, requested_province, requested_postal_code, requested_country) > 0));
ALTER TABLE public.payment_records
  ADD CONSTRAINT payment_records_amount_check CHECK (amount > 0 AND amount <> 'NaN'::numeric AND currency = 'PHP'),
  ADD CONSTRAINT payment_records_description_check CHECK (length(btrim(description)) BETWEEN 1 AND 2000),
  ADD CONSTRAINT payment_records_paid_at_check CHECK (paid_at IS NULL OR paid_at <= submitted_at);
ALTER TABLE public.payment_record_events
  ADD CONSTRAINT payment_record_events_reversal_check CHECK ((event_type = 'REVERSED') = (reversal_of_id IS NOT NULL) AND reversal_of_id IS DISTINCT FROM id),
  ADD CONSTRAINT payment_record_events_review_check CHECK (event_type NOT IN ('VERIFIED', 'REJECTED', 'REVERSED') OR review_reference IS NOT NULL);
-- Proposal: one terminal review per submission. Reversal does not rewrite/reopen it;
-- a corrected submission is a new PaymentRecord. These are not settlement events.
CREATE UNIQUE INDEX payment_record_events_one_review_key ON public.payment_record_events(payment_record_id) WHERE event_type IN ('VERIFIED', 'REJECTED');
CREATE UNIQUE INDEX payment_record_events_one_submission_key ON public.payment_record_events(payment_record_id) WHERE event_type = 'SUBMITTED';
ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_source_check CHECK (num_nonnulls(source_document_version_id, source_property_id) = 1),
  ADD CONSTRAINT certificates_supersedes_check CHECK (supersedes_id IS DISTINCT FROM id),
  ADD CONSTRAINT certificates_type_check CHECK (certificate_type ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  ADD CONSTRAINT certificates_expiry_check CHECK (expires_at IS NULL OR expires_at > created_at);
ALTER TABLE public.certificate_events
  ADD CONSTRAINT certificate_events_replacement_check CHECK ((event_type = 'SUPERSEDED') = (replacement_certificate_id IS NOT NULL) AND replacement_certificate_id IS DISTINCT FROM certificate_id);
CREATE UNIQUE INDEX certificate_events_one_terminal_key ON public.certificate_events(certificate_id) WHERE event_type IN ('REVOKED', 'SUPERSEDED');
ALTER TABLE public.verification_references
  ADD CONSTRAINT verification_references_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT verification_references_target_check CHECK (num_nonnulls(user_profile_id, certificate_id) = 1),
  ADD CONSTRAINT verification_references_inactive_check CHECK (NOT enabled AND disclosure_scope = 'NONE'),
  ADD CONSTRAINT verification_references_dates_check CHECK ((expires_at IS NULL OR expires_at > created_at) AND (revoked_at IS NULL OR revoked_at >= created_at));
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_title_check CHECK (length(btrim(title)) BETWEEN 1 AND 240);
ALTER TABLE public.service_request_events
  ADD CONSTRAINT service_request_events_number_check CHECK (event_number > 0),
  ADD CONSTRAINT service_request_events_assignment_check CHECK (
    (event_type = 'CREATED' AND event_number = 1 AND previous_assignee_user_id IS NULL)
    OR (event_type = 'ASSIGNMENT_CHANGED' AND event_number > 1 AND previous_assignee_user_id IS DISTINCT FROM next_assignee_user_id)
    OR (event_type IN ('STATUS_CHANGED', 'NOTE') AND event_number > 1 AND previous_assignee_user_id IS NOT DISTINCT FROM next_assignee_user_id)),
  ADD CONSTRAINT service_request_events_note_check CHECK (event_type <> 'NOTE' OR (note IS NOT NULL AND length(btrim(note)) > 0));
ALTER TABLE public.project_milestones
  ADD CONSTRAINT project_milestones_title_check CHECK (length(btrim(title)) BETWEEN 1 AND 240),
  ADD CONSTRAINT project_milestones_review_check CHECK ((reviewer_user_id IS NULL) = (reviewed_at IS NULL) AND (reviewed_at IS NULL OR (reviewed_at >= created_at AND reviewed_at <= updated_at))),
  ADD CONSTRAINT project_milestones_completion_check CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL) AND (completed_at IS NULL OR (completed_at >= created_at AND reviewed_at IS NOT NULL AND reviewed_at >= completed_at))),
  ADD CONSTRAINT project_milestones_publication_check CHECK (
    (publication_status = 'DRAFT' AND published_at IS NULL)
    OR (publication_status IN ('PUBLISHED', 'ARCHIVED') AND published_at IS NOT NULL AND reviewed_at IS NOT NULL AND published_at >= reviewed_at AND published_at <= updated_at));
-- Turnover defaults to DRAFT without a DRAFT-only constraint. Multiple cases per
-- customer/property remain possible. Enum values do not approve a live workflow.
ALTER TABLE public.turnover_checklist_items
  ADD CONSTRAINT turnover_checklist_items_text_check CHECK (length(btrim(label)) BETWEEN 1 AND 240 AND sort_order >= 0),
  ADD CONSTRAINT turnover_checklist_items_completion_check CHECK ((completed_at IS NULL) = (completed_by_id IS NULL) AND (completed_at IS NULL OR (completed_at >= created_at AND completed_at <= updated_at)));
ALTER TABLE public.rewards_benefits
  ADD CONSTRAINT rewards_benefits_inactive_check CHECK (NOT active),
  ADD CONSTRAINT rewards_benefits_title_check CHECK (length(btrim(title)) BETWEEN 1 AND 240),
  ADD CONSTRAINT rewards_benefits_cost_check CHECK (points_cost IS NULL OR (points_cost > 0 AND points_cost <> 'NaN'::numeric)),
  ADD CONSTRAINT rewards_benefits_approval_check CHECK (
    num_nonnulls(approved_eligibility_terms, terms_version, approved_by_id, approved_at) = 0
    OR (num_nonnulls(approved_eligibility_terms, terms_version, approved_by_id, approved_at) = 4 AND length(btrim(approved_eligibility_terms)) > 0 AND length(btrim(terms_version)) BETWEEN 1 AND 120 AND approved_at >= created_at AND approved_at <= updated_at)),
  ADD CONSTRAINT rewards_benefits_dates_check CHECK (available_until IS NULL OR (available_from IS NOT NULL AND available_until > available_from));
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_read_at_check CHECK (read_at IS NULL OR read_at >= created_at);
-- All-NULL legacy extensions pass. No legacy cost, terms, benefit or debit is inferred.
ALTER TABLE public.rewards_redemptions
  ADD CONSTRAINT rewards_redemptions_benefit_snapshot_check CHECK (
    (benefit_id IS NULL AND benefit_company_id IS NULL AND accepted_points_cost IS NULL AND accepted_terms_snapshot IS NULL AND original_debit_id IS NULL)
    OR (benefit_id IS NOT NULL AND accepted_points_cost IS NOT NULL AND accepted_points_cost > 0 AND accepted_points_cost <> 'NaN'::numeric AND accepted_points_cost = amount AND accepted_terms_snapshot IS NOT NULL AND length(btrim(accepted_terms_snapshot)) > 0));

-- Uniform opaque retry/reference syntax, explicitly scoped by the unique indexes.
-- NULL remains allowed only where the Prisma field is optional.
DO $connected_input_checks$
DECLARE
  item record;
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['documents','identity_review_requests','service_requests','project_milestones','turnover_cases','turnover_checklist_items','rewards_benefits'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (updated_at >= created_at)', table_name, table_name || '_updated_at_check');
  END LOOP;
  FOR item IN SELECT * FROM (VALUES
    ('document_versions', 'idempotency_key'), ('document_reviews', 'idempotency_key'),
    ('document_reviews', 'review_reference'), ('identity_review_requests', 'idempotency_key'),
    ('identity_review_requests', 'review_reference'), ('payment_records', 'idempotency_key'),
    ('payment_records', 'reference'), ('payment_record_events', 'idempotency_key'),
    ('payment_record_events', 'review_reference'), ('certificates', 'reference'),
    ('certificates', 'idempotency_key'), ('certificate_events', 'idempotency_key'),
    ('certificate_events', 'review_reference'), ('service_requests', 'reference'),
    ('service_requests', 'idempotency_key'), ('service_request_events', 'idempotency_key'),
    ('project_milestones', 'milestone_code'), ('turnover_cases', 'case_number'),
    ('turnover_checklist_items', 'item_code'), ('rewards_benefits', 'benefit_code')
  ) AS inputs(table_name, column_name) LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I ~ %L)',
      item.table_name, item.table_name || '_' || item.column_name || '_check',
      item.column_name, '^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$');
  END LOOP;
  FOR item IN SELECT * FROM (VALUES
    ('requested_first_name'), ('requested_middle_name'), ('requested_last_name'),
    ('requested_suffix'), ('requested_nationality'), ('requested_address_line'),
    ('requested_barangay'), ('requested_city'), ('requested_province'),
    ('requested_postal_code'), ('requested_country')
  ) AS corrections(column_name) LOOP
    EXECUTE format('ALTER TABLE public.identity_review_requests ADD CONSTRAINT %I CHECK (%I IS NULL OR length(btrim(%I)) BETWEEN 1 AND 500)',
      'identity_' || item.column_name || '_check', item.column_name, item.column_name);
  END LOOP;
END
$connected_input_checks$;

-- UTC is explicit, independent of the session timezone. New factual defaults use
-- UTC transaction time (not wall time) to retain same-transaction evidence/request
-- chronology. Supplied created/submitted/decided timestamps are NOT overwritten;
-- guards still validate them. Only new-table updated_at is always DB-managed.
-- Due/target/expiry/availability dates are deliberately excluded from future checks.
CREATE FUNCTION public.connected_normalize_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
BEGIN
  NEW.updated_at := (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3);
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.connected_normalize_updated_at() FROM PUBLIC;

CREATE FUNCTION public.connected_notification_read_time() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
BEGIN
  IF NEW.read_at IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.read_at := (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3);
    ELSIF NEW.read_at IS DISTINCT FROM OLD.read_at THEN
      NEW.read_at := (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3);
    END IF;
  END IF;
  -- No changes to created_at, sent_at, unchanged read_at, or existing defaults.
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.connected_notification_read_time() FROM PUBLIC;
CREATE FUNCTION public.connected_recorded_time() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  column_name text;
  value timestamp(3);
BEGIN
  FOREACH column_name IN ARRAY TG_ARGV LOOP
    value := (to_jsonb(NEW) ->> column_name)::timestamp(3);
    IF value > (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3) THEN
      RAISE EXCEPTION 'Factual timestamp %.% cannot be in the future', TG_TABLE_NAME, column_name USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.connected_recorded_time() FROM PUBLIC;

CREATE FUNCTION public.connected_reject_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
BEGIN
  RAISE EXCEPTION '% is append-only; % is prohibited', TG_TABLE_NAME, TG_OP USING ERRCODE = '23514';
END
$function$;
REVOKE ALL ON FUNCTION public.connected_reject_mutation() FROM PUBLIC;

-- Freeze contextual identity even on mutable headers; otherwise immutable evidence
-- could acquire a different customer/property merely by reparenting its header.
CREATE FUNCTION public.connected_freeze_columns() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  column_name text;
BEGIN
  FOREACH column_name IN ARRAY TG_ARGV LOOP
    IF (to_jsonb(NEW) -> column_name) IS DISTINCT FROM (to_jsonb(OLD) -> column_name) THEN
      RAISE EXCEPTION 'Immutable %.% cannot change', TG_TABLE_NAME, column_name USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.connected_freeze_columns() FROM PUBLIC;

CREATE FUNCTION public.connected_check_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  evidence_id uuid;
  evidence record;
  predecessor record;
  reservation_created_at timestamp(3);
BEGIN
  IF TG_TABLE_NAME = 'document_versions' THEN
    SELECT d.created_at INTO evidence FROM public.documents AS d WHERE d.id = NEW.document_id;
    IF NOT FOUND OR NEW.created_at < evidence.created_at THEN
      RAISE EXCEPTION 'Document version requires a visible parent and valid creation time' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'document_reviews' THEN
    evidence_id := NEW.document_version_id;
  ELSIF TG_TABLE_NAME IN ('identity_review_requests', 'payment_records') THEN
    evidence_id := NEW.evidence_version_id;
  ELSIF TG_TABLE_NAME = 'certificates' THEN
    evidence_id := NEW.source_document_version_id;
  END IF;

  IF evidence_id IS NOT NULL THEN
    SELECT v.uploaded_by_id, v.created_at, d.customer_id, d.property_id INTO evidence
      FROM public.document_versions AS v JOIN public.documents AS d ON d.id = v.document_id
     WHERE v.id = evidence_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Evidence version is missing or not visible' USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'document_reviews' THEN
      IF NEW.reviewer_user_id IN (evidence.customer_id, evidence.uploaded_by_id) OR NEW.decided_at < evidence.created_at THEN
        RAISE EXCEPTION 'Document review cannot self-review or predate its version' USING ERRCODE = '23514';
      END IF;
    ELSE
      IF NEW.customer_id <> evidence.customer_id THEN
        RAISE EXCEPTION 'Evidence must belong to the same customer' USING ERRCODE = '23514';
      END IF;
      IF TG_TABLE_NAME = 'payment_records' THEN
        IF (evidence.property_id IS NOT NULL AND NEW.property_id <> evidence.property_id) OR NEW.submitted_at < evidence.created_at THEN
          RAISE EXCEPTION 'Payment evidence property/time mismatch' USING ERRCODE = '23514';
        END IF;
      ELSIF NEW.created_at < evidence.created_at THEN
        RAISE EXCEPTION 'Record cannot predate its evidence' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'payment_records' THEN
    IF NEW.reservation_id IS NOT NULL THEN
      SELECT r.created_at INTO reservation_created_at FROM public.reservations AS r WHERE r.id = NEW.reservation_id FOR SHARE;
      IF NOT FOUND OR NEW.submitted_at < reservation_created_at THEN
        RAISE EXCEPTION 'Payment cannot predate its linked reservation' USING ERRCODE = '23514';
      END IF;
      -- The composite FK enforces customer/property equality on both child writes
      -- AND later reservation key updates, without relying on RLS visibility.
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'certificates' THEN
    -- issuer_company_id is a real FK, not a claim of legal authority over source.
    -- The future issuing service must authorize creator + issuer + source scope.
    IF NEW.supersedes_id IS NOT NULL THEN
      SELECT c.customer_id, c.certificate_type, c.issuer_company_id, c.created_at, c.source_property_id, c.source_document_version_id INTO predecessor
        FROM public.certificates AS c WHERE c.id = NEW.supersedes_id;
      IF NOT FOUND OR predecessor.customer_id <> NEW.customer_id OR predecessor.certificate_type <> NEW.certificate_type OR predecessor.issuer_company_id <> NEW.issuer_company_id OR predecessor.created_at > NEW.created_at THEN
        RAISE EXCEPTION 'Certificate supersession requires a prior same-customer/type/issuer certificate' USING ERRCODE = '23514';
      END IF;
      -- Conservative proposal until the owner approves cross-source replacement:
      -- identical property, or versions of the same logical document; never a
      -- property/document source-kind change. Version rows are immutable.
      IF NEW.source_property_id IS NOT NULL THEN
        IF NEW.source_property_id IS DISTINCT FROM predecessor.source_property_id THEN
          RAISE EXCEPTION 'Supersession must retain the same source property' USING ERRCODE = '23514';
        END IF;
      ELSIF predecessor.source_document_version_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.document_versions AS old_version
        JOIN public.document_versions AS new_version ON new_version.document_id = old_version.document_id
        WHERE old_version.id = predecessor.source_document_version_id AND new_version.id = NEW.source_document_version_id
      ) THEN
        RAISE EXCEPTION 'Supersession must retain the same logical document and source kind' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.connected_check_evidence() FROM PUBLIC;

CREATE FUNCTION public.connected_identity_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Identity requests must be retained' USING ERRCODE = '23514';
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PENDING' THEN
      RAISE EXCEPTION 'Identity requests must start pending' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF OLD.status <> 'PENDING' THEN
      RAISE EXCEPTION 'Decided identity requests are immutable' USING ERRCODE = '23514';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['status','reviewer_user_id','review_reference','decision_note','decided_at','updated_at'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','reviewer_user_id','review_reference','decision_note','decided_at','updated_at']) THEN
      RAISE EXCEPTION 'Submitted identity request fields are immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.connected_identity_transition() FROM PUBLIC;

CREATE FUNCTION public.connected_payment_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  payment record;
  original record;
BEGIN
  -- Serialize event validation on the parent; unique indexes arbitrate retries
  -- and terminal-review conflicts even for concurrent transactions.
  SELECT p.customer_id, p.submitted_by_id, p.submitted_at INTO payment
    FROM public.payment_records AS p WHERE p.id = NEW.payment_record_id FOR UPDATE;
  IF NOT FOUND OR NEW.created_at < payment.submitted_at THEN
    RAISE EXCEPTION 'Payment event parent/time mismatch' USING ERRCODE = '23514';
  END IF;
  IF NEW.event_type IN ('VERIFIED', 'REJECTED', 'REVERSED') AND NEW.actor_user_id IN (payment.customer_id, payment.submitted_by_id) THEN
    RAISE EXCEPTION 'Payment cannot be self-reviewed' USING ERRCODE = '23514';
  END IF;
  IF NEW.event_type = 'SUBMITTED' AND (NEW.actor_user_id <> payment.submitted_by_id OR NEW.created_at <> payment.submitted_at) THEN
    RAISE EXCEPTION 'Submission event must match the submitted actor and timestamp' USING ERRCODE = '23514';
  END IF;
  IF NEW.event_type = 'REVERSED' THEN
    SELECT e.payment_record_id, e.event_type, e.created_at INTO original
      FROM public.payment_record_events AS e WHERE e.id = NEW.reversal_of_id;
    IF NOT FOUND OR original.payment_record_id <> NEW.payment_record_id OR original.event_type <> 'VERIFIED' OR NEW.created_at < original.created_at THEN
      RAISE EXCEPTION 'Reversal must target the original verification of this payment' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.connected_payment_event() FROM PUBLIC;

CREATE FUNCTION public.connected_certificate_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  certificate record;
  replacement record;
  issued_at timestamp(3);
BEGIN
  IF current_setting('transaction_isolation') <> 'serializable' THEN
    RAISE EXCEPTION 'Certificate lifecycle writes require SERIALIZABLE with retry handling' USING ERRCODE = '25000';
  END IF;
  -- Locks alone cannot refresh REPEATABLE READ snapshots. SERIALIZABLE is mandatory
  -- for lifecycle events, including issuance, not just supersession/revocation.
  -- Lock both certificates in stable UUID order for supersession/revocation races.
  PERFORM c.id FROM public.certificates AS c
   WHERE c.id = NEW.certificate_id OR c.id = NEW.replacement_certificate_id
   ORDER BY c.id FOR UPDATE;
  IF row_security_active('public.certificate_events'::regclass) THEN
    RAISE EXCEPTION 'Cannot safely validate lifecycle with filtered certificate history' USING ERRCODE = '42501';
  END IF;
  SELECT c.created_at, c.expires_at INTO certificate
    FROM public.certificates AS c WHERE c.id = NEW.certificate_id;
  IF NOT FOUND OR NEW.created_at < certificate.created_at THEN
    RAISE EXCEPTION 'Certificate event parent/time mismatch' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.certificate_events AS e
             WHERE (e.certificate_id = NEW.certificate_id OR e.replacement_certificate_id = NEW.certificate_id)
               AND e.created_at > NEW.created_at) THEN
    RAISE EXCEPTION 'Certificate event cannot predate existing lifecycle or replacement history' USING ERRCODE = '23514';
  END IF;
  IF NEW.event_type = 'ISSUED' THEN
    IF certificate.expires_at IS NOT NULL AND NEW.created_at >= certificate.expires_at THEN
      RAISE EXCEPTION 'Cannot issue an expired certificate' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT e.created_at INTO issued_at FROM public.certificate_events AS e
     WHERE e.certificate_id = NEW.certificate_id AND e.event_type = 'ISSUED';
    IF NOT FOUND OR NEW.created_at < issued_at THEN
      RAISE EXCEPTION 'Terminal certificate event requires prior issuance' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.event_type = 'SUPERSEDED' THEN
    SELECT c.supersedes_id, c.created_at, c.expires_at INTO replacement FROM public.certificates AS c WHERE c.id = NEW.replacement_certificate_id;
    IF NOT FOUND OR replacement.supersedes_id IS DISTINCT FROM NEW.certificate_id OR NEW.created_at < replacement.created_at THEN
      RAISE EXCEPTION 'Supersession event must name its explicitly linked replacement' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.certificate_events AS e WHERE e.certificate_id = NEW.replacement_certificate_id AND e.event_type = 'ISSUED' AND e.created_at <= NEW.created_at) THEN
      RAISE EXCEPTION 'Replacement certificate must already be issued' USING ERRCODE = '23514';
    END IF;
    IF (replacement.expires_at IS NOT NULL AND NEW.created_at >= replacement.expires_at)
      OR EXISTS (SELECT 1 FROM public.certificate_events AS e WHERE e.certificate_id = NEW.replacement_certificate_id AND e.event_type IN ('REVOKED', 'SUPERSEDED')) THEN
      RAISE EXCEPTION 'Replacement certificate must not be expired or terminal' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.connected_certificate_event() FROM PUBLIC;

CREATE FUNCTION public.connected_service_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  request record;
  previous record;
BEGIN
  SELECT r.created_at, r.assignee_user_id, r.status INTO request
    FROM public.service_requests AS r WHERE r.id = NEW.service_request_id FOR UPDATE;
  IF NOT FOUND OR NEW.created_at < request.created_at THEN
    RAISE EXCEPTION 'Service event requires a visible parent and valid timestamp' USING ERRCODE = '23514';
  END IF;
  IF row_security_active('public.service_request_events'::regclass) THEN
    RAISE EXCEPTION 'Cannot safely validate assignments with filtered service history' USING ERRCODE = '42501';
  END IF;
  SELECT e.event_number, e.created_at, e.next_assignee_user_id, e.status INTO previous
    FROM public.service_request_events AS e WHERE e.service_request_id = NEW.service_request_id
   ORDER BY e.event_number DESC LIMIT 1;
  IF FOUND THEN
    IF NEW.event_number <> previous.event_number + 1 OR NEW.event_type = 'CREATED'
      OR NEW.created_at < previous.created_at
      OR NEW.previous_assignee_user_id IS DISTINCT FROM previous.next_assignee_user_id THEN
      RAISE EXCEPTION 'Service event sequence, timestamp or previous assignee mismatch' USING ERRCODE = '23514';
    END IF;
    IF (NEW.event_type = 'STATUS_CHANGED') IS DISTINCT FROM (NEW.status <> previous.status) THEN
      RAISE EXCEPTION 'Only STATUS_CHANGED events may change service progress' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.event_number <> 1 OR NEW.event_type <> 'CREATED'
      OR NEW.next_assignee_user_id IS DISTINCT FROM request.assignee_user_id OR NEW.status <> request.status THEN
      RAISE EXCEPTION 'First service event must capture the created request assignment/status' USING ERRCODE = '23514';
    END IF;
  END IF;
  -- This validates history identity/ordering, not staff eligibility. The API must
  -- authorize the actor and assignee and update the current request projection in
  -- the same transaction. No permission code or eligible staff role is invented.
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.connected_service_event() FROM PUBLIC;

CREATE FUNCTION public.connected_turnover_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  turnover record;
  evidence record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.evidence_version_id IS NOT NULL OR OLD.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Checklist evidence/completion must be retained' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Completed checklist items are immutable' USING ERRCODE = '23514';
    END IF;
    IF OLD.evidence_version_id IS NOT NULL AND NEW.evidence_version_id IS DISTINCT FROM OLD.evidence_version_id THEN
      RAISE EXCEPTION 'Checklist evidence version cannot be replaced or cleared' USING ERRCODE = '23514';
    END IF;
  END IF;
  SELECT t.customer_id, t.property_id, t.created_at INTO turnover
    FROM public.turnover_cases AS t WHERE t.id = NEW.turnover_case_id;
  IF NOT FOUND OR NEW.created_at < turnover.created_at THEN
    RAISE EXCEPTION 'Checklist requires a visible case and valid creation time' USING ERRCODE = '23514';
  END IF;
  IF NEW.evidence_version_id IS NOT NULL THEN
    SELECT v.created_at, d.customer_id, d.property_id INTO evidence
      FROM public.document_versions AS v JOIN public.documents AS d ON d.id = v.document_id
     WHERE v.id = NEW.evidence_version_id;
    IF NOT FOUND OR evidence.customer_id <> turnover.customer_id
      OR (evidence.property_id IS NOT NULL AND evidence.property_id <> turnover.property_id)
      OR evidence.created_at > NEW.updated_at
      OR (NEW.completed_at IS NOT NULL AND NEW.completed_at < evidence.created_at) THEN
      RAISE EXCEPTION 'Checklist evidence customer/property/time mismatch' USING ERRCODE = '23514';
    END IF;
    -- Evidence may legitimately be uploaded AFTER the checklist item was created;
    -- compare attachment/update and completion times, not the item creation time.
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.connected_turnover_evidence() FROM PUBLIC;

CREATE FUNCTION public.connected_verification_target() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  profile record;
BEGIN
  IF NEW.user_profile_id IS NOT NULL THEN
    -- SHARE, not KEY SHARE: serialize against issuance-field updates too.
    SELECT p.rhc_id, p.rhc_id_issued_at INTO profile
      FROM public.user_profiles AS p WHERE p.id = NEW.user_profile_id FOR SHARE;
    IF NOT FOUND OR profile.rhc_id IS NULL OR btrim(profile.rhc_id) = '' OR profile.rhc_id_issued_at IS NULL OR profile.rhc_id_issued_at > NEW.created_at THEN
      RAISE EXCEPTION 'Verification reference requires an actually issued profile' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.connected_verification_target() FROM PUBLIC;

CREATE FUNCTION public.connected_redemption_source() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
DECLARE
  debit record;
  benefit record;
  account record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.benefit_id IS NOT NULL THEN
      RAISE EXCEPTION 'Benefit redemption evidence must be retained' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.benefit_id IS NOT NULL AND ROW(NEW.id, NEW.benefit_id, NEW.benefit_company_id, NEW.accepted_points_cost, NEW.accepted_terms_snapshot, NEW.customer_id, NEW.rewards_account_id, NEW.amount)
      IS DISTINCT FROM ROW(OLD.id, OLD.benefit_id, OLD.benefit_company_id, OLD.accepted_points_cost, OLD.accepted_terms_snapshot, OLD.customer_id, OLD.rewards_account_id, OLD.amount) THEN
      RAISE EXCEPTION 'Accepted redemption snapshot/ownership is immutable' USING ERRCODE = '23514';
    END IF;
    IF OLD.original_debit_id IS NOT NULL AND NEW.original_debit_id IS DISTINCT FROM OLD.original_debit_id THEN
      RAISE EXCEPTION 'Original redemption debit cannot be replaced or cleared' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.benefit_id IS NOT NULL THEN
    SELECT b.company_id INTO benefit FROM public.rewards_benefits AS b WHERE b.id = NEW.benefit_id FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Benefit must be visible to the authorized writer' USING ERRCODE = '23514';
    END IF;
    -- Derive scope from the visible, locked benefit, not caller-supplied authority.
    -- Composite FKs also enforce this on later account-company changes (including
    -- setting company_id NULL), using PostgreSQL's referential locks/snapshot rules.
    -- They cannot be bypassed by RLS-hidden child rows. No new parent UPDATE guard
    -- constrains unlinked legacy accounts or global (NULL company) benefits.
    NEW.benefit_company_id := benefit.company_id;
    SELECT a.company_id, a.customer_id INTO account FROM public.rewards_accounts AS a WHERE a.id = NEW.rewards_account_id FOR SHARE;
    IF NOT FOUND OR account.customer_id <> NEW.customer_id OR (benefit.company_id IS NOT NULL AND benefit.company_id IS DISTINCT FROM account.company_id) THEN
      RAISE EXCEPTION 'Redemption benefit/account/customer scope mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.original_debit_id IS NOT NULL THEN
    SELECT t.rewards_account_id, t.customer_id, t.transaction_type, t.reversal_of_id, t.amount, t.status INTO debit
      FROM public.rewards_transactions AS t WHERE t.id = NEW.original_debit_id FOR SHARE;
    IF NOT FOUND OR debit.rewards_account_id <> NEW.rewards_account_id OR debit.customer_id <> NEW.customer_id
      OR debit.transaction_type <> 'REDEEM' OR debit.reversal_of_id IS NOT NULL OR debit.status NOT IN ('POSTED', 'REVERSED')
      OR abs(debit.amount) IS DISTINCT FROM NEW.accepted_points_cost THEN
      RAISE EXCEPTION 'Redemption must link its original posted REDEEM debit with matching account/customer/cost' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.connected_redemption_source() FROM PUBLIC;

CREATE FUNCTION public.connected_protect_linked_debit() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $function$
BEGIN
  IF ROW(NEW.id, NEW.customer_id, NEW.rewards_account_id, NEW.transaction_type, NEW.reversal_of_id, NEW.amount)
    IS DISTINCT FROM ROW(OLD.id, OLD.customer_id, OLD.rewards_account_id, OLD.transaction_type, OLD.reversal_of_id, OLD.amount)
    OR (NEW.status NOT IN ('POSTED', 'REVERSED') AND NEW.status IS DISTINCT FROM OLD.status) THEN
    -- INVOKER guards must not mistake RLS-hidden dependents for "no dependents".
    -- Until a fully visible approved runtime role is established, fail closed.
    IF row_security_active('public.rewards_redemptions'::regclass) THEN
      RAISE EXCEPTION 'Cannot safely check linked redemptions under filtered RLS' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.rewards_redemptions AS r WHERE r.original_debit_id = OLD.id) THEN
      RAISE EXCEPTION 'Linked redemption debit source fields are immutable; append ledger reversals instead' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.connected_protect_linked_debit() FROM PUBLIC;

-- Every version/history row is append-only for every caller, including the owner.
-- Statement-level TRUNCATE guards close the bulk-delete path. ALWAYS also closes
-- session_replication_role suppression; only deliberate authorized ALTER can relax.
DO $connected_immutable_triggers$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['document_versions','document_reviews','payment_records','payment_record_events','certificates','certificate_events','service_request_events'] LOOP
    EXECUTE format('CREATE TRIGGER connected_immutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.connected_reject_mutation()', table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER connected_immutable', table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['document_versions','document_reviews','identity_review_requests','payment_records','payment_record_events','certificates','certificate_events','service_request_events','turnover_checklist_items','rewards_redemptions'] LOOP
    EXECUTE format('CREATE TRIGGER connected_no_truncate BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.connected_reject_mutation()', table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER connected_no_truncate', table_name);
  END LOOP;
END
$connected_immutable_triggers$;

CREATE TRIGGER connected_milestone_scope BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.connected_freeze_columns('id','project_id','milestone_code','created_at');
CREATE TRIGGER connected_notification_read_time_guard BEFORE INSERT OR UPDATE OF read_at ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.connected_notification_read_time();
CREATE TRIGGER connected_document_scope BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.connected_freeze_columns('id','customer_id','property_id','created_at');
CREATE TRIGGER connected_service_scope BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.connected_freeze_columns('id','customer_id','requested_by_id','company_id','service_id','property_id','idempotency_key','reference','created_at');
-- Nullable turnover actors are proposals, never inferred assignments. The creator
-- is write-once (including NULL); responsible_user_id stays API-authorized mutable.
CREATE TRIGGER connected_turnover_scope BEFORE UPDATE ON public.turnover_cases FOR EACH ROW EXECUTE FUNCTION public.connected_freeze_columns('id','customer_id','property_id','case_number','created_at','created_by_id');
CREATE TRIGGER connected_benefit_scope BEFORE UPDATE ON public.rewards_benefits FOR EACH ROW EXECUTE FUNCTION public.connected_freeze_columns('id','company_id','benefit_code','created_at');
CREATE TRIGGER connected_reference_scope BEFORE UPDATE ON public.verification_references FOR EACH ROW EXECUTE FUNCTION public.connected_freeze_columns('id','token_hash','user_profile_id','certificate_id','created_at');
CREATE TRIGGER connected_version_evidence BEFORE INSERT ON public.document_versions FOR EACH ROW EXECUTE FUNCTION public.connected_check_evidence();
CREATE TRIGGER connected_review_evidence BEFORE INSERT ON public.document_reviews FOR EACH ROW EXECUTE FUNCTION public.connected_check_evidence();
CREATE TRIGGER connected_identity_evidence BEFORE INSERT OR UPDATE ON public.identity_review_requests FOR EACH ROW EXECUTE FUNCTION public.connected_check_evidence();
CREATE TRIGGER connected_payment_evidence BEFORE INSERT ON public.payment_records FOR EACH ROW EXECUTE FUNCTION public.connected_check_evidence();
CREATE TRIGGER connected_certificate_evidence BEFORE INSERT ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.connected_check_evidence();
CREATE TRIGGER connected_identity_state BEFORE INSERT OR UPDATE OR DELETE ON public.identity_review_requests FOR EACH ROW EXECUTE FUNCTION public.connected_identity_transition();
CREATE TRIGGER connected_payment_event_guard BEFORE INSERT ON public.payment_record_events FOR EACH ROW EXECUTE FUNCTION public.connected_payment_event();
CREATE TRIGGER connected_certificate_event_guard BEFORE INSERT ON public.certificate_events FOR EACH ROW EXECUTE FUNCTION public.connected_certificate_event();
CREATE TRIGGER connected_verification_target_guard BEFORE INSERT OR UPDATE ON public.verification_references FOR EACH ROW EXECUTE FUNCTION public.connected_verification_target();
CREATE TRIGGER connected_redemption_source_guard BEFORE INSERT OR UPDATE OR DELETE ON public.rewards_redemptions FOR EACH ROW EXECUTE FUNCTION public.connected_redemption_source();
CREATE TRIGGER connected_linked_debit_guard BEFORE UPDATE ON public.rewards_transactions FOR EACH ROW EXECUTE FUNCTION public.connected_protect_linked_debit();
CREATE TRIGGER connected_service_event_guard BEFORE INSERT ON public.service_request_events FOR EACH ROW EXECUTE FUNCTION public.connected_service_event();
CREATE TRIGGER connected_checklist_scope BEFORE UPDATE ON public.turnover_checklist_items FOR EACH ROW EXECUTE FUNCTION public.connected_freeze_columns('id','turnover_case_id','item_code','created_at');
CREATE TRIGGER connected_checklist_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON public.turnover_checklist_items FOR EACH ROW EXECUTE FUNCTION public.connected_turnover_evidence();

-- PostgreSQL runs same-kind triggers alphabetically: this precedes every guard
-- on these seven NEW tables, so Prisma @updatedAt clock skew cannot reject writes.
DO $connected_updated_at_triggers$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['documents','identity_review_requests','service_requests','project_milestones','turnover_cases','turnover_checklist_items','rewards_benefits'] LOOP
    EXECUTE format('CREATE TRIGGER aaa_connected_updated_at BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.connected_normalize_updated_at()', table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER aaa_connected_updated_at', table_name);
  END LOOP;
END;
$connected_updated_at_triggers$;

DO $connected_recorded_time_triggers$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('documents', ARRAY['created_at','updated_at']),
    ('document_versions', ARRAY['created_at']),
    ('document_reviews', ARRAY['decided_at']),
    ('identity_review_requests', ARRAY['created_at','updated_at','decided_at']),
    ('payment_records', ARRAY['submitted_at','paid_at']),
    ('payment_record_events', ARRAY['created_at']),
    ('certificates', ARRAY['created_at']),
    ('certificate_events', ARRAY['created_at']),
    ('verification_references', ARRAY['created_at','revoked_at']),
    ('service_requests', ARRAY['created_at','updated_at']),
    ('service_request_events', ARRAY['created_at']),
    ('saved_properties', ARRAY['created_at']),
    ('project_milestones', ARRAY['created_at','updated_at','reviewed_at','completed_at','published_at']),
    ('turnover_cases', ARRAY['created_at','updated_at']),
    ('turnover_checklist_items', ARRAY['created_at','updated_at','completed_at']),
    ('rewards_benefits', ARRAY['created_at','updated_at','approved_at'])
  ) AS clocks(table_name, columns) LOOP
    EXECUTE format('CREATE TRIGGER connected_recorded_time_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.connected_recorded_time(%s)',
      item.table_name, (SELECT string_agg(quote_literal(c), ',') FROM unnest(item.columns) AS fields(c)));
    EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER connected_recorded_time_guard', item.table_name);
  END LOOP;
END;
$connected_recorded_time_triggers$;

DO $connected_always_guards$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('documents','connected_document_scope'), ('service_requests','connected_service_scope'),
    ('turnover_cases','connected_turnover_scope'), ('rewards_benefits','connected_benefit_scope'),
    ('verification_references','connected_reference_scope'), ('document_versions','connected_version_evidence'),
    ('document_reviews','connected_review_evidence'), ('identity_review_requests','connected_identity_evidence'),
    ('payment_records','connected_payment_evidence'), ('certificates','connected_certificate_evidence'),
    ('identity_review_requests','connected_identity_state'), ('payment_record_events','connected_payment_event_guard'),
    ('certificate_events','connected_certificate_event_guard'), ('verification_references','connected_verification_target_guard'),
    ('rewards_redemptions','connected_redemption_source_guard'), ('rewards_transactions','connected_linked_debit_guard'),
    ('service_request_events','connected_service_event_guard'), ('turnover_checklist_items','connected_checklist_scope'),
    ('turnover_checklist_items','connected_checklist_evidence_guard'),
    ('project_milestones','connected_milestone_scope'), ('notifications','connected_notification_read_time_guard')
  ) AS guards(table_name, trigger_name) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER %I', item.table_name, item.trigger_name);
  END LOOP;
END
$connected_always_guards$;

-- Exact NEW-object lockdown, building on 202609210001. Existing table/column ACLs
-- (including notifications and rewards_redemptions) are deliberately untouched:
-- legitimate backend rights must not be revoked/rejected by guessed role policy.
-- ADD COLUMN does not apply creator default table ACLs; existing table privileges
-- do cover the new columns. Historical browser revocation is not re-applied here.
-- The separately owned 45-table preflight MUST review effective privileges on all
-- extensions before deployment; this new-only closure does not attest legacy ACLs.
-- On NEW tables only, unexpected default grants cause rollback, never broad cleanup.
DO $connected_acl$
DECLARE
  application_tables CONSTANT text[] := ARRAY[
    'documents','document_versions','document_reviews','identity_review_requests',
    'payment_records','payment_record_events','certificates','certificate_events',
    'verification_references','service_requests','service_request_events',
    'saved_properties','project_milestones','turnover_cases','turnover_checklist_items',
    'rewards_benefits'
  ];
  trigger_functions CONSTANT text[] := ARRAY[
    'connected_reject_mutation','connected_freeze_columns','connected_check_evidence',
    'connected_identity_transition','connected_payment_event','connected_certificate_event',
    'connected_verification_target','connected_redemption_source','connected_protect_linked_debit',
    'connected_recorded_time','connected_service_event','connected_turnover_evidence',
    'connected_normalize_updated_at','connected_notification_read_time'
  ];
  table_name text;
  function_name text;
  column_list text;
  grantee_name text;
  grantee_sql text;
  unsafe_acl text;
  unsafe_role text;
BEGIN
  IF cardinality(application_tables) <> 16 OR cardinality(trigger_functions) <> 14 THEN
    RAISE EXCEPTION 'Connected-domain ACL allowlist count mismatch';
  END IF;
  IF current_user IN ('anon','authenticated') THEN
    RAISE EXCEPTION 'Browser roles cannot run this migration';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = ANY(application_tables) AND c.relkind = 'r') <> 16 THEN
    RAISE EXCEPTION 'Connected-domain ACL allowlist contains missing/non-table objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
             JOIN pg_catalog.pg_roles AS r ON r.oid = c.relowner
             WHERE n.nspname = 'public' AND c.relname = ANY(application_tables) AND r.rolname IN ('anon','authenticated')) THEN
    RAISE EXCEPTION 'Browser role owns a protected table';
  END IF;

  FOREACH table_name IN ARRAY application_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
  -- No policies on new tables: default deny. Do not FORCE owner enforcement or
  -- create backend policies/grants without the operator's explicit role contract.
  FOREACH grantee_name IN ARRAY ARRAY['PUBLIC','anon','authenticated'] LOOP
    IF grantee_name <> 'PUBLIC' AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = grantee_name) THEN
      CONTINUE;
    END IF;
    grantee_sql := CASE WHEN grantee_name = 'PUBLIC' THEN 'PUBLIC' ELSE format('%I', grantee_name) END;
    FOREACH table_name IN ARRAY application_tables LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s', table_name, grantee_sql);
      SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum) INTO column_list
        FROM pg_catalog.pg_attribute AS a
       WHERE a.attrelid = format('public.%I', table_name)::regclass AND a.attnum > 0 AND NOT a.attisdropped;
      EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM %s', column_list, table_name, grantee_sql);
    END LOOP;
    FOREACH function_name IN ARRAY trigger_functions LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION public.%I() FROM %s', function_name, grantee_sql);
    END LOOP;
  END LOOP;

  -- Enumerate actual ACLs, including grants inherited from creator defaults, at
  -- both table and column levels. Owner is the only approved grantee in this SQL.
  -- No CASCADE, role creation, ownership changes or global/default ACL changes.
  SELECT string_agg(format('%I -> %s (%s; grantor %s)', c.relname,
                          CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END,
                          acl.privilege_type, pg_catalog.pg_get_userbyid(acl.grantor)), '; ')
    INTO unsafe_acl
    FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))) AS acl
   WHERE n.nspname = 'public' AND c.relname = ANY(application_tables) AND acl.grantee <> c.relowner;
  IF unsafe_acl IS NOT NULL THEN
    RAISE EXCEPTION 'Unapproved table ACLs; explicit role review required: %', unsafe_acl;
  END IF;
  SELECT string_agg(format('%I.%I -> %s (%s; grantor %s)', c.relname, a.attname,
                          CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END,
                          acl.privilege_type, pg_catalog.pg_get_userbyid(acl.grantor)), '; ')
    INTO unsafe_acl
    FROM pg_catalog.pg_attribute AS a JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
   WHERE n.nspname = 'public' AND c.relname = ANY(application_tables) AND a.attnum > 0 AND NOT a.attisdropped AND acl.grantee <> c.relowner;
  IF unsafe_acl IS NOT NULL THEN
    RAISE EXCEPTION 'Unapproved column ACLs; explicit role review required: %', unsafe_acl;
  END IF;
  SELECT string_agg(format('%I() -> %s (%s)', p.proname,
                          CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END,
                          acl.privilege_type), '; ')
    INTO unsafe_acl
    FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS acl
   WHERE n.nspname = 'public' AND p.proname = ANY(trigger_functions) AND p.pronargs = 0 AND acl.grantee <> p.proowner;
  IF unsafe_acl IS NOT NULL THEN
    RAISE EXCEPTION 'Unapproved trigger-function ACLs; explicit role review required: %', unsafe_acl;
  END IF;

  -- Conservative membership closure: inspect ALL reachable memberships, including
  -- NOINHERIT/SET ROLE paths. This may reject a non-usable membership on PG16+, by
  -- design; resolving it requires operator review, never guessed backend roles.
  -- Effective checks also catch predefined read/write-all-data privileges that
  -- need not appear as individual ACL entries. No role topology is modified.
  WITH RECURSIVE reachable(browser_oid, role_oid) AS (
    SELECT r.oid, r.oid FROM pg_catalog.pg_roles AS r WHERE r.rolname IN ('anon','authenticated')
    UNION
    SELECT x.browser_oid, m.roleid FROM reachable AS x JOIN pg_catalog.pg_auth_members AS m ON m.member = x.role_oid
  )
  SELECT string_agg(DISTINCT format('%I via %I', browser.rolname, r.rolname), '; ') INTO unsafe_role
    FROM reachable AS x JOIN pg_catalog.pg_roles AS browser ON browser.oid = x.browser_oid
    JOIN pg_catalog.pg_roles AS r ON r.oid = x.role_oid
   WHERE r.rolsuper OR r.rolbypassrls OR r.rolcreaterole
      OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = ANY(application_tables)
           AND (c.relowner = r.oid
             OR pg_catalog.has_table_privilege(r.oid, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
             OR pg_catalog.has_any_column_privilege(r.oid, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'))
      );
  IF unsafe_role IS NOT NULL THEN
    RAISE EXCEPTION 'Unsafe browser ownership/inherited authority; explicit role review required: %', unsafe_role;
  END IF;
END
$connected_acl$;

-- Deployment gates not represented by schema parity:
-- * Approve actual migration/runtime roles, memberships, policies, exposed views
--   and SECURITY DEFINER RPCs. The application ACL preflight now lists all 45
--   tables; execute it only with target approval before deployment acceptance.
-- * Trigger calls do not require caller EXECUTE on these functions. Their SQL runs
--   as INVOKER and requires appropriate parent SELECT/locking visibility; partial
--   RLS visibility is not an authorization substitute and can fail closed.
-- * APIs must authenticate actor IDs; enforce customer ownership, staff permissions,
--   property/project/company scope, consent and eligible service/property links;
--   lock/update mutable status projections with their events in one transaction.
-- * Document storage needs independent retention/immutability and MIME/checksum
--   verification. No content, signed URLs or raw verification tokens belong here.
-- * Profile issuance is checked when a reference is written; a future verifier must
--   recheck current identity/certificate validity. No public endpoint is activated.
-- * Benefits/verification activation needs separately approved SQL and API contracts.
--   Turnover has a DRAFT default, not a DRAFT-only blocker; state transitions remain
--   a pending API/product decision. No cardinality, eligibility or offers approved.
-- * Issuer-company identity is enforced by FK; its authority over a property's or
--   document's scope and the creator's issuing permission require service checks.
--   Do not assume issuer must equal the property's developer. Assignee existence
--   and assignment history are enforced, not assignee/assigner authorization.
-- * All new enum values (including progress, publication and assignment events)
--   are proposals pending approval, not product authorization. Draft milestones
--   are not public merely because progress is COMPLETED.
-- * Certificate event writes REQUIRE SERIALIZABLE (SQLSTATE 25000 otherwise).
--   Use SERIALIZABLE with serialization-failure retries for all new cross-row
--   lifecycle APIs too; only certificate events impose that isolation check here.
-- * New-table timestamp defaults are explicitly UTC transaction time. Explicit
--   factual timestamps remain supplied/validated; NEW.created_at is not rewritten.
--   The alphabetically first trigger replaces NEW.updated_at with UTC wall time
--   before guards on seven new mutable tables. No legacy timestamps are converted.
-- * Changed non-NULL notification read_at is stamped with UTC wall time; NULL,
--   unchanged read_at and other historical timestamp fields are left untouched.
-- * Scoped benefit-company snapshots and composite FKs protect linked account
--   company values under concurrency/RLS without freezing unrelated legacy rows.
-- * Same-property/same-logical-document supersession is a conservative proposal;
--   cross-kind/source replacement remains blocked pending owner approval.
-- * Reservation retry/idempotency is a future API+schema proposal, not part of this
--   migration. Existing reservation constraints, fields and workflows are retained;
--   the new redundant candidate key supports same-customer/property payment links.

-- Required database acceptance tests (NOT executed by this offline migration task):
-- 1. UPDATE/DELETE/TRUNCATE each immutable table as owner and runtime roles must
--    fail; repeat with session_replication_role = replica where authorized.
-- 2. Duplicate doc/version, actor+parent retry key and reversal target must fail;
--    zero sizes, NaN/nonpositive costs, non-PHP money and malformed hashes fail.
-- 3. Cross-payment reversal or reversal of NOTE/REVERSED/REJECTED fails; a single
--    same-payment VERIFIED reversal succeeds. Race two reversals/reviews: one wins.
-- 4. Self-review, decision without actor/time, correction without typed fields,
--    different-customer evidence and edits to decided identity requests fail.
-- 5. Unissued profile, zero/two verification targets, enabled references, active
--    benefits fail. Multiple customer/property turnover cases and proposed non-DRAFT
--    progress values are allowed. No storage URL/content/raw-token columns exist.
-- 6. Service/company mismatch fails its composite FK. Certificate events must
--    name the explicit successor and follow issuance; duplicate terminal events fail.
-- 7. Legacy all-NULL redemption extensions pass; wrong-account/customer/type or
--    wrong-magnitude debit fails. Mutating a linked debit source fails; inserting
--    a REVERSAL linked via the existing ledger reversal_of_id remains possible.
-- 8. Exercise PUBLIC/browser table+column grants, creator default grants to an
--    unrelated role and browser membership in an owner/read-all role: revocations
--    or explicit failure must leave no partially committed objects. Test runtime
--    and trigger parent visibility only after the actual role contract is approved.
-- 9. Payment/reservation customer or property mismatch fails the composite FK;
--    later reservation reparenting also fails. NULL reservation remains valid.
-- 10. Missing certificate issuer fails its FK; cross-issuer supersession fails.
--     Issuer/source authorization is pending API work, not asserted by FK existence.
-- 11. Assignment/reassignment/unassignment retain both user FKs and ordered event
--     numbers. Wrong previous assignee, repeated/skipped sequence, backwards time,
--     non-assignment changing assignee, and history UPDATE/DELETE/TRUNCATE fail.
-- 12. Milestone publication defaults DRAFT independently of progress PLANNED;
--     PUBLISHED/ARCHIVED without reviewed publication time fails. No public API is
--     enabled by setting publication status. All lifecycle values await approval.
-- 13. Checklist evidence uploaded after item creation may be attached at a later
--     updated_at; wrong-customer/property evidence or completion before upload fails.
--     Evidence replacement/clearing/deletion and completed-item mutations fail.
-- 14. Future factual timestamps fail connected_recorded_time(); scheduled due,
--     target and expiry dates remain allowed. Same-millisecond service events use
--     event_number ordering, while payment reversal and certificate issuance links
--     provide causal ordering when their TIMESTAMP(3) values are equal.
-- 15. Repeat clock tests in UTC and a non-UTC session. New-table defaults remain UTC;
--     app-skewed updated_at is replaced before checks, while future supplied factual
--     timestamps still fail. Existing timestamp defaults/rows must remain untouched.
-- 16. Link a scoped benefit then change its account company (including NULL): FK
--     fails. Race link creation against reparenting under multiple isolations. An
--     unlinked account/global benefit must not acquire a new company-change blocker.
-- 17. All certificate event types reject READ COMMITTED/REPEATABLE READ with 25000;
--     SERIALIZABLE callers retry 40001. Supersession of a different property/logical
--     document/source kind fails, while another version of the same document passes.
-- 18. Milestone identity/scope changes fail. Changed non-NULL notification read_at
--     is DB-stamped UTC; an unrelated update preserves its exact old read_at value.
-- 19. Existing notifications/redemptions backend grants survive unchanged; unknown
--     grantees on NEW tables still abort. Legacy browser exposure is a separate
--     45-table preflight failure, not grounds for this migration to revoke old ACLs.

COMMIT;
