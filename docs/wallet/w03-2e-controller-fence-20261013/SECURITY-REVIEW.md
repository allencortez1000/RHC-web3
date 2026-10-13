# W03-2E — Privacy, Attack Model and Residual Risks

## Confirmed risk addressed

**Cross-controller stale presentation with unchanged account fingerprint.** A reusable React wallet read panel could render a previous data source's value before `useEffect` on controller replacement. The original async generation guard blocked late responses, but that did not fence already-presented state when the controller prop changed without a corresponding account/session signature change.

**Mitigation:** Save the controller object reference with the presented view and require controller identity equality during every React render. A new controller with the same scope must see an unavailable fallback until its own load returns. This prevents stale visual disclosure **before** passive effects run. The previous controller's effect cleanup and async invalidation remain in effect.

**Tested negative:** Chrome layout-effect instrumentation demonstrates pre-fix stale synthetic 125.00 Points in the commit-phase UI at 1280 and 390 widths, then verifies the same test has no stale value after the fix. Separate tests cover A/B switch, stale async results, logout, mock 401/403/429/503, source tampering and provider lifecycle without actual network access.

## Security boundary unchanged

- W03-2E tests use invented data. The browser harness is not mounted in production or any Next.js customer route; generated `app.js` files remain in external evidence only.
- No bearer JWT, Supabase Auth, Thirdweb client/provider, real wallet addresses, wallet enrollment, EIP-1271 proof, signature, signing permission, transactions, blockchain RPC, indexer, or treasury operation was used.
- The W2A provider-release lock remains untouched; the new QA code imports only mocked W03-2C components.
- Input scope **still lacks an accepted tenant/company identity revision**; real company-scoped isolation is an unresolved backend/API contract decision (BG-01/BG-02/BG-05/BG-06/BG-10). The identity fence is defense in depth, **not** an authorization mechanism.
- Preview CSP and network interception remain strictly local/offline; no remote secrets, tokens or customer data were used.
- Automated axe/browser checks do not certify WCAG 2.2 AA or demonstrate connected customer/tenant UAT.

## Explicit blockers

1. BG-01..BG-12 approved versioned API/identity/wallet contract, exact backend revision and authorized synthetic connected QA window: **PENDING**.
2. Official issuer token identity OFF-25: **FAIL/BLOCKED**.
3. W01 real connected provider tests: **NOT RUN**; historic W03 original 50 acceptance cases: **ZERO RUN**.
4. RHC Points November 10 pilot remains **view-only** per reported plan; existing demo redeem POST belongs to Boss Gal/product policy and was not modified here.
5. No production security/functional acceptance, external wallet onboarding, smart-contract activation or mainnet authorization.

**Verdict:** PASS for isolated mock UI privacy fix and regression coverage. NOT accepted live wallet functionality.
