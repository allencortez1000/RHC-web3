import { AppShell, Badge, Card, MetricCard, TokenBalance, TransactionTable, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="RHC Points & Rewards" navItems={navFor('RHC Points')}>
      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card title="RHC Points Balance" className="rhc-card-token">
          <Badge tone="gold">Rewards Ledger</Badge>
          <div className="mt-5"><TokenBalance amount="—" symbol="Points" label="RHC Points Balance" /></div>
          <p className="mt-4 text-sm leading-6 text-[var(--rhc-muted)]">RHC Points are an ecosystem loyalty/rewards concept. They are not the same as the future RHC Token and are not presented as live blockchain assets.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Web3Button disabled>Earn Points — Month 2</Web3Button><Web3Button variant="secondary" disabled>Redeem — Month 2</Web3Button><Web3Button variant="secondary" disabled>Reward History — Month 2</Web3Button></div>
        </Card>
        <Card title="RHC Token vs RHC Points">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['RHC Token', 'Future Web3 token layer. Not deployed in Month 1.'],
              ['RHC Points', 'Future off-chain rewards ledger for loyalty flows.'],
              ['Transfers', 'Disabled until backend and blockchain integrations exist.'],
              ['Data Mode', 'Coming soon — Month 2.'],
            ].map(([l,v]) => <div key={l} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-sm font-bold text-[var(--rhc-heading)]">{l}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{v}</p></div>)}
          </div>
        </Card>
      </section>
      <section className="mt-5 grid gap-5 md:grid-cols-4"><MetricCard label="Points Earned" value="—" detail="Coming soon" /><MetricCard label="Points Redeemed" value="—" detail="Coming soon" /><MetricCard label="Pending Rewards" value="—" detail="Awaiting rules engine" /><MetricCard label="Available Rewards" value="Prepared" detail="Marketplace ready" /></section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><Card title="Earning Opportunities"><div className="grid gap-3 sm:grid-cols-2">{['Property Activities','Marketplace Purchases','Resident Services','Business Transactions','Promotional Rewards','Referral Rewards'].map((item) => <div key={item} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><Badge tone="gold">Prepared</Badge><p className="mt-3 font-bold text-[var(--rhc-heading)]">{item}</p></div>)}</div></Card><TransactionTable /></section>
    </AppShell>
  );
}
