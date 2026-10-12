# W03 — Actual Implementation Inventory and Gaps

**Verification:** Source read-only at W03 exact base `72f1d68d87a4f0779c028813eb495f6c138cae2c`; see `SOURCE-SNAPSHOT.json` in the external evidence directory for byte hashes and 12 passing static source assertions.

| Concern | Inspected actual source | As-is finding | Release implication |
|---|---|---|---|
| Customer Account page | `apps/customer-web/app/account/page.tsx`, `components/demo-records.tsx` | Renders `DemoRecordsPage kind="account"` plus Thirdweb readiness; account metrics include centrally managed **synthetic** RHC Points and documentation, not customer crypto balances | Needs authenticated, genuinely sourced wallet view and explicit disconnected/unknown states |
| Thirdweb on Account | `wallet-thirdweb/ThirdwebWalletReadiness.tsx` | `data-w2a-state="disabled"`; public readiness only; no enabled embedded/external wallet actions | Does not prove enrollment or linked account |
| W1 foundation | `wallet-foundation/{types,controller}.ts` | Synthetic-only lifecycle, per-handle cleanup; `backendLinkVerified:false`, `tokenObservation:'not_configured'` | No real backend proof or wallet balance |
| W2B mock | `wallet-thirdweb/w2b-offline/{types,controller}.ts` | Release lock `OFFLINE_REVIEW_ONLY`, SDK not loaded, `backendLinkVerified:false`, `pointsBalance:'not_configured'`, `blockchainToken:'not_configured'` | Do **not** treat mock `linked` status as a server-verified wallet |
| Web3 DTO | `packages/types/src/web3.ts` | Observed **contract-level** name/symbol/decimals/`totalSupply`/cap/paused, chain and block; no `balanceOf(account)` or individual token transfer history | Total supply is NEVER customer's token balance; client history absent |
| Web3 API | `apps/api/src/modules/web3/web3.controller.ts`, `web3.service.ts` | Authenticated `GET /api/v1/web3/token` returns contract metadata snapshot; admin integration diagnostic is global `integration.view` | No authenticated per-customer wallet linked/balance/history endpoint shown here |
| Approved testnets | `packages/web3/src/config.ts` | Explicit `APPROVED_TESTNETS=[]` | Flags/env cannot authorize chain/provider |
| OFF-25 comparator | `packages/web3/src/off25-synthetic-identity.ts` | Unexported, synthetic-only, never marks a token official | Production token identity unverified |
| Frontend account session | `packages/ui/src/runtime.tsx`, `components/web3-preview.tsx` | Runtime obtains RHC application session, invalidates request scope on identity change; token panel requires authenticated ACTIVE customer | This is not backend wallet-ownership proof; full connected UAT pending |
| RHC Points | `apps/customer-web/app/rhc-points/page.tsx`, `components/demo-records.tsx`, Prisma `RewardsAccount`/`RewardsTransaction` | Synthetic/centralized points shown as number in demo; Prisma has reward models but no independently verified customer points view-only connected acceptance | Treat as separate **RHC Points**, no peso/crypto conversion |
| **Points pilot scope discrepancy** | `app/rhc-points/page.tsx` | A demo `POST /me/rewards/redeem` button remains in source | CEO-reported November pilot permits **view synthetic balances/history only**, not live earn/adjust/redeem. **Boss Gal + client must disposition/gate the demo action before pilot; W03 cannot edit it.** |
| Wallet-link persistence | `packages/database/prisma/schema.prisma`, W2B auth decisions | Reward models exist, but no `model WalletLink` in inspected schema and no accepted wallet-proof/link service established by this branch | Backend design/schema/endpoint requires Boss Gal's approval; do not fabricate |
| Existing backend handoff | Project `BACKEND-WALLET-INTEGRATION-CONTRACT`, W2B/W2A decisions | Supabase JWT belongs to RHC API trust boundary, `users.id` is app UUID, `rhc_id` is a digital reference, wallet provider subject/address distinct | Versioned owner-signed contract needed before real wallet integration |

## Required deliverables from original proposal

An authenticated RHC wallet must show **supported balances and transaction history**, and integrate with an approved deployed token when authorized. Contract metadata `totalSupply`, demo Points, and mock wallet lifecycle are different data sources and **do not fulfill** the customer-level balance/history requirement.

## Critical distinctions

1. **RHC user** = backend-generated `users.id`, derived from verified app bearer identity, never from wallet address alone.
2. **RHC Digital ID** = registry reference, not JWT, signing key or on-chain identity.
3. **RHC Points** = centrally managed decimal ledger values with company/account scope and synthetic initial pilot; **not a token, cash, or redeemable value**.
4. **RHC ERC-20** = distinct blockchain contract, with no approved official identity/address/source or live verification in this W03 baseline.
5. **Thirdweb connection** = provider-side access to a wallet; not automatically authenticated/linked to RHC user or associated with properties.
6. **Transaction history** = points ledger entries **OR** chain events, never a merged unlabeled timeline with common monetary units.

**Scope boundary:** no claim about Boss Gal's latest independently developed backend source beyond the explicit reviewed Project handoff. The local GitHub branch and Project backend handoff may represent different worktrees/commits; the current backend owner must reconcile them.
