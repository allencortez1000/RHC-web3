# W03-2B — Security, Data Boundary, and Unaccepted Work

**Status:** Offline-only React presentation prototype; not backend/API integration or customer release.

## Implemented and tested protections

- Component is explicitly marked `synthetic-offline-only`; runtime gate rejects non-synthetic markers and a production-style UUID even if presented as a fixture.
- No user-supplied `rhc_user_id`, email, wallet address or provider `sub` can select an actual API record because there is no network/API client.
- Wallet linkage is unknown without verified backend evidence. A fake linked state remains labeled an offline simulation and never establishes server proof.
- RHC Points decimal strings are separate from token base-unit strings and any peso or fiat value. Observed simulated zero is distinct from unavailable/unsupported/stale.
- Auth/permission/conflict/rate-limit/service-unavailable/account-switch views always omit the previous customer’s figures and display sanitized status.
- Existing generation guard tests reject late response state across synthetic customer A→B transitions.
- No connect/link/transfer/approve/trade/redeem controls, buttons, links, forms, event handlers, SDK imports, wallet operations, fetch, RPC calls or signing.
- Static previews use local `file://`, responsive CSS grid, semantic landmark/headings and script/network-blocking CSP.
- No changes to Boss Gal's backend, database, API, rewards, identity, CI, migrations, deployment, provider configuration or other developer's worktree.

## Unresolved risks

- No real customer data contract: BG-01..BG-12 owner approval required before any live API DTO consumption.
- No validated Thirdweb account/embedded wallet, server challenge or proof-of-possession, durable wallet link, authorization audit, token indexer or on-chain balance/history.
- No real multi-account/tenant browser security acceptance, consent, SSO/cookie/session security or accessibility certification.
- No issuer-signed token specification, approved testnet/RPC budget or mainnet/contract release authorization.
- Automated axe/browser checks complement but do not replace manual WCAG 2.2 AA review and connected UAT.
- Existing 50 W03 acceptance scenarios remain planned/NOT RUN, not converted by the 37 new component and 61 local UI checks.
- Official OFF-25 = FAIL/BLOCKED. W01 connected provider cases = NOT RUN.

**Do not mount this synthetic component as live customer wallet data or publish a production route.** Stop for owner review and separately approved integration.
