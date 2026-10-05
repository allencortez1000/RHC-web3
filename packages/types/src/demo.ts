export type DemoApplication = 'customer' | 'admin';
export type DemoScenario = 'baseline' | 'empty' | 'exceptions';
export type DemoProvenance = 'DEMO';

export type DemoPersona = {
  id: string;
  name: string;
  email: string;
  role: string;
  application: DemoApplication;
  description: string;
  userId: string;
  customerId?: string;
  companyIds: string[];
  projectIds: string[];
  permissions: string[];
  readOnly?: boolean;
};

const ADMIN_READ_PERMISSIONS = [
  'customer.view',
  'company.view',
  'project.view',
  'property.view',
  'customer_property.view',
  'reservation.view',
  'integration.view',
  'feature_flag.view',
  'audit.view',
  'user.view',
  'role.view',
  'permission.view',
  'system_settings.view',
];

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'customer-maya',
    name: 'Maya Santos',
    email: 'maya.santos@example.test',
    role: 'CUSTOMER',
    application: 'customer',
    description: 'Verified customer with a linked property, records, points, and active services.',
    userId: 'usr-customer-001',
    customerId: 'usr-customer-001',
    companyIds: [],
    projectIds: [],
    permissions: [],
  },
  {
    id: 'customer-noah',
    name: 'Noah Reyes',
    email: 'noah.reyes@example.test',
    role: 'CUSTOMER',
    application: 'customer',
    description: 'Unverified customer who can submit an identity review for a different authorized actor.',
    userId: 'usr-customer-002',
    customerId: 'usr-customer-002',
    companyIds: [],
    projectIds: [],
    permissions: [],
  },
  {
    id: 'operator-amica',
    name: 'Lina Cruz',
    email: 'lina.cruz@example.test',
    role: 'PROPERTY_ADMIN',
    application: 'admin',
    description: 'Amica-scoped operator for inventory, reservations, documents, and service requests.',
    userId: 'usr-staff-operator',
    companyIds: ['company-amica-condo', 'company-amica-water', 'company-amica-mart'],
    projectIds: ['project-amica-t1'],
    permissions: [
      ...ADMIN_READ_PERMISSIONS,
      'property.create',
      'property.edit',
      'property.change_status',
      'reservation.manage',
      'customer_property.manage',
      'integration.manage',
    ],
  },
  {
    id: 'compliance-admin',
    name: 'Marco Villanueva',
    email: 'marco.villanueva@example.test',
    role: 'COMPLIANCE_OFFICER',
    application: 'admin',
    description: 'Scoped compliance administrator for identity, document, and certificate reviews.',
    userId: 'usr-staff-compliance',
    companyIds: ['company-rhc', 'company-amica-condo'],
    projectIds: ['project-amica-t1'],
    permissions: [...ADMIN_READ_PERMISSIONS, 'user.manage', 'customer.edit'],
  },
  {
    id: 'system-admin',
    name: 'Elena Garcia',
    email: 'elena.garcia@example.test',
    role: 'SYSTEM_ADMIN',
    application: 'admin',
    description: 'Global demo administrator for configuration and cross-module presentation.',
    userId: 'usr-staff-system',
    companyIds: [],
    projectIds: [],
    permissions: [
      ...ADMIN_READ_PERMISSIONS,
      'customer.edit',
      'company.manage',
      'project.create',
      'project.edit',
      'property.create',
      'property.edit',
      'property.change_status',
      'customer_property.manage',
      'reservation.create',
      'reservation.manage',
      'integration.manage',
      'feature_flag.manage',
      'user.manage',
      'role.manage',
      'permission.manage',
      'system_settings.manage',
    ],
  },
  {
    id: 'auditor',
    name: 'Ana de Leon',
    email: 'ana.deleon@example.test',
    role: 'AUDITOR',
    application: 'admin',
    description: 'Read-only auditor with traceable evidence and explicit write rejection.',
    userId: 'usr-staff-auditor',
    companyIds: [],
    projectIds: [],
    permissions: ADMIN_READ_PERMISSIONS,
    readOnly: true,
  },
];

export type DemoAccount = {
  id: string;
  email: string;
  account_status: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'LOCKED';
  verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  auth_email_confirmed_at: string | null;
  role: string;
  roles: string[];
  is_admin: boolean;
  permissions: string[];
  company_ids: string[];
  project_ids: string[];
};

export type DemoProfile = {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  address_line?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  mobile_number?: string | null;
  rhc_id?: string | null;
  rhc_id_issued_at?: string | null;
  verification_status?: string;
};

export type DemoUser = DemoAccount & {
  created_at: string;
  updated_at: string;
  profile: DemoProfile;
};

export type DemoCompany = {
  id: string;
  company_code: string;
  legal_name: string;
  display_name: string;
  description: string;
  business_type: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PREPARED' | 'SUSPENDED';
  integration_status: 'NOT_CONFIGURED' | 'PREPARED' | 'ACTIVE' | 'SUSPENDED' | 'ERROR';
};

export type DemoProject = {
  id: string;
  company_id: string;
  project_code: string;
  project_name: string;
  description: string;
  location: string;
  status: 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  start_date: string | null;
  target_completion: string | null;
};

export type DemoProperty = {
  id: string;
  project_id: string;
  property_code: string;
  asset_type: 'RESIDENTIAL' | 'COMMERCIAL' | 'PARKING';
  status: 'AVAILABLE' | 'HELD' | 'RESERVED' | 'CONTRACTED' | 'SOLD' | 'FOR_TURNOVER' | 'TURNED_OVER' | 'BLOCKED';
  tower: string;
  floor: string;
  unit_number: string;
  area: string;
  list_price_minor: number;
  list_price: string;
  currency: 'PHP';
  metadata: Record<string, unknown>;
  revision: number;
};

export type DemoReservation = {
  id: string;
  reservation_number: string;
  customer_id: string;
  property_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'CONVERTED';
  expires_at: string;
  created_at: string;
  updated_at: string;
  revision: number;
  events: Array<{ id: string; type: string; at: string; actor_id: string; note: string }>;
};

export type DemoPropertyLink = {
  id: string;
  customer_id: string;
  property_id: string;
  relationship_type: string;
  status: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
};

export type DemoPayment = {
  id: string;
  customer_id: string;
  property_id: string;
  reference: string;
  due_date: string;
  amount_minor: number;
  currency: 'PHP';
  status: 'SUBMITTED' | 'PENDING' | 'POSTED' | 'REVERSED';
  description: string;
  document_id?: string;
  submitted_at: string;
  verified_at?: string | null;
  reversed_from_id?: string | null;
  revision: number;
};

export type DemoDocument = {
  id: string;
  customer_id: string;
  property_id?: string;
  title: string;
  category: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  version: number;
  issued_at: string;
  issuer: string;
  content: string;
  sha256: string;
  review_message?: string;
  supersedes_id?: string;
  revision: number;
};

export type DemoCertificate = {
  id: string;
  customer_id: string;
  reference: string;
  public_reference: string;
  type: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED';
  issued_at: string;
  expires_at?: string | null;
  linked_record: string;
  issuer: string;
  source_version: number;
  internal_review_status: string;
  blockchain_status: 'NOT_REQUESTED' | 'QUEUED' | 'ANCHOR_PENDING' | 'CONFIRMED' | 'FAILED';
  superseded_by_id?: string;
  revoked_reason?: string;
  revision: number;
};

export type DemoRewardEntry = {
  id: string;
  customer_id: string;
  date: string;
  source: string;
  points: number;
  reason: string;
  reference: string;
  rule_version: string;
  status: 'POSTED' | 'PENDING' | 'REVERSED' | 'EXPIRED';
  idempotency_key: string;
};

export type DemoNotification = {
  id: string;
  customer_id: string;
  subject: string;
  body: string;
  channel: 'IN_APP';
  status: 'Unread' | 'Read';
  href?: string;
  created_at: string;
};

export type DemoReceipt = {
  id: string;
  customer_id?: string;
  actor_id: string;
  type: string;
  reference: string;
  status: string;
  summary: string;
  related_type: string;
  related_id: string;
  created_at: string;
  demo: true;
};

export type DemoAudit = {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  company_id?: string | null;
  project_id?: string | null;
  request_id: string;
  correlation_id: string;
  changes: Record<string, unknown>;
  created_at: string;
};

export type DemoSession = {
  token: string;
  persona_id: string;
  application: DemoApplication;
  created_at: string;
  expires_at: string;
};

export type DemoControlState = {
  scenario: DemoScenario;
  latency_ms: number;
  fail_next_request: boolean;
  empty_state: boolean;
  clock: string;
};

export type DemoWorld = {
  schema_version: 1;
  provenance: DemoProvenance;
  revision: number;
  seeded_at: string;
  controls: DemoControlState;
  sessions: DemoSession[];
  users: DemoUser[];
  companies: DemoCompany[];
  projects: DemoProject[];
  properties: DemoProperty[];
  saved_properties: Array<{ id: string; customer_id: string; property_id: string; created_at: string }>;
  reservations: DemoReservation[];
  property_links: DemoPropertyLink[];
  payments: DemoPayment[];
  documents: DemoDocument[];
  certificates: DemoCertificate[];
  reward_entries: DemoRewardEntry[];
  benefits: Array<{ id: string; title: string; cost: number; status: string; detail: string }>;
  redemptions: Array<{ id: string; customer_id: string; benefit_id: string; points: number; status: string; created_at: string; receipt_id: string }>;
  milestones: Array<{ id: string; project_id: string; title: string; description: string; status: string; date: string; reviewer: string }>;
  turnover_cases: Array<{ id: string; customer_id: string; property_id: string; case_number: string; status: string; note: string; checklist: Array<{ label: string; complete: boolean }> }>;
  service_requests: Array<{ id: string; customer_id: string; company_id: string; service_id: string; reference: string; title: string; status: string; created_at: string; updated_at: string; events: Array<{ status: string; at: string; note: string }> }>;
  consents: Array<{ id: string; customer_id: string; consent_type: string; purpose: string; consent_version: string; company_id: string | null; granted: boolean; granted_at: string | null; withdrawn_at: string | null; created_at: string }>;
  notifications: DemoNotification[];
  receipts: DemoReceipt[];
  audit_logs: DemoAudit[];
  business_services: Array<Record<string, unknown> & { id: string; company_id: string }>;
  integrations: Array<Record<string, unknown> & { id: string; company_id: string }>;
  feature_flags: Array<Record<string, unknown> & { id: string; key: string; enabled: boolean }>;
  system_settings: Array<Record<string, unknown> & { id: string; key: string }>;
  roles: Array<Record<string, unknown> & { id: string; code: string }>;
  permissions: Array<Record<string, unknown> & { id: string; code: string }>;
  user_roles: Array<Record<string, unknown> & { id: string; user_id: string; role_id: string }>;
};

export type DemoSessionResponse = {
  session: { access_token: string; user: { id: string; email: string } };
  account: DemoAccount;
  target: DemoApplication;
};

export type DemoApiMeta = {
  provenance: DemoProvenance;
  revision: number;
  request_id: string;
  demo_clock: string;
};

export type DemoApiResponse<T> = {
  success: true;
  data: T;
  meta: DemoApiMeta;
};

export type DemoApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta: DemoApiMeta;
};
