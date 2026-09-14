import { AppShell, Badge, Card, MetricCard, TokenHero, TransactionTable, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

const utilityCards = [
  ['Real Estate Integration', 'Prepared for future property-backed utility and ownership workflows.'],
  ['Wallet & Payments', 'Designed for future wallet visibility and controlled payment experiences.'],
  ['Marketplace Utility', 'Prepared for RHC Marketplace, Amica, business, and partner activity.'],
  ['Rewards & Loyalty', 'Clearly separated from RHC Points until real token logic exists.'],
  ['Community Governance', 'Future concept only; no voting or governance contract is active.'],
  ['Global Access', 'Future Web3 access layer for eligible ecosystem participants.'],
];

const allocation = [
  ['Ecosystem Reserve', 'Not allocated'],
  ['Property Utility', 'Not allocated'],
  ['Marketplace Incentives', 'Not allocated'],
  ['Rewards Programs', 'Not allocated'],
];

export default function Page() {
  return (
    <AppShell title="RHC Token" navItems={navFor('RHC Token')}>
      <TokenHero />

      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Supply" value="Not live" detail="Awaiting token deployment" icon="◎" />
        <MetricCard label="Circulating Supply" value="Not connected" detail="No production chain data" icon="RHC" />
        <MetricCard label="Holders" value="Not available" detail="No holder indexer active" icon="H" />
        <MetricCard label="Contract" value="Not deployed" detail="Month 1 foundation only" icon="SC" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
        <Card title="Token Overview">
          <Badge tone="gold">Powering the RHC Web3 Ecosystem</Badge>
          <p className="rhc-body-copy mt-4">The RHC Token interface represents the future token layer of the Rabino Holdings Corporation digital ecosystem. Token operations are coming soon. This interface does not perform blockchain, custody, exchange, staking, or transfer operations.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Brand Message', 'Real assets. Digital possibilities.'],
              ['Asset Theme', 'Real-estate-backed ecosystem utility'],
              ['Data Mode', 'Not connected'],
              ['Blockchain Status', 'Awaiting Integration'],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">{label}</p><p className="mt-1 font-bold text-[var(--rhc-heading)]">{value}</p></div>)}
          </div>
        </Card>

        <Card title="Smart Contract Details">
          <div className="space-y-3">
            {[
              ['Contract Address', 'Not deployed in Month 1'],
              ['Network', 'Awaiting blockchain integration'],
              ['Verification', 'No production contract verification yet'],
              ['Token Standard', 'To be finalized'],
              ['Custody', 'No custody or private keys handled by this UI'],
            ].map(([label, value]) => <div key={label} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><span className="text-sm text-[var(--rhc-muted)]">{label}</span><b className="text-right text-[var(--rhc-heading)]">{value}</b></div>)}
          </div>
        </Card>
      </section>

      <section className="mt-5">
        <Card title="Token Utility">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {utilityCards.map(([title, detail]) => <div key={title} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-5"><Badge tone="gold">Utility</Badge><h3 className="mt-4 font-bold text-[var(--rhc-heading)]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{detail}</p></div>)}
          </div>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <Card title="Token Allocation">
          <div className="space-y-3">{allocation.map(([name, value]) => <div key={name} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><div className="flex justify-between gap-4"><span className="font-bold text-[var(--rhc-heading)]">{name}</span><span className="text-sm text-[var(--rhc-muted)]">{value}</span></div><div className="mt-3 h-2 rounded-full bg-[var(--rhc-bg-secondary)]"><div className="h-2 w-0 rounded-full bg-[var(--rhc-primary)]" /></div></div>)}</div>
        </Card>
        <Card title="Token History">
          <div className="space-y-3">{['Design system aligned to RHC Token identity', 'Month 1 UI foundation prepared', 'Blockchain deployment not active', 'Future token utility requires backend and contract integration'].map((item) => <div key={item} className="flex items-start gap-3 rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><Badge tone="neutral">Coming soon</Badge><p className="text-sm leading-6 text-[var(--rhc-secondary-text)]">{item}</p></div>)}</div>
          <div className="mt-5 flex flex-wrap gap-3"><Web3Button>View Token</Web3Button><Web3Button variant="secondary">Copy Contract</Web3Button></div>
        </Card>
      </section>

      <section className="mt-5"><TransactionTable /></section>
    </AppShell>
  );
}
