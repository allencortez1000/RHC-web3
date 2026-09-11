# Month 2 Handoff

Prepared extension points:

- Wallet: add wallet tables/API behind `ENABLE_WALLET`
- RHC Points activation: enable rewards rules and posting workflow behind `ENABLE_REWARDS`
- Marketplace: add catalog/order modules behind `ENABLE_MARKETPLACE`
- Integrations: use `company_api_clients`, credential references, allowed events, and integration logs
- Web3 Gateway: add a separate service/module behind `ENABLE_BLOCKCHAIN`
- Smart contracts: add approved Solidity contracts under `contracts/` only after legal/security approval
- Certificates and QR verification: add document/certificate modules with off-chain authoritative records and optional chain anchoring
- Project milestone anchoring: use activity events and future Web3 queue without placing private records on-chain

Do not tokenize corporations, condominium title, equity, or customer custody assets without separate legal and compliance scope.
