import { AppShell, Badge, Card, PropertyAssetCard, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

const properties = [
  ['AMICA Tower Unit 1205', 'Cebu City', 'Residential', 'Demo valuation', 'Prepared'],
  ['Parking Slot P2-081', 'AMICA Tower', 'Parking', 'Demo valuation', 'Prepared'],
  ['Resident Access Record', 'AMICA Services', 'Service asset', 'Not financialized', 'Prepared'],
];

export default function Page() {
  return (
    <AppShell title="Digital Properties" navItems={navFor('Properties')}>
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <PropertyAssetCard />
        <Card title="Property Access Summary">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">
            Only authorized customer-property relationships appear here. Ownership and legal records
            remain in RHC business systems. This local preview does not publish personal or legal
            property data on-chain.
          </p>
          <div className="mt-6 space-y-3">
            {[
              'Buyer relationship prepared',
              'Digital asset record prepared',
              'Resident services eligible',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"
              >
                <b className="text-[var(--rhc-heading)]">{item}</b>
                <Badge tone="gold">Demo</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {properties.map(([name, location, type, valuation, status]) => (
          <Card key={name} className="p-0">
            <div className="rhc-property-strip h-24" />
            <div className="p-5">
              <Badge tone="warning">{status}</Badge>
              <h3 className="mt-4 text-xl font-bold text-[var(--rhc-heading)]">{name}</h3>
              <p className="mt-2 text-sm text-[var(--rhc-muted)]">
                {location} · {type}
              </p>
              <p className="mt-3 font-bold text-[var(--rhc-primary)]">{valuation}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Web3Button variant="secondary">Property Overview</Web3Button>
                <Web3Button variant="tertiary">Blockchain Record</Web3Button>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
