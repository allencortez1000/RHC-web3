'use client';

import { useRef, useState, type FormEvent } from 'react';
import {
  ApiError,
  Card,
  ResourceStatus,
  Web3Button,
  errorMessage,
  usePagedResource,
  useRuntime,
} from '@rhc/ui';

export type ManagementRow = { id: string; [key: string]: unknown };
export type ManagementAction = {
  resource: string;
  mode: 'create' | 'edit' | 'status' | 'permissions' | 'remove' | 'delete-role' | 'setting';
  row?: ManagementRow;
};
type Field = {
  key: string;
  label: string;
  required?: boolean;
  options?: string[];
  source?: string;
  type?: 'datetime-local' | 'checkbox' | 'email';
  max?: number;
  pattern?: string;
  nullable?: boolean;
};
const codePattern = '[A-Z][A-Z0-9_:\\-]{1,79}';
const reviewPattern = '[A-Za-z0-9][A-Za-z0-9._:\\-]{2,119}';
const integrationStatuses = ['NOT_CONFIGURED', 'PREPARED', 'ACTIVE', 'SUSPENDED', 'ERROR'];
const accountStatuses = ['PENDING', 'ACTIVE', 'DISABLED', 'LOCKED'];
const description: Field = { key: 'description', label: 'Description', max: 500, nullable: true };
const company: Field = { key: 'company_id', label: 'Company', source: 'companies', required: true };
const reference: Field = {
  key: 'review_reference',
  label: 'Review reference',
  required: true,
  max: 120,
  pattern: reviewPattern,
};
const metadata: Record<string, Field[]> = {
  projects: [
    { key: 'project_name', label: 'Project name', required: true },
    description,
    { key: 'location', label: 'Location', max: 500, nullable: true },
    {
      key: 'status',
      label: 'Status',
      options: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
    },
    { key: 'start_date', label: 'Start date (UTC)', type: 'datetime-local', nullable: true },
    {
      key: 'target_completion',
      label: 'Target completion (UTC)',
      type: 'datetime-local',
      nullable: true,
    },
  ],
  'customer-properties': [
    {
      key: 'relationship_type',
      label: 'Relationship',
      options: ['RESERVEE', 'BUYER', 'CO_BUYER', 'OWNER', 'TENANT', 'AUTHORIZED_REPRESENTATIVE'],
    },
    { key: 'status', label: 'Status', options: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED'] },
    {
      key: 'effective_from',
      label: 'Effective from (UTC)',
      type: 'datetime-local',
      required: true,
    },
    { key: 'effective_to', label: 'Effective to (UTC)', type: 'datetime-local', nullable: true },
  ],
  roles: [
    { ...company, required: false },
    { key: 'code', label: 'Role code', required: true, max: 80, pattern: codePattern },
    { key: 'name', label: 'Role name', required: true },
    description,
  ],
  integrations: [
    company,
    {
      key: 'integration_key',
      label: 'Integration key',
      required: true,
      max: 80,
      pattern: '[A-Za-z0-9][A-Za-z0-9_.:\\-]{1,79}',
    },
    { key: 'name', label: 'Integration name', required: true },
    { key: 'status', label: 'Status', options: integrationStatuses },
  ],
  'business-services': [
    company,
    { key: 'service_code', label: 'Service code', required: true, max: 80, pattern: codePattern },
    { key: 'service_name', label: 'Service name', required: true },
    { key: 'service_type', label: 'Service type', required: true, max: 80, pattern: codePattern },
    description,
    { key: 'status', label: 'Status', options: ['ACTIVE', 'PREPARED', 'COMING_SOON', 'DISABLED'] },
    { key: 'requires_property', label: 'Requires property', type: 'checkbox' },
    { key: 'requires_resident_status', label: 'Requires resident status', type: 'checkbox' },
    { key: 'integration_status', label: 'Integration status', options: integrationStatuses },
  ],
  'user-roles': [
    { key: 'user_id', label: 'User', source: 'users', required: true },
    { key: 'role_id', label: 'Role', source: 'roles', required: true },
    { ...company, required: false },
    { key: 'project_id', label: 'Project', source: 'projects' },
    { key: 'expires_at', label: 'Expires at (UTC)', type: 'datetime-local' },
    reference,
  ],
};
export const managedSettingFields: Record<string, Field[]> = {
  support_contact: [
    { key: 'email', label: 'Support email', type: 'email', required: true, max: 254 },
  ],
  maintenance_notice: [
    { key: 'enabled', label: 'Notice enabled', type: 'checkbox' },
    { key: 'message', label: 'Notice message', max: 500 },
  ],
  month_1_acceptance_state: [
    {
      key: 'status',
      label: 'Acceptance status',
      options: ['foundation_seeded', 'under_review', 'accepted'],
    },
  ],
};
export const metadataResources = [
  'projects',
  'customer-properties',
  'roles',
  'integrations',
  'business-services',
];
export const createResources = ['roles', 'integrations', 'business-services', 'user-roles'];
export function protectedRole(row: ManagementRow) {
  return Boolean(row.is_system) || ['SUPER_ADMIN', 'CUSTOMER'].includes(String(row.code));
}
function labelFor(row: ManagementRow) {
  return String(
    row.email || row.display_name || row.project_name || row.name || row.code || row.id,
  );
}
function ReferenceField({
  field,
  choices,
}: {
  field: Field;
  choices: Record<string, ManagementRow[] | undefined>;
}) {
  const { user } = useRuntime();
  const resource = usePagedResource<ManagementRow>(
    `/admin/${field.source}`,
    field.source !== 'roles',
  );
  const rows = (resource.data || []).filter((row) =>
    field.source === 'users'
      ? row.id !== user?.id && row.account_status === 'ACTIVE'
      : field.source !== 'roles' || row.code !== 'SUPER_ADMIN',
  );
  choices[field.key] = resource.loading || resource.error ? undefined : rows;
  return (
    <>
      <select
        name={field.key}
        aria-label={field.label}
        required={field.required}
        disabled={resource.loading || Boolean(resource.error)}
        className="mt-2 w-full rounded-lg border p-3"
        defaultValue=""
      >
        <option value="">
          {field.required ? 'Select' : 'None / inferred scope'} {field.label.toLowerCase()}
        </option>
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {labelFor(row)} · {row.id}
          </option>
        ))}
      </select>
      <ResourceStatus {...resource} />
      {resource.hasMore && (
        <Web3Button variant="secondary" disabled={resource.loading} onClick={resource.loadMore}>
          Load more {field.label.toLowerCase()} options
        </Web3Button>
      )}
    </>
  );
}
function PermissionFields({
  row,
  choices,
}: {
  row: ManagementRow;
  choices: Record<string, ManagementRow[] | undefined>;
}) {
  const resource = usePagedResource<ManagementRow>('/admin/permissions', false);
  const grants = Array.isArray(row.role_permissions)
    ? (row.role_permissions as { permission_id: string }[])
    : null;
  choices.permission_ids = resource.error || resource.loading ? undefined : resource.data;
  const missing =
    grants?.filter(
      (grant) => !resource.data?.some((permission) => permission.id === grant.permission_id),
    ) || [];
  return (
    <fieldset>
      <legend className="font-bold">Complete replacement permission set</legend>
      <p className="my-3 text-sm">
        Unchecked permissions will be removed. An empty selection revokes every permission. The API
        checks global role.manage, permission.manage, and your authority to delegate each
        permission.
      </p>
      <ResourceStatus {...resource} />
      {!grants && (
        <p role="alert">
          Current grants were not returned. Refresh the role before replacing permissions.
        </p>
      )}
      {missing.length > 0 && (
        <p role="alert">
          Some current grants are not in the permission catalog. They will be preserved unless you
          cancel and resolve the catalog first.
        </p>
      )}
      {resource.data?.map((permission) => (
        <label key={permission.id} className="my-2 flex gap-2 text-sm">
          <input
            type="checkbox"
            name="permission_ids"
            value={permission.id}
            disabled={resource.loading || Boolean(resource.error) || row.code === 'CUSTOMER'}
            defaultChecked={
              row.code !== 'CUSTOMER' &&
              grants?.some((grant) => grant.permission_id === permission.id)
            }
          />
          {String(permission.code)} — {String(permission.description || '')}
        </label>
      ))}
      {missing.map((grant) => (
        <input
          key={grant.permission_id}
          type="hidden"
          name="permission_ids"
          value={grant.permission_id}
        />
      ))}
    </fieldset>
  );
}
function initialValue(field: Field, row?: ManagementRow | Record<string, unknown>) {
  const value = row?.[field.key];
  if (field.type === 'datetime-local' && value)
    return new Date(String(value)).toISOString().slice(0, -1);
  return String(value ?? field.options?.[0] ?? '');
}

export function ManagementEditor({
  action,
  done,
  cancel,
  refresh,
}: {
  action: ManagementAction;
  done: () => void;
  cancel: () => void;
  refresh: () => void;
}) {
  const { request, user } = useRuntime();
  const { resource, mode, row } = action;
  const [setting, setSetting] = useState(String(row?.key || 'support_contact'));
  const [pending, setPending] = useState<{
    body: Record<string, unknown>;
    summary: [string, string][];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const choices = useRef<Record<string, ManagementRow[] | undefined>>({});
  const isRemoval = mode === 'remove' || mode === 'delete-role';
  let fields = metadata[resource] || [];
  if (mode === 'edit')
    fields = fields.filter(
      (field) => !['company_id', 'code', 'integration_key', 'service_code'].includes(field.key),
    );
  if (mode === 'status')
    fields = [
      { key: 'account_status', label: 'Account status', options: accountStatuses },
      reference,
    ];
  if (isRemoval || mode === 'permissions') fields = [reference];
  if (mode === 'setting') fields = [...(managedSettingFields[setting] || []), reference];
  const initial = mode === 'setting' ? (row?.value as Record<string, unknown> | undefined) : row;
  const title =
    mode === 'status'
      ? 'Change account status'
      : mode === 'permissions'
        ? 'Replace role permissions'
        : mode === 'setting'
          ? 'Set managed setting'
          : isRemoval
            ? `Remove ${resource === 'roles' ? 'role' : 'assignment'}`
            : `${mode === 'edit' ? 'Edit' : 'Create'} ${resource}`;

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || stale) return;
    setError('');
    try {
      const form = new FormData(event.currentTarget);
      const body: Record<string, unknown> = {};
      const summary: [string, string][] = [];
      for (const field of fields) {
        const value = String(form.get(field.key) ?? '').trim();
        if (field.required && !value) throw new Error(`${field.label} is required.`);
        if (field.pattern && !new RegExp(`^(?:${field.pattern})$`).test(value))
          throw new Error(`Invalid ${field.label.toLowerCase()}.`);
        const next =
          field.type === 'checkbox'
            ? form.has(field.key)
            : field.type === 'datetime-local' && value
              ? new Date(`${value}Z`).toISOString()
              : value || (field.nullable ? null : '');
        if (mode === 'edit' && String(row?.[field.key] ?? '') === String(next ?? '')) continue;
        if (
          field.source &&
          (!choices.current[field.key] ||
            (value && !choices.current[field.key]?.some((item) => item.id === value)))
        )
          throw new Error(`Reload the ${field.label.toLowerCase()} options.`);
        if (!value && next === '' && field.key !== 'message') continue;
        body[field.key] = next;
        const selected = field.source
          ? choices.current[field.key]?.find((item) => item.id === next)
          : undefined;
        summary.push([
          field.label,
          selected
            ? `${labelFor(selected)} · ${selected.id}`
            : next === null
              ? 'Clear value'
              : String(next),
        ]);
      }
      if (!Object.keys(body).length) throw new Error('No changes to save.');
      if (mode === 'status') {
        if (!accountStatuses.includes(String(row?.account_status)))
          throw new Error('Refresh the current account status before reviewing.');
        if (body.account_status === row?.account_status) throw new Error('No changes to save.');
        if (row?.id === user?.id && body.account_status !== 'ACTIVE')
          throw new Error('Self-disable is not allowed.');
        body.expected_status = row?.account_status;
        summary.unshift(['Expected account status', String(row?.account_status)]);
      }
      if (mode === 'permissions') {
        if (!Array.isArray(row?.role_permissions) || !choices.current.permission_ids)
          throw new Error('Load the current grants and permission catalog before reviewing.');
        body.permission_ids = [...new Set(form.getAll('permission_ids').map(String))];
        if ((body.permission_ids as string[]).length > 200)
          throw new Error('At most 200 permissions can be selected.');
        summary.unshift([
          'Replacement permissions',
          (body.permission_ids as string[])
            .map((id) =>
              String(choices.current.permission_ids?.find((item) => item.id === id)?.code || id),
            )
            .join(', ') || 'None — revoke all permissions',
        ]);
      }
      if (
        resource === 'roles' &&
        body.code &&
        ['CUSTOMER', 'SUPER_ADMIN'].includes(String(body.code))
      )
        throw new Error('Reserved role code.');
      if (resource === 'projects' || resource === 'customer-properties') {
        const startKey = resource === 'projects' ? 'start_date' : 'effective_from';
        const endKey = resource === 'projects' ? 'target_completion' : 'effective_to';
        const start = body[startKey] === undefined ? row?.[startKey] : body[startKey];
        const end = body[endKey] === undefined ? row?.[endKey] : body[endKey];
        if (
          start &&
          end &&
          (resource === 'projects'
            ? new Date(String(end)) < new Date(String(start))
            : new Date(String(end)) <= new Date(String(start)))
        )
          throw new Error('End must follow the start (project dates may be equal).');
      }
      if (resource === 'user-roles' && mode === 'create') {
        if (body.expires_at && new Date(String(body.expires_at)) <= new Date())
          throw new Error('Expiry must be in the future.');
        const role = choices.current.role_id?.find((item) => item.id === body.role_id);
        const project = choices.current.project_id?.find((item) => item.id === body.project_id);
        const scope = body.company_id || role?.company_id || project?.company_id;
        if (
          (role?.company_id && scope !== role.company_id) ||
          (project && scope !== project.company_id)
        )
          throw new Error('Role/project company scope mismatch.');
        summary.push(
          ['Effective company scope', String(scope || 'Global')],
          ['Project scope', String(body.project_id || 'All projects in company / global')],
          ['Expiry', String(body.expires_at || 'No expiry')],
        );
      }
      if (mode === 'setting') {
        const { review_reference, ...value } = body;
        setPending({
          body: { value, review_reference },
          summary: [['Setting key', setting], ...summary],
        });
      } else setPending({ body, summary });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function confirm() {
    if (!pending || submitting.current || stale) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    const suffix =
      mode === 'setting'
        ? `/${encodeURIComponent(setting)}`
        : row
          ? `/${encodeURIComponent(row.id)}${mode === 'status' ? '/status' : mode === 'permissions' ? '/permissions' : ''}`
          : '';
    try {
      await request(`/admin/${resource}${suffix}`, {
        method: isRemoval
          ? 'DELETE'
          : mode === 'setting' || mode === 'permissions'
            ? 'PUT'
            : mode === 'create'
              ? 'POST'
              : 'PATCH',
        body: JSON.stringify(pending.body),
      });
      done();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setStale(true);
        refresh();
        setError(
          'The record changed or is no longer eligible. Cancel and review the refreshed records before trying again. No change was confirmed.',
        );
      } else setError(errorMessage(cause));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Card title={title} className="mb-5">
      {row && (
        <p className="my-3 break-words text-sm">
          Target: {labelFor(row)} · {row.id}
        </p>
      )}
      {mode === 'remove' && row && (
        <dl aria-label="Assignment under review" className="my-3 grid gap-3 text-sm md:grid-cols-2">
          {(
            [
              ['User ID', row.user_id],
              ['Role', (row.role as { name?: string } | undefined)?.name || row.role_id],
              ['Company scope', row.company_id || 'Global'],
              ['Project scope', row.project_id || 'All projects in company / global'],
              ['Expiry', row.expires_at || 'No expiry'],
            ] as [string, unknown][]
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="font-bold">{label}</dt>
              <dd className="break-words">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="my-3 text-sm text-[var(--rhc-muted)]">
        The API is the authority for permissions and eligibility. List access does not grant write
        access.{' '}
        {['status', 'permissions', 'remove', 'delete-role'].includes(mode) ||
        resource === 'user-roles'
          ? 'Global governance permissions are required. Protected bootstrap roles and assignments require the operator workflow.'
          : ''}
      </p>
      {mode === 'status' && (
        <p className="my-3 text-sm">
          Activation requires a confirmed linked identity, checked by the API. This does not approve
          business verification or issue an RHC ID.
        </p>
      )}
      {resource === 'user-roles' && mode === 'create' && (
        <p className="my-3 text-sm">
          Only other ACTIVE users are listed; confirmed linked identity is checked by the API. Blank
          company scope is inferred from role/project, or global if both are absent. To change an
          assignment’s expiry, remove it and create a new assignment.
        </p>
      )}
      {mode === 'setting' && (
        <p className="my-3 text-sm">
          Only display/contact/acceptance metadata is writable. No security, authentication,
          billing, or runtime feature settings.
        </p>
      )}
      <form onSubmit={review} hidden={Boolean(pending)}>
        <fieldset disabled={busy || stale}>
          {mode === 'setting' && (
            <label className="block text-sm">
              Setting key
              <select
                aria-label="Setting key"
                value={setting}
                disabled={Boolean(row)}
                onChange={(event) => setSetting(event.target.value)}
                className="mt-2 w-full rounded-lg border p-3"
              >
                {Object.keys(managedSettingFields).map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
            </label>
          )}
          {mode === 'permissions' && row && (
            <PermissionFields row={row} choices={choices.current} />
          )}
          <div key={setting} className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className="block text-sm">
                {field.label}
                {field.source ? (
                  <ReferenceField field={field} choices={choices.current} />
                ) : field.options ? (
                  <select
                    name={field.key}
                    aria-label={field.label}
                    defaultValue={initialValue(field, initial)}
                    className="mt-2 w-full rounded-lg border p-3"
                  >
                    {field.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.key}
                    type={field.type || 'text'}
                    required={field.required}
                    maxLength={field.max || 160}
                    pattern={field.pattern}
                    step={field.type === 'datetime-local' ? 'any' : undefined}
                    defaultChecked={
                      field.type === 'checkbox' ? Boolean(initial?.[field.key]) : undefined
                    }
                    defaultValue={
                      field.type === 'checkbox' ? undefined : initialValue(field, initial)
                    }
                    className={
                      field.type === 'checkbox' ? 'ml-3' : 'mt-2 w-full rounded-lg border p-3'
                    }
                  />
                )}
              </label>
            ))}
          </div>
          {fields.some((field) => field.key === 'review_reference') && (
            <p className="my-3 text-xs">
              Use an existing review/ticket reference, not sensitive evidence. 3–120 characters:
              letters, numbers, periods, underscores, colons, hyphens; start with a letter or
              number.
            </p>
          )}
          <Web3Button type="submit">Review changes</Web3Button>
        </fieldset>
      </form>
      {pending && (
        <section aria-label="Confirm reviewed changes">
          <h3 className="my-3 font-bold">Review before confirming</h3>
          {isRemoval && (
            <p className="my-3">
              This removes the{' '}
              {mode === 'remove'
                ? 'assignment and its access grant'
                : 'role, only if it has no assignments'}
              . This cannot be undone here.
            </p>
          )}
          <dl className="my-4 space-y-2 text-sm">
            {pending.summary.map(([label, value]) => (
              <div key={label}>
                <dt className="font-bold">{label}</dt>
                <dd className="break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-3">
            <Web3Button disabled={busy || stale} onClick={confirm}>
              {busy ? 'Saving…' : 'Confirm changes'}
            </Web3Button>
            <Web3Button
              variant="secondary"
              disabled={busy || stale}
              onClick={() => {
                setPending(null);
                setError('');
              }}
            >
              Back to edit
            </Web3Button>
          </div>
        </section>
      )}
      {error && (
        <p role="alert" className="my-4">
          {error}
        </p>
      )}
      <Web3Button variant="secondary" disabled={busy} onClick={cancel}>
        Cancel
      </Web3Button>
    </Card>
  );
}
