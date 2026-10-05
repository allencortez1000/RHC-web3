'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  MetricCard,
  ResourceStatus,
  Web3Button,
  getRequestAvailability,
  usePagedResource,
  useRuntime,
} from '@rhc/ui';
import { AdminShell } from '../admin-data';

type ReportRow = { id: string; [key: string]: unknown };
type ReportColumn = {
  key: string;
  label: string;
  format?: (value: unknown, row: ReportRow) => string;
};
type ReportDefinition = {
  key: string;
  label: string;
  description: string;
  path: string;
  permission: string;
  statusKey?: string;
  dateKey?: string;
  columns: ReportColumn[];
};

const manilaDateTime = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
});

function valueAt(row: ReportRow, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, row);
}

function text(value: unknown) {
  if (value == null || value === '') return 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function dateValue(value: unknown) {
  if (typeof value !== 'string') return text(value);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? manilaDateTime.format(parsed) : value;
}

function pointsValue(value: unknown) {
  if (value == null || value === '') return text(value);
  const points = Number(value);
  return Number.isFinite(points) ? `${points.toLocaleString('en-PH')} points` : text(value);
}

function phpMinorValue(value: unknown) {
  if (value == null || value === '') return text(value);
  const minor = Number(value);
  return Number.isFinite(minor)
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(minor / 100)
    : text(value);
}

const reports: ReportDefinition[] = [
  {
    key: 'reservations',
    label: 'Reservations',
    description: 'Active and historical reservation states, scoped to the projects and companies visible to the current actor.',
    path: '/admin/reservations',
    permission: 'reservation.view',
    statusKey: 'status',
    dateKey: 'created_at',
    columns: [
      { key: 'reservation_number', label: 'Reservation' },
      { key: 'customer.email', label: 'Customer' },
      { key: 'property.property_code', label: 'Property' },
      { key: 'status', label: 'Status' },
      { key: 'expires_at', label: 'Expires', format: dateValue },
      { key: 'created_at', label: 'Created', format: dateValue },
    ],
  },
  {
    key: 'payments',
    label: 'Payment evidence',
    description: 'Submitted and reviewed synthetic payment evidence. This report does not represent collected or custodial funds.',
    path: '/admin/payments',
    permission: 'customer.view',
    statusKey: 'status',
    dateKey: 'submitted_at',
    columns: [
      { key: 'reference', label: 'Reference' },
      { key: 'customer_id', label: 'Customer ID' },
      { key: 'property_id', label: 'Property ID' },
      { key: 'amount_minor', label: 'Amount', format: phpMinorValue },
      { key: 'status', label: 'Status' },
      { key: 'submitted_at', label: 'Submitted', format: dateValue },
    ],
  },
  {
    key: 'documents',
    label: 'Document reviews',
    description: 'Versioned synthetic document records and review outcomes. File contents and identity evidence are excluded.',
    path: '/admin/documents',
    permission: 'customer.view',
    statusKey: 'status',
    dateKey: 'issued_at',
    columns: [
      { key: 'title', label: 'Document' },
      { key: 'category', label: 'Category' },
      { key: 'customer_id', label: 'Customer ID' },
      { key: 'version', label: 'Version' },
      { key: 'status', label: 'Status' },
      { key: 'issued_at', label: 'Issued', format: dateValue },
    ],
  },
  {
    key: 'rewards',
    label: 'RHC Points ledger',
    description: 'Append-only synthetic points entries. Points remain distinct from PHP, cash, tokens, and corporate reserves.',
    path: '/admin/rewards-ledger',
    permission: 'customer.view',
    statusKey: 'status',
    dateKey: 'date',
    columns: [
      { key: 'reference', label: 'Reference' },
      { key: 'customer_id', label: 'Customer ID' },
      { key: 'source', label: 'Source event' },
      { key: 'points', label: 'Points', format: pointsValue },
      { key: 'rule_version', label: 'Rule version' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Recorded', format: dateValue },
    ],
  },
  {
    key: 'services',
    label: 'Resident service requests',
    description: 'Company-scoped synthetic service requests and operational progression history.',
    path: '/admin/service-requests',
    permission: 'integration.view',
    statusKey: 'status',
    dateKey: 'updated_at',
    columns: [
      { key: 'reference', label: 'Reference' },
      { key: 'title', label: 'Request' },
      { key: 'company_id', label: 'Company ID' },
      { key: 'customer_id', label: 'Customer ID' },
      { key: 'status', label: 'Status' },
      { key: 'updated_at', label: 'Updated', format: dateValue },
    ],
  },
  {
    key: 'audit',
    label: 'Audit activity',
    description: 'Read-only, sanitized activity records for the current actor’s permitted scope.',
    path: '/admin/audit-logs',
    permission: 'audit.view',
    dateKey: 'created_at',
    columns: [
      { key: 'action', label: 'Action' },
      { key: 'entity_type', label: 'Record type' },
      { key: 'entity_id', label: 'Record ID' },
      { key: 'actor_user_id', label: 'Actor' },
      { key: 'correlation_id', label: 'Correlation' },
      { key: 'created_at', label: 'Timestamp', format: dateValue },
    ],
  },
];

function availableReports(permissions: string[] | undefined, dataMode: 'api' | 'demo') {
  return reports.filter((report) =>
    permissions?.includes(report.permission) && getRequestAvailability(dataMode, report.path).available,
  );
}

function displayValue(column: ReportColumn, row: ReportRow) {
  const value = valueAt(row, column.key);
  return column.format ? column.format(value, row) : text(value);
}

function csvCell(value: string) {
  const protectedValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

function ReportDataset({ definition }: { definition: ReportDefinition }) {
  const resource = usePagedResource<ReportRow>(definition.path, true);
  const { dataMode } = useRuntime();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');

  const statuses = useMemo(
    () =>
      definition.statusKey
        ? Array.from(
            new Set(
              (resource.data || [])
                .map((row) => text(valueAt(row, definition.statusKey as string)))
                .filter((value) => value !== 'Not provided'),
            ),
          ).sort()
        : [],
    [definition.statusKey, resource.data],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const fromTime = from ? Date.parse(`${from}T00:00:00+08:00`) : undefined;
    const toTime = to ? Date.parse(`${to}T23:59:59.999+08:00`) : undefined;
    return (resource.data || []).filter((row) => {
      const matchesQuery =
        !needle ||
        definition.columns.some((column) => displayValue(column, row).toLowerCase().includes(needle));
      const matchesStatus =
        !status || !definition.statusKey || text(valueAt(row, definition.statusKey)) === status;
      const recordTime = definition.dateKey
        ? Date.parse(text(valueAt(row, definition.dateKey)))
        : Number.NaN;
      const matchesFrom = fromTime === undefined || (Number.isFinite(recordTime) && recordTime >= fromTime);
      const matchesTo = toTime === undefined || (Number.isFinite(recordTime) && recordTime <= toTime);
      return matchesQuery && matchesStatus && matchesFrom && matchesTo;
    });
  }, [definition, from, query, resource.data, status, to]);

  function exportCsv() {
    if (!filtered.length) return;
    const provenance = dataMode === 'demo' ? 'DEMO — SYNTHETIC DATA' : 'API';
    const rows = [
      ['RHC operational report'],
      ['Data provenance', provenance],
      ['Report', definition.label],
      ['Export scope', `${filtered.length} filtered records from ${resource.data?.length || 0} loaded records`],
      [],
      definition.columns.map((column) => column.label),
      ...filtered.map((row) => definition.columns.map((column) => displayValue(column, row))),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => csvCell(String(value))).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rhc-${dataMode === 'demo' ? 'demo-' : ''}${definition.key}-report.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${filtered.length} filtered records as a safely escaped CSV.`);
  }

  function printReport() {
    setMessage('Print view opened. Browser print controls determine the final destination.');
    window.print();
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Loaded records" value={String(resource.data?.length || 0)} detail={resource.hasMore ? 'More records available' : 'Current permitted result set'} icon="LD" />
        <MetricCard label="Filtered records" value={String(filtered.length)} detail="Included in export and print" icon="FL" />
        <MetricCard label="Provenance" value={dataMode === 'demo' ? 'DEMO' : 'API'} detail={dataMode === 'demo' ? 'Synthetic local records' : 'Connected service response'} icon="PV" />
      </section>

      <Card title="Report Filters" className="rhc-report-controls">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
          <label className="text-sm font-semibold xl:col-span-2">
            Search loaded records
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference, status, company, customer…" className="mt-2 w-full rounded-xl border p-3" />
          </label>
          <label className="text-sm font-semibold">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={!definition.statusKey} className="mt-2 w-full rounded-xl border p-3 disabled:opacity-60">
              <option value="">All statuses</option>
              {statuses.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">
            From date
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} disabled={!definition.dateKey} className="mt-2 w-full rounded-xl border p-3 disabled:opacity-60" />
          </label>
          <label className="text-sm font-semibold">
            To date
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} disabled={!definition.dateKey} className="mt-2 w-full rounded-xl border p-3 disabled:opacity-60" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Web3Button variant="secondary" onClick={() => { setQuery(''); setStatus(''); setFrom(''); setTo(''); }}>Reset filters</Web3Button>
          <Web3Button disabled={!filtered.length} onClick={exportCsv}>Export filtered CSV</Web3Button>
          <Web3Button disabled={!filtered.length} variant="secondary" onClick={printReport}>Print report</Web3Button>
          {resource.hasMore ? <Web3Button variant="secondary" disabled={resource.loading} onClick={resource.loadMore}>{resource.loading ? 'Loading…' : 'Load 100 more'}</Web3Button> : null}
        </div>
        {message ? <p role="status" className="mt-4 text-sm text-[var(--rhc-success)]">{message}</p> : null}
      </Card>

      <Card title={`${definition.label} Report`} className="rhc-report-sheet">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge tone={dataMode === 'demo' ? 'gold' : 'info'}>{dataMode === 'demo' ? 'Demo export · synthetic data' : 'Connected API data'}</Badge>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--rhc-muted)]">{definition.description}</p>
          </div>
          <p className="text-sm font-semibold text-[var(--rhc-secondary-text)]">{filtered.length} filtered / {resource.data?.length || 0} loaded</p>
        </div>
        <ResourceStatus {...resource} />
        {resource.data && (filtered.length ? (
          <div className="overflow-x-auto rounded-xl border border-[var(--rhc-border)]">
            <table className="min-w-full border-collapse text-left text-sm">
              <caption className="sr-only">{definition.label} report with {filtered.length} filtered records</caption>
              <thead className="bg-[var(--rhc-surface-secondary)]">
                <tr>
                  {definition.columns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap border-b border-[var(--rhc-border)] px-4 py-3 font-bold text-[var(--rhc-heading)]">{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--rhc-border)] last:border-0">
                    {definition.columns.map((column, index) => (
                      <td key={column.key} className="max-w-sm px-4 py-3 align-top text-[var(--rhc-secondary-text)]">
                        {index === 0 ? <span className="font-semibold text-[var(--rhc-heading)]">{displayValue(column, row)}</span> : displayValue(column, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No matching report records" description="Adjust the filters or reset them to review the loaded permission-scoped records." />
        ))}
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  const { user, dataMode } = useRuntime();
  const available = availableReports(user?.permissions, dataMode);
  const [selected, setSelected] = useState('reservations');
  const definition = available.find((report) => report.key === selected) || available[0];

  return (
    <AdminShell title="Operational Reports" activeHref="/reports">
      <section className="rhc-admin-hero mb-5 rounded-[2rem] border border-[rgba(212,175,55,.24)] p-6 shadow-2xl md:p-8">
        <Badge tone="gold">Permission-scoped reporting</Badge>
        <h2 className="rhc-page-title mt-5">Traceable records, usable exports.</h2>
        <p className="rhc-body-copy mt-4 max-w-4xl">Build a report from the same scoped operational records used by the command center. CSV exports escape spreadsheet formulas and carry explicit provenance; print output contains no hidden source records.</p>
      </section>

      {definition ? (
        <>
          <Card title="Report Workspace" className="rhc-report-controls mb-5">
            <label className="block max-w-xl text-sm font-semibold">
              Report type
              <select value={definition.key} onChange={(event) => setSelected(event.target.value)} className="mt-2 w-full rounded-xl border p-3">
                {available.map((report) => <option key={report.key} value={report.key}>{report.label}</option>)}
              </select>
            </label>
            <p className="mt-3 text-sm text-[var(--rhc-muted)]">Only report families supported by the current data mode and allowed by the current actor’s server-derived read capabilities are listed. API mode supports reservations and audit activity; other report families remain demo-only.</p>
          </Card>
          <ReportDataset key={definition.key} definition={definition} />
        </>
      ) : (
        <EmptyState title="No report access" description="No report family is both implemented in the current data mode and authorized for your role. No records were loaded." />
      )}
    </AdminShell>
  );
}
