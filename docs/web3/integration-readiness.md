# RHC thirdweb read-only readiness

Evidence date: 2026-09-30. **Local implementation only; no release or provider acceptance.**

## Starting identity and authority

- Starting branch: `redesigned-branch`, tracking `origin/redesigned-branch`.
- Starting HEAD: `28dea6bcbf9e42fa8bc8bfded79bbc728f1dc325` (`Refresh RHC ecosystem presentation layer`).
- Starting tree: untracked `docs/current-system-inventory.md`; no staged/tracked modifications or unresolved conflicts. Preserved this document. Because the tree was dirty, did **not** create/switch to `feature/thirdweb-readonly-poc`, stash, reset, commit, or push.
- No project `AGENTS.md` found. Inspected project status, demo guide, route coverage, design system, redesign architecture, validation report, phase-2 handoff, Month 1 testing/acceptance boundaries, and relevant source.
- The current user request authorizes scoped local implementation and offline checks, not hosted operations. Existing `docs/phase-2-handoff.md` and `docs/month-1/testing.md` retain deployment/database/provider acceptance holds. Historical test counts are not this change's results.
- No approved testnet/contract record was located in the inspected repository references. `packages/web3/src/config.ts` therefore ships an **empty** `APPROVED_TESTNETS` list. Environment values cannot create an approval.

## Discovered baseline

| Item | Actual value |
| --- | --- |
| Package manager | npm workspaces (`apps/*`, `packages/*`), `package-lock.json` v3 |
| Host used | Node 24.12.0; npm 11.6.2; Windows |
| Repository engines | Node >=22.13.0; npm >=10; Node 22 not tested in this change |
| Frontends | Next 15.5.25, React/React DOM 19.3.0 |
| Backend | Nest 11.2.3; TypeScript 5.9.3; CommonJS/Node resolution; ES2022 |
| Existing prefix | `apps/api/src/main.ts`: `api/v1` |
| Shared build order | config → types → shared → validation → UI → database |
| New API build order | existing shared build → web3 → API; frontend builds do not require web3 |
| Existing runtime | `packages/ui/src/runtime.tsx`: bearer-authenticated API or explicit isolated demo adapter |
| Resource states | existing `useResource` / `ResourceStatus`; no parallel frontend state framework |
| Demo hub/store | customer `/api/demo/**`; `app/lib/demo/router.ts`, `store.ts`, `seed.ts`; `.rhc-demo/world.json` |

No broad `build:shared` or database build/generation command was run. Individual inspected TypeScript builds/checks were used. No Next build was run, avoiding collisions with existing `.next` development output.

## Existing surfaces and permissions

| Surface | Source | Access |
| --- | --- | --- |
| Future Technology `/future-technology` | `apps/customer-web/app/components/meridian-public/future-technology.tsx` | Public roadmap in actual `app/providers.tsx`; new preview separately authenticated |
| `/token` | Existing redirect | Public alias, unchanged; not token publication |
| Admin `/integrations` | `apps/admin-web/app/integrations/page.tsx`, `app/admin-data.tsx` | `integration.view`; new server-wide diagnostics require a global grant |
| `/feature-flags` | `app/feature-flags/page.tsx` → `AdminModule` | `feature_flag.view`; existing management requires `feature_flag.manage` |
| `/system-settings` | `app/system-settings/page.tsx` → `AdminModule` | `system_settings.view` |
| `/audit-logs` | `app/audit-logs/page.tsx` → `AdminModule` | `audit.view` |
| `/reports` | `app/reports/page.tsx` | Route accepts one of `reservation.view`, `customer.view`, `integration.view`, `audit.view`; individual reports filter by capability |

The older route document calls Future Technology protected; actual source is public. No public-route allowlist was edited. `/verify/rhc-id/[token]` is unchanged.

## Current completion boundary

Implemented and offline-tested: disabled/fixture configuration, source isolation, cache/retry/timeout core, Nest auth/permissions, demo seam, UI presentation, and the installed thirdweb SDK read path. **Read-only connector implemented and offline-tested; live testnet verification pending.**

`thirdweb@5.121.6` was verified against official documentation and published version-pinned source/types. After two initial 180-second install timeouts and a successful lockfile-only update, the user authorized a longer retry. `npm install --ignore-scripts --no-audit --no-fund` succeeded in about three minutes with a 900-second limit. The full connector TypeScript build and CommonJS SDK execution now pass: **52 tests, no failures or skips** (34 core tests, 17 SDK scenarios and one parent test). The API build/typecheck, **252 API unit tests**, and **41 intercepted browser tests** were rerun successfully. The previous three missing-import diagnostics are cleared. See the retry evidence linked in the test plan; no live provider traffic occurred.

### Supply-chain notes

Only one new runtime SDK dependency was requested: exact `thirdweb: 5.121.6` in server-only `@rhc/web3`; no legacy `@thirdweb-dev` or starter generator. The published SDK includes substantial wallet-related transitive dependencies even though no wallet APIs are used here. Lock comparison: **605 entries added, none removed, no existing package versions changed**. npm also recalculated dependency flags.

Installation warnings included deprecated MetaMask/WalletConnect packages, UUID versions, `@paulmillr/qr`, `@hey-api/client-fetch`, and Safe gateway types. npm reported `valtio@1.13.2` → `use-sync-external-store@1.2.0` React peer compatibility (expects React 16/17/18; repository uses 19.3.0). No `--force`, `--legacy-peer-deps`, lock deletion, or engine bypass was used. No fresh vulnerability-audit claim is made. Installation is now complete; dependency/security review remains an activation prerequisite. The successful retry still emitted UUID deprecation warnings.

## Separate decisions still required

| Owner role (person not assigned) | Required decision/evidence |
| --- | --- |
| Product/scope owner | Confirm bounded private read preview; no change to scope/progress weights or tokenomics |
| Network/contract owner + security | Select one EVM testnet, exact contract, official/generic-token identity, reviewed optional ABI methods, explorer origin and approval reference |
| Provider/budget owner | Approve RPC request budget and whether/how test runs consume the account allowance |
| Backend operator | Local secret provisioning and explicit network-read authorization; never secrets in chat or public env |
| Security reviewer | Review the passing SDK/CJS evidence; complete supply-chain, auth and transport review, rate/backoff and block-provenance acceptance |
| Platform/identity owner | Accept connected Supabase/Nest/Redis prerequisites independently of demo behavior |
| Legal/content/release owners | Any future public publication, mainnet, wallet linking, ownership/financial representations; none authorized here |

Wallet enrollment, signing, treasury, contracts/deployment, transactions, token allocations, financial activity, migrations, and hosted operations remain outside this milestone. RHC Points and payment evidence remain unchanged synthetic business records.
