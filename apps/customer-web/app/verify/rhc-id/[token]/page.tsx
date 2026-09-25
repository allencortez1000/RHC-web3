'use client';

import { AppShell, Badge, Card, EmptyState, Web3Button } from '@rhc/ui';

export default function VerifyRhcIdPage() {
  return (
    <AppShell title="RHC Digital ID Verification" navItems={[]} hideSidebar>
      <section className="mx-auto max-w-3xl">
        <Card title="Public Verification Unavailable">
          <Badge tone="warning">NOT CONFIGURED</Badge>
          <div className="mt-5">
            <EmptyState
              title="Public verification is not active"
              description="RHC Digital ID verification is an internal workflow. An approved sharing contract and protected public reference are required before anonymous identity lookup can be enabled."
            />
          </div>
          <p className="mt-6 text-sm leading-6 text-[var(--rhc-muted)]">
            No identifier was looked up and no customer identity data is displayed. This page does
            not establish ownership, business approval, property title, or blockchain verification.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Web3Button href="/login">Customer login</Web3Button>
            <Web3Button href="/" variant="secondary">Back to home</Web3Button>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
