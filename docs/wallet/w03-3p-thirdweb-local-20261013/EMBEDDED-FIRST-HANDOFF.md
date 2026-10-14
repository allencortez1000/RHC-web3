# W03-3P — Embedded wallet first, external wallet optional

**Decision:** Boss Allen accepted this recommendation in the current Project conversation on 14 October 2026 and requested implementation. This is a provider-QA implementation decision, not a release approval or authorization to enroll another person's email identity.

## Exact scope

- Thread: CONTINUE — RHC Allen W03-3P Thirdweb Local Provider Integration.
- Model: GPT-6 Astra Pro; direct Desktop Commander execution. No separate Zed/Codex agent or exposed thinking-level selector.
- Device/root: DESKTOP-5TQ68F9 / `C:/Users/admin/Desktop/RHBC project`.
- Worktree: `RHC-web3-allen-w03-3p-thirdweb-qa-20261013`.
- Branch: `allen/w03-3p-thirdweb-gated-qa-20261013`.
- Exact parent before this change: `6f9fc2866da08105ba27ddfc2663bd077aad0309`.
- Allowed changes: wallet-choice policy, existing QA component, affected SSR/browser tests, new email-entry/cancel browser regression and this handoff.
- Prohibited: Boss Gal backend/Auth/DB/Points, changing the Thirdweb project Client ID, production or mainline merge, signing/transactions, hidden account linking, test-email invention, Secret Keys/private keys/recovery information.

## Implemented experience

With the existing local QA mode `both`, **Continue with email** is now the primary action. It passes only `inAppWallet({ auth: { options: ['email'] } })` to the real Thirdweb modal. It does not instantiate MetaMask as a prerequisite or silently fall back to it.

**Advanced: use an existing wallet (optional)** is collapsed initially. Its separate button passes only the external MetaMask factory. Existing explicitly external-only or email-only configuration remains respected; an unknown mode/path is rejected. A connected wallet must be disconnected before choosing another method. This does not merge or link the email wallet and external wallet.

The email interface clearly distinguishes Thirdweb verification from RHC login. It instructs the tester to use an approved mailbox. No email address is prefilled, no guest/custom-auth method is added, and no automatic wallet enrollment occurs on page load.

Connection buttons are disabled until the client has hydrated. This avoids a visible but not-yet-interactive primary button during server rendering. The existing pending-request guard and current SDK state presentation remain in place.

## Local configuration

The ignored `apps/customer-web/.env.local` wallet mode is changed from `external-metamask` to `both` under this user decision. The existing RHC public Client ID, approval reference and selected Sepolia testnet are preserved. The Client ID is not written into source, logs or this guide.

The original QA server middleware/page still independently reject production/Vercel/off-loopback/unconfigured requests. The existing `/account` and `/dashboard` RHC authentication boundary is unchanged. This work is not an accepted production customer-account integration.

## Reproducible checks

From the repository root:

```powershell
node --import tsx --test apps/customer-web/app/components/wallet-thirdweb/real-provider-qa/wallet-choice.test.mjs apps/customer-web/app/components/wallet-thirdweb/real-provider-qa/render.test.mjs

# Against an explicitly authorized, configured local QA server (both mode):
node apps/customer-web/scripts/thirdweb-qa-email-first.mjs http://127.0.0.1:3002
node apps/customer-web/scripts/thirdweb-qa-route-access.mjs http://127.0.0.1:3002
```

The first browser script renders the actual application and SDK without MetaMask installed in its isolated browser context, opens the actual email-entry modal, verifies no email is prefilled, checks cancellation and the separate optional MetaMask modal, and checks desktop/mobile/narrow layouts. It never types/submits an email or verification code. The second script verifies that normal private RHC routes still redirect to login. Neither injects a fake provider connection.

Final build, test counts, source hashes, protected-worktree audit and exact commit are recorded in the append-only external evidence directory:
`RHC-web3-allen-wallet-w2a-20261009-evidence/w03-3p-thirdweb-qa-20261013/embedded-first-20261014/`.

## Completion boundary and next actual test

**UI selection and email-entry/cancel validation are not a successful email-authenticated wallet login.** No approved dedicated QA mailbox was found in the retrieved Project decisions. Email-code delivery, verification, resulting wallet address, email-wallet disconnect/reconnect and recovery remain NOT RUN until the authorized account holder supplies that test identity and completes the provider verification flow. Do not infer or reuse an email from a connected account or profile.

The eventual default customer journey remains RHC invite-only login with an associated in-app wallet. Linking that identity securely requires Boss Gal and Boss Allen's accepted BG-01..BG-12 contract; it is not implemented by matching email strings or replacing the RHC bearer token. OFF-25 and previous dependency-security audit findings remain unresolved. No production rollout or feature DONE transition is implied.

Primary references: https://portal.thirdweb.com/react/v5/in-app-wallet/build-your-own-ui and https://portal.thirdweb.com/react/v5/connecting-wallets/ui-components. Implementation uses the installed, unchanged `thirdweb@5.121.6` interfaces rather than untested SDK upgrades.
