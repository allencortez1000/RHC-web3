# W2A → Boss Gal Backend/Identity Handoff

**Status: SECURITY CONTRACT DECISIONS REQUIRED.** This handoff is a request for owner review; **no backend change, API endpoint, database model, migration, Docker action or authentication provider configuration occurred**.

## Ownership
- Boss Gal: Supabase JWT issuer/verifier, RHC `users.id`, authorization, wallet challenge/proof/link endpoints and persistent audit, backend business/security policy, database, provider readiness and production security.
- Boss Allen: Thirdweb frontend wallet UX, embedded/external wallet SDK, wallet-side chain approval/recovery and independent frontend testing.
- Shared scope: versioned auth/wallet identity contract, nonce/policy, consent, recovery and wallet subject-link proofs. Neither developer independently grants the other's trust boundary.

## Current facts
- Supabase JWT authenticates the **RHC application user**; a connected wallet address, embedded wallet/provider ID or public Thirdweb client ID does **not** prove RHC user ownership, wallet ownership, or authorization to a company/property/ledger.
- W2A loads **no** live Thirdweb SDK from the mounted Account readiness panel, and the hardcoded release stage is `OFFLINE_REVIEW_ONLY`.
- The portable/backend wallet handoff does not supply an implemented RHC wallet challenge/link controller or wallet-link model; business-domain wallet feature flags remain gated.
- RHC Digital ID and centrally maintained RHC Points remain separate from wallet/token identities.

## Decisions Boss Gal and Allen must explicitly approve for future W2B/W3
1. Choose whether Thirdweb Embedded Wallet will use RHC's existing Supabase JWT via approved remote custom auth, or another jointly reviewed recovery strategy. Preserve single-source RHC identity, invite-only policy, account status and consent. No independent public wallet sign-up.
2. If JWT custom auth: specify exact issuer, audience, algorithm, JWKS HTTPS location, `kid` rotation, expiry/revocation and provider subject mapping. Thirdweb remote verification cannot reach localhost/private API. Do **not** publish secrets, private profile/JWT, Redis/API Admin endpoints or unreviewed JWKS tunnels.
3. Establish binding to server-derived RHC `users.id` only after server-verified wallet possession; one-time challenge, nonce TTL, purpose, chain, domain, origin, replay protection, EOA and approved smart-account verification, wallet collision/recovery/unlink, audit and rate limiting.
4. Confirm approved chains, precise Thirdweb public Client ID, redirect domains/origins, session lifecycle, SDK version and account billing/service availability.
5. Define minimal account-facing linked/unlinked/pending/revoked/conflict projection, errors (401/403/409/429/503), and cache invalidation on logout/identity change; unknown cannot be treated as unlinked.
6. Establish safe disposable identity/network test plan with exact permitted endpoints, consent, recovery, cross-account cases and stop conditions. No live token, transfers, gas sponsorship or production mainnet actions without separate security approval.

## Handoff acceptance point
Once Boss Gal signs off on the API/identity design and connected backend readiness, Boss Allen can implement a **separately reviewed W2B actual provider adapter**; W2A cannot be activated by configuring browser env variables. Until then, the UI remains disabled and the broader Customer Wallet ClickUp task is incomplete.
