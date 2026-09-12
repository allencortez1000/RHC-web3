'use client';

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
type Theme = 'dark' | 'light';
type NavItem = { section?: string; label: string; href: string; icon: string; active?: boolean };
type RHCToken3DSize = 'small' | 'medium' | 'large';
type RHCToken3DProps = {
  frontImage: string;
  backImage: string;
  size?: RHCToken3DSize;
  hoverSpin?: boolean;
  clickFlip?: boolean;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

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
      {title ? <h2 className="mb-4 text-base font-bold tracking-tight text-[var(--rhc-heading)]">{title}</h2> : null}
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
    gold: 'rhc-badge-gold',
  };
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${tones[tone]}`}>{children}</span>;
}

export function Web3Button({ children, variant = 'primary', className = '', href }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'tertiary'; className?: string; href?: string }) {
  const classes = {
    primary: 'rhc-web3-btn-primary',
    secondary: 'rhc-web3-btn-secondary',
    danger: 'rhc-web3-btn-danger',
    tertiary: 'border border-transparent bg-transparent text-[var(--rhc-secondary-text)] hover:text-[var(--rhc-heading)]',
  }[variant];
  const content = <span className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${classes} ${className}`}>{children}</span>;
  return href ? <a href={href}>{content}</a> : <button type="button">{content}</button>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rhc-empty rounded-2xl border border-dashed p-8 text-center">
      <div className="rhc-token-mini mx-auto mb-4 grid h-10 w-10 place-items-center rounded-lg text-sm font-bold">RHC</div>
      <h3 className="text-base font-bold text-[var(--rhc-heading)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{description}</p>
    </div>
  );
}

export function MetricCard({ label, value, detail, icon = 'RHC', trend }: { label: string; value: string; detail?: string; icon?: string; trend?: string }) {
  return (
    <Card className="min-h-36">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="rhc-metric-label text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
          <p className="rhc-value mt-3 text-2xl">{value}</p>
        </div>
        <div className="rhc-token-mini grid h-9 w-9 place-items-center rounded-md text-[11px] font-bold">{icon}</div>
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
    <button type="button" aria-label="Toggle light and dark theme" aria-pressed={mounted ? theme === 'light' : false} onClick={toggleTheme} className="rhc-theme-toggle inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold">
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
        {variant === 'admin' ? 'Command Center' : 'RHC Web3 Platform'} · Demo Data
      </div>
    </main>
  );
}

export function NetworkBadge() {
  return <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold rhc-network-badge"><span className="h-2 w-2 rounded-full bg-[var(--rhc-success)]" /> RHC Network · Demo</span>;
}

export function WalletAddress({ address = 'Not connected' }: { address?: string }) {
  return <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm font-semibold rhc-address"><span>{address}</span><span className="font-sans text-[var(--rhc-primary)]">Copy</span></span>;
}

export function HashDisplay({ hash }: { hash: string }) {
  return <span className="inline-flex items-center gap-2 font-mono text-sm text-[var(--rhc-heading)]"><span>{hash}</span><span className="text-[var(--rhc-primary)]">Copy</span></span>;
}

export function TokenBalance({ amount = '12,850', symbol = 'RHC Points', label = 'Rewards Balance' }: { amount?: string; symbol?: string; label?: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">{label}</p><p className="mt-1 text-2xl font-extrabold text-[var(--rhc-heading)]">{amount} <span className="text-base text-[var(--rhc-primary)]">{symbol}</span></p></div>;
}

export function RHCToken3D({ frontImage, backImage, size = 'large', hoverSpin = true, clickFlip = true, className = '', onClick }: RHCToken3DProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isBackVisible, setIsBackVisible] = useState(false);

  useEffect(() => {
    if (!isSpinning) return undefined;
    const timeout = window.setTimeout(() => setIsSpinning(false), 1450);
    return () => window.clearTimeout(timeout);
  }, [isSpinning]);

  const beginHoverSpin = () => {
    if (!hoverSpin || isSpinning) return;
    setIsSpinning(true);
  };

  const finishHoverSpin = () => setIsSpinning(false);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (clickFlip && !isSpinning) setIsBackVisible((visible) => !visible);
    onClick?.(event);
  };

  return (
    <button
      type="button"
      aria-label={`RHC Token 3D coin. ${isBackVisible ? 'Back side visible' : 'Front side visible'}.`}
      aria-pressed={isBackVisible}
      className={`rhc-token-3d-wrap rhc-token-3d-${size} ${isSpinning ? 'is-spinning' : ''} ${isBackVisible ? 'is-flipped' : ''} ${className}`}
      onMouseEnter={beginHoverSpin}
      onAnimationEnd={finishHoverSpin}
      onClick={handleClick}
    >
      <span className="rhc-token-3d" aria-hidden="true">
        <span className="rhc-token-edge" />
        <span className="rhc-token-face rhc-token-front"><img src={frontImage} alt="" draggable={false} /></span>
        <span className="rhc-token-face rhc-token-back"><img src={backImage} alt="" draggable={false} /></span>
        <span className="rhc-token-shine" />
      </span>
    </button>
  );
}

export function TokenHero() {
  const facts = [
    ['Token Symbol', 'RHC'],
    ['Network', 'Awaiting integration'],
    ['Token Supply', 'Demo display only'],
    ['Circulating Supply', 'Not connected'],
    ['Current Utility', 'Properties · Marketplace · Rewards'],
    ['Contract Address', 'Not deployed in Month 1'],
  ];
  return (
    <Card className="rhc-card-token p-6 md:p-8">
      <div className="grid gap-8 xl:grid-cols-[320px_1fr] xl:items-center">
        <div className="flex justify-center"><RHCToken3D frontImage="/images/rhc-token-front.png" backImage="/images/rhc-token-back.png" /></div>
        <div>
          <Badge tone="gold">RHC Token Showcase</Badge>
          <h2 className="rhc-page-title mt-5">RHC TOKEN</h2>
          <p className="rhc-body-copy mt-3 max-w-2xl">Rabino Holdings Corporation token-inspired ecosystem layer for real assets, digital ownership, marketplace utility, and future Web3 services.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {facts.map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">{label}</p><p className="mt-1 font-bold text-[var(--rhc-heading)]">{value}</p></div>)}
          </div>
          <div className="mt-6 flex flex-wrap gap-3"><Web3Button href="/token">View Token</Web3Button><Web3Button variant="secondary">Send</Web3Button><Web3Button variant="secondary">Receive</Web3Button><Web3Button href="/transactions" variant="secondary">View Transactions</Web3Button><Web3Button variant="tertiary">Copy Contract</Web3Button></div>
        </div>
      </div>
    </Card>
  );
}

export function TokenCard() {
  return (
    <Card className="rhc-card-token">
      <div className="flex items-center gap-5">
        <div className="rhc-token-orb grid h-16 w-16 shrink-0 place-items-center rounded-full text-base font-extrabold">RHC</div>
        <div>
          <Badge tone="gold">RHC Token Inspired</Badge>
          <h3 className="mt-3 text-xl font-bold text-[var(--rhc-heading)]">RHC Ecosystem Asset Layer</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">Demo interface for token, rewards, wallet, property, and marketplace flows. Real token transfers remain disabled in Month 1.</p>
        </div>
      </div>
    </Card>
  );
}

export function PortfolioChart() {
  return (
    <Card title="Executive Portfolio Overview" className="min-h-[300px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">Total Ecosystem Value</p>
          <p className="rhc-value mt-2 text-3xl">Demo Mode</p>
          <Badge tone="warning">Awaiting live valuation</Badge>
        </div>
        <div className="flex flex-wrap gap-2">{['24H','7D','30D','3M','1Y','ALL'].map((f) => <span key={f} className="rounded-md border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] px-2.5 py-1.5 text-xs font-bold text-[var(--rhc-secondary-text)]">{f}</span>)}</div>
      </div>
      <div className="rhc-chart mt-7 h-40 rounded-lg border" />
    </Card>
  );
}

export function DigitalIDCard() {
  return (
    <Card className="rhc-card-token p-0">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="rhc-eyebrow">RHC Digital ID</p>
            <h3 className="mt-5 text-xl font-bold text-[var(--rhc-heading)]">Juan Dela Cruz</h3>
            <p className="mt-1 font-mono text-sm font-semibold text-[var(--rhc-secondary-text)]">RHC-2026-00000001</p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] text-xs font-bold text-[var(--rhc-primary)]">QR</div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Badge tone="warning">Demo Verification</Badge>
          <Badge tone="gold">Account Prepared</Badge>
        </div>
        <p className="mt-5 font-mono text-sm text-[var(--rhc-secondary-text)]">Wallet: Not connected</p>
      </div>
    </Card>
  );
}

export function BlockchainStatus() {
  return (
    <Card title="RHC Network Status">
      <div className="grid gap-4 sm:grid-cols-2">
        {[['Demo','Network Mode'], ['Not live','Block Height'], ['Disabled','Gas / Fee'], ['Pending','Integration']].map(([value,label]) => <div key={label} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-lg font-bold text-[var(--rhc-heading)]">{value}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{label}</p></div>)}
      </div>
    </Card>
  );
}

export function PropertyAssetCard() {
  return (
    <Card className="p-0">
      <div className="rhc-property-strip h-28" />
      <div className="p-6">
        <Badge tone="warning">Demo Property Record</Badge>
        <h3 className="mt-4 text-xl font-bold text-[var(--rhc-heading)]">AMICA Tower · Unit 1205</h3>
        <p className="mt-2 text-sm text-[var(--rhc-muted)]">Residential · Cebu City · Digital Property ID RHC-PROP-0001205</p>
        <div className="mt-5 flex flex-wrap gap-2"><Web3Button variant="secondary">View Property</Web3Button><Web3Button variant="secondary">Digital Asset Info</Web3Button></div>
      </div>
    </Card>
  );
}

export function TransactionTable() {
  const rows = [
    ['DEMO-84B2-93F1','Points Entry','RHC Demo Ledger','Juan','850 RHC Points','Demo Confirmed','Development Data'],
    ['DEMO-13AF-22D8','Identity Status','RHC Digital ID','Juan','Credential','Demo Confirmed','Development Data'],
    ['DEMO-91B0-77AC','Property Link','AMICA','Juan','Unit 1205','Pending Review','Development Data'],
  ];
  return (
    <Card title="Transaction Activity">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input aria-label="Search transactions" placeholder="Search transaction, wallet, or asset" className="min-w-[260px] rounded-lg border px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2"><Web3Button variant="secondary">Filter</Web3Button><Web3Button variant="secondary">Date</Web3Button><Web3Button variant="secondary">Export</Web3Button></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-[var(--rhc-muted)]"><tr>{['Transaction Hash','Type','From','To','Asset','Status','Network'].map((h) => <th key={h} className="pb-4 pr-4 font-bold">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r[0]} className="border-t border-[var(--rhc-border)]"><td className="py-4 pr-4"><HashDisplay hash={r[0]} /></td><td className="pr-4 text-[var(--rhc-secondary-text)]">{r[1]}</td><td className="pr-4 text-[var(--rhc-secondary-text)]">{r[2]}</td><td className="pr-4 text-[var(--rhc-secondary-text)]">{r[3]}</td><td className="pr-4 font-bold text-[var(--rhc-heading)]">{r[4]}</td><td className="pr-4"><Badge tone={r[5].includes('Pending') ? 'warning' : 'success'}>{r[5]}</Badge></td><td><Badge tone="neutral">{r[6]}</Badge></td></tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

export function SecurityStatus() {
  return <Card title="Security Center"><div className="flex items-center justify-between gap-5"><div><p className="rhc-value text-3xl">92<span className="text-base text-[var(--rhc-muted)]">/100</span></p><Badge tone="success">Prepared</Badge></div><p className="max-w-sm text-sm leading-6 text-[var(--rhc-muted)]">Password, session, wallet confirmation, privacy preferences, and future MFA readiness are prepared for secure backend enforcement.</p></div></Card>;
}

function groupedNav(navItems: NavItem[]) {
  const groups: { section: string; items: NavItem[] }[] = [];
  for (const item of navItems) {
    const section = item.section ?? 'Navigation';
    const existing = groups.find((group) => group.section === section);
    if (existing) existing.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}

export function AppShell({ children, navItems, title = 'Dashboard', admin = false }: { children: ReactNode; navItems: NavItem[]; title?: string; admin?: boolean }) {
  const groups = useMemo(() => groupedNav(navItems), [navItems]);
  return (
    <Web3Shell variant={admin ? 'admin' : 'customer'}>
      <div className="mx-auto flex min-h-screen max-w-[1540px] gap-5 px-4 py-4 md:px-6">
        <aside className="rhc-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] w-[18.5rem] shrink-0 rounded-xl border p-5 lg:block">
          <div className="flex h-full flex-col">
            <a href={admin ? '/' : '/dashboard'} className="flex items-center gap-3"><div className="rhc-token-mini grid h-11 w-11 place-items-center rounded-full text-xs font-extrabold">RHC</div><div><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-white">RHC WEB3</p><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rhc-primary)]">Platform</p></div></a>
            <nav className="mt-8 space-y-5 overflow-y-auto pr-1">
              {groups.map((group) => <div key={group.section}><p className="rhc-nav-section mb-2 px-3">{group.section}</p><div className="space-y-1">{group.items.map((item) => <a key={`${group.section}-${item.label}`} href={item.href} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${item.active ? 'rhc-nav-active' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><span className="grid h-5 w-5 place-items-center rounded text-[10px] text-[var(--rhc-primary)]">{item.icon}</span><span>{item.label}</span></a>)}</div></div>)}
            </nav>
            <div className="mt-auto border-t border-[rgba(212,175,55,.18)] pt-4">
              <a href="/login" className="rhc-sign-out flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-bold">
                <span>Sign out</span>
                <span aria-hidden="true">→</span>
              </a>
              <p className="mt-3 text-xs leading-5 text-slate-400">Local preview mode. No live blockchain or custody session is ended.</p>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="mb-5 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="rhc-eyebrow">{admin ? 'Administration' : 'RHC Web3 Platform'}</p><h1 className="text-xl font-bold text-[var(--rhc-heading)]">{title}</h1></div>
              <div className="flex flex-wrap items-center gap-3"><input aria-label="Global search" placeholder="Search RHC ecosystem" className="hidden min-w-[240px] rounded-lg border px-3 py-2 text-sm xl:block" /><NetworkBadge /><WalletAddress /><ThemeToggle /><div className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] font-bold text-[var(--rhc-primary)]">A</div></div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </Web3Shell>
  );
}
