# W03-2B — Branch, Worktree, Test and Approval Handoff

- **Agent thread:** NEW bounded workstream — `RHC Allen W03-2B Offline React Wallet Overview`. No Zed process started; ChatGPT GPT-6 and Remote Desktop Commander were used directly. Actual thinking-level runtime is not independently verifiable.
- **Owner and machine:** Boss Allen on DESKTOP-5TQ68F9, never Boss Gal's DESKTOP-F5ADSD0.
- **Repository/root:** `https://github.com/allencortez1000/RHC-web3.git`, `C:/Users/admin/Desktop/RHBC project`.
- **Branch:** `allen/w03-2b-wallet-react-offline-20261012`.
- **Worktree:** `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w03-2b-react-offline-20261012`.
- **Base commit:** `8407e0588cc07a7039f9369188ebe16f5cdf6325`.
- **Allowed writes:** only new files under `apps/customer-web/app/components/wallet-thirdweb/w03-react-offline/`, `docs/wallet/w03-2b-react-offline-20261012/`, plus external evidence in `...-evidence/w03-2b-react-offline-20261012/`. An ignored `node_modules` junction in new W03-2B worktree points read-only at the already-installed dependency tree of the task-owned Vercel diagnostic worktree (same exact package-lock SHA).
- **Forbidden:** existing routes/shared types/API/backend/database/auth/rewards/Prisma/contract/runtime/Thirdweb adapters, env/secrets, migrations, Docker, provider/RPC network, signature/wallet operations, contracts/deployment, production release, merge, rebase/reset/stash or mutation of protected earlier worktrees.
- **Required tests:** 37 new React SSR tests, 54 inherited offline regressions, 61 headless offline Chrome assertions, strict isolated and full Customer Web TypeScript checks, ESLint on new source. Record each exact executed count separately.
- **Required result files:** `IMPLEMENTATION-RESULT.md`, `SECURITY-AND-SCOPE.md`, `PRESERVATION-AND-NEXT-ACTIONS.md`, `VALIDATION-LEDGER.json`, `handoff-manifest.json`, and external logs/screenshots/final SHA-256 seal.
- **Stop:** after scoped local implementation, test and evidence sealing; leave new code **unpublished and unmerged** until Boss Allen reviews and authorizes commit/push. A separate joint BG-01..BG-12 decision is required before authenticated app mounting or connected wallet work.

At start, W03-2A source branch and origin matched `8407e05`; all earlier worktree locations and SHA heads were enumerated. The older main PHC worktree had one pre-existing local change and W03-2 original prototype had ten untracked source documents; neither must be modified or silently reset. GitHub and ClickUp should be rechecked before any subsequent handoff (ClickUp live read unavailable due daily quota at execution start).
