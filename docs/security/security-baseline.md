# Security Baseline

Implemented Month 1 controls:

- Backend authorization for protected and admin routes
- Database-managed roles and permissions
- Company/project scoped user roles
- 401 for missing auth and 403 for insufficient permission
- Request IDs and correlation IDs
- Helmet secure headers
- CORS allow-list configuration
- Rate limiting on login and registration
- Zod input validation
- Prisma safe query layer
- Sensitive field redaction for audit/log payloads
- Audit logging for sensitive admin changes
- Consent records for privacy/terms/marketing/company/data-sharing use cases
- Feature flags disabling public token, wallet, blockchain, token transfer, sale, crypto payment, and staking functionality

Production Supabase Auth JWT verification should be enabled with issuer/JWKS configuration before public launch. The local opaque-token path is for development/testing only.
