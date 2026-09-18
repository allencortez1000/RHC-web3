'use client';

import { AppShell, Badge, Card, EmptyState, ResourceStatus, SignOutButton, useResource } from '@rhc/ui';
import { navFor } from '../web3-nav';

type AdminCapabilities = { permissions: string[]; modules?: Array<{ usable: boolean }> };

export default function AdminPage() {
  const capabilities = useResource<AdminCapabilities>('/admin/capabilities');
  const visible = capabilities.data?.modules
    ? capabilities.data.modules.filter((module) => module.usable)
    : capabilities.data?.permissions ?? [];

  return (
    <AppShell title="Admin Access" navItems={navFor('Dashboard')} hideSidebar>
      <Card title="Administrative access">
        <Badge tone="warning">Separate Admin Command Center</Badge>
        <p className="mt-4 text-sm leading-6 text-[var(--rhc-muted)]">
          Administrative records and actions are available only through the dedicated Admin Command Center. This customer portal does not infer administrator status from email, browser storage, or role names.
        </p>
        <ResourceStatus {...capabilities} />
        {capabilities.data && !visible.length ? (
          <div className="mt-5">
            <EmptyState title="No administrative access" description="Your verified session has no effective administrative read capability. Customer accounts remain restricted to the customer portal." />
          </div>
        ) : null}
        {capabilities.data && visible.length ? (
          <p className="mt-5 text-sm text-[var(--rhc-muted)]">Your session has effective administrative capabilities, but the Admin Command Center must be opened on its configured origin.</p>
        ) : null}
        <div className="mt-5">
          <SignOutButton />
        </div>
      </Card>
    </AppShell>
  );
}
