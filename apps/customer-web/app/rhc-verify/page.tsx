'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card, Web3Button } from '@rhc/ui';
import { PublicShell } from '../components/meridian-public/public-shell';

const examples = [
  ['Valid', 'demo-passport-maya-7d2f0f9a'],
  ['Pending', 'demo-passport-pending-176ab901'],
  ['Expired', 'demo-passport-expired-09a42cb1'],
  ['Revoked', 'demo-passport-revoked-449ad0cb'],
  ['Superseded', 'demo-passport-property-a81d44ce'],
  ['Not found', 'demo-passport-not-found'],
] as const;

export default function Page() {
  const router = useRouter();
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const raw = String(form.get('reference') || '').trim();
    let reference = raw;
    try {
      if (/^https?:\/\//i.test(raw)) reference = new URL(raw).pathname.split('/').filter(Boolean).at(-1) || '';
    } catch {
      setError('Enter a valid opaque reference or RHC verification URL.');
      return;
    }
    if (!/^[A-Za-z0-9_-]{8,180}$/.test(reference)) {
      setError('Enter a valid opaque verification reference. Customer names and email addresses cannot be searched.');
      return;
    }
    router.push(`/verify/rhc-id/${encodeURIComponent(reference)}`);
  }

  return (
    <PublicShell current="verification">
      <section className="px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_440px] lg:items-start">
          <div>
            <Badge tone="gold">RHC Verify</Badge>
            <h1 className="mt-6 max-w-4xl text-[clamp(2.7rem,6vw,5.5rem)] font-extrabold leading-[.98] tracking-[-0.055em] text-[var(--rhc-heading)]">
              Verify the record, <span className="text-[var(--rhc-primary)]">not the person.</span>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--rhc-secondary-text)]">
              Enter an opaque credential reference or scan the QR on an RHC-issued demo credential. Public results reveal only the approved minimum state and never provide a customer directory.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['Source', 'Which RHC record and version supports the credential'],
                ['Review', 'Whether the required internal business review is complete'],
                ['Proof', 'Credential lifecycle and optional blockchain status shown separately'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
                  <p className="font-bold text-[var(--rhc-heading)]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <Card title="Verification Entry" className="rhc-card-token p-6">
            <form onSubmit={submit} className="grid gap-4">
              <label className="text-sm font-semibold">
                Opaque reference or verification URL
                <input name="reference" required autoComplete="off" placeholder="demo-passport-…" className="mt-2 w-full rounded-xl border p-3 font-mono" />
              </label>
              <Web3Button type="submit">Check credential</Web3Button>
            </form>
            {error ? <p role="alert" className="mt-4 rounded-xl border border-[var(--rhc-danger)] p-3 text-sm">{error}</p> : null}
            <p className="mt-4 text-xs leading-5 text-[var(--rhc-muted)]">RHC Digital ID is company-issued, not government ID. Property credentials are not government title.</p>
          </Card>
        </div>
      </section>

      <section className="border-y border-[var(--rhc-border)] bg-[var(--rhc-bg-secondary)] px-5 py-14 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-[var(--rhc-heading)]">Deterministic demo examples</h2>
          <p className="mt-2 text-sm text-[var(--rhc-muted)]">Use these synthetic references to review each safe public state.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {examples.map(([label, reference]) => (
              <a key={label} href={`/verify/rhc-id/${reference}`} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 transition hover:border-[var(--rhc-primary)]">
                <Badge tone={label === 'Valid' ? 'success' : label === 'Revoked' ? 'danger' : 'warning'}>{label}</Badge>
                <p className="mt-3 break-all font-mono text-xs text-[var(--rhc-secondary-text)]">{reference}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
