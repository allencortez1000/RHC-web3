'use client';

import Link from 'next/link';
import { approvalBlockReason, VerificationReview } from './verification-review';
import {
  ManagementEditor,
  createResources,
  managedSettingFields,
  metadataResources,
  protectedRole,
  type ManagementAction,
} from './management-controls';
import { useState, type FormEvent } from 'react';
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
  errorMessage,
  usePagedResource,
  useResource,
  useRuntime,
} from '@rhc/ui';

export const modules = [
  'Dashboard',
  'Customers',
  'RHC Digital IDs',
  'Companies',
  'Projects',
  'Properties',
  'Amica Tower Inventory',
  'Reservations',
  'Customer Properties',
  'Business Services',
  'Users',
  'Roles',
  'User Roles',
  'Permissions',
  'Integrations',
  'Feature Flags',
  'Audit Logs',
  'System Settings',
];
type Row = { id: string; [key: string]: unknown };
type Column = [string, string];
const columns: Record<string, Column[]> = {
  users: [
    ['email', 'Email'],
    ['profile.first_name', 'First name'],
    ['profile.last_name', 'Last name'],
    ['account_status', 'Account'],
    ['verification_status', 'Business verification'],
  ],
  customers: [
    ['email', 'Email'],
    ['profile.first_name', 'First name'],
    ['profile.last_name', 'Last name'],
    ['profile.rhc_id', 'RHC ID'],
    ['account_status', 'Account'],
    ['verification_status', 'Business verification'],
  ],
  companies: [
    ['company_code', 'Code'],
    ['display_name', 'Display name'],
    ['legal_name', 'Legal name'],
    ['status', 'Status'],
    ['integration_status', 'Integration'],
  ],
  projects: [
    ['project_code', 'Code'],
    ['project_name', 'Project'],
    ['company.display_name', 'Company'],
    ['location', 'Location'],
    ['status', 'Status'],
  ],
  properties: [
    ['property_code', 'Code'],
    ['project.project_name', 'Project'],
    ['tower', 'Tower'],
    ['floor', 'Floor'],
    ['unit_number', 'Unit'],
    ['asset_type', 'Asset type'],
    ['status', 'Status'],
    ['area', 'Area'],
    ['list_price', 'List price'],
    ['currency', 'Currency'],
  ],
  reservations: [
    ['reservation_number', 'Reservation #'],
    ['customer.email', 'Customer'],
    ['property.property_code', 'Property'],
    ['property.project.project_name', 'Project'],
    ['status', 'Status'],
    ['expires_at', 'Expires'],
    ['created_at', 'Created'],
  ],
  'customer-properties': [
    ['customer.email', 'Customer'],
    ['property.property_code', 'Property'],
    ['relationship_type', 'Relationship'],
    ['status', 'Status'],
    ['effective_from', 'Effective from'],
    ['effective_to', 'Effective to'],
  ],
  roles: [
    ['code', 'Code'],
    ['name', 'Name'],
    ['description', 'Description'],
    ['company_id', 'Company scope'],
  ],
  'user-roles': [
    ['user_id', 'User ID'],
    ['role.name', 'Role'],
    ['role.code', 'Role code'],
    ['company_id', 'Company scope'],
    ['project_id', 'Project scope'],
    ['expires_at', 'Expires at'],
    ['id', 'Assignment ID'],
  ],
  permissions: [
    ['code', 'Code'],
    ['description', 'Description'],
  ],
  integrations: [
    ['company.display_name', 'Company'],
    ['integration_key', 'Key'],
    ['name', 'Name'],
    ['status', 'Status'],
    ['updated_at', 'Updated'],
  ],
  'business-services': [
    ['service_code', 'Code'],
    ['service_name', 'Service'],
    ['company.display_name', 'Company'],
    ['service_type', 'Type'],
    ['status', 'Status'],
    ['integration_status', 'Integration'],
  ],
  'feature-flags': [
    ['key', 'Key'],
    ['description', 'Description'],
    ['enabled', 'Enabled'],
  ],
  'audit-logs': [
    ['created_at', 'Date'],
    ['actor_user_id', 'Actor'],
    ['action', 'Action'],
    ['entity_type', 'Entity'],
    ['entity_id', 'Entity ID'],
  ],
  'system-settings': [
    ['key', 'Key'],
    ['description', 'Description'],
    ['updated_at', 'Updated'],
  ],
};
function valueAt(row: Row, path: string): unknown {
  const value = path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      row,
    );
  if (path === 'customer.email') return value ?? row.customer_id;
  if (path === 'property.property_code') return value ?? row.property_id;
  return value;
}
function display(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
const statuses = [
  'AVAILABLE',
  'HELD',
  'RESERVED',
  'CONTRACTED',
  'SOLD',
  'FOR_TURNOVER',
  'TURNED_OVER',
  'BLOCKED',
];
type Field = {
  key: string;
  label: string;
  required?: boolean;
  options?: string[];
  source?: string;
  type?: string;
  max?: number;
};
const forms: Record<string, Field[]> = {
  companies: [
    { key: 'company_code', label: 'Company code', required: true, max: 40 },
    { key: 'legal_name', label: 'Legal name', required: true },
    { key: 'display_name', label: 'Display name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'business_type', label: 'Business type' },
  ],
  projects: [
    { key: 'company_id', label: 'Company', required: true, source: 'companies' },
    { key: 'project_code', label: 'Project code', required: true, max: 80 },
    { key: 'project_name', label: 'Project name', required: true },
    {
      key: 'status',
      label: 'Status',
      options: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
    },
    { key: 'location', label: 'Location' },
    { key: 'description', label: 'Description' },
  ],
  properties: [
    { key: 'project_id', label: 'Project', required: true, source: 'projects' },
    { key: 'property_code', label: 'Property code', required: true, max: 80 },
    { key: 'tower', label: 'Tower', max: 80 },
    { key: 'floor', label: 'Floor', max: 32 },
    { key: 'unit_number', label: 'Unit number', max: 80 },
    {
      key: 'asset_type',
      label: 'Asset type',
      required: true,
      options: ['RESIDENTIAL', 'COMMERCIAL', 'PARKING'],
    },
    { key: 'status', label: 'Status', required: true, options: statuses },
    { key: 'area', label: 'Area', type: 'number' },
    { key: 'list_price', label: 'List price', type: 'number' },
    { key: 'currency', label: 'Currency', max: 3, required: true },
  ],
  reservations: [
    { key: 'customer_id', label: 'Customer', required: true, source: 'customers' },
    { key: 'property_id', label: 'Property', required: true, source: 'properties' },
  ],
  'customer-properties': [
    { key: 'customer_id', label: 'Customer', required: true, source: 'customers' },
    { key: 'property_id', label: 'Property', required: true, source: 'properties' },
    {
      key: 'relationship_type',
      label: 'Relationship',
      required: true,
      options: ['RESERVEE', 'BUYER', 'CO_BUYER', 'OWNER', 'TENANT', 'AUTHORIZED_REPRESENTATIVE'],
    },
  ],
};
function ReferenceSelect({ field, initial }: { field: Field; initial: string }) {
  const resource = usePagedResource<Row>(`/admin/${field.source}`);
  return (
    <>
      <select
        aria-label={field.label}
        name={field.key}
        defaultValue={initial}
        required={field.required}
        disabled={resource.loading || Boolean(resource.error)}
        className="mt-2 w-full rounded-lg border p-3"
      >
        <option value="">Select {field.label.toLowerCase()}</option>
        {resource.data?.map((row) => (
          <option key={row.id} value={row.id}>
            {display(
              row.display_name || row.project_name || row.email || row.property_code || row.id,
            )}
          </option>
        ))}
      </select>
      <ResourceStatus {...resource} />
      {resource.hasMore && (
        <Web3Button variant="secondary" disabled={resource.loading} onClick={resource.loadMore}>
          Load more options
        </Web3Button>
      )}
    </>
  );
}
function Editor({
  resource,
  row,
  done,
  cancel,
}: {
  resource: string;
  row?: Row;
  done: () => void;
  cancel: () => void;
}) {
  const { request } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fields: Field[] = (forms[resource] || []).filter(
    (field) =>
      !row ||
      (resource === 'companies' ? field.key !== 'company_code' : field.key !== 'project_id'),
  );
  if (row && resource === 'companies')
    fields.push({
      key: 'status',
      label: 'Status',
      options: ['ACTIVE', 'INACTIVE', 'PREPARED', 'SUSPENDED'],
    });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const value = String(form.get(field.key) ?? '').trim();
      if (field.required && !value) {
        setError(`${field.label} is required.`);
        return;
      }
      const next = value ? (field.type === 'number' ? Number(value) : value) : null;
      if (row && String(row[field.key] ?? '') === String(next ?? '')) continue;
      if (next !== null || row) body[field.key] = next;
    }
    if (typeof body.area === 'number' && body.area <= 0) {
      setError('Area must be greater than zero.');
      return;
    }
    if (!Object.keys(body).length) {
      setError('No changes to save.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await request(`/admin/${resource}${row ? `/${encodeURIComponent(row.id)}` : ''}`, {
        method: row ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      done();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title={`${row ? 'Edit' : 'Create'} ${resource}`} className="mb-5">
      <form onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="block text-sm">
              {field.label}
              {field.source ? (
                <ReferenceSelect field={field} initial={String(row?.[field.key] ?? '')} />
              ) : field.options ? (
                <select
                  aria-label={field.label}
                  name={field.key}
                  defaultValue={String(row?.[field.key] ?? field.options[0])}
                  className="mt-2 w-full rounded-lg border p-3"
                >
                  {field.options.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={field.key}
                  required={field.required}
                  maxLength={field.max || 160}
                  type={field.type || 'text'}
                  min={field.type === 'number' ? 0 : undefined}
                  step={field.type === 'number' ? 'any' : undefined}
                  defaultValue={String(row?.[field.key] ?? (field.key === 'currency' ? 'PHP' : ''))}
                  className="mt-2 w-full rounded-lg border p-3"
                />
              )}
            </label>
          ))}
        </div>
        <p className="my-4 text-sm text-[var(--rhc-muted)]">
          Changes are submitted to the API with your account permissions. Review these values before
          saving.
        </p>
        {error && (
          <p role="alert" className="my-4">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Web3Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Web3Button>
          <Web3Button variant="secondary" disabled={busy} onClick={cancel}>
            Cancel
          </Web3Button>
        </div>
      </form>
    </Card>
  );
}
export function AdminTable({
  resource,
  amicaOnly = false,
}: {
  resource: string;
  amicaOnly?: boolean;
}) {
  const data = usePagedResource<Row>(
    `/admin/${resource}`,
    !['roles', 'permissions', 'feature-flags', 'system-settings'].includes(resource),
  );
  const { request, user } = useRuntime();
  const [review, setReview] = useState<Row | null>(null);
  const [management, setManagement] = useState<ManagementAction | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [flag, setFlag] = useState<Row | null>(null);
  const [reservationAction, setReservationAction] = useState<{ row: Row; action: 'confirm' | 'cancel' | 'expire' | 'convert' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const cols = columns[resource] || [];
  const filtered =
    data.data?.filter(
      (row) =>
        (!amicaOnly || String(valueAt(row, 'project.project_code')).startsWith('AMICA-')) &&
        (!status || row.status === status) &&
        cols.some(([key]) =>
          display(valueAt(row, key)).toLowerCase().includes(query.toLowerCase()),
        ),
    ) || [];
  const lastPage = Math.max(0, Math.ceil(filtered.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  const canEdit = resource === 'companies' || resource === 'properties';
  const canManage =
    metadataResources.includes(resource) || ['user-roles', 'system-settings'].includes(resource);
  const actionOpen = Boolean(management || review || editing || flag || reservationAction);
  const manage = (mode: ManagementAction['mode'], row?: Row) => {
    setManagement({ resource, mode, row });
    setMessage('');
  };
  const canReview = resource === 'users' || resource === 'customers';
  const complete = () => {
    setEditing(null);
    setManagement(null);
    setFlag(null);
    setReservationAction(null);
    setMessage('Changes saved.');
    data.refresh();
  };
  async function submitReservationAction() {
    if (!reservationAction || busy) return;
    setBusy(true);
    setError('');
    try {
      await request(`/admin/reservations/${encodeURIComponent(reservationAction.row.id)}/${reservationAction.action}`, {
        method: 'POST',
        body: JSON.stringify({
          review_reference: `ADMIN-${reservationAction.action.toUpperCase()}`,
          note: `Admin ${reservationAction.action} action`,
        }),
      });
      complete();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function toggleFlag() {
    if (!flag || busy) return;
    setBusy(true);
    setError('');
    try {
      await request(`/admin/feature-flags/${encodeURIComponent(flag.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      complete();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {management && (
        <ManagementEditor
          action={management}
          done={complete}
          cancel={() => setManagement(null)}
          refresh={data.refresh}
        />
      )}
      {review && (
        <VerificationReview
          key={review.id}
          candidate={review}
          cancel={() => setReview(null)}
          refresh={data.refresh}
          done={() => {
            setReview(null);
            setMessage('Business verification approved.');
            data.refresh();
          }}
        />
      )}
      {editing && (
        <Editor
          key={editing === 'new' ? 'new' : editing.id}
          resource={resource}
          row={editing === 'new' ? undefined : editing}
          done={complete}
          cancel={() => setEditing(null)}
        />
      )}
      {reservationAction && (
        <Card title="Confirm reservation action" className="mb-5">
          <p className="mb-4">
            {reservationAction.action.toUpperCase()} reservation {String(reservationAction.row.reservation_number)}?
          </p>
          <p className="mb-4 text-sm text-[var(--rhc-muted)]">
            This writes reservation events, property status history, and audit logs.
          </p>
          <div className="flex gap-3">
            <Web3Button disabled={busy} onClick={submitReservationAction}>Confirm action</Web3Button>
            <Web3Button disabled={busy} variant="secondary" onClick={() => setReservationAction(null)}>Cancel</Web3Button>
          </div>
        </Card>
      )}
      {flag && (
        <Card title="Confirm feature flag change" className="mb-5">
          <p className="mb-4">
            {flag.enabled ? 'Disable' : 'Enable'} {String(flag.key)}?
          </p>
          <div className="flex gap-3">
            <Web3Button disabled={busy} onClick={toggleFlag}>
              Confirm change
            </Web3Button>
            <Web3Button disabled={busy} variant="secondary" onClick={() => setFlag(null)}>
              Cancel
            </Web3Button>
          </div>
        </Card>
      )}
      {message && (
        <p role="status" className="mb-4">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4">
          {error}
        </p>
      )}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Search records
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            className="mt-2 block rounded-lg border p-3"
          />
        </label>
        {resource === 'properties' && (
          <label className="text-sm">
            Property status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
              className="mt-2 block rounded-lg border p-3"
            >
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
        <Web3Button variant="secondary" disabled={actionOpen} onClick={data.refresh}>
          Refresh records
        </Web3Button>
        {resource === 'user-roles' && (
          <p className="text-sm">
            Global assignment management. Blank scope means global or all projects in the named
            company, not the current viewer’s scope.
          </p>
        )}
        {data.data &&
          !data.error &&
          (createResources.includes(resource) || resource === 'system-settings') && (
            <Web3Button
              disabled={actionOpen || data.loading}
              onClick={() => manage(resource === 'system-settings' ? 'setting' : 'create')}
            >
              {resource === 'system-settings'
                ? 'Set managed setting'
                : resource === 'user-roles'
                  ? 'Assign role'
                  : `Create ${resource === 'roles' ? 'role' : resource === 'integrations' ? 'integration' : 'business service'}`}
            </Web3Button>
          )}
        {forms[resource] && data.data && !data.error && (
          <Web3Button
            disabled={actionOpen || data.loading}
            onClick={() => {
              setEditing('new');
              setMessage('');
            }}
          >
            Create{' '}
            {resource === 'customer-properties'
              ? 'relationship'
              : resource === 'reservations'
                ? 'reservation'
                : resource === 'properties'
                  ? 'property'
                  : resource === 'companies'
                    ? 'company'
                    : 'project'}
          </Web3Button>
        )}
      </div>
      <ResourceStatus {...data} />
      {data.hasMore && (
        <div className="mb-4">
          <Web3Button variant="secondary" disabled={data.loading} onClick={data.loadMore}>
            Load more records
          </Web3Button>
          <p className="mt-2 text-xs">Search and filters apply to loaded records.</p>
        </div>
      )}
      {data.data &&
        !data.error &&
        (filtered.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {cols.map(([key, label]) => (
                      <th
                        key={key}
                        className="whitespace-nowrap p-3 text-xs uppercase text-[var(--rhc-muted)]"
                      >
                        {label}
                      </th>
                    ))}
                    {(canEdit || canReview || canManage || resource === 'feature-flags' || resource === 'reservations') && (
                      <th className="p-3">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(currentPage * 20, currentPage * 20 + 20).map((row) => (
                    <tr key={row.id} className="border-t border-[var(--rhc-border)]">
                      {cols.map(([key]) => (
                        <td key={key} className="max-w-sm break-words p-3">
                          {display(valueAt(row, key))}
                        </td>
                      ))}
                      {canReview && (
                        <td className="p-3">
                          {resource === 'users' && (
                            <Web3Button
                              variant="secondary"
                              disabled={actionOpen || data.loading || row.id === user?.id}
                              onClick={() => manage('status', row)}
                            >
                              Change account status
                            </Web3Button>
                          )}
                          {approvalBlockReason(row, user?.id) ? (
                            <p className="text-xs text-[var(--rhc-muted)]">
                              {approvalBlockReason(row, user?.id)}
                            </p>
                          ) : (
                            <Web3Button
                              variant="secondary"
                              disabled={actionOpen || data.loading}
                              onClick={() => {
                                setReview({ ...row });
                                setMessage('');
                              }}
                            >
                              Review verification
                            </Web3Button>
                          )}
                        </td>
                      )}
                      {canManage && (
                        <td className="p-3">
                          {metadataResources.includes(resource) &&
                            (resource !== 'roles' || !protectedRole(row)) && (
                              <Web3Button
                                variant="secondary"
                                disabled={actionOpen || data.loading}
                                onClick={() => manage('edit', row)}
                              >
                                Edit
                              </Web3Button>
                            )}
                          {resource === 'roles' && (
                            <>
                              {protectedRole(row) && (
                                <p className="text-xs">Protected role metadata</p>
                              )}
                              {row.code !== 'SUPER_ADMIN' && (
                                <Web3Button
                                  variant="secondary"
                                  disabled={actionOpen || data.loading}
                                  onClick={() => manage('permissions', row)}
                                >
                                  Manage permissions
                                </Web3Button>
                              )}
                              {!protectedRole(row) && (
                                <Web3Button
                                  variant="secondary"
                                  disabled={actionOpen || data.loading}
                                  onClick={() => manage('delete-role', row)}
                                >
                                  Remove role
                                </Web3Button>
                              )}
                            </>
                          )}
                          {resource === 'user-roles' &&
                            (row.user_id === user?.id ||
                            valueAt(row, 'role.code') === 'SUPER_ADMIN' ? (
                              <p className="text-xs">Protected assignment</p>
                            ) : (
                              <Web3Button
                                variant="secondary"
                                disabled={actionOpen || data.loading}
                                onClick={() => manage('remove', row)}
                              >
                                Remove assignment
                              </Web3Button>
                            ))}
                          {resource === 'system-settings' &&
                            (Object.hasOwn(managedSettingFields, String(row.key)) ? (
                              <Web3Button
                                variant="secondary"
                                disabled={actionOpen || data.loading}
                                onClick={() => manage('setting', row)}
                              >
                                Edit setting
                              </Web3Button>
                            ) : (
                              <p className="text-xs">Read-only setting</p>
                            ))}
                        </td>
                      )}
                      {canEdit && (
                        <td className="p-3">
                          <Web3Button
                            variant="secondary"
                            disabled={actionOpen || data.loading}
                            onClick={() => {
                              setEditing(row);
                              setMessage('');
                            }}
                          >
                            Edit
                          </Web3Button>
                        </td>
                      )}
                      {resource === 'reservations' && (
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {row.status === 'PENDING' && (
                              <>
                                <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setReservationAction({ row, action: 'confirm' })}>Confirm</Web3Button>
                                <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setReservationAction({ row, action: 'expire' })}>Expire</Web3Button>
                              </>
                            )}
                            {(row.status === 'PENDING' || row.status === 'CONFIRMED') && (
                              <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setReservationAction({ row, action: 'cancel' })}>Cancel</Web3Button>
                            )}
                            {row.status === 'CONFIRMED' && (
                              <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setReservationAction({ row, action: 'convert' })}>Convert</Web3Button>
                            )}
                          </div>
                        </td>
                      )}
                      {resource === 'feature-flags' && (
                        <td className="p-3">
                          <Web3Button
                            variant="secondary"
                            disabled={
                              actionOpen ||
                              data.loading ||
                              (!row.enabled &&
                                /wallet|token|blockchain|marketplace|reward|points/i.test(
                                  String(row.key),
                                ))
                            }
                            onClick={() => {
                              setFlag(row);
                              setError('');
                            }}
                          >
                            {row.enabled ? 'Disable' : 'Enable'}
                          </Web3Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Web3Button
                variant="secondary"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Web3Button>
              <span>
                Page {currentPage + 1} of {lastPage + 1} · {filtered.length} records
              </span>
              <Web3Button
                variant="secondary"
                disabled={currentPage === lastPage}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Web3Button>
            </div>
          </>
        ) : (
          <EmptyState
            title="No matching records"
            description="No records match your current filters or permitted scope."
          />
        ))}
    </>
  );
}
export function AdminModule({
  title,
  resource,
  amicaOnly,
}: {
  title: string;
  resource: string;
  amicaOnly?: boolean;
}) {
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
        <h1 className="mt-5 text-4xl font-black text-[var(--rhc-heading)] md:text-6xl">{title}</h1>
        <nav aria-label="Admin modules" className="mt-5 flex gap-4 overflow-x-auto">
          {modules.map((label) => (
            <a
              key={label}
              className="whitespace-nowrap text-sm"
              href={`/${label.toLowerCase().replaceAll(' ', '-')}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <Card className="mt-8" title={title}>
          <AdminTable resource={resource} amicaOnly={amicaOnly} />
        </Card>
      </section>
    </Web3Shell>
  );
}
const metrics = [
  ['totalUsers', 'Total users'],
  ['verifiedCustomers', 'Verified customers'],
  ['companies', 'Companies'],
  ['activeProjects', 'Active projects'],
  ['totalAmicaProperties', 'Property records'],
  ['availableProperties', 'Available properties'],
  ['reservedProperties', 'Reserved properties'],
  ['auditCount', 'Security/audit'],
] as const;
export function AdminMetrics() {
  const resource = useResource<Record<string, number>>('/admin/dashboard');
  return (
    <>
      <ResourceStatus {...resource} />
      {resource.data && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([key, label]) => (
            <MetricCard
              key={key}
              label={label}
              value={
                typeof resource.data?.[key] === 'number'
                  ? String(resource.data[key])
                  : 'Not available'
              }
              detail="Current API records"
            />
          ))}
        </div>
      )}
    </>
  );
}
