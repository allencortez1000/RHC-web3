'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { AuthForm, SignOutButton, type AuthMode } from './runtime';
export * from './runtime';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
type Theme = 'dark' | 'light';
type ThemePreference = Theme | 'system';
type NavItem = { section?: string; label: string; href: string; icon: string; active?: boolean };
type RHCToken3DSize = 'small' | 'medium' | 'large';
type RHCLogoMarkSize = 'sm' | 'md' | 'lg';
type RHCToken3DProps = {
  frontImage: string;
  backImage: string;
  size?: RHCToken3DSize;
  hoverSpin?: boolean;
  clickFlip?: boolean;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== 'system') return preference;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
}

export function RHCLogoMark({
  size = 'md',
  className = '',
}: {
  size?: RHCLogoMarkSize;
  className?: string;
}) {
  const sizes: Record<RHCLogoMarkSize, string> = {
    sm: 'h-8 w-8',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  };
  return (
    <span className={`rhc-logo-mark inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${sizes[size]} ${className}`}>
      <img src="/images/rhc-token-front.png" alt="Rabino Holdings Corporation" className="h-full w-full object-cover" draggable={false} />
    </span>
  );
}

export function Card({
  title,
  children,
  className = '',
  id,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`rhc-card relative overflow-hidden p-5 shadow-sm ${className}`}>
      {title ? (
        <h2 className="mb-4 text-base font-bold tracking-tight text-[var(--rhc-heading)]">
          {title}
        </h2>
      ) : null}
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
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Web3Button({
  children,
  variant = 'primary',
  className = '',
  href,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'tertiary';
  className?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const classes = {
    primary: 'rhc-web3-btn-primary',
    secondary: 'rhc-web3-btn-secondary',
    danger: 'rhc-web3-btn-danger',
    tertiary:
      'border border-transparent bg-transparent text-[var(--rhc-secondary-text)] hover:text-[var(--rhc-heading)]',
  }[variant];
  const buttonClass = `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[var(--rhc-primary)] focus:ring-offset-2 focus:ring-offset-[var(--rhc-bg)] ${classes} ${className}`;
  if (href) {
    return (
      <a href={disabled ? undefined : href} aria-disabled={disabled || undefined} className={`${buttonClass} ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled ?? (!onClick && type !== 'submit')}
      title={!onClick && !href && type !== 'submit' ? 'Coming soon — Month 2' : undefined}
      className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

export function AuthPage({
  mode,
  title,
  admin = false,
}: {
  mode: AuthMode;
  title: string;
  admin?: boolean;
}) {
  return (
    <Web3Shell variant={admin ? 'admin' : 'customer'}>
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Badge tone="gold">{admin ? 'RHC Administration' : 'RHC'}</Badge>
          <ThemeToggle />
        </div>
        <h1 className="rhc-page-title mt-5">{title}</h1>
        <Card className="mt-8 rhc-card-token">
          <p className="rhc-body-copy">
            {admin
              ? 'Use your authorized RHC account. Administrative permissions are enforced by the API.'
              : 'Secure account access powered by Supabase Auth.'}
          </p>
          <AuthForm
            mode={mode}
            verificationPath={admin ? '/verify-email' : '/verification'}
            continuePath={admin ? '/' : '/dashboard'}
          />
        </Card>
      </section>
    </Web3Shell>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rhc-empty rounded-2xl border border-dashed p-8 text-center">
      <RHCLogoMark size="md" className="mx-auto mb-4" />
      <h3 className="text-base font-bold text-[var(--rhc-heading)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{description}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon = 'RHC',
  trend,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: string;
  trend?: string;
}) {
  return (
    <Card className="min-h-36">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="rhc-metric-label text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
          <p className="rhc-value mt-3 text-2xl">{value}</p>
        </div>
        {icon === 'RHC' ? (
          <RHCLogoMark size="sm" />
        ) : (
          <div className="rhc-token-mini grid h-9 w-9 place-items-center rounded-md text-[11px] font-bold">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {trend ? <Badge tone="success">{trend}</Badge> : null}
        {detail ? <p className="rhc-metric-detail text-sm leading-6">{detail}</p> : null}
      </div>
    </Card>
  );
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('rhc-theme');
    const initial: ThemePreference =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    applyTheme(initial);
    setPreference(initial);
    setMounted(true);
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => {
      if ((window.localStorage.getItem('rhc-theme') || 'system') === 'system') applyTheme('system');
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const visiblePreference = mounted ? preference : 'system';
  const labels: Record<ThemePreference, string> = {
    dark: 'Dark',
    light: 'Light',
    system: 'System',
  };

  const toggleTheme = () => {
    const next: ThemePreference =
      visiblePreference === 'dark' ? 'light' : visiblePreference === 'light' ? 'system' : 'dark';
    applyTheme(next);
    window.localStorage.setItem('rhc-theme', next);
    setPreference(next);
    setMounted(true);
  };

  return (
    <button
      type="button"
      aria-label={`Theme preference: ${labels[visiblePreference]}. Activate to change theme.`}
      onClick={toggleTheme}
      className="rhc-theme-toggle inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold"
    >
      <span className="rhc-toggle-dot grid h-5 w-5 place-items-center rounded-md text-xs">
        {visiblePreference === 'system' ? 'S' : visiblePreference === 'light' ? 'L' : 'D'}
      </span>
      <span>{labels[visiblePreference]}</span>
    </button>
  );
}

export function CommandMenu({
  items,
  label = 'Open command menu',
}: {
  items: Array<{ label: string; href: string; group?: string }>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => !needle || `${item.group || ''} ${item.label}`.toLowerCase().includes(needle));
  }, [items, query]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKey, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleDialogKey, true);
      document.body.style.overflow = previousOverflow;
      const focusTarget = previousFocusRef.current || triggerRef.current;
      window.setTimeout(() => focusTarget?.focus(), 0);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-controls="rhc-command-dialog"
        aria-expanded={open}
        className="hidden min-h-11 items-center gap-2 rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] px-3 py-2 text-xs font-bold text-[var(--rhc-secondary-text)] md:inline-flex"
      >
        <span>{label}</span>
        <kbd className="rounded border border-[var(--rhc-border-secondary)] px-1.5 py-0.5 font-mono">Ctrl K</kbd>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[120] grid place-items-start bg-[rgba(3,8,17,.72)] px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
          <section ref={dialogRef} id="rhc-command-dialog" role="dialog" aria-modal="true" aria-labelledby="rhc-command-title" tabIndex={-1} className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--rhc-border)] p-4">
              <div><p className="rhc-eyebrow">Scoped navigation</p><h2 id="rhc-command-title" className="text-lg font-bold text-[var(--rhc-heading)]">Command menu</h2></div>
              <button type="button" aria-label="Close command menu" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--rhc-border)]">×</button>
            </div>
            <div className="p-4">
              <label className="sr-only" htmlFor="rhc-command-search">Search authorized destinations</label>
              <input ref={inputRef} id="rhc-command-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search destinations…" className="w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)] outline-none focus:ring-2 focus:ring-[var(--rhc-primary)]" />
              <nav aria-label="Command results" className="mt-3 max-h-[50vh] overflow-y-auto">
                {filtered.length ? filtered.map((item) => (
                  <a key={`${item.group || ''}-${item.href}-${item.label}`} href={item.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--rhc-heading)] hover:bg-[var(--rhc-accent-soft)] focus:bg-[var(--rhc-accent-soft)] focus:outline-none">
                    <span>{item.label}</span>
                    {item.group ? <span className="text-xs text-[var(--rhc-muted)]">{item.group}</span> : null}
                  </a>
                )) : <p role="status" className="p-5 text-center text-sm text-[var(--rhc-muted)]">No authorized destination matches this search.</p>}
              </nav>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function Web3Shell({
  children,
  variant = 'customer',
  as: Container = 'main',
}: {
  children: ReactNode;
  variant?: 'customer' | 'admin';
  as?: 'main' | 'div';
}) {
  return (
    <Container className="rhc-shell relative min-h-screen overflow-hidden">
      <div className="rhc-bg-aura pointer-events-none fixed inset-0" />
      <div className="rhc-bg-grid pointer-events-none fixed inset-0" />
      <div className="relative z-10">{children}</div>
      <div className="rhc-mode-pill pointer-events-none fixed bottom-4 right-4 hidden rounded-lg border px-3 py-2 text-xs md:block">
        {variant === 'admin' ? 'RHC Admin' : 'RHC'}
      </div>
    </Container>
  );
}

export function NetworkBadge() {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-xs font-bold rhc-network-badge">
      <span className="h-2 w-2 rounded-full bg-[var(--rhc-muted)]" /> Network · Coming soon
    </span>
  );
}

export function WalletAddress({ address = 'Not connected' }: { address?: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 font-mono text-xs font-semibold rhc-address">
      <span>{address}</span>
      <span className="font-sans text-[var(--rhc-primary)]">Coming soon</span>
    </span>
  );
}

export function HashDisplay({ hash }: { hash: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm text-[var(--rhc-heading)]">
      <span>{hash}</span>
      <span className="text-[var(--rhc-primary)]">Copy</span>
    </span>
  );
}

export function TokenBalance({
  amount = '—',
  symbol = 'RHC Points',
  label = 'Rewards Balance',
}: {
  amount?: string;
  symbol?: string;
  label?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-[var(--rhc-heading)]">
        {amount} <span className="text-base text-[var(--rhc-primary)]">{symbol}</span>
      </p>
    </div>
  );
}

export function RHCToken3D({
  frontImage,
  backImage,
  size = 'large',
  hoverSpin = true,
  clickFlip = true,
  className = '',
  onClick,
}: RHCToken3DProps) {
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
        <span className="rhc-token-face rhc-token-front">
          <img src={frontImage} alt="" draggable={false} />
        </span>
        <span className="rhc-token-face rhc-token-back">
          <img src={backImage} alt="" draggable={false} />
        </span>
        <span className="rhc-token-shine" />
      </span>
    </button>
  );
}

export function TokenHero() {
  const facts = [
    ['Token Symbol', 'RHC'],
    ['Network', 'Awaiting integration'],
    ['Token Supply', 'Coming soon'],
    ['Circulating Supply', 'Not connected'],
    ['Future Utility', 'Properties · Marketplace · Rewards'],
    ['Contract Address', 'Not deployed in Month 1'],
  ];
  return (
    <Card className="rhc-card-token p-6 md:p-8">
      <div className="grid gap-8 xl:grid-cols-[320px_1fr] xl:items-center">
        <div className="flex justify-center">
          <RHCToken3D
            frontImage="/images/rhc-token-front.png"
            backImage="/images/rhc-token-back.png"
          />
        </div>
        <div>
          <Badge tone="gold">RHC Token Showcase</Badge>
          <h2 className="rhc-page-title mt-5">RHC TOKEN</h2>
          <p className="rhc-body-copy mt-3 max-w-2xl">
            Rabino Holdings Corporation token-inspired ecosystem layer for real assets, digital
            ownership, marketplace utility, and future Web3 services.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">
                  {label}
                </p>
                <p className="mt-1 font-bold text-[var(--rhc-heading)]">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Web3Button href="/token">View Token</Web3Button>
            <Web3Button variant="secondary" disabled>Send — Month 2</Web3Button>
            <Web3Button variant="secondary" disabled>Receive — Month 2</Web3Button>
            <Web3Button href="/transactions" variant="secondary">
              View Month 2 Ledger Preview
            </Web3Button>
            <Web3Button variant="tertiary" disabled>No contract deployed</Web3Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TokenCard() {
  return (
    <Card className="rhc-card-token">
      <div className="flex items-center gap-5">
        <RHCLogoMark size="lg" />
        <div>
          <Badge tone="gold">RHC Token Inspired</Badge>
          <h3 className="mt-3 text-xl font-bold text-[var(--rhc-heading)]">
            RHC Ecosystem Asset Layer
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">
            Token, rewards, wallet, and marketplace transactions are coming soon. Real token
            transfers remain disabled in Month 1.
          </p>
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
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">
            Total Ecosystem Value
          </p>
          <p className="rhc-value mt-2 text-3xl">Coming soon</p>
          <Badge tone="warning">Awaiting live valuation</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {['24H', '7D', '30D', '3M', '1Y', 'ALL'].map((f) => (
            <span
              key={f}
              className="rounded-md border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] px-2.5 py-1.5 text-xs font-bold text-[var(--rhc-secondary-text)]"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
      <div className="rhc-chart mt-7 h-40 rounded-lg border" />
    </Card>
  );
}

export function DigitalIDCard({
  name = 'Complete your profile',
  rhcId,
  verification = 'Not available',
  account = 'Not available',
}: {
  name?: string;
  rhcId?: string | null;
  verification?: string;
  account?: string;
}) {
  return (
    <Card className="rhc-card-token p-0">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="rhc-eyebrow">RHC Digital ID</p>
            <h3 className="mt-5 text-xl font-bold text-[var(--rhc-heading)]">{name}</h3>
            <p className="mt-1 font-mono text-sm font-semibold text-[var(--rhc-secondary-text)]">
              {rhcId || 'Not issued'}
            </p>
          </div>
          <RHCLogoMark size="lg" />
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Badge tone="warning">{verification}</Badge>
          <Badge tone="gold">{account}</Badge>
        </div>
        <p className="mt-5 font-mono text-sm text-[var(--rhc-secondary-text)]">
          Wallet: Not activated — Month 2
        </p>
      </div>
    </Card>
  );
}

export function BlockchainStatus() {
  return (
    <Card title="RHC Network Status">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ['Coming soon', 'Network Mode'],
          ['Not live', 'Block Height'],
          ['Disabled', 'Gas / Fee'],
          ['Pending', 'Integration'],
        ].map(([value, label]) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"
          >
            <p className="text-lg font-bold text-[var(--rhc-heading)]">{value}</p>
            <p className="mt-1 text-sm text-[var(--rhc-muted)]">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PropertyAssetCard({
  name = 'No linked property',
  description = 'Your authorized property records will appear here.',
  status = 'Not linked',
  href,
}: {
  name?: string;
  description?: string;
  status?: string;
  href?: string;
}) {
  return (
    <Card className="p-0">
      <div className="rhc-property-strip h-28" />
      <div className="p-6">
        <Badge tone="warning">{status}</Badge>
        <h3 className="mt-4 text-xl font-bold text-[var(--rhc-heading)]">{name}</h3>
        <p className="mt-2 text-sm text-[var(--rhc-muted)]">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Web3Button href={href} variant="secondary">
            View Property
          </Web3Button>
          <Web3Button variant="secondary" disabled>Digital asset — Month 2</Web3Button>
        </div>
      </div>
    </Card>
  );
}

export function TransactionTable() {
  const rows: string[][] = [];
  return (
    <Card title="Transaction Activity">
      <p className="mb-4 text-sm text-[var(--rhc-muted)]">
        Coming soon — Month 2. No transaction ledger or blockchain activity is connected.
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          disabled
          aria-label="Search transactions"
          placeholder="Search transaction, wallet, or asset"
          className="min-w-[260px] rounded-lg border px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Web3Button variant="secondary" disabled>Filter — Month 2</Web3Button>
          <Web3Button variant="secondary" disabled>Date — Month 2</Web3Button>
          <Web3Button variant="secondary" disabled>Export — Month 2</Web3Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-[var(--rhc-muted)]">
            <tr>
              {['Transaction Hash', 'Type', 'From', 'To', 'Asset', 'Status', 'Network'].map((h) => (
                <th key={h} className="pb-4 pr-4 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-t border-[var(--rhc-border)]">
                <td className="py-4 pr-4">
                  <HashDisplay hash={r[0]} />
                </td>
                <td className="pr-4 text-[var(--rhc-secondary-text)]">{r[1]}</td>
                <td className="pr-4 text-[var(--rhc-secondary-text)]">{r[2]}</td>
                <td className="pr-4 text-[var(--rhc-secondary-text)]">{r[3]}</td>
                <td className="pr-4 font-bold text-[var(--rhc-heading)]">{r[4]}</td>
                <td className="pr-4">
                  <Badge tone={r[5].includes('Pending') ? 'warning' : 'success'}>{r[5]}</Badge>
                </td>
                <td>
                  <Badge tone="neutral">{r[6]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function SecurityStatus() {
  return (
    <Card title="Security Center">
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="rhc-value text-3xl">Account</p>
          <Badge tone="info">Supabase Auth</Badge>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[var(--rhc-muted)]">
          Manage your password and sign out of this browser. Wallet security and multi-factor
          authentication controls are coming soon.
        </p>
      </div>
    </Card>
  );
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

export function AppShell({
  children,
  navItems,
  title = 'Dashboard',
  admin = false,
  hideSidebar = false,
}: {
  children: ReactNode;
  navItems: NavItem[];
  title?: string;
  admin?: boolean;
  hideSidebar?: boolean;
}) {
  const marketplaceItems = useMemo(
    () => (admin ? [] : navItems.filter((item) => item.section === 'Marketplace' && item.label === 'RHC Marketplace')),
    [admin, navItems],
  );
  const groups = useMemo(
    () => groupedNav(navItems.filter((item) => item.section !== 'Marketplace')),
    [navItems],
  );
  return (
    <Web3Shell as="div" variant={admin ? 'admin' : 'customer'}>
      <a href="#main-content" className="rhc-skip-link">Skip to main content</a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1720px] gap-3 px-3 py-3 md:px-4 lg:gap-4 lg:py-4">
        {!hideSidebar && (
        <aside className="rhc-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] w-56 shrink-0 rounded-xl border p-3 xl:w-60 xl:p-4 lg:block">
          <div className="flex h-full flex-col">
            <a href={admin ? '/' : '/dashboard'} className="flex items-center gap-3">
              <RHCLogoMark size="md" />
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-white">
                  RHC DIGITAL
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rhc-primary)]">
                  Customer Portal
                </p>
              </div>
            </a>
            <nav aria-label="Portal navigation" className="mt-6 space-y-3 overflow-y-auto pr-1">
              {groups.map((group) => (
                <div key={group.section}>
                  <p className="rhc-nav-section mb-2 px-3">{group.section}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <a
                        key={`${group.section}-${item.label}`}
                        href={item.href}
                        aria-current={item.active ? 'page' : undefined}
                        className={`rhc-sidebar-link group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold xl:text-[13px] ${item.active ? 'rhc-nav-active' : ''}`}
                      >
                        <span className="grid h-5 w-5 place-items-center rounded text-[10px] text-[var(--rhc-primary)]">
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="mt-auto border-t border-[rgba(212,175,55,.18)] pt-4">
              <SignOutButton className="rhc-sign-out flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-bold" />
              <p className="rhc-sidebar-note mt-3 text-xs leading-5">
                End your session on this browser.
              </p>
            </div>
          </div>
        </aside>
        )}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          <header className="mb-5 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-3 shadow-sm md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <nav aria-label="Breadcrumb" className="rhc-eyebrow flex items-center gap-2">
                  <a href={admin ? '/' : '/dashboard'} className="hover:text-[var(--rhc-heading)]">{admin ? 'Administration' : 'My RHC'}</a>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">{title}</span>
                </nav>
                <h1 className="text-xl font-bold text-[var(--rhc-heading)]">{title}</h1>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">

                <CommandMenu
                  items={navItems.map((item) => ({ label: item.label, href: item.href, group: item.section }))}
                  label="Navigate"
                />
                {marketplaceItems.length > 0 && (
                  <nav
                    aria-label="Marketplace navigation"
                    className="hidden items-center gap-2 rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-1 xl:flex"
                  >
                    {marketplaceItems.map((item) => (
                      <a
                        key={`header-${item.label}`}
                        href={item.href}
                        aria-current={item.active ? 'page' : undefined}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition hover:bg-[var(--rhc-accent-soft)] hover:text-[var(--rhc-primary)] ${item.active ? 'bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]' : 'text-[var(--rhc-secondary-text)]'}`}
                      >
                        Go to Marketplace
                      </a>
                    ))}
                  </nav>
                )}

                <ThemeToggle />
                <RHCLogoMark size="sm" />
                <div className="lg:hidden">
                  <SignOutButton />
                </div>
              </div>
            </div>
          </header>
          {!hideSidebar && (
            <nav aria-label="Mobile navigation" className="mb-5 flex gap-3 overflow-x-auto lg:hidden">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-lg border p-2 text-sm ${item.active ? 'rhc-nav-active' : ''}`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}
          {children}
        </main>
      </div>
    </Web3Shell>
  );
}
