'use client';

import { useEffect, useState } from 'react';
import { AppShell, Badge, Card, SecurityStatus, ThemeToggle, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

type Preferences = { milestones: boolean; documents: boolean; services: boolean };
const defaults: Preferences = { milestones: true, documents: true, services: true };

export default function Page() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('rhc-demo-notification-preferences');
      if (stored) setPreferences({ ...defaults, ...(JSON.parse(stored) as Partial<Preferences>) });
    } catch {
      setPreferences(defaults);
    }
  }, []);

  function save() {
    window.localStorage.setItem('rhc-demo-notification-preferences', JSON.stringify(preferences));
    setSaved(true);
  }

  return (
    <AppShell title="Settings" navItems={navFor('Settings')}>
      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <SecurityStatus />
        <Card title="Appearance">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">Choose dark, light, or system preference. The setting is preserved locally and applies across the shared RHC component hierarchy without a theme flash.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3"><ThemeToggle /><Badge tone="gold">RHC</Badge><Badge tone="neutral">Dark · Light · System</Badge></div>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <Card title="Notification Preferences">
          <p className="text-sm text-[var(--rhc-muted)]">These are local synthetic preferences for presentation. They do not configure an email or SMS provider.</p>
          <div className="mt-5 grid gap-3">
            {(
              [
                ['milestones', 'Project milestones', 'Updates for linked property project records'],
                ['documents', 'Document reviews', 'Submission, approval, rejection, and version notices'],
                ['services', 'Resident services', 'Service request status changes'],
              ] as const
            ).map(([key, label, detail]) => (
              <label key={key} className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                <span><span className="block font-bold text-[var(--rhc-heading)]">{label}</span><span className="mt-1 block text-sm text-[var(--rhc-muted)]">{detail}</span></span>
                <input type="checkbox" checked={preferences[key]} onChange={(event) => { setPreferences((value) => ({ ...value, [key]: event.target.checked })); setSaved(false); }} className="h-5 w-5" />
              </label>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3"><Web3Button onClick={save}>Save local preferences</Web3Button>{saved ? <span role="status" className="text-sm text-[var(--rhc-success)]">Saved for this browser.</span> : null}</div>
        </Card>
        <Card title="Account Destinations">
          <div className="grid gap-3">
            {[
              ['Personal information', '/profile'],
              ['Digital identity', '/digital-id'],
              ['Account & credentials', '/account'],
              ['Security & consent', '/security'],
              ['Notifications', '/notifications'],
            ].map(([item, href]) => <Web3Button key={item} href={href} variant="secondary" className="justify-between">{item}<span aria-hidden="true">→</span></Web3Button>)}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
