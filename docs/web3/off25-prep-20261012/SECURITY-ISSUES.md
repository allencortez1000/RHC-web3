# OFF-25 — Security Boundary and Outstanding Issues

**Status: PREPARATION ONLY; OFF-25 FAIL/BLOCKED; W01-P2 NOT RUN.**

## Controls supported by offline evidence

- Standalone pure comparator does not import or invoke Thirdweb at runtime; no RPC fetch, secret, wallet, signing, transaction, contract bytecode, live chain or environment activation.
- Synthetic-only reference is intentionally marked `OFFLINE_TEST_FIXTURE_ONLY`; even exact fake metadata agreement returns `officialTokenVerified=false`, `issuerSignatureVerified=false`, and `releaseAuthorized=false`.
- Missing approved reference is `UNVERIFIABLE`; mismatch is separately reported; malformed/unobserved values never become zero, false, or official success.
- Wrong chain, address, token name/symbol/decimals, missing block provenance, stale/disabled source, Unicode/confusable expected names and unsupported fields are covered by local tests.
- Existing production API, SDK adapter, registry, `APPROVED_TESTNETS`, W1/W2A/W2B/W01/OFF-16 and Boss Gal backend are unmodified.

## Remaining blockers (none resolved by this helper)

1. **Authoritative issuer-signed specification:** exact name, symbol, decimals, network/chain ID, contract source/ABI hash, runtime address after authorized deployment, signer/corporate custody, decision reference and authorized approval process are not yet verified. Without this, the live comparison must **not** claim official identity.
2. **Token economics and direct restrictions:** proposed 100M cap versus earlier supply concepts, initial minted amount, reserves, issuer controls, transfer/approve/mint/pause/upgrade policy, and L1-to-future-L2 continuity remain subject to formal CEO/issuer and security review. Public transactions disabled in UI alone is insufficient.
3. **Independent source/chain proof:** a metadata match cannot establish verified bytecode, chain finality, honest provider, ERC-20 transfer restrictions, treasury authority or legitimate contract. A malicious contract can imitate token metadata.
4. **Provider/environment:** Thirdweb billing, domain/Client ID, permitted RPC budget, allowed testnet, privacy and Auth/Redis/API readiness require separate authorization and real evidence.
5. **User wallet features:** current `Web3ReadResult` lacks account-specific token balance and transaction history; centralized RHC Points are a different backend ledger. This helper does not implement either.
6. **Release/legal/UAT:** no connected browser acceptance, independent contract review, DPO/legal approval, issuer signing, finance/ops ownership, Ethereum Mainnet GO decision, or public deployment.

**Risk rule:** Never wire this synthetic comparator into a production `official` badge, `APPROVED_TESTNETS`, API identity attestation or signed token release path. Only a separately approved integration design with signed/verified issuer record and independent chain/code checks may later enable a real identity assessment.

**Stop:** Owner review before commit/push; no connected or official token operations under this workstream.
