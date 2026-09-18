'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Badge, Card, EmptyState, ResourceStatus, SignOutButton, ThemeToggle, Web3Shell, useResource, useRuntime } from '@rhc/ui';
import { AdminMetrics, type AdminCapabilities, moduleDefinitions, visibleModules } from './admin-data';

export default function AdminHome() {
  const capabilities = useResource<AdminCapabilities>('/admin/capabilities');
  const { navigate } = useRuntime();
  const visible = visibleModules(capabilities.data);
  const firstPermitted = visible[0];
  const hasDashboard = capabilities.data?.permissions.includes('company.view') === true;
  useEffect(() => {
    if (capabilities.data && !hasDashboard && firstPermitted) navigate(firstPermitted.path);
  }, [capabilities.data, firstPermitted, hasDashboard, navigate]);
  if (capabilities.loading || capabilities.error) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">Checking permissions</h1><ResourceStatus {...capabilities} /></section></Web3Shell>;
  }
  if (!visible.length) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">No administrative access</h1><div className="mt-8"><EmptyState title="No permitted modules" description="This authenticated account has no effective administrative read permission. Contact an authorized operator; no administrative data is shown here." /></div></section></Web3Shell>;
  }
  if (!hasDashboard) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">Opening your permitted module</h1><p role="status" className="mt-4 text-[var(--rhc-muted)]">Dashboard access is not required. Continuing to {firstPermitted?.label || 'the first permitted module'}.</p>{firstPermitted && <Link className="mt-6 inline-block" href={firstPermitted.path}>Continue</Link>}</section></Web3Shell>;
  }
  return (
    <Web3Shell variant="admin">
      <aside className="fixed hidden h-full w-80 border-r border-white/10 bg-slate-950/75 p-6 backdrop-blur-xl lg:block">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-fuchsia-300/30 bg-fuchsia-400/10 font-black text-fuchsia-100 shadow-lg shadow-fuchsia-950/40">R</div>
          <div>
            <h1 className="text-lg font-black text-white">RHC Command Center</h1>
            <p className="text-xs text-slate-400">RBAC · Audit · Operations</p>
          </div>
        </Link>
        <div className="mt-6 flex justify-start gap-3">
          <ThemeToggle /><SignOutButton />
        </div>
        <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
          <Badge tone="info">Authenticated access</Badge>
          <p className="mt-3 text-sm leading-6 text-slate-300">Records are loaded from the API with your authenticated account and server-enforced permissions.</p>
        </div>
        <nav className="mt-6 space-y-1">
          {visible.map((module) => (
            <a className="group flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-cyan-100" href={module.path} key={module.path}>
              <span>{module.label}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/0 group-hover:bg-cyan-300" />
            </a>
          ))}
        </nav>
      </aside>

      <section className="lg:pl-80">
        <div className="border-b border-white/10 bg-slate-950/50 px-6 py-8 backdrop-blur-xl md:px-10">
          <div className="mb-6 flex justify-end gap-3 lg:hidden"><ThemeToggle /><SignOutButton /></div><nav aria-label="Mobile admin modules" className="mb-5 flex gap-4 overflow-x-auto lg:hidden">{visible.map((module) => <a className="whitespace-nowrap" key={module.path} href={module.path}>{module.label}</a>)}</nav>
          <div className="mx-auto max-w-7xl">
            <Badge tone="warning">Server-enforced RBAC required</Badge>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">Admin Command Center</h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Operational foundation for identity, companies, Amica Tower inventory, integrations, feature flags, and audit.</p>
              </div>
              <Card className="border-fuchsia-300/20 bg-fuchsia-400/10">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100">Security posture</p>
                <p className="mt-3 text-2xl font-black text-white">Least Privilege</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Company-scoped permissions with audit visibility for sensitive actions.</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl p-6 md:p-10">
          <AdminMetrics />

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card title="Month 1 Control Plane">
              <div className="grid gap-3 sm:grid-cols-2">
                {moduleDefinitions.filter((module) => module.label !== 'Dashboard' && visible.some((item) => item.path === module.path)).map((module) => {
                  const item = module.label;
                  return (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="font-semibold text-white">{item}</p>
                    <p className="mt-1 text-sm text-slate-400">Permission guarded</p>
                  </div>
                  );
                })}
              </div>
            </Card>
            <Card title="Future Web3 Boundary">
              <p className="text-sm leading-6 text-slate-400">Wallet, token, marketplace, and blockchain modules remain disabled in Month 1. This control plane keeps RHC business records authoritative and prepares governed extension points for Month 2.</p>
              <div className="mt-5 space-y-3">
                {['Wallet actions: coming soon', 'Token actions: coming soon', 'Blockchain actions: coming soon'].map((flag) => <div key={flag} className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 font-mono text-sm text-amber-100">{flag}</div>)}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </Web3Shell>
  );
}
