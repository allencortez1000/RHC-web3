# W03-2C — Proposed W03 Contract Mapping and Owner Decision Matrix

**Status:** DRAFT / unapproved. This is not a signed implementation contract, legal approval or token issuer verification. Boss Gal retains backend authority; Boss Allen owns wallet and Thirdweb-side implementation.

| BG gate | Current mock behavior | Required before connected implementation |
|---|---|---|
| BG-01 | Only synthetic customer IDs, session epoch and revision; no JWT accepted | Server-authenticated RHC `users.id` and role/tenant mapping approved |
| BG-02 | Simulated link state, never backend link | Durable unique wallet-link model, revocation/recovery audit |
| BG-03 | No real challenge/signature | Owner-verified one-time nonce, EOA/EIP-1271 and replay policy |
| BG-04 | Thirdweb lifecycle simulator only, no provider sub trusted | Separate RHC bearer auth vs Thirdweb trust boundary |
| BG-05 | Strict `w03.proposal.v0.1` response decoder | Approve endpoint, envelope, source/version, errors and no-store |
| BG-06 | `rhc_synthetic_points_view`, decimal strings, synthetic coverage | Authoritative scoped ledger-projection/historical DTO |
| BG-07 | Six capabilities always FALSE | Hide/disable real `/me/rewards/redeem` action for Nov 10 pilot |
| BG-08 | Token `source:none,status:not_approved`, null balance | Issuer-signed OFF-25 identity, network/address and source |
| BG-09 | Token history `unsupported`, null results | Indexed/source-verified events, bounded cursors, reorg/finality |
| BG-10 | Mock generation fence + explicit account switch clear | Connected role/user/tenant negatives, logout/cached state |
| BG-11 | Mock errors mapped to unavailable (401/403/409/429/503) | Approved sanitized API codes and request-ID/retry rules |
| BG-12 | Invented `synthetic-customer-A/B`, no actual provider | Named approved synthetic QA identities, exact backend SHA and time-bounded access |

## Offline envelope (NOT canonical API)

- Source: `w03-2c-synthetic-in-memory` plus `contract_version:w03.proposal.v0.1`.
- `rhc_user_id` must match a synthetic scope; `scope_revision` must match the current source revision.
- `points.source=rhc_synthetic_points_view`, `points.status=synthetic_read_only`, `balance_decimal=125.00` or `0.00` (invented) or null when unavailable.
- `wallet_link.state=linked` only when mock claims synthetic proof, downgraded explicitly in UI to **NOT live verified**. No live wallet address accepted.
- `token.source=none`, `status=not_approved`, `contract_address=null`, `balance.raw_base_units=null` and `history.status=unsupported`.
- `capabilities.can_connect/link/transfer/approve/trade/redeem=false`; all true values rejected.

**Next gate:** Joint versioned BG-01..BG-12 approval, then a NEW separately scoped branch for real read-only adapters under approved Auth and safety gates. Never activate the mock source as a fallback on live errors.
