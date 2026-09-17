'use client';

import { useMemo, useState } from 'react';
import { AppShell, Badge, Card, EmptyState, MetricCard, ResourceStatus, Web3Button, useResource } from '@rhc/ui';
import { navFor } from '../web3-nav';

type Payment = { id: string; reference: string; property_code: string; due_date: string; amount: number; currency: string; status: 'PENDING' | 'POSTED' | 'REVERSED'; description: string; document_id?: string };
type DocumentRecord = { id: string; title: string; category: string; status: string; version: string; issued_at: string; property_code?: string; issuer: string; hash: string };
type Certificate = { id: string; reference: string; type: string; status: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED'; issued_at: string; linked_record: string; issuer: string };
type Milestone = { id: string; title: string; description: string; status: string; date: string; reviewer: string };
type Benefit = { id: string; title: string; cost: number; status: string; detail: string };

type DemoRecords = {
  payments: Payment[];
  documents: DocumentRecord[];
  certificates: Certificate[];
  milestones: Milestone[];
  benefits: Benefit[];
  rewards: { balance: number; earned: number; redeemed: number; entries: Array<{ id: string; date: string; source: string; points: number; reason: string; reference: string }> };
  turnover: { case_number: string; status: string; checklist: Array<{ label: string; complete: boolean }>; note: string };
};

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export function DemoRecordsPage({ kind }: { kind: 'account' | 'payments' | 'documents' | 'certificates' | 'updates' | 'ecosystem' | 'verify' | 'help' | 'future' | 'my-properties' }) {
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
  const q = query.trim().toLowerCase();
  const filteredDocs = useMemo(() => data?.documents.filter((item) => [item.title, item.category, item.status, item.property_code].join(' ').toLowerCase().includes(q)) || [], [data, q]);
  const filteredPayments = useMemo(() => data?.payments.filter((item) => [item.reference, item.property_code, item.status, item.description].join(' ').toLowerCase().includes(q)) || [], [data, q]);

  return (
    <AppShell title={title} navItems={navFor(title)}>
      <ResourceStatus {...records} />
      {!data ? null : (
        <div className="grid gap-5">
          {kind === 'account' && <AccountView data={data} />}
          {kind === 'payments' && <PaymentsView data={data} items={filteredPayments} query={query} setQuery={setQuery} />}
          {kind === 'documents' && <DocumentsView items={filteredDocs} query={query} setQuery={setQuery} />}
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
  return <>
    <section className="grid gap-4 md:grid-cols-3">
      <MetricCard label="RHC Digital ID" value="RHC-DEMO-0001" detail="Verified demo customer reference" icon="ID" />
      <MetricCard label="Linked property" value="1" detail="Contracted demo unit" icon="⌂" />
      <MetricCard label="RHC Points" value={data.rewards.balance.toLocaleString()} detail="Demo points, not crypto or cash" icon="★" />
    </section>
    <Card title="One RHC Account">
      <p className="text-sm leading-6 text-[var(--rhc-muted)]">This demo account consolidates identity, property records, payment status, documents, points, and credentials. It does not hold cryptocurrency, private keys, token balances, or custody rights.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Web3Button href="/digital-id">View Digital ID</Web3Button><Web3Button href="/documents" variant="secondary">View documents</Web3Button><Web3Button href="/payment-records" variant="secondary">View payment records</Web3Button></div>
    </Card>
  </>;
}

function PaymentsView({ items, query, setQuery }: { data: DemoRecords; items: Payment[]; query: string; setQuery: (value: string) => void }) {
  const posted = items.filter((item) => item.status === 'POSTED').reduce((sum, item) => sum + item.amount, 0);
  return <>
    <section className="grid gap-4 md:grid-cols-3"><MetricCard label="Posted" value={peso.format(posted)} detail="Recorded demo payments" /><MetricCard label="Pending review" value={String(items.filter((i) => i.status === 'PENDING').length)} detail="No money will be charged" /><MetricCard label="Reversed" value={String(items.filter((i) => i.status === 'REVERSED').length)} detail="Original entries preserved" /></section>
    <Card title="Recorded Payment History"><p className="text-sm text-[var(--rhc-muted)]">Demo payment record only. No money will be charged or transferred.</p><Search value={query} setValue={setQuery} placeholder="Search reference, unit, or status" />{items.length ? <RecordTable rows={items.map((item) => [item.reference, item.property_code, item.description, peso.format(item.amount), item.status])} headers={['Reference', 'Unit', 'Description', 'Amount', 'Status']} /> : <EmptyState title="No payment records" description="Payment records appear here after they are recorded by authorized demo finance users." />}</Card>
  </>;
}

function DocumentsView({ items, query, setQuery }: { items: DocumentRecord[]; query: string; setQuery: (value: string) => void }) {
  return <Card title="Document Center"><p className="text-sm text-[var(--rhc-muted)]">Sample documents are marked DEMO / NOT AN OFFICIAL RECORD. Downloads are local demo records only.</p><Search value={query} setValue={setQuery} placeholder="Search title, category, property, or status" />{items.length ? <div className="grid gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[var(--rhc-heading)]">{item.title}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{item.category} · {item.property_code || 'Account'} · v{item.version}</p><p className="mt-1 font-mono text-xs text-[var(--rhc-muted)]">SHA-256 {item.hash}</p></div><Badge tone="gold">{item.status}</Badge></div><div className="mt-4 flex flex-wrap gap-2"><Web3Button variant="secondary" href={`/documents/${item.id}`}>View record</Web3Button><Web3Button variant="secondary" disabled>Download sample — API storage required</Web3Button></div></div>)}</div> : <EmptyState title="No documents found" description="Try clearing the search or wait for a demo document to be issued." />}</Card>;
}

function CertificatesView({ data }: { data: DemoRecords }) {
  return <Card title="Certificates"><p className="text-sm text-[var(--rhc-muted)]">RHC-issued verification credential. Not a government-issued property title.</p><div className="mt-4 grid gap-3">{data.certificates.map((item) => <div key={item.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold text-[var(--rhc-heading)]">{item.type}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{item.reference} · {item.linked_record} · {item.issuer}</p></div><Badge tone={item.status === 'ACTIVE' ? 'success' : item.status === 'REVOKED' ? 'danger' : 'warning'}>{item.status}</Badge></div><div className="mt-4 flex gap-2"><Web3Button href="/rhc-verify" variant="secondary">Verify</Web3Button><Web3Button disabled variant="secondary">Download sample — API storage required</Web3Button></div></div>)}</div></Card>;
}

function UpdatesView({ data }: { data: DemoRecords }) { return <Card title="Project Milestones"><div className="grid gap-3">{data.milestones.map((item) => <div key={item.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><Badge tone="info">{item.status}</Badge><p className="mt-3 font-bold text-[var(--rhc-heading)]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">{item.description}</p><p className="mt-2 text-xs text-[var(--rhc-muted)]">{item.date} · Reviewed by {item.reviewer}</p></div>)}</div></Card>; }
function MyPropertiesView({ data }: { data: DemoRecords }) { return <><Card title="Contracted Demo Unit"><p className="text-sm text-[var(--rhc-muted)]">Lifecycle stages are independent demo records: reservation, contract, payments, construction, certificate, and turnover.</p><div className="mt-4 grid gap-3 md:grid-cols-6">{['Reservation', 'Contract', 'Payments', 'Construction', 'Certificate', 'Turnover'].map((stage, index) => <div key={stage} className="rounded-xl border border-[var(--rhc-border)] p-3 text-sm"><Badge tone={index < 5 ? 'success' : 'warning'}>{index < 5 ? 'Active' : 'Pending'}</Badge><p className="mt-2 font-bold">{stage}</p></div>)}</div></Card><Card title="Turnover Demo Case"><p className="font-bold text-[var(--rhc-heading)]">{data.turnover.case_number} · {data.turnover.status}</p><div className="mt-4 grid gap-2">{data.turnover.checklist.map((item) => <p key={item.label} className="text-sm text-[var(--rhc-muted)]">{item.complete ? '✓' : '•'} {item.label}</p>)}</div><p className="mt-4 text-sm text-[var(--rhc-muted)]">{data.turnover.note}</p></Card></>; }
function EcosystemView({ data }: { data: DemoRecords }) { return <><Card title="Participating Businesses"><div className="grid gap-3 md:grid-cols-2">{['Rabino Holdings Corporation', 'Amica Condominium Realty Corporation', 'Rabino Home Builders Corporation', 'Amica Water Co. Ltd.', 'Amica Mart Trading Corporation', 'Rabino Security Services Corporation'].map((name) => <div key={name} className="rounded-2xl border border-[var(--rhc-border)] p-4"><p className="font-bold text-[var(--rhc-heading)]">{name}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">Integration state: Demo directory / local mock connector. No real external service connection is active.</p></div>)}</div></Card><Card title="Demo Benefits"><div className="grid gap-3 md:grid-cols-3">{data.benefits.map((item) => <div key={item.id} className="rounded-2xl border border-[var(--rhc-border)] p-4"><Badge tone="gold">DEMO ONLY</Badge><p className="mt-3 font-bold">{item.title}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{item.detail}</p><p className="mt-3 font-mono text-sm">{item.cost.toLocaleString()} points</p></div>)}</div></Card></>; }
function VerifyView() { return <Card title="RHC Verify"><p className="text-sm leading-6 text-[var(--rhc-muted)]">This result checks a record in the demonstration environment. Internal RHC record verification and blockchain verification are separate states. Blockchain verification is not activated in this demo.</p><div className="mt-5 flex flex-wrap gap-3"><Web3Button href="/verify/rhc-id/UkhDLTIwMjYtMDAwMDAwMDE">Verify demo RHC ID</Web3Button><Web3Button href="/digital-id" variant="secondary">View my Digital ID</Web3Button></div></Card>; }
function HelpView() { return <Card title="Help"><div className="grid gap-4 md:grid-cols-2">{[['Reservations', 'Available units can be reserved through a demo request. A hold does not imply legal ownership.'], ['Payment records', 'Recorded business entries only. There is no Pay Now action and no money is moved.'], ['Documents', 'Sample documents are demo records and require RHC review before production templates.'], ['Rewards', 'Demo RHC Points are not cryptocurrency, a cash balance, or a conversion promise.']].map(([title, body]) => <div key={title} className="rounded-2xl border border-[var(--rhc-border)] p-4"><p className="font-bold text-[var(--rhc-heading)]">{title}</p><p className="mt-1 text-sm text-[var(--rhc-muted)]">{body}</p></div>)}</div><div className="mt-5"><Web3Button disabled>Submit demo support request — server endpoint required</Web3Button></div></Card>; }
function FutureView() { return <Card title="Future Technology"><p className="text-sm leading-6 text-[var(--rhc-muted)]">RHC Wallet, RHC Token, smart contracts, public blockchain anchoring, crypto payments, exchange, custody, staking, and tokenized ownership remain disabled. Production digital-asset functions require their own approved specification and release process.</p><div className="mt-5 grid gap-3 md:grid-cols-3">{['Wallet not activated', 'Token not deployed', 'Blockchain not connected'].map((item) => <div key={item} className="rounded-2xl border border-[var(--rhc-border)] p-4"><Badge tone="warning">Inactive</Badge><p className="mt-3 font-bold">{item}</p></div>)}</div></Card>; }
function Search({ value, setValue, placeholder }: { value: string; setValue: (value: string) => void; placeholder: string }) { return <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="my-4 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-3 text-sm text-[var(--rhc-text)]" />; }
function RecordTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr>{headers.map((header) => <th key={header} className="border-b border-[var(--rhc-border)] p-3 text-[var(--rhc-muted)]">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i} className="border-b border-[var(--rhc-border)] p-3">{cell}</td>)}</tr>)}</tbody></table></div>; }
