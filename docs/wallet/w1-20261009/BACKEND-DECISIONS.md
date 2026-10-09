# Boss Gal ↔ Boss Allen — Wallet/backend contract decision pack

**Status: PROPOSAL FOR REVIEW, NOT IMPLEMENTED OR APPROVED.** No API, Prisma, Supabase, Redis, Docker or backend code was changed by W1.

## Locked boundaries

- Boss Gal owns authentication, API authorization, database persistence, customer/property/business rules, wallet proof validation, audit, security and deployment.
- Boss Allen owns wallet-side Thirdweb SDK, connection lifecycle, smart-contract integration and user consent presentation.
- The current RHC API accepts verified Supabase user bearer tokens, not arbitrary wallet addresses or Thirdweb provider IDs. JWT `sub` is Supabase user identity, whereas RHC `users.id` is the application user UUID. RHC Digital ID is a separate internal identifier.
- A successful wallet connection is NOT login, RHC verification, property ownership, backend wallet linking or rewards eligibility. No client-supplied wallet string can grant authority.

## Required jointly approved API/security contracts BEFORE wallet linking

1. Choose an explicit wallet authentication method and supported chain policy. If SIWE-like challenges are selected, bind nonce (one-time, random), domain, origin, chain ID, account, issue/expiry, request session and intended action. Handle EOA and contract-wallet verification only as expressly supported and tested.
2. Verify possession server-side, consume each challenge atomically once, reject replay, cross-origin, cross-chain, expired, account-mismatch and spoofed signature attempts. Rate-limit and audit failed attempts without exposing secrets.
3. Link a verified wallet subject to the **server-derived RHC `users.id`**, enforce address uniqueness/collision and no cross-customer linkage, record history, business verification and revocation; client-provided IDs are not authority.
4. Agree link/unlink/rotation/recovery, reauthentication, lost-device account recovery, idempotency, pending/conflict states, and minimally consented public address disclosure.
5. Approve and version read projections. A frontend `unknown` state is not `unlinked`; a revocation/recovery response must invalidate old cached wallet bindings immediately.
6. If Thirdweb remote custom JWT authentication is chosen, agree exact issuer/audience/JWKS (public asymmetric HTTPS, not Windows localhost), kid/algorithm/rotation, subject mapping, failure behavior and provider costs. Publishing public JWKS requires a separate security/network approval. Do not swap current Supabase verifier URLs for a Thirdweb issuer.
7. Separate on-chain RHC token balance/transaction reads from centralized RHC Points. No gas sponsorship, trading, transfers, mint, public sale, custody or payment activation by UI flag alone.

## Required Boss Gal deliverables

- Signed/approved versioned challenge/link API specification, request/response DTOs, error codes, HTTP status and authorization matrix.
- Server-side backend test matrix for race, replay, collision, denied user, chain and origin mismatch, permission changes, stale session and provider outage.
- Exact connected API base and CORS origins, approved safe test identities, privacy/consent controls, and internal acceptance criteria.
- Safe same-instance backend recovery and connected auth/business acceptance, independently of W1's offline tests.

## Current W1 effect

**None on the backend.** No speculative wallet-link table, backend route, custom JWT issuer, token contract or wallet creation was implemented. Hold future W2 live integration until required approvals and verified backend readiness.
