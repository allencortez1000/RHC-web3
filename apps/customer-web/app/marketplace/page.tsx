'use client';

import { useState } from 'react';
import { AppShell, Badge, Card, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

const categories = [
  {
    key: 'services',
    label: 'Services',
    title: 'RHC Service Marketplace',
    description: 'Resident services, property support, customer assistance, and future RHC ecosystem services will appear here after Month 2 approval.',
    items: ['Property Services', 'Resident Services', 'Customer Support'],
  },
  {
    key: 'businesses',
    label: 'RHC Businesses',
    title: 'RHC Business Directory',
    description: 'A future directory for participating RHC companies such as Amica, RHBC, Amica Water, Amica Mart, RSSC, RBAC, and approved partners.',
    items: ['Amica', 'RHBC', 'Amica Water', 'Amica Mart'],
  },
  {
    key: 'projects',
    label: 'Projects',
    title: 'Project Marketplace Preview',
    description: 'Future project listings may connect customers to available inventory, approved offers, service bundles, and verified project information.',
    items: ['Amica Residences Tower 1', 'Future RHC Projects'],
  },
];

export default function Page() {
  const [active, setActive] = useState(categories[0]);
  return (
    <AppShell title="RHC Marketplace" navItems={navFor('RHC Marketplace')} hideSidebar>
      <div className="mb-5 flex justify-start">
        <Web3Button href="/dashboard" variant="secondary">
          ← Back to Dashboard
        </Web3Button>
      </div>

      <Card title="Marketplace Categories" className="rhc-card-token">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              aria-pressed={category.key === active.key}
              onClick={() => setActive(category)}
            >
              <Badge tone={category.key === active.key ? 'gold' : 'neutral'}>{category.label}</Badge>
            </button>
          ))}
        </div>
        <p className="rhc-body-copy mt-4">
          Explore the RHC business directory preview. Marketplace purchases, payments, rewards, and
          Web3 settlement remain disabled until Month 2 implementation and approval.
        </p>
      </Card>

      <section className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card title={active.title}>
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">{active.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {active.items.map((item) => (
              <Badge key={item} tone="info">
                {item}
              </Badge>
            ))}
          </div>
        </Card>

        <Card title="Month 2 Marketplace Boundary">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Purchases', 'Coming soon'],
              ['Payments', 'Disabled'],
              ['Rewards', 'Coming soon'],
              ['Blockchain settlement', 'Not active'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                <p className="text-sm text-[var(--rhc-muted)]">{label}</p>
                <p className="mt-1 font-bold text-[var(--rhc-heading)]">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
