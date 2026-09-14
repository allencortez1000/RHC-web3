# Vercel preparation (no deployment performed)

This is configuration guidance for a future approved release, **not an instruction to deploy now**. Customer and admin would be separate Vercel projects from the same monorepo, using `apps/customer-web` and `apps/admin-web` respectively and access to shared workspace packages. Preserve repository-root workspace dependency/lockfile resolution; confirm Vercel's monorepo/root/build settings in an approved preview before release.

## Frontend build environment

Both applications read:

- `NEXT_PUBLIC_API_URL`: API base URL **including `/api/v1`**.
- `NEXT_PUBLIC_SUPABASE_URL`: approved Supabase project origin.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key; the source supports `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a legacy fallback.

Public Next variables are build-time client configuration; changing them requires a new approved build. Missing API/Auth configuration must display unavailable/error states, not mock success. Never expose Supabase server/service secrets, database credentials, Redis tokens or other backend secrets in client variables/bundles. API secrets and the API `.env` loader belong to the backend, not these frontend projects.

The repository targets Node **22.13+** and npm **10+**; CI uses Node 22, while the preparation host ran Node 24.21.0. Node 22/hosted build validation still needs evidence. Local customer/admin ports are **3000 / 3002**.

## Supabase and API coordination

- Configure exact approved frontend origins in backend `CUSTOMER_WEB_URL`, `ADMIN_WEB_URL` and `CORS_ORIGINS`; do not blanket-trust arbitrary preview domains.
- Allow the intended `/auth/confirm` and `/reset-password` redirect URLs in Supabase for each approved frontend origin. Verify real email templates/delivery rather than assuming default templates match.
- Confirmation and recovery are **same-browser PKCE-only**. Implicit access/refresh-token or token-hash links are rejected; the requesting browser/storage must retain the verifier. No existing-session fallback is allowed on invalid recovery links.
- Supabase email confirmation does not confer business approval or admin privileges. The API checks real JWTs and authoritative Auth identity; admin role grants use reviewed governance/bootstrap, not browser metadata.
- `GET /auth/config` is the registration UX precheck, and new application provisioning checks `ENABLE_REGISTRATION`. Neither disables raw Supabase signup. Configure Supabase signup disablement or an approved Auth hook independently when registration must be closed; provider auth limits are also external to API Redis limits.

## Release blockers

**Staging migrations NO GO; no deployment.** Four migrations remain pending, with no applied RLS/revocations. The prior database URL syntax check failed; valid target/role/grants approval, approved disposable PostgreSQL migration testing, and live verification remain prerequisites. Do not compensate for an unready API/database by enabling frontend fixtures.

Main reports 210 unit tests / 11 suites and 140 API tests / 8 suites passing with fixtures only. Final frontend reruns remain pending (approximately 55 customer / 65 admin); these are not confirmed pass counts or live Supabase acceptance. Historical build/audit snapshots do not certify the current preview or production output. Follow [acceptance gates](../../docs/month-1/acceptance-validation.md) and update the [completion report](../../docs/month-1/targeted-completion-report.md) with final results before seeking release approval.
