# Render preparation (no deployment performed)

This is a prepare-only runbook, not authorization to execute deployment commands. **Staging migrations are NO GO.** All four migrations remain pending; the prior database URL syntax check failed, and the target/role/grants are unverified. No applied RLS/revocations or deployment are claimed. Approve a valid target and role/grant model, verify the chain on disposable PostgreSQL, then authorize staging/live checks separately. Do not create a service, deploy, migrate, seed, or bootstrap identities under this documentation handoff.

## Native Node service

Use the **repository root**, not `apps/api`, as the service root. The API depends on npm workspaces and their compiled libraries. Select Node **22.13+** (CI uses Node 22) and npm **10+**. The preparation host ran Node **24.21.0**; the Node 22 execution check remains pending. The commands below describe future approved service configuration, not work performed here.

Build command:

```bash
npm ci && npm run db:generate && npm run build:api
```

Start command:

```bash
npm run start:api
```

`build:api` builds shared libraries first. The API entry point is `apps/api/dist/main.js`; do not use the old nested `dist/apps/api/src/main.js` path. Shared packages publish `dist/index.js` and `dist/index.d.ts`, including the database library's separate build config.

Client generation is a build step, not a database migration. There is deliberately no automatic migration/seed/predeploy command. Coordinate any schema deployment separately with the schema owner; API bootstrap scripts belong to the backend owner and are not part of startup.

## Docker alternative

The build context must also be the repository root:

```bash
docker build -f infrastructure/docker/Dockerfile.api -t rhc-api:prepared .
```

The Dockerfile uses Node 22 Debian slim with OpenSSL/CA certificates, installs from the full workspace lockfile using `npm ci`, generates Prisma in the build stage, builds shared libraries and API, and prunes development dependencies. Runtime uses an unprivileged `node` user and the root `start:api` script. `.dockerignore` excludes host `node_modules`, build outputs, and local environment files.

The image contains the production dependencies of the monorepo, not only the API workspace. Further image-size optimization is separate from this compatibility/security pass. Docker was unavailable in the preparation environment, so an actual image build and container smoke test remain required.

## Runtime configuration

Provide runtime secrets through Render's environment/secret controls, never Docker build arguments or committed files. Use current `packages/config/src/index.ts` validation and `.env.example` inventories for variable names. API startup loads optional root `.env` then `apps/api/.env` before provider imports; precedence is **runtime injection > root `.env` > API `.env`**, including injected empty values. The loader uses Node's `process.loadEnvFile`; optional missing files are ignored, other load failures abort safely. This is API startup behavior, not automatic loading for every CLI.

Set `NODE_ENV=production` for a production service (or the approved staging environment), never enable `USE_MOCK_DATA=true`, and use the platform-provided `PORT` (local default 4000, allowed 1–65535). Required staging/production fields are `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`, `JWT_ISSUER`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CUSTOMER_WEB_URL`, `ADMIN_WEB_URL`, and `CORS_ORIGINS`. `JWT_AUDIENCE` defaults to `authenticated`.

Use HTTPS endpoint URLs, exact frontend root URLs/origins and an explicit CORS list containing both frontends. Supabase issuer is its origin plus `/auth/v1`; JWKS adds `/.well-known/jwks.json`. PostgreSQL URL syntax validation does not establish connectivity, TLS, database identity, role privileges or migration readiness. Do not log configuration values to diagnose failure.

Configure `TRUSTED_PROXY_CIDRS` only after the infrastructure owner verifies actual socket peers, all ingress paths, forwarding-header rewriting and direct-ingress restrictions. Blank means no proxy trust; broad cloud/private ranges, boolean trust and numeric hop counts are not substitutes for a verified topology. Redis IP and post-auth user/client limiting are already wired, but incorrect peer attribution still merges client IP buckets. See [proxy hardening](../../docs/month-1/proxy-env-hardening.md).

`GET /api/v1/health` is process liveness and bypasses rate limiting. `GET /api/v1/health/ready` checks PostgreSQL and Redis and remains rate-limited; neither proves Auth, RLS/ACLs or business acceptance. Swagger is off unless `ENABLE_SWAGGER=true`. The CLI has a 30-second startup watchdog and generic failure output; Nest framework logging is disabled, so review safe operational visibility before release.

Frontend public Supabase configuration belongs in the corresponding Next build environment. Never expose database credentials, Supabase server secrets, or Redis tokens as `NEXT_PUBLIC_*` values. Customer and admin local ports are 3000 and 3002 respectively.

## Release gate

Before approving deployment, complete the [ordered acceptance gates](../../docs/month-1/acceptance-validation.md): final offline validation, target/role/grants approval, disposable PostgreSQL migration/ACL testing, separately approved staging migration and live verification. The pending lockdown migration is application-table-only in `public`, uses **no FORCE RLS**, preserves owner bypass and does not create service/runtime grants. Review non-owner backend privileges/bypass/policies and inherited/view/RPC access explicitly.

Admin bootstrap is not an npm package script, seed, or startup step. Its default dry run still calls the live Supabase Admin API and PostgreSQL; see the [exact CLI contract](../../docs/month-1/targeted-completion-report.md#admin-bootstrap-cli-reviewed-not-executed). Raw Supabase signup must be disabled/hooked externally when closed; the registration UI/config/API provisioning gate is not sufficient.

Main reports 210 unit tests / 11 suites and 140 API tests / 8 suites passing with fixtures only; final browser reruns are pending, not acceptance. Build/smoke-test Docker if used, verify Node 22, and attach current lint/typecheck/build/audit and live results before release. The [dependency hardening report](../../docs/month-1/dependency-hardening-report.md) is historical; the [targeted completion report](../../docs/month-1/targeted-completion-report.md) tracks the current handoff.
