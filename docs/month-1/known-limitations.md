# Known Limitations

- External Supabase, Upstash, R2, Resend, Twilio, Sentry, Vercel, and Render credentials are required for hosted environments.
- Supabase Auth production JWT/JWKS verification is architected as a boundary; local development uses opaque user-id bearer tokens after provider validation would occur.
- RHC Points, Wallet, Marketplace, Blockchain, token, transfer, token sale, crypto payment, and staking functionality are intentionally disabled and not implemented as active Month 1 production features.
- Sample properties are seeded/demo data and clearly marked in metadata.
