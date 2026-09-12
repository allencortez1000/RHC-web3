'use client';

import { useEffect, useState, type ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type Theme = 'dark' | 'light';
type NavItem = { label: string; href: string; icon: string; active?: boolean };

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') return current;
  }
  return 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function Card({ title, children, className = '', id }: { title?: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rhc-card relative overflow-hidden p-5 shadow-sm ${className}`}>
      {title ? <h2 className="mb-4 text-base font-semibold tracking-tight text-[var(--rhc-heading)]">{title}</h2> : null}
      <div>{children}</div>
    </section>
  );
}

export function GlassCard(props: { title?: string; children: ReactNode; className?: string }) {
  return <Card {...props} />;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'rhc-badge-neutral',
    success: 'rhc-badge-success',
    warning: 'rhc-badge-warning',
    danger: 'rhc-badge-danger',
    info: 'rhc-badge-info',
  };
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tones[tone]}`}>{children}</span>;
}

export function Web3Button({ children, variant = 'primary', className = '', href }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger'; className?: string; href?: string }) {
  const classes = {
    primary: 'rhc-web3-btn-primary',
    secondary: 'rhc-web3-btn-secondary',
    danger: 'rhc-web3-btn-danger',
  }[variant];
  const content = <span className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${classes} ${className}`}>{children}</span>;
  return href ? <a href={href}>{content}</a> : <button type="button">{content}</button>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rhc-empty rounded-2xl border border-dashed p-8 text-center">
      <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-lg border bg-[var(--rhc-accent-soft)] text-sm font-bold text-[var(--rhc-accent)]">RHC</div>
      <h3 className="text-base font-semibold text-[var(--rhc-heading)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{description}</p>
    </div>
  );
}

export function MetricCard({ label, value, detail, icon = 'RHC', trend }: { label: string; value: string; detail?: string; icon?: string; trend?: string }) {
  return (
    <Card className="min-h-36">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="rhc-metric-label text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
          <p className="mt-3 text-xl font-semibold text-[var(--rhc-heading)]">{value}</p>
        </div>
        <div className="rhc-token-mini grid h-9 w-9 place-items-center rounded-md text-[11px] font-semibold">{icon}</div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {trend ? <Badge tone="success">{trend}</Badge> : null}
        {detail ? <p className="rhc-metric-detail text-sm leading-6">{detail}</p> : null}
      </div>
    </Card>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('rhc-theme') as Theme | null;
    const current = document.documentElement.dataset.theme as Theme | undefined;
    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const next = stored === 'light' || stored === 'dark' ? stored : current === 'light' || current === 'dark' ? current : preferred;
    applyTheme(next);
    setTheme(next);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    window.localStorage.setItem('rhc-theme', next);
    setTheme(next);
  };

  return (
    <button type="button" aria-label="Toggle light and dark theme" aria-pressed={mounted ? theme === 'light' : false} onClick={toggleTheme} className="rhc-theme-toggle inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
      <span className="rhc-toggle-dot grid h-5 w-5 place-items-center rounded-md text-xs">{theme === 'dark' ? 'D' : 'L'}</span>
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}

export function Web3Shell({ children, variant = 'customer' }: { children: ReactNode; variant?: 'customer' | 'admin' }) {
  return (
    <main className="rhc-shell relative min-h-screen overflow-hidden">
      <div className="rhc-bg-aura pointer-events-none fixed inset-0" />
      <div className="rhc-bg-grid pointer-events-none fixed inset-0" />
      <div className="relative z-10">{children}</div>
      <div className="rhc-mode-pill pointer-events-none fixed bottom-4 right-4 hidden rounded-lg border px-3 py-2 text-xs md:block">
        {variant === 'admin' ? 'Command Center' : 'RHC Web3'} · Local Mock Mode
      </div>
    </main>
  );
}

export function NetworkBadge() {
  return <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold rhc-network-badge"><span className="h-2 w-2 rounded-full bg-[var(--rhc-success)]" /> RHC Network Online</span>;
}

export function WalletAddress({ address = '0x72F4...93A2' }: { address?: string }) {
  return <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm font-semibold rhc-address"><span>{address}</span><span className="font-sans text-[var(--rhc-muted)]">Copy</span></span>;
}

export function HashDisplay({ hash }: { hash: string }) {
  return <span className="inline-flex items-center gap-2 font-mono text-sm text-[var(--rhc-heading)]"><span>{hash}</span><span className="text-[var(--rhc-accent)]">⧉</span></span>;
}

export function TokenBalance({ amount = '12,850', symbol = 'RHC', label = 'RHC Points' }: { amount?: string; symbol?: string; label?: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold text-[var(--rhc-heading)]">{amount} <span className="text-base text-[var(--rhc-accent)]">{symbol}</span></p></div>;
}

export function TokenCard() {
  return (
    <Card className="rhc-token-card">
      <div className="flex items-center gap-5">
        <div className="rhc-token-orb grid h-16 w-16 shrink-0 place-items-center rounded-full text-base font-semibold">RHC</div>
        <div>
          <Badge tone="info">Utility Points</Badge>
          <h3 className="mt-3 text-xl font-semibold text-[var(--rhc-heading)]">RHC Points</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">Prepared reward ledger for ecosystem services. Real transfers remain disabled in Month 1.</p>
        </div>
      </div>
    </Card>
  );
}

export function PortfolioChart() {
  return (
    <Card title="Portfolio Overview" className="min-h-[300px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--rhc-muted)]">Total Portfolio Value</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--rhc-heading)]">₱245,750.00</p>
          <Badge tone="success">+5.24%</Badge>
        </div>
        <div className="flex flex-wrap gap-2">{['24H','7D','30D','3M','1Y','ALL'].map((f) => <span key={f} className="rounded-md border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--rhc-secondary-text)]">{f}</span>)}</div>
      </div>
      <div className="rhc-chart mt-7 h-40 rounded-lg border" />
    </Card>
  );
}

export function DigitalIDCard() {
  return (
    <Card className="rhc-id-card p-0">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--rhc-muted)]">RHC Digital ID</p>
            <h3 className="mt-5 text-xl font-semibold text-[var(--rhc-heading)]">Juan Dela Cruz</h3>
            <p className="mt-1 font-mono text-sm font-semibold text-[var(--rhc-secondary-text)]">RHC-2026-00000001</p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-lg border bg-[var(--rhc-surface-secondary)] text-xs font-semibold text-[var(--rhc-heading)]">QR</div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Badge tone="success">✓ Blockchain Verified</Badge>
          <Badge tone="neutral">Account Active</Badge>
        </div>
        <p className="mt-5 font-mono text-sm text-[var(--rhc-secondary-text)]">Wallet 0x72F4...93A2</p>
      </div>
    </Card>
  );
}

export function BlockchainStatus() {
  return (
    <Card title="RHC Network Status">
      <div className="grid gap-4 sm:grid-cols-2">
        {[['Connected','Network'], ['2,584,302','Block Height'], ['Normal','Gas / Fee'], ['4 sec ago','Latest Block']].map(([value,label]) => <div key={label} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-lg font-semibold text-[var(--rhc-heading)]">{value}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{label}</p></div>)}
      </div>
    </Card>
  );
}

export function PropertyAssetCard() {
  return (
    <Card className="p-0">
      <div className="rhc-property-strip h-28" />
      <div className="p-6">
        <Badge tone="success">✓ Ownership Verified</Badge>
        <h3 className="mt-4 text-xl font-semibold text-[var(--rhc-heading)]">AMICA Tower · Unit 1205</h3>
        <p className="mt-2 text-sm text-[var(--rhc-muted)]">Residential · Cebu City · Digital Property ID RHC-PROP-0001205</p>
        <div className="mt-5 flex flex-wrap gap-2"><Web3Button variant="secondary">View Property</Web3Button><Web3Button variant="secondary">View Asset</Web3Button></div>
      </div>
    </Card>
  );
}

export function TransactionTable() {
  const rows = [
    ['Points Received','Reward','RHC API','Juan','850 RHC','Confirmed','0x84B2...93F1'],
    ['Digital ID Verified','Identity','RHC','Juan','Credential','Confirmed','0x13AF...22D8'],
    ['Property Linked','Property','AMICA','Juan','Unit 1205','Pending','0x91B0...77AC'],
  ];
  return (
    <Card title="Latest Transactions">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-[var(--rhc-muted)]"><tr>{['Transaction','Type','From','To','Asset','Status','Transaction ID'].map((h) => <th key={h} className="pb-4 pr-4">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r[6]} className="border-t border-white/10"><td className="py-4 pr-4 font-bold text-[var(--rhc-heading)]">{r[0]}</td><td className="pr-4">{r[1]}</td><td className="pr-4">{r[2]}</td><td className="pr-4">{r[3]}</td><td className="pr-4 font-bold">{r[4]}</td><td className="pr-4"><Badge tone={r[5] === 'Confirmed' ? 'success' : 'warning'}>{r[5]}</Badge></td><td><HashDisplay hash={r[6]} /></td></tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

export function SecurityStatus() {
  return <Card title="Security Center"><div className="flex items-center justify-between gap-5"><div><p className="text-3xl font-semibold text-[var(--rhc-heading)]">92<span className="text-base text-[var(--rhc-muted)]">/100</span></p><Badge tone="success">Excellent</Badge></div><p className="max-w-sm text-sm leading-6 text-[var(--rhc-muted)]">Password, session, wallet confirmation, privacy preferences, and future MFA readiness are prepared.</p></div></Card>;
}

export function AppShell({ children, navItems, title = 'Dashboard', admin = false }: { children: ReactNode; navItems: NavItem[]; title?: string; admin?: boolean }) {
  return (
    <Web3Shell variant={admin ? 'admin' : 'customer'}>
      <div className="mx-auto flex min-h-screen max-w-[1480px] gap-5 px-4 py-4 md:px-6">
        <aside className="rhc-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] w-[17rem] shrink-0 rounded-xl border p-5 lg:block">
          <div className="flex h-full flex-col">
            <a href={admin ? '/' : '/dashboard'} className="flex items-center gap-3"><div className="rhc-token-mini grid h-10 w-10 place-items-center rounded-lg text-xs font-semibold">RHC</div><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--rhc-heading)]">RHC WEB3</p><p className="text-xs text-[var(--rhc-muted)]">{admin ? 'Admin Console' : 'Digital Ecosystem'}</p></div></a>
            <nav className="mt-8 space-y-1">{navItems.map((item) => <a key={item.label} href={item.href} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${item.active ? 'rhc-nav-active' : 'text-[var(--rhc-secondary-text)] hover:bg-[var(--rhc-surface-secondary)] hover:text-[var(--rhc-heading)]'}`}><span className="h-1.5 w-1.5 rounded-full border border-[var(--rhc-border-secondary)] group-hover:border-[var(--rhc-accent)]" /><span>{item.label}</span></a>)}</nav>
            <div className="mt-auto border-t border-[var(--rhc-border)] pt-4">
              <a href="/login" className="rhc-sign-out flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-semibold">
                <span>Sign out</span>
                <span aria-hidden="true">→</span>
              </a>
              <p className="mt-3 text-xs leading-5 text-[var(--rhc-muted)]">Local preview mode only. No live session is ended.</p>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-[var(--rhc-surface)] p-4 shadow-sm">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">{admin ? 'Administration' : 'Customer Portal'}</p><h1 className="text-xl font-semibold text-[var(--rhc-heading)]">{title}</h1></div>
            <div className="flex flex-wrap items-center gap-3"><NetworkBadge /><WalletAddress /><ThemeToggle /><div className="grid h-10 w-10 place-items-center rounded-lg border bg-[var(--rhc-surface-secondary)] font-semibold text-[var(--rhc-heading)]">A</div></div>
          </header>
          {children}
        </main>
      </div>
    </Web3Shell>
  );
}
