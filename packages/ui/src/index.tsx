'use client';

import { useEffect, useState, type ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type Theme = 'dark' | 'light';

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rhc-card group relative overflow-hidden rounded-3xl p-6 shadow-2xl backdrop-blur ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl transition group-hover:bg-cyan-300/20" />
      {title ? <h2 className="relative mb-3 text-lg font-semibold tracking-tight text-[var(--rhc-heading)]">{title}</h2> : null}
      <div className="relative">{children}</div>
    </section>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'rhc-badge-neutral',
    success: 'rhc-badge-success',
    warning: 'rhc-badge-warning',
    danger: 'rhc-badge-danger',
    info: 'rhc-badge-info',
  };
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] shadow-lg ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rhc-empty rounded-2xl border border-dashed p-8 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 shadow-lg shadow-cyan-950/20" />
      <h3 className="font-semibold text-[var(--rhc-heading)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{description}</p>
    </div>
  );
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="min-h-36">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rhc-accent-soft)]">{label}</p>
      <p className="mt-4 text-2xl font-bold text-[var(--rhc-heading)]">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{detail}</p> : null}
    </Card>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('rhc-theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const next = stored === 'light' || stored === 'dark' ? stored : preferred;
    document.documentElement.dataset.theme = next;
    setTheme(next);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem('rhc-theme', next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      aria-label="Toggle light and dark theme"
      aria-pressed={mounted ? theme === 'light' : false}
      onClick={toggleTheme}
      className="rhc-theme-toggle inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur transition hover:scale-[1.02]"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-300 text-xs text-slate-950">{theme === 'dark' ? '☾' : '☀'}</span>
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}

export function Web3Shell({ children, variant = 'customer' }: { children: ReactNode; variant?: 'customer' | 'admin' }) {
  return (
    <main className="rhc-shell relative min-h-screen overflow-hidden">
      <div className="rhc-bg-aura pointer-events-none fixed inset-0" />
      <div className="rhc-bg-grid pointer-events-none fixed inset-0" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative z-10">{children}</div>
      <div className="rhc-mode-pill pointer-events-none fixed bottom-4 right-4 hidden rounded-full border px-4 py-2 text-xs backdrop-blur md:block">
        {variant === 'admin' ? 'Command Center' : 'Customer Portal'} · Month 1 Mock Mode
      </div>
    </main>
  );
}
