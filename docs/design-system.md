# RHC Meridian Design System

**Evidence snapshot:** 2026-09-21  
**Status:** Current source guidance for the customer and admin applications after Month 1 local-MVP closure. It documents implemented presentation and demo behavior; it does not claim production, provider, legal, financial, or formal accessibility acceptance.

## Product principles

1. **Business platform first.** Identity, property, records, rewards, services, and administration use familiar portal patterns. Wallet, token, blockchain, staking, exchange, custody, and crypto-payment surfaces remain inactive.
2. **Navy and gold with restrained emphasis.** Gold marks brand emphasis and primary action; it must not imply financial value, token availability, or investment performance.
3. **One hierarchy across both portals.** Customer and admin applications share tokens, components, status language, light/dark themes, and feedback patterns.
4. **Provenance must be visible.** Fictional records use `DEMO ONLY`, `Demo environment — synthetic data`, or equivalent copy. A local fixture result must never look like a production transaction or official record.
5. **Server authority remains explicit.** The UI may hide unavailable controls, but identity, scope, authorization, audit, and workflow transitions remain server responsibilities.

## Current implementation map

| Area                       | Source of truth                                     | Current role                                                                                                  |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Shared semantic tokens     | `packages/ui/styles/meridian-tokens.css`            | Single dark/light token foundation imported by both applications.                                             |
| Shared components          | `packages/ui/src/index.tsx`                         | Cards, badges, buttons, themes, command menu, shells, domain previews, and navigation.                        |
| Shared runtime             | `packages/ui/src/runtime.tsx`                       | API/demo transport selection, auth forms, persona chooser, resource hooks, errors, and visible demo controls. |
| Demo contracts             | `packages/types/src/demo.ts`                        | Personas and durable fixture-world types.                                                                     |
| Demo state and behavior    | `apps/customer-web/app/lib/demo/`                   | Deterministic seed, `.rhc-demo/world.json` store, authorization, and workflow router.                         |
| Public RHC Digital experience | `apps/customer-web/app/components/meridian-public/` | Home, marketplace, ecosystem/help presentation, verification entry, and future-technology content.            |
| Customer styles            | `apps/customer-web/app/globals.css`                 | Customer/public layouts and component styling on shared tokens.                                               |
| Admin styles               | `apps/admin-web/app/globals.css`                    | Command-center layouts and admin styling on shared tokens.                                                    |

The shared token file removes the earlier duplicated token-source problem. The two app stylesheets still contain separate application-specific component rules and must continue to use the shared variables rather than redefining the foundation.

## Foundation tokens

Use semantic CSS variables instead of adding raw colors when an existing intent applies.

| Intent           | Token                         | Dark      | Light     |
| ---------------- | ----------------------------- | --------- | --------- |
| Page background  | `--rhc-bg`                    | `#07111f` | `#f5f7fa` |
| Surface          | `--rhc-surface`               | `#101d2e` | `#ffffff` |
| Elevated surface | `--rhc-surface-elevated`      | `#172a42` | `#ffffff` |
| Border           | `--rhc-border`                | `#24364d` | `#e4e7ec` |
| Primary gold     | `--rhc-primary`               | `#d4af37` | `#9a7016` |
| Heading/text     | `--rhc-heading`, `--rhc-text` | `#f8fafc` | `#101828` |
| Muted text       | `--rhc-muted`                 | `#8391a5` | `#667085` |
| Success          | `--rhc-success`               | `#4ade80` | `#15803d` |
| Warning          | `--rhc-warning`               | `#fbbf24` | `#b45309` |
| Danger           | `--rhc-danger`                | `#f87171` | `#b42318` |
| Information      | `--rhc-info`                  | `#60a5fa` | `#1d4ed8` |

- Sans stack: Inter, Manrope, and system fallbacks through `--rhc-font-sans`.
- Mono stack: SFMono/Consolas/Liberation Mono/Menlo through `--rhc-font-mono`; reserve it for references, hashes, and identifiers.
- Body baseline: `15px` with `1.65` line height.
- Radius tokens: `8px`, `12px`, `16px`, and `24px`.
- Motion token: `180ms ease`; motion is ornamental and must respect reduced-motion preferences.
- Never communicate state by color alone. Pair color with text, a badge, or an accessible label.

## Shared component inventory

### Foundation and navigation

- `Web3Shell`, `AppShell`, admin `AdminShell`, and public `PublicShell`
- `Card`; `GlassCard` remains an alias
- `Badge` tones: `neutral`, `success`, `warning`, `danger`, `info`, and `gold`
- `Web3Button` variants: `primary`, `secondary`, `danger`, and `tertiary`
- `ThemeToggle`, `CommandMenu`, `EmptyState`, and `MetricCard`

### Runtime and feedback

- `AuthPage`, `AuthForm`, `DemoPersonaForm`, and `SignOutButton`
- `PortalProvider`, `createDemoAuthAdapter`, `useRuntime`, `useResource`, and `usePagedResource`
- `ResourceStatus`, `ApiError`, and `errorMessage`
- Visible demo controls for scenario, latency, clock, empty state, one-request failure, and reset

### Domain presentation

- `DigitalIDCard`, `PropertyAssetCard`, and `SecurityStatus`
- `NetworkBadge`, `WalletAddress`, `HashDisplay`, and `TokenBalance`
- `BlockchainStatus`, `TransactionTable`, and `PortfolioChart`
- `RHCToken3D`, `TokenHero`, and `TokenCard`

Web3-oriented components are inactive presentation boundaries. Labels such as `Not activated`, `Backend required`, and `No public token issuance` are product safeguards, not temporary decoration.

## Layout and interaction rules

- Customer portal navigation is defined in `apps/customer-web/app/web3-nav.ts`.
- Admin navigation is permission-filtered from `apps/admin-web/app/admin-data.tsx` and includes payments, documents, certificates, service requests, rewards ledger, and operational reports.
- Public pages use the shared RHC public shell and keep verification available without exposing a customer directory.
- Primary actions stay close to the record they mutate. Destructive or lifecycle actions require explicit reason, confirmation, or review context.
- Dense data uses responsive grids or horizontally scrollable tables with captions, headers, loading, error, empty, and stable-reference states. Report exports escape CSV formula prefixes and display provenance.
- Successful mutations use status feedback; actionable failures use alerts and preserve enough context to retry safely.

## Status and content vocabulary

| Label                              | Meaning                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `DEMO ONLY` / synthetic data       | Local fictional state with no production, legal, financial, or provider effect.    |
| `Pending review`                   | Workflow state only; not approval.                                                 |
| `RHC Verified`                     | Result of an internal RHC business record. It is not government identity or title. |
| `Blockchain status: not requested` | No chain anchoring or public-network verification occurred.                        |
| `Not activated` / `Future`         | UI boundary exists but the underlying capability is disabled.                      |
| `Backend required`                 | Presentation exists; a real accepted service is not connected.                     |

RHC Points are centrally managed fictional reward points in demo mode—not cash, cryptocurrency, an investment, or a promise of conversion. RHC Digital ID and certificates are company-issued references, not government identification or legal title.

## Accessibility baseline

- Preserve skip links and visible focus rings.
- Icon-only controls require accessible names; decorative artwork uses empty alt text.
- Loading uses `role="status"`; actionable failures use `role="alert"`.
- Forms require persistent labels, bounded inputs, validation messages, and keyboard-complete operation.
- Disabled controls must explain why through nearby copy or useful labels, not opacity alone.
- Final browser smoke covers public, customer, and admin journeys across representative mobile, tablet, desktop, and large-desktop widths, plus focused keyboard/focus checks. A full screen-reader session, formal contrast/zoom/reduced-motion audit, and broad cross-browser certification remain pending for later acceptance.

## Current caveats

1. Demo persona scope and control visibility demonstrate UX behavior; they are not production authorization acceptance.
2. The fixture hub persists through a local JSON store. Its process-local serialization is not proof of PostgreSQL transaction or concurrency behavior.
3. App-specific CSS remains substantial and can drift even though the core tokens are shared.
4. Selected browser smoke screenshots exist, but no final visual-regression baseline or full accessibility report is signed off.
5. The public PDF duplicate has been removed. The confidential source remains `documents/RHC WEB3 WHITEPAPER v1.0.pdf`, and the rendered `/white-paper` summary still requires content-owner/legal approval before external distribution.
6. Adapter-ready screens and labels must not be described as deployed, provider-connected, or production-ready.

See [route coverage](route-coverage.md), the [demo guide](demo-guide.md), the [Phase 2 handoff](phase-2-handoff.md), and the [validation report](validation-report.md).
