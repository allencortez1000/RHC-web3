# RHC W03-3P — Thirdweb Real SDK Provider Connection: Local QA Runbook

**Owner:** Boss Allen — wallet and Thirdweb. **Date:** October 13, 2026.
**Scope:** Real Thirdweb SDK v5 provider connection in a local-only, separately approved QA session. **Not** an RHC authenticated wallet release.

## 1. What is implemented

- A dedicated Next.js server route `/thirdweb-qa` (not linked from any customer route).
- A real `ThirdwebProvider` + `createThirdwebClient` + `useConnectModal` integration, with actual `inAppWallet` (email only) and/or `createWallet("io.metamask")` factories.
- The connection modal opens only on a user click, and provider disconnect is supported.
- UI shows provider status, masked wallet address, chain eligibility and safe non-authoritative labels. No RHC JWT, backend account link, Points, token balance or history is read.
- Network allowlist is *Sepolia only*, and only when RHC separately authorizes that testnet.
- No app-auth, signing, trading, transfers, minting, approvals, gas sponsorship, pay/fiat modal, token reads, wallet-link API or Mainnet operations exist in this checkpoint.
- This route is denied with Next.js 404 when any gate fails, including production/staging environments, off-loopback Host, missing approval reference, missing public Client ID, unsupported chain or unapproved wallet modes.

**Important distinction:** This is a real SDK integration source, not a simulated SDK. A passing build or SSR test does NOT demonstrate an actual wallet connection. Actual connection must be tested after the below inputs are approved and provided.

## 2. RHC-required inputs before first actual connection

RHC must provide through its authorized owners:

1. Public Thirdweb Client ID for the RHC-controlled project; allow the loopback domain(s) in Thirdweb's Project Settings. **Do not use or disclose a Thirdweb Secret Key.**
2. Written scope reference `RHC-QA-...` naming Boss Allen as tester, authorized start/end, permitted providers and test identities, and explicit no-transaction policy.
3. Approval to test **Sepolia Chain ID 11155111**; otherwise the test must remain 404.
4. One selected provider mode: `external-metamask`, `embedded-email` or `both`. Email onboarding creates a provider wallet and may process personal information; use an authorized synthetic/QA mailbox and DPO-approved consent.
5. Confirmation of RHC's Thirdweb project billing/service limits and who funds provider usage. Wallet connection must not be made using a company treasury wallet or a user's production wallet.
6. A separate local QA window. This page is not intended for hosted previews, public release or company-wide invitations.

**Approval is a human/company decision.** The environment reference is a record locator, *not* cryptographic authentication or proof of authorization.

## 3. Exact local activation commands (AFTER approval)

On **DESKTOP-5TQ68F9**, from the isolated W03-3P worktree:

```powershell
cd "C:\Users\admin\Desktop\RHBC project\RHC-web3-allen-w03-3p-thirdweb-qa-20261013"

# Values must come from an actual RHC-approved QA record; placeholders are NOT valid.
$env:RHC_THIRDWEB_QA_PERMISSION_REF = "<approved RHC-QA-... reference>"
$env:RHC_THIRDWEB_QA_CLIENT_ID = "<RHC Thirdweb public Client ID>"
$env:RHC_THIRDWEB_QA_CHAIN_ID = "11155111"
$env:RHC_THIRDWEB_QA_WALLET_MODE = "external-metamask"

npm run dev:demo --workspace @rhc/customer-web
```

Open only `http://127.0.0.1:3002/thirdweb-qa`. Verify the modal presents only the authorized wallet method. Inspect the masked address, connection status, Sepolia network and disconnect. Record sanitized test results without email, JWT, full addresses, private keys, signature payloads or wallet recovery phrases.

**Default state:** Without the configuration above, or under production/Vercel preview, the QA route is 404 and no Thirdweb client is rendered.

## 4. Human QA acceptance checklist

- [ ] RHC project ownership, public Client ID, origin and permitted account confirmed.
- [ ] External MetaMask connect (with dedicated QA wallet), chain selection, cancellation, account switching, wrong network, and disconnect tested if approved.
- [ ] Embedded email onboarding and recovery tested only if RHC/DPO approves processing of a dedicated QA mailbox.
- [ ] Browser Network tab checked for unexpected provider requests and RHC backend/user data exposure.
- [ ] Production preview `/thirdweb-qa` remains 404 and the existing `/account` readiness lock is unchanged.
- [ ] Mobile, keyboard, screen reader, browser reload and failed/offline-provider behavior reviewed.
- [ ] Human reviewer documents pass/fail, exact branch/commit, timestamp, provider project and stop point, but no secrets or personally identifying addresses/emails.

## 5. Open gates that prevent declaring full Thirdweb integration DONE

- **BG-01..BG-12**: Boss Gal + Boss Allen must approve the `w03.v1` Auth/tenant/account/wallet-link/Points contract, including ownership proof, replay prevention, revocation, data scope and connected API validation.
- **OFF-25**: Official token issuer, network/contract/address/source verification **FAIL/BLOCKED**. No official RHC token interactions.
- **W01** real connected provider cases and original W03 acceptance matrix (50 planned, 0 executed) remain not completed.
- App/Token final GO/NO-GO, security/privacy/human UAT are separately required.

No command in this runbook approves a wallet action, spending, smart-contract deployment, storage of private credentials, or production rollout.


## 14 October continuation: build and request boundary

Run workspace commands from the repository root so Next.js uses the Customer Web working directory and Tailwind configuration. The dedicated QA-path middleware returns a direct, non-cacheable HTTP 404 before page streaming when the same activation policy denies access. The page independently evaluates that policy again and imports the real provider component only after it passes. Normal customer pages do not match this middleware.
