import { createHash, randomUUID } from 'node:crypto';
import {
  DEMO_PERSONAS,
  type DemoAccount,
  type DemoApplication,
  type DemoPersona,
  type DemoProperty,
  type DemoUser,
  type DemoWorld,
} from '@rhc/types';
import {
  DemoStoreError,
  applyDemoRequestControls,
  authenticateDemoSession,
  createDemoSession,
  mutateDemoWorld,
  readDemoWorld,
  resetDemoWorld,
  revokeDemoSession,
  demoRequestContext,
  withDemoRequestContext,
} from './store';
import { createSyntheticWeb3ReadResult } from './web3-fixture';

type DispatchInput = {
  segments: string[];
  method: string;
  token: string | null;
  url: URL;
  body: unknown;
  expectedRevision?: number;
  requestId?: string;
};

type DispatchResult = { data: unknown; world: DemoWorld };

const customerStatuses = new Set(['PENDING', 'CONFIRMED']);
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const consentPolicies = [
  { consent_type: 'PRIVACY_POLICY', purpose: 'Account privacy processing', description: 'Synthetic privacy policy for the local demonstration only.', required: true, company_required: false },
  { consent_type: 'TERMS', purpose: 'Account terms', description: 'Synthetic terms for demonstrating versioned decisions.', required: true, company_required: false },
  { consent_type: 'MARKETING', purpose: 'Optional marketing communications', description: 'Optional synthetic communications preference.', required: false, company_required: false },
  { consent_type: 'DATA_SHARING', purpose: 'Company-scoped service data sharing', description: 'Optional permission scoped to one participating company.', required: false, company_required: true },
  { consent_type: 'COMPANY_SERVICE', purpose: 'Company service participation', description: 'Optional service permission scoped to one company.', required: false, company_required: true },
] as const;
const mutableCollections: Record<string, keyof DemoWorld> = {
  companies: 'companies',
  projects: 'projects',
  properties: 'properties',
  'customer-properties': 'property_links',
  roles: 'roles',
  'user-roles': 'user_roles',
  integrations: 'integrations',
  'business-services': 'business_services',
};
const adminReadPermissions: Record<string, string> = {
  customers: 'customer.view',
  users: 'user.view',
  companies: 'company.view',
  projects: 'project.view',
  properties: 'property.view',
  reservations: 'reservation.view',
  'customer-properties': 'customer_property.view',
  'business-services': 'integration.view',
  integrations: 'integration.view',
  'audit-logs': 'audit.view',
  roles: 'role.view',
  permissions: 'permission.view',
  'user-roles': 'role.view',
  'feature-flags': 'feature_flag.view',
  'system-settings': 'system_settings.view',
  payments: 'customer.view',
  documents: 'customer.view',
  certificates: 'customer.view',
  'service-requests': 'integration.view',
  'rewards-ledger': 'customer.view',
};

function adminMutationPermission(resource: string, method: string) {
  if (resource === 'companies') return 'company.manage';
  if (resource === 'projects') return method === 'POST' ? 'project.create' : 'project.edit';
  if (resource === 'properties') return method === 'POST' ? 'property.create' : 'property.edit';
  if (resource === 'customer-properties') return 'customer_property.manage';
  if (resource === 'roles' || resource === 'user-roles') return 'role.manage';
  if (resource === 'integrations' || resource === 'business-services') return 'integration.manage';
  return undefined;
}

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new DemoStoreError(400, 'INVALID_BODY', 'A JSON object is required.');
  }
  return body as Record<string, unknown>;
}

function cleanAccount(user: DemoUser): DemoAccount {
  // Fixture administration must never redefine the capabilities of a login persona.
  const persona = DEMO_PERSONAS.find((candidate) => candidate.userId === user.id);
  return {
    id: user.id,
    email: user.email,
    account_status: user.account_status,
    verification_status: user.verification_status,
    auth_email_confirmed_at: user.auth_email_confirmed_at,
    role: persona?.role ?? user.role,
    roles: persona ? [persona.role] : user.roles,
    is_admin: persona ? persona.application === 'admin' : user.is_admin,
    permissions: persona?.permissions ?? user.permissions,
    company_ids: persona?.companyIds ?? user.company_ids,
    project_ids: persona?.projectIds ?? user.project_ids,
  };
}

function currentUser(world: DemoWorld, persona: DemoPersona): DemoUser {
  const user = world.users.find((candidate) => candidate.id === persona.userId);
  if (!user) throw new DemoStoreError(401, 'PERSONA_USER_MISSING', 'The demo persona is not connected to a fixture user.');
  return user;
}

function demoCredentialPersonas() {
  return [
    {
      email: process.env.RHC_DEMO_CUSTOMER_EMAIL || 'demo@rhc.local',
      password: process.env.RHC_DEMO_CUSTOMER_PASSWORD || 'Demo123456!',
      personaId: process.env.RHC_DEMO_CUSTOMER_PERSONA || 'customer-maya',
    },
    {
      email: process.env.RHC_DEMO_ADMIN_EMAIL || 'superadmin@example.com',
      password: process.env.RHC_DEMO_ADMIN_PASSWORD || 'Demo123456!',
      personaId: process.env.RHC_DEMO_ADMIN_PERSONA || 'system-admin',
    },
  ];
}

async function createSessionResponse(personaId: string) {
  const { token, persona, world } = await createDemoSession(personaId);
  const user = currentUser(world, persona);
  return {
    data: {
      session: { access_token: token, user: { id: user.id, email: user.email } },
      account: cleanAccount(user),
      target: persona.application,
    },
    world,
  };
}

function assertCustomer(persona: DemoPersona) {
  if (persona.application !== 'customer' || !persona.customerId) {
    throw new DemoStoreError(403, 'CUSTOMER_REQUIRED', 'This operation requires a customer persona.');
  }
}

function assertAdmin(persona: DemoPersona, permission?: string, write = false) {
  if (persona.application !== 'admin') {
    throw new DemoStoreError(403, 'ADMIN_REQUIRED', 'This operation requires an authorized staff persona.');
  }
  if (write && (persona.readOnly || persona.role === 'AUDITOR')) {
    throw new DemoStoreError(403, 'READ_ONLY_PERSONA', 'The auditor persona is read-only. No demo record was changed.');
  }
  if (permission && !persona.permissions.includes(permission)) {
    throw new DemoStoreError(403, 'PERMISSION_DENIED', `The ${permission} capability is required.`);
  }
}

type Scope = { companyId: string; projectId?: string };
type Row = Record<string, unknown>;

function isGlobal(persona: DemoPersona) {
  return persona.application === 'admin' &&
    ((persona.id === 'system-admin' && persona.role === 'SYSTEM_ADMIN') ||
      (persona.id === 'auditor' && persona.role === 'AUDITOR')) &&
    persona.companyIds.length === 0 && persona.projectIds.length === 0;
}

function canSeeCompany(persona: DemoPersona, companyId?: string | null) {
  return isGlobal(persona) || Boolean(companyId && persona.companyIds.includes(companyId));
}

function canSeeScope(persona: DemoPersona, scope: Scope) {
  return canSeeCompany(persona, scope.companyId) &&
    (!scope.projectId || !persona.projectIds.length || persona.projectIds.includes(scope.projectId));
}

function projectScope(world: DemoWorld, id: unknown): Scope[] {
  const project = world.projects.find((item) => item.id === id);
  return project && world.companies.some((item) => item.id === project.company_id)
    ? [{ companyId: project.company_id, projectId: project.id }] : [];
}

function propertyScope(world: DemoWorld, id: unknown): Scope[] {
  return projectScope(world, world.properties.find((item) => item.id === id)?.project_id);
}

function uniqueScopes(scopes: Scope[]) {
  return scopes.filter((scope, index) => scopes.findIndex((other) =>
    other.companyId === scope.companyId && other.projectId === scope.projectId) === index);
}

function identityScope(world: DemoWorld): Scope[] {
  const issuer = world.companies.find((company) => company.company_code === 'RHC');
  return issuer ? [{ companyId: issuer.id }] : [];
}

function customerScopes(world: DemoWorld, id: unknown): Scope[] {
  const customer = world.users.find((user) => user.id === id && !user.is_admin);
  if (!customer) return [];
  const scopes = [
    ...world.property_links.filter((item) => item.customer_id === id).flatMap((item) => propertyScope(world, item.property_id)),
    ...world.reservations.filter((item) => item.customer_id === id).flatMap((item) => propertyScope(world, item.property_id)),
    ...world.service_requests.filter((item) => item.customer_id === id).flatMap((item) => explicitScopes(world, item, true)),
  ];
  if (customer.profile.rhc_id || world.documents.some((item) => item.customer_id === id && item.category === 'Identity') ||
    world.certificates.some((item) => item.customer_id === id && item.type.includes('Customer Verification'))) {
    scopes.push(...identityScope(world));
  }
  return uniqueScopes(scopes);
}

function explicitScopes(world: DemoWorld, record: Row, service = false): Scope[] {
  if (record.property_id != null) {
    const scopes = propertyScope(world, record.property_id);
    return scopes.filter((scope) => (!record.company_id || service || record.company_id === scope.companyId) &&
      (!record.project_id || record.project_id === scope.projectId))
      .map((scope) => service && typeof record.company_id === 'string' ? { ...scope, companyId: record.company_id } : scope);
  }
  if (record.project_id != null) {
    const scopes = projectScope(world, record.project_id);
    return scopes.filter((scope) => !record.company_id || service || record.company_id === scope.companyId)
      .map((scope) => service && typeof record.company_id === 'string' ? { ...scope, companyId: record.company_id } : scope);
  }
  return world.companies.some((item) => item.id === record.company_id)
    ? [{ companyId: record.company_id as string }] : [];
}

function activePropertyLink(world: DemoWorld, link: DemoWorld['property_links'][number]) {
  const now = Date.parse(world.controls.clock);
  return link.status === 'ACTIVE' && Date.parse(link.effective_from) <= now &&
    (!link.effective_to || Date.parse(link.effective_to) > now);
}

function serviceEligibility(world: DemoWorld, customerId: string, serviceId: string) {
  const service = world.business_services.find((item) => item.id === serviceId);
  if (!service) throw new DemoStoreError(404, 'SERVICE_NOT_FOUND', 'Service not found.');
  if (!['ACTIVE', 'PREPARED'].includes(String(service.status)) || !['ACTIVE', 'PREPARED'].includes(String(service.integration_status))) {
    throw new DemoStoreError(409, 'SERVICE_UNAVAILABLE', 'This service is not available for local demo requests.');
  }
  const links = world.property_links.filter((link) => link.customer_id === customerId && activePropertyLink(world, link));
  const scopes = uniqueScopes(links.flatMap((link) => propertyScope(world, link.property_id)));
  if ((service.requires_resident_status || service.requires_property) && scopes.length !== 1) {
    throw new DemoStoreError(403, 'SERVICE_ELIGIBILITY_REQUIRED', 'This demo service requires one unambiguous active customer-property project.');
  }
  return { service, projectId: scopes.length === 1 ? scopes[0].projectId : undefined };
}

function customerOwnsProperty(world: DemoWorld, customerId: unknown, propertyId: unknown) {
  return propertyScope(world, propertyId).length > 0 && (
    world.property_links.some((item) => item.customer_id === customerId && item.property_id === propertyId &&
      activePropertyLink(world, item)) ||
    world.reservations.some((item) => item.customer_id === customerId && item.property_id === propertyId &&
      (item.status === 'CONVERTED' || customerStatuses.has(item.status) && Date.parse(item.expires_at) > Date.parse(world.controls.clock))));
}

function assertCustomerProperty(world: DemoWorld, customerId: unknown, propertyId: unknown) {
  if (typeof propertyId !== 'string' || !propertyId || !customerOwnsProperty(world, customerId, propertyId)) {
    throw new DemoStoreError(403, 'PROPERTY_SCOPE_DENIED', 'An active customer relationship to this property is required.');
  }
}

function certificateSource(world: DemoWorld, record: Row): Scope[] {
  if (typeof record.linked_record !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(record.linked_record)) return [];
  const reference = record.linked_record;
  const property = world.properties.find((item) => item.id === reference || item.property_code === reference);
  if (property) return customerOwnsProperty(world, record.customer_id, property.id) ? propertyScope(world, property.id) : [];
  const sources: Array<[string, Row[]]> = [
    ['documents', world.documents], ['payments', world.payments], ['reservations', world.reservations],
    ['turnover', world.turnover_cases], ['service-requests', world.service_requests],
  ];
  for (const [resource, rows] of sources) {
    const source = rows.find((item) => [item.id, item.reference, item.reservation_number, item.case_number].includes(reference));
    if (source) return source.customer_id === record.customer_id ? recordScopes(world, resource, source) : [];
  }
  const customer = world.users.find((item) => item.id === record.customer_id && !item.is_admin);
  if (!customer) return [];
  if (String(record.type).includes('Customer Verification')) {
    return reference === customer.profile.rhc_id ||
      (reference.startsWith('IDENTITY-REVIEW-DEMO-') && world.documents.some((item) => item.customer_id === customer.id && item.category === 'Identity'))
      ? identityScope(world) : [];
  }
  // Opaque external business references remain supported, but cannot masquerade as missing fixture IDs.
  if (/^(property|project|document|payment|reservation|service-request|usr|certificate|turnover)-/i.test(reference)) return [];
  const scopes = customerScopes(world, customer.id).filter((scope) => scope.projectId);
  return scopes.length === 1 ? scopes : [];
}

function recordScopes(world: DemoWorld, resource: string, record: Row): Scope[] {
  if (resource === 'companies') return explicitScopes(world, { company_id: record.id });
  if (resource === 'projects') return projectScope(world, record.id);
  if (resource === 'users' || resource === 'customers') {
    const user = world.users.find((item) => item.id === record.id);
    if (!user) return [];
    if (!user.is_admin) return customerScopes(world, user.id);
    const account = cleanAccount(user);
    const scopes = account.project_ids.flatMap((id) => projectScope(world, id)).filter((scope) => account.company_ids.includes(scope.companyId));
    return uniqueScopes([...scopes, ...account.company_ids.filter((id) => !world.projects.some((project) => project.company_id === id))
      .flatMap((id) => explicitScopes(world, { company_id: id }))]);
  }
  if (resource === 'identity') return world.users.some((item) => item.id === record.id && !item.is_admin) ? identityScope(world) : [];
  if (resource === 'certificates') return certificateSource(world, record);
  if (resource === 'documents' && record.category === 'Identity' && record.property_id == null) {
    return world.users.some((item) => item.id === record.customer_id && !item.is_admin) ? identityScope(world) : [];
  }
  if (resource === 'audit-logs') return explicitScopes(world, record);
  if (resource === 'service-requests') {
    const service = world.business_services.find((item) => item.id === record.service_id && item.company_id === record.company_id);
    if (!service || !world.users.some((item) => item.id === record.customer_id && !item.is_admin)) return [];
    if (record.property_id != null || record.project_id != null) return explicitScopes(world, record, true);
    const projects = uniqueScopes([
      ...world.property_links.filter((item) => item.customer_id === record.customer_id).flatMap((item) => propertyScope(world, item.property_id)),
      ...world.reservations.filter((item) => item.customer_id === record.customer_id).flatMap((item) => propertyScope(world, item.property_id)),
    ]);
    return projects.length === 1 ? projects.map((scope) => ({ ...scope, companyId: service.company_id })) : [];
  }
  if (record.customer_id != null && !world.users.some((item) => item.id === record.customer_id && !item.is_admin)) return [];
  if (record.property_id != null || record.project_id != null || record.company_id != null) return explicitScopes(world, record);
  if (resource === 'documents' || resource === 'rewards-ledger') {
    const scopes = customerScopes(world, record.customer_id).filter((scope) => scope.projectId);
    return scopes.length === 1 ? scopes : [];
  }
  return [];
}

function canSeeRecord(world: DemoWorld, persona: DemoPersona, resource: string, record: Row) {
  const scopes = recordScopes(world, resource, record);
  return isGlobal(persona) || scopes.some((scope) => canSeeScope(persona, scope));
}

function assertAdminRecordScope(world: DemoWorld, persona: DemoPersona, resource: string, record: Row) {
  if (!canSeeRecord(world, persona, resource, record)) {
    throw new DemoStoreError(403, 'SCOPE_DENIED', 'This record is outside the current operator company or project scope.');
  }
}

function userView(world: DemoWorld, persona: DemoPersona, user: DemoUser) {
  const account = cleanAccount(user);
  return { ...account, company_ids: account.company_ids.filter((id) => canSeeCompany(persona, id)),
    project_ids: account.project_ids.filter((id) => projectScope(world, id).some((scope) => canSeeScope(persona, scope))),
    profile: { ...user.profile }, created_at: user.created_at, updated_at: user.updated_at };
}

function customerSummary(world: DemoWorld, persona: DemoPersona | undefined, id: string) {
  const user = world.users.find((item) => item.id === id && !item.is_admin);
  return user && (!persona || canSeeRecord(world, persona, 'customers', user))
    ? { id: user.id, email: user.email, profile: { first_name: user.profile.first_name, last_name: user.profile.last_name } } : undefined;
}

function scopedKey(persona: DemoPersona, action: string, customerId: string, key: unknown, payload: Row) {
  if (typeof key !== 'string' || !key.trim() || key.length > 200) {
    throw new DemoStoreError(400, 'IDEMPOTENCY_REQUIRED', 'A non-empty idempotency key up to 200 characters is required.');
  }
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) :
    value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
  const data = Object.fromEntries(Object.entries(payload).filter(([field]) => field !== 'idempotency_key'));
  return `idem:${sha256(JSON.stringify([persona.userId, customerId, action, key]))}:${sha256(JSON.stringify(canonical(data)))}`;
}

function findDuplicate<T>(rows: T[], key: string, getKey: (row: T) => string) {
  const namespace = key.slice(0, key.lastIndexOf(':') + 1);
  const existing = rows.find((row) => getKey(row).startsWith(namespace));
  if (existing && getKey(existing) !== key) throw new DemoStoreError(409, 'IDEMPOTENCY_CONFLICT', 'This command key was already used with a different payload.');
  return existing;
}

function projectWithCompany(world: DemoWorld, projectId: string) {
  const project = world.projects.find((candidate) => candidate.id === projectId);
  if (!project) return undefined;
  const company = world.companies.find((candidate) => candidate.id === project.company_id);
  return { ...project, company };
}

function propertyView(world: DemoWorld, property: DemoProperty) {
  return { ...property, project: projectWithCompany(world, property.project_id) };
}

function reservationView(world: DemoWorld, reservation: DemoWorld['reservations'][number], persona?: DemoPersona) {
  const property = world.properties.find((candidate) => candidate.id === reservation.property_id);
  return {
    ...reservation,
    customer: customerSummary(world, persona, reservation.customer_id),
    property: property ? propertyView(world, property) : undefined,
  };
}

function companyView(world: DemoWorld, record: Record<string, unknown> & { company_id: string }) {
  return { ...record, company: world.companies.find((company) => company.id === record.company_id) };
}

function paginate<T>(rows: T[], url: URL) {
  const skip = Math.max(0, Number(url.searchParams.get('skip') || 0) || 0);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get('take') || 100) || 100));
  return rows.slice(skip, skip + take);
}

function sanitizeAuditChanges(value: unknown, key = ''): unknown {
  if (/(?:password|secret|authorization|cookie|access[_-]?token|refresh[_-]?token|private[_-]?key|credential_ref|file_content|document_content)/i.test(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeAuditChanges(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeAuditChanges(nestedValue, nestedKey),
      ]),
    );
  }
  return value;
}

function addAudit(
  world: DemoWorld,
  persona: DemoPersona,
  action: string,
  entityType: string,
  entityId: string,
  changes: Record<string, unknown>,
  companyId?: string | null,
  projectId?: string | null,
) {
  const resources: Record<string, string> = { user: 'users', user_profile: 'users', customer: 'customers', rhc_digital_id: 'identity', reservation: 'reservations', document: 'documents', payment: 'payments', certificate: 'certificates', service_request: 'service-requests', reward_entry: 'rewards-ledger', role: 'roles' };
  const resource = resources[entityType] || entityType;
  const collectionKey = adminCollections[resource];
  const record = resource === 'identity' ? world.users.find((item) => item.id === entityId) :
    collectionKey ? (world[collectionKey] as Row[]).find((item) => item.id === entityId) : undefined;
  const scopes = record ? recordScopes(world, resource, record) : [];
  const scope = scopes.length === 1 ? scopes[0] : undefined;
  world.audit_logs.unshift({
    id: `audit-${randomUUID()}`,
    actor_user_id: persona.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    company_id: scope?.companyId ?? companyId,
    project_id: scope?.projectId ?? projectId,
    request_id: demoRequestContext()?.requestId ?? `demo-request-${randomUUID()}`,
    correlation_id: demoRequestContext()?.requestId ?? `demo-correlation-${randomUUID()}`,
    changes: sanitizeAuditChanges({ ...changes, demo: true }) as Record<string, unknown>,
    created_at: world.controls.clock,
  });
}

function addNotification(world: DemoWorld, customerId: string, subject: string, body: string, href: string) {
  world.notifications.unshift({
    id: `notification-${randomUUID()}`,
    customer_id: customerId,
    subject,
    body,
    channel: 'IN_APP',
    status: 'Unread',
    href,
    created_at: world.controls.clock,
  });
}

function addReceipt(
  world: DemoWorld,
  persona: DemoPersona,
  type: string,
  status: string,
  summary: string,
  relatedType: string,
  relatedId: string,
) {
  const receipt = {
    id: `receipt-${randomUUID()}`,
    customer_id: persona.customerId,
    actor_id: persona.userId,
    type,
    reference: `DEMO-RCT-${String(world.receipts.length + 1).padStart(5, '0')}`,
    status,
    summary,
    related_type: relatedType,
    related_id: relatedId,
    created_at: world.controls.clock,
    demo: true as const,
  };
  world.receipts.unshift(receipt);
  return receipt;
}

function demoRecords(world: DemoWorld, customerId: string) {
  const payments = world.payments.filter((item) => item.customer_id === customerId).map((item) => {
    const property = world.properties.find((candidate) => candidate.id === item.property_id);
    return {
      id: item.id,
      reference: item.reference,
      property_code: property?.property_code || 'Account',
      due_date: item.due_date,
      amount: item.amount_minor / 100,
      currency: item.currency,
      status: item.status === 'SUBMITTED' ? 'PENDING' : item.status,
      description: item.description,
      document_id: item.document_id,
    };
  });
  const documents = world.documents.filter((item) => item.customer_id === customerId).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    status: item.status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
    version: `${item.version}.0`,
    issued_at: item.issued_at,
    property_code: world.properties.find((property) => property.id === item.property_id)?.property_code,
    issuer: item.issuer,
    hash: item.sha256,
    content: item.content,
    review_message: item.review_message,
  }));
  const certificates = world.certificates.filter((item) => item.customer_id === customerId).map((item) => ({
    id: item.id,
    reference: item.reference,
    public_reference: item.public_reference,
    type: item.type,
    status: certificateStatus(world, item),
    issued_at: item.issued_at,
    linked_record: item.linked_record,
    issuer: item.issuer,
    blockchain_status: item.blockchain_status,
  }));
  const entries = world.reward_entries.filter((entry) => entry.customer_id === customerId);
  const posted = entries.filter((entry) => entry.status === 'POSTED');
  const sumPoints = (rows: typeof posted) => rows.reduce((sum, entry) => {
    const total = sum + entry.points;
    if (!Number.isSafeInteger(total)) throw new DemoStoreError(409, 'POINTS_RANGE_EXCEEDED', 'The synthetic points total exceeds the safe integer range.');
    return total;
  }, 0);
  const balance = sumPoints(posted);
  const earned = sumPoints(posted.filter((entry) => entry.points > 0));
  const redeemed = Math.abs(sumPoints(posted.filter((entry) => entry.points < 0)));
  const propertyLink = world.property_links.find((link) => link.customer_id === customerId);
  const projectId = propertyLink
    ? world.properties.find((property) => property.id === propertyLink.property_id)?.project_id
    : undefined;
  const turnover = world.turnover_cases.find((item) => item.customer_id === customerId);
  return {
    payments,
    documents,
    certificates,
    milestones: world.milestones.filter((item) => item.project_id === projectId),
    benefits: world.benefits,
    rewards: { balance, earned, redeemed, entries },
    turnover: turnover || {
      case_number: 'Not opened',
      status: 'NOT_STARTED',
      note: 'No synthetic turnover case is associated with this customer.',
      checklist: [],
    },
    receipts: world.receipts.filter((receipt) => receipt.customer_id === customerId),
    service_requests: world.service_requests.filter((request) => request.customer_id === customerId),
  };
}

const adminCollections: Record<string, keyof DemoWorld> = {
  ...mutableCollections, customers: 'users', users: 'users', reservations: 'reservations',
  'audit-logs': 'audit_logs', permissions: 'permissions', 'feature-flags': 'feature_flags',
  'system-settings': 'system_settings', payments: 'payments', documents: 'documents',
  certificates: 'certificates', 'service-requests': 'service_requests', 'rewards-ledger': 'reward_entries',
};

function scopedAdminRows(world: DemoWorld, persona: DemoPersona, resource: string) {
  const permission = adminReadPermissions[resource];
  const key = adminCollections[resource];
  if (!permission || !key) throw new DemoStoreError(404, 'RESOURCE_NOT_FOUND', 'That demo admin resource does not exist.');
  assertAdmin(persona, permission);
  return (world[key] as Row[]).filter((record) =>
    (resource !== 'customers' || !record.is_admin) && canSeeRecord(world, persona, resource, record))
    .map((record) => {
      if (resource === 'users' || resource === 'customers') return userView(world, persona, record as DemoUser);
      if (resource === 'projects') return projectWithCompany(world, record.id as string);
      if (resource === 'properties') return propertyView(world, record as DemoProperty);
      if (resource === 'reservations') return reservationView(world, record as DemoWorld['reservations'][number], persona);
      if (resource === 'customer-properties') return { ...record,
        customer: customerSummary(world, persona, record.customer_id as string),
        property: world.properties.find((property) => property.id === record.property_id) };
      if (resource === 'business-services' || resource === 'integrations') return companyView(world, record as Row & { company_id: string });
      if (resource === 'user-roles') {
        const role = world.roles.find((item) => item.id === record.role_id);
        return { ...record, role: role && canSeeRecord(world, persona, 'roles', role)
          ? { id: role.id, name: role.name, code: role.code } : undefined };
      }
      if (resource === 'audit-logs') return { ...record, changes: safeAuditView(record.changes) };
      return record;
    });
}

function safeAuditView(value: unknown): Row {
  // Audit evidence is not a back door for embedded user/receipt/record snapshots.
  if (!value || typeof value !== 'object') return {};
  const allowed = ['demo', 'summary', 'reason', 'status', 'previous_status', 'account_status', 'review_reference', 'version', 'source_version', 'points', 'amount_minor', 'currency', 'enabled', 'permission_count', 'rule_version'];
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => allowed.includes(key) &&
    (item === null || ['string', 'number', 'boolean'].includes(typeof item))));
}

function adminDashboard(world: DemoWorld, persona: DemoPersona) {
  const properties = scopedAdminRows(world, persona, 'properties') as Array<{ status: string }>;
  const customers = scopedAdminRows(world, persona, 'customers') as DemoUser[];
  const reservations = scopedAdminRows(world, persona, 'reservations') as Array<{ status: string; expires_at: string }>;
  const integrations = scopedAdminRows(world, persona, 'integrations') as Array<{ status: string }>;
  return {
    totalUsers: customers.length,
    verifiedCustomers: customers.filter((customer) => customer.verification_status === 'VERIFIED').length,
    pendingVerification: customers.filter((customer) => ['PENDING', 'UNVERIFIED', 'REJECTED'].includes(customer.verification_status)).length,
    companies: (scopedAdminRows(world, persona, 'companies') as unknown[]).length,
    activeProjects: (scopedAdminRows(world, persona, 'projects') as Array<{ status: string }>).filter((project) => project.status === 'ACTIVE').length,
    totalAmicaProperties: properties.length,
    availableProperties: properties.filter((property) => property.status === 'AVAILABLE').length,
    reservedProperties: properties.filter((property) => ['HELD', 'RESERVED'].includes(property.status)).length,
    expiringReservations: reservations.filter((reservation) => ['PENDING', 'CONFIRMED'].includes(reservation.status) && Date.parse(reservation.expires_at) <= Date.parse(world.controls.clock) + 7 * 86_400_000).length,
    activeIntegrations: integrations.filter((integration) => integration.status === 'ACTIVE').length,
    integrationExceptions: integrations.filter((integration) => ['ERROR', 'SUSPENDED'].includes(integration.status)).length,
    auditCount: (scopedAdminRows(world, persona, 'audit-logs') as unknown[]).length,
    revision: world.revision,
    as_of: world.controls.clock,
  };
}

function certificateStatus(world: DemoWorld, certificate: DemoWorld['certificates'][number]) {
  return certificate.status === 'ACTIVE' && certificate.expires_at != null &&
    (!Number.isFinite(Date.parse(certificate.expires_at)) || Date.parse(certificate.expires_at) <= Date.parse(world.controls.clock))
    ? 'EXPIRED' : certificate.status;
}

function publicVerification(world: DemoWorld, token: string) {
  const legacy = token === 'UkhDLTIwMjYtMDAwMDAwMDE';
  const certificate = world.certificates.find((item) => item.public_reference === token) ||
    (legacy ? world.certificates.find((item) => item.id === 'certificate-001') : undefined);
  if (!certificate) return { valid: false, status: 'INVALID', message: 'No public RHC verification record matches this opaque reference.' };
  const user = world.users.find((candidate) => candidate.id === certificate.customer_id);
  const displayName = user ? `${user.profile.first_name.slice(0, 1)}${'•'.repeat(Math.max(3, user.profile.first_name.length - 1))} ${user.profile.last_name.slice(0, 1)}${'•'.repeat(Math.max(3, user.profile.last_name.length - 1))}` : undefined;
  const status = certificateStatus(world, certificate);
  const valid = status === 'ACTIVE';
  return {
    valid,
    status: valid ? 'VALID' : status,
    rhc_id: certificate.type.includes('Customer') ? certificate.linked_record : undefined,
    display_name: displayName,
    verification_status: user?.verification_status,
    issued_at: certificate.issued_at,
    issuer: certificate.issuer,
    credential_status: status,
    business_review: certificate.internal_review_status,
    blockchain_status: certificate.blockchain_status,
    source_version: certificate.source_version,
    what_this_proves: certificate.type.includes('Customer')
      ? 'This company-issued credential confirms the internal RHC identity record and current credential state only.'
      : 'This credential confirms the stated RHC business record and version only. It is not government title.',
    message: valid ? undefined : `This credential is ${status.toLowerCase()}.`,
  };
}

async function updateControl(body: Record<string, unknown>, persona: DemoPersona, expectedRevision?: number) {
  const allowed = ['scenario', 'latency_ms', 'fail_next_request', 'empty_state', 'clock'];
  const { result, world } = await mutateDemoWorld((draft) => {
    for (const [key, value] of Object.entries(body)) {
      if (!allowed.includes(key)) throw new DemoStoreError(400, 'INVALID_CONTROL', `Unknown demo control: ${key}.`);
      if (key === 'latency_ms') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 5000) throw new DemoStoreError(400, 'INVALID_CONTROL', 'Latency must be a number from 0 to 5000 milliseconds.');
        draft.controls.latency_ms = value;
      } else if (key === 'fail_next_request' || key === 'empty_state') {
        if (typeof value !== 'boolean') throw new DemoStoreError(400, 'INVALID_CONTROL', `${key} must be boolean.`);
        draft.controls[key] = value;
      }
      else if (key === 'clock') {
        if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new DemoStoreError(400, 'INVALID_CLOCK', 'Use an ISO demo clock value.');
        draft.controls.clock = new Date(value).toISOString();
      } else if (key === 'scenario') {
        if (!['baseline', 'empty', 'exceptions'].includes(String(value))) throw new DemoStoreError(400, 'INVALID_SCENARIO', 'Unknown demo scenario.');
        draft.controls.scenario = String(value) as DemoWorld['controls']['scenario'];
        draft.controls.empty_state = value === 'empty';
      }
    }
    addAudit(draft, persona, 'DEMO_CONTROL_UPDATED', 'demo_control', 'local-world', { updated_fields: Object.keys(body) });
    return draft.controls;
  }, expectedRevision);
  return { data: result, world };
}

const collectionFields: Record<string, string[]> = {
  companies: ['company_code', 'legal_name', 'display_name', 'description', 'business_type', 'status', 'integration_status'],
  projects: ['company_id', 'project_code', 'project_name', 'description', 'location', 'status', 'start_date', 'target_completion'],
  properties: ['project_id', 'property_code', 'asset_type', 'status', 'tower', 'floor', 'unit_number', 'area', 'list_price_minor', 'list_price', 'currency'],
  'customer-properties': ['customer_id', 'property_id', 'relationship_type', 'status', 'effective_from', 'effective_to'],
  roles: ['company_id', 'project_id', 'code', 'name', 'description'],
  'user-roles': ['user_id', 'role_id', 'company_id', 'project_id', 'expires_at'],
  integrations: ['company_id', 'project_id', 'integration_key', 'name', 'status'],
  'business-services': ['company_id', 'project_id', 'service_code', 'service_name', 'service_type', 'description', 'status', 'integration_status', 'requires_property', 'requires_resident_status'],
};
const immutableFields = ['id', 'company_id', 'project_id', 'property_id', 'customer_id', 'user_id', 'role_id', 'code', 'company_code', 'project_code', 'property_code', 'service_code', 'integration_key'];
const reservedRoles = new Set([...DEMO_PERSONAS.map((persona) => persona.role), 'SUPER_ADMIN']);

function allowFields(body: Row, allowed: string[]) {
  for (const key of Object.keys(body)) if (!allowed.includes(key)) {
    throw new DemoStoreError(400, 'FIELD_NOT_ALLOWED', `${key} is not a writable field.`);
  }
}

function validateCollectionRecord(world: DemoWorld, persona: DemoPersona, resource: string, record: Row) {
  const required: Record<string, string[]> = {
    companies: ['company_code', 'legal_name', 'display_name'], projects: ['company_id', 'project_code', 'project_name'],
    properties: ['project_id', 'property_code'], 'customer-properties': ['customer_id', 'property_id', 'relationship_type', 'status', 'effective_from'],
    roles: ['code', 'name'], 'user-roles': ['user_id', 'role_id'], integrations: ['company_id', 'integration_key', 'name'],
    'business-services': ['company_id', 'service_code', 'service_name', 'service_type'],
  };
  for (const key of required[resource]) if (typeof record[key] !== 'string' || !String(record[key]).trim()) {
    throw new DemoStoreError(400, 'FIELD_REQUIRED', `${key} is required.`);
  }
  for (const key of collectionFields[resource]) {
    const value = record[key];
    if (value == null) continue;
    if (['requires_property', 'requires_resident_status'].includes(key)) {
      if (typeof value !== 'boolean') throw new DemoStoreError(400, 'INVALID_FIELD', `${key} must be boolean.`);
    } else if (key === 'list_price_minor') {
      if (!Number.isSafeInteger(value) || Number(value) < 0) throw new DemoStoreError(400, 'INVALID_FIELD', 'Price must be non-negative integer centavos.');
    } else if (typeof value !== 'string' || value.length > 2000) {
      throw new DemoStoreError(400, 'INVALID_FIELD', `${key} must be text.`);
    }
    if ((key.endsWith('_id') || key.endsWith('_code') || key === 'code') &&
      (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value))) {
      throw new DemoStoreError(400, 'INVALID_REFERENCE', `${key} is malformed.`);
    }
    if (['start_date', 'target_completion', 'effective_from', 'effective_to', 'expires_at'].includes(key) && !Number.isFinite(Date.parse(String(value)))) {
      throw new DemoStoreError(400, 'INVALID_DATE', `${key} must be a valid date.`);
    }
  }
  const references: Array<[string, Row[]]> = [['company_id', world.companies], ['project_id', world.projects],
    ['property_id', world.properties], ['customer_id', world.users.filter((user) => !user.is_admin)], ['user_id', world.users], ['role_id', world.roles]];
  for (const [key, rows] of references) if (record[key] != null && !rows.some((item) => item.id === record[key])) {
    throw new DemoStoreError(400, 'INVALID_REFERENCE', `${key} does not reference an existing record.`);
  }
  if (record.project_id && record.company_id && !projectScope(world, record.project_id).some((scope) => scope.companyId === record.company_id)) {
    throw new DemoStoreError(400, 'SCOPE_MISMATCH', 'Project and company must agree.');
  }
  const statuses: Record<string, string[]> = {
    companies: ['ACTIVE', 'INACTIVE', 'PREPARED', 'SUSPENDED'], projects: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
    properties: ['AVAILABLE', 'HELD', 'RESERVED', 'CONTRACTED', 'SOLD', 'FOR_TURNOVER', 'TURNED_OVER', 'BLOCKED'],
    'customer-properties': ['ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED'], integrations: ['NOT_CONFIGURED', 'PREPARED', 'ACTIVE', 'SUSPENDED', 'ERROR'],
    'business-services': ['ACTIVE', 'PREPARED', 'COMING_SOON', 'DISABLED'],
  };
  if (record.status != null && !statuses[resource]?.includes(String(record.status))) throw new DemoStoreError(400, 'INVALID_STATUS', 'Unsupported record status.');
  if (resource === 'roles' && reservedRoles.has(String(record.code))) throw new DemoStoreError(409, 'PROTECTED_ROLE', 'Canonical persona roles cannot be redefined.');
  if (resource === 'user-roles') {
    const role = world.roles.find((item) => item.id === record.role_id)!;
    const target = world.users.find((item) => item.id === record.user_id)!;
    if (DEMO_PERSONAS.some((item) => item.userId === target.id) || reservedRoles.has(role.code) || role.is_system) {
      throw new DemoStoreError(403, 'PROTECTED_ASSIGNMENT', 'Canonical persona assignments cannot be changed.');
    }
    if (role.company_id && record.company_id !== role.company_id || role.project_id && record.project_id !== role.project_id) {
      throw new DemoStoreError(400, 'SCOPE_MISMATCH', 'Assignment scope must match its role.');
    }
    if (!isGlobal(persona)) {
      assertAdminRecordScope(world, persona, 'roles', role);
      assertAdminRecordScope(world, persona, 'users', target);
      if (!role.company_id || !record.company_id || persona.projectIds.length && !record.project_id) {
        throw new DemoStoreError(403, 'GLOBAL_GRANT_FORBIDDEN', 'Scoped administrators cannot grant company-wide or global rights.');
      }
    }
  }
  if (resource === 'customer-properties') {
    assertAdminRecordScope(world, persona, 'customers', world.users.find((item) => item.id === record.customer_id)!);
  }
  if (resource === 'roles' && !isGlobal(persona) && (!record.company_id || persona.projectIds.length && !record.project_id)) {
    throw new DemoStoreError(403, 'GLOBAL_GRANT_FORBIDDEN', 'A scoped role must retain company and project restrictions.');
  }
}

async function mutateAdminCollection(
  persona: DemoPersona,
  resource: string,
  method: string,
  id: string | undefined,
  body: Record<string, unknown>,
  expectedRevision?: number,
): Promise<DispatchResult> {
  const permission = adminMutationPermission(resource, method);
  if (!permission) throw new DemoStoreError(404, 'RESOURCE_NOT_MUTABLE', 'This demo collection is read-only.');
  assertAdmin(persona, permission, true);
  const key = mutableCollections[resource];
  if (!key) throw new DemoStoreError(404, 'RESOURCE_NOT_MUTABLE', 'This demo collection is read-only.');
  if ((method === 'POST' && id) || (method !== 'POST' && !id)) throw new DemoStoreError(404, 'ROUTE_NOT_FOUND', 'Invalid collection command.');
  allowFields(body, method === 'DELETE' ? ['review_reference'] : [...collectionFields[resource], 'review_reference']);
  const fields = Object.fromEntries(Object.entries(body).filter(([field]) => field !== 'review_reference'));
  const { result, world: next } = await mutateDemoWorld((draft) => {
    const collection = draft[key] as Array<Record<string, unknown> & { id: string }>;
    if (method === 'POST') {
      const record = { ...fields, id: `${resource}-${randomUUID()}`, created_at: draft.controls.clock, updated_at: draft.controls.clock,
        ...(resource === 'roles' ? { is_system: false, role_permissions: [] } : {}),
        ...(resource === 'properties' ? { revision: 1, metadata: {}, currency: 'PHP', status: fields.status || 'AVAILABLE' } : {}) };
      validateCollectionRecord(draft, persona, resource, record);
      // New projects/companies are not in the collection until after validation.
      const scopeRecord = resource === 'projects' ? { ...record, company_id: fields.company_id } : record;
      if (!isGlobal(persona) && ['projects', 'companies'].includes(resource)) {
        throw new DemoStoreError(403, 'SCOPE_DENIED', 'New company/project scopes require global administration.');
      }
      assertAdminRecordScope(draft, persona, resource, scopeRecord);
      collection.push(record);
      addAudit(draft, persona, `${resource.toUpperCase()}_CREATED`, resource, record.id, body);
      return record;
    }
    const index = collection.findIndex((record) => record.id === id);
    if (index < 0) throw new DemoStoreError(404, 'RECORD_NOT_FOUND', 'The demo record was not found.');
    assertAdminRecordScope(draft, persona, resource, collection[index]);
    if (resource === 'roles' && (collection[index].is_system || reservedRoles.has(String(collection[index].code))) ||
      resource === 'user-roles' && DEMO_PERSONAS.some((item) => item.userId === collection[index].user_id)) {
      throw new DemoStoreError(409, 'PROTECTED_ROLE', 'Canonical persona roles and assignments are immutable.');
    }
    if (method === 'DELETE') {
      const references = Object.values(adminCollections).some((collectionKey) => (draft[collectionKey] as Row[]).some((row) =>
        row.id !== id && ['company_id', 'project_id', 'property_id', 'role_id'].some((field) => row[field] === id)));
      if (references) throw new DemoStoreError(409, 'RECORD_IN_USE', 'Referenced records cannot be removed.');
      const removed = collection[index];
      addAudit(draft, persona, `${resource.toUpperCase()}_REMOVED`, resource, removed.id, { review_reference: body.review_reference });
      collection.splice(index, 1);
      return removed;
    }
    for (const field of immutableFields) if (Object.hasOwn(fields, field) && fields[field] !== collection[index][field]) {
      throw new DemoStoreError(400, 'IMMUTABLE_FIELD', `${field} cannot be changed.`);
    }
    const updated = { ...collection[index], ...fields, updated_at: draft.controls.clock };
    validateCollectionRecord(draft, persona, resource, updated);
    assertAdminRecordScope(draft, persona, resource, updated);
    collection[index] = updated;
    addAudit(draft, persona, `${resource.toUpperCase()}_UPDATED`, resource, collection[index].id, body);
    return collection[index];
  }, expectedRevision);
  return { data: result, world: next };
}

export async function dispatchDemoRequest(input: DispatchInput): Promise<DispatchResult> {
  const publicRoute = input.segments[0] === 'session' || input.segments[0] === 'personas' || input.segments[0] === 'verify';
  return withDemoRequestContext({ token: publicRoute ? null : input.token, requestId: input.requestId ?? `demo-request-${randomUUID()}` }, () => dispatchRequest(input));
}

async function dispatchRequest(input: DispatchInput): Promise<DispatchResult> {
  const method = input.method.toUpperCase();
  const route = `/${input.segments.join('/')}`;

  if (route === '/personas' && method === 'GET') {
    const world = await readDemoWorld();
    const requested = input.url.searchParams.get('application') as DemoApplication | null;
    return {
      data: DEMO_PERSONAS.filter((persona) => !requested || persona.application === requested).map(({ permissions: _permissions, ...persona }) => persona),
      world,
    };
  }
  if (route === '/session' && method === 'POST') {
    const body = objectBody(input.body);
    return createSessionResponse(String(body.persona_id || ''));
  }
  if (route === '/session/credentials' && method === 'POST') {
    const body = objectBody(input.body);
    if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.email.length > 254 || body.password.length > 1024) {
      throw new DemoStoreError(401, 'INVALID_DEMO_CREDENTIALS', 'The local demo email or password is incorrect.');
    }
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const credential = demoCredentialPersonas().find((candidate) => candidate.email.toLowerCase() === email && candidate.password === password);
    if (!credential) throw new DemoStoreError(401, 'INVALID_DEMO_CREDENTIALS', 'The local demo email or password is incorrect.');
    return createSessionResponse(credential.personaId);
  }
  if (route.startsWith('/verify/rhc-id/') && method === 'GET') {
    const world = await readDemoWorld();
    return { data: publicVerification(world, decodeURIComponent(input.segments.slice(2).join('/'))), world };
  }

  const authenticated = await authenticateDemoSession(input.token);
  const { persona } = authenticated;

  if (route === '/session' && method === 'DELETE') {
    await revokeDemoSession(authenticated.session.token);
    return { data: { signed_out: true }, world: await readDemoWorld() };
  }
  if (route === '/auth/session' && method === 'GET') {
    return { data: { authenticated: true, user: cleanAccount(currentUser(authenticated.world, persona)) }, world: authenticated.world };
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && (persona.readOnly || persona.role === 'AUDITOR')) {
    assertAdmin(persona, undefined, true);
  }
  if (route === '/control' && method === 'GET') return { data: authenticated.world.controls, world: authenticated.world };
  if (route === '/control' && method === 'PATCH') return updateControl(objectBody(input.body), persona, input.expectedRevision);
  if (route === '/reset' && method === 'POST') {
    assertAdmin(persona, 'system_settings.manage', true);
    if (!isGlobal(persona)) throw new DemoStoreError(403, 'SCOPE_DENIED', 'Reset requires global demo administration.');
    const body = objectBody(input.body);
    const world = await resetDemoWorld(String(body.confirmation || ''));
    return { data: { reset: true, revision: world.revision }, world };
  }

  await applyDemoRequestControls();
  const refreshed = await authenticateDemoSession(input.token);
  const world = refreshed.world;

  if (route === '/web3/token' || route === '/admin/integrations/thirdweb') {
    if (route === '/web3/token') assertCustomer(persona);
    else {
      assertAdmin(persona, 'integration.view');
      if (!isGlobal(persona)) throw new DemoStoreError(403, 'SCOPE_DENIED', 'Server-wide Web3 configuration requires global integration.view access.');
    }
    if (method !== 'GET') {
      throw new DemoStoreError(405, 'WEB3_READ_ONLY', 'The Web3 preview supports read-only GET requests. No capability was activated.');
    }
    return { data: createSyntheticWeb3ReadResult(world.controls.clock), world };
  }

  if (route === '/me' && method === 'GET') {
    assertCustomer(persona);
    const user = currentUser(world, persona);
    return { data: { user: cleanAccount(user), profile: user.profile }, world };
  }
  if (route === '/me' && method === 'PATCH') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const user = currentUser(draft, persona);
      const identityLocked = user.verification_status === 'VERIFIED' || Boolean(user.profile.rhc_id);
      const allowed = identityLocked
        ? ['mobile_number']
        : ['first_name', 'middle_name', 'last_name', 'suffix', 'birth_date', 'nationality', 'address_line', 'barangay', 'city', 'province', 'postal_code', 'country', 'mobile_number'];
      for (const key of Object.keys(body)) {
        if (!allowed.includes(key)) throw new DemoStoreError(400, 'FIELD_LOCKED', `${key} cannot be changed for this profile state.`);
        if (typeof body[key] !== 'string' || (body[key] as string).length > 500 ||
          (['first_name', 'last_name'].includes(key) && !(body[key] as string).trim())) {
          throw new DemoStoreError(400, 'INVALID_PROFILE_FIELD', `${key} must be text up to 500 characters; names cannot be blank.`);
        }
      }
      user.profile = { ...user.profile, ...body };
      user.updated_at = draft.controls.clock;
      addAudit(draft, persona, 'PROFILE_UPDATED', 'user_profile', user.id, { updated_fields: Object.keys(body) });
      const receipt = addReceipt(draft, persona, 'PROFILE_UPDATE', 'COMPLETED', 'Permitted profile fields were updated in the synthetic demo world.', 'user', user.id);
      return { user: cleanAccount(user), profile: user.profile, receipt };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/rhc-id' && method === 'GET') {
    assertCustomer(persona);
    const user = currentUser(world, persona);
    const credential = world.certificates.find(
      (certificate) =>
        certificate.customer_id === user.id &&
        certificate.type.includes('Customer Verification') &&
        certificateStatus(world, certificate) === 'ACTIVE',
    );
    return {
      data: {
        rhc_id: user.profile.rhc_id || null,
        issued_at: user.profile.rhc_id_issued_at || null,
        public_reference: credential?.public_reference || null,
      },
      world,
    };
  }
  if (route === '/me/rhc-id' && method === 'POST') {
    assertCustomer(persona);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const user = currentUser(draft, persona);
      if (user.profile.rhc_id) {
        const credential = draft.certificates.find((item) => item.customer_id === user.id && item.linked_record === user.profile.rhc_id && item.type.includes('Customer Verification') && certificateStatus(draft, item) === 'ACTIVE');
        return { rhc_id: user.profile.rhc_id, issued_at: user.profile.rhc_id_issued_at, public_reference: credential?.public_reference ?? null };
      }
      if (user.account_status !== 'ACTIVE' || user.verification_status !== 'VERIFIED' || !user.auth_email_confirmed_at) {
        throw new DemoStoreError(409, 'RHC_ID_INELIGIBLE', 'Active account, confirmed email, and verified business review are required.');
      }
      const issuedIds = new Set(draft.users.map((candidate) => candidate.profile.rhc_id));
      let sequence = 1;
      while (issuedIds.has(`RHC-2026-${String(sequence).padStart(8, '0')}`)) sequence += 1;
      user.profile.rhc_id = `RHC-2026-${String(sequence).padStart(8, '0')}`;
      user.profile.rhc_id_issued_at = draft.controls.clock;
      const credential = {
        id: `certificate-${randomUUID()}`,
        customer_id: user.id,
        reference: `DEMO-CERT-${String(draft.certificates.length + 1).padStart(4, '0')}`,
        public_reference: `demo-passport-${randomUUID().replaceAll('-', '')}`,
        type: 'RHC Customer Verification Certificate',
        status: 'ACTIVE' as const,
        issued_at: draft.controls.clock,
        expires_at: null,
        linked_record: user.profile.rhc_id,
        issuer: 'Rabino Holdings Corporation',
        source_version: 1,
        internal_review_status: 'APPROVED',
        blockchain_status: 'NOT_REQUESTED' as const,
        revision: 1,
      };
      draft.certificates.push(credential);
      addAudit(draft, persona, 'RHC_ID_ISSUED', 'rhc_digital_id', user.id, { rhc_id: user.profile.rhc_id, credential_id: credential.id });
      addNotification(draft, user.id, 'RHC Digital ID issued', 'Your company-issued synthetic RHC Digital ID is now active.', '/digital-id');
      return { rhc_id: user.profile.rhc_id, issued_at: user.profile.rhc_id_issued_at, public_reference: credential.public_reference };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/identity-review' && method === 'POST') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    allowFields(body, ['idempotency_key']);
    const idempotencyKey = scopedKey(persona, route, persona.customerId!, body.idempotency_key, body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const user = currentUser(draft, persona);
      const duplicate = findDuplicate(draft.receipts.filter((receipt) => receipt.actor_id === persona.userId && receipt.customer_id === persona.customerId && receipt.type === 'IDENTITY_REVIEW_SUBMITTED'), idempotencyKey, (receipt) => receipt.reference);
      if (duplicate) return { status: user.verification_status, receipt: duplicate, duplicate: true };
      if (user.verification_status === 'VERIFIED') throw new DemoStoreError(409, 'ALREADY_VERIFIED', 'Business verification is already approved.');
      user.verification_status = 'PENDING';
      user.profile.verification_status = 'PENDING';
      user.updated_at = draft.controls.clock;
      const content = `DEMO / NOT AN IDENTITY DOCUMENT\nSynthetic identity review request for ${user.id}.`;
      const document = {
        id: `document-${randomUUID()}`,
        customer_id: user.id,
        title: 'Synthetic identity review request',
        category: 'Identity',
        status: 'SUBMITTED' as const,
        version: 1,
        issued_at: draft.controls.clock,
        issuer: 'Customer demo submission',
        content,
        sha256: sha256(content),
        review_message: 'Awaiting an authorized different actor.',
        revision: 1,
      };
      draft.documents.push(document);
      const receipt = addReceipt(draft, persona, 'IDENTITY_REVIEW_SUBMITTED', 'PENDING', 'Synthetic identity review submitted for authorized review.', 'document', document.id);
      receipt.reference = idempotencyKey;
      addAudit(draft, persona, 'IDENTITY_REVIEW_SUBMITTED', 'rhc_digital_id', user.id, { document_id: document.id });
      addNotification(draft, user.id, 'Identity review submitted', 'Your synthetic identity review is pending. Email confirmation and business verification remain separate.', '/digital-id');
      return { status: user.verification_status, document, receipt };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/properties' && method === 'GET') {
    assertCustomer(persona);
    const rows = world.property_links.filter((link) => link.customer_id === persona.customerId).map((link) => ({
      ...link,
      property: propertyView(world, world.properties.find((property) => property.id === link.property_id) as DemoProperty),
    }));
    return { data: world.controls.empty_state ? [] : rows, world };
  }
  if (route === '/me/reservations' && method === 'GET') {
    assertCustomer(persona);
    const rows = world.reservations.filter((reservation) => reservation.customer_id === persona.customerId).map((reservation) => reservationView(world, reservation));
    return { data: world.controls.empty_state ? [] : rows, world };
  }
  if (route === '/me/reservations' && method === 'POST') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    const propertyId = String(body.property_id || '');
    allowFields(body, ['property_id', 'idempotency_key']);
    if (typeof body.property_id !== 'string') throw new DemoStoreError(400, 'INVALID_REFERENCE', 'A property ID is required.');
    const rawKey = body.idempotency_key ?? input.url.searchParams.get('idempotency_key');
    const idempotencyKey = rawKey == null ? '' : scopedKey(persona, route, persona.customerId!, rawKey, body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      if (idempotencyKey) {
        const existingReceipt = findDuplicate(draft.receipts.filter((receipt) => receipt.actor_id === persona.userId && receipt.customer_id === persona.customerId && receipt.type === 'RESERVATION_CREATED'), idempotencyKey, (receipt) => receipt.reference);
        if (existingReceipt) {
          const existing = draft.reservations.find((reservation) => reservation.id === existingReceipt.related_id && reservation.customer_id === persona.customerId && reservation.property_id === propertyId);
          if (existing) return reservationView(draft, existing);
        }
      }
      const property = draft.properties.find((candidate) => candidate.id === propertyId);
      if (!property || !propertyScope(draft, property.id).length) throw new DemoStoreError(404, 'PROPERTY_NOT_FOUND', 'The selected property does not exist.');
      if (property.status !== 'AVAILABLE' || draft.reservations.some((reservation) => reservation.property_id === propertyId && customerStatuses.has(reservation.status))) {
        throw new DemoStoreError(409, 'RESERVATION_CONFLICT', 'This property already has an active reservation or is unavailable.');
      }
      const id = `reservation-${randomUUID()}`;
      const reservation = {
        id,
        reservation_number: `DEMO-RES-${String(draft.reservations.length + 1).padStart(4, '0')}`,
        customer_id: persona.customerId as string,
        property_id: propertyId,
        status: 'PENDING' as const,
        expires_at: new Date(Date.parse(draft.controls.clock) + 7 * 86_400_000).toISOString(),
        created_at: draft.controls.clock,
        updated_at: draft.controls.clock,
        revision: 1,
        events: [{ id: `reservation-event-${randomUUID()}`, type: 'CREATED', at: draft.controls.clock, actor_id: persona.userId, note: 'Synthetic reservation request created.' }],
      };
      draft.reservations.push(reservation);
      property.status = 'HELD';
      property.revision += 1;
      addAudit(draft, persona, 'RESERVATION_CREATED', 'reservation', id, { property_id: propertyId }, 'company-amica-condo', property.project_id);
      addNotification(draft, persona.customerId as string, 'Reservation request created', `${reservation.reservation_number} is pending review.`, `/reservations`);
      const receipt = addReceipt(draft, persona, 'RESERVATION_CREATED', 'PENDING', `Reservation request created for ${property.property_code}.`, 'reservation', id);
      if (idempotencyKey) receipt.reference = idempotencyKey;
      return { ...reservationView(draft, reservation), receipt };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'me' && input.segments[1] === 'reservations' && input.segments[3] === 'cancel' && method === 'POST') {
    assertCustomer(persona);
    const reservationId = input.segments[2];
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const reservation = draft.reservations.find((candidate) => candidate.id === reservationId && candidate.customer_id === persona.customerId);
      if (!reservation) throw new DemoStoreError(404, 'RESERVATION_NOT_FOUND', 'The reservation was not found.');
      if (!customerStatuses.has(reservation.status)) throw new DemoStoreError(409, 'RESERVATION_NOT_CANCELLABLE', 'This reservation can no longer be cancelled.');
      const previous = reservation.status;
      reservation.status = 'CANCELLED';
      reservation.updated_at = draft.controls.clock;
      reservation.revision += 1;
      reservation.events.push({ id: `reservation-event-${randomUUID()}`, type: 'CANCELLED', at: draft.controls.clock, actor_id: persona.userId, note: 'Customer cancelled the synthetic reservation.' });
      const property = draft.properties.find((candidate) => candidate.id === reservation.property_id);
      if (property && ['HELD', 'RESERVED'].includes(property.status)) { property.status = 'AVAILABLE'; property.revision += 1; }
      addAudit(draft, persona, 'RESERVATION_CANCELLED', 'reservation', reservation.id, { previous_status: previous }, 'company-amica-condo', property?.project_id);
      const receipt = addReceipt(draft, persona, 'RESERVATION_CANCELLED', 'COMPLETED', 'Reservation cancelled; no payment or refund activity was fabricated.', 'reservation', reservation.id);
      return { ...reservationView(draft, reservation), receipt };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/consents' && method === 'GET') {
    assertCustomer(persona);
    const skip = Math.max(0, Number(input.url.searchParams.get('skip') || 0) || 0);
    const take = Math.min(100, Math.max(1, Number(input.url.searchParams.get('take') || 20) || 20));
    const records = world.consents
      .filter((consent) => consent.customer_id === persona.customerId)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(skip, skip + take)
      .map((consent) => ({
        ...consent,
        company: consent.company_id
          ? world.companies.find((company) => company.id === consent.company_id) || null
          : null,
      }));
    return { data: { policies: consentPolicies, records }, world };
  }
  if (route === '/me/consents' && method === 'POST') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    allowFields(body, ['consent_type', 'consent_version', 'company_id', 'granted']);
    if (typeof body.granted !== 'boolean') throw new DemoStoreError(400, 'INVALID_CONSENT_DECISION', 'An explicit boolean consent decision is required.');
    const policy = consentPolicies.find((candidate) => candidate.consent_type === body.consent_type);
    const version = String(body.consent_version || '').trim();
    const companyId = body.company_id ? String(body.company_id) : null;
    if (!policy) throw new DemoStoreError(400, 'INVALID_CONSENT_TYPE', 'Unknown consent type.');
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(version)) throw new DemoStoreError(400, 'INVALID_POLICY_VERSION', 'Use a valid synthetic policy version.');
    if (policy.company_required && !companyId) throw new DemoStoreError(400, 'COMPANY_REQUIRED', 'Choose the company for this optional permission.');
    if (companyId && !world.companies.some((company) => company.id === companyId)) throw new DemoStoreError(404, 'COMPANY_NOT_FOUND', 'Company not found.');
    const granted = body.granted;
    const { result, world: next } = await mutateDemoWorld((draft) => {
      if (companyId && !draft.companies.some((company) => company.id === companyId)) throw new DemoStoreError(404, 'COMPANY_NOT_FOUND', 'Company not found.');
      const record = {
        id: `consent-${randomUUID()}`,
        customer_id: persona.customerId as string,
        consent_type: policy.consent_type,
        purpose: policy.purpose,
        consent_version: version,
        company_id: companyId,
        granted,
        granted_at: granted ? draft.controls.clock : null,
        withdrawn_at: granted ? null : draft.controls.clock,
        created_at: draft.controls.clock,
      };
      draft.consents.push(record);
      addAudit(draft, persona, granted ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN', 'consent', record.id, { consent_type: policy.consent_type, consent_version: version, company_id: companyId }, companyId);
      const receipt = addReceipt(draft, persona, 'CONSENT_DECISION', granted ? 'GRANTED' : 'WITHDRAWN', `${policy.consent_type.replaceAll('_', ' ')} decision recorded under ${version}.`, 'consent', record.id);
      return { ...record, receipt };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/notifications' && method === 'GET') {
    assertCustomer(persona);
    const rows = world.notifications.filter((notification) => notification.customer_id === persona.customerId);
    return { data: world.controls.empty_state ? [] : rows, world };
  }
  if (input.segments[0] === 'me' && input.segments[1] === 'notifications' && input.segments[2] && input.segments[3] === 'read' && method === 'POST') {
    assertCustomer(persona);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const notification = draft.notifications.find((item) => item.id === input.segments[2] && item.customer_id === persona.customerId);
      if (!notification) throw new DemoStoreError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
      notification.status = 'Read';
      return notification;
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/notifications/read-all' && method === 'POST') {
    assertCustomer(persona);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      let count = 0;
      for (const notification of draft.notifications) if (notification.customer_id === persona.customerId && notification.status === 'Unread') { notification.status = 'Read'; count += 1; }
      return { updated: count };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/documents' && method === 'POST') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    const title = String(body.title || '').trim();
    const category = String(body.category || 'Customer submission').trim();
    const content = String(body.content || '');
    allowFields(body, ['title', 'category', 'content', 'property_id', 'idempotency_key']);
    const idempotencyKey = scopedKey(persona, route, persona.customerId!, body.idempotency_key, body);
    if (!title || title.length > 160) throw new DemoStoreError(400, 'INVALID_TITLE', 'Use a document title up to 160 characters.');
    if (!content || content.length > 100_000) throw new DemoStoreError(400, 'INVALID_DEMO_FILE', 'Use a non-empty synthetic text file no larger than 100 KB.');
    if (!idempotencyKey) throw new DemoStoreError(400, 'IDEMPOTENCY_REQUIRED', 'An idempotency key is required.');
    const { result, world: next } = await mutateDemoWorld((draft) => {
      if (Object.hasOwn(body, 'property_id')) assertCustomerProperty(draft, persona.customerId, body.property_id);
      const duplicate = findDuplicate(draft.receipts.filter((receipt) => receipt.actor_id === persona.userId && receipt.customer_id === persona.customerId && receipt.type === 'DOCUMENT_SUBMITTED'), idempotencyKey, (receipt) => receipt.reference);
      if (duplicate) return { document: draft.documents.find((document) => document.id === duplicate.related_id && document.customer_id === persona.customerId), receipt: duplicate, duplicate: true };
      const document = {
        id: `document-${randomUUID()}`,
        customer_id: persona.customerId as string,
        property_id: typeof body.property_id === 'string' ? body.property_id : undefined,
        title,
        category,
        status: 'SUBMITTED' as const,
        version: 1,
        issued_at: draft.controls.clock,
        issuer: 'Customer demo submission',
        content: `DEMO / NOT AN OFFICIAL RECORD\n${content}`,
        sha256: sha256(`DEMO / NOT AN OFFICIAL RECORD\n${content}`),
        review_message: 'Awaiting authorized review.',
        revision: 1,
      };
      draft.documents.push(document);
      const receipt = addReceipt(draft, persona, 'DOCUMENT_SUBMITTED', 'PENDING', `${title} submitted as a synthetic local attachment.`, 'document', document.id);
      receipt.reference = idempotencyKey;
      addAudit(draft, persona, 'DOCUMENT_SUBMITTED', 'document', document.id, { category, sha256: document.sha256 });
      addNotification(draft, persona.customerId as string, 'Document submitted', `${title} is waiting for synthetic review.`, '/documents');
      return { document, receipt };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'me' && input.segments[1] === 'documents' && input.segments[2] && input.segments[3] === 'versions' && method === 'POST') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    const content = String(body.content || '');
    allowFields(body, ['content', 'idempotency_key']);
    const idempotencyKey = scopedKey(persona, route, persona.customerId!, body.idempotency_key, body);
    if (!content || content.length > 100_000) throw new DemoStoreError(400, 'INVALID_DEMO_FILE', 'Use a non-empty synthetic text file no larger than 100 KB.');
    if (!idempotencyKey) throw new DemoStoreError(400, 'IDEMPOTENCY_REQUIRED', 'An idempotency key is required.');
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const previous = draft.documents.find((document) => document.id === input.segments[2] && document.customer_id === persona.customerId);
      if (!previous) throw new DemoStoreError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
      if (previous.property_id != null) assertCustomerProperty(draft, persona.customerId, previous.property_id);
      const duplicate = findDuplicate(draft.receipts.filter((receipt) => receipt.actor_id === persona.userId && receipt.customer_id === persona.customerId && receipt.type === 'DOCUMENT_VERSION_SUBMITTED'), idempotencyKey, (receipt) => receipt.reference);
      if (duplicate) return { document: draft.documents.find((document) => document.id === duplicate.related_id && document.customer_id === persona.customerId), receipt: duplicate, duplicate: true };
      if (draft.documents.some((document) => document.supersedes_id === previous.id)) throw new DemoStoreError(409, 'STALE_DOCUMENT_VERSION', 'A newer version already exists. Submit from the latest version.');
      const marked = `DEMO / NOT AN OFFICIAL RECORD\n${content}`;
      const version = { ...previous, id: `document-${randomUUID()}`, status: 'SUBMITTED' as const, version: previous.version + 1, issued_at: draft.controls.clock, content: marked, sha256: sha256(marked), supersedes_id: previous.id, review_message: 'New synthetic version awaiting review.', revision: 1 };
      draft.documents.push(version);
      const receipt = addReceipt(draft, persona, 'DOCUMENT_VERSION_SUBMITTED', 'PENDING', `Version ${version.version} of ${version.title} submitted.`, 'document', version.id);
      receipt.reference = idempotencyKey;
      addAudit(draft, persona, 'DOCUMENT_VERSION_SUBMITTED', 'document', version.id, { supersedes_id: previous.id, sha256: version.sha256 });
      addNotification(draft, persona.customerId as string, 'Document version submitted', `Version ${version.version} of ${version.title} is waiting for synthetic review.`, '/documents');
      return { document: version, receipt, duplicate: false };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/payments' && method === 'POST') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    allowFields(body, ['property_id', 'amount_minor', 'due_date', 'description', 'idempotency_key']);
    const amountMinor = Number(body.amount_minor);
    const propertyId = String(body.property_id || '');
    const rawIdempotencyKey = body.idempotency_key;
    const idempotencyKey = scopedKey(persona, route, persona.customerId!, rawIdempotencyKey, body);
    const dueDate = String(body.due_date || world.controls.clock.slice(0, 10));
    const description = String(body.description || 'Synthetic payment evidence submitted for review').trim();
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > 100_000_000_00) throw new DemoStoreError(400, 'INVALID_AMOUNT', 'Use a positive PHP amount in integer centavos.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(Date.parse(`${dueDate}T00:00:00.000Z`))) throw new DemoStoreError(400, 'INVALID_DATE', 'Use a valid due date in YYYY-MM-DD format.');
    if (description.length < 3 || description.length > 240) throw new DemoStoreError(400, 'INVALID_DESCRIPTION', 'Use a payment evidence description from 3 to 240 characters.');
    if (!world.properties.some((property) => property.id === propertyId)) throw new DemoStoreError(404, 'PROPERTY_NOT_FOUND', 'Property not found.');
    assertCustomerProperty(world, persona.customerId, propertyId);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      assertCustomerProperty(draft, persona.customerId, propertyId);
      const duplicate = findDuplicate(draft.receipts.filter((receipt) => receipt.actor_id === persona.userId && receipt.customer_id === persona.customerId && receipt.type === 'PAYMENT_EVIDENCE_SUBMITTED'), idempotencyKey, (receipt) => receipt.reference);
      if (duplicate) return { payment: draft.payments.find((payment) => payment.id === duplicate.related_id && payment.customer_id === persona.customerId), receipt: duplicate, duplicate: true };
      const payment = {
        id: `payment-${randomUUID()}`,
        customer_id: persona.customerId as string,
        property_id: propertyId,
        reference: `DEMO-PAY-${String(draft.payments.length + 1).padStart(4, '0')}`,
        due_date: dueDate,
        amount_minor: amountMinor,
        currency: 'PHP' as const,
        status: 'SUBMITTED' as const,
        description,
        submitted_at: draft.controls.clock,
        verified_at: null,
        revision: 1,
      };
      draft.payments.push(payment);
      const receipt = addReceipt(draft, persona, 'PAYMENT_EVIDENCE_SUBMITTED', 'PENDING', `${payment.reference} records synthetic evidence only; no money was accepted.`, 'payment', payment.id);
      receipt.reference = idempotencyKey;
      addAudit(draft, persona, 'PAYMENT_EVIDENCE_SUBMITTED', 'payment', payment.id, { amount_minor: amountMinor, currency: 'PHP' });
      addNotification(draft, persona.customerId as string, 'Payment evidence submitted', `${payment.reference} is awaiting separate verification. No payment was collected.`, '/payment-records');
      return { payment, receipt };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/service-requests' && method === 'GET') {
    assertCustomer(persona);
    return { data: world.service_requests.filter((request) => request.customer_id === persona.customerId), world };
  }
  if (route === '/me/service-requests' && method === 'POST') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    allowFields(body, ['service_id', 'title', 'idempotency_key']);
    const serviceId = String(body.service_id || '');
    const title = String(body.title || '').trim();
    serviceEligibility(world, persona.customerId!, serviceId);
    if (title.length < 3 || title.length > 160) throw new DemoStoreError(400, 'INVALID_TITLE', 'Use a request title from 3 to 160 characters.');
    const idempotencyKey = body.idempotency_key === undefined ? null : scopedKey(persona, route, persona.customerId!, body.idempotency_key, body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const { service, projectId } = serviceEligibility(draft, persona.customerId!, serviceId);
      if (idempotencyKey) {
        const duplicate = findDuplicate(draft.receipts.filter((receipt) => receipt.actor_id === persona.userId && receipt.customer_id === persona.customerId && receipt.type === 'SERVICE_REQUEST_SUBMITTED'), idempotencyKey, (receipt) => receipt.reference);
        if (duplicate) return { request: draft.service_requests.find((request) => request.id === duplicate.related_id && request.customer_id === persona.customerId), receipt: duplicate, duplicate: true };
      }
      const request = { id: `service-request-${randomUUID()}`, customer_id: persona.customerId as string, company_id: service.company_id, project_id: projectId, service_id: serviceId, reference: `DEMO-SVC-${String(draft.service_requests.length + 1).padStart(4, '0')}`, title, status: 'SUBMITTED', created_at: draft.controls.clock, updated_at: draft.controls.clock, events: [{ status: 'SUBMITTED', at: draft.controls.clock, note: 'Synthetic resident-service request created.' }] };
      draft.service_requests.push(request);
      const receipt = addReceipt(draft, persona, 'SERVICE_REQUEST_SUBMITTED', 'SUBMITTED', `${request.reference} created in the local demo world.`, 'service_request', request.id);
      if (idempotencyKey) receipt.reference = idempotencyKey;
      addAudit(draft, persona, 'SERVICE_REQUEST_SUBMITTED', 'service_request', request.id, { service_id: serviceId }, service.company_id);
      addNotification(draft, persona.customerId as string, 'Service request submitted', `${request.reference} is available to the scoped operator.`, '/marketplace');
      return { request, receipt, duplicate: false };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/receipts' && method === 'GET') {
    assertCustomer(persona);
    return { data: world.receipts.filter((receipt) => receipt.customer_id === persona.customerId), world };
  }
  if (route === '/me/demo-records' && method === 'GET') {
    assertCustomer(persona);
    return { data: world.controls.empty_state ? { ...demoRecords(world, persona.customerId as string), payments: [], documents: [], certificates: [], milestones: [] } : demoRecords(world, persona.customerId as string), world };
  }
  if (route === '/me/saved-properties' && method === 'GET') {
    assertCustomer(persona);
    return { data: world.saved_properties.filter((item) => item.customer_id === persona.customerId).map((item) => ({ ...item, property: propertyView(world, world.properties.find((property) => property.id === item.property_id) as DemoProperty) })), world };
  }
  if (input.segments[0] === 'me' && input.segments[1] === 'saved-properties' && input.segments[2] && ['POST', 'DELETE'].includes(method)) {
    assertCustomer(persona);
    const propertyId = input.segments[2];
    const { result, world: next } = await mutateDemoWorld((draft) => {
      if (!draft.properties.some((property) => property.id === propertyId)) throw new DemoStoreError(404, 'PROPERTY_NOT_FOUND', 'Property not found.');
      const existing = draft.saved_properties.find((item) => item.customer_id === persona.customerId && item.property_id === propertyId);
      if (method === 'DELETE') {
        draft.saved_properties = draft.saved_properties.filter((item) => item !== existing);
        return { saved: false };
      }
      if (!existing) draft.saved_properties.push({ id: `saved-${randomUUID()}`, customer_id: persona.customerId as string, property_id: propertyId, created_at: draft.controls.clock });
      return { saved: true };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/rewards/redeem' && method === 'POST') {
    assertCustomer(persona);
    const body = objectBody(input.body);
    const benefitId = String(body.benefit_id || '');
    allowFields(body, ['benefit_id', 'idempotency_key']);
    const idempotencyKey = scopedKey(persona, route, persona.customerId!, body.idempotency_key, body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const duplicate = findDuplicate(draft.reward_entries.filter((entry) => entry.customer_id === persona.customerId), idempotencyKey, (entry) => entry.idempotency_key);
      if (duplicate) return { duplicate: true, entry: duplicate, balance: demoRecords(draft, persona.customerId as string).rewards.balance };
      const benefit = draft.benefits.find((candidate) => candidate.id === benefitId);
      if (!benefit || benefit.status !== 'Available' || !Number.isSafeInteger(benefit.cost) || benefit.cost <= 0) throw new DemoStoreError(409, 'BENEFIT_UNAVAILABLE', 'That synthetic benefit is unavailable.');
      const balance = demoRecords(draft, persona.customerId as string).rewards.balance;
      if (balance < benefit.cost) throw new DemoStoreError(409, 'INSUFFICIENT_POINTS', 'There are not enough posted RHC Points for this benefit.');
      const entry = { id: `reward-${randomUUID()}`, customer_id: persona.customerId as string, date: draft.controls.clock, source: 'RHC Benefits Demo', points: -benefit.cost, reason: `Redeemed ${benefit.title}`, reference: `DEMO-RW-${String(draft.reward_entries.length + 1).padStart(4, '0')}`, rule_version: 'DEMO-RULE-1.0', status: 'POSTED' as const, idempotency_key: idempotencyKey };
      draft.reward_entries.push(entry);
      const receipt = addReceipt(draft, persona, 'BENEFIT_REDEMPTION', 'FULFILLED_DEMO', `${benefit.title} redeemed in demo mode.`, 'reward_entry', entry.id);
      draft.redemptions.push({ id: `redemption-${randomUUID()}`, customer_id: persona.customerId as string, benefit_id: benefit.id, points: benefit.cost, status: 'FULFILLED_DEMO', created_at: draft.controls.clock, receipt_id: receipt.id });
      addNotification(draft, persona.customerId as string, 'Demo benefit redeemed', `${benefit.title} was redeemed using synthetic RHC Points.`, '/rhc-points');
      addAudit(draft, persona, 'BENEFIT_REDEEMED', 'reward_entry', entry.id, { benefit_id: benefit.id, points: benefit.cost });
      return { entry, receipt, balance: balance - benefit.cost };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/me/activity' && method === 'GET') {
    assertCustomer(persona);
    const rows: Array<Record<string, unknown> & { occurred_at: string }> = [
      ...world.receipts.filter((item) => item.customer_id === persona.customerId).map((item) => ({ ...item, record_type: 'RECEIPT', occurred_at: item.created_at })),
      ...world.reward_entries.filter((item) => item.customer_id === persona.customerId).map((item) => ({ ...item, record_type: 'RHC_POINTS', occurred_at: item.date })),
      ...world.payments.filter((item) => item.customer_id === persona.customerId).map((item) => ({ ...item, record_type: 'PAYMENT', occurred_at: item.submitted_at })),
    ];
    rows.sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
    return { data: rows, world };
  }

  if (persona.application === 'admin' && method === 'GET' && input.segments.length === 1 &&
    ['companies', 'projects', 'properties', 'business-services'].includes(input.segments[0])) {
    let rows = scopedAdminRows(world, persona, input.segments[0]) as Row[];
    const status = input.url.searchParams.get('status');
    if (input.segments[0] === 'properties' && status) rows = rows.filter((row) => row.status === status);
    return { data: world.controls.empty_state ? [] : paginate(rows, input.url), world };
  }
  if (route === '/companies' && method === 'GET') return { data: paginate(world.companies, input.url), world };
  if (route === '/projects' && method === 'GET') return { data: paginate(world.projects.map((project) => ({ ...project, company: world.companies.find((company) => company.id === project.company_id) })), input.url), world };
  if (route === '/business-services' && method === 'GET') return { data: paginate(world.business_services.map((item) => companyView(world, item)), input.url), world };
  if (route === '/properties' && method === 'GET') {
    let rows = world.properties;
    const status = input.url.searchParams.get('status');
    if (status) rows = rows.filter((property) => property.status === status);
    return { data: world.controls.empty_state ? [] : paginate(rows.map((property) => propertyView(world, property)), input.url), world };
  }
  if (input.segments[0] === 'properties' && input.segments[1] && method === 'GET') {
    const property = world.properties.find((candidate) => candidate.id === input.segments[1]);
    if (!property) throw new DemoStoreError(404, 'PROPERTY_NOT_FOUND', 'Property not found.');
    if (persona.application === 'admin') {
      assertAdmin(persona, 'property.view');
      assertAdminRecordScope(world, persona, 'properties', property);
    }
    if (persona.application === 'customer' && property.status !== 'AVAILABLE' && !world.property_links.some((link) => link.customer_id === persona.customerId && link.property_id === property.id)) {
      throw new DemoStoreError(404, 'PROPERTY_NOT_FOUND', 'Property not found.');
    }
    return { data: propertyView(world, property), world };
  }

  if (route === '/admin/dashboard' && method === 'GET') return { data: adminDashboard(world, persona), world };
  if (input.segments[0] === 'admin' && input.segments[1] && method === 'GET' && input.segments.length === 2) {
    const rows = scopedAdminRows(world, persona, input.segments[1]);
    return { data: world.controls.empty_state ? [] : paginate(rows as unknown[], input.url), world };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'users' && input.segments[2] && input.segments[3] === 'verification' && input.segments[4] === 'approve' && method === 'POST') {
    assertAdmin(persona, 'user.manage', true);
    const targetId = input.segments[2];
    if (targetId === persona.userId) throw new DemoStoreError(403, 'SELF_APPROVAL_FORBIDDEN', 'Self-approval is not allowed.');
    const body = objectBody(input.body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const target = draft.users.find((user) => user.id === targetId);
      if (!target) throw new DemoStoreError(404, 'USER_NOT_FOUND', 'Customer not found.');
      assertAdminRecordScope(draft, persona, 'identity', target);
      if (target.is_admin) throw new DemoStoreError(403, 'CUSTOMER_REQUIRED', 'Only customer identity reviews can be approved.');
      if (String(body.expected_status) !== target.verification_status) throw new DemoStoreError(409, 'STALE_STATUS', 'The customer status changed. Refresh before reviewing again.');
      if (target.account_status !== 'ACTIVE' || !target.auth_email_confirmed_at || !['PENDING', 'UNVERIFIED', 'REJECTED'].includes(target.verification_status)) throw new DemoStoreError(409, 'REVIEW_INELIGIBLE', 'This customer is not currently eligible for approval.');
      target.verification_status = 'VERIFIED';
      target.profile.verification_status = 'VERIFIED';
      target.updated_at = draft.controls.clock;
      addAudit(draft, persona, 'BUSINESS_VERIFICATION_APPROVED', 'rhc_digital_id', target.id, { review_reference: body.review_reference, previous_status: body.expected_status });
      addNotification(draft, target.id, 'Business verification approved', 'Your synthetic business review is approved. RHC ID issuance remains a separate customer action.', '/digital-id');
      return { id: target.id, verification_status: target.verification_status };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'reservations' && input.segments[2] && input.segments[3] && method === 'POST') {
    assertAdmin(persona, 'reservation.manage', true);
    const reservationId = input.segments[2];
    const action = input.segments[3];
    const transitions: Record<string, { from: string[]; to: DemoWorld['reservations'][number]['status']; property: DemoProperty['status'] }> = {
      confirm: { from: ['PENDING'], to: 'CONFIRMED', property: 'RESERVED' },
      cancel: { from: ['PENDING', 'CONFIRMED'], to: 'CANCELLED', property: 'AVAILABLE' },
      expire: { from: ['PENDING', 'CONFIRMED'], to: 'EXPIRED', property: 'AVAILABLE' },
      convert: { from: ['CONFIRMED'], to: 'CONVERTED', property: 'CONTRACTED' },
    };
    const transition = transitions[action];
    if (!transition) throw new DemoStoreError(404, 'ACTION_NOT_FOUND', 'Unknown reservation transition.');
    const body = objectBody(input.body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const reservation = draft.reservations.find((candidate) => candidate.id === reservationId);
      if (!reservation) throw new DemoStoreError(404, 'RESERVATION_NOT_FOUND', 'Reservation not found.');
      assertAdminRecordScope(draft, persona, 'reservations', reservation);
      if (!propertyScope(draft, reservation.property_id).length) throw new DemoStoreError(400, 'INVALID_REFERENCE', 'Reservation property is missing.');
      if (!transition.from.includes(reservation.status)) throw new DemoStoreError(409, 'INVALID_TRANSITION', `A ${reservation.status} reservation cannot be ${action}ed.`);
      const previous = reservation.status;
      reservation.status = transition.to;
      reservation.updated_at = draft.controls.clock;
      reservation.revision += 1;
      reservation.events.push({ id: `reservation-event-${randomUUID()}`, type: transition.to, at: draft.controls.clock, actor_id: persona.userId, note: String(body.note || `Admin ${action} action`) });
      const property = draft.properties.find((candidate) => candidate.id === reservation.property_id);
      if (property) { property.status = transition.property; property.revision += 1; }
      addAudit(draft, persona, `RESERVATION_${transition.to}`, 'reservation', reservation.id, { previous_status: previous, review_reference: body.review_reference }, 'company-amica-condo', property?.project_id);
      addNotification(draft, reservation.customer_id, `Reservation ${transition.to.toLowerCase()}`, `${reservation.reservation_number} is now ${transition.to.toLowerCase()}.`, '/reservations');
      return reservationView(draft, reservation, persona);
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'feature-flags' && input.segments[2] && method === 'PATCH') {
    assertAdmin(persona, 'feature_flag.manage', true);
    const body = objectBody(input.body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const flag = draft.feature_flags.find((candidate) => candidate.id === input.segments[2]);
      if (!flag) throw new DemoStoreError(404, 'FLAG_NOT_FOUND', 'Feature flag not found.');
      assertAdminRecordScope(draft, persona, 'feature-flags', flag);
      allowFields(body, ['enabled', 'review_reference']);
      if (typeof body.enabled !== 'boolean') throw new DemoStoreError(400, 'INVALID_FIELD', 'enabled must be boolean.');
      if (Boolean(body.enabled) && ['ENABLE_WALLET', 'ENABLE_TOKEN', 'ENABLE_BLOCKCHAIN'].includes(flag.key)) throw new DemoStoreError(409, 'ACTIVATION_NOT_APPROVED', 'This future capability cannot be activated by the demo presentation control.');
      flag.enabled = Boolean(body.enabled);
      flag.updated_at = draft.controls.clock;
      addAudit(draft, persona, 'FEATURE_FLAG_UPDATED', 'feature_flag', flag.id, { enabled: flag.enabled });
      return flag;
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'system-settings' && input.segments[2] && method === 'PUT') {
    assertAdmin(persona, 'system_settings.manage', true);
    if (!isGlobal(persona)) throw new DemoStoreError(403, 'SCOPE_DENIED', 'System settings require global administration.');
    const body = objectBody(input.body);
    allowFields(body, ['value', 'review_reference']);
    const key = input.segments[2];
    const { result, world: next } = await mutateDemoWorld((draft) => {
      let setting = draft.system_settings.find((candidate) => candidate.key === key);
      if (!setting) { setting = { id: `setting-${randomUUID()}`, key }; draft.system_settings.push(setting); }
      setting.value = body.value;
      setting.updated_at = draft.controls.clock;
      addAudit(draft, persona, 'SYSTEM_SETTING_UPDATED', 'system_setting', setting.id, { key, review_reference: body.review_reference });
      return setting;
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'users' && input.segments[2] && input.segments[3] === 'status' && method === 'PATCH') {
    assertAdmin(persona, 'user.manage', true);
    const body = objectBody(input.body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const target = draft.users.find((candidate) => candidate.id === input.segments[2]);
      if (!target) throw new DemoStoreError(404, 'USER_NOT_FOUND', 'User not found.');
      assertAdminRecordScope(draft, persona, 'users', target);
      allowFields(body, ['account_status', 'expected_status', 'review_reference']);
      if (!['PENDING', 'ACTIVE', 'DISABLED', 'LOCKED'].includes(String(body.account_status))) throw new DemoStoreError(400, 'INVALID_STATUS', 'Unknown account status.');
      if (!isGlobal(persona) && (target.is_admin || customerScopes(draft, target.id).some((scope) => !canSeeScope(persona, scope)))) {
        throw new DemoStoreError(403, 'GLOBAL_USER_ADMIN_FORBIDDEN', 'Scoped operators cannot change shared or staff account status.');
      }
      if (target.id === persona.userId && body.account_status !== 'ACTIVE') throw new DemoStoreError(403, 'SELF_DISABLE_FORBIDDEN', 'Self-disable is not allowed.');
      if (body.expected_status !== target.account_status) throw new DemoStoreError(409, 'STALE_STATUS', 'The account status changed.');
      target.account_status = String(body.account_status) as DemoUser['account_status'];
      target.updated_at = draft.controls.clock;
      addAudit(draft, persona, 'ACCOUNT_STATUS_UPDATED', 'user', target.id, { account_status: target.account_status, review_reference: body.review_reference });
      return userView(draft, persona, target);
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'roles' && input.segments[2] && input.segments[3] === 'permissions' && method === 'PUT') {
    assertAdmin(persona, 'role.manage', true);
    assertAdmin(persona, 'permission.manage', true);
    const body = objectBody(input.body);
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const role = draft.roles.find((candidate) => candidate.id === input.segments[2]);
      if (!role) throw new DemoStoreError(404, 'ROLE_NOT_FOUND', 'Role not found.');
      assertAdminRecordScope(draft, persona, 'roles', role);
      if (role.is_system || reservedRoles.has(role.code)) throw new DemoStoreError(409, 'PROTECTED_ROLE', 'Protected system roles cannot be changed in this demo.');
      allowFields(body, ['permission_ids', 'review_reference']);
      if (!Array.isArray(body.permission_ids)) throw new DemoStoreError(400, 'INVALID_PERMISSIONS', 'permission_ids must be an array.');
      const permissionIds = body.permission_ids;
      for (const id of permissionIds) {
        const permission = draft.permissions.find((item) => item.id === id);
        if (typeof id !== 'string' || !permission) throw new DemoStoreError(400, 'INVALID_REFERENCE', 'Unknown permission ID.');
        if (!isGlobal(persona) && (!role.company_id || persona.projectIds.length && !role.project_id ||
          !persona.permissions.includes(permission.code) || /^(role|permission|user|system_settings|feature_flag|company)\./.test(permission.code))) {
          throw new DemoStoreError(403, 'GLOBAL_GRANT_FORBIDDEN', 'Scoped operators cannot delegate global or unheld capabilities.');
        }
      }
      role.role_permissions = [...new Set(permissionIds)].map((permission_id) => ({ permission_id }));
      addAudit(draft, persona, 'ROLE_PERMISSIONS_REPLACED', 'role', role.id, { review_reference: body.review_reference, permission_count: permissionIds.length });
      return role;
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'documents' && input.segments[2] && input.segments[3] && method === 'POST') {
    assertAdmin(persona, 'user.manage', true);
    const action = input.segments[3];
    if (!['approve', 'reject'].includes(action)) throw new DemoStoreError(404, 'ACTION_NOT_FOUND', 'Unknown document review action.');
    const body = objectBody(input.body);
    allowFields(body, ['reason', 'review_reference']);
    const reason = String(body.reason || '').trim();
    if (reason.length < 3) throw new DemoStoreError(400, 'REASON_REQUIRED', 'A review reason is required.');
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const document = draft.documents.find((candidate) => candidate.id === input.segments[2]);
      if (!document) throw new DemoStoreError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
      assertAdminRecordScope(draft, persona, 'documents', document);
      if (!['SUBMITTED', 'UNDER_REVIEW', 'REJECTED'].includes(document.status)) throw new DemoStoreError(409, 'INVALID_DOCUMENT_STATE', 'This document version is not reviewable.');
      document.status = action === 'approve' ? 'APPROVED' : 'REJECTED';
      document.review_message = reason;
      document.revision += 1;
      addAudit(draft, persona, `DOCUMENT_${document.status}`, 'document', document.id, { reason, version: document.version });
      addNotification(draft, document.customer_id, `Document ${document.status.toLowerCase()}`, `${document.title} version ${document.version}: ${reason}`, '/documents');
      return document;
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'payments' && input.segments[2] && input.segments[3] && method === 'POST') {
    assertAdmin(persona, 'customer.edit', true);
    const action = input.segments[3];
    if (!['verify', 'reverse'].includes(action)) throw new DemoStoreError(404, 'ACTION_NOT_FOUND', 'Unknown payment review action.');
    const body = objectBody(input.body);
    allowFields(body, ['reason', 'review_reference']);
    const reason = String(body.reason || '').trim();
    if (reason.length < 3) throw new DemoStoreError(400, 'REASON_REQUIRED', 'A review reason is required.');
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const payment = draft.payments.find((candidate) => candidate.id === input.segments[2]);
      if (!payment) throw new DemoStoreError(404, 'PAYMENT_NOT_FOUND', 'Payment record not found.');
      assertAdminRecordScope(draft, persona, 'payments', payment);
      if (action === 'verify') {
        if (!['SUBMITTED', 'PENDING'].includes(payment.status)) throw new DemoStoreError(409, 'INVALID_PAYMENT_STATE', 'Only submitted evidence can be verified.');
        payment.status = 'POSTED';
        payment.verified_at = draft.controls.clock;
        payment.revision += 1;
        addAudit(draft, persona, 'PAYMENT_VERIFIED', 'payment', payment.id, { reason, amount_minor: payment.amount_minor });
        addNotification(draft, payment.customer_id, 'Payment record verified', `${payment.reference} was verified as a synthetic business record. No money was collected by this demo.`, '/payment-records');
        return payment;
      }
      if (payment.status !== 'POSTED') throw new DemoStoreError(409, 'INVALID_PAYMENT_STATE', 'Only a posted payment record can be reversed.');
      if (draft.payments.some((entry) => entry.reversed_from_id === payment.id)) throw new DemoStoreError(409, 'PAYMENT_ALREADY_REVERSED', 'This payment already has an append-only reversal.');
      const reversal = { ...payment, id: `payment-${randomUUID()}`, reference: `${payment.reference}-REV`, status: 'REVERSED' as const, amount_minor: -payment.amount_minor, description: `Reversal: ${reason}`, submitted_at: draft.controls.clock, verified_at: draft.controls.clock, reversed_from_id: payment.id, revision: 1 };
      draft.payments.push(reversal);
      addAudit(draft, persona, 'PAYMENT_REVERSED', 'payment', reversal.id, { reason, reversed_from_id: payment.id });
      addNotification(draft, payment.customer_id, 'Payment correction recorded', `${reversal.reference} preserves the original record and applies a synthetic reversal.`, '/payment-records');
      return reversal;
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/admin/certificates' && method === 'POST') {
    assertAdmin(persona, 'user.manage', true);
    const body = objectBody(input.body);
    allowFields(body, ['customer_id', 'type', 'linked_record', 'source_version', 'review_reference']);
    const customerId = String(body.customer_id || '');
    const type = String(body.type || 'RHC Demo Certificate').trim();
    const linkedRecord = String(body.linked_record || '').trim();
    const target = world.users.find((user) => user.id === customerId && !user.is_admin);
    if (!target) throw new DemoStoreError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
    assertAdminRecordScope(world, persona, 'customers', target);
    if (!type || type.length > 160) throw new DemoStoreError(400, 'INVALID_TYPE', 'Certificate type is required and must be 160 characters or fewer.');
    if (!linkedRecord) throw new DemoStoreError(400, 'LINK_REQUIRED', 'A linked source record is required.');
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const customer = draft.users.find((user) => user.id === customerId && !user.is_admin);
      if (!customer) throw new DemoStoreError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
      assertAdminRecordScope(draft, persona, 'customers', customer);
      if (type.includes('Customer Verification') && (customer.account_status !== 'ACTIVE' || customer.verification_status !== 'VERIFIED' ||
        !customer.auth_email_confirmed_at || !customer.profile.rhc_id || linkedRecord !== customer.profile.rhc_id)) {
        throw new DemoStoreError(409, 'RHC_ID_INELIGIBLE', 'Identity credentials require an eligible customer and their issued RHC ID as source.');
      }
      const certificate = { id: `certificate-${randomUUID()}`, customer_id: customerId, reference: `DEMO-CERT-${String(draft.certificates.length + 1).padStart(4, '0')}`, public_reference: `demo-passport-${randomUUID().replaceAll('-', '')}`, type, status: 'ACTIVE' as const, issued_at: draft.controls.clock, expires_at: null, linked_record: linkedRecord, issuer: 'Rabino Holdings Corporation', source_version: body.source_version === undefined ? 1 : Number(body.source_version), internal_review_status: 'APPROVED', blockchain_status: 'NOT_REQUESTED' as const, revision: 1 };
      if (!certificateSource(draft, certificate).length || !Number.isSafeInteger(certificate.source_version) || certificate.source_version < 1) {
        throw new DemoStoreError(400, 'INVALID_REFERENCE', 'A valid customer-owned source and positive version are required.');
      }
      assertAdminRecordScope(draft, persona, 'certificates', certificate);
      draft.certificates.push(certificate);
      addAudit(draft, persona, 'CERTIFICATE_ISSUED', 'certificate', certificate.id, { linked_record: linkedRecord, source_version: certificate.source_version });
      addNotification(draft, customerId, 'Demo certificate issued', `${certificate.reference} is available for verification.`, '/certificates');
      return certificate;
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'certificates' && input.segments[2] && input.segments[3] && method === 'POST') {
    assertAdmin(persona, 'user.manage', true);
    const action = input.segments[3];
    const body = objectBody(input.body);
    const reason = String(body.reason || '').trim();
    if (!['revoke', 'supersede'].includes(action)) throw new DemoStoreError(404, 'ACTION_NOT_FOUND', 'Unknown certificate action.');
    if (reason.length < 3) throw new DemoStoreError(400, 'REASON_REQUIRED', 'A reason is required.');
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const certificate = draft.certificates.find((candidate) => candidate.id === input.segments[2]);
      if (!certificate) throw new DemoStoreError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found.');
      assertAdminRecordScope(draft, persona, 'certificates', certificate);
      if (certificateStatus(draft, certificate) !== 'ACTIVE') throw new DemoStoreError(409, 'INVALID_CERTIFICATE_STATE', 'Only an active certificate can change lifecycle state.');
      certificate.status = action === 'revoke' ? 'REVOKED' : 'SUPERSEDED';
      certificate.revoked_reason = reason;
      certificate.revision += 1;
      let replacement;
      if (action === 'supersede') {
        replacement = { ...certificate, id: `certificate-${randomUUID()}`, reference: `DEMO-CERT-${String(draft.certificates.length + 1).padStart(4, '0')}`, public_reference: `demo-passport-${randomUUID().replaceAll('-', '')}`, status: 'ACTIVE' as const, issued_at: draft.controls.clock, source_version: certificate.source_version + 1, superseded_by_id: undefined, revoked_reason: undefined, revision: 1 };
        certificate.superseded_by_id = replacement.id;
        draft.certificates.push(replacement);
      }
      addAudit(draft, persona, `CERTIFICATE_${certificate.status}`, 'certificate', certificate.id, { reason, replacement_id: replacement?.id });
      addNotification(draft, certificate.customer_id, `Certificate ${certificate.status.toLowerCase()}`, `${certificate.reference} changed state. ${reason}`, '/certificates');
      return { certificate, replacement };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1] === 'service-requests' && input.segments[2] && input.segments[3] === 'progress' && method === 'POST') {
    assertAdmin(persona, 'integration.manage', true);
    const body = objectBody(input.body);
    allowFields(body, ['status', 'note', 'review_reference']);
    const status = String(body.status || '').toUpperCase();
    const note = String(body.note || '').trim();
    if (!['ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status) || note.length < 3) throw new DemoStoreError(400, 'INVALID_SERVICE_TRANSITION', 'Choose a supported status and provide a note.');
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const request = draft.service_requests.find((candidate) => candidate.id === input.segments[2]);
      if (!request) throw new DemoStoreError(404, 'SERVICE_REQUEST_NOT_FOUND', 'Service request not found.');
      assertAdminRecordScope(draft, persona, 'service-requests', request);
      const transitions: Record<string, string[]> = {
        SUBMITTED: ['ACKNOWLEDGED', 'IN_PROGRESS', 'CANCELLED'],
        ACKNOWLEDGED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
      };
      if (!transitions[request.status]?.includes(status)) throw new DemoStoreError(409, 'INVALID_SERVICE_TRANSITION', `A ${request.status} request cannot move to ${status}.`);
      request.status = status;
      request.updated_at = draft.controls.clock;
      request.events.push({ status, at: draft.controls.clock, note });
      addAudit(draft, persona, 'SERVICE_REQUEST_PROGRESS', 'service_request', request.id, { status, note }, request.company_id);
      addNotification(draft, request.customer_id, 'Service request updated', `${request.reference} is now ${status.replaceAll('_', ' ').toLowerCase()}.`, '/marketplace');
      return request;
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (route === '/admin/rewards-ledger/credit' && method === 'POST') {
    assertAdmin(persona, 'customer.edit', true);
    const body = objectBody(input.body);
    allowFields(body, ['customer_id', 'points', 'source', 'reason', 'rule_version', 'idempotency_key']);
    const customerId = String(body.customer_id || '');
    const points = body.points;
    if (typeof points !== 'number') throw new DemoStoreError(400, 'INVALID_POINTS', 'Points must be a numeric whole-number quantity.');
    for (const field of ['source', 'reason', 'rule_version']) {
      if (body[field] !== undefined && (typeof body[field] !== 'string' || !(body[field] as string).trim() || (body[field] as string).length > 240)) {
        throw new DemoStoreError(400, 'INVALID_REWARD_METADATA', `${field} must be non-empty text up to 240 characters.`);
      }
    }
    const idempotencyKey = scopedKey(persona, route, customerId, body.idempotency_key, body);
    if (!Number.isSafeInteger(points) || points <= 0 || points > 100_000) throw new DemoStoreError(400, 'INVALID_POINTS', 'Use a positive whole-number points quantity.');
    const { result, world: next } = await mutateDemoWorld((draft) => {
      const customer = draft.users.find((user) => user.id === customerId && !user.is_admin);
      if (!customer) throw new DemoStoreError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
      assertAdminRecordScope(draft, persona, 'customers', customer);
      assertAdminRecordScope(draft, persona, 'rewards-ledger', { customer_id: customerId });
      const existing = findDuplicate(draft.reward_entries.filter((entry) => entry.customer_id === customerId), idempotencyKey, (entry) => entry.idempotency_key);
      if (existing) return { entry: existing, duplicate: true };
      const entry = { id: `reward-${randomUUID()}`, customer_id: customerId, date: draft.controls.clock, source: String(body.source || 'RHC Demo Rule'), points, reason: String(body.reason || 'Synthetic qualifying event'), reference: `DEMO-RW-${String(draft.reward_entries.length + 1).padStart(4, '0')}`, rule_version: String(body.rule_version || 'DEMO-RULE-1.0'), status: 'POSTED' as const, idempotency_key: idempotencyKey };
      draft.reward_entries.push(entry);
      demoRecords(draft, customerId); // Validate derived totals before committing the append-only credit.
      addAudit(draft, persona, 'REWARD_CREDIT_POSTED', 'reward_entry', entry.id, { points, rule_version: entry.rule_version, idempotency_key: idempotencyKey });
      addNotification(draft, customerId, 'RHC Points credited', `${points.toLocaleString()} synthetic RHC Points were credited under ${entry.rule_version}.`, '/rhc-points');
      return { entry, duplicate: false };
    }, input.expectedRevision);
    return { data: result, world: next };
  }
  if (input.segments[0] === 'admin' && input.segments[1]) {
    const resource = input.segments[1];
    const id = input.segments[2];
    if (input.segments.length <= 3 && ['POST', 'PATCH', 'DELETE'].includes(method)) {
      return mutateAdminCollection(persona, resource, method, id, objectBody(input.body), input.expectedRevision);
    }
  }

  throw new DemoStoreError(404, 'ROUTE_NOT_FOUND', `No local demo route matches ${method} ${route}.`);
}
