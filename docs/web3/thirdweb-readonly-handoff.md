# Thirdweb read-only handoff

**Status: Read-only connector implemented and offline-tested; live testnet verification pending.** The user-authorized longer installation retry succeeded. Full connector compilation and CommonJS SDK offline tests pass: **52 tests, zero failures/skips**. API typecheck/build, 252 API unit tests and 41 intercepted browser tests were rerun successfully. Live provider traffic remains unauthorized; this is not “thirdweb fully integrated.”

Start with [readiness and approvals](integration-readiness.md), [implementation](thirdweb-readonly-implementation.md), and [actual tests/evidence](thirdweb-readonly-test-plan.md).

## What an operator can view now

From repository root, with the existing frontend dependencies available:

```sh
npm run dev:demo
```

- Customer: `http://127.0.0.1:3002/login`; choose Maya Santos or the existing local-demo customer shortcut. Visit `http://127.0.0.1:3002/future-technology` while signed in. The read-only panel says **SYNTHETIC DEMO — No live blockchain connection.**
- Admin: select Elena Garcia/system-admin via the shared demo login, then visit `http://127.0.0.1:3003/integrations`. Existing integration records remain separate from new synthetic read diagnostics.
- Anonymous Future Technology visitors see the existing roadmap only, not the token-data panel. Customer demo sessions cannot access admin diagnostics. Scoped staff cannot access server-wide diagnostics.
- No thirdweb key, connected API, Supabase, Redis or database is needed for this walkthrough. The launcher does not start the real API. The fixture has no real contract/explorer link or blockchain-success timestamp.
- Existing demo records are preserved. Do not run `demo:reset`, `test:demo` or general browser smoke against the working store for this milestone.

Focused isolated verification:

```sh
npm run build -w @rhc/types
npm run test:offline -w @rhc/web3
npm run test:demo:store
node scripts/web3-browser-test.mjs
```

These were run successfully during implementation; see recorded counts and the clearly separated retry results. SDK installation is now complete, and `npm run test -w @rhc/web3` also passes the full build and installed-SDK tests. Retry output is preserved in `connector-sdk-retry-results.txt`, `api-retry-results.txt` and `browser-retry-results.txt`.

## Operator-only testnet setup — do not execute until approved

1. **Local installation/build gate passed.** Following two initial 180-second timeouts, the authorized retry of `npm install --ignore-scripts --no-audit --no-fund` succeeded in about three minutes with a 900-second limit. The full connector test command passes 52 tests without skips. Review the recorded supply-chain/peer/deprecation warnings and reproduce the checks in the intended environment before activation. Do not use force/legacy peer bypass or delete the lockfile.
2. Obtain named product/security/provider-budget authorization for **one testnet contract** and read-only traffic. Review contract provenance and supported ABI; generic test tokens must retain their actual observed names, never “official RHC deployment.” No approved network or contract is supplied by this patch.
3. In a reviewed source change, populate `APPROVED_TESTNETS` in `packages/web3/src/config.ts` with that testnet ID/name, exact address, approved HTTPS explorer origin, supported optional `cap`/`paused` read list and approval reference. Rebuild/retest. Do not add mainnet or accept arbitrary runtime chains/URLs.
4. Use the variable names in `packages/web3/.env.example` to create an operator-managed, gitignored local backend environment file. **Never paste secrets into chat**, frontend `NEXT_PUBLIC_*`, System Settings, audit entries or integration metadata. Load `THIRDWEB_SECRET_KEY` locally using the backend secret manager/Node env loading. A provider key is not a signing wallet.
5. Set `RHC_WEB3_PROVIDER=thirdweb`, `ENABLE_WEB3_READ_PREVIEW=true`, `RHC_WEB3_ALLOW_NETWORK_READS=true`, `RHC_WEB3_NETWORK_MODE=testnet`; supply the approved chain/address and bounded timings. Ensure demo markers are absent. Separately set `RHC_WEB3_ACCEPTANCE_AUTHORIZED=true` only for an approved CLI check. Setting env values alone does not satisfy the source approval gate.
6. For the opt-in **single cold-process snapshot**, after operator approval, use Node `--env-file` with the literal path to the operator's local backend env file, followed by `packages/web3/scripts/testnet-read.cjs`. The script refuses missing authorization/invalid config before RPC and outputs only safe DTO/duration data. It has **not been executed against a provider** in this change.
7. Any connected UI walkthrough additionally requires separately accepted Supabase/Nest/Redis and existing bearer authentication. Do not bypass missing connected auth with demo credentials or launch hosted/database/bootstrap operations under this handoff. Public publication stays off.
8. Run the later 100-read/independent-comparison/outage plan only under separate documented approval. The single-read script is not that acceptance run.

No secret values, network choice, contract address, budget or approvals are invented here. The template carries no real credentials.

## Disable, failure isolation and rollback

- Set `RHC_WEB3_PROVIDER=disabled`, `ENABLE_WEB3_READ_PREVIEW=false`, and `RHC_WEB3_ALLOW_NETWORK_READS=false` in the operator-managed backend environment, then restart/reload the backend through the existing approved procedure. The provider also fingerprints relevant in-process config changes, aborts old reads and discards caches.
- Disabled/malformed Web3 configuration returns safe feature state; ordinary auth and permissions still apply. Existing login, reservations, documents, identity, payments and points routes do not depend on connector availability.
- Admin diagnostics read configuration/last outcome only. Opening Integrations cannot itself make a provider read. A new valid configuration is not marked healthy before a successful observation; expired cached results are not current health.
- To roll back source, review and reverse **only** the Web3 files/hunks listed in the implementation document, along with associated manifest/lock/build-order changes. Remove the Web3 module/controller registration and panel mounts before removing the package. Re-resolve dependencies normally. Preserve all unrelated work, particularly the pre-existing untracked inventory document.
- Do not reset/stash/clean the tree, delete lockfiles, reset demo data, revert databases or modify schemas/grants as a rollback shortcut. No migration or persisted business-data rollback is needed for this patch.

## Residual limitations and follow-ups

- Full SDK build and CommonJS offline checks now pass on Node 24.12.0. Live provider behavior, Node 22 acceptance, independent verification and supply-chain/security approval remain outstanding.
- Height-pinned RPC observations plus end-hash check are not independent chain verification/finality; accept or strengthen this during network-specific review.
- Cache/backoff is process-local, not cross-instance provider-budget coordination. Existing API rate limiting remains authoritative; very long provider Retry-After may suppress refresh for a long period.
- Admin session grants are flattened; mixed global/scoped staff may be hidden conservatively. Do not weaken server scope rules to work around that.
- Component-level Chromium/mobile/keyboard evidence is not full-site accessibility, cross-browser or live connected acceptance. Full Next builds were intentionally not run against potentially active development artifacts.
- API/demo contracts for other business domains retain their existing acceptance gaps. Points are fictional centralized ledger points, never blockchain allocations. Digital ID/certificates remain company-issued records, not government ID/title. Payment evidence is synthetic.
- Later wallet linking, transactions, ownership/financial activity and public/mainnet release require separate designs/approvals. If eventually authorized, persistence, reconciliation, custody and legal/privacy needs must be designed then; no speculative wallet/transaction tables were added now.

## Explicit operation record

- **No contracts were deployed.**
- **No blockchain writes were sent.**
- **No live blockchain/provider read was executed.**
- **No subscriptions were purchased or upgraded.**
- **No mainnet or public token release was performed.**
- **No hosted database connection, migration, seed, bootstrap, Docker operation or deployment was performed.**
- **No commit, push, branch switch, stash, reset, or demo-world reset was performed.**
