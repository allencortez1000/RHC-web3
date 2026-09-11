# System Architecture

RHC Digital is a monorepo composed of two Next.js applications and a NestJS API backed by Supabase PostgreSQL through Prisma.

```mermaid
flowchart TD
  Customer[Customer Web] --> API[NestJS API /api/v1]
  Admin[Admin Web] --> API
  API --> Auth[Supabase Auth Boundary]
  API --> DB[(Supabase PostgreSQL)]
  API --> Redis[Upstash Redis abstraction]
  API --> R2[Cloudflare R2 abstraction]
  API --> Email[Resend abstraction]
  API --> SMS[Twilio abstraction]
  DB --> Audit[Audit Logs]
  DB --> Events[Activity Events]
  Events --> Future[Month 2 integrations / Web3 gateway]
```

Priority order: security, identity, companies, projects, properties, customer relationships, services, integration foundation, rewards foundation, audit, and future Web3.

Blockchain is not a primary database. Sensitive customer, property, financial, contract, authentication, and business data remains off-chain.
