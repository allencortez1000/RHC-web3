# Month 1 Testing

Run:

```bash
npm install
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run build
```

Critical tests are represented across unit, integration, API, authorization, and E2E smoke suites. CI runs install, Prisma generation, lint, typecheck, tests, and builds.

Before acceptance against a live Supabase project, also run migrations and seeds against a disposable database:

```bash
npm run db:migrate
npm run db:seed
```
