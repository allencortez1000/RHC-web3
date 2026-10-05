'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AppShell,
  Badge,
  Card,
  EmptyState,
  MetricCard,
  ResourceStatus,
  UnavailableFeature,
  Web3Button,
  errorMessage,
  useResource,
  useRuntime,
} from '@rhc/ui';
import { navFor } from '../web3-nav';

type Payment = {
  id: string;
  reference: string;
  property_code: string;
  due_date: string;
  amount: number;
  currency: string;
  status: 'SUBMITTED' | 'PENDING' | 'POSTED' | 'REVERSED';
  description: string;
  document_id?: string;
};
type DocumentRecord = {
  id: string;
  title: string;
  category: string;
  status: string;
  version: string | number;
  issued_at: string;
  property_code?: string;
  issuer: string;
  hash: string;
  content?: string;
  review_message?: string;
};
type Certificate = {
  id: string;
  reference: string;
  public_reference?: string;
  type: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED';
  issued_at: string;
  linked_record: string;
  issuer: string;
  blockchain_status?: string;
};
type Milestone = { id: string; title: string; description: string; status: string; date: string; reviewer: string };
type Benefit = { id: string; title: string; cost: number; status: string; detail: string };
type Receipt = { id: string; reference: string; type: string; status: string; summary: string; created_at: string };
type ServiceRequest = { id: string; reference: string; title: string; status: string; updated_at: string };
type PropertyLink = { id: string; property: { id: string; property_code: string } };

type DemoRecords = {
  payments: Payment[];
  documents: DocumentRecord[];
  certificates: Certificate[];
  milestones: Milestone[];
  benefits: Benefit[];
  rewards: {
    balance: number;
    earned: number;
    redeemed: number;
    entries: Array<{ id: string; date: string; source: string; points: number; reason: string; reference: string; status?: string }>;
  };
  turnover: { case_number: string; status: string; checklist: Array<{ label: string; complete: boolean }>; note: string };
  receipts?: Receipt[];
  service_requests?: ServiceRequest[];
};

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });

export function DemoRecordsPage({
  kind,
}: {
  kind: 'account' | 'payments' | 'documents' | 'certificates' | 'updates' | 'ecosystem' | 'verify' | 'help' | 'future' | 'my-properties';
}) {
  const records = useResource<DemoRecords>('/me/demo-records');
  const [query, setQuery] = useState('');
  const data = records.data;
  const titleMap = {
    account: 'My RHC Account',
    payments: 'Payment Records',
    documents: 'Documents',
    certificates: 'Certificates',
    updates: 'Project Updates',
    ecosystem: 'RHC Ecosystem',
    verify: 'RHC Verify',
    help: 'Help',
    future: 'Future Technology',
    'my-properties': 'My Properties',
  } as const;
  const title = titleMap[kind];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredDocs = useMemo(
    () =>
      data?.documents.filter((item) =>
        [item.title, item.category, item.status, item.property_code].join(' ').toLowerCase().includes(normalizedQuery),
      ) || [],
    [data, normalizedQuery],
  );
  const filteredPayments = useMemo(
    () =>
      data?.payments.filter((item) =>
        [item.reference, item.property_code, item.status, item.description].join(' ').toLowerCase().includes(normalizedQuery),
      ) || [],
    [data, normalizedQuery],
  );

  return (
    <AppShell title={title} navItems={navFor(title)}>
      {records.unavailable ? <UnavailableFeature unavailable={records.unavailable} title={title} /> : <ResourceStatus {...records} />}
      {!data ? null : (
        <div className="grid gap-5">
          {kind === 'account' && <AccountView data={data} />}
          {kind === 'payments' && (
            <PaymentsView data={data} items={filteredPayments} query={query} setQuery={setQuery} reload={records.reload} />
          )}
          {kind === 'documents' && (
            <DocumentsView data={data} items={filteredDocs} query={query} setQuery={setQuery} reload={records.reload} />
          )}
          {kind === 'certificates' && <CertificatesView data={data} />}
          {kind === 'updates' && <UpdatesView data={data} />}
          {kind === 'ecosystem' && <EcosystemView data={data} />}
          {kind === 'verify' && <VerifyView />}
          {kind === 'help' && <HelpView />}
          {kind === 'future' && <FutureView />}
          {kind === 'my-properties' && <MyPropertiesView data={data} />}
        </div>
      )}
    </AppShell>
  );
}

function AccountView({ data }: { data: DemoRecords }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="RHC Digital ID" value="Company issued" detail="See current credential status" icon="ID" />
        <MetricCard label="Linked records" value={String(data.documents.length + data.certificates.length)} detail="Documents and credentials" icon="REC" />
        <MetricCard label="RHC Points" value={data.rewards.balance.toLocaleString()} detail="Posted synthetic points" icon="★" />
      </section>
      <Card title="One RHC Account">
        <p className="text-sm leading-6 text-[var(--rhc-muted)]">
          This workspace brings identity, property records, payment status, documents, points, and credentials together. It does not hold cryptocurrency, private keys, token balances, or custodial funds.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Web3Button href="/digital-id">View Digital ID</Web3Button>
          <Web3Button href="/documents" variant="secondary">View documents</Web3Button>
          <Web3Button href="/payment-records" variant="secondary">View payment records</Web3Button>
        </div>
      </Card>
      <ReceiptList receipts={data.receipts || []} />
    </>
  );
}

function PaymentsView({
  data,
  items,
  query,
  setQuery,
  reload,
}: {
  data: DemoRecords;
  items: Payment[];
  query: string;
  setQuery: (value: string) => void;
  reload: () => void;
}) {
  const { request } = useRuntime();
  const properties = useResource<PropertyLink[]>('/me/properties');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const posted = items.filter((item) => item.status === 'POSTED').reduce((sum, item) => sum + item.amount, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const amount = Number(form.get('amount'));
    const propertyId = String(form.get('property_id') || '');
    if (!propertyId || !Number.isFinite(amount) || amount <= 0) {
      setError('Choose a linked property and enter a positive illustrative PHP amount.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request<{ payment: Payment; receipt: Receipt }>('/me/payments', {
        method: 'POST',
        body: JSON.stringify({
          property_id: propertyId,
          amount_minor: Math.round(amount * 100),
          due_date: String(form.get('due_date') || ''),
          description: String(form.get('description') || 'Synthetic payment evidence'),
          idempotency_key: `payment-${crypto.randomUUID()}`,
        }),
      });
      setMessage(`${result.payment.reference} was recorded as unverified evidence. ${result.receipt.reference} is available in activity history.`);
      element.reset();
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Posted" value={peso.format(posted)} detail="Verified synthetic records" />
        <MetricCard label="Awaiting review" value={String(items.filter((item) => ['SUBMITTED', 'PENDING'].includes(item.status)).length)} detail="No money was accepted" />
        <MetricCard label="Reversal entries" value={String(items.filter((item) => item.status === 'REVERSED').length)} detail="Original entries are preserved" />
      </section>
      <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <Card title="Submit Demo Payment Evidence">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">
            This creates an unverified business record only. It does not charge a card, transfer funds, confirm a payment, or generate a refund.
          </p>
          <ResourceStatus {...properties} />
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="text-sm font-semibold">
              Linked property
              <select name="property_id" required className="mt-2 w-full rounded-xl border p-3">
                <option value="">Choose a record</option>
                {properties.data?.map((link) => <option key={link.id} value={link.property.id}>{link.property.property_code}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Illustrative amount (PHP)
              <input name="amount" type="number" min="1" step="0.01" required className="mt-2 w-full rounded-xl border p-3" />
            </label>
            <label className="text-sm font-semibold">
              Record date
              <input name="due_date" type="date" required className="mt-2 w-full rounded-xl border p-3" />
            </label>
            <label className="text-sm font-semibold">
              Evidence note
              <textarea name="description" maxLength={240} required className="mt-2 min-h-24 w-full rounded-xl border p-3" defaultValue="Synthetic proof submitted for separate finance review" />
            </label>
            <Web3Button type="submit" disabled={busy || !properties.data?.length}>{busy ? 'Recording…' : 'Record unverified evidence'}</Web3Button>
          </form>
          {message ? <p role="status" className="mt-4 text-sm text-[var(--rhc-success)]">{message}</p> : null}
          {error ? <p role="alert" className="mt-4 text-sm text-[var(--rhc-danger)]">{error}</p> : null}
        </Card>
        <Card title="Payment Record History">
          <p className="text-sm text-[var(--rhc-muted)]">PHP amounts and RHC Points remain separate units. Filtered totals never represent a wallet or custodial balance.</p>
          <Search value={query} setValue={setQuery} placeholder="Search reference, unit, or status" />
          {items.length ? (
            <RecordTable
              rows={items.map((item) => [item.reference, item.property_code, item.description, peso.format(item.amount), item.status])}
              headers={['Reference', 'Unit', 'Description', 'Amount', 'Status']}
              caption="Synthetic payment records"
            />
          ) : (
            <EmptyState title="No payment records" description="Clear the filter or submit synthetic evidence." />
          )}
        </Card>
      </section>
      <ReceiptList receipts={(data.receipts || []).filter((receipt) => receipt.type.includes('PAYMENT'))} />
    </>
  );
}

function DocumentsView({
  data,
  items,
  query,
  setQuery,
  reload,
}: {
  data: DemoRecords;
  items: DocumentRecord[];
  query: string;
  setQuery: (value: string) => void;
  reload: () => void;
}) {
  const { request } = useRuntime();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError('Choose a synthetic text file. Do not upload real personal information.');
      return;
    }
    if (file.size > 100_000 || !['text/plain', 'text/markdown', 'application/json', ''].includes(file.type)) {
      setError('Use a TXT, Markdown, or JSON demo file no larger than 100 KB.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request<{ document: DocumentRecord; receipt: Receipt }>('/me/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: String(form.get('title') || file.name),
          category: String(form.get('category') || 'Customer submission'),
          content: await file.text(),
          idempotency_key: `document-${crypto.randomUUID()}`,
        }),
      });
      setMessage(`${result.document.title} was submitted. ${result.receipt.reference} can be reopened from activity history.`);
      element.reset();
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitVersion(event: FormEvent<HTMLFormElement>, previous: DocumentRecord) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const input = form.elements.namedItem('version_file');
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file) {
      setError('Choose a synthetic text file for the new version.');
      return;
    }
    if (file.size > 100_000 || !['text/plain', 'text/markdown', 'application/json', ''].includes(file.type)) {
      setError('Use a TXT, Markdown, or JSON demo file no larger than 100 KB.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request<{ document: DocumentRecord; receipt: Receipt }>(
        `/me/documents/${encodeURIComponent(previous.id)}/versions`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: await file.text(),
            idempotency_key: `document-version-${crypto.randomUUID()}`,
          }),
        },
      );
      setMessage(`Version ${result.document.version} of ${result.document.title} was submitted without replacing version ${previous.version}. Receipt ${result.receipt.reference} is in activity history.`);
      form.reset();
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <Card title="Submit Local Demo Attachment">
          <div className="rounded-xl border border-[var(--rhc-warning)] bg-[var(--rhc-surface-secondary)] p-4 text-sm leading-6">
            Use synthetic text only. Do not upload real IDs, contracts, financial records, signatures, account numbers, or personal information into demo mode.
          </div>
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="text-sm font-semibold">Document title<input name="title" required maxLength={160} className="mt-2 w-full rounded-xl border p-3" /></label>
            <label className="text-sm font-semibold">Category<select name="category" className="mt-2 w-full rounded-xl border p-3"><option>Customer submission</option><option>Identity</option><option>Payment</option><option>Contract</option></select></label>
            <label className="text-sm font-semibold">Synthetic text file<input ref={fileInput} name="file" type="file" required accept=".txt,.md,.json,text/plain,text/markdown,application/json" className="mt-2 block w-full rounded-xl border p-3" /></label>
            <Web3Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</Web3Button>
          </form>
          {message ? <p role="status" className="mt-4 text-sm text-[var(--rhc-success)]">{message}</p> : null}
          {error ? <p role="alert" className="mt-4 text-sm text-[var(--rhc-danger)]">{error}</p> : null}
        </Card>
        <Card title="Document Center">
          <p className="text-sm text-[var(--rhc-muted)]">Every preview and download is marked DEMO / NOT AN OFFICIAL RECORD. Approved versions are retained rather than overwritten.</p>
          <Search value={query} setValue={setQuery} placeholder="Search title, category, property, or status" />
          {items.length ? (
            <div className="grid gap-3">
              {items.map((item) => {
                const href = `data:text/plain;charset=utf-8,${encodeURIComponent(item.content || `DEMO / NOT AN OFFICIAL RECORD\n${item.title}\n${item.hash}`)}`;
                return (
                  <article key={item.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[var(--rhc-heading)]">{item.title}</p>
                        <p className="mt-1 text-sm text-[var(--rhc-muted)]">{item.category} · {item.property_code || 'Account'} · v{item.version}</p>
                        <p className="mt-1 break-all font-mono text-xs text-[var(--rhc-muted)]">SHA-256 {item.hash}</p>
                      </div>
                      <Badge tone={item.status.toLowerCase().includes('reject') ? 'danger' : item.status.toLowerCase().includes('review') || item.status.toLowerCase().includes('submit') ? 'warning' : 'gold'}>{item.status}</Badge>
                    </div>
                    {item.review_message ? <p className="mt-3 text-sm text-[var(--rhc-muted)]">Review note: {item.review_message}</p> : null}
                    <details className="mt-4 rounded-xl border border-[var(--rhc-border)] p-3">
                      <summary className="cursor-pointer font-bold text-[var(--rhc-heading)]">Preview synthetic text</summary>
                      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[var(--rhc-secondary-text)]">{item.content || 'DEMO / NOT AN OFFICIAL RECORD\nPreview content is unavailable for this legacy fixture.'}</pre>
                    </details>
                    <details className="mt-3 rounded-xl border border-[var(--rhc-border)] p-3">
                      <summary className="cursor-pointer font-bold text-[var(--rhc-heading)]">Submit a new version</summary>
                      <form onSubmit={(event) => void submitVersion(event, item)} className="mt-3 grid gap-3">
                        <p className="text-xs leading-5 text-[var(--rhc-muted)]">The prior version remains in history. The new synthetic version enters review separately.</p>
                        <label className="text-sm font-semibold">
                          Synthetic replacement text
                          <input name="version_file" type="file" required accept=".txt,.md,.json,text/plain,text/markdown,application/json" className="mt-2 block w-full rounded-xl border p-3" />
                        </label>
                        <Web3Button type="submit" disabled={busy}>{busy ? 'Submitting…' : `Submit version ${Number(item.version) + 1}`}</Web3Button>
                      </form>
                    </details>
                    <div className="mt-4">
                      <a href={href} download={`${item.title.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}-demo.txt`} className="rhc-web3-btn-secondary inline-flex min-h-11 items-center rounded-lg px-4 py-2.5 text-sm font-bold">Download marked sample</a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No documents found" description="Clear the search or submit a synthetic attachment." />
          )}
        </Card>
      </section>
      <ReceiptList receipts={(data.receipts || []).filter((receipt) => receipt.type.includes('DOCUMENT'))} />
    </>
  );
}

function CertificatesView({ data }: { data: DemoRecords }) {
  return (
    <Card title="Verification Credentials">
      <p className="text-sm leading-6 text-[var(--rhc-muted)]">RHC-issued company credentials are not government identification or property title. Internal review and optional blockchain status are separate facts.</p>
      <div className="mt-4 grid gap-3">
        {data.certificates.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-bold text-[var(--rhc-heading)]">{item.type}</p>
                <p className="mt-1 text-sm text-[var(--rhc-muted)]">{item.reference} · {item.linked_record} · {item.issuer}</p>
                <p className="mt-1 text-xs text-[var(--rhc-muted)]">Blockchain status: {item.blockchain_status?.replaceAll('_', ' ') || 'Not requested'}</p>
              </div>
              <Badge tone={item.status === 'ACTIVE' ? 'success' : item.status === 'REVOKED' ? 'danger' : 'warning'}>{item.status}</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              {item.public_reference ? <Web3Button href={`/verify/rhc-id/${encodeURIComponent(item.public_reference)}`} variant="secondary">Open verification passport</Web3Button> : <Web3Button href="/rhc-verify" variant="secondary">Verification entry</Web3Button>}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function UpdatesView({ data }: { data: DemoRecords }) {
  return (
    <Card title="Project Milestones">
      <div className="grid gap-3">
        {data.milestones.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
            <Badge tone={item.status === 'REVIEWED' ? 'success' : item.status.includes('ACTION') ? 'warning' : 'info'}>{item.status.replaceAll('_', ' ')}</Badge>
            <p className="mt-3 font-bold text-[var(--rhc-heading)]">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">{item.description}</p>
            <p className="mt-2 text-xs text-[var(--rhc-muted)]">{dateTime.format(new Date(item.date))} · Reviewed by {item.reviewer}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

const journey = [
  ['Reservation', 'Request and unit hold'],
  ['Contract', 'Agreement record'],
  ['Payments', 'Separate verification'],
  ['Construction', 'Reported and reviewed milestones'],
  ['Certificate', 'Versioned company credential'],
  ['Turnover', 'Final checklist and actions'],
] as const;

function MyPropertiesView({ data }: { data: DemoRecords }) {
  return (
    <>
      <Card title="Property Journey Workspace">
        <p className="text-sm leading-6 text-[var(--rhc-muted)]">The golden thread connects distinct business records without treating any one status as legal ownership.</p>
        <ol className="relative mt-6 grid gap-3 before:absolute before:bottom-6 before:left-[1.1rem] before:top-6 before:w-px before:bg-[var(--rhc-primary)]">
          {journey.map(([stage, description], index) => {
            const active = index < 5;
            return (
              <li key={stage} className="relative grid grid-cols-[2.25rem_1fr_auto] items-start gap-3 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                <span className="z-10 grid h-9 w-9 place-items-center rounded-full border border-[var(--rhc-primary)] bg-[var(--rhc-surface)] text-xs font-black text-[var(--rhc-primary)]">{index + 1}</span>
                <div><p className="font-bold text-[var(--rhc-heading)]">{stage}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{description}</p></div>
                <Badge tone={active ? 'success' : 'warning'}>{active ? 'Recorded' : 'Next'}</Badge>
              </li>
            );
          })}
        </ol>
      </Card>
      <Card title="Turnover Demo Case">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-[var(--rhc-heading)]">{data.turnover.case_number}</p><Badge tone="warning">{data.turnover.status.replaceAll('_', ' ')}</Badge></div>
        <div className="mt-4 grid gap-2">{data.turnover.checklist.map((item) => <p key={item.label} className="text-sm text-[var(--rhc-muted)]"><span aria-hidden="true">{item.complete ? '✓' : '○'}</span> {item.label}</p>)}</div>
        <p className="mt-4 text-sm text-[var(--rhc-muted)]">{data.turnover.note}</p>
      </Card>
    </>
  );
}

function EcosystemView({ data }: { data: DemoRecords }) {
  return (
    <>
      <Card title="Connected Demo Benefits">
        <div className="grid gap-3 md:grid-cols-3">{data.benefits.map((item) => <div key={item.id} className="rounded-2xl border border-[var(--rhc-border)] p-4"><Badge tone="gold">DEMO ONLY</Badge><p className="mt-3 font-bold">{item.title}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{item.detail}</p><p className="mt-3 font-mono text-sm">{item.cost.toLocaleString()} RHC Points</p></div>)}</div>
      </Card>
    </>
  );
}

function VerifyView() {
  return <Card title="RHC Verify"><p className="text-sm leading-6 text-[var(--rhc-muted)]">Internal record validity and optional blockchain confirmation are shown separately. Blockchain anchoring is not activated in this demo.</p><div className="mt-5 flex flex-wrap gap-3"><Web3Button href="/verify/rhc-id/demo-passport-maya-7d2f0f9a">Verify demo credential</Web3Button><Web3Button href="/digital-id" variant="secondary">View my Digital ID</Web3Button></div></Card>;
}

function HelpView() {
  return <Card title="Help"><p className="text-sm text-[var(--rhc-muted)]">Use the dedicated Help Center for searchable guidance and support-routing boundaries.</p><div className="mt-4"><Web3Button href="/help">Open Help Center</Web3Button></div></Card>;
}

function FutureView() {
  return <Card title="Future Technology"><p className="text-sm leading-6 text-[var(--rhc-muted)]">Wallet, token, public blockchain, crypto payments, exchange, custody, staking, and tokenized ownership remain inactive and require separate approval.</p><div className="mt-4"><Web3Button href="/future-technology" variant="secondary">View approval roadmap</Web3Button></div></Card>;
}

function ReceiptList({ receipts }: { receipts: Receipt[] }) {
  if (!receipts.length) return null;
  return (
    <Card title="Living Receipts">
      <p className="mb-4 text-sm text-[var(--rhc-muted)]">Persistent synthetic receipts cross-link submitted actions with activity history.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {receipts.slice(0, 6).map((receipt) => (
          <article key={receipt.id} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
            <div className="flex items-start justify-between gap-3"><p className="font-mono text-sm font-bold text-[var(--rhc-heading)]">{receipt.reference}</p><Badge tone="info">DEMO</Badge></div>
            <p className="mt-2 text-sm text-[var(--rhc-muted)]">{receipt.summary}</p>
            <p className="mt-2 text-xs text-[var(--rhc-muted)]">{dateTime.format(new Date(receipt.created_at))} · {receipt.status}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

function Search({ value, setValue, placeholder }: { value: string; setValue: (value: string) => void; placeholder: string }) {
  return <label className="my-4 block text-sm font-bold text-[var(--rhc-heading)]">Search records<input aria-label={`Search records: ${placeholder}`} value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-3 text-sm text-[var(--rhc-text)]" /></label>;
}

function RecordTable({ headers, rows, caption = 'Records' }: { headers: string[]; rows: string[][]; caption?: string }) {
  return <div role="region" aria-label={`${caption} table scroll area`} tabIndex={0} className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rhc-primary)]"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">{caption}</caption><thead><tr>{headers.map((header) => <th key={header} scope="col" className="border-b border-[var(--rhc-border)] p-3 text-[var(--rhc-muted)]">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className="border-b border-[var(--rhc-border)] p-3">{cell}</td>)}</tr>)}</tbody></table></div>;
}
