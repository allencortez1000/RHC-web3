'use client';

import { useState } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  MetricCard,
  ResourceStatus,
  Web3Button,
  usePagedResource,
  useRuntime,
} from '@rhc/ui';
import { AdminShell, useAdminCapabilities } from '../admin-data';
import { hasEffectiveGrant } from '../capability-scopes';
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
  if (customer.verification_status === 'VERIFIED' && customer.account_status === 'ACTIVE')
    return 'Eligible';
  if (customer.verification_status === 'PENDING') return 'Needs review';
  return 'Not ready';
}

function DigitalIdRegistry() {
  const customers = usePagedResource<CustomerRow>('/admin/customers', true);
  const { user } = useRuntime();
  const capabilities = useAdminCapabilities();
  const capabilitiesReady = Boolean(capabilities.data) && !capabilities.loading && !capabilities.error;
  const canReview = capabilitiesReady && hasEffectiveGrant(capabilities.data, 'user.manage');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [review, setReview] = useState<CustomerRow | null>(null);

  const rows = customers.data || [];
  const metrics = {
    issued: rows.filter((row) => Boolean(row.profile?.rhc_id)).length,
    verified: rows.filter((row) => row.verification_status === 'VERIFIED').length,
    pending: rows.filter((row) => row.verification_status === 'PENDING').length,
    eligible: rows.filter(
      (row) =>
        !row.profile?.rhc_id &&
        row.verification_status === 'VERIFIED' &&
        row.account_status === 'ACTIVE',
    ).length,
  };

  const metricValue = (value: number) => {
    if (customers.error) return 'Unavailable';
    return customers.data ? String(value) : '…';
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
    <>
      <section className="rhc-admin-hero rounded-[2rem] border border-[rgba(212,175,55,.24)] p-6 shadow-2xl md:p-8">
        <Badge tone="warning">Customer-owned issuance</Badge>
        <p className="mt-4 max-w-4xl text-base leading-8 text-[var(--rhc-secondary-text)]">
          Monitor Digital ID readiness and review business verification. Admin approval establishes
          eligibility only; customers retain control and issue their own RHC Digital ID through the
          customer portal.
        </p>
      </section>

      <section aria-label="Loaded Digital ID summary" className="mt-8 grid gap-4 md:grid-cols-4">
        <MetricCard label="Loaded issued IDs" value={metricValue(metrics.issued)} />
        <MetricCard label="Loaded verified customers" value={metricValue(metrics.verified)} />
        <MetricCard label="Loaded pending reviews" value={metricValue(metrics.pending)} />
        <MetricCard label="Loaded eligible customers" value={metricValue(metrics.eligible)} />
      </section>

      <Card className="mt-8" title="Digital ID Registry">
        <p className="mb-5 text-sm leading-6 text-[var(--rhc-muted)]">
          Summary counts, search, and filters apply only to customer records loaded in this session.
        </p>
        <ResourceStatus {...customers} />
        {review && (
          <VerificationReview
            key={review.id}
            capabilitiesReady={capabilitiesReady}
            revalidateCapabilities={capabilities.revalidate}
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
          <label className="min-w-[280px] flex-1 text-sm">
            Search customers
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 w-full rounded-lg border p-3"
              placeholder="Name, email, RHC ID, or status"
            />
          </label>
          <label className="text-sm">
            Digital ID status
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="mt-2 block rounded-lg border p-3"
            >
              <option value="all">All records</option>
              <option value="issued">Issued</option>
              <option value="eligible">Eligible to issue</option>
              <option value="pending">Needs review</option>
              <option value="not-ready">Not ready</option>
            </select>
          </label>
          <Web3Button
            variant="secondary"
            disabled={customers.loading}
            onClick={customers.refresh}
          >
            Refresh records
          </Web3Button>
        </div>

        {customers.hasMore && (
          <div className="mb-5">
            <Web3Button
              variant="secondary"
              disabled={customers.loading}
              onClick={customers.loadMore}
            >
              {customers.loading ? 'Loading…' : 'Load more customers'}
            </Web3Button>
            <p className="mt-2 text-xs text-[var(--rhc-muted)]">
              More permission-scoped customer records are available.
            </p>
          </div>
        )}

        {customers.data &&
          !customers.error &&
          (filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Digital ID readiness and verification actions for loaded customer records
                </caption>
                <thead>
                  <tr className="border-b border-[var(--rhc-border)]">
                    <th scope="col" className="p-3">
                      Customer
                    </th>
                    <th scope="col" className="p-3">
                      RHC ID
                    </th>
                    <th scope="col" className="p-3">
                      Digital ID
                    </th>
                    <th scope="col" className="p-3">
                      Account
                    </th>
                    <th scope="col" className="p-3">
                      Business verification
                    </th>
                    <th scope="col" className="p-3">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => {
                    const blockReason = approvalBlockReason(customer, user?.id);
                    const state = digitalIdState(customer);
                    return (
                      <tr
                        key={customer.id}
                        className="border-b border-[var(--rhc-border)] align-top"
                      >
                        <th scope="row" className="p-3 text-left font-normal">
                          <p className="font-bold text-[var(--rhc-heading)]">{nameOf(customer)}</p>
                          <p className="text-[var(--rhc-muted)]">{customer.email || 'No email'}</p>
                        </th>
                        <td className="p-3 font-mono">{customer.profile?.rhc_id || '—'}</td>
                        <td className="p-3">
                          <Badge tone={state === 'Issued' ? 'gold' : 'neutral'}>{state}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge tone={statusTone(customer.account_status)}>
                            {customer.account_status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge tone={statusTone(customer.verification_status)}>
                            {customer.verification_status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {customer.verification_status === 'PENDING' && canReview ? (
                            <Web3Button
                              variant="secondary"
                              disabled={Boolean(blockReason)}
                              onClick={() => setReview(customer)}
                            >
                              Review verification
                            </Web3Button>
                          ) : (
                            <span className="text-xs text-[var(--rhc-muted)]">
                              No admin issuance action
                            </span>
                          )}
                          {blockReason && (
                            <p className="mt-2 text-xs text-[var(--rhc-muted)]">{blockReason}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Digital ID records"
              description="No loaded customers match the current search and status filters."
            />
          ))}
      </Card>
    </>
  );
}

export default function Page() {
  return <AdminShell title="RHC Digital IDs" activeHref="/rhc-digital-ids"><DigitalIdRegistry /></AdminShell>;
}
