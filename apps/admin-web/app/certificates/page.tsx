'use client';

import { useState, type FormEvent } from 'react';
import { Card, ResourceStatus, Web3Button, errorMessage, usePagedResource, useRuntime } from '@rhc/ui';
import { AdminShell, AdminTable } from '../admin-data';

type Customer = { id: string; email: string; profile?: { first_name?: string; last_name?: string; rhc_id?: string | null } };

export default function Page() {
  const customers = usePagedResource<Customer>('/admin/customers');
  const { request } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await request<{ reference: string }>('/admin/certificates', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: String(form.get('customer_id') || ''),
          type: String(form.get('type') || ''),
          linked_record: String(form.get('linked_record') || ''),
          source_version: Number(form.get('source_version') || 1),
        }),
      });
      setMessage(`${result.reference} was issued as a synthetic company credential. It is not government title.`);
      formElement.reset();
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Certificates" activeHref="/certificates">
      <Card title="Issue Sample Credential" className="mb-5">
        <p className="text-sm leading-6 text-[var(--rhc-muted)]">Issue a versioned synthetic credential from an approved source record. Public verification reveals only the approved minimal subset. Blockchain anchoring is not implied.</p>
        <ResourceStatus {...customers} />
        <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">Customer<select name="customer_id" required className="mt-2 w-full rounded-xl border p-3"><option value="">Choose customer</option>{customers.data?.map((customer) => <option key={customer.id} value={customer.id}>{[customer.profile?.first_name, customer.profile?.last_name].filter(Boolean).join(' ') || customer.email}</option>)}</select></label>
          <label className="text-sm font-semibold">Credential type<select name="type" className="mt-2 w-full rounded-xl border p-3"><option>Demo Property Record Certificate</option><option>RHC Customer Verification Certificate</option><option>Demo Turnover Readiness Certificate</option></select></label>
          <label className="text-sm font-semibold">Linked source record<input name="linked_record" required maxLength={120} placeholder="DEMO-SOURCE-001" className="mt-2 w-full rounded-xl border p-3 font-mono" /></label>
          <label className="text-sm font-semibold">Source version<input name="source_version" type="number" min="1" step="1" defaultValue="1" required className="mt-2 w-full rounded-xl border p-3" /></label>
          <div className="md:col-span-2"><Web3Button type="submit" disabled={busy || !customers.data?.length}>{busy ? 'Issuing…' : 'Issue demo certificate'}</Web3Button></div>
        </form>
        {message ? <p role="status" className="mt-4 text-sm text-[var(--rhc-success)]">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 text-sm text-[var(--rhc-danger)]">{error}</p> : null}
      </Card>
      <AdminTable key={revision} resource="certificates" />
    </AdminShell>
  );
}
