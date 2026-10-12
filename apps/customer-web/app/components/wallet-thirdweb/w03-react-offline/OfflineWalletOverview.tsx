"use client";

import * as React from "react";
import type { CSSProperties, ReactElement } from "react";
import { deriveOfflineView, FIXTURE_MARKER, type OfflineFixture, type ViewModel } from "../w03-offline-view/model";

/**
 * Offline-only React presentation adapter for the W03 wallet review.
 * Not mounted in any application route. NEVER accepts an API response or wallet
 * session; a separately approved and versioned backend contract is required.
 */
export type OfflineUnavailableReason =
  | "unauthenticated"
  | "forbidden"
  | "conflict"
  | "rate_limited"
  | "service_unavailable"
  | "account_switched"
  | "unknown";

export type OfflinePanelState =
  | Readonly<{ kind: "fixture"; fixture: OfflineFixture }>
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unavailable"; reason: OfflineUnavailableReason }>;

export type OfflineWalletOverviewProps = Readonly<{ state: OfflinePanelState }>;

const rootStyle: CSSProperties = {
  width: "100%", maxWidth: 1100, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)",
  borderRadius: 24, border: "1px solid #c8e6f1", color: "#133047",
  background: "rgba(255,255,255,.97)", boxShadow: "0 12px 45px rgba(23,71,108,.09)",
  fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", boxSizing: "border-box",
};
const labelStyle: CSSProperties = { margin: 0, fontSize: 12, letterSpacing: 1.8, fontWeight: 750, color: "#075d7b" };
const headingStyle: CSSProperties = { fontSize: "clamp(22px, 3vw, 32px)", lineHeight: 1.2, margin: "12px 0" };
const noticeStyle: CSSProperties = {
  padding: "12px 14px", borderRadius: 10, color: "#075d7b", fontSize: 14,
  background: "#e6f6fb", border: "1px solid #9ed5e8", fontWeight: 700,
};
const gridStyle: CSSProperties = {
  display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
  marginTop: 22, width: "100%",
};
const cardStyle: CSSProperties = {
  minWidth: 0, borderRadius: 16, padding: 18, border: "1px solid #d8eaf0",
  background: "#fff", overflowWrap: "anywhere",
};
const cardHeadingStyle: CSSProperties = { fontSize: 14, margin: "0 0 10px", color: "#3b6678", lineHeight: 1.5 };
const cardValueStyle: CSSProperties = { fontWeight: 650, margin: 0, fontSize: 16, lineHeight: 1.55 };
const footerStyle: CSSProperties = { fontSize: 13, marginTop: 18, color: "#536a79", lineHeight: 1.55 };
const sectionStyle: CSSProperties = { marginTop: 18, padding: 16, border: "1px solid #e6d2a0", background: "#fff8ec", borderRadius: 12 };
const disabledStyle: CSSProperties = { marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid #c7dce5", background: "#eff6fa", color: "#365268", fontWeight: 650 };

const FALLBACK: ReadonlyArray<readonly [string, string]> = [
  ["Wallet linkage", "Unknown — no verified backend wallet-link data"],
  ["Centralized RHC Points", "Unavailable — not zero"],
  ["Points history", "Unavailable — no verified coverage"],
  ["Blockchain token", "Not approved / unavailable — not zero"],
  ["Token transfer history", "Unsupported / unavailable — not empty"],
];

const failures: Record<OfflineUnavailableReason, string> = {
  unauthenticated: "Access unavailable — an authenticated RHC session is required.",
  forbidden: "Access unavailable — this account or role is not authorized.",
  conflict: "Account state changed — previous values were cleared.",
  rate_limited: "Read temporarily unavailable — request limit reached.",
  service_unavailable: "Read temporarily unavailable — required service is offline.",
  account_switched: "Account switched — previous customer's data was cleared.",
  unknown: "Wallet overview unavailable — no verified data was returned.",
};

function eligibleSyntheticFixture(value: unknown): value is OfflineFixture {
  if (!value || typeof value !== "object") return false;
  const fixture = value as Partial<OfflineFixture>;
  if (fixture.fixtureKind !== FIXTURE_MARKER || !fixture.scope || typeof fixture.scope !== "object") return false;
  // Prevent a production users.id UUID or provider identity accidentally being displayed as demo.
  return typeof fixture.scope.rhcUserId === "string" &&
    /^synthetic-[a-z0-9-]{1,72}$/i.test(fixture.scope.rhcUserId);
}

function safeView(state: OfflinePanelState): ViewModel | null {
  if (state.kind !== "fixture" || !eligibleSyntheticFixture(state.fixture)) return null;
  try { return deriveOfflineView(state.fixture); } catch { return null; }
}

function DataCard({ title, value }: Readonly<{ title: string; value: string }>): ReactElement {
  return (
    <article style={cardStyle}>
      <h3 style={cardHeadingStyle}>{title}</h3>
      <p style={cardValueStyle}>{value}</p>
    </article>
  );
}

/**
 * All values are clearly synthetic, and no action handlers, hrefs, API calls,
 * providers, SDKs, wallets or mutable caches exist in this component.
 */
export function OfflineWalletOverview({ state }: OfflineWalletOverviewProps): ReactElement {
  const view = safeView(state);
  const safeState: "fixture" | "loading" | "unavailable" = view ? "fixture" : state.kind === "loading" ? "loading" : "unavailable";
  const statusMessage = view
    ? view.fixtureNotice
    : state.kind === "loading" ? "Offline review loading — no values displayed"
    : state.kind === "unavailable" ? (failures[state.reason] ?? failures.unknown)
    : "Invalid synthetic fixture — no data displayed";
  const rows: ReadonlyArray<readonly [string, string]> = view
    ? [
        ["Wallet linkage", view.linkLabel],
        ["Centralized RHC Points", view.pointsLabel],
        ["Points history", view.pointsHistoryLabel],
        ["Blockchain token", view.tokenLabel],
        ["Token transfer history", view.tokenHistoryLabel],
      ]
    : FALLBACK;

  return (
    <section
      aria-label="RHC wallet offline review"
      data-w03-source="synthetic-offline-only"
      data-w03-state={safeState}
      style={rootStyle}
    >
      <header>
        <p style={labelStyle}>RHC DIGITAL / OFFLINE REVIEW ONLY</p>
        <h2 style={headingStyle}>Wallet and RHC Points overview</h2>
        <p style={footerStyle}>
          Read-only synthetic rehearsal. Not a connected wallet, not the RHC coin, and not live account data.
        </p>
      </header>
      <p role="status" style={noticeStyle}>{statusMessage}</p>
      <div style={gridStyle} data-w03-responsive-grid="true">
        {rows.map(([title, value]) => <DataCard key={title} title={title} value={value} />)}
      </div>
      <aside style={sectionStyle}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Pending acceptance gates</h3>
        <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.55 }}>
          <li>Backend wallet-link proof and identity contract not yet accepted.</li>
          <li>OFF-25 official RHC token identity remains FAIL / BLOCKED.</li>
          <li>Connected wallet and RHC customer acceptance tests are NOT RUN.</li>
        </ul>
      </aside>
      <p style={disabledStyle}>All actions disabled: connect, link, transfer, approve, trade, redeem</p>
      <footer style={footerStyle}>No external data, signing, wallet permissions, RPC requests, or blockchain transactions.</footer>
    </section>
  );
}
