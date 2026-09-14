# Dependency and configuration hardening handoff

Historical dependency-owner snapshot: **2026-09-14**, before the final parallel application work. Status at that snapshot: **dependencies stable; application acceptance pending**.

**Current-status supersession:** preserve the version/audit/command evidence below as historical observations, not current blockers or final validation. Main now reports 210 unit tests / 11 suites and 140 API tests / 8 suites passing with fixtures only; final frontend reruns remain pending (approximately 55 customer / 65 admin). JWT/Admin identity confirmation, management endpoints, authenticated rate-limit wiring, and substantive fixture suites are now implemented. All four migrations remain pending, and staging migration/deployment approval has not been granted. See [the targeted completion report](targeted-completion-report.md) for current state and final-result placeholders.

## Scope and coordination

This pass owns root/workspace manifests and lockfile, ESLint/Next/TypeScript/Playwright configuration, CI, Docker, and these documents. No application source, application tests, Prisma schema/migrations, or API bootstrap implementation was edited by this pass. Parallel owners were actively changing application code during validation.

No deployment, migration, seed, identity bootstrap, or Git commit was performed. Prisma generation was deliberately left to main after its `auth_email_confirmed_at` schema work. Install commands used `PRISMA_SKIP_POSTINSTALL_GENERATE=true` or `--ignore-scripts` while dependencies were being resolved. Main was notified when the lockfile and audit were stable, before broad validation.

## Exact resolved versions

Versions below come from the final lockfile and installed dependency tree, not just manifest ranges.

| Package/group                                            | Resolved version                   | Decision                                                                 |
| -------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `@nestjs/common`, `core`, `platform-express`, `testing`  | **11.2.3**                         | Exact coherent Nest 11 pins                                              |
| `@nestjs/swagger`                                        | **11.4.7**                         | Nest 11-compatible patched release                                       |
| `@nestjs/throttler`                                      | **6.5.0**                          | Preserved                                                                |
| `@nestjs/cli`                                            | **11.0.24**                        | Patched tooling, TypeScript 5.9.3                                        |
| `next`, `eslint-config-next`, `@next/eslint-plugin-next` | **15.5.25**                        | Matching Next 15 runtime/lint line; no Next 16 jump                      |
| `react`, `react-dom`                                     | **19.3.0**                         | Preserved existing locked React 19 versions, now exact pins              |
| `typescript`                                             | **5.9.3**                          | Exact pin                                                                |
| `@typescript-eslint/parser`, `eslint-plugin`             | **8.70.0**                         | Both peers support TS 5.9 and ESLint 8.57                                |
| `eslint`                                                 | **8.57.1**                         | Last ESLint 8 patch; legacy config retained                              |
| `@types/node`                                            | **22.20.2**                        | Node 22 tooling alignment                                                |
| `@types/express`                                         | **5.0.6**                          | Express 5 types                                                          |
| `@types/react`, `@types/react-dom`                       | **19.1.16**, **19.1.9**            | Existing React 19 type packages retained                                 |
| `@prisma/client`, `prisma`                               | **5.22.0**                         | Existing lock resolution pinned together; no Prisma major upgrade        |
| `@supabase/supabase-js`                                  | **2.116.0**                        | Existing lock resolution retained; requires Node 22+                     |
| `@playwright/test`                                       | **1.63.0**                         | Existing lock resolution pinned; satisfies Next's `^1.51.1` peer         |
| `multer`                                                 | **2.3.0**                          | Verified scoped override                                                 |
| `postcss`                                                | **8.5.28**                         | Direct frontend pins plus verified override for Next's old pin           |
| `tailwindcss`, `autoprefixer`                            | **3.4.19**, **10.5.6**             | Compatible existing lines retained                                       |
| `js-yaml`                                                | **5.3.0**, **4.3.2**, **3.15.2**   | Swagger, ESLint/tooling, and Jest branches respectively; all audit clean |
| `jest`, `ts-jest`, `supertest`                           | **29.7.0**, **29.4.12**, **7.2.2** | Existing compatible test tooling                                         |

The preparation machine ran Node **24.21.0** / npm **11.19.0**. Project engines now require Node **>=22.13.0** and npm **>=10.0.0**; CI/Docker select Node **22**. The lower supported environment was not executed locally. ESLint 8 is retained for a focused legacy-config-compatible upgrade; a future flat-config/ESLint major migration is separate work, not implied by a clean audit.

## Audit: runtime versus development

| Audit scope                         | Before                                     | After                                   |
| ----------------------------------- | ------------------------------------------ | --------------------------------------- |
| `npm audit --omit=dev`              | **8 high, 1 moderate**, 0 critical/low     | **0 vulnerabilities at every severity** |
| `npm audit` (runtime + development) | **12 high, 7 moderate, 1 low**, 0 critical | **0 vulnerabilities at every severity** |
| Development findings remaining      | Included in full audit above               | **0**                                   |

Counts are npm package-level findings, including propagation through dependent packages; the difference between full and runtime reports is not a distinct-CVE count. Moving Next ESLint tooling out of frontend runtime dependencies also corrects runtime classification. A clean audit is a registry snapshot, not proof of application security.

The root `audit:runtime` command is `npm audit --omit=dev --audit-level=high`, used by CI as a high/critical gate. Both raw audits also returned zero findings at the final snapshot. No `npm audit fix --force`, forced install, legacy peer bypass, or incompatible Nest/Next major jump was used.

## Deliberate upgrade and override decisions

1. Aligned Nest 11 framework packages and Swagger; removed redundant root runtime Nest packages from development dependencies. Updated root CLI/TypeScript/ESLint tooling and matched Next's ESLint version.
2. Kept Next 15 and the already locked React 19 pair. Kept Prisma on 5.22.0 and existing Supabase/Playwright resolutions. Raised Node support to reflect actual installed SDK/tooling requirements.
3. Refreshed vulnerable `js-yaml` within consumers' declared compatible ranges using `npm update js-yaml --ignore-scripts`.
4. Retained only these verified overrides:
   - `@nestjs/platform-express@11.2.3 -> multer@2.3.0`: the latest Nest 11 adapter still pins 2.2.0, which the audit flags for multipart denial-of-service/limit-bypass issues. The same-major override passed an actual Nest HTTP upload, file-size rejection (413), and unexpected-field rejection (400), using the installed testing module, file interceptor, and Supertest.
   - `postcss@8.4.31 -> 8.5.28`: Next 15.5.25 still pins 8.4.31. The override targets that exact old package version, rather than unrelated dependencies. Next's resolved PostCSS passed Tailwind utility generation and Autoprefixer checks; customer Next production compilation also succeeded before application lint failures.
5. npm initially retained the old nested PostCSS entry under a parent-scoped override. Targeted updates and deduplication did not replace it; the exact old-version override did. The final `npm install` regenerated a valid lockfile; `npm ls postcss multer` and the framework/peer tree showed no invalid entries.

Remove/reassess each override when the parent release adopts a safe native dependency. Do not copy these overrides forward blindly across framework upgrades.

## Configuration and behavior changes

- Customer dev/start and Playwright URL: **3000**. Admin remains **3002**. Both Next configs explicitly trace from the repository root.
- Frontend lint uses `eslint . --ext .js,.jsx,.ts,.tsx`, not deprecated `next lint`. Next-specific rules apply to frontend files; TypeScript rules use v8. Generated outputs are ignored, and root Next plugin detection was checked.
- Frontend TypeScript uses ESNext/bundler resolution and explicit UI/type source aliases. Backend/shared TypeScript no longer maps workspace imports to sibling source trees.
- API build fixes `rootDir=src`, emitting **`apps/api/dist/main.js`**, matching `main` and `start`. Rebuild shared libraries before API development/build/typecheck after a clean install or shared-code changes.
- Database library build uses a separate `tsconfig.build.json` and emits **`packages/database/dist/index.js`**. Its existing typecheck still includes Prisma seed TypeScript; this change does not run or modify seed code.
- Root `build:all` builds shared libraries once rather than three times. Root `typecheck` first builds shared libraries so clean-checkout resolution works.
- Removed successful `echo` test placeholders and API/Playwright pass-with-no-tests switches. Root `test` explicitly invokes API Jest; it does not claim frontend unit coverage.
- CI uses Node 22 and deterministic install, audits runtime dependencies, generates the client, runs lint/typecheck/API Jest/API E2E, builds, and executes both browser suites. No global mock mode; `NODE_ENV=test` is restricted to API test steps.
- Playwright forbids focused tests in CI, does not reuse CI servers, starts already-built CI artifacts, and retains failure traces. Local Playwright still builds before starting unless reusing a running server.
- Docker installs with all workspace manifests and the lockfile, builds/generates before pruning dev dependencies, uses Node 22 Debian/OpenSSL, runs unprivileged, and starts the correct API path. Local secrets/build outputs are excluded by `.dockerignore`. Render commands run from repository root and do not migrate/seed.

## Validation evidence and limits

Passed:

- Final `PRISMA_SKIP_POSTINSTALL_GENERATE=true npm install`.
- `npm audit --omit=dev` and `npm audit`: **zero**.
- `npm ls` checks for framework, React, TypeScript, ESLint, Multer, and PostCSS compatibility; workspace direct-dependency listing.
- `npm ci --dry-run --ignore-scripts`: lockfile consistency check only, **not** a fresh installed-image test.
- Builds for `@rhc/config`, `@rhc/types`, `@rhc/shared`, `@rhc/validation`, and `@rhc/ui` at the time they ran.
- Bounded in-memory Nest/Multer HTTP compatibility checks and Next-resolved PostCSS/Tailwind/Autoprefixer processing.
- Both Playwright `--list` commands discovered one smoke test each at the time of checking; browsers were **not** executed.
- Root Next ESLint plugin detection; `git diff --check`.

Observed blockers during parallel application edits (not changed here):

- `NEXT_TELEMETRY_DISABLED=1 npm run build -w @rhc/customer-web` compiled production code successfully, then failed frontend lint. The observed customer errors were undefined `DigitalIDCard` (lines 46/131) and `PropertyAssetCard` (line 173) in `app/dashboard/page.tsx`, plus a raw internal `<a>` in `app/login/page.tsx` (line 28). There were also five unused-import warnings in the dashboard. These are point-in-time observations, not assertions about the owners' final source.
- Customer CLI lint reported those same errors. Admin CLI lint reported a raw internal `<a>` in `apps/admin-web/app/page.tsx` (line 19).
- A Next plugin-detection warning during the build was addressed in configuration and checked through ESLint's config API; the entire application build was not rerun afterward.
- `docker --version` failed because Docker is not installed/available; no image build or container startup was tested.

Deferred deliberately: Prisma generation, database/API builds, API application test execution, admin production build, real browser execution, Node 22 clean install/build, full `validate`, and live Supabase/Redis acceptance. This avoids racing schema/application owners or presenting partial validation as final acceptance. No schema-dependent failures were papered over with mocks or lint/build suppression.

## Historical main/owner handoff

At this dependency snapshot, main was asked to finish the `auth_email_confirmed_at` schema/client integration and run [testing.md](testing.md); application lint fixes and substantive API/security assertions were still assigned to parallel owners. These are historical assignments, not current missing-implementation claims. The field, real authentication/management paths, authenticated limits, and fixture-backed security suites are now present; refer to the current completion report rather than reopening those old TODOs.

Run a fresh Node 22 install/build and container smoke test before release. Keep migration/seed/deployment approval separate from this preparation handoff. The current audit and focused compatibility checks are not authorization to deploy.
