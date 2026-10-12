# W03 — Boss Allen to Boss Gal: Backend Contract Decision Request

**Draft handoff, NOT SENT.** Client/management choices remain additional owners.  
**Purpose:** Align one versioned wallet/account API and prevent two developers implementing divergent identity, wallet link, or points contracts.

| Ref | Decision requested of Boss Gal (backend owner) | Expected result | Stage |
|---|---|---|---|
| BG-01 | Confirm current authoritative session JWT issuer/audience/roles `users.id` mapping, eligibility and verified customer status; use current connected accepted evidence | Versioned Auth contract and verification limits | PENDING |
| BG-02 | Approve per-customer wallet-link model with company/tenant and RHC UUID keys; clarify multi-wallet per user, one wallet across users, revocation/relink/recovery and uniqueness | Model/constraints proposal (no migration until approved) | PENDING |
| BG-03 | Define owner of challenge, nonce, verification and replay audit (EOA vs EIP-1271), strict account/domain/chain binding and one-time custody | Reviewed proof-of-possession contract | PENDING |
| BG-04 | Decide the Thirdweb custom-auth trust boundary; distinguish provider identity `sub` from Supabase API bearer JWT | Exact JWT/JWKS decisions, no token substitution | PENDING |
| BG-05 | Select `GET /api/v1/me/wallet/overview` or alternative; confirm JSON envelope, no caller-target user ID, no-store, backend RBAC and limited DTO | Approved `w03.v1` schema and endpoint name | PENDING |
| BG-06 | Select separate RHC Points summary/history projection; specify account/company scoping and `Decimal(18,2)` conversion to display strings | Safe read-only points contract, no token conversion | PENDING |
| BG-07 | Address current frontend `/rhc-points` demo `POST /me/rewards/redeem` button against CEO-reported November **view-only** intent | Explicitly gated/hidden demo action for initial pilot; backend owns feature rule | PENDING |
| BG-08 | Confirm wallet token balance source/approved chain, contract and precise availability/staleness/zero semantics; issuer signed spec is separate client gate | DTO semantics; no live source assumption | PENDING |
| BG-09 | Define token transfer-history source/coverage/indexer, finality/reorg handling, pagination/cursor authorization and spending/quotas | Approved bounded read design | PENDING |
| BG-10 | Validate account A/B switch, logout, banned/pending users, role/company changes and request invalidation in connected browser / backend | Negative and UAT test plan, current evidence gaps | PENDING |
| BG-11 | Confirm errors 401/403/404/409/429/503, no unauthorized fallback, safe request IDs and sensitive-field redaction | DTO/error matrix | PENDING |
| BG-12 | Supply named synthetic test users/environments, CORS/origins, approved authorized test operator window, rate/Redis expectations | Written, time-bounded integration approval | PENDING |

**Shared control:** Boss Gal implements/owns Auth, DB, provider backend, rewards ledger and protected APIs. Boss Allen implements/owns Thirdweb/wallet connection, wallet-side UX and provider-side read adapter after separate scope approval. No developer edits the other's working branch/worktree without a signed versioned contract.

**Current backend documentation read-only baseline:** Project `BACKEND-WALLET-INTEGRATION-CONTRACT` describes a local connected core with real Supabase-compatible JWT/PG17/Redis QA but **no accepted wallet-proof/link endpoint**. This is a previous owner handoff, not evidence the newest backend branch was executed under W03.

**Please return:** annotated accepted v0.1 DTO, approver/role/date, blocked decisions and exact testable linked backend revision. Do not send any private JWT, provider API key, seed, password or real customer records in these notes.

**No connected development or test is initiated by sending/approving this draft alone.**
