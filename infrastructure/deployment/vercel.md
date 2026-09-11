# Vercel deployment

Deploy `apps/customer-web` and `apps/admin-web` as separate Vercel projects from the same repository.

Required variables:

- `NEXT_PUBLIC_API_URL`

Do not expose service-role Supabase keys or backend secrets to Vercel client bundles.
