# Scoped commit-review handoff

## Decision: READY FOR SCOPED COMMIT REVIEW

**Human approval PENDING. No commit performed or authorized by this report.** The preserved 11-file product/test candidate has reviewed behavior and passing final Node22 checks. Selected persistent-demo cells now have passing evidence across bounded attempts, with first failures, deadline and cancellation limits retained. No additional product edit was warranted.

This means ready for a human to review a bounded change set—not that the current index is a complete commit, browser expiry is implemented, connected services are accepted, or Week1/production gates are complete.

Worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3`  
Branch: `allen/frontend-web3-stabilization`  
HEAD: `579a007bb56e247836d97d7c9adcc157f848071f`  
Tested product/source-test identity: `c4950c49575f5d165d5e59922e8665d5be20d6b98bc052110c35256d186d7532`

Eight tracked files were **already staged before this continuation**, and their index was preserved. Three source/test files and reports are untracked. Do not commit the existing index blindly: it omits required new helper/tests and documentation. This run made no stage/unstage/commit/push/merge action. No other source patch should be swept into a later commit.

## Exact proposed allowlist

The exhaustive, literal path list is [evidence/commit-allowlist.txt](evidence/commit-allowlist.txt); its SHA-256 and per-file hashes are in [source-evidence-manifest.json](evidence/source-evidence-manifest.json). **Use the listed paths, not a recursive `docs/release/` or repository-wide add.** The manifest itself is listed but excluded from its own content digest to avoid self-reference. Human review may choose separate product and evidence commits; none is created here.

### Product and directly related tests — unchanged in this continuation

```text
apps/customer-web/app/components/meridian-public/public-shell.tsx
apps/customer-web/app/components/resource-metric.ts
apps/customer-web/app/dashboard/page.tsx
apps/customer-web/app/properties/page.tsx
apps/customer-web/app/rhc-verify/page.tsx
apps/customer-web/tests/frontend-mode-regression.cjs
apps/customer-web/tests/frontend-state-regression.spec.ts
packages/ui/src/web3-read-panel.tsx
packages/web3/src/thirdweb-read-provider.ts
packages/web3/test/readonly.test.cjs
scripts/web3-browser-test.mjs
```

These are the original stabilization fixes/regressions, not new work claimed by this follow-up. New file `resource-metric.ts` centralizes truthful loading/unavailable/zero formatting. The other two new product-area files are focused regression tests. Shared panel consumers and the API provider consumer were reviewed without editing protected backend code.

### Prior reports — preserve unchanged

Under `docs/release/2026-11-10/allen/20261007T014758Z/`, exactly:

```text
coordination-and-eod.md
integration-handoff.md
issues-and-fixes.md
next-actions.md
run-context.json
validation.md
```

They contain historical Node24/blocked-demo/index-state results. This run does not rewrite them; the new documents explain the actual changes since that checkpoint.

### Follow-up documents/evidence

Under `docs/release/2026-11-10/allen/20261007T040805Z/`, the three requested reports plus the **exact enumerated evidence files** in the allowlist. These include versioned Node22/offline/cleanup helpers, the failing→passing guard regression, demo supervisor/exercise/selection/denial/delay tests, predeclared matrices, preserved investigations, bounded command ledger, runtime/checksum record, before/after inventories and manifests. All additions outside the original 11-file set are validation/handoff material, not new product/backend functionality.

Helpers are Windows/task-path-specific validation tools, not production launchers or deployment infrastructure. Human reviewer should inspect them rather than treat evidence as commands to execute blindly. Their tests, syntax checks, retry history and cleanup are documented in [validation](follow-up-validation.md) and [demo results](evidence/demo/RESULTS.md).

## Explicit exclusions

- The entire external `RHC-web3-allen-frontend-web3-evidence/` tree: runtime ZIP/extraction, official checksum download, caches, npm configs/home/temp, Chromium profiles/binaries, synthetic stores/session material, screenshots/ARIA, raw logs and previous evidence. Preserve it locally; do not stage it.
- Worktree `node_modules`, `.next`, `dist`, generated Prisma client/engines, TS build info, test-results and any other ignored build output.
- Any `.env`/credentials, real user data, private documents or machine inventory. No real environment values were read/copied into reports. Raw synthetic failure logs can include test environment arguments; they remain outside the proposed source commit.
- Protected database/schema/migrations/ACL, contracts/artifacts, backend auth/business policies, shared DTOs, allowlists/activation, dependencies/lockfile, CI/infrastructure/cloud files. Their committed baseline remains in HEAD but no new change to them is proposed.
- Any additional unlisted concurrent work. Stop and reconcile ownership if the current identity differs at review time; do not revert another person's edits.

## Suggested commit message

```text
Stabilize frontend and read-only Web3 states

Preserve unknown values and demo provenance, enforce cache expiry,
and qualify provider observations as last-response data. Add focused
regressions and Node 22/isolated-demo validation evidence.

Automatic browser expiry and connected acceptance remain pending.
```

The body adds scope/acceptance qualifications; it does not claim a hosted fix, blockchain acceptance or a new database foundation.

## Reviewer checkpoints and remaining decisions

1. Review the exact candidate/allowlist and retain session/scope/secret/read-only negative assertions. Confirm the staged subset plus untracked files is intentional; **approval remains PENDING**.
2. Review cold API test timeout and helper/demo first-failure evidence, not just final green counts. Limits were unchanged. Demo matrix is 13 cells in attempt03 plus two in a separate fresh-store continuation; cancelled late responses are not delivered-stale-byte acceptance.
3. Backend owner (not yet named) must decide authoritative expiry metadata before browser timers/lifecycle work. No polling/default-copy/DTO change here.
4. Management names backend/database/deployment owners and approves provider scope/spending. Galiver supplies chain/address/ABI/deployment/restriction evidence only. Exact hosted incident logs remain absent.
5. Next connected work package: **Account/profile → Digital ID → Properties/reservations**, with capability gates and current contract gaps preserved; see [decisions/handoff](decisions-and-handoff.md).

No protected-source or external acceptance requirement is silently marked complete. Owned processes are stopped; useful synthetic evidence and all prior work remain intact. Preservation scope and final verification are linked in [follow-up-validation.md](follow-up-validation.md).
