'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, Badge, Card, EmptyState, ResourceStatus, Web3Button, errorMessage, useResource, useRuntime } from '@rhc/ui';
import { navFor } from '../../web3-nav';
import type { Property, PropertyLink } from '../../components/customer-data';

type InventoryProperty = Property & {
  metadata?: Record<string, unknown>;
  project?: { id?: string; project_code?: string; project_name?: string; company?: { company_code?: string; display_name: string } };
};

function value(value: unknown) {
  if (value == null || value === '') return 'Not provided';
  return String(value);
}

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const linked = useResource<PropertyLink[]>('/me/properties');
  const { request } = useRuntime();
  const [publicRecord, setPublicRecord] = useState<InventoryProperty>();
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState('');
  const [publicRevision, setPublicRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const linkedRecord = linked.data?.find((link) => link.property.id === id)?.property as InventoryProperty | undefined;
  const linkedRecordId = linkedRecord?.id;

  useEffect(() => {
    if (linked.loading) {
      setPublicRecord(undefined);
      setPublicError('');
      setPublicLoading(false);
      return;
    }
    if (linkedRecordId) {
      setPublicRecord(undefined);
      setPublicError('');
      setPublicLoading(false);
      return;
    }
    const controller = new AbortController();
    setPublicLoading(true);
    setPublicError('');
    request<InventoryProperty>(`/properties/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setPublicRecord(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setPublicError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setPublicLoading(false);
      });
    return () => controller.abort();
  }, [id, linked.loading, linkedRecordId, publicRevision, request]);

  const record = linkedRecord || publicRecord;
  const loading = linked.loading || publicLoading;
  const combinedError = linked.error || publicError;
  const reservable = record?.status === 'AVAILABLE';
  const reload = () => {
    linked.reload();
    setPublicRevision((value) => value + 1);
  };

  async function reserve() {
    if (!record || !reservable || busy) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const reservation = await request<{ id: string; reservation_number: string }>('/me/reservations', {
        method: 'POST',
        body: JSON.stringify({ property_id: record.id }),
      });
      setMessage(`Reservation ${reservation.reservation_number} created. This property is now held.`);
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!record?.property_code || !navigator.clipboard) return;
    await navigator.clipboard.writeText(record.property_code);
    setMessage('Property code copied.');
  }

  return (
    <AppShell title="Property Overview" navItems={navFor('Properties')}>
      <ResourceStatus loading={loading} error={combinedError} reload={reload} />
      {record ? (
        <Card className="p-0">
          <div className="rhc-property-strip h-28" />
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone={record.status === 'AVAILABLE' ? 'success' : 'neutral'}>{record.status}</Badge>
                <h2 className="mt-4 text-2xl font-bold text-[var(--rhc-heading)]">{record.property_code}</h2>
                <p className="mt-2 text-sm text-[var(--rhc-muted)]">{record.project?.project_name || 'Project'} · {value(record.metadata?.unit_type || record.asset_type)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Web3Button href="/properties" variant="secondary">Back</Web3Button>
                <Web3Button variant="secondary" onClick={copyCode}>Copy code</Web3Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Asset type', record.asset_type],
                ['Project', record.project?.project_name],
                ['Company', record.project?.company?.display_name],
                ['Building / Phase', record.tower],
                ['Floor', record.floor],
                ['Unit', record.unit_number],
                ['Area', record.area],
                ['List price', record.list_price == null ? undefined : `${record.currency || 'PHP'} ${Number(record.list_price).toLocaleString()}`],
              ].map(([label, item]) => (
                <div key={label} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                  <p className="text-sm text-[var(--rhc-muted)]">{label}</p>
                  <p className="mt-1 font-bold text-[var(--rhc-heading)]">{value(item)}</p>
                </div>
              ))}
            </div>

            <Card className="mt-5" title="Reservation Action">
              <p className="text-sm leading-6 text-[var(--rhc-muted)]">
                Reservations are created through the API in a database transaction. The backend checks
                availability and prevents duplicate active reservations for the same unit.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Web3Button disabled={!reservable || busy} onClick={reserve}>{busy ? 'Creating…' : 'Reserve property'}</Web3Button>
                <Web3Button href="/reservations" variant="secondary">View reservations</Web3Button>
                <Web3Button variant="secondary" disabled>Blockchain record — Month 2</Web3Button>
              </div>
              {!reservable && <p className="mt-3 text-sm text-[var(--rhc-muted)]">Only AVAILABLE properties can be reserved.</p>}
              {message && <p role="status" className="mt-4">{message}</p>}
              {error && <p role="alert" className="mt-4">{error}</p>}
            </Card>
          </div>
        </Card>
      ) : !loading && !combinedError ? (
        <EmptyState title="Property not found" description="This property is unavailable or you do not have access." />
      ) : null}
    </AppShell>
  );
}
