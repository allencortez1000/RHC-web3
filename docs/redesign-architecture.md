# RHC Digital & Web3 Ecosystem — Redesign Architecture

**Status:** Month 1 presentation-layer redesign plan and implementation map  
**Scope:** Existing RHC local MVP/product prototype; no backend, auth, RBAC, database, demo-store, or API contract rewrite.

## Design north star

```text
ONE RHC ACCOUNT
ONE DIGITAL ID
ONE CONNECTED ECOSYSTEM
```

The interface should lead with property, customer utility, trusted records, and participating services. Web3 infrastructure remains an optional verification layer and future capability—not the primary customer mental model.

## Existing architecture map

| Boundary | Source of truth | Redesign treatment | Must remain unchanged |
| --- | --- | --- | --- |
| Public/customer Next app | `apps/customer-web` | Refresh public composition, storytelling, typography, cards, navigation, and responsive presentation. | Existing routes, data adapters, public/protected intent, verification privacy. |
| Customer portal | `apps/customer-web/app/*` | Refine `AppShell`, dashboard hierarchy, identity/property/rewards cards, states, and responsive navigation. | `useResource`, `useRuntime`, demo/connected selection, customer ownership rules. |
| Admin portal | `apps/admin-web` | Refine command-center density, visual hierarchy, status surfaces, tables, and responsive shell. | Admin routes, permission filtering, API contracts, audit behavior, feature gates. |
| Shared UI | `packages/ui/src/index.tsx` | Extend reusable logo, shell, card, status, motion, and presentation primitives without breaking existing props. | Auth/runtime behavior, accessible names, inactive Web3 semantics. |
| Shared design tokens | `packages/ui/styles/meridian-tokens.css` | Add premium RHC surfaces, glow, glass, spacing, motion, and typography semantics. | Navy/gold RHC identity and light/dark compatibility. |
| Customer styles | `apps/customer-web/app/globals.css` | Add scoped public hero, ecosystem, glass, reveal, and responsive rules. | Existing form/table/accessibility rules. |
| Admin styles | `apps/admin-web/app/globals.css` | Add scoped command-center polish and data-density rules. | Existing operational readability and contrast. |
| Demo world | `apps/customer-web/app/lib/demo/*` | No redesign-side behavior changes. | Persistence, reset, sessions, fixtures, scope checks, audit. |
| Connected API | `apps/api/src/*` | No redesign-side behavior changes. | Auth guards, RBAC, rate limits, feature gates, privacy, audit. |

## Route/component map

### Public and discovery

- `/` → `apps/customer-web/app/page.tsx` → `components/meridian-public/home-page.tsx`
- `/marketplace` → `components/meridian-public/marketplace-discovery.tsx`
- `/ecosystem` → `components/meridian-public/ecosystem-discovery.tsx`
- `/help` → public/help components, protected customer route by current policy
- `/future-technology` → `components/meridian-public/future-technology.tsx`
- `/rhc-verify` → authenticated customer verification entry
- `/verify/rhc-id/[token]` → public minimal verification result
- `/token` → redirect to Future Technology concept section

### Customer portal

- Shared shell and navigation → `packages/ui/src/index.tsx`, `apps/customer-web/app/web3-nav.ts`
- Dashboard → `apps/customer-web/app/dashboard/page.tsx`
- Digital ID → `apps/customer-web/app/components/digital-id-page.tsx`
- Properties/reservations → corresponding customer routes and `customer-data.tsx`
- Documents/payments/certificates → `apps/customer-web/app/components/demo-records.tsx` and domain pages
- Rewards → `/rhc-points`, `customer-data.tsx`, shared `MetricCard`
- Account/security/profile → existing customer components and runtime resource hooks

### Admin command center

- Shell/navigation/tables → `apps/admin-web/app/admin-data.tsx`
- Home overview → `apps/admin-web/app/page.tsx`
- Reports → `apps/admin-web/app/reports/page.tsx`
- Governance/settings → `management-controls.tsx`, feature/settings routes
- Audit/RBAC → existing admin routes and API-enforced permissions

## Safe implementation sequence

### Phase 1 — shared visual foundation

- Extend semantic RHC tokens for premium dark/light surfaces, glass, glow, spacing, motion, and display typography.
- Preserve existing `RHCLogoMark`, `Web3Button`, `Card`, `Badge`, `MetricCard`, `EmptyState`, and runtime props.
- Add reduced-motion-safe reveal/hover utilities.

### Phase 2 — public shell and landing story

- Keep public route structure.
- Refine header/footer and hero hierarchy.
- Add an original RHC ecosystem orbit visual using CSS/semantic nodes, not copied Kaia assets.
- Keep demo/provenance and future capability language visible.

### Phase 3 — customer portal composition

- Refine portal sidebar/header, dashboard hero, identity card, property journey, rewards and activity surfaces.
- Keep resource loading/error/empty states and all existing links/actions.

### Phase 4 — admin command center

- Refine admin shell, hero metrics, queue cards, tables, and status hierarchy.
- Preserve permission visibility and server-authoritative actions.

### Phase 5 — responsive/accessibility validation

- Validate at 390, 768, 1440, and 1920px.
- Preserve skip links, labels, focus rings, keyboard map/list controls, reduced motion, and no horizontal overflow.

## Visual language

- **Dark mode:** deep navy/charcoal base, restrained gold illumination, layered surfaces, thin borders, low-opacity grid.
- **Light mode:** white/off-white surfaces, dark typography, restrained gold accent, readable tables/forms.
- **Typography:** large architectural display headings on public surfaces; compact high-clarity labels in operations.
- **Glass:** reserved for hero overlays, account/identity summaries, ecosystem cards, and verification surfaces.
- **Status:** always pair color with text; distinguish `LIVE`, `DEMO`, `PILOT`, `PREPARED`, `COMING SOON`, and `PLANNED`.
- **Motion:** CSS transforms/opacity only, short durations, disabled under `prefers-reduced-motion`.

## Explicit non-goals

- No Kaia branding, copied assets, copied text, or exact layout.
- No public token issuance, wallet custody, crypto payment, staking, exchange, blockchain execution, or ownership claim.
- No API/database/auth/RBAC rewrite.
- No fabricated partners, balances, counts, live statuses, or production integrations.
- No removal of existing routes or tests merely to simplify styling.

## Acceptance checklist

- Existing typechecks/lints remain green.
- Existing API, demo store, HTTP, and browser tests remain green.
- Public/customer/admin routes remain reachable according to current route policy.
- Demo mode remains isolated and persistent.
- Light/dark themes remain readable.
- Core journeys retain loading, error, empty, unauthorized, and future/inactive states.
- No Critical/High security or privacy regression is introduced.
