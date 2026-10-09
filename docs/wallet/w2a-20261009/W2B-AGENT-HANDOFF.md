# RHC Web3 — W2B Development Handoff (NOT APPROVED / NOT EXECUTED)

This is **planning context only** for the next separately scoped connected-wallet workstream. It is not authorization to enable W2A or create real wallet identities.

- **Agent thread:** NEW — `RHC — Boss Allen W2B Thirdweb Provider and Auth Bridge Review`.
- **Suggested AI model:** GPT-6 Astra, thinking **High** in Zed, only if actually available and verified. Otherwise use the currently available model after disclosing its actual identity.
- **Machine:** DESKTOP-5TQ68F9 (Boss Allen only).
- **Root:** `C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009`
- **Branch/worktree:** `allen/w2a-thirdweb-wallet` in the new W2A worktree; W2B must branch again to avoid disturbing W2A, once approved.
- **Exact W2B base commit:** Must be taken from the separately verified W2A Git closure SHA after commit/push. Never guess; W2B is not authorized by W2A acceptance.
- **Allowed scope for present planning:** read only, review W2A gated SDK boundary and Boss Gal's published wallet-auth contract. No live code execution.
- **Prohibited:** remove W2A hard lock without approval, obtain/private-key/email OTP extraction, provider sign-up, accept unverified JWT, disable onboarding restrictions, modify backend/DB/feature flags, token deployment or transfer, billing or credentials, SSH/network tunneling.
- **Required future tests (only after approval):** approved test identities, custom JWT issuer/audience/JWKS, consent, chain allowlist, connect/recover/disconnect across account switches, timeout/retry, denied/admin user, phishing origin, provider outage, replay nonce and EIP-1271 design as applicable. Use disposable provider accounts; no real user data.
- **Required handoff:** `W2B-CONTRACT-DECISION.md`, `W2B-SECURITY-MATRIX.md`, `W2B-CONNECTED-RESULT.md`, `W2B-PRESERVATION.md`, `handoff-manifest.json`.
- **Stopping/approval point:** Before public JWKS exposure, any provider API call, any wallet creation, the first live connect, token read, backend write or deployment. Obtain explicit approval from Boss Allen, Boss Gal (on shared identity/backend boundaries), and management where required.

**Current W2A verdict:** formal acceptance for the **offline W2A preparation milestone only**, recorded in `ACCEPTANCE-DECISION.md`; no live connection or W2B authorization.
