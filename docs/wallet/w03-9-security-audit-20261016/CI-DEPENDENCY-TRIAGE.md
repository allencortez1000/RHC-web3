# RHC W03 Task 9 — GitHub CI runtime-dependency security triage

**Date:** 16 October 2026
**Status:** Verified read-only investigation; **NO vulnerability remediation installed**; GitHub CI remains FAIL.
**Owners:** Boss Gal — API, authentication, shared backend and CI/security; Boss Allen — Customer/Thirdweb wallet source. Shared transitive packages require coordinated review.

## 1. Source and exact CI checkpoint

GitHub repository: `allencortez1000/RHC-web3`
Draft PR: [#5](https://github.com/allencortez1000/RHC-web3/pull/5), `allen/w03-8-loopback-qa-20261015`
Published PR head: `b798ec095e27d1b1ed1a23766ba5865878712be8`
PR base: `allen/w03-3p-thirdweb-gated-qa-20261013` at `b1027028410c5948e2c449f3e2ee43907326a9f2`
CI run: [38835938182](https://github.com/allencortez1000/RHC-web3/actions/runs/38835938182), workflow job `116764957783`.

Actual CI results: Node 22 / Ubuntu runner; npm install PASS, `npm run audit:runtime` FAIL; Prisma generation, lint, TypeScript, API tests, both web builds, browser tests **SKIPPED**. The threshold remains `npm audit --omit=dev --audit-level=high`. Do not remove it, change the threshold, ignore failing exits or claim Vercel READY as security clearance.

CI printed **35 affected runtime packages: 1 critical, 5 high, 29 moderate**. On this workstation a separately executed public npm registry audit using npm 11.6.2, Windows/Node 24 and **the same lockfile** reported **34: 1 critical, 5 high, 28 moderate**. Both commands exited **1**. The one-package moderate discrepancy has **not** been explained or treated as remediation. Use the CI runner as the release gate and compare fresh reports after a real fix.

## 2. Verified dependencies and accountable workstreams

The dependency graph derives declared npm lockfile dependencies, optional and peer paths, including workspace links. It is a **conservative dependency-reachability approximation**, not proof a vulnerable API is executed or exploitable by a remote caller.

| Finding | Baseline package version(s) | Public registry candidate verified | Dependency origin / owner | Required before adoption |
| --- | --- | --- | --- | --- |
| **CRITICAL** `proxy-addr` (IP spoofing advisory) | 2.0.7 | **2.0.8** | `apps/api → @nestjs/platform-express → express → proxy-addr`; **Boss Gal backend only** | Ensure Express trusted-proxy semantics, IPv4-mapped IPv6 and forwarded-address authorization negative tests; update only via Gal review |
| **HIGH** `ws` (DoS / memory findings) | 8.18.0, 8.18.2, 8.18.3 in vulnerable nested nodes | **8.21.0** or newer; 8.22.0 exists | Thirdweb/Wagmi/WalletConnect shared through `apps/customer-web` and `apps/api → packages/web3`; **joint** | Align nested `ws` dependencies without forcibly downgrading Thirdweb; wallet lifecycle + backend compatibility tests |
| **HIGH** `js-yaml` via Swagger | 5.3.0 | **5.5.0** (5.4.x is affected by another advisory) | `apps/api → @nestjs/swagger@11.4.7 → js-yaml`; **Boss Gal** | Validate the existing Swagger/Nest 11 integration and YAML parsing; do not blindly apply suggested Swagger 12 breaking upgrade |
| **HIGH** `js-yaml` via OpenAPI tooling | 4.2.0 | **4.3.2** | `thirdweb → @thirdweb-dev/engine → @hey-api/openapi-ts → @hey-api/json-schema-ref-parser`; present in both Customer and API dependency graphs; **joint** | Validate generated SDK/OpenAPI assumptions and both Consumer + API builds |
| Moderate `multer` | 2.3.0 | **2.4.0** | `apps/api → @nestjs/platform-express@11.2.3 → multer`; **Boss Gal** | Investigate compatible `@nestjs/platform-express@11.2.7` and current exact overrides; aborted-upload/size/denial tests |
| Moderate `fast-uri` | 3.1.7 | **3.1.8** | Via `@x402/extensions` and AJV in both wallet and API dependency graph; **joint** | Check URL parsing/validation and API integration compatibility |
| Moderate `uuid` | Several 9.x / earlier nodes | **11.1.1** is published | Thirdweb/MetaMask transitive packages shared by Customer and API; **joint** | Major-version API/export compatibility; do not globally override blindly |
| Moderate `decode-uri-component` | Up to 0.4.2 | **0.5.0** is published | Thirdweb/WalletConnect/query-string shared; **joint** | Compatibility/recovery tests against malformed percent-encoding and URI handling |

**Important:** These are **published candidate versions**, not installed fixes or compatibility/acceptance test results. npm's automatic `fixAvailable` graph proposes **`thirdweb@0.13.56`** for several paths; that is incompatible with the pinned **Thirdweb v5.121.6** integration and is explicitly prohibited as an automatic fix. Other suggested `--force` changes include Swagger 12 and Nest/platform changes with unreviewed API effects.

Reference advisories:
- https://github.com/advisories/GHSA-jqcg-44mw-7w3h (proxy-addr)
- https://github.com/advisories/GHSA-96hv-2xvq-fx4p (ws DoS)
- https://github.com/advisories/GHSA-58qx-3vcg-4xpx (ws memory)
- https://github.com/advisories/GHSA-2883-xcg3-v3hh (js-yaml 4.x)
- https://github.com/advisories/GHSA-r3ph-w7gj-g6xm (js-yaml 5.x)
- https://github.com/advisories/GHSA-3pph-fpjx-jg34 (multer)
- https://github.com/advisories/GHSA-hrr3-gc8f-f4qj (fast-uri)
- https://github.com/advisories/GHSA-w5hq-g745-h8pq (uuid)
- https://github.com/advisories/GHSA-vcc3-ghjq-m6fr (decode-uri-component)

## 3. Exact next engineering assignments and gates

**Boss Gal — first unblock (API-owned critical):** Retrieve Gal's *current* approved worktree/branch/commit and ClickUp security status before touching source. Use a **new isolated backend-owned review branch**, preserve all previous worktrees and inspect active API dependencies. Trial the smallest compatible **`proxy-addr` 2.0.8** transitive fix. Run controlled lockfile resolution, clean npm install, API unit/E2E, trusted-proxy and user/company isolation negative checks, Prisma, API build and relevant browser tests; coordinate any shared lockfile change with Allen. No claim of DONE before internal review.

**Boss Gal — remaining backend-specific:** Confirm compatible Multer and Swagger/Nest dependency updates while preserving present Nest 11 behavior. Tests must include aborted uploads, YAML parsing, CI bootstrap, RBAC and API request handling. Any security-critical proxy evaluation should be tested with synthetic headers and access controls rather than live customer traffic.

**BG-01..12 shared identity and wallet contract gate:** Explicitly verify the approved RHC JWT/user/company identity, nonce proof, wallet link/revocation and synthetic Points read-only responses before connected end-to-end acceptance. No Thirdweb wallet address can substitute for RHC authentication.

**Boss Allen + Boss Gal — shared package graph:** Jointly review a scoped lockfile resolution for vulnerable nested `ws`, `js-yaml` 4.x, `fast-uri` and URI/UUID packages. Avoid root overrides that unknowingly alter API behavior. Preserve Thirdweb v5 and prohibit live wallet signing, transfers, token/payments and credential exposure. Test local provider connect/disconnect state, failure/cancel, route gates, Customer build, backend API and shared identity contracts in an approved synthetic environment.

**CI acceptance:** After approved implementation, run exactly the published `npm ci`, `npm run audit:runtime`, Prisma generation, lint, TypeScript, API unit/E2E, both builds and Playwright suites on the GitHub Linux/Node22 runner. Keep audit as mandatory failing gate until actually clear. Vercel preview success is supporting build evidence only.

## 4. Evidence from this task

Executed on Boss Allen's machine `DESKTOP-5TQ68F9` using the preserved PR #5 base (not an unrelated branch). External evidence:
- `AUDIT-RAW.json` — registry audit response and `AUDIT-EXECUTION.json` (nonzero exit).
- `OWNERSHIP-TRIAGE.json` — full per-package findings and conservative workspace scopes.
- `SELECTED-DEPENDENCY-PATHS.json` — reproducible shortest dependency paths.
- `REGISTRY-CURRENT-METADATA.json` and `CANDIDATE-VERSIONS.json` — public registry version/metadata checks.
- `BASELINE.json`, `EXECUTION-SCOPE.md` and final preservation/commit SHA-256 records.

This task made **no** package dependency change, **no** lockfile change, **no** CI workflow suppression, **no** Boss Gal backend edit, **no** provider/RPC call and **no** wallet transaction. It does not close the critical/high vulnerability gate, and it does not turn Customer Wallet TESTING into DONE.

## 5. Handoff contract

Thread: **NEW — W03-9 CI Runtime Dependency Security Triage**
Model: **GPT-6**, preferred thinking: **High**. Executed directly via ChatGPT and Remote Desktop Commander, not a Zed/Codex agent.
Project/root: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-9-dependency-security-triage-20261016`
Working branch: `allen/w03-9-dependency-security-triage-20261016`
Working worktree: same folder.
Exact base: `b798ec095e27d1b1ed1a23766ba5865878712be8`.
Allowed scope: read-only public dependency audit, registry version checks, graph analysis and documentation-only review.
Prohibited operations: backend/shared/CI code changes, forcibly fixing npm vulnerabilities, overwriting other worktrees, changing threshold, public deployment, real provider or blockchain operations.
Required tests: live registry audit (expected failing), metadata verification and Git preserve/diff receipts.
Required files: security triage matrix, evidence manifest, command/lock hashes, final Git handoff.
**Stop for owner approval:** shared/backend dependency changes require Boss Gal's participation and subsequent connected/full CI tests.
