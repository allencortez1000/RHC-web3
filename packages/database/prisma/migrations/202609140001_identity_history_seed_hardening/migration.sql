-- Additive reconciliation after the two Month 1 migrations; do not rewrite history.
-- Fail rather than silently merge duplicate global roles or repair mismatched ledger
-- ownership. Resolve those records explicitly before applying to populated databases.
BEGIN;

-- Authentication-provider confirmation is distinct from application verification.
-- Leave existing users unconfirmed until authoritative identity synchronization.
ALTER TABLE "users" ADD COLUMN "auth_email_confirmed_at" TIMESTAMP(3);

-- PostgreSQL permits multiple NULL company_id values in the compound unique index.
-- Prisma 5 cannot express this partial index; preserve it in future migrations.
CREATE UNIQUE INDEX "roles_global_code_key" ON "roles"("code") WHERE "company_id" IS NULL;

-- An ordinary nullable unique index has the same non-NULL uniqueness semantics,
-- and matches Prisma's @unique (the previous partial index causes schema drift).
DROP INDEX "rewards_transactions_idempotency_key_key";
CREATE UNIQUE INDEX "rewards_transactions_idempotency_key_key" ON "rewards_transactions"("idempotency_key");

-- Retain customer-property, consent, notification, and reward history on deletion.
ALTER TABLE "customer_properties"
  DROP CONSTRAINT "customer_properties_customer_id_fkey",
  DROP CONSTRAINT "customer_properties_property_id_fkey",
  ADD CONSTRAINT "customer_properties_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consent_records"
  DROP CONSTRAINT "consent_records_user_id_fkey",
  ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
  DROP CONSTRAINT "notifications_user_id_fkey",
  ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The foundation SQL still cascades account deletion and nulls rule references,
-- despite the pre-existing Prisma Restrict declarations.
ALTER TABLE "rewards_accounts"
  DROP CONSTRAINT "rewards_accounts_customer_id_fkey",
  ADD CONSTRAINT "rewards_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rewards_transactions"
  DROP CONSTRAINT "rewards_transactions_rule_id_fkey",
  ADD CONSTRAINT "rewards_transactions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rewards_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Separate account/user FKs alone allow ledger rows to name another customer.
-- The composite FKs enforce ownership for both transactions and redemptions.
CREATE UNIQUE INDEX "rewards_accounts_id_customer_id_key" ON "rewards_accounts"("id", "customer_id");

ALTER TABLE "rewards_transactions"
  DROP CONSTRAINT "rewards_transactions_rewards_account_id_fkey",
  ADD CONSTRAINT "rewards_transactions_rewards_account_id_customer_id_fkey" FOREIGN KEY ("rewards_account_id", "customer_id") REFERENCES "rewards_accounts"("id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rewards_redemptions"
  DROP CONSTRAINT "rewards_redemptions_rewards_account_id_fkey",
  ADD CONSTRAINT "rewards_redemptions_rewards_account_id_customer_id_fkey" FOREIGN KEY ("rewards_account_id", "customer_id") REFERENCES "rewards_accounts"("id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
