'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  MetricCard,
  ResourceStatus,
  SignOutButton,
  ThemeToggle,
  Web3Button,
  Web3Shell,
  usePagedResource,
} from '@rhc/ui';
import { modules } from '../admin-data';
import { VerificationReview, approvalBlockReason } from '../verification-review';

type CustomerRow = {
  id: string;
  email?: string | null;
  account_status?: string | null;
  verification_status?: string | null;
  auth_email_confirmed_at?: string | null;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    rhc_id?: string | null;
    mobile_number?: string | null;
    country?: string | null;
  } | null;
};

function nameOf(customer: CustomerRow) {
  const first = customer.profile?.first_name?.trim();
  const last = customer.profile?.last_name?.trim();
  return [first, last].filter(Boolean).join(' ') || 'Unnamed customer';
}

function statusTone(status?: string | null) {
  if (status === 'ACTIVE' || status === 'VERIFIED') return 'gold' as const;
  if (status === 'PENDING') return 'warning' as const;
  return 'neutral' as const;
}

function digitalIdState(customer: CustomerRow) {
  if (customer.profile?.rhc_id) return 'Issued';
  if (customer.verification_status === 'VERIFIED' && customer.account_status === 'ACTIVE') return 'Eligible';
  if (customer.verification_status === 'PENDING') return 'Needs review';
  return 'Not ready';
}

export default function Page() {
  const customers = usePagedResource<CustomerRow>('/admin/customers', true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [review, setReview] = useState<CustomerRow | null>(null);

  const rows = customers.data || [];
  const metrics = {
    issued: rows.filter((row) => Boolean(row.profile?.rhc_id)).length,
    verified: rows.filter((row) => row.verification_status === 'VERIFIED').length,
    pending: rows.filter((row) => row.verification_status === 'PENDING').length,
    eligible: rows.filter(
      (row) => !row.profile?.rhc_id && row.verification_status === 'VERIFIED' && row.account_status === 'ACTIVE',
    ).length,
  };

  const filtered = rows.filter((customer) => {
    const haystack = [
      customer.email,
      nameOf(customer),
      customer.profile?.rhc_id,
      customer.account_status,
      customer.verification_status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const state = digitalIdState(customer);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'issued' && state === 'Issued') ||
      (filter === 'eligible' && state === 'Eligible') ||
      (filter === 'pending' && state === 'Needs review') ||
      (filter === 'not-ready' && state === 'Not ready');
    return matchesQuery && matchesFilter;
  });

  return (
    <Web3Shell variant="admin">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge tone="warning">Admin Module</Badge>
          <div className="flex gap-3">
            <Link href="/">Command Center</Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
        <h1 className="mt-5 text-4xl font-black text-[var(--rhc-heading)] md:text-6xl">RHC Digital IDs</h1>
        <p className="mt-4 max-w-3xl text-[var(--rhc-muted)]">
          Monitor Digital ID readiness, review business verification, and confirm which customer profiles have
          issued RHC ecosystem identifiers. Admin approval verifies eligibility; customers still issue their own
          Digital ID through the customer portal.
        </p>
        <nav aria-label="Admin modules" className="mt-5 flex gap-4 overflow-x-auto">
          {modules.map((label) => (
            <a key={label} className="whitespace-nowrap text-sm" href={`/${label.toLowerCase().replaceAll(' ', '-')}`}>
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard label="Issued IDs" value={String(metrics.issued)} />
          <MetricCard label="Verified customers" value={String(metrics.verified)} />
          <MetricCard label="Pending review" value={String(metrics.pending)} />
          <MetricCard label="Eligible to issue" value={String(metrics.eligible)} />
        </div>

        <Card className="mt-8" title="Digital ID Registry">
          <ResourceStatus {...customers} />
          {review && (
            <VerificationReview
              candidate={review}
              cancel={() => setReview(null)}
              refresh={customers.refresh}
              done={() => {
                setReview(null);
                customers.refresh();
              }}
            />
          )}
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Search customers
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-2 w-full min-w-72 rounded-lg border p-3"
                placeholder="Name, email, RHC ID, or status"
              />
            </label>
            <label className="text-sm">
              Digital ID status
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-2 rounded-lg border p-3">
                <option value="all">All records</option>
                <option value="issued">Issued</option>
                <option value="eligible">Eligible to issue</option>
                <option value="pending">Needs review</option>
                <option value="not-ready">Not ready</option>
              </select>
            </label>
            <Web3Button variant="secondary" onClick={customers.refresh}>Refresh</Web3Button>
          </div>

          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3">Customer</th>
                    <th className="p-3">RHC ID</th>
                    <th className="p-3">Digital ID</th>
                    <th className="p-3">Account</th>
                    <th className="p-3">Business verification</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => {
                    const blockReason = approvalBlockReason(customer);
                    return (
                      <tr key={customer.id} className="border-b align-top">
                        <td className="p-3">
                          <p className="font-bold text-[var(--rhc-heading)]">{nameOf(customer)}</p>
                          <p className="text-[var(--rhc-muted)]">{customer.email || 'No email'}</p>
                        </td>
                        <td className="p-3 font-mono">{customer.profile?.rhc_id || '—'}</td>
                        <td className="p-3"><Badge tone={digitalIdState(customer) === 'Issued' ? 'gold' : 'neutral'}>{digitalIdState(customer)}</Badge></td>
                        <td className="p-3"><Badge tone={statusTone(customer.account_status)}>{customer.account_status || 'Unknown'}</Badge></td>
                        <td className="p-3"><Badge tone={statusTone(customer.verification_status)}>{customer.verification_status || 'Unknown'}</Badge></td>
                        <td className="p-3">
                          {customer.verification_status === 'PENDING' ? (
                            <Web3Button variant="secondary" disabled={Boolean(blockReason)} onClick={() => setReview(customer)}>
                              Review verification
                            </Web3Button>
                          ) : (
                            <span className="text-xs text-[var(--rhc-muted)]">No admin issuance action</span>
                          )}
                          {blockReason && <p className="mt-2 text-xs text-[var(--rhc-muted)]">{blockReason}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No Digital ID records" description="No customers match the current search and status filters." />
          )}
        </Card>
      </section>
    </Web3Shell>
  );
}
