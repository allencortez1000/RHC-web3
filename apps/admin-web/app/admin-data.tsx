'use client';

import Link from 'next/link';
import { useAdminCapabilities } from './admin-capabilities';
export { useAdminCapabilities } from './admin-capabilities';
import { approvalBlockReason, VerificationReview } from './verification-review';
import {
  ManagementEditor,
  createResources,
  managedSettingFields,
  metadataResources,
  protectedRole,
  type ManagementAction,
} from './management-controls';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Badge,
  Card,
  CommandMenu,
  EmptyState,
  MetricCard,
  ResourceStatus,
  RHCLogoMark,
  SignOutButton,
  ThemeToggle,
  UnavailableFeature,
  Web3Button,
  Web3Shell,
  errorMessage,
  getRequestAvailability,
  usePagedResource,
  useResource,
  useRuntime,
} from '@rhc/ui';
import {
  hasAnyEffectiveGrant,
  hasEffectiveGrant,
  hasRequiredMutationGrants,
  requiredMutationPermissions,
  referenceIsAuthorized,
  resourceMutationAllowed,
  targetForReference,
  targetForResource,
  globalScope,
  type AdminCapabilities,
  type ScopeTarget,
} from './capability-scopes';
import { useMutationIntent } from './capability-request-coordinator';

export type AdminModuleDefinition = { label: string; path: string; permission: string; globalOnly?: boolean };
export const moduleDefinitions: readonly AdminModuleDefinition[] = [
  { label: 'Dashboard', path: '/', permission: 'company.view' },
  { label: 'Customers', path: '/customers', permission: 'customer.view' },
  { label: 'RHC Digital IDs', path: '/rhc-digital-ids', permission: 'customer.view' },
  { label: 'Companies', path: '/companies', permission: 'company.view' },
  { label: 'Projects', path: '/projects', permission: 'project.view' },
  { label: 'Properties', path: '/properties', permission: 'property.view' },
  { label: 'Amica Tower Inventory', path: '/amica-tower-inventory', permission: 'property.view' },
  { label: 'Reservations', path: '/reservations', permission: 'reservation.view' },
  { label: 'Customer Properties', path: '/customer-properties', permission: 'customer_property.view' },
  { label: 'Business Services', path: '/business-services', permission: 'integration.view' },
  { label: 'Users', path: '/users', permission: 'user.view' },
  { label: 'Roles', path: '/roles', permission: 'role.view' },
  { label: 'User Roles', path: '/user-roles', permission: 'role.view', globalOnly: true },
  { label: 'Permissions', path: '/permissions', permission: 'permission.view' },
  { label: 'Integrations', path: '/integrations', permission: 'integration.view' },
  { label: 'Feature Flags', path: '/feature-flags', permission: 'feature_flag.view' },
  { label: 'Audit Logs', path: '/audit-logs', permission: 'audit.view' },
  { label: 'System Settings', path: '/system-settings', permission: 'system_settings.view' },
];
export const modules = moduleDefinitions.map((module) => module.label);
export type { AdminCapabilities } from './capability-scopes';
export function visibleModules(capabilities?: AdminCapabilities) {
  if (!capabilities) return [];
  if (capabilities.modules) {
    const usable = new Set(capabilities.modules.filter((module) => module.usable).map((module) => module.path));
    return moduleDefinitions.filter((module) => usable.has(module.path));
  }
  return moduleDefinitions.filter((module) =>
    capabilities.permissions.includes(module.permission) &&
    (!module.globalOnly || hasEffectiveGrant(capabilities, module.permission, globalScope(), false)),
  );
}
export function AdminNavigation({ capabilities, ariaLabel = 'Admin modules', className = 'mt-5 flex gap-4 overflow-x-auto', linkClassName = 'whitespace-nowrap text-sm' }: { capabilities?: AdminCapabilities; ariaLabel?: string; className?: string; linkClassName?: string }) {
  const visible = visibleModules(capabilities);
  return <nav aria-label={ariaLabel} className={className}>{visible.map((module) => <Link key={module.path} className={linkClassName} href={module.path}>{module.label}</Link>)}</nav>;
}
export function AdminPermissionBoundary({ permission, children }: { permission: string; children: ReactNode }) {
  const resource = useAdminCapabilities();
  if (resource.loading || resource.error) return <ResourceStatus {...resource} />;
  const usable = permission === 'company.view' && resource.data?.modules
    ? resource.data.modules.some((module) => module.path === '/' && module.usable)
    : resource.data?.permissions.includes(permission);
  if (!usable) return <EmptyState title="No administrative access" description="Your account has no permission for this module. The API remains authoritative for every resource request." />;
  return <>{children}</>;
}

type AdminNavItem = readonly [label: string, href: string];
export const adminNavGroups: Array<{ section: string; items: AdminNavItem[] }> = [
  {
    section: 'Operations',
    items: [
      ['Command Center', '/'],
      ['Reservations', '/reservations'],
      ['Properties', '/properties'],
      ['Amica Tower Inventory', '/amica-tower-inventory'],
      ['Customer Properties', '/customer-properties'],
      ['Service Requests', '/service-requests'],
      ['Operational Reports', '/reports'],
    ],
  },
  {
    section: 'Verification & Records',
    items: [
      ['Verification Reviews', '/verification'],
      ['Customers', '/customers'],
      ['Digital IDs', '/rhc-digital-ids'],
      ['Payments', '/payments'],
      ['Documents', '/documents'],
      ['Certificates', '/certificates'],
      ['Rewards Ledger', '/rewards-ledger'],
      ['Audit Logs', '/audit-logs'],
    ],
  },
  {
    section: 'Ecosystem',
    items: [
      ['Companies', '/companies'],
      ['Projects', '/projects'],
      ['Business Services', '/business-services'],
      ['Integrations', '/integrations'],
    ],
  },
  {
    section: 'Administration',
    items: [
      ['Users', '/users'],
      ['Roles', '/roles'],
      ['User Roles', '/user-roles'],
      ['Permissions', '/permissions'],
      ['Feature Flags', '/feature-flags'],
      ['System Settings', '/system-settings'],
    ],
  },
];
export const adminNavItems: AdminNavItem[] = adminNavGroups.flatMap((group) => group.items);
const routeFor = new Map<string, string>(adminNavItems.map(([label, href]) => [label, href]));
const routePermissions: Record<string, string | string[] | undefined> = {
  '/reservations': 'reservation.view',
  '/properties': 'property.view',
  '/amica-tower-inventory': 'property.view',
  '/customer-properties': 'customer_property.view',
  '/service-requests': 'integration.view',
  '/reports': ['reservation.view', 'customer.view', 'integration.view', 'audit.view'],
  '/verification': 'customer.view',
  '/customers': 'customer.view',
  '/rhc-digital-ids': 'customer.view',
  '/payments': 'customer.view',
  '/documents': 'customer.view',
  '/certificates': 'customer.view',
  '/rewards-ledger': 'customer.view',
  '/audit-logs': 'audit.view',
  '/companies': 'company.view',
  '/projects': 'project.view',
  '/business-services': 'integration.view',
  '/integrations': 'integration.view',
  '/users': 'user.view',
  '/roles': 'role.view',
  '/user-roles': 'role.view',
  '/permissions': 'permission.view',
  '/feature-flags': 'feature_flag.view',
  '/system-settings': 'system_settings.view',
};
export function canAccessAdminRoute(capabilities: AdminCapabilities | undefined, href: string) {
  if (!capabilities) return false;
  const canonical = href === '/verification' ? '/customers' : href;
  if (moduleDefinitions.some((module) => module.path === canonical)) {
    return visibleModules(capabilities).some((module) => module.path === canonical);
  }
  const permission = routePermissions[href];
  if (Array.isArray(permission)) return permission.some((code) =>
    visibleModules(capabilities).some((module) => module.permission === code));
  // Additional demo workspaces must be explicitly advertised by the capability endpoint.
  return Boolean(permission && capabilities.modules?.some((module) => module.path === href && module.usable));
}

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
    ['property_code', 'Property'],
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
  payments: [
    ['reference', 'Reference'],
    ['customer_id', 'Customer'],
    ['property_id', 'Property'],
    ['amount_minor', 'Amount (centavos)'],
    ['currency', 'Currency'],
    ['status', 'Status'],
    ['submitted_at', 'Submitted'],
  ],
  documents: [
    ['title', 'Document'],
    ['customer_id', 'Customer'],
    ['category', 'Category'],
    ['version', 'Version'],
    ['status', 'Status'],
    ['issued_at', 'Submitted'],
  ],
  certificates: [
    ['reference', 'Reference'],
    ['customer_id', 'Customer'],
    ['type', 'Credential'],
    ['linked_record', 'Linked record'],
    ['status', 'Status'],
    ['blockchain_status', 'Blockchain'],
  ],
  'service-requests': [
    ['reference', 'Reference'],
    ['customer_id', 'Customer'],
    ['company_id', 'Company'],
    ['title', 'Request'],
    ['status', 'Status'],
    ['updated_at', 'Updated'],
  ],
  'rewards-ledger': [
    ['date', 'Date'],
    ['customer_id', 'Customer'],
    ['source', 'Source'],
    ['points', 'Points'],
    ['reason', 'Reason'],
    ['rule_version', 'Rule'],
    ['status', 'Status'],
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
  scopePermission?: string;
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
    { key: 'company_id', label: 'Company', required: true, source: 'companies', scopePermission: 'project.create' },
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
    { key: 'project_id', label: 'Project', required: true, source: 'projects', scopePermission: 'property.create' },
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
    { key: 'property_id', label: 'Property', required: true, source: 'properties', scopePermission: 'reservation.create' },
  ],
  'customer-properties': [
    { key: 'customer_id', label: 'Customer', required: true, source: 'customers' },
    { key: 'property_id', label: 'Property', required: true, source: 'properties', scopePermission: 'customer_property.manage' },
    {
      key: 'relationship_type',
      label: 'Relationship',
      required: true,
      options: ['RESERVEE', 'BUYER', 'CO_BUYER', 'OWNER', 'TENANT', 'AUTHORIZED_REPRESENTATIVE'],
    },
  ],
};
function ReferenceSelect({
  field,
  initial,
  capabilities,
  onTargetChange,
}: {
  field: Field;
  initial: string;
  capabilities?: AdminCapabilities;
  onTargetChange?: (target: ScopeTarget | null) => void;
}) {
  const resource = usePagedResource<Row>(`/admin/${field.source}`);
  const rows = (resource.data || []).filter((row) =>
    referenceIsAuthorized(capabilities, field.scopePermission, field.source, row),
  );
  return (
    <>
      <select
        aria-label={field.label}
        name={field.key}
        defaultValue={initial}
        required={field.required}
        disabled={resource.loading || Boolean(resource.error) || (Boolean(field.scopePermission) && !rows.length)}
        onChange={(event) => {
          const selected = resource.data?.find((row) => row.id === event.target.value);
          onTargetChange?.(selected ? targetForReference(field.source, selected) : null);
        }}
        className="mt-2 w-full rounded-lg border p-3"
      >
        <option value="">Select {field.label.toLowerCase()}</option>
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {display(
              row.display_name || row.project_name || row.email || row.property_code || row.id,
            )}
          </option>
        ))}
      </select>
      {field.scopePermission && resource.data && !rows.length && !resource.loading && !resource.error && (
        <p className="mt-2 text-xs text-[var(--rhc-muted)]">No authorized target is available for this action.</p>
      )}
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
  capabilities,
  capabilitiesReady,
  revalidateCapabilities,
}: {
  resource: string;
  row?: Row;
  done: () => void;
  cancel: () => void;
  capabilities?: AdminCapabilities;
  capabilitiesReady: boolean;
  revalidateCapabilities: () => Promise<AdminCapabilities | null>;
}) {
  const { request } = useRuntime();
  const mutation = useMutationIntent(row ?? resource);
  const busy = mutation.busy;
  const [error, setError] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<ScopeTarget | null>(() =>
    row ? targetForResource(resource, row) : null,
  );
  const canChangePropertyStatus = resource === 'properties' && resourceMutationAllowed(
    capabilities,
    resource,
    'change_status',
    row,
    selectedTarget,
  );
  const fields: Field[] = (forms[resource] || []).filter(
    (field) =>
      (!row || (resource === 'companies' ? field.key !== 'company_code' : field.key !== 'project_id')) &&
      !(resource === 'properties' && field.key === 'status' && row && !canChangePropertyStatus),
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
    if (!capabilitiesReady) {
      setError('Permissions are refreshing. Wait for the current capability state before saving.');
      return;
    }
    const target = resource === 'projects' && typeof body.company_id === 'string'
      ? { company_id: body.company_id, project_id: null }
      : selectedTarget ?? (row ? targetForResource(resource, row) : globalScope());
    const action = row ? 'edit' : 'create';
    const permissions = requiredMutationPermissions(resource, action, body);
    const intent = mutation.begin();
    if (intent === null) return;
    setError('');
    try {
      const latest = await revalidateCapabilities();
      if (!mutation.isCurrent(intent)) return;
      if (!latest || !hasRequiredMutationGrants(latest, permissions, target)) {
        setError('Your permissions changed or could not be refreshed. No change was submitted; close this form and review the current record.');
        return;
      }
      if (!mutation.markSubmitted(intent)) return;
      await request(`/admin/${resource}${row ? `/${encodeURIComponent(row.id)}` : ''}`, {
        method: row ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      if (mutation.isCurrent(intent)) done();
    } catch (cause) {
      if (mutation.isCurrent(intent)) setError(errorMessage(cause));
    } finally {
      mutation.finish(intent);
    }
  }
  return (
    <Card title={`${row ? 'Edit' : 'Create'} ${resource}`} className="mb-5">
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="block text-sm">
              {field.label}
              {field.source ? (
                <ReferenceSelect
                  field={field}
                  initial={String(row?.[field.key] ?? '')}
                  capabilities={capabilities}
                  onTargetChange={field.source === 'projects' || field.source === 'properties' ? setSelectedTarget : undefined}
                />
              ) : field.options ? (
                <select
                  aria-label={field.label}
                  name={field.key}
                  defaultValue={String(row?.[field.key] ?? field.options[0])}
                  className="mt-2 w-full rounded-lg border p-3"
                >
                  {(resource === 'properties' && field.key === 'status' && !canChangePropertyStatus
                    ? ['AVAILABLE']
                    : field.options).map((value) => (
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
        </fieldset>
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
          <Web3Button type="submit" disabled={busy || !capabilitiesReady}>
            {busy ? 'Saving…' : 'Save changes'}
          </Web3Button>
          <Web3Button variant="secondary" disabled={mutation.submitted} onClick={() => {
            mutation.invalidate();
            cancel();
          }}>
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
  const { request, user, dataMode } = useRuntime();
  const capabilities = useAdminCapabilities();
  const capabilitiesReady = Boolean(capabilities.data) && !capabilities.loading && !capabilities.error;
  const hasMutation = (permission: string) => hasEffectiveGrant(capabilities.data, permission);
  const hasAnyMutation = (permission: string) => hasAnyEffectiveGrant(capabilities.data, permission);
  const [review, setReview] = useState<Row | null>(null);
  const [management, setManagement] = useState<ManagementAction | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [flag, setFlag] = useState<Row | null>(null);
  const [reservationAction, setReservationAction] = useState<{ row: Row; action: 'confirm' | 'cancel' | 'expire' | 'convert' } | null>(null);
  const [workflowAction, setWorkflowAction] = useState<{
    row: Row;
    action: 'approve' | 'reject' | 'verify' | 'reverse' | 'revoke' | 'supersede' | 'progress';
  } | null>(null);
  const mutation = useMutationIntent(workflowAction ?? reservationAction ?? flag ?? resource);
  const busy = mutation.busy;
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
  const canEditRow = (row: Row) =>
    (resource === 'companies' && resourceMutationAllowed(capabilities.data, resource, 'edit', row)) ||
    (resource === 'properties' && resourceMutationAllowed(capabilities.data, resource, 'edit', row));
  const canManageRow = (row: Row) =>
    (resource === 'projects' && resourceMutationAllowed(capabilities.data, resource, 'edit', row)) ||
    (resource === 'customer-properties' && resourceMutationAllowed(capabilities.data, resource, 'manage', row)) ||
    (['roles'].includes(resource) && resourceMutationAllowed(capabilities.data, resource, 'manage', row)) ||
    (['integrations', 'business-services'].includes(resource) && resourceMutationAllowed(capabilities.data, resource, 'manage', row)) ||
    (resource === 'user-roles' && resourceMutationAllowed(capabilities.data, resource, 'manage', row)) ||
    (resource === 'system-settings' && resourceMutationAllowed(capabilities.data, resource, 'manage', row));
  const canReview = (resource === 'users' || resource === 'customers') && resourceMutationAllowed(capabilities.data, resource, 'manage');
  const canCreate =
    (resource === 'companies' && resourceMutationAllowed(capabilities.data, resource, 'create')) ||
    (resource === 'projects' && resourceMutationAllowed(capabilities.data, resource, 'create')) ||
    (resource === 'properties' && resourceMutationAllowed(capabilities.data, resource, 'create')) ||
    (resource === 'customer-properties' && hasAnyMutation('customer_property.manage')) ||
    (resource === 'reservations' && hasAnyMutation('reservation.create')) ||
    (resource === 'roles' && resourceMutationAllowed(capabilities.data, resource, 'manage')) ||
    (resource === 'integrations' && resourceMutationAllowed(capabilities.data, resource, 'create')) ||
    (resource === 'business-services' && resourceMutationAllowed(capabilities.data, resource, 'create')) ||
    (resource === 'user-roles' && resourceMutationAllowed(capabilities.data, resource, 'manage')) ||
    (resource === 'system-settings' && resourceMutationAllowed(capabilities.data, resource, 'manage'));
  const canFeatureManage = resource === 'feature-flags' && resourceMutationAllowed(capabilities.data, resource, 'manage');
  const canReservationManage = (row: Row) => resource === 'reservations' && resourceMutationAllowed(capabilities.data, resource, 'manage', row);
  const canReservationCancel = (row: Row) => resource === 'reservations' && resourceMutationAllowed(capabilities.data, resource, 'cancel', row);
  const hasRowActions = filtered.some((row) => canEditRow(row) || canManageRow(row) || canReservationManage(row) || canReservationCancel(row));
  const workflowResource = capabilitiesReady && hasAnyMutation(resource === 'service-requests' ? 'integration.manage' : resource === 'payments' ? 'customer.edit' : 'user.manage') && dataMode === 'demo' && ['payments', 'documents', 'certificates', 'service-requests'].includes(resource);
  const actionOpen = Boolean(management || review || editing || flag || reservationAction || workflowAction);
  const manage = (mode: ManagementAction['mode'], row?: Row) => {
    setManagement({ resource, mode, row });
    setMessage('');
  };
  const refreshAll = () => {
    data.refresh();
    capabilities.reload();
  };
  const complete = () => {
    setEditing(null);
    setManagement(null);
    setFlag(null);
    setReservationAction(null);
    setWorkflowAction(null);
    setMessage(dataMode === 'demo' ? 'Changes saved and recorded in demo history.' : 'Changes saved.');
    data.refresh();
  };
  async function submitReservationAction() {
    if (!reservationAction || busy) return;
    if (!capabilitiesReady) {
      setError('Permissions are refreshing. Wait for the current capability state before confirming.');
      return;
    }
    const target = targetForResource('reservations', reservationAction.row);
    const permission = reservationAction.action === 'cancel' ? 'cancel' : 'manage';
    const intent = mutation.begin();
    if (intent === null) return;
    setError('');
    try {
      const latest = await capabilities.revalidate();
      if (!mutation.isCurrent(intent)) return;
      if (!latest || !hasRequiredMutationGrants(latest, requiredMutationPermissions('reservations', permission), target)) {
        setReservationAction(null);
        setError('Your reservation permission changed or could not be refreshed. No action was submitted.');
        return;
      }
      if (!mutation.markSubmitted(intent)) return;
      await request(`/admin/reservations/${encodeURIComponent(reservationAction.row.id)}/${reservationAction.action}`, {
        method: 'POST',
        body: JSON.stringify({
          review_reference: `ADMIN-${reservationAction.action.toUpperCase()}`,
          note: `Admin ${reservationAction.action} action`,
        }),
      });
      if (mutation.isCurrent(intent)) complete();
    } catch (cause) {
      if (mutation.isCurrent(intent)) setError(errorMessage(cause));
    } finally {
      mutation.finish(intent);
    }
  }
  async function submitWorkflowAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workflowAction || busy || dataMode !== 'demo' || !capabilitiesReady) return;
    const form = new FormData(event.currentTarget);
    const reason = String(form.get('reason') || '').trim();
    const statusValue = String(form.get('status') || '').trim();
    if (reason.length < 3) {
      setError('A review reason or progress note is required.');
      return;
    }
    const intent = mutation.begin();
    if (intent === null) return;
    setError('');
    try {
      const latest = await capabilities.revalidate();
      if (!mutation.isCurrent(intent)) return;
      const permission = resource === 'service-requests' ? 'integration.manage' : resource === 'payments' ? 'customer.edit' : 'user.manage';
      if (!latest || !hasAnyEffectiveGrant(latest, permission)) {
        setError('Your workflow permission changed or could not be refreshed. No action was submitted.');
        return;
      }
      if (!mutation.markSubmitted(intent)) return;
      const action = workflowAction.action;
      await request(`/admin/${resource}/${encodeURIComponent(workflowAction.row.id)}/${action}`, {
        method: 'POST',
        body: JSON.stringify(
          action === 'progress'
            ? { status: statusValue, note: reason }
            : { reason },
        ),
      });
      if (mutation.isCurrent(intent)) complete();
    } catch (cause) {
      if (mutation.isCurrent(intent)) setError(errorMessage(cause));
    } finally {
      mutation.finish(intent);
    }
  }

  async function toggleFlag() {
    if (!flag || busy) return;
    if (!capabilitiesReady) {
      setError('Permissions are refreshing. Wait for the current capability state before confirming.');
      return;
    }
    const intent = mutation.begin();
    if (intent === null) return;
    setError('');
    try {
      const latest = await capabilities.revalidate();
      if (!mutation.isCurrent(intent)) return;
      if (!latest || !hasRequiredMutationGrants(latest, requiredMutationPermissions('feature-flags', 'manage'), globalScope())) {
        setFlag(null);
        setError('Your feature-control permission changed or could not be refreshed. No action was submitted.');
        return;
      }
      if (!mutation.markSubmitted(intent)) return;
      await request(`/admin/feature-flags/${encodeURIComponent(flag.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      if (mutation.isCurrent(intent)) complete();
    } catch (cause) {
      if (mutation.isCurrent(intent)) setError(errorMessage(cause));
    } finally {
      mutation.finish(intent);
    }
  }
  if (data.unavailable) return <UnavailableFeature unavailable={data.unavailable} />;
  return (
    <>
      {management && (
        <ManagementEditor
          key={`${management.resource}:${management.mode}:${management.row?.id ?? 'new'}`}
          action={management}
          done={complete}
          cancel={() => setManagement(null)}
          refresh={refreshAll}
          capabilities={capabilities.data}
          capabilitiesReady={capabilitiesReady}
          revalidateCapabilities={capabilities.revalidate}
        />
      )}
      {review && (
        <VerificationReview
          key={review.id}
          candidate={review}
          cancel={() => setReview(null)}
          refresh={refreshAll}
          capabilitiesReady={capabilitiesReady}
          revalidateCapabilities={capabilities.revalidate}
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
          capabilities={capabilities.data}
          capabilitiesReady={capabilitiesReady}
          revalidateCapabilities={capabilities.revalidate}
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
            <Web3Button disabled={busy || !capabilitiesReady} onClick={submitReservationAction}>Confirm action</Web3Button>
            <Web3Button disabled={mutation.submitted} variant="secondary" onClick={() => {
              mutation.invalidate();
              setReservationAction(null);
            }}>Cancel</Web3Button>
          </div>
        </Card>
      )}
      {workflowAction && (
        <Card title="Review workflow action" className="mb-5">
          <form onSubmit={submitWorkflowAction}>
            <p className="text-sm text-[var(--rhc-muted)]">
              {workflowAction.action.toUpperCase()} {resource} record {String(workflowAction.row.reference || workflowAction.row.title || workflowAction.row.id)}. A reason is required and the result is appended to audit and customer history.
            </p>
            {workflowAction.action === 'progress' ? (
              <label className="mt-4 block text-sm font-semibold">
                Next status
                <select name="status" required className="mt-2 w-full rounded-xl border p-3">
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
            ) : null}
            <label className="mt-4 block text-sm font-semibold">
              Reason or operator note
              <textarea name="reason" required minLength={3} maxLength={500} className="mt-2 min-h-24 w-full rounded-xl border p-3" />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <Web3Button type="submit" disabled={busy || !capabilitiesReady}>{busy ? 'Applying…' : 'Confirm action'}</Web3Button>
              <Web3Button variant="secondary" disabled={busy} onClick={() => setWorkflowAction(null)}>Cancel</Web3Button>
            </div>
          </form>
        </Card>
      )}
      {flag && (
        <Card title="Confirm feature flag change" className="mb-5">
          <p className="mb-4">
            {flag.enabled ? 'Disable' : 'Enable'} {String(flag.key)}?
          </p>
          <div className="flex gap-3">
            <Web3Button disabled={busy || !capabilitiesReady} onClick={toggleFlag}>
              Confirm change
            </Web3Button>
            <Web3Button disabled={mutation.submitted} variant="secondary" onClick={() => {
              mutation.invalidate();
              setFlag(null);
            }}>
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
        <label className="min-w-[260px] flex-1 text-sm font-medium text-[var(--rhc-secondary-text)]">
          Search records
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search loaded records…"
            className="mt-2 block w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)] shadow-sm outline-none focus:border-[var(--rhc-primary)] focus:ring-2 focus:ring-[var(--rhc-accent-soft)]"
          />
        </label>
        {resource === 'properties' && (
          <label className="min-w-[220px] text-sm font-medium text-[var(--rhc-secondary-text)]">
            Property status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
              className="mt-2 block w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)] shadow-sm outline-none focus:border-[var(--rhc-primary)] focus:ring-2 focus:ring-[var(--rhc-accent-soft)]"
            >
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
        <Web3Button variant="secondary" disabled={actionOpen} onClick={refreshAll}>
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
          canCreate &&
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
        {forms[resource] && data.data && !data.error && canCreate && (
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
                <caption className="sr-only">{resource.replaceAll('-', ' ')} records available within the current operator scope</caption>
                <thead>
                  <tr>
                    {cols.map(([key, label]) => (
                      <th
                        key={key}
                        scope="col"
                        className="whitespace-nowrap p-3 text-xs uppercase text-[var(--rhc-muted)]"
                      >
                        {label}
                      </th>
                    ))}
                    {(canReview || canFeatureManage || hasRowActions || workflowResource) && (
                      <th scope="col" className="p-3">Actions</th>
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
                      {canManageRow(row) && (
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
                              {row.code !== 'SUPER_ADMIN' && hasMutation('permission.manage') && (
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
                      {canEditRow(row) && (
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
                      {resource === 'reservations' && (canReservationManage(row) || canReservationCancel(row)) && (
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {canReservationManage(row) && row.status === 'PENDING' && (
                              <>
                                <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setReservationAction({ row, action: 'confirm' })}>Confirm</Web3Button>
                                <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setReservationAction({ row, action: 'expire' })}>Expire</Web3Button>
                              </>
                            )}
                            {canReservationCancel(row) && (row.status === 'PENDING' || row.status === 'CONFIRMED') && (
                              <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setReservationAction({ row, action: 'cancel' })}>Cancel</Web3Button>
                            )}
                            {canReservationManage(row) && row.status === 'CONFIRMED' && (
                              <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setReservationAction({ row, action: 'convert' })}>Convert</Web3Button>
                            )}
                          </div>
                        </td>
                      )}
                      {workflowResource && (
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {resource === 'documents' && ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED'].includes(String(row.status)) ? (
                              <>
                                <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setWorkflowAction({ row, action: 'approve' })}>Approve</Web3Button>
                                <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setWorkflowAction({ row, action: 'reject' })}>Reject</Web3Button>
                              </>
                            ) : null}
                            {resource === 'payments' && ['SUBMITTED', 'PENDING'].includes(String(row.status)) ? (
                              <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setWorkflowAction({ row, action: 'verify' })}>Verify record</Web3Button>
                            ) : null}
                            {resource === 'payments' && row.status === 'POSTED' ? (
                              <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setWorkflowAction({ row, action: 'reverse' })}>Record reversal</Web3Button>
                            ) : null}
                            {resource === 'certificates' && row.status === 'ACTIVE' ? (
                              <>
                                <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setWorkflowAction({ row, action: 'supersede' })}>Supersede</Web3Button>
                                <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setWorkflowAction({ row, action: 'revoke' })}>Revoke</Web3Button>
                              </>
                            ) : null}
                            {resource === 'service-requests' && !['COMPLETED', 'CANCELLED'].includes(String(row.status)) ? (
                              <Web3Button variant="secondary" disabled={actionOpen || data.loading} onClick={() => setWorkflowAction({ row, action: 'progress' })}>Progress request</Web3Button>
                            ) : null}
                            {!['documents', 'payments', 'certificates', 'service-requests'].some((name) => name === resource) ? null :
                              !(
                                (resource === 'documents' && ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED'].includes(String(row.status))) ||
                                (resource === 'payments' && ['SUBMITTED', 'PENDING', 'POSTED'].includes(String(row.status))) ||
                                (resource === 'certificates' && row.status === 'ACTIVE') ||
                                (resource === 'service-requests' && !['COMPLETED', 'CANCELLED'].includes(String(row.status)))
                              ) ? <span className="text-xs text-[var(--rhc-muted)]">No action for current state</span> : null}
                          </div>
                        </td>
                      )}
                      {canFeatureManage && resource === 'feature-flags' && (
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
function GroupedAdminNavigation({
  activeHref,
  mobile = false,
  capabilities,
}: {
  activeHref: string;
  mobile?: boolean;
  capabilities?: AdminCapabilities;
}) {
  const visibleGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(([, href]) => canAccessAdminRoute(capabilities, href)),
    }))
    .filter((group) => group.items.length > 0);
  return (
    <nav
      aria-label={mobile ? 'Mobile admin navigation' : 'Admin navigation'}
      className={mobile ? 'flex gap-5 overflow-x-auto pb-1' : 'mt-6 space-y-6'}
    >
      {visibleGroups.map((group) => (
        <div
          key={group.section}
          className={mobile ? 'flex shrink-0 items-center gap-2' : undefined}
        >
          <p
            className={
              mobile
                ? 'whitespace-nowrap text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--rhc-primary)]'
                : 'px-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--rhc-primary)]'
            }
          >
            {group.section}
          </p>
          <div className={mobile ? 'flex gap-2' : 'mt-2 space-y-1'}>
            {group.items.map(([label, href]) => {
              const current = href === activeHref;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={
                    mobile
                      ? `whitespace-nowrap rounded-full border px-3 py-2 text-xs font-bold ${
                          current
                            ? 'border-[var(--rhc-primary)] bg-[var(--rhc-accent-soft)] text-[var(--rhc-heading)]'
                            : 'border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] text-[var(--rhc-secondary-text)]'
                        }`
                      : `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                          current
                            ? 'bg-[var(--rhc-accent-soft)] text-[var(--rhc-heading)] ring-1 ring-[rgba(212,175,55,.28)]'
                            : 'text-[var(--rhc-secondary-text)] hover:bg-[var(--rhc-surface-secondary)] hover:text-[var(--rhc-heading)]'
                        }`
                  }
                >
                  <span>{label}</span>
                  {!mobile && (
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        current ? 'bg-[var(--rhc-primary)]' : 'bg-transparent'
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminSidebar({ activeHref, capabilities }: { activeHref: string; capabilities?: AdminCapabilities }) {
  const { dataMode } = useRuntime();
  return (
    <aside className="rhc-admin-sidebar fixed hidden h-full w-80 overflow-y-auto border-r border-[var(--rhc-border)] p-6 lg:block">
      <Link
        href="/"
        aria-label="RHC command center"
        className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-[var(--rhc-accent-soft)]"
      >
        <RHCLogoMark size="lg" />
        <div>
          <p className="text-base font-black text-[var(--rhc-heading)]">RHC</p>
          <p className="text-xs text-[var(--rhc-muted)]">Admin operations · RBAC · Audit</p>
        </div>
      </Link>
      <div className="mt-5 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
        <Badge tone="gold">{dataMode === 'demo' ? 'Synthetic demo access' : 'Authenticated access'}</Badge>
        <p className="mt-3 text-xs leading-5 text-[var(--rhc-muted)]">
          Administrative records and actions remain subject to server-enforced permissions.
        </p>
      </div>
      <GroupedAdminNavigation activeHref={activeHref} capabilities={capabilities} />
    </aside>
  );
}

export function AdminShell({
  title,
  activeHref,
  children,
}: {
  title: string;
  activeHref: string;
  children: ReactNode;
}) {
  const { dataMode } = useRuntime();
  const capabilityResource = useAdminCapabilities();
  const capabilities = !capabilityResource.loading && !capabilityResource.error ? capabilityResource.data : undefined;
  const authorized = canAccessAdminRoute(capabilities, activeHref);
  // A successful write triggers background capability refresh before its caller resumes.
  // Keep the workspace instance alive but hidden/inert until fresh authority is confirmed.
  const retainWorkspace = !capabilityResource.error && canAccessAdminRoute(capabilityResource.data, activeHref);
  const availabilityPath = activeHref === '/' ? '/admin/dashboard'
    : ['/verification', '/rhc-digital-ids'].includes(activeHref) ? '/admin/customers'
    : activeHref === '/amica-tower-inventory' ? '/admin/properties'
    : activeHref === '/reports' ? '/admin/audit-logs'
    : '/admin' + activeHref;
  const availability = getRequestAvailability(dataMode, availabilityPath);
  const commandItems = adminNavGroups.flatMap((group) =>
    group.items
      .filter(([, href]) => canAccessAdminRoute(capabilities, href))
      .map(([label, href]) => ({ label, href, group: group.section })),
  );
  return (
    <Web3Shell variant="admin">
      <a className="rhc-skip-link" href="#admin-main-content">
        Skip to main content
      </a>
      <AdminSidebar activeHref={activeHref} capabilities={capabilities} />
      <div className="min-h-screen lg:pl-80">
        <header className="sticky top-0 z-20 border-b border-[var(--rhc-border)] bg-[var(--rhc-bg)] px-5 py-4 backdrop-blur-xl md:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <nav aria-label="Breadcrumb" className="rhc-eyebrow flex items-center gap-2">
                <Link href="/" className="hover:text-[var(--rhc-heading)]">RHC Admin</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{title}</span>
              </nav>
              <h1 className="mt-1 text-2xl font-black text-[var(--rhc-heading)] md:text-3xl">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <CommandMenu label="Navigate" items={commandItems} />
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          <div className="mx-auto mt-4 max-w-7xl lg:hidden">
            <GroupedAdminNavigation activeHref={activeHref} capabilities={capabilities} mobile />
          </div>
        </header>
        <div
          id="admin-main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8"
        >
          <ResourceStatus {...capabilityResource} />
          {capabilities && !authorized ? <EmptyState title="No administrative access" description="Your account has no permission for this module. The API remains authoritative for every resource request." /> : null}
          {retainWorkspace ? <div hidden={capabilityResource.loading} inert={capabilityResource.loading}>{availability.available ? children : <UnavailableFeature unavailable={availability} title={title} />}</div> : null}
        </div>
      </div>
    </Web3Shell>
  );
}

export function AdminModule({
  title,
  resource,
  amicaOnly,
  children,
}: {
  title: string;
  resource: string;
  amicaOnly?: boolean;
  children?: ReactNode;
}) {
  const activeHref = routeFor.get(title) || `/${resource}`;
  return (
    <AdminShell title={title} activeHref={activeHref}>
      {children}
      <Card className="rhc-card-token" title={`${title} Workspace`}>
        <p className="mb-5 text-sm leading-6 text-[var(--rhc-muted)]">
          Search, filter, review, and manage records according to your server-enforced permissions.
        </p>
        <AdminTable resource={resource} amicaOnly={amicaOnly} />
      </Card>
    </AdminShell>
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
  const { dataMode } = useRuntime();
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
              detail={dataMode === 'demo' ? 'Synthetic demo records' : 'Current API records'}
            />
          ))}
        </div>
      )}
    </>
  );
}
