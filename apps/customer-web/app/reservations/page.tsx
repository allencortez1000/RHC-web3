'use client';

import { useState } from 'react';
import { AppShell, Badge, Card, EmptyState, ResourceStatus, Web3Button, errorMessage, useResource, useRuntime } from '@rhc/ui';
import { navFor } from '../web3-nav';
import type { Property } from '../components/customer-data';

type Reservation = {
  id: string;
  reservation_number: string;
  status: string;
  expires_at: string;
  created_at: string;
  property: Property & { project?: { project_name?: string; company?: { display_name: string } } };
};

export default function Page() {
  const reservations = useResource<Reservation[]>('/me/reservations');
  const properties = useResource<Property[]>('/properties?status=AVAILABLE&take=200');
  const { request } = useRuntime();
  const [propertyId, setPropertyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const available = properties.data?.filter((property) => property.status === 'AVAILABLE') || [];

  async function createReservation() {
    if (!propertyId || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/me/reservations', { method: 'POST', body: JSON.stringify({ property_id: propertyId }) });
      setPropertyId('');
      setMessage('Reservation request created. The property is now temporarily held.');
      reservations.reload();
      properties.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Reservations" navItems={navFor('Reservations')}>
      <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card title="Create Reservation Request">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">
            Select an available Amica property to create a reservation request. The API locks the
            property in a database transaction to prevent duplicate reservations.
          </p>
          <ResourceStatus {...properties} />
          {available.length ? (
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">
                Available property
                <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="mt-2 w-full rounded-lg border p-3">
                  <option value="">Choose property</option>
                  {available.map((property) => <option key={property.id} value={property.id}>{property.property_code}</option>)}
                </select>
              </label>
              <Web3Button disabled={busy || !propertyId} onClick={createReservation}>{busy ? 'Creating…' : 'Create reservation'}</Web3Button>
            </div>
          ) : !properties.loading && !properties.error ? (
            <EmptyState title="No available properties" description="No active inventory is currently available for customer reservation." />
          ) : null}
          {message && <p role="status" className="mt-4">{message}</p>}
          {error && <p role="alert" className="mt-4">{error}</p>}
        </Card>

        <Card title="My Reservations">
          <ResourceStatus {...reservations} />
          {reservations.data && (reservations.data.length ? (
            <div className="space-y-3">
              {reservations.data.map((reservation) => (
                <div key={reservation.id} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--rhc-heading)]">{reservation.reservation_number}</p>
                      <p className="mt-1 text-sm text-[var(--rhc-muted)]">{reservation.property.property_code} · {reservation.property.project?.project_name || 'Project'}</p>
                    </div>
                    <Badge tone={reservation.status === 'CONFIRMED' ? 'gold' : 'info'}>{reservation.status}</Badge>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-[var(--rhc-muted)]">Expires</dt><dd className="font-semibold text-[var(--rhc-heading)]">{new Date(reservation.expires_at).toLocaleString()}</dd></div>
                    <div><dt className="text-[var(--rhc-muted)]">Created</dt><dd className="font-semibold text-[var(--rhc-heading)]">{new Date(reservation.created_at).toLocaleString()}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No reservations" description="Your reservation requests will appear here." />)}
        </Card>
      </section>
    </AppShell>
  );
}
