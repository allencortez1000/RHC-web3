import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, RHCLogoMark, ThemeToggle, Web3Button, Web3Shell } from '@rhc/ui';
import { PUBLIC_NAV_ITEMS, type PublicNavKey } from './data';
import { MeridianIcon } from './meridian-icon';

export function MeridianMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <RHCLogoMark size="md" />
      <span className={compact ? 'sr-only' : 'block'}>
        <span className="block text-sm font-black uppercase leading-none tracking-[0.16em] text-[var(--rhc-heading)]">
          RHC
        </span>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rhc-primary)]">
          Connected living
        </span>
      </span>
    </span>
  );
}

export function PublicShell({
  children,
  current,
}: {
  children: ReactNode;
  current?: PublicNavKey;
}) {
  return (
    <>
      <a href="#main-content" className="rhc-skip-link">
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--rhc-border)] bg-[var(--rhc-bg)] shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <Link
            href="/"
            aria-label="RHC home"
            className="rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--rhc-primary)] focus:ring-offset-2 focus:ring-offset-[var(--rhc-bg)]"
          >
            <MeridianMark />
          </Link>

          <nav aria-label="Public navigation" className="hidden items-center gap-1 lg:flex">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={current === item.key ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--rhc-primary)] ${
                  current === item.key
                    ? 'bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]'
                    : 'text-[var(--rhc-secondary-text)] hover:bg-[var(--rhc-surface-secondary)] hover:text-[var(--rhc-heading)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden sm:inline-flex">
              <Web3Button href="/login" className="whitespace-nowrap">
                Sign in
                <MeridianIcon name="arrow" className="h-4 w-4" />
              </Web3Button>
            </span>

            <details className="group relative lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface)] px-3 py-2.5 text-sm font-bold text-[var(--rhc-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--rhc-primary)] [&::-webkit-details-marker]:hidden">
                Menu
              </summary>
              <nav
                aria-label="Mobile public navigation"
                className="absolute right-0 top-[calc(100%+.6rem)] z-50 w-64 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-2 shadow-[var(--rhc-shadow-md)]"
              >
                {PUBLIC_NAV_ITEMS.map((item) => (
                  <Link
                    key={`mobile-${item.key}`}
                    href={item.href}
                    aria-current={current === item.key ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-semibold ${
                      current === item.key
                        ? 'bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]'
                        : 'text-[var(--rhc-secondary-text)] hover:bg-[var(--rhc-surface-secondary)] hover:text-[var(--rhc-heading)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-2 border-t border-[var(--rhc-border)] pt-2 sm:hidden">
                  <Web3Button href="/login" className="w-full">
                    Sign in to RHC
                  </Web3Button>
                </div>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <div role="note" aria-label="Demonstration environment" className="border-b border-[rgba(212,175,55,.2)] bg-[var(--rhc-accent-soft)]">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--rhc-secondary-text)] sm:text-xs">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rhc-primary)]" />
          Demonstration environment · All records and service states are illustrative
        </div>
      </div>

      <Web3Shell as="div">
        <main id="main-content" tabIndex={-1}>{children}</main>
      </Web3Shell>

      <footer className="border-t border-[var(--rhc-border)] bg-[var(--rhc-bg-secondary)]">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr_.85fr]">
            <div>
              <Link href="/" aria-label="RHC home" className="inline-flex rounded-xl">
                <MeridianMark />
              </Link>
              <p className="mt-5 max-w-md text-sm leading-6 text-[var(--rhc-muted)]">
                A customer discovery layer for places, records, and participating RHC services—designed around identity, permission, and clear proof.
              </p>
            </div>

            <div>
              <p className="rhc-eyebrow">Explore</p>
              <nav aria-label="Footer navigation" className="mt-4 grid gap-2">
                {PUBLIC_NAV_ITEMS.map((item) => (
                  <Link
                    key={`footer-${item.key}`}
                    href={item.href}
                    className="w-fit text-sm font-semibold text-[var(--rhc-secondary-text)] hover:text-[var(--rhc-primary)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="rhc-eyebrow">Customer access</p>
              <p className="mt-4 text-sm leading-6 text-[var(--rhc-muted)]">
                Private property, identity, and account records remain behind authenticated portal access.
              </p>
              <div className="mt-5">
                <Web3Button href="/login" variant="secondary">
                  Continue to sign in
                </Web3Button>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-[var(--rhc-border)] pt-6 text-xs leading-5 text-[var(--rhc-muted)] md:flex-row md:items-start md:justify-between">
            <p>Rabino Holdings Corporation · RHC public demonstration</p>
            <p className="max-w-2xl md:text-right">
              No live purchase, payment, token, wallet custody, blockchain settlement, or legal-title transfer is offered on these public pages.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) {
  const centered = align === 'center';

  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="rhc-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.045em] text-[var(--rhc-heading)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-[var(--rhc-secondary-text)] md:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[rgba(212,175,55,.28)] bg-[var(--rhc-accent-soft)] p-4 text-sm leading-6 text-[var(--rhc-secondary-text)]">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--rhc-surface)] text-[var(--rhc-primary)]">
        <MeridianIcon name="help" className="h-4 w-4" />
      </span>
      <p>{children}</p>
    </div>
  );
}

export function StageBadge({ stage, label }: { stage: 'demo' | 'prepared' | 'planned'; label: string }) {
  return <Badge tone={stage === 'demo' ? 'gold' : 'neutral'}>{label}</Badge>;
}
