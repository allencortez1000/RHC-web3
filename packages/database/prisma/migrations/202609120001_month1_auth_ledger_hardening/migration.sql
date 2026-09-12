-- Month 1 security and rewards-ledger hardening.
-- Review before applying: this removes obsolete application password hashes.
ALTER TABLE "users" DROP COLUMN "password_hash";

ALTER TABLE "rewards_transactions"
  ADD COLUMN "transaction_number" TEXT,
  ADD COLUMN "idempotency_key" TEXT;

-- Existing staging has not been migrated. Generate deterministic references
-- before making the ledger identifiers mandatory.
UPDATE "rewards_transactions"
SET "transaction_number" = 'RHC-LEDGER-' || replace("id"::text, '-', '')
WHERE "transaction_number" IS NULL;
ALTER TABLE "rewards_transactions" ALTER COLUMN "transaction_number" SET NOT NULL;
CREATE UNIQUE INDEX "rewards_transactions_transaction_number_key" ON "rewards_transactions"("transaction_number");
CREATE UNIQUE INDEX "rewards_transactions_idempotency_key_key" ON "rewards_transactions"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "consent_records"
  ADD CONSTRAINT "consent_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_logs"
  ADD CONSTRAINT "integration_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rewards_accounts"
  ADD CONSTRAINT "rewards_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rewards_rules"
  ADD CONSTRAINT "rewards_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rewards_transactions"
  ADD CONSTRAINT "rewards_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "rewards_transactions_source_company_id_fkey" FOREIGN KEY ("source_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "rewards_transactions_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "rewards_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rewards_redemptions"
  ADD CONSTRAINT "rewards_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "rewards_redemptions_rewards_account_id_fkey" FOREIGN KEY ("rewards_account_id") REFERENCES "rewards_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
