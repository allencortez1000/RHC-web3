# W03 — Security, Privacy, Scope and Blockers

**Status: DESIGN REVIEW ONLY.** No backend, live provider, wallet or token change is authorized here.

## Hard release blockers

- **RHC wallet-link ownership not established.** Current W1/W2B mock state cannot prove linked ownership; RHC backend has no accepted wallet challenge/link flow in the inspected project state. A provider-connected address is not proof of RHC account/tenant rights.
- **OFF-25 official token verification = FAIL/BLOCKED.** Synthetic comparator is accepted/published offline-only. Issuer-approved metadata, network, source/ABI/bytecode, contract address after deployment and corporate authority remain unverified.
- **W01-P2 connected provider tests = NOT RUN.** Current `APPROVED_TESTNETS=[]`, with no approved Thirdweb billing/RPC/security test scope. No direct balanceOf or transfer-indexer results exist in this review.
- **Points pilot read-only decision not enforced by all current UI surfaces.** `apps/customer-web/app/rhc-points/page.tsx` offers a demo redemption POST. CEO-reported November 10 intent is synthetic points view/history **only**, with business rules later. Require Boss Gal/product disposition before app UAT; do not silently enable transactions.
- **Token history has no accepted indexing/coverage service.** `Web3ReadResult.totalSupply` must never stand in for customer tokens. A request failure is not an empty history.
- **Backend identity, privacy and customer-scoped access must be proven connected.** Existing synthetic connected backend QA does not certify wallet linking, full frontend UAT, Thirdweb authentication, or production permission.

## Threat/control matrix — proposed

| Risk | Proposed mitigation and testing |
|---|---|
| IDOR / cross-customer token or points read | Derive `users.id` on server; never trust URL user_id or wallet address; A/B negative tests including cursor tampering |
| Thirdweb `sub` substitution as Supabase JWT | Strict RHC API bearer trust, issuer/audience/key checks; reject guessed provider identity or wallet signature as API auth |
| Address spoofing / signing replay | Future gated one-use wallet proof with nonce, user/domain/chain/intent, EOA/EIP-1271 policy, audited collision & expiration |
| Stale-response exposure | Clear account A before rendering B; generation-scoped response acceptance, cancellation, cache no-store, invalidate on logout/revoke |
| False zero balance or empty history | Distinguish unsupported, unavailable, disabled, stale, unknown from observed zero and covered empty page |
| Integer precision, units and price confusion | Raw uint256 as decimal **string**; separately typed `RHC_POINTS` Decimal(18,2); no implicit token/points/peso exchange |
| False token authenticity | Signed issuer specification, exact chain/code/address verification, dedicated OFF-25 gate; metadata similarity alone is insufficient |
| Reorg / indexing gaps | Store block/chain/contract provenance, status and coverage; fail closed, verify before crediting any observed transaction |
| Secret leakage | Never log/store JWT, wallet seed, Thirdweb Secret Key, private customer records, database connection strings; server-only credential |
| Abuse / service costs | Rate limits, source budget, bounded indexer reads, 429 Retry-After and 503 fail-closed; management funding approvals |
| Noncompliant feature activation | No buy/sell/swap/transfer/mint/approve/points redemption enabled in pilot unless separately authorized; source and backend controls |
| PII and public history | Company-scoped customer auth, minimal safe projection, masked display and internal-only UAT data; no public `users.id` lookup |

## Necessary reviews

- Boss Gal: approve versioned API identity, wallet link proof, ledger and backend restrictions; own DB migration/auth.
- Boss Allen: approve wallet display, Thirdweb provider/client identity, embedding mode, remote wallet cleanup/recovery.
- CEO/issuer/legal/security: approve token spec/economics/network, privacy/custody controls and separate APP/TOKEN release decisions.
- QA/UAT: verify actual connected customer journeys, not source presence or 48 planned offline cases.

**Avoidance:** This review shall not implement `POST /me/wallet/link`, rewrite `/rhc-points`, activate any provider or execute billing-linked RPC, sign a challenge, run Docker/DB or deploy a contract.
