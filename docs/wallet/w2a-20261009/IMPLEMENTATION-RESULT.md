# W2A — Thirdweb Offline Frontend Integration Candidate

**Verdict:** W2A offline gate and SDK-preparation architecture implemented and verified. **Not a live wallet integration and not accepted for production or connected UAT.**

## Source changes (Allen-owned worktree only)
1. NEW `apps/customer-web/app/components/wallet-thirdweb/policy.ts` — fail-closed, hard release lock `OFFLINE_REVIEW_ONLY` independent of browser flags, with separate auth, chain, billing and backend contract prerequisites.
2. NEW `apps/customer-web/app/components/wallet-thirdweb/sdk-preparation.ts` — typed Thirdweb 5.121.6 lazy loader; prepared constructors `createThirdwebClient({clientId})`, `inAppWallet({auth:{options:['email']}})`, and `createWallet('io.metamask')`. The loader is unreachable in W2A; no enrollment/connect/autoconnect/sign/transaction API is exported or called.
3. NEW `apps/customer-web/app/components/wallet-thirdweb/ThirdwebWalletReadiness.tsx` — customer Account display with explicitly disabled embedded/external wallet controls, accessible status, meaningful dependency notices and safe RHC/Points distinction. No Thirdweb SDK is imported into this mounted panel.
4. MODIFIED `apps/customer-web/app/account/page.tsx` — preserves existing `DemoRecordsPage` and appends the disabled-readiness panel. No new signup/login route or identity bypass.
5. MODIFIED `apps/customer-web/package.json` and root `package-lock.json` — pin Thirdweb `5.121.6` for Customer Web, matching already installed server-side package. No other package version or backend dependency changed.
6. NEW `apps/customer-web/tests/w2a-thirdweb.offline.cjs` (16 assertions) and `apps/customer-web/tests/w2a-thirdweb.browser.cjs` (seven isolated browser tests). External test-only Chromium harness and SDK inspection fixtures are never mounted into the app.

## Explicit safety guarantees and limitations
- Current release policy cannot be enabled by `NEXT_PUBLIC_` environment variables, URL/query strings, direct calls to `prepareThirdwebFrontend`, fake billing/auth claims, or user accounts. The guard always returns disabled.
- No SDK module import, client construction, wallet enrollment, chain access or connection is possible through the mounted app in W2A.
- No access to actual Supabase/Auth JWT claims from Thirdweb; no alternate app-auth system. Account login remains RHC/Supabase owned by Boss Gal.
- No wallet-auth proof or server link endpoints were invented. No browser wallet address grants RHC roles, ownership, business verification or points.
- No Thirdweb secret key (or app Admin key) belongs in frontend code or public environment configuration.
- The typed SDK preparation code is a *future integration boundary*; it cannot be reused for real provider interaction until a separately approved W2B activation and security review changes the hard lock.
- Embedded wallet recovery, email OTP/session binding, social auth, live connection/disconnection, transaction reads, signature verification, chain allowlist and real user UAT are **not implemented** by W2A. Do not represent a disabled panel as a working wallet.
- Centralized RHC Points are not blockchain balances, token liabilities or financial promises.
- The original `/wallet` route's redirect to `/account` and the accepted W1 component source remain unchanged.

## Next approval
Boss Allen reviews and accepts the **offline W2A boundary only**. Boss Gal approves a versioned backend wallet identity/proof/link contract before W2B; management and provider owners approve public client ID/hostname, chain allowlist, Thirdweb service/billing and safe disposable test personas before any connected test. W2B is a NEW scoped workstream, not implicit authorization from W2A.
