# RHC W2B-P1 — Synthetic Wallet Adapter & Lifecycle Controller Implementation

**Technical verdict:** Offline mock-only candidate implemented and automatically validated. **Not accepted by the human owner yet.** Live provider, wallet and backend operations are not part of this stage.

## Architecture

```text
Future approved provider integration (NOT IMPLEMENTED)
            |
        [W2A hard release lock OFFLINE_REVIEW_ONLY]  <-- unchanged
            |
      New W2B-P1 test-only mock fixture (UNMOUNTED)
            |
  Synthetic Context (fake RHC session / fake chain / fake consent)
            |
      evaluateSyntheticReadiness()
       sdkMayLoad=false, mayEnrollRealWallet=false, maySign=false
            |
      W2BOfflineController  <-- MockOnlyWalletDriver injected
            |
      Fake openFixture/releaseFixture (handle scoped, no real provider)
            |
      OfflineWalletLab.tsx (external isolated browser test only)
```

## Files created — no existing source edited

| File | Function |
|---|---|
| `types.ts` | Typed fake session, approved/mock chain, method, public-client validity, fake provider ticket, driver handle and snapshot dimensions |
| `mock-policy.ts` | Clone/fingerprint and explicit synthetic prerequisite checks, immutable readiness result and human-readable mock blockers |
| `controller.ts` | Lifecycle controller, operation-generation fencing, cancellation, bounded timeout, failure/retry, account switch/logout, cleanup by exact fixture handle ID |
| `OfflineWalletLab.tsx` | Test-only React component with status/alert semantics, keyboard focus restoration, responsive layout, reduced motion compatible; not app-mounted |
| `sdk-types.ts` | Pinned Thirdweb 5.121.6 `import type` compatibility only; no module import or code executed at runtime |
| `w2b-offline-policy-lifecycle.cjs` | 48 Node test-runner offline unit cases |
| `w2b-offline-browser.cjs` | 8 Playwright Chromium offline fixture tests |

All source additions are under the **authorized new-only** prefixes. Existing `apps/customer-web/app/account/page.tsx`, `apps/customer-web/app/components/wallet-thirdweb/policy.ts`, `sdk-preparation.ts`, `apps/customer-web/package.json`, `package-lock.json`, application providers and all backend files remain unchanged.

## Real provider behavior versus mock scope

- The mock `MockOnlyWalletDriver` methods `openFixture()` and `releaseFixture(handleId)` run **local injected fakes only**. There are **no** calls to Thirdweb `inAppWallet`, `createThirdwebClient`, `wallet.connect`, `autoConnect`, provider token `jwt`, signing, transaction or blockchain RPC.
- The test module's `simulatedEnabled=true` controls a **synthetic fixture only**; it cannot affect W2A `W2A_RELEASE_LOCK`, the production runtime or backend. The production Account panel remains disabled.
- Synthetic `rhcUserId` and fixture subject are **mock strings**, not an authenticated backend session. Snapshot always has `rhcIdentityVerified=false` and `backendLinkVerified=false`.
- A fake wallet link may display `linked` for **test comparison only**; it is explicitly unauthoritative, provides no permissions, and is never persisted. Real wallet link requires Boss Gal's server-verified challenge, nonce and signature checks.
- Chain ID `43210`, loopback origin `:43102`, public fixture Client ID and synthetic provider ticket are **invented test identifiers**, not approved real chain, public client or service readiness.
- Context fingerprint includes account/session epoch, consent, selected chain, project, origin, mock provider mode, policy revision and fake ticket to discard stale completions.
- Per-handle fake release never calls the real SDK's provider-wide disconnect; real SDK lifecycle needs a separate W2B-P2 design.

## Known design limitations

1. Dependency-injected mock-driver tagging and compile-time types are **not runtime security enforcement** if malicious code deliberately supplies a side-effecting driver. Keep module unmounted and offline; never mount in the real app without a separate trusted adapter and review.
2. Thirdweb custom JWT/OIDC audience, subject, issuer, publicly reachable JWKS, account billing, recovery, provider client ID/domain policy and approved chain remain unapproved. No real provider ticket or backend route was built.
3. Existing local backend copy is not accepted as connected-ready; backend wallet challenge/proof/link does not exist.
4. Browser automated samples are not complete WCAG 2.2 AA acceptance; no real embedded-wallet recovery, EIP-1271 or onchain interactions tested.
5. No real onchain balances/tokens or RHC Points ledger mutation; wallet connection does not confer legal/property/financial rights.

## No-action preservation boundaries

No admin/Web3 releases, backend API/DB/Docker changes, lockfile dependency installs, secret/JWKS exposure, Git index/stage/commit/push, live provider requests, signatures, token transactions, smart-account sponsorship or deployment were performed. Existing W1 and W2A remain accepted and clean.

## Next checkpoint

Boss Allen reviews W2B-P1 mock-only implementation, security findings and `VALIDATION-RESULT.md`. Only he can authorize acceptance, then a separate scoped Git preservation. Boss Gal and management/security must approve the shared identity and connected-run contract before W2B-P2. Stop here.
