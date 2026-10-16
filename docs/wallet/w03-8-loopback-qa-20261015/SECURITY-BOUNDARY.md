# W03-8 — Customer Web development listener bound to loopback

**Checkpoint:** 15 October 2026
**Owner:** Boss Allen (wallet / Thirdweb)
**Status:** Isolated implementation candidate; full tests and human review are separate gates.

## Motivation

The existing Thirdweb QA server gate requires development mode plus a permitted loopback **HTTP Host header**. A Host check does not prove the service itself listens exclusively on a loopback interface. Previously, the ordinary Customer Web development script ran `next dev -p 3002` without an explicit hostname. This could leave a development listener accessible from a LAN in circumstances where a forged Host header and valid QA configuration were supplied. This is a **precautionary potential exposure path**, not proof of exploitation.

## Bounded change

Only the Customer Web workspace `dev` script changes, to:

```
next dev -p 3002 -H 127.0.0.1
```

- The existing `dev:demo` script was already bound to `127.0.0.1` and remains unchanged.
- Top-level `dev:customer`, `dev`, and `dev:all` delegate to this workspace script and are unchanged.
- Customer production `next start -p 3002` remains unchanged. Its QA denial still depends on production middleware.
- No shared backend/Auth/DB/Points/token/Thirdweb functionality, Admin Web scripts, dependencies, or configuration keys are edited.

The new restriction intentionally prevents access to the ordinary Customer development server from another LAN/mobile device. Any alternative remote device or tunnel test requires a separately reviewed scope. Directly executing the Next CLI without the npm script and a loopback flag can still bypass this script-level constraint.

## Offline / loopback verification

After a task-owned locked dependency installation, run from this worktree:

```powershell
node --test apps/customer-web/scripts/thirdweb-qa-loopback.test.mjs
```

This test uses synthetic public browser environment values and **removes all real Thirdweb QA keys**. It verifies script configuration, launches the ordinary npm development command as a child, inspects the Windows listener addresses, and makes localhost HTTP requests to ensure the inactive QA page returns 404/no-store without rendering the provider UI. It then stops only its own child process tree. No provider, email, wallet, chain, RHC API, secret or transaction is accessed.

Verify inherited wallet static regressions, Customer TypeScript/build, production denial cases, original worktree HEAD/status preservation and cleanup separately. Record failed early attempts honestly and do not count them as successful tests.

## Security and approval limits

Binding to loopback does **not** authenticate RHC users, authorize Thirdweb operations, substitute for the actual QA approval record, secure arbitrary local software, or validate hosted security. The Admin Web development listener belongs to Boss Gal's workstream and needs a separate evaluation if LAN exposure matters.

W03 Task 5 security fixes and Task 6 read-only Points changes remain preserved in earlier commits. BG-01..BG-12, OFF-25, full dependency audit, connected API/wallet UAT, internal acceptance and production deployment remain separate pending gates.

## Agent handoff

Thread: **NEW — W03-8 Loopback Boundary**. Model: **GPT-6**, preferred thinking **High**. Execution via ChatGPT/Remote Desktop Commander; no external agent spawned.

Project root/worktree: `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-8-loopback-qa-20261015`
Branch: `allen/w03-8-loopback-qa-20261015`
Exact base: `b4ae4d4644feef61ab2d7e8373a0a0f09747b5a1`
Allowed: Customer dev script, task-owned loopback tests/docs, isolated locked install, test evidence.
Prohibited: Boss Gal code, database/auth/SDK/provider operations, arbitrary public bind/tunnel, secret disclosure, protected worktree edits, force pushes/merges, wallet signatures or transactions, production deployment.
Required outputs: task result and failures, test logs, SHA-256 manifest, Git commit and branch receipt, protected worktree/cleanup record.
**Stop before remote publication** until the Vercel owning-team access and any preview side effects are verified. Never mark Customer Wallet DONE from this isolated hardening.

## Verified local execution — 15 October 2026

The first static precheck ran before locked dependencies were installed: six assertions passed, while the seventh could not start the absent Next runtime. Its result is retained in `STATIC-TEST.log` and is **not** counted as an accepted run. The initial PowerShell npm installation also terminated on a deprecation warning treated as a native error; this attempt has no passing installation status.

The subsequent **fresh offline npm ci** completed successfully with lifecycle scripts disabled and the exact `package-lock.json` SHA-256 unchanged. With this installation:

- The **actual ordinary npm development command** ran and the Windows listener was bound only to `127.0.0.1:3002`.
- Four localhost HTTP negative probes returned the expected inactive Thirdweb QA denial (HTTP 404, no-store, no SDK panel).
- **7/7** new loopback tests passed, no failures or skips. The test-owned listener was stopped.
- **337/337** inherited wallet, dependency and read-only Points offline tests passed.
- Shared types/UI builds, Customer TypeScript, lint and optimized production build passed.
- **2/2** existing actual local production-mode Thirdweb denial tests passed.

No live Thirdweb connection, wallet email verification, RHC bearer/API operation, blockchain transaction or external provider test was performed. This is Windows/Node 24 local evidence, not a new GitHub Linux/Node 22 CI result. The full dependency audit still fails from unrelated backend/shared findings.

External evidence includes the final runner receipt, separate stdout/stderr for each stage, unmodified original failure records, the exact Git tree and protected-worktree preservation report. Publication/owner acceptance remain pending.
