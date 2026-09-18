# Company Integration Activation Boundary

The repository implements an integration framework. It does not imply that a
specific company has been approved or configured for active integration.

## Runtime gates that are already enforced

A company machine request must pass all applicable checks in the API:

1. The company is `ACTIVE` and `api_enabled` is `true`.
2. The client is active, its stored credential is a versioned hash, and the
   presented key matches that hash.
3. The requested API scope is present in the client's stored scopes.
4. `ENABLE_INTEGRATION_FRAMEWORK` is operationally enabled. Month 1 feature
   policy prevents future Web3 flags from activating.
5. Internal events use only the existing allowlist:
   `SERVICE.REQUESTED`, `SERVICE.COMPLETED`, and `SERVICE.CANCELLED`.
6. The company event allowlist must explicitly enable the event type.
7. Identity-associated verification/events require an issued RHC ID, active
   confirmed account, and current company-specific consent. Withdrawal and
   account disablement are rechecked on replay.
8. Idempotency receipts are scoped to company, client, operation, and key;
   conflicting reuse is rejected.

Accepted service reports create namespaced activity/receipt evidence only.
They do not approve business verification, post rewards, create token
transfers, change ownership, or perform financial ledger transitions.

`CompanyIntegration.status` and `BusinessService.status` are metadata
records. Setting one to `ACTIVE` is not, by itself, an approved machine
activation and cannot bypass the gates above.

## Required operator procedure

Before a partner is treated as active, retain evidence for each step:

1. Obtain the required business/security approval for the named company and
   integration purpose.
2. Confirm the company record is `ACTIVE` and obtain explicit approval for
   `api_enabled=true` through the existing scoped company-management path.
3. Create or confirm only the necessary integration metadata. Do not write
   credentials or arbitrary configuration through general metadata DTOs.
4. Issue a client credential intentionally through
   `POST /admin/api-clients` using an authorized operator with
   `integration.manage` and delegation authority for every requested scope.
   Disclose the returned key only once through the no-store response; never
   place it in seed data or ordinary logs.
5. Approve the minimum scopes required from the existing API scope catalog.
6. Explicitly enable only the approved event types for the company.
7. Confirm the applicable customer consent exists for each identity-related
   operation. The consent policy/version must be configured from approved
   policy inputs before a real customer can grant new consent.
8. Record approval, scope/event decisions, credential issuance, and
   configuration evidence in the existing audit/operational process before
   allowing partner traffic.

## Missing approved management step

There is no dedicated, approved API workflow in the current repository for
changing the `company_events` allowlist or for recording a formal partner
activation approval. The existing integration/status management endpoints
handle metadata only. Do not introduce an unrestricted public activation
endpoint and do not claim a company is fully active merely because an
integration row or `api_enabled` field exists. A later approved operator
workflow or controlled database procedure must be specified before live
activation.

## Deactivation and emergency response

For a safe shutdown, disable the company API or company status through the
existing scoped management path, revoke each affected client through the
emergency revocation route, and disable approved event entries through the
future controlled allowlist procedure. Credential revocation remains
available even when the integration feature switch is off. Verify that
replays fail after account/consent/company/client state changes and retain the
related audit and receipt evidence.

The fixture suite in `apps/api/test/internal-integration.e2e-spec.ts` covers
inactive/API-disabled companies and clients, insufficient scopes, event
allowlist denial, consent withdrawal, replay invalidation, and feature
shutdown. These are local doubles, not live partner acceptance.
