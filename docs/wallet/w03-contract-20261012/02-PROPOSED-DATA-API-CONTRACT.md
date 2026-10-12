# W03 — Proposed RHC Wallet / Balance / History API Contract

**Design v0.1 — DRAFT for Boss Gal / Boss Allen approval. No new API endpoints, DTO source files or database migrations have been implemented.**

## 1. Trust and ownership

Existing RHC API auth uses **Supabase-compatible user access JWT** validated by Boss Gal's server; `users.id` is a separate server-issued RHC UUID. Thirdweb account/wallet/provider ID, address and Digital RHC ID cannot replace that bearer token.

Proposed read path: RHC user session -> `GET /api/v1/me/wallet/overview` (server resolves its OWN RHC account) -> server-selected wallet-link state, **separately approved** provider token observation, and synthetic read-only points projection. API must not accept `user_id`, `rhc_id`, customer email, tenant or wallet address as a client-supplied lookup authority. Never expose backend Auth Admin keys or full JWT in DTOs.

**Existing**: `GET /api/v1/auth/session`, `GET /api/v1/me`, `GET /api/v1/web3/token` (contract metadata).  
**PROPOSED, NOT IMPLEMENTED**: `GET /api/v1/me/wallet/overview`, `GET /api/v1/me/wallet/token-transfers?cursor=...`, and `GET /api/v1/me/rewards/history?cursor=...`. Boss Gal chooses actual endpoint names and versioning. `GET /web3/token` is **not** a substitute for wallet overview.

## 2. Response envelope and read-only v0.1 proposal

Use existing API wrapper `{success:true,data,meta:{request_id}}`; ensure server `Cache-Control: no-store`, authenticated per-user permission checks, rate limiting and sanitized errors. Example below is an **invented shape**, not a captured response:

```json
{
  "success": true,
  "data": {
    "contract_version": "w03.proposal.v0.1",
    "wallet_view_mode": "READ_ONLY_INTERNAL_PILOT",
    "as_of": "2026-10-12T00:00:00Z",
    "rhc_user_id": "00000000-0000-4000-8000-000000000001",
    "scope_revision": "opaque-server-revision",
    "wallet_link": {
      "state": "unknown",
      "verification": "not_verified",
      "link_id": null,
      "chain_id": null,
      "address_display": null,
      "revision": null
    },
    "points": {
      "source": "rhc_synthetic_points_view",
      "status": "unavailable",
      "balance_decimal": null,
      "unit": "RHC_POINTS",
      "company_scope_id": null,
      "history": {
        "status": "unavailable",
        "items": null,
        "next_cursor": null
      }
    },
    "token": {
      "source": "none",
      "status": "not_approved",
      "chain_id": null,
      "contract_address": null,
      "official_identity": "not_verified",
      "wallet_address_display": null,
      "balance": {
        "status": "unavailable",
        "raw_base_units": null,
        "decimals": null,
        "formatted_text": null
      },
      "history": {
        "status": "unsupported",
        "items": null,
        "next_cursor": null,
        "covered_block_from": null,
        "covered_block_to": null
      },
      "observed_at": null,
      "block": null
    },
    "capabilities": {
      "can_connect": false,
      "can_link": false,
      "can_transfer": false,
      "can_approve": false,
      "can_trade": false,
      "can_redeem": false
    }
  },
  "meta": { "request_id": "00000000-0000-4000-8000-000000000002" }
}
```

All UUIDs/times above are **invented**. The response must never claim the fake data is current or official. `wallet_view_mode` is informational; backend feature/role checks still authorize everything. For RHC executive/staff access, require an explicit reviewed role policy; customer-wallet default should fail closed for admin/staff.

## 3. State and source semantics (normative design proposal)

| Field | Allowed status | Required interpretation |
|---|---|---|
| `wallet_link.state` | `unknown`, `unlinked`, `pending`, `linked`, `revoked`, `conflict` | `linked` only after server-proven possession and durable link; `unknown` for unimplemented/unreachable backend |
| `wallet_link.verification` | `not_verified`, `server_verified` | Browser connection/Thirdweb sub cannot make `server_verified` |
| `points.status` | `synthetic_read_only`, `observed`, `empty`, `disabled`, `unavailable`, `stale` | Separate centralized points display, no wallet balance conversion |
| `token.status` | `not_approved`, `disabled`, `unlinked`, `unavailable`, `stale`, `observed`, `unsupported` | No RHC officialness until issuer/version/source/chain independently approved and verified |
| `token.balance.status` | `observed`, `unavailable`, `unsupported`, `stale` | **Zero** only when `observed` with exact on-chain read; null otherwise |
| `points.history.status`, `token.history.status` | `observed`, `empty`, `unsupported`, `unavailable`, `stale`, `disabled` | Empty list means *verified complete query*, not unsupported provider |
| `source` | explicit enum per data family | Cannot coerce points, totalSupply or demo fixtures into on-chain per-address balances |
| `observed_at` / `block` | ISO timestamp, block number/hash/finality when available | Claims limited to last observation; no auto current/finalized guarantee |

`raw_base_units` must be an **unsigned decimal digit string**, not a JS number; `decimals` integer 0–255 only when validated; `formatted_text` is a presentational string from exact integer arithmetic. `RHC_POINTS` uses a separately reviewed **decimal string** consistent with the current Prisma `Decimal(18,2)` account/transaction fields, not ERC-20 decimals or token units. Do not aggregate across company scopes without approved backend ledger rules.

`token.history.items` should contain only verified per-address approved-contract events, with chain/contract, transaction hash, log index, block number/hash, transfer direction, raw base-unit amount and confirmation provenance; no price/fiat assumption. `points.history.items` should contain safe RHC ledger reference, ISO time, company scope, signed decimal delta, posted/pending/reversed status, reason and source projection; exclude private notes and avoid exposure of other users.

## 4. History endpoints — proposed security and pagination

Both endpoints are **GET, user-bearer authenticated**. `cursor` must be opaque, authenticated and bound to the same `users.id`, company scope (when applicable), linked wallet revision, chain/contract version, sort order and coverage/snapshot generation; tampered/expired/other-user cursor returns a sanitized 400/409 or restarts cleanly under a reviewed policy. Use bounded page size, monotonically stable order, exact range/cursor semantics and `Cache-Control:no-store`.

An `items:[]` response is allowed **only** when the source was queried successfully and coverage is known; if provider/indexer unavailable, return `status:unavailable`, `items:null`. Transfer-log history generally requires a **reviewed chain-indexer/provider contract**, not simply a single `balanceOf` call. Never interpret contract-wide total supply or synthetic receipts as the customer's token history.

## 5. API errors and idempotency boundary

Use existing envelope and request IDs:

- `401 UNAUTHORIZED`: absent/invalid/expired/revoked-or-banned user account. No cached prior data.
- `403 FORBIDDEN`: user/role/tenant/company/feature denial.
- `404 NOT_FOUND`: genuinely scoped resource not present; do not leak existence across users.
- `409 CONFLICT`: stale link revision, collision, changed account scope, cursor/link conflict (unless approved specific error contract).
- `429 RATE_LIMITED`: honor `Retry-After`; do not bypass through local fixture.
- `503 SERVICE_UNAVAILABLE`: Auth/DB/Redis/provider unavailable; fail closed with sanitized safe UI.
- `200 unavailable/unsupported` is allowed for an explicitly *supported API whose business capability is disabled*; never use zero to conceal no observation.

No `POST` link, transfer, redeem, mint or wallet action is approved by W03. A future owner-signed challenge/link operation must have its own design/implementation authorization.

## 6. Approval questions blocking implementation

Boss Gal must approve endpoint names, DTO versions, schema migrations, permission/consent requirements, company-scope semantics, JWT session trust, wallet-proof rules, points projection, result provenance, transaction indexing, cursors and error/status behavior. Boss Allen must approve UI contracts, Thirdweb policy and lifecycle. CEO/security/issuer must authorize token identity, network/source, read-only policy and any spending.

**No production shared type file, API source, database migration or wallet implementation is written under W03.**
