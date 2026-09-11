-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PREPARED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'PREPARED', 'ACTIVE', 'SUSPENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED', 'LOCKED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'PARKING');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'HELD', 'RESERVED', 'CONTRACTED', 'SOLD', 'FOR_TURNOVER', 'TURNED_OVER', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CustomerPropertyRelationship" AS ENUM ('RESERVEE', 'BUYER', 'CO_BUYER', 'OWNER', 'TENANT', 'AUTHORIZED_REPRESENTATIVE');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'PREPARED', 'COMING_SOON', 'DISABLED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PRIVACY_POLICY', 'TERMS', 'MARKETING', 'COMPANY_SERVICE', 'DATA_SHARING');

-- CreateEnum
CREATE TYPE "RewardsAccountStatus" AS ENUM ('DISABLED', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RewardsTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'EXPIRY', 'REVERSAL');

-- CreateEnum
CREATE TYPE "RewardsTransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'POSTED', 'REVERSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "supabase_user_id" TEXT,
    "email" TEXT NOT NULL,
    "mobile_number" TEXT,
    "password_hash" TEXT,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rhc_id_sequences" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rhc_id_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" TEXT,
    "middle_name" TEXT,
    "last_name" TEXT,
    "suffix" TEXT,
    "birth_date" TIMESTAMP(3),
    "nationality" TEXT,
    "address_line" TEXT,
    "barangay" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Philippines',
    "email" TEXT NOT NULL,
    "mobile_number" TEXT,
    "rhc_id" TEXT,
    "rhc_id_issued_at" TIMESTAMP(3),
    "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "company_code" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "business_type" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "logo_url" TEXT,
    "integration_status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "rewards_enabled" BOOLEAN NOT NULL DEFAULT false,
    "digital_services_enabled" BOOLEAN NOT NULL DEFAULT true,
    "api_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "project_code" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNED',
    "start_date" TIMESTAMP(3),
    "target_completion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "company_id" UUID,
    "project_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "property_code" TEXT NOT NULL,
    "tower" TEXT,
    "floor" TEXT,
    "unit_number" TEXT,
    "asset_type" "AssetType" NOT NULL,
    "area" DECIMAL(12,2),
    "list_price" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_properties" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "relationship_type" "CustomerPropertyRelationship" NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_services" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "service_code" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "description" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'PREPARED',
    "rewards_eligible" BOOLEAN NOT NULL DEFAULT false,
    "wallet_eligible" BOOLEAN NOT NULL DEFAULT false,
    "requires_property" BOOLEAN NOT NULL DEFAULT false,
    "requires_resident_status" BOOLEAN NOT NULL DEFAULT false,
    "integration_status" "IntegrationStatus" NOT NULL DEFAULT 'PREPARED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_integrations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "integration_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PREPARED',
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_api_clients" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "credential_ref" TEXT,
    "scopes" TEXT[],
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_api_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_events" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" UUID NOT NULL,
    "integration_id" UUID,
    "company_id" UUID,
    "direction" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "request_ref" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "company_id" UUID,
    "consent_version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_role" TEXT,
    "company_id" UUID,
    "project_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_user_id" UUID,
    "company_id" UUID,
    "project_id" UUID,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "request_id" TEXT,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards_accounts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "company_id" UUID,
    "status" "RewardsAccountStatus" NOT NULL DEFAULT 'DISABLED',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards_rules" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "rule_code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "rule_definition" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards_transactions" (
    "id" UUID NOT NULL,
    "rewards_account_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "source_company_id" UUID,
    "rule_id" UUID,
    "source_reference" TEXT,
    "transaction_type" "RewardsTransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "authorization_ref" TEXT,
    "status" "RewardsTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "reversal_of_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_at" TIMESTAMP(3),

    CONSTRAINT "rewards_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards_redemptions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "rewards_account_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "authorization_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_supabase_user_id_key" ON "users"("supabase_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_number_key" ON "users"("mobile_number");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_account_status_verification_status_idx" ON "users"("account_status", "verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_rhc_id_key" ON "user_profiles"("rhc_id");

-- CreateIndex
CREATE INDEX "user_profiles_rhc_id_idx" ON "user_profiles"("rhc_id");

-- CreateIndex
CREATE INDEX "user_profiles_last_name_first_name_idx" ON "user_profiles"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_company_code_key" ON "companies"("company_code");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_code_key" ON "projects"("project_code");

-- CreateIndex
CREATE INDEX "projects_company_id_status_idx" ON "projects"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "roles_code_idx" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_company_id_code_key" ON "roles"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_company_id_project_id_idx" ON "user_roles"("company_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_company_id_project_id_key" ON "user_roles"("user_id", "role_id", "company_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "properties_property_code_key" ON "properties"("property_code");

-- CreateIndex
CREATE INDEX "properties_project_id_status_idx" ON "properties"("project_id", "status");

-- CreateIndex
CREATE INDEX "properties_asset_type_idx" ON "properties"("asset_type");

-- CreateIndex
CREATE INDEX "customer_properties_customer_id_status_idx" ON "customer_properties"("customer_id", "status");

-- CreateIndex
CREATE INDEX "customer_properties_property_id_status_idx" ON "customer_properties"("property_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_properties_customer_id_property_id_relationship_ty_key" ON "customer_properties"("customer_id", "property_id", "relationship_type", "effective_from");

-- CreateIndex
CREATE INDEX "business_services_status_idx" ON "business_services"("status");

-- CreateIndex
CREATE UNIQUE INDEX "business_services_company_id_service_code_key" ON "business_services"("company_id", "service_code");

-- CreateIndex
CREATE UNIQUE INDEX "company_integrations_company_id_integration_key_key" ON "company_integrations"("company_id", "integration_key");

-- CreateIndex
CREATE UNIQUE INDEX "company_api_clients_client_id_key" ON "company_api_clients"("client_id");

-- CreateIndex
CREATE INDEX "company_api_clients_company_id_status_idx" ON "company_api_clients"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "company_events_company_id_event_type_key" ON "company_events"("company_id", "event_type");

-- CreateIndex
CREATE INDEX "integration_logs_company_id_event_type_idx" ON "integration_logs"("company_id", "event_type");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "consent_records_user_id_consent_type_company_id_idx" ON "consent_records"("user_id", "consent_type", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "activity_events_event_type_status_idx" ON "activity_events"("event_type", "status");

-- CreateIndex
CREATE INDEX "activity_events_company_id_project_id_idx" ON "activity_events"("company_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_accounts_customer_id_company_id_key" ON "rewards_accounts"("customer_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_rules_rule_code_key" ON "rewards_rules"("rule_code");

-- CreateIndex
CREATE INDEX "rewards_transactions_customer_id_created_at_idx" ON "rewards_transactions"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "rewards_transactions_source_company_id_idx" ON "rewards_transactions"("source_company_id");

-- CreateIndex
CREATE INDEX "rewards_redemptions_customer_id_status_idx" ON "rewards_redemptions"("customer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_properties" ADD CONSTRAINT "customer_properties_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_properties" ADD CONSTRAINT "customer_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_services" ADD CONSTRAINT "business_services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_integrations" ADD CONSTRAINT "company_integrations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_api_clients" ADD CONSTRAINT "company_api_clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_events" ADD CONSTRAINT "company_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "company_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards_accounts" ADD CONSTRAINT "rewards_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards_transactions" ADD CONSTRAINT "rewards_transactions_rewards_account_id_fkey" FOREIGN KEY ("rewards_account_id") REFERENCES "rewards_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards_transactions" ADD CONSTRAINT "rewards_transactions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rewards_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

