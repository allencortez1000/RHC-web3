# RHC Digital & Web3 Ecosystem — Current System Inventory

**Document date:** 2026-09-30  
**Scope:** Existing local MVP / product prototype  
**Evidence:** Inventory summarized from the preceding project work and reported validation. No fresh code audit or test run was performed specifically for this document.

## Overview

The project contains a public website, customer portal, admin command center, backend API, shared design system, and persistent local demo environment.

Most complete end-to-end workflows currently operate in the local demo using synthetic records. Connected backend foundations exist, but this does not mean the system is deployed, production-ready, or integrated with live providers.

## 1. Public Website

| Area | Current contents |
| --- | --- |
| Homepage | RHC branding, “One identity. One ecosystem.” hero, property/customer journey sections, and portal entry buttons |
| Interactive ecosystem visual | Selectable Digital ID, Properties, Rewards, Verify, Amica, and RHC Services nodes |
| Marketplace discovery | Service categories, search/filter controls, availability labels, and demo/planned boundaries |
| Public verification results | Reference-based valid, pending, expired, revoked, superseded, and not-found states |
| Public navigation | Home, Discover, Marketplace, sign-in entry, responsive mobile menu, and footer |
| Branding | RHC coin artwork used as the logo and browser icon |
| Theme controls | Light, dark, and system preference |

The RHC Verify entry form is inside customer access, rather than a public header item. Individual credential-result URLs remain publicly accessible under `/verify/rhc-id/[token]`.

The ecosystem animation presents product areas; it is not evidence that every depicted service is live. Its Core/Pilot/Planned labels must be read within the demonstration context.

## 2. Customer Portal

### Dashboard and account

- Customer dashboard and welcome information
- Profile/account information
- Account and verification status
- Linked-property summary
- Active-reservation summary
- RHC Points summary
- Documents and certificates overview
- Recent activity
- Notifications
- Customer account hub
- Security and logout controls
- Appearance/settings page

### RHC Digital ID

- Company-issued RHC Digital ID display
- Customer identity and account status
- Identity-review workflow in demo mode
- Separate authorized review and customer issuance
- QR/reference verification
- Linked-property context
- Issuance eligibility checks

**Boundary:** RHC Digital ID is not a government ID, land title, or legal proof of ownership.

### Property experience

- Property discovery and details
- Customer-property relationships
- My Properties
- Save/unsave properties in demo mode
- Property lifecycle/journey presentation
- Project updates and milestones
- Related document, payment, and certificate links

### Reservations

- Create demo reservations
- View records and statuses
- Cancel eligible reservations
- Shared customer/admin visibility
- Inventory conflict handling
- Reservation history and persistence
- Authorized admin status transitions

### Payment records

- Submit synthetic payment evidence
- View records and statuses
- Admin verification
- Append-only reversal workflow
- Customer/admin consistency

**Boundary:** These are evidence/status records, not real collection, settlement, refunds, or crypto payments.

### Documents

- Document list and metadata
- Synthetic text-file submission
- Document versions
- Admin approval/rejection
- Customer ownership checks
- Demo preview/download
- Version history and persistence

**Boundary:** Production file storage and malware scanning are not connected.

### RHC Points / Rewards

- Ledger-derived balance
- Earned/redeemed history
- Source and reference information
- Demo benefit redemption
- Authorized admin credits
- Duplicate/retry protection
- Overspend prevention
- Audit/history records

**Boundary:** RHC Points are centralized fictional demo points, not money, cryptocurrency, investment returns, or a conversion promise.

### Certificates and verification

- Customer certificate list and metadata
- Public verification references
- Demo issuance, supersession, and revocation workflows
- Privacy-limited public result pages
- Authenticated verification entry form

### Ecosystem and services

- Company/project/property/service directory
- Connected-map and list views
- Search and filters
- Selected-entry details
- Recorded relationship explanations
- Demo service-request creation
- Service-request status/history

### Help and future technology

- Searchable Help Center
- Topic filters and expandable answers
- Support availability explanations
- Future Technology roadmap
- Governed token concept artwork
- Explicit inactive-feature notices
- In-app white paper summary, subject to publication approval

## 3. Admin Command Center

| Workspace | Current purpose |
| --- | --- |
| Command Center | Operational overview, pending work, exceptions, recent audit activity |
| Customers | Customer records and review context |
| Users | Application-user administration |
| RHC Digital IDs | Identity registry and eligibility/review visibility |
| Verification | Business-verification review |
| Companies | RHC business/company directory |
| Projects | Property-project administration |
| Properties | Property inventory and record management |
| Amica Tower Inventory | Dedicated inventory workspace |
| Customer Properties | Customer-property relationships |
| Reservations | Reservation review and status management |
| Payments | Demo evidence verification and reversal |
| Documents | Demo document/version review |
| Certificates | Demo issuance and lifecycle management |
| Rewards Ledger | Reward history and authorized demo credits |
| Service Requests | Scoped request review and progression |
| Business Services | Service-directory administration |
| Integrations | Integration records and preparation status, not proof of live connections |
| Reports | Permission-scoped loaded-record reporting, filters, CSV export, and print support |
| Audit Logs | Operational history |
| Roles | Role administration |
| Permissions | Permission visibility |
| User Roles | Role assignments and scope |
| Feature Flags | Governed feature configuration |
| System Settings | Supported application settings |

Admin navigation is permission-filtered. The API/demo server, rather than hidden buttons, enforces access permissions. Workspace availability does not establish equivalent live-provider implementation.

## 4. Authentication and Security

### Local demo authentication

- Named synthetic customer/staff personas
- Demo email/password shortcuts
- Separate customer/admin sessions
- Session expiry
- Logout and revocation
- Disabled-account checks
- Protected-route redirects

### Connected authentication foundations

- Supabase authentication adapters
- Login/registration/recovery/confirmation flows
- PKCE handling
- Nest API bearer-token authentication
- JWT signature and claim validation
- Application-user synchronization

### Authorization and security controls

- Customer ownership checks
- Admin permission checks
- Company/project scope
- Read-only auditor restrictions
- Identity-review separation
- Feature gates
- Rate-limit controls
- CORS/security-header configuration
- Controlled API errors
- Sensitive-field redaction
- Audit logging
- Separate machine/API-client authentication

**Boundary:** Live-provider and production security acceptance remain separate requirements. Existing tests do not replace independent security review.

## 5. Persistent Local Demo

Customer and admin applications share one synthetic world:

```text
.rhc-demo/world.json
```

Supported behavior:

- Canonical fixture initialization
- Persistent reads and writes
- State across refreshes and normal restarts
- Shared customer/admin changes
- Explicit reset and backup during confirmed reset
- Corrupt/unsupported-state handling
- Serialized writes
- Revision/conflict checks
- Synthetic audit/history records
- Demo latency, empty-state, and failure controls

This is a local single-process fixture store, not proof of production database durability or distributed concurrency guarantees.

### Demo personas

| Persona | Role |
| --- | --- |
| Maya Santos | Verified customer |
| Noah Reyes | Unverified customer |
| Lina Cruz | Scoped property operator |
| Marco Villanueva | Compliance administrator |
| Elena Garcia | System administrator |
| Ana de Leon | Read-only auditor |

### Demo credentials

| Account | Email | Password |
| --- | --- | --- |
| Customer | `demo@rhc.local` | `Demo123456!` |
| Admin | `superadmin@example.com` | `Demo123456!` |

These are intentionally documented local demo credentials. They do not authenticate Supabase, the connected Nest API, databases, or production services.

### Start the demo

```sh
npm run dev:demo
```

| Surface | URL |
| --- | --- |
| Public/customer | `http://127.0.0.1:3002` |
| Shared demo login | `http://127.0.0.1:3002/login` |
| Admin | `http://127.0.0.1:3003` |
| Fixture API | `http://127.0.0.1:3002/api/demo` |

Use `127.0.0.1` consistently rather than alternating with `localhost`.

For reset instructions and confirmation requirements, see [Demo Guide](demo-guide.md).

## 6. Backend and Shared Packages

| Location | Responsibility |
| --- | --- |
| `apps/customer-web` | Public/customer Next.js application and local fixture API |
| `apps/admin-web` | Admin Next.js application |
| `apps/api` | NestJS connected-backend foundation |
| `packages/ui` | Shared components, themes, shells, auth/runtime adapters, resource states |
| `packages/types` | Shared contracts and demo types |
| `packages/database` | Prisma schema and database tooling |

Backend areas include authentication, customer self-service, consent, property directories, reservations, identity issuance, admin management, audit/events, machine clients, and internal integration endpoints.

Connected-mode gaps remain for several complete demo domains, including documents, payment evidence, rewards, certificates, and service requests. Working demo interfaces must not be described as live backend integrations.

## 7. Design System and Frontend Features

- RHC navy/gold identity
- Light/dark/system themes
- Shared logo component
- Public and portal shells
- Cards and metric cards
- Buttons and status badges
- Digital ID presentation
- Search/filter interfaces
- Command/navigation menu
- Tables and report exports
- Loading/error/empty states
- Focus and keyboard-navigation support
- Skip links
- Responsive layouts
- Selective glass surfaces
- Hero gradients
- CSS motion with reduced-motion support
- Interactive ecosystem orbit

**Redesign scope:** The latest pass primarily refreshed the landing hero, ecosystem visual, tokens, public header, and dashboard hero surfaces. It was not a complete route-by-route redesign of every module.

## 8. Tests and Validation Tooling

The repository includes:

- TypeScript checks and ESLint checks
- API unit and integration/e2e tests
- Demo store tests
- Demo HTTP workflow smoke tests
- Demo browser acceptance tests
- Customer/admin frontend tests
- Responsive browser checks
- Auth/RBAC negative tests
- Console/request/asset error checks

### Previously recorded results

| Check | Last reported result |
| --- | --- |
| UI/customer/admin typecheck and lint | PASS |
| Customer/admin builds | PASS |
| Demo store tests | PASS — 25 tests |
| Demo HTTP smoke | PASS |
| Demo browser smoke | PASS |
| API unit tests, earlier system check | PASS — 217 tests |
| API e2e tests, earlier system check | PASS — 143 tests |

These are results from preceding work, not a fresh validation run for this inventory. Consult [Validation Report](validation-report.md) for scope and limitations. A passing local suite does not establish production readiness.

## 9. Not Active / Not Yet Connected

The system does not currently provide:

- Public token issuance
- Token trading or exchange
- Staking or APY
- Crypto payments
- Wallet custody
- Tokenized property ownership
- Live blockchain transactions
- Approved Kaia integration
- Thirdweb integration
- Real payment collection
- Real email/SMS delivery in demo mode
- Production object storage
- Production identity-verification provider
- Accepted production deployment

Kaia is currently a visual inspiration, not an activated blockchain dependency. Future Web3 providers must remain separate from authoritative RHC customer records, permissions, property records, and business rules.

## 10. Documentation Index

| Document | Purpose |
| --- | --- |
| [Project Status Summary](project-status-summary.md) | Overall project status |
| [Demo Guide](demo-guide.md) | Demo operation, personas, credentials, and reset |
| [Route Coverage](route-coverage.md) | Route inventory and boundaries |
| [Design System](design-system.md) | Visual system and component guidance |
| [Redesign Architecture](redesign-architecture.md) | Redesign architecture and affected-component map |
| [Validation Report](validation-report.md) | Recorded validation results and limitations |
| [Phase 2 Handoff](phase-2-handoff.md) | Remaining connected-mode work and approval gates |

## Bottom Line

RHC currently has a substantial local MVP connecting customer identity, property records, reservations, payment evidence, documents, rewards, certificates, services, and administration.

Its demo workflows are persistent and shared across portals. Production integrations and financial/Web3 activation remain outside the completed local-demo scope. Internal acceptance and production release must be recorded separately from implementation or automated test success.
