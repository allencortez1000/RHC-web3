# W01 / OFF-16 — Security and Outstanding Acceptance Issues

**Status:** Evidence-only final review. Not a penetration test, production audit, legal release or live provider acceptance.

## Confirmed defensive boundaries in the existing correction

- The corrected panel runs as browser presentation only. Its elapsed-time status check uses `Date.now()`, a 250-ms timer and focus/visibility events; the reviewed code does **not** introduce provider fetches, wallet SDK instantiation, signer operations or blockchain writes.
- If an otherwise `fresh`/ `partial` testnet observation lacks valid data/time or is older than a conservative one-second bound, the browser displays a stale/degraded classification and a `role=status` disclosure, rather than continuing to claim current freshness.
- An expired observation cannot become fresh from a backward system-clock change without a different received observation identity.
- Returning to a throttled background tab triggers an immediate reevaluation. No live RPC read is initiated by the UI's timer or visibility/focus listeners.
- Tests cover abnormal timestamps, zero-value and false-value observations, unsupported/absent fields, partial data, keyboard/reduced-motion/responsiveness, and bundle checks for known SDK/credential identifiers.

## Residual risks and unaccepted areas

1. **OFF-25 — FAIL (hard gate to official token claims).** No issuer-approved signed metadata identity (official name, symbol, decimals, chain, address, contract provenance and interpretation) exists in this patch. Never imply the displayed metadata proves an official RHC token; this is not corrected by OFF-16.
2. **Browser clock and conservative TTL.** The one-second local threshold minimizes stale-data mislabeling but can downgrade information before the server would mark it stale. The browser clock is not blockchain time or independently verified finality; wrong local clock fails closed for obviously old/future timestamps, not a formal system-clock trust design.
3. **Connected behavior is untested.** No live Thirdweb/rate limit/billing, actual JWT/Redis/Auth session change, provider outage/return, real wallet enrollment, cross-account isolation or real chain-RPC activity was performed as part of OFF-16. A passing offline suite cannot satisfy W01-P2.
4. **Contract semantics not established.** A `paused` observation or total supply says nothing definitive about customer transfer restrictions, custody, tokenomics, public token status or customer balance/transaction history. The later ERC-20 candidate requires independent direct-call restriction tests and source/role verification.
5. **Accessibility assurance is limited.** Existing synthetic Chromium testing includes responsive/reduced-motion and status semantics, but is not a complete WCAG 2.2 AA audit or full application-route user acceptance.
6. **Release deployment remains gated.** No new code reached GitHub; existing W01-P1 baseline is accepted only as a partial offline checkpoint. No live contract/public deployment or app integration is approved by this evidence.
7. **Not all inherited scenarios were rerun.** The old OFF-16 negative browser case was superseded by new positive tests, and an inherited W2A version-check case was filtered. Complete original regressions and full release acceptance remain separate.

## Required next authorizations

- Boss Allen must review the source diff, tests and handoff before accepting the **OFF-16 offline correction**; a separate scoped Git closure is needed to publish the corrected branch, if approved.
- RHC authorized issuer/client must approve OFF-25 token identity and governance; Boss Gal supplies coordinated identity/API decisions but does not own Allen's wallet implementation.
- W01-P2 requires explicit nonproduction network/contract, provider/billing/security, test duration/budget and connected-backend authorization.
- Public/Mainnet release requires a separate legal/security/issuer decision, approved corporate signing control and client GO/NO-GO. No such activity was initiated.

**OFF-25 and connected tests remain NOT ACCEPTED.**
