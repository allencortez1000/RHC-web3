# CEO / Authorized Issuer Decisions Needed to Unblock OFF-25 and the November 10 Token Gate

**Prepared for:** Boss Allen (wallet/Thirdweb) with Boss Gal (backend/shared contracts).  
**Status:** Requests for approval, **not signatures, settled decisions or implementation authority**.

The November 10 direction reported by Boss Gal is a **restricted/view-only ERC-20 on Ethereum Mainnet**, while a dedicated RHC Ethereum L2 belongs to a future separately funded phase. The original proposal's public contract deployment/integration obligation remains; later scope changes need the authorized written record.

## Minimum decisions to request immediately

| Decision | Exactly what the issuer/CEO should confirm | Status |
|---|---|---|
| Authorized token/version | Contractual November ERC-20 L1 versus future L2; whether the L1 asset is canonical or to be migrated/bridged | **Unsigned / unverified** |
| Network | Exact approved Ethereum Mainnet chain ID and separate testnet validation target, test durations and permitted RPC operators | **Staging direction reported; not release authorization** |
| Token name/symbol/decimals | Exact case-sensitive metadata, immutable or changeable semantics, versioned issuer-controlled decision record | **Not provided** |
| Supply/issuance | Cap; initial mint `0` versus restricted mint; treasury allocations, lock/vesting, and how public circulating-supply claims are made | **Unresolved** |
| Contract controls | Directly enforced customer transfer/approval/permit/transferFrom restrictions; corporate deployment, issuance, pause, role, upgrade and recovery powers | **Owner approvals pending** |
| Contract provenance | Approved source code/ABI/build hash; proxy/implementation policy; after deployment chain ID, exact address, tx/block receipt and explorer verification | **Not accepted** |
| Signing/custody | Company-controlled deployment account/multisig owners, access custody, finance/security review, emergency ownership/rollback | **Owner appointment pending** |
| Provider funding | Thirdweb billing and access, allowed domains, RPC request budget, spending limit, operator | **Not yet confirmed** |
| Release decision | Separate APP versus TOKEN GO/NO-GO, counsel/privacy/security findings and named accepted client/UAT signatories | **Not signed** |
| Backend contract | Boss Gal approves RHC account identity/JWT/JWKS mapping, server-side wallet proof/link contract, permission model and data minimization | **Coordination required** |

Please record approver name and role, decision date, exact versioned text, and signed/verifiable record. **Do not paste secrets, private keys, credential values or unpublished customer records.**

## Safe next implementation after decisions

When approved: review an independently verified issuer source-of-truth, implement a secure server-only approval loader/signature verifier, compare exact token identity and chain/source hashes, run negative cross-chain/forged-issuer tests offline, and only then request **separate** bounded nonproduction provider authorization. Never infer officialness from token `name()` and `symbol()` alone.

**This synthetic preparation does not satisfy or waive OFF-25, a deployed contract, or the November 10 public-chain deliverable.**
