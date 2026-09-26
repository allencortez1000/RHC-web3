export type EffectiveGrant = {
  company_id: string | null;
  project_id: string | null;
};

export type GrantMap = Record<string, readonly EffectiveGrant[] | undefined>;

export type ScopeTarget = {
  company_id: string | null;
  project_id: string | null;
};

export type AdminCapabilities = {
  permissions: string[];
  grants: GrantMap;
  mutation_permissions?: string[];
  mutation_grants?: GrantMap;
  modules?: Array<{ path: string; permission: string; usable: boolean }>;
};

const globalTarget: ScopeTarget = { company_id: null, project_id: null };

function scopeValue(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}

function asScope(value: unknown): ScopeTarget | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const company_id = scopeValue(record.company_id);
  const project_id = scopeValue(record.project_id);
  if (company_id === undefined || project_id === undefined) return null;
  return { company_id, project_id };
}

export function globalScope(): ScopeTarget {
  return { ...globalTarget };
}

export function grantCoversTarget(grant: unknown, target: ScopeTarget | null): boolean {
  const effectiveGrant = asScope(grant);
  if (!effectiveGrant || !target) return false;

  // A global grant may cover a scoped resource, but a scoped grant may never
  // be treated as a global wildcard.
  if (effectiveGrant.company_id === null && effectiveGrant.project_id === null) return true;

  if (target.project_id !== null) {
    if (effectiveGrant.project_id !== null) {
      return effectiveGrant.project_id === target.project_id &&
        (effectiveGrant.company_id === null || effectiveGrant.company_id === target.company_id);
    }
    return effectiveGrant.company_id === target.company_id;
  }

  if (target.company_id !== null) {
    return effectiveGrant.project_id === null &&
      effectiveGrant.company_id === target.company_id;
  }

  return false;
}

export function hasEffectiveGrant(
  capabilities: AdminCapabilities | undefined,
  permission: string,
  target: ScopeTarget | null = globalTarget,
  mutation = true,
): boolean {
  const grants = (mutation ? capabilities?.mutation_grants : capabilities?.grants)?.[permission];
  return Array.isArray(grants) && grants.some((grant) => grantCoversTarget(grant, target));
}

export function hasEveryEffectiveGrant(
  capabilities: AdminCapabilities | undefined,
  permissions: readonly string[],
  target: ScopeTarget | null,
  mutation = true,
): boolean {
  return permissions.every((permission) => hasEffectiveGrant(capabilities, permission, target, mutation));
}

export function hasAnyEffectiveGrant(
  capabilities: AdminCapabilities | undefined,
  permission: string,
  mutation = true,
): boolean {
  const grants = (mutation ? capabilities?.mutation_grants : capabilities?.grants)?.[permission];
  return Array.isArray(grants) && grants.some((grant) => asScope(grant) !== null);
}

export function hasRequiredMutationGrants(
  capabilities: AdminCapabilities | undefined,
  permissions: readonly string[],
  target: ScopeTarget | null,
): boolean {
  return permissions.every((permission) => hasEffectiveGrant(capabilities, permission, target));
}

export function requiredMutationPermissions(
  resource: string,
  action: string,
  body?: Record<string, unknown>,
): readonly string[] {
  switch (`${resource}:${action}`) {
    case 'companies:create':
    case 'companies:edit':
      return ['company.manage'];
    case 'projects:create':
      return ['project.create'];
    case 'projects:edit':
      return ['project.edit'];
    case 'properties:create':
      return body?.status !== undefined && body.status !== 'AVAILABLE'
        ? ['property.create', 'property.change_status']
        : ['property.create'];
    case 'properties:edit':
      return body?.status !== undefined
        ? ['property.edit', 'property.change_status']
        : ['property.edit'];
    case 'properties:change_status':
      return ['property.change_status'];
    case 'customer-properties:create':
    case 'customer-properties:edit':
    case 'customer-properties:manage':
      return ['customer_property.manage'];
    case 'reservations:create':
      return ['reservation.create'];
    case 'reservations:manage':
      return ['reservation.manage'];
    case 'reservations:cancel':
      return ['reservation.cancel'];
    case 'integrations:create':
    case 'integrations:edit':
    case 'integrations:manage':
    case 'business-services:create':
    case 'business-services:edit':
    case 'business-services:manage':
      return ['integration.manage'];
    case 'roles:create':
    case 'roles:edit':
    case 'roles:manage':
    case 'roles:remove':
    case 'roles:delete-role':
      return ['role.manage'];
    case 'roles:permissions':
      return ['role.manage', 'permission.manage'];
    case 'user-roles:create':
    case 'user-roles:manage':
    case 'user-roles:remove':
      return ['role.manage', 'user.manage'];
    case 'users:status':
    case 'users:manage':
    case 'customers:manage':
      return ['user.manage'];
    case 'feature-flags:manage':
      return ['feature_flag.manage'];
    case 'system-settings:setting':
    case 'system-settings:manage':
      return ['system_settings.manage'];
    default:
      return [];
  }
}

export function hasAnyCompanyLevelGrant(
  capabilities: AdminCapabilities | undefined,
  permission: string,
): boolean {
  const grants = capabilities?.mutation_grants?.[permission];
  return Array.isArray(grants) && grants.some((grant) => {
    const scope = asScope(grant);
    return scope !== null && scope.project_id === null;
  });
}

function rowValue(row: Record<string, unknown>, key: string): unknown {
  return row[key];
}

function nestedId(value: unknown): string | null {
  return value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string'
    ? (value as { id: string }).id
    : null;
}

function nestedCompanyId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.company_id === 'string') return record.company_id;
  return nestedId(record.company);
}

export function targetForResource(resource: string, row: Record<string, unknown>): ScopeTarget | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const resourceProject = rowValue(row, 'project');
  const resourceProperty = rowValue(row, 'property');
  const project = resourceProject || (
    resourceProperty && typeof resourceProperty === 'object'
      ? rowValue(resourceProperty as Record<string, unknown>, 'project')
      : undefined
  );
  const company_id = typeof rowValue(row, 'company_id') === 'string'
    ? String(rowValue(row, 'company_id'))
    : nestedCompanyId(rowValue(row, 'company')) ||
      nestedCompanyId(resourceProject) ||
      nestedCompanyId(project);
  const project_id = typeof rowValue(row, 'project_id') === 'string'
    ? String(rowValue(row, 'project_id'))
    : nestedId(resourceProject) || nestedId(project);

  switch (resource) {
    case 'companies':
      return id ? { company_id: id, project_id: null } : null;
    case 'projects':
      return id && company_id ? { company_id, project_id: id } : null;
    case 'properties':
    case 'reservations':
      return project_id && company_id ? { company_id, project_id } : null;
    case 'customer-properties': {
      const property = rowValue(row, 'property');
      const relationshipProject = property && typeof property === 'object'
        ? property as Record<string, unknown>
        : row;
      const relationshipProjectId = typeof row.property_project_id === 'string'
        ? row.property_project_id
        : typeof relationshipProject.project_id === 'string'
          ? relationshipProject.project_id
          : nestedId(relationshipProject.project);
      const relationshipCompanyId = typeof row.property_company_id === 'string'
        ? row.property_company_id
        : nestedCompanyId(relationshipProject.project) ||
          (typeof relationshipProject.company_id === 'string' ? relationshipProject.company_id : null);
      return relationshipProjectId && relationshipCompanyId
        ? { company_id: relationshipCompanyId, project_id: relationshipProjectId }
        : null;
    }
    case 'integrations':
    case 'business-services':
      return company_id ? { company_id, project_id: null } : null;
    default:
      return globalScope();
  }
}

export function targetForReference(source: string | undefined, row: Record<string, unknown>): ScopeTarget | null {
  if (!source) return null;
  return targetForResource(source, row);
}

export function resourceMutationAllowed(
  capabilities: AdminCapabilities | undefined,
  resource: string,
  action: string,
  row?: Record<string, unknown>,
  target?: ScopeTarget | null,
): boolean {
  const resolvedTarget = target === undefined
    ? row
      ? targetForResource(resource, row)
      : globalScope()
    : target;

  switch (`${resource}:${action}`) {
    case 'companies:create':
      return hasEffectiveGrant(capabilities, 'company.manage', globalTarget);
    case 'companies:edit':
      return hasEffectiveGrant(capabilities, 'company.manage', resolvedTarget);
    case 'projects:create':
      return hasAnyCompanyLevelGrant(capabilities, 'project.create');
    case 'projects:edit':
      return hasEffectiveGrant(capabilities, 'project.edit', resolvedTarget);
    case 'properties:create':
      return hasAnyEffectiveGrant(capabilities, 'property.create');
    case 'properties:edit':
      return hasEffectiveGrant(capabilities, 'property.edit', resolvedTarget);
    case 'properties:change_status':
      return hasEffectiveGrant(capabilities, 'property.change_status', resolvedTarget);
    case 'customer-properties:manage':
      return hasEffectiveGrant(capabilities, 'customer_property.manage', resolvedTarget);
    case 'reservations:create':
      return hasEffectiveGrant(capabilities, 'reservation.create', resolvedTarget);
    case 'reservations:manage':
      return hasEffectiveGrant(capabilities, 'reservation.manage', resolvedTarget);
    case 'reservations:cancel':
      return hasEffectiveGrant(capabilities, 'reservation.cancel', resolvedTarget);
    case 'integrations:create':
    case 'business-services:create':
      return hasAnyCompanyLevelGrant(capabilities, 'integration.manage');
    case 'integrations:manage':
    case 'business-services:manage':
      return hasEffectiveGrant(capabilities, 'integration.manage', resolvedTarget);
    case 'roles:manage':
      return hasEffectiveGrant(capabilities, 'role.manage', globalTarget);
    case 'roles:permissions':
      return hasEveryEffectiveGrant(capabilities, ['role.manage', 'permission.manage'], globalTarget);
    case 'user-roles:manage':
      return hasEveryEffectiveGrant(capabilities, ['role.manage', 'user.manage'], globalTarget);
    case 'users:manage':
    case 'customers:manage':
      return hasEffectiveGrant(capabilities, 'user.manage', globalTarget);
    case 'feature-flags:manage':
      return hasEffectiveGrant(capabilities, 'feature_flag.manage', globalTarget);
    case 'system-settings:manage':
      return hasEffectiveGrant(capabilities, 'system_settings.manage', globalTarget);
    default:
      return false;
  }
}

export function referenceIsAuthorized(
  capabilities: AdminCapabilities | undefined,
  fieldPermission: string | undefined,
  source: string | undefined,
  row: Record<string, unknown>,
): boolean {
  if (!fieldPermission) return true;
  const target = targetForReference(source, row);
  return target !== null && hasEffectiveGrant(capabilities, fieldPermission, target);
}
