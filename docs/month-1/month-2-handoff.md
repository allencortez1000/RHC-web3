# Month 2 Handoff

## Start from the implemented Month 1 boundaries

Do not reintroduce the old opaque-UUID authentication, API password endpoints, runtime mock fallback or static admin success paths. Current source includes:

- Supabase browser SDK auth, same-browser PKCE-only confirmation/recovery, server JWT verification and authoritative Auth Admin lookup. `auth_email_confirmed_at` is separate from business `PENDING`/reviewed `VERIFIED` and account status.
- Explicit reviewed business approval and guarded/idempotent RHC ID issuance; approved/issued identity self-edits are locked except mobile contact changes.
- Ownership-based customer routes; company/project-scoped admin lists and resource mutations, including reservation transitions and property status history; global status/role/permission/assignment governance with review references, delegation and protected-role checks; typed settings and API-backed reference selectors.
- Append-only consent history, transactional audit/activity evidence, and company-bound hashed machine keys with issue/rotation/revocation and delegated scopes.
- Machine metadata reads plus `POST /internal/identity/verify` and `/internal/events`, using company consent, event allowlists and idempotency receipts. These are not a general webhook executor or trusted business/ledger commands.
- Redis global IP and authenticated user/client limiting wired into guards. API environment loading and validation are implemented; trusted proxy topology is still a manual infrastructure task.

See [API overview](../api/api-overview.md) for actual method/path contracts. `GET /auth/config` and new-user provisioning gates do not disable raw Supabase signup: provider-side disablement or an approved Auth hook is external follow-up.

## Prerequisites before expanding or activating features

**Staging migration NO GO / no deployment.** Five migrations are pending; no applied RLS/revocations are established. The prior database URL syntax check failed, and target roles/grants remain unknown. Complete target/role approval, approved disposable PostgreSQL migration verification, then separately approved live acceptance. Lockdown applies to allowlisted application tables in `public` with **no FORCE RLS**; owner/service access, non-owner backend privileges/bypass and indirect client access require actual review.

Main reports 210 unit tests / 11 suites and 140 API tests / 8 suites passing with fixtures only. Final browser reruns are pending (approximately 55 customer / 65 admin). Node 22/runtime, Docker, provider, database concurrency and ingress checks are not inferred from those results. Preserve [the pending final-result record](targeted-completion-report.md#pending-final-result-main-to-update) rather than marking Month 1 accepted by assumption.

## Actual extension work

| Area | Existing foundation | Month 2 work still required |
| --- | --- | --- |
| Wallet | Inactive customer surface and `ENABLE_WALLET` / external-wallet boundaries. | Approved wallet model, API, custody/noncustody decisions, recovery/security controls and tests. A flag does not add a wallet. |
| RHC Points | Inactive account/rule/transaction/redemption schema and ledger constraints; `ENABLE_REWARDS` off in seed definitions. | Approved earning/redemption rules, posting/reversal workflow, idempotency/concurrency/ownership verification, reconciliation and admin/customer APIs. Do not treat service event receipts as points postings. |
| Marketplace | Inactive surface and `ENABLE_MARKETPLACE`. | Catalog/order/payment/fulfillment domain and legal/operational approvals; no existing commerce implementation is implied. |
| Company integrations | Hashed keys/scopes, company event allowlists, consent checks, integration logs/receipts and safe directory reads. | Approved per-partner mappings, delivery workers/queues/retries, reconciliation, operational monitoring and narrowly delegated new scopes. Never repurpose machine credentials as user sessions. |
| Identity corrections | Reviewed business approval and locked approved identity. | Separately reviewed administrative correction workflow, evidence and re-verification policy; do not loosen `/me` to overwrite approved identity. |
| Consent/governance | Append-only policy/version/purpose decisions and company-bound sharing checks. | Legal policy/version rollout, retention/deletion process, operational review and any broader enforcement explicitly required; signup metadata is not consent-history evidence. |
| Web3 gateway | Off-chain activity events and `ENABLE_BLOCKCHAIN` boundary. | Separate service/module, durable approved delivery, replay/reconciliation and privacy review. No production chain deployment is authorized. |
| Certificates / QR / milestones | RHC identity, project/property records and off-chain evidence. | Document/certificate APIs and verification model; optional anchoring only after legal/security/privacy approval. Public ID lookup must not become a PII export. |
| Smart contracts | Boundary documentation under `contracts/`. | Approved Solidity scope and independent security/legal review before implementation/deployment. |

Keep wallet, rewards, marketplace, blockchain, public token, transfer/sale, crypto payment and staking inactive until their implementations and approvals exist. Do not tokenize corporations, condominium title, equity or customer custody assets without separate legal/compliance scope. Sensitive customer, property, financial, contract and authentication data remains off-chain.
