# W03-2C — Security and Non-Production Boundary Review

**Verdict:** Suitable for continued **offline prototype** review only, not connected wallet or launch.

## Verified controls

- Runtime decoder accepts only invented `w03.proposal.v0.1` payloads stamped `w03-2c-synthetic-in-memory`, with exact synthetic UUID-like identifier, session generation and revision scope. Real RHC user IDs and chain/contract IDs are rejected.
- Mock transport is registered in a module-local `WeakSet` and cannot be replaced by an unregistered transport object without failing. This limits accidentally enabling live paths in this checkpoint; it is **not** a production security boundary.
- The connected backend route is intentionally absent. `refuseConnectedBackend()` produces unavailable status. No fetch, browser storage, secrets, JWT use, service credentials, RPC, indexer, provider or Thirdweb SDK imports.
- Capability booleans must all be exactly false; attempts to enable `connect/link/transfer/approve/trade/redeem` are rejected. Static previews contain no forms, scripts or wallet operations.
- Tokens must have `status:not_approved`, `source:none`, null chain/contract/amount and unsupported history; unknown/stale/unavailable is never rewritten as a synthetic verified on-chain zero.
- The synthetic `server_verified` input is **explicitly downgraded to a `server_verified_simulation` display label**. It does not confer an actual durable backend link or ownership verification.
- Centralized synthetic Points are exact decimal strings; client may display observed points only when labeled simulated. A stale source cannot reuse a prior decimal value. Token-vs-points vs fiat semantics remain separate.
- Malformed DTOs, cross-customer response, unsupported fields, invalid history coverage, non-UTC timestamps and invalid/real addresses fail closed.
- Async controller clears previously displayed state at each load and invalidates late completion on switch/logout/session or source revision. Errors 401/403/409/429/503 are safely mapped in synthetic tests.
- Simulated Thirdweb lifecycle never holds an actual EOA, private key or provider reference and cannot elevate `verifiedRhcLink`, `canSign`, or `canTransact`.

## Unresolved risks / blockers

1. **BG-01..BG-12**: both owners must approve exact JWT trust, user/tenant identity, wallet link/proof/nonce, Thirdweb boundary, endpoint and DTO, centralized Points, actions policy, observation source, history coverage, permission/error semantics and synthetic test environment.
2. Mock input provenance is a developer-side label, not cryptographic authentication. Never adapt this mock directly to a live API without server authorization, schema version review, source trust and negative connected tests.
3. No actual API, identity, EIP-1271, app-switch account isolation, backend auth, wallet provider, issuer token contract, RPC quota, historical log finality, or real browser session was validated.
4. OFF-25 official issuer token identity remains **FAIL/BLOCKED**. Real token history and wallet reads cannot claim completion or launch.
5. No production deployment/merge; no connected session data, signing/approval/transfer, reward redemption or mainnet interaction.
6. Automated axe results and responsive screenshots do not replace a human WCAG 2.2 AA review, keyboard/AT testing, connected customer UAT or independent security assessment.
   A later repeat of full Chrome checks timed out/hung in the axe harness and was stopped without source changes; only the earlier completed 235/235 suite is counted, and it predates the stricter ISO timestamp-only decoder change.
7. Existing `/rhc-points` synthetic `POST /me/rewards/redeem` demo remains outside this checkpoint; November 10 read-only acceptance still requires separate Boss Gal/product changes.

**Do not mark TESTING as DONE.** Zero historical W03 acceptance scenarios have been executed, even if this checkpoint's new synthetic tests passed.
