'use client';

import { useState } from 'react';
import { AppShell, Badge, Card, EmptyState, MetricCard, ResourceStatus, Web3Button, errorMessage, useResource, useRuntime } from '@rhc/ui';
import { navFor } from '../web3-nav';

type DemoRecords = {
  benefits: Array<{ id: string; title: string; cost: number; status: string; detail: string }>;
  rewards: { balance: number; earned: number; redeemed: number; entries: Array<{ id: string; date: string; source: string; points: number; reason: string; reference: string }> };
};

export default function Page() {
  const records = useResource<DemoRecords>('/me/demo-records');
  const { request } = useRuntime();
  const [redeeming, setRedeeming] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const rewards = records.data?.rewards;

  async function redeem(benefit: DemoRecords['benefits'][number]) {
    if (redeeming || !rewards || rewards.balance < benefit.cost) return;
    if (!window.confirm(`Redeem ${benefit.cost.toLocaleString()} synthetic RHC Points for ${benefit.title}?`)) return;
    setRedeeming(benefit.id);
    setMessage('');
    setError('');
    try {
      const result = await request<{ receipt?: { reference?: string }; balance: number }>('/me/rewards/redeem', {
        method: 'POST',
        body: JSON.stringify({ benefit_id: benefit.id, idempotency_key: `benefit-${crypto.randomUUID()}` }),
      });
      setMessage(`${benefit.title} redeemed. ${result.receipt?.reference || 'A demo receipt'} was added to activity history.`);
      records.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setRedeeming('');
    }
  }

  return (
    <AppShell title="RHC Rewards" navItems={navFor('RHC Points')}>
      <section className="rhc-card-token rounded-3xl border border-[rgba(212,175,55,.24)] p-6 md:p-8">
        <Badge tone="gold">RHC Rewards</Badge>
        <h2 className="rhc-page-title mt-5 max-w-4xl">Rewards for verified RHC ecosystem activity</h2>
        <p className="rhc-body-copy mt-4 max-w-3xl">RHC Rewards are centrally managed demo points connected to qualifying fictional activities. They are not cryptocurrency, not a peso balance, and not automatically convertible into future tokens.</p>
      </section>

      <ResourceStatus {...records} />
      {rewards && <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Available points" value={rewards.balance.toLocaleString()} detail="Ledger-derived demo balance" icon="★" /><MetricCard label="Lifetime earned" value={rewards.earned.toLocaleString()} detail="Demo credits" icon="+" /><MetricCard label="Redeemed" value={rewards.redeemed.toLocaleString()} detail="Demo debits" icon="−" /><MetricCard label="Entries" value={String(rewards.entries.length)} detail="Append-only history" icon="LED" /></section>}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card title="Rewards History">
          {rewards ? <div className="space-y-3">{rewards.entries.map((entry) => <div key={entry.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[var(--rhc-heading)]">{entry.reason}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{entry.source} · {entry.date} · {entry.reference}</p></div><Badge tone={entry.points > 0 ? 'success' : 'warning'}>{entry.points > 0 ? '+' : ''}{entry.points.toLocaleString()} points</Badge></div></div>)}</div> : <EmptyState title="No rewards activity" description="Eligible demo events appear in your points history." />}
        </Card>
        <Card title="How Rewards Work">
          <div className="grid gap-3">
            {['Earned only from qualifying verified demo activities.', 'Credits, debits, reversals, and corrections should be append-only ledger entries.', 'Points are not crypto, not cash, and not a promise of monetary value.', 'Future token decisions require separate approval and production specification.'].map((item, index) => <div key={item} className="flex gap-3 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--rhc-accent-soft)] text-xs font-black text-[var(--rhc-primary)]">{index + 1}</span><p className="text-sm leading-6 text-[var(--rhc-muted)]">{item}</p></div>)}
          </div>
        </Card>
      </section>

      <section className="mt-5">
        <Card title="Demo Benefits">
          <p className="mb-5 text-sm leading-6 text-[var(--rhc-muted)]">These fictional offers demonstrate a governed benefit workflow. Redemption updates only the synthetic points ledger and creates a persistent demo receipt; no merchant settlement or cash redemption occurs.</p>
          {message ? <p role="status" className="mb-4 rounded-xl border border-[var(--rhc-success)] p-3 text-sm">{message}</p> : null}
          {error ? <p role="alert" className="mb-4 rounded-xl border border-[var(--rhc-danger)] p-3 text-sm">{error}</p> : null}
          {records.data?.benefits?.length ? <div className="grid gap-4 md:grid-cols-3">{records.data.benefits.map((benefit) => <div key={benefit.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-5"><Badge tone="gold">DEMO ONLY</Badge><h3 className="mt-4 text-lg font-black text-[var(--rhc-heading)]">{benefit.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{benefit.detail}</p><p className="mt-4 font-mono text-sm font-bold text-[var(--rhc-primary)]">{benefit.cost.toLocaleString()} RHC Points</p><div className="mt-4"><Web3Button disabled={Boolean(redeeming) || !rewards || rewards.balance < benefit.cost} variant="secondary" onClick={() => void redeem(benefit)}>{redeeming === benefit.id ? 'Redeeming…' : rewards && rewards.balance < benefit.cost ? 'Insufficient points' : 'Redeem demo benefit'}</Web3Button></div></div>)}</div> : <EmptyState title="No benefits available" description="Demo benefit offers will appear here when configured." />}
        </Card>
      </section>
    </AppShell>
  );
}
