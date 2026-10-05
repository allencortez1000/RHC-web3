# RHC Digital Local Demo Guide

**Status:** Month 1 local MVP demo profile implemented, tested, and ready for internal UAT/acceptance.  
**Boundary:** The demo proves local UI and fixture workflows only. It is not production readiness, live authorization acceptance, database acceptance, or evidence that any external provider works.

## Start and endpoints

From the repository root:

```sh
npm run dev:demo
```

On Windows, `npm.cmd run dev:demo` is equivalent when invoking npm directly. `npm run dev:mock` is a compatibility alias for the same isolated demo command.

| Surface                        | URL                                 | Purpose                                             |
| ------------------------------ | ----------------------------------- | --------------------------------------------------- |
| Customer and public experience | `http://127.0.0.1:3002`             | Public pages, customer portal, and the fixture hub. |
| Admin command center           | `http://127.0.0.1:3003`             | Staff persona workflows.                            |
| Fixture hub                    | `http://127.0.0.1:3002/api/demo/**` | Shared fictional state for both portals.            |
| Real API                       | Default `http://localhost:4000`     | **Not started or used by `dev:demo`.**              |

`npm run dev` is the connected-development frontend command. `npm run dev:all` also starts the real Nest API. Do not use either as a substitute when presenting the isolated demo.

## What the launcher does

`scripts/dev-demo.mjs` starts only the customer and admin Next applications and sets an explicit demo profile:

- `RHC_APP_PROFILE=demo`
- `RHC_DEMO_MODE=1`
- `NEXT_PUBLIC_RHC_DATA_MODE=demo`
- fixture hub `http://127.0.0.1:3002/api/demo`
- customer/admin listeners bound explicitly to `127.0.0.1` on ports `3002`/`3003`
- real API and public Supabase values cleared for the child processes

The demo adapters do not create a Supabase client and do not fall back to `/api/v1`. Unsupported fixture paths return a local error.

This launcher behavior does not prove that the host has no other API, database, Docker, or provider process running. Stop unrelated services and verify listeners/network traffic before a formal presentation.

## Current local containment

The implemented source includes these safeguards:

1. The store requires both `RHC_APP_PROFILE=demo` and `RHC_DEMO_MODE=1`.
2. Production, staging, and preview contexts are refused by both launcher and route boundary.
3. Both Next demo servers bind explicitly to `127.0.0.1`; final listener capture showed no `0.0.0.0`, IPv6 wildcard, or port `4000` listener.
4. The hub accepts configured local hosts; defaults are `localhost:3002` and `127.0.0.1:3002`.
5. Approved origins default to customer/admin on both `localhost` and `127.0.0.1` ports `3002`/`3003`.
6. State-changing requests require an approved `Origin`; CORS is returned only for approved origins.
7. Responses use `no-store`, `nosniff`, explicit demo provenance, and a revision header while demo is active.
8. Disabled/forbidden demo profiles receive an opaque empty `404`; no fixture provenance or reason is exposed.
9. Demo sessions use opaque local tokens and are not Supabase or Nest credentials.
10. Resource reads and writes enforce persona capabilities, company scope where modeled, and read-only auditor denial.
11. Unknown routes fail locally and never proxy to a configured API.

These are demo-containment controls, not a completed production security review. In particular:

- the route does not currently enforce `Sec-Fetch-Site` or reject forwarded-host/protocol headers;
- default host/origin allowlists can be overridden by environment values and require security review before reuse;
- the browser-readable local session design is suitable only for this fixture profile;
- listener capture and browser-origin request tracking are not packet-level proof that no other local process or network path was contacted.

A packet-level network capture, expanded forwarded-header/fetch-metadata matrix, and independent security review remain required before release sign-off.

## Named personas

All identities and records are fictional.

| Persona              | Role                     | Demonstrated scope                                                                            |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| **Maya Santos**      | Verified customer        | Linked property, records, points, services, reservation, documents, payments, and Digital ID. |
| **Noah Reyes**       | Unverified customer      | Identity-review submission followed by separate authorized review and customer issuance.      |
| **Lina Cruz**        | Scoped property operator | Amica-scoped inventory, reservations, documents, and service requests.                        |
| **Marco Villanueva** | Compliance administrator | Identity, document, and certificate review within configured scope.                           |
| **Elena Garcia**     | System administrator     | Cross-module demo administration, settings, payment review, and points credit.                |
| **Ana de Leon**      | Read-only auditor        | Read-oriented evidence with explicit write rejection.                                         |

The customer `/login` page shows customer and staff personas and routes the selected workspace appropriately. The admin `/login` redirects to that shared chooser in demo mode. Persona filtering and mutation checks occur in the fixture hub, but this remains a demonstration—not production RBAC acceptance.

### Demo credential shortcuts

When the app is launched with `npm run dev:demo`, the same local login page also accepts demo-only credential shortcuts:

| Email                    | Password     | Demo persona      | Destination           |
| ------------------------ | ------------ | ----------------- | --------------------- |
| `demo@rhc.local`         | `Demo123456!` | Maya Santos       | Customer portal       |
| `superadmin@example.com` | `Demo123456!` | Elena Garcia      | Admin command center  |

These credentials are checked only by the local fixture hub at `/api/demo/session/credentials`. They are not Supabase, Nest API, database, or production credentials, and they are not enabled by normal connected-mode `npm run dev`.

## Durable shared state

Both portals read and mutate one repository-local world:

```text
.rhc-demo/
  world.json
  screenshots/
```

- `.rhc-demo/` is ignored by Git.
- `world.json` has schema version `1`, provenance `DEMO`, a deterministic clock, and a revision number.
- Writes are serialized inside the customer Next process, written to a temporary file, then atomically renamed.
- `If-Match` revisions can reject stale writes.
- Invalid, unsupported, unreadable, or non-file store paths fail closed without replacing the existing bytes; the request returns an actionable recoverable store error.
- A confirmed reset preserves an existing store backup before restoring the deterministic baseline. It is the only path that can recover malformed/unsupported JSON.
- State persists across refreshes and normal server restarts.

This is a single-process fixture mechanism. Its queue, atomic rename, and revision checks are **not proof of PostgreSQL transactions, row locking, idempotency under distributed workers, or database concurrency safety**.

### Reset

Use the visible **Demo environment — synthetic data** control and enter:

```text
RESET RHC DEMO
```

Or, with the servers stopped when practical:

```sh
npm run demo:reset -- "RESET RHC DEMO"
```

The explicit reset command restores the deterministic baseline and preserves any existing store as a timestamped backup. Reset affects only `.rhc-demo/world.json`; it does not invoke Prisma, migrations, providers, or the real API.

## Implemented shared workflows

| Workflow          | Customer side                                    | Admin/public side                                    | Demo-only result                                                                             |
| ----------------- | ------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Profile           | Edit permitted fields                            | Audit/receipt projection                             | Persists in `world.json`; verified identity fields stay locked.                              |
| Save property     | Save/unsave inventory                            | Shared inventory view                                | Local preference only.                                                                       |
| Reservation       | Create and cancel                                | Lina/Elena can confirm, cancel, expire, or convert   | Conflict and inventory release are simulated.                                                |
| Identity          | Noah submits review; eligible customer issues ID | Marco/Elena approves as a different actor            | Company-issued synthetic ID and credential.                                                  |
| Documents         | Submit text fixture and new versions             | Approve/reject with reason                           | No object storage, malware scan, or official document.                                       |
| Payments          | Submit evidence                                  | Verify or append reversal                            | No payment collection, gateway, refund, or settlement.                                       |
| RHC Points        | View and redeem fictional benefits               | Elena posts idempotent credits                       | No cash, token, merchant settlement, or conversion promise.                                  |
| Certificates      | View credential and public reference             | Issue, supersede, or revoke                          | Public state changes; no government title or chain anchoring.                                |
| Service requests  | Create request                                   | Lina progresses an in-scope request                  | No external work order or provider dispatch.                                                 |
| Reports           | —                                                | Filter, print, and safely export scoped records      | CSV/print output is provenance-labeled synthetic data.                                       |
| Recovery controls | Retry after an injected one-request `503`        | Empty, exception, latency, clock, and reset controls | Demonstrates UI recovery only; store recovery is separately tested in temporary directories. |

## Suggested tour

1. Run a reset and open public `/`, `/marketplace`, and a public verification result such as `/verify/rhc-id/demo-passport-maya-7d2f0f9a`.
2. Select **Maya Santos**. Show `/dashboard`, `/properties`, save/unsave, reserve/cancel, `/profile`, `/documents`, `/payment-records`, `/rhc-points`, `/certificates`, `/rhc-verify`, and `/security`.
3. Select **Noah Reyes** and submit identity review from `/digital-id`.
4. Select **Marco Villanueva** to approve the review, then return to Noah to issue the synthetic RHC Digital ID.
5. Use **Lina Cruz** for scoped reservation/service work and **Elena Garcia** for payment verification or an idempotent points credit.
6. Open admin `/reports`, filter the permission-scoped rows, and export the provenance-labeled CSV.
7. Use **Ana de Leon** to show a read-only mutation denial.
8. Trigger **Fail next request**, show the error, retry successfully, then reset the world.

State every time that records are fictional and local. Do not describe a completed UI action as a real payment, official identity decision, legal title, provider dispatch, database transaction, or blockchain event.

## Capability and publication boundaries

- No live PostgreSQL, Docker stack, Redis, Supabase project, storage provider, email/SMS provider, payment gateway, wallet/RPC provider, or blockchain network is required or accepted by this demo.
- RHC Points are centrally managed fictional points, not money or crypto.
- RHC Digital ID and certificates are company-issued demo records, not government credentials or title.
- Future wallet, token, blockchain, staking, exchange, custody, and crypto-payment surfaces remain inactive.
- The public PDF duplicate has been removed. The confidential source remains `documents/RHC WEB3 WHITEPAPER v1.0.pdf`.
- `/white-paper` still renders an in-app summary and must stay out of external tours until a content owner and legal reviewer approve the text and audience.

## Troubleshooting

| Symptom                                              | Action                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Port `3002` or `3003` is occupied                    | Stop the conflicting process; do not silently present a different URL.                            |
| `/api/demo/**` returns `404`                         | Start with `npm run dev:demo`; the store refuses non-demo profiles.                               |
| A write returns `403`                                | Use an approved customer/admin origin and the selected persona; do not weaken the allowlist.      |
| A write returns `409`                                | Refresh shared state; the record or world revision changed.                                       |
| A request returns the injected `503`                 | Retry once; **Fail next request** is self-clearing.                                               |
| State is confusing                                   | Use the explicit reset command/control rather than editing `world.json` while the app is running. |
| Any page reaches port `4000` or an external provider | Stop the demo and treat it as an isolation failure pending investigation.                         |
| A live/connected page shows fixture success          | Stop and treat it as a fail-closed defect.                                                        |

See the [validation report](validation-report.md) for the final Month 1 local rerun evidence, passed validation commands, and checks that remain unavailable or outside the local MVP boundary.
