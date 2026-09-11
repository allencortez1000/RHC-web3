# Database Schema

The schema is defined in `packages/database/prisma/schema.prisma` and includes normalized Month 1 tables:

- users, user_profiles, rhc_id_sequences
- companies, projects
- roles, permissions, user_roles, role_permissions
- properties, customer_properties
- business_services
- company_integrations, company_api_clients, company_events, integration_logs
- notifications, consent_records, feature_flags
- audit_logs, activity_events
- rewards_accounts, rewards_rules, rewards_transactions, rewards_redemptions
- system_settings

UUIDs are used for internal identifiers. RHC Digital IDs are public non-sensitive identifiers generated server-side as `RHC-YYYY-XXXXXXXX`.

Rewards transactions use append-only ledger principles. Corrections must be reversals or adjustments, not silent mutation.
