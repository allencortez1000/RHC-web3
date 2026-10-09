# W2B-P1 — Worktree Source and Safety Preservation

**Scope:** Isolated NEW W2B-P1 worktree only, with permitted **new** source/test/docs files. **No Git commit/push/merge, real wallet, JWT, provider, blockchain, payment or backend work**.

## Protected worktrees and versions

| Item | Required preserved state |
|---|---|
| Device | `DESKTOP-5TQ68F9` (Boss Allen only) |
| Original W1 worktree | `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3`; branch `allen/frontend-web3-stabilization`; HEAD `d951c91800f00d31a4ec4bd7b4da14e8a266e01d`; clean |
| Accepted W2A worktree | `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009`; branch `allen/w2a-thirdweb-wallet`; HEAD `dcf2a81aa5158f2e56141dac8a2ebe60d7fd236b`; clean |
| New W2B-P1 worktree | `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w2b-offline-20261009`; branch `allen/w2b-offline-auth-contract-20261009` |
| W2B-P1 base/HEAD | `dcf2a81aa5158f2e56141dac8a2ebe60d7fd236b` |
| W2B-P1 base tree | `b01c5ab021cb00a63d6d90c534dad28079eb84e7` |
| Tracked/index diffs in new W2B-P1 worktree | **EMPTY**; only allowlisted new files |
| Existing W2A `W2A_RELEASE_LOCK` | Still `OFFLINE_REVIEW_ONLY`, unchanged |
| Original routes, manifests, lockfile | Not edited |
| Boss Gal machine/backend/DB/Docker/Auth/JWKS | Not accessed or modified |

## Permitted newly created source and tests

- `apps/customer-web/app/components/wallet-thirdweb/w2b-offline/types.ts`
- `apps/customer-web/app/components/wallet-thirdweb/w2b-offline/mock-policy.ts`
- `apps/customer-web/app/components/wallet-thirdweb/w2b-offline/controller.ts`
- `apps/customer-web/app/components/wallet-thirdweb/w2b-offline/OfflineWalletLab.tsx`
- `apps/customer-web/app/components/wallet-thirdweb/w2b-offline/sdk-types.ts`
- `apps/customer-web/tests/w2b-offline-policy-lifecycle.cjs`
- `apps/customer-web/tests/w2b-offline-browser.cjs`
- New documentation inside `docs/wallet/w2b-offline-20261009/**` only.

No original W1/W2A unit, component, Account page, app provider, Supabase auth, API, database, reward, token, contract, Next config, package.json or lockfile has been rewritten.

## Task-owned external evidence and ignored build artifacts

- External evidence: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w2b-p1-implementation-20261009`.
- The new W2B worktree has a Git-ignored Windows `node_modules` junction to the existing W1 installed dependencies (pinned Thirdweb `5.121.6`). No dependency installation/download, global SDK setting or package mutation performed.
- Only W2B ignored local `packages/types/dist`, `packages/web3/dist`, `apps/customer-web/.next` compile artifacts were generated. No compiled output was staged.
- W1/W2A browser test copies were created in new external fixture folders; original test files and their accepted evidence were not rewritten.
- An initial W2A copied regression test generated task-owned output under an unintended sibling external `RHC-web3-allen-w2b-offline-20261009-evidence` folder because of a path-rebase error; no user/backend/project source was affected. The corrected isolated copy produced final PASS evidence under the designated folder. The initial failure has not been relabeled as success.

## Security and privacy boundary

- No `.env`/secret source read, provider credential, JWT, OTP, private key, thirdweb dashboard interaction, external chain/RPC call, wallet enrollment, signature or transaction.
- Test mock addresses, RHC UUIDs, Client ID and chain ID `43210` are deliberately invented fixtures; not approved real identities.
- The Next build used only synthetic public env placeholders and the existing offline network socket guard, with telemetry disabled.
- W2A production Account panel remains **disabled**; new W2B lab is unmounted. No wallet feature flag, permission or token enabled.
- The new type-only SDK module was statically and TypeScript validated to emit no Thirdweb runtime imports.

## Final independent verification

External `preservation-final.json` must match all tracked/new paths, exact branch/HEAD/base tree, protected W1/W2A cleanliness, sealed test/build log hashes, source file checksums, backend/network safety checks and **no app/test listeners**. After that PASS, `handoff-manifest.json` provides the complete source inventory for human review. Any mismatch means STOP, not a clean candidate.

**Human review/acceptance pending. W2B-P2 connected remains BLOCKED; no code publication or project-wide DONE.**
