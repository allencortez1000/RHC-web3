import {
  AppShell,
  Badge,
  BlockchainStatus,
  Card,
  DigitalIDCard,
  MetricCard,
  PortfolioChart,
  PropertyAssetCard,
  SecurityStatus,
  TokenBalance,
  TokenCard,
  TransactionTable,
  WalletAddress,
  Web3Button,
} from '@rhc/ui';
import { navFor } from '../web3-nav';

const marketItems = [
  ['Resident Services', 'AMICA', '250 RHC', 'Available'],
  ['Water Account Link', 'AMICA WATER', 'Coming Soon', 'Prepared'],
  ['Retail Rewards', 'AMICA MART', 'Coming Soon', 'Prepared'],
];

const notifications = [
  ['RHC Points received', '850 RHC reward entry added to mock ledger.', 'Confirmed'],
  ['Property ownership verified', 'Amica Tower Unit 1205 linked to your RHC ID.', 'Verified'],
  ['Wallet login detected', 'New session opened in local mock environment.', 'Security'],
  ['Digital ID verified', 'RHC-2026-00000001 is active.', 'Identity'],
];

export default function Page() {
  return (
    <AppShell title="RHC Web3 Dashboard" navItems={navFor('Dashboard')}>
      <section id="dashboard" className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rhc-card border bg-[var(--rhc-surface)] p-6 shadow-sm md:p-7">
          <Badge tone="info">Customer Workspace</Badge>
          <h2 className="rhc-page-title mt-5 max-w-3xl">Your RHC digital services in one place</h2>
          <p className="rhc-body-copy mt-4 max-w-3xl">Review your Digital ID, wallet summary, RHC Points, property records, and recent activity using local demo data prepared for Month 1 validation.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Web3Button href="#wallet">Open Wallet Summary</Web3Button>
            <Web3Button href="#digital-id" variant="secondary">Review Digital ID</Web3Button>
            <Web3Button href="#transactions" variant="secondary">See Activity</Web3Button>
          </div>
        </div>
        <DigitalIDCard />
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total RHC Points" value="12,850 RHC" detail="Available: 12,000 · Pending: 850" icon="RHC" trend="+850" />
        <MetricCard label="Digital Assets" value="8 Assets" detail="Credentials, services, and prepared property assets" icon="ID" />
        <MetricCard label="Digital Properties" value="3 Properties" detail="1 verified · 2 prepared demo records" icon="PR" />
        <MetricCard label="Wallet" value="0x72F...93A2" detail="Copy address · View QR · Transactions" icon="WL" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <PortfolioChart />
        <div className="grid gap-6">
          <Card id="wallet" title="RHC Wallet">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">Wallet Balance</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--rhc-heading)]">₱125,430.00</p>
              </div>
              <WalletAddress />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {['SEND','RECEIVE','TRANSFER','QR'].map((action) => <Web3Button key={action} variant="secondary">{action}</Web3Button>)}
            </div>
          </Card>
          <TokenCard />
        </div>
      </section>

      <section id="digital-id" className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <Card title="Digital Identity Details">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Full Name', 'Juan Dela Cruz'],
              ['RHC ID', 'RHC-2026-00000001'],
              ['Membership Type', 'Customer / Buyer'],
              ['Wallet Address', '0x72F4...93A2'],
              ['Verification Status', 'Blockchain Verified'],
              ['Date Issued', 'Sep 2026'],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-sm text-[var(--rhc-muted)]">{label}</p><p className="mt-1 font-semibold text-[var(--rhc-heading)]">{value}</p></div>)}
          </div>
          <div className="mt-5 flex flex-wrap gap-3"><Web3Button variant="secondary">Download QR</Web3Button><Web3Button variant="secondary">View Blockchain Record</Web3Button></div>
        </Card>
        <DigitalIDCard />
      </section>

      <section id="points" className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card title="RHC Points">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">A local rewards ledger for RHC services and customer activity. Real token transfers remain disabled in Month 1.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <TokenBalance />
            <TokenBalance amount="850" label="Pending Rewards" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3"><Web3Button>Earn</Web3Button><Web3Button variant="secondary">Transfer</Web3Button><Web3Button variant="secondary">Redeem</Web3Button></div>
        </Card>
        <Card title="Token Information">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Token Name', 'RHC Points'], ['Symbol', 'RHC'], ['Network', 'Prepared RHC Network'], ['Contract Address', 'Not deployed in Month 1'], ['Total Supply', 'Disabled'], ['Token Status', 'Feature flagged']
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-sm text-[var(--rhc-muted)]">{label}</p><p className="mt-1 font-semibold text-[var(--rhc-heading)]">{value}</p></div>)}
          </div>
        </Card>
      </section>

      <section id="properties" className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <PropertyAssetCard />
        <Card title="Digital Property Portfolio">
          <div className="space-y-3">
            {['AMICA Tower Unit 1205', 'AMICA Parking Slot P2-081', 'Resident Access Record'].map((item) => <div key={item} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="font-semibold text-[var(--rhc-heading)]">{item}</p><Badge tone="success">Verified</Badge></div>)}
          </div>
        </Card>
      </section>

      <section id="marketplace" className="mt-5">
        <Card title="RHC Marketplace">
          <div className="mb-5 flex flex-wrap gap-2">{['All','Properties','Amica','RHC Businesses','Partners','Services','Digital Assets'].map((cat) => <Badge key={cat}>{cat}</Badge>)}</div>
          <div className="grid gap-4 md:grid-cols-3">
            {marketItems.map(([name, seller, price, status]) => <div key={name} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-5"><div className="rhc-market-strip mb-4 h-16 rounded-md" /><h3 className="font-semibold text-[var(--rhc-heading)]">{name}</h3><p className="mt-1 text-sm text-[var(--rhc-muted)]">Provider: {seller}</p><p className="mt-3 font-semibold text-[var(--rhc-accent)]">{price}</p><div className="mt-4 flex items-center justify-between"><Badge tone={status === 'Available' ? 'success' : 'neutral'}>{status}</Badge><Web3Button variant="secondary">View</Web3Button></div></div>)}
          </div>
        </Card>
      </section>

      <section id="transactions" className="mt-5"><TransactionTable /></section>

      <section id="blockchain" className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <BlockchainStatus />
        <Card title="Blockchain Activity">
          <div className="grid gap-3 sm:grid-cols-2">
            {['Latest Transactions','Latest Blocks','Smart Contract Activity','Token Transfers','Digital Property Records','Identity Verification Records'].map((item) => <div key={item} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="font-semibold text-[var(--rhc-heading)]">{item}</p><p className="mt-1 font-mono text-sm text-[var(--rhc-muted)]">0x84B2...93F1</p></div>)}
          </div>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
        <Card id="notifications" title="Notification Center">
          <div className="space-y-3">{notifications.map(([title, detail, type]) => <div key={title} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[var(--rhc-heading)]">{title}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{detail}</p></div><Badge tone="info">{type}</Badge></div></div>)}</div>
        </Card>
        <div id="settings"><SecurityStatus /></div>
      </section>
    </AppShell>
  );
}
