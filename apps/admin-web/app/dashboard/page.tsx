'use client';

import Link from 'next/link';
import {
  Badge,
  Card,
  EmptyState,
  ResourceStatus,
  SignOutButton,
  Web3Shell,
} from '@rhc/ui';
import { AdminMetrics, useAdminCapabilities, visibleModules } from '../admin-data';

export default function Page() {
  const capabilities = useAdminCapabilities();
  if (capabilities.loading || capabilities.error) {
    return (
      <Web3Shell variant="admin">
        <section className="mx-auto max-w-3xl px-6 py-10">
          <Badge tone="warning">Admin Dashboard</Badge>
          <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Checking permissions.</h1>
          <ResourceStatus {...capabilities} />
        </section>
      </Web3Shell>
    );
  }

  const visible = visibleModules(capabilities.data);
  const hasDashboard = visible.some((module) => module.path === '/');
  if (!hasDashboard) {
    return (
      <Web3Shell variant="admin">
        <section className="mx-auto max-w-3xl px-6 py-10">
          <Badge tone="warning">Admin Dashboard</Badge>
          <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">No administrative access.</h1>
          <div className="mt-8">
            <EmptyState
              title="No permitted modules"
              description="This account has no effective company dashboard permission. The API remains authoritative for every resource request."
            />
          </div>
          <div className="mt-6"><SignOutButton /></div>
        </section>
      </Web3Shell>
    );
  }

  return (
    <Web3Shell variant="admin">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex justify-between"><Badge tone="warning">Admin Dashboard</Badge><Link href="/">Command Center</Link><SignOutButton /></div>
        <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Secure operations console.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Backed by /api/v1/admin endpoints with explicit server-side permissions and audit logging for sensitive changes.</p>

        <div className="mt-8"><AdminMetrics /></div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <Card title="Permission Boundary">
            <p className="rhc-body-copy">The API enforces permissions for each operation. Access-denied responses are shown without exposing restricted records.</p>
          </Card>
          <Card title="Operational Modules">
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.filter((module) => module.path !== '/').map((module) => (
                <Link key={module.path} href={module.path} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-semibold text-white hover:border-cyan-300/40 hover:bg-cyan-400/10">{module.label}</Link>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </Web3Shell>
  );
}
