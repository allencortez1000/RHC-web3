'use client';

import { useState, type FormEvent } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  ResourceStatus,
  Web3Button,
  errorMessage,
  usePagedResource,
  useRuntime,
} from '@rhc/ui';
import { AdminShell } from '../admin-data';

type Customer = { id: string; email: string; profile?: { first_name?: string; last_name?: string } };
type Entry = {
  id: string;
  customer_id: string;
  date: string;
  source: string;
  points: number;
  reason: string;
  reference: string;
  rule_version: string;
  status: string;
  idempotency_key: string;
};

export default function Page() {
  const customers = usePagedResource<Customer>('/admin/customers');
  const ledger = usePagedResource<Entry>('/admin/rewards-ledger');
  const { request } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await request<{ entry: Entry; duplicate: boolean }>('/admin/rewards-ledger/credit', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: String(form.get('customer_id') || ''),
          points: Number(form.get('points')),
          source: String(form.get('source') || ''),
          reason: String(form.get('reason') || ''),
          rule_version: String(form.get('rule_version') || ''),
          idempotency_key: String(form.get('idempotency_key') || ''),
        }),
      });
      setMessage(
        result.duplicate
          ? `Duplicate command detected; existing ${result.entry.reference} was returned without a second credit.`
          : `${result.entry.reference} was posted once and the customer was notified.`,
      );
      ledger.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Rewards Ledger" activeHref="/rewards-ledger">
      <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <Card title="Post Qualifying Demo Event">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">
            Credits require a synthetic qualifying source, explicit demo rule version, and idempotency key. This is RHC Points—not PHP, cash, or a token.
          </p>
          <ResourceStatus {...customers} />
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="text-sm font-semibold">
              Customer
              <select name="customer_id" required className="mt-2 w-full rounded-xl border p-3">
                <option value="">Choose customer</option>
                {customers.data?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {[customer.profile?.first_name, customer.profile?.last_name].filter(Boolean).join(' ') || customer.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">RHC Points<input name="points" type="number" min="1" max="100000" step="1" required className="mt-2 w-full rounded-xl border p-3" /></label>
            <label className="text-sm font-semibold">Qualifying source<input name="source" required maxLength={120} defaultValue="Amica Demo Approved Event" className="mt-2 w-full rounded-xl border p-3" /></label>
            <label className="text-sm font-semibold">Reason<input name="reason" required maxLength={240} defaultValue="Synthetic qualifying service milestone" className="mt-2 w-full rounded-xl border p-3" /></label>
            <label className="text-sm font-semibold">Demo rule version<input name="rule_version" required maxLength={80} defaultValue="DEMO-RULE-1.0" className="mt-2 w-full rounded-xl border p-3 font-mono" /></label>
            <label className="text-sm font-semibold">Idempotency key<input name="idempotency_key" required minLength={8} maxLength={120} placeholder="demo-credit-case-001" className="mt-2 w-full rounded-xl border p-3 font-mono" /></label>
            <Web3Button type="submit" disabled={busy || !customers.data?.length}>{busy ? 'Posting…' : 'Post points credit'}</Web3Button>
          </form>
          {message ? <p role="status" className="mt-4 text-sm text-[var(--rhc-success)]">{message}</p> : null}
          {error ? <p role="alert" className="mt-4 text-sm text-[var(--rhc-danger)]">{error}</p> : null}
        </Card>

        <Card title="Append-only Points Activity">
          <ResourceStatus {...ledger} />
          {ledger.data?.length ? (
            <div className="grid gap-3">
              {ledger.data.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--rhc-heading)]">{entry.reason}</p>
                      <p className="mt-1 text-xs text-[var(--rhc-muted)]">{entry.reference} · {entry.customer_id} · {entry.source}</p>
                      <p className="mt-1 font-mono text-xs text-[var(--rhc-muted)]">{entry.rule_version} · {entry.idempotency_key}</p>
                    </div>
                    <Badge tone={entry.points >= 0 ? 'success' : 'warning'}>{entry.points > 0 ? '+' : ''}{entry.points.toLocaleString()} points</Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : !ledger.loading && !ledger.error ? (
            <EmptyState title="No points entries" description="No synthetic ledger entries are visible in the current scope." />
          ) : null}
          {ledger.hasMore ? <div className="mt-4"><Web3Button variant="secondary" onClick={ledger.loadMore}>Load more entries</Web3Button></div> : null}
        </Card>
      </section>
    </AdminShell>
  );
}
