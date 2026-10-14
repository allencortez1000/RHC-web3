# Thirdweb provider setup — one read-only check

**Owner:** Boss Allen. **Added:** 14 October 2026, continuing W03-3P on the existing Draft PR #4. This is configuration tooling, not another wallet simulator or a live-provider acceptance.

From the repository root run:

```powershell
node --import tsx apps/customer-web/scripts/thirdweb-qa-preflight.mjs
```

The command uses the existing `gate.ts` and Next.js's installed environment loader. It reads the Customer Web directory's environment configuration, reports all missing key names, and applies the same mode/Host/network/wallet restrictions as the local QA route. It does not print environment values, import the Thirdweb SDK, open a browser, start Next.js, contact a provider, connect a wallet, or modify configuration files.

Exit codes: **2** means missing or invalid setup; **1** means a local loader/usage error; **0** means only that the configuration passes the local policy syntax checks. Exit 0 does **not** prove actual RHC authorization, provider account ownership, allowed dashboard domains, or a successful connection. The output always says `authorization: NOT_VERIFIED_BY_THIS_CHECK`.

## Inputs that must come from the authorized operator

| Local configuration key | Required source |
|---|---|
| `RHC_THIRDWEB_QA_CLIENT_ID` | Public Client ID from the RHC-controlled Thirdweb project, not a Secret Key |
| `RHC_THIRDWEB_QA_PERMISSION_REF` | Reference to actual authorization for the specific tester, provider, identity, time window and no-transaction scope |
| `RHC_THIRDWEB_QA_CHAIN_ID` | `11155111` only after approval to use Sepolia for this provider QA; do not silently choose another chain |
| `RHC_THIRDWEB_QA_WALLET_MODE` | Exactly the approved `external-metamask`, `embedded-email`, or `both` method |

After these decisions are confirmed, set the values privately in the current PowerShell session or in the ignored `apps/customer-web/.env.local`. Do not commit a real environment file. The checker does not create that file for you. The intended host defaults to `127.0.0.1:3002`; `--host=localhost:3002` can evaluate another allowed loopback host without starting it.

Thirdweb dashboard domain/service restrictions and use of a dedicated QA wallet/mailbox must be confirmed separately. Never supply a production treasury wallet, recovery phrase, private key or Thirdweb Secret Key for this connection test. No signing, transfer, minting, payment or token operation is authorized by the setup checker.

## Verified outcome on the development worktree

On 14 October 2026, the actual worktree check returned **MISSING_CONFIGURATION (exit 2)** with all four keys missing and no local environment files loaded. It correctly kept `gateAllowed: false`, `serverStarted: false`, and `walletConnected: false`. No missing value was replaced with a fabricated approval or Client ID.

New checker tests: 16 PASS, including redaction, Next environment precedence and temporary-directory load checks. Existing gate/provider-view/real-SDK SSR suites: 88 PASS. Combined run: **104 PASS**. Customer Web TypeScript passed. These results do not change the original W03 acceptance matrix or replace connected testing.

## Next step

Provide the RHC public Client ID and actual approved test scope. Run the checker again, review the authorization independently, then follow `LOCAL-THIRDWEB-CONNECTION-RUNBOOK.md` for an explicitly authorized local connection session. Keep `/thirdweb-qa` disabled in hosted/production environments. RHC backend linking still requires BG-01 through BG-12; OFF-25 and the historical connected tests remain unresolved.

References: Next.js 15 environment variable guide (`@next/env`, precedence) and Thirdweb API Keys / Create a Project guide. No new dependencies, application routes or backend code were introduced in this setup-tool continuation.
