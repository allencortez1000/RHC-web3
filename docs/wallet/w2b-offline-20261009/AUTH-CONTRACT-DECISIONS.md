# RHC W2B-P1 — Shared Authentication and Wallet Contract Decisions

**Status:** DESIGN DECISIONS OPEN — NONE approved by the W2B-P1 offline coding task.  
**Owners:** Boss Allen (Thirdweb wallet), Boss Gal (RHC auth/backend), RHC management/security (provider, chain, privacy).  
**Baseline:** W2A `dcf2a81aa5158f2e56141dac8a2ebe60d7fd236b`, source-locked to `OFFLINE_REVIEW_ONLY`.  
**Scope here:** A synthetic local adapter/controller only. No real JWT, OIDC, wallet, backend link, chain, SDK runtime import or API endpoint is implemented.

## Actual implementation boundary

- RHC `users.id` is server-derived; it cannot be learned/authorized from a wallet address, browser user ID or Thirdweb `sub`. In this test-only controller, even a syntactically valid fake RHC UUID produces `rhcIdentityVerified=false`.
- Session state, mock provider-wallet state, chain, synthetic backend link observation, RHC Points and blockchain token are explicitly separate dimensions.
- The mock policy permits local fake connections only when all *synthetic fixture* prerequisites pass; this has **no relationship** to production authorization. `releaseLock` is always `OFFLINE_REVIEW_ONLY`; `sdkLoaded=false`, `walletEnrollmentExecuted=false`, `backendLinkVerified=false`.
- Type-only compatibility for Thirdweb 5.121.6 is captured by `w2b-offline/sdk-types.ts`; emitted JavaScript imports no Thirdweb SDK. The mounted W2A Account readiness panel remains disabled and does not import this mock lab.

## Joint decisions still required (all PENDING)

| ID | Contract or approval | Owner | Condition before connected W2B |
|---|---|---|---|
| D01 | Eligible invited RHC account statuses, staff denial | **Boss Gal** | Reviewed `ACTIVE`, invitation, consent and admin/staff denial matrix |
| D02 | Existing Supabase session remains only RHC API bearer authority | **Boss Gal** | No Thirdweb issuer/auth bypass of Supabase verifier |
| D03 | Provider auth: approved `strategy:'jwt'` versus reviewed `auth_endpoint` | **Both** | Written selected method and issuer strategy; public Thirdweb email signup not assumed |
| D04 | Dedicated provider ID token versus Supabase API access token | **Boss Gal** | Confirm JWT audience/claims and whether a separate token is minted |
| D05 | Stable opaque `sub` mapping and tenant/environment uniqueness | **Boss Gal** | Server-held mapping, collision/recovery decisions |
| D06 | Public HTTPS JWKS hosting and rotation | **Boss Gal + security** | Key-only public endpoint, approved DNS, no internal service exposure |
| D07 | Exact `iss/aud/alg/kid/exp/iat/nbf` | **Both** | Signed compatible claim schema and validation evidence |
| D08 | Logout, account disable, credential revocation, late callbacks | **Both** | Server/provider/session lifecycle and no customer A→B state bleed |
| D09 | Embedded/external wallet method allowlist | **Boss Allen + management** | Explicit approved methods; guest/social/email self-signup denied unless separately accepted |
| D10 | Embedded wallet account recovery/rotation semantics | **Both** | Lost device and account change policy with UAT cases |
| D11 | Provider Client ID, origins, billing/service health | **Boss Allen + billing** | Approved public ID/domains and service active/no suspension |
| D12 | Nonproduction chain and RPC allowlist | **Security + Allen** | Exact selected chain ID; synthetic `43210` is NOT an approval |
| D13 | EOA versus smart-account/AA and gas sponsorship | **Security + Allen** | No AA expense or implicit sponsorship in W2B |
| D14 | External wallet onboarding ownership and active chain | **Allen** | Explicit user consent and wrong-chain behavior |
| D15 | Browser storage/autoConnect and provider disconnect rules | **Allen + security** | Provider cleanup ownership; never reuse W1 mock handle rules as real disconnect |
| D16 | Future server one-time wallet proof/link | **Boss Gal** | Challenge, nonce, domain/origin/chain, signature verifier |
| D17 | EIP-1271 contract wallet or EOA-only proof | **Boss Gal + security** | Selected chain RPC/verifier and replay protections |
| D18 | Backend wallet uniqueness/link/unlink/conflict/recovery | **Boss Gal** | Versioned DTOs, DB uniqueness, audited identity lifecycle |
| D19 | Safe connected test scope, PII, retention, spending, cleanup | **Management/security** | Signed disposable identity plan and bounded connected window |
| D20 | W2A hard release-lock change and deployment | **Allen + security** | Separately reviewed connected W2B change and release GO |

## Backend portability blockers

The earlier Boss Allen standalone backend source handoff reports **database setup ready but API startup/connected smoke incomplete**. Source CORS origins `http://127.0.0.1:56402`, `:56403`, `:3000` differ from the usual frontend 3002/3003. The provisioning lock/never-started worker were retained. This offline development task did not reconcile or restart anything.

The standalone backend did **not** implement wallet challenge/proof/link or a durable wallet link model. These remain Boss Gal's responsibility, **not** backend APIs to fabricate in W2B.

## Signoff and next gate

- **Boss Allen:** review the offline W2B-P1 candidate; explicit internal acceptance remains pending.
- **Boss Gal:** respond to `08-BOSS-GAL-DECISION-REQUEST.md` in the earlier W2B readiness pack and deliver signed identity/JWKS/API decisions.
- **Security/management/billing:** confirm consent, project Client ID, provider service, nonproduction chain and safe connected-test authorization.
- **No GO for connected W2B, production, W3 wallet linking, token, transfers, signatures or blockchain operations.**
