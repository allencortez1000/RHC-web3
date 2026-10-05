import { createHash } from 'node:crypto';
import {
  DEMO_PERSONAS,
  type DemoCertificate,
  type DemoCompany,
  type DemoDocument,
  type DemoPayment,
  type DemoProject,
  type DemoProperty,
  type DemoRewardEntry,
  type DemoUser,
  type DemoWorld,
} from '@rhc/types';

const CLOCK = '2026-09-19T01:00:00.000Z';
const DAY = 86_400_000;
const atDay = (offset: number) => new Date(Date.parse(CLOCK) + offset * DAY).toISOString();
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const companies: DemoCompany[] = [
  ['company-rhc', 'RHC', 'Rabino Holdings Corporation', 'Rabino Holdings Corporation', 'Holding company and ecosystem operator.', 'HOLDING'],
  ['company-amica-condo', 'AMICA_CONDO', 'Amica Condominium Realty Corporation', 'Amica Condominium Realty Corporation', 'Property development and customer property operations.', 'REAL_ESTATE'],
  ['company-rhbc', 'RHBC', 'Rabino Home Builders Corporation', 'Rabino Home Builders Corporation', 'Construction and project delivery services.', 'CONSTRUCTION'],
  ['company-amica-water', 'AMICA_WATER', 'Amica Water', 'Amica Water Co. Ltd.', 'Resident water service directory entry.', 'UTILITY'],
  ['company-amica-mart', 'AMICA_MART', 'Amica Mart', 'Amica Mart Trading Corporation', 'Retail and resident benefit directory entry.', 'RETAIL'],
  ['company-rbac', 'RBAC', 'Rabino Broadcasting', 'Rabino Broadcasting and Advertising Corporation', 'Media and communications services.', 'MEDIA'],
  ['company-rssc', 'RSSC', 'Rabino Security Services', 'Rabino Security Services Corporation', 'Resident and property security services.', 'SECURITY'],
  ['company-coastline', 'COASTLINE', 'Coastline Food', 'Coastline Food Corporation', 'Food and hospitality service directory entry.', 'HOSPITALITY'],
].map(([id, company_code, display_name, legal_name, description, business_type]) => ({
  id,
  company_code,
  display_name,
  legal_name,
  description,
  business_type,
  status: 'ACTIVE',
  integration_status: company_code === 'RHC' || company_code === 'AMICA_CONDO' ? 'ACTIVE' : 'PREPARED',
}));

const projects: DemoProject[] = [
  {
    id: 'project-amica-t1',
    company_id: 'company-amica-condo',
    project_code: 'AMICA-T1',
    project_name: 'Amica Residences Tower 1',
    description: 'Pilot project metadata for the synthetic local demonstration.',
    location: 'Central Luzon, Philippines',
    status: 'ACTIVE',
    start_date: '2025-01-15T00:00:00.000Z',
    target_completion: '2028-12-15T00:00:00.000Z',
  },
];

const firstNames = [
  'Maya', 'Noah', 'Amara', 'Luis', 'Sofia', 'Gabriel', 'Isabel', 'Diego', 'Luna', 'Mateo',
  'Ava', 'Rafael', 'Elena', 'Miguel', 'Nina', 'Paolo', 'Camila', 'Joaquin', 'Bianca', 'Enzo',
  'Mika', 'Andres', 'Tala', 'Emilio', 'Althea', 'Carlos', 'Lea', 'Marco', 'Diana', 'Nico',
  'Inez', 'Samuel', 'Clara', 'Anton', 'Bea', 'Daniel', 'Rina', 'Felix', 'Gia', 'Theo',
];
const lastNames = [
  'Santos', 'Reyes', 'Cruz', 'Garcia', 'Navarro', 'Villanueva', 'Mendoza', 'Ramos', 'Torres', 'Flores',
];

function customer(index: number): DemoUser {
  const number = index + 1;
  const first = firstNames[index];
  const last = lastNames[index % lastNames.length];
  const verified = index !== 1 && index % 4 !== 3;
  const issued = verified && index < 24;
  return {
    id: `usr-customer-${String(number).padStart(3, '0')}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}.${String(number).padStart(2, '0')}@example.test`,
    account_status: 'ACTIVE',
    verification_status: index === 1 ? 'UNVERIFIED' : verified ? 'VERIFIED' : 'PENDING',
    auth_email_confirmed_at: index === 1 ? atDay(-8) : atDay(-40 + index),
    role: 'CUSTOMER',
    roles: ['CUSTOMER'],
    is_admin: false,
    permissions: [],
    company_ids: [],
    project_ids: [],
    created_at: atDay(-120 + index),
    updated_at: atDay(-10 + (index % 8)),
    profile: {
      first_name: first,
      last_name: last,
      mobile_number: `+63917${String(1000000 + index).padStart(7, '0')}`,
      nationality: 'Filipino',
      city: index % 2 ? 'San Fernando' : 'Angeles City',
      province: 'Pampanga',
      country: 'Philippines',
      rhc_id: issued ? `RHC-2026-${String(number).padStart(8, '0')}` : null,
      rhc_id_issued_at: issued ? atDay(-30 + index) : null,
      verification_status: index === 1 ? 'UNVERIFIED' : verified ? 'VERIFIED' : 'PENDING',
    },
  };
}

const customers = Array.from({ length: 40 }, (_, index) => customer(index));
customers[0].email = 'maya.santos@example.test';
customers[0].profile.mobile_number = '+639171234567';
customers[1].email = 'noah.reyes@example.test';

const staffUsers: DemoUser[] = DEMO_PERSONAS.filter((persona) => persona.application === 'admin').map((persona, index) => ({
  id: persona.userId,
  email: persona.email,
  account_status: 'ACTIVE',
  verification_status: 'VERIFIED',
  auth_email_confirmed_at: atDay(-180),
  role: persona.role,
  roles: [persona.role],
  is_admin: true,
  permissions: persona.permissions,
  company_ids: persona.companyIds,
  project_ids: persona.projectIds,
  created_at: atDay(-200 + index),
  updated_at: atDay(-4),
  profile: {
    first_name: persona.name.split(' ')[0],
    last_name: persona.name.split(' ').slice(1).join(' '),
    mobile_number: null,
    country: 'Philippines',
    verification_status: 'VERIFIED',
    rhc_id: null,
    rhc_id_issued_at: null,
  },
}));

const properties: DemoProperty[] = Array.from({ length: 40 }, (_, index) => {
  const number = index + 1;
  const floor = Math.floor(index / 5) + 1;
  const unit = (index % 5) + 1;
  let status: DemoProperty['status'] = 'AVAILABLE';
  if (index === 0) status = 'CONTRACTED';
  else if (index === 1 || index === 6) status = 'RESERVED';
  else if (index === 2 || index === 7) status = 'HELD';
  else if (index === 10 || index === 21) status = 'BLOCKED';
  else if (index === 15) status = 'SOLD';
  return {
    id: `property-${String(number).padStart(3, '0')}`,
    project_id: 'project-amica-t1',
    property_code: `AMICA-T1-A-${String(floor).padStart(2, '0')}-${String(unit).padStart(2, '0')}`,
    asset_type: index > 35 ? 'PARKING' : 'RESIDENTIAL',
    status,
    tower: 'Tower 1',
    floor: String(floor),
    unit_number: `${floor}${String(unit).padStart(2, '0')}`,
    area: index > 35 ? '12.50' : index % 3 === 0 ? '48.00' : '32.50',
    list_price_minor: (2_450_000 + floor * 85_000 + unit * 35_000) * 100,
    list_price: `${2_450_000 + floor * 85_000 + unit * 35_000}.00`,
    currency: 'PHP',
    metadata: { unit_type: index > 35 ? 'PARKING' : index % 3 === 0 ? '2 BEDROOM' : '1 BEDROOM', demo_data: true, illustrative_offer: true },
    revision: 1,
  };
});

const payments: DemoPayment[] = [
  {
    id: 'payment-001', customer_id: customers[0].id, property_id: properties[0].id,
    reference: 'DEMO-PAY-0001', due_date: '2026-08-20', amount_minor: 125_000_00,
    currency: 'PHP', status: 'POSTED', description: 'Synthetic reservation fee record',
    document_id: 'document-001', submitted_at: atDay(-35), verified_at: atDay(-33), revision: 2,
  },
  {
    id: 'payment-002', customer_id: customers[0].id, property_id: properties[0].id,
    reference: 'DEMO-PAY-0002', due_date: '2026-10-20', amount_minor: 275_000_00,
    currency: 'PHP', status: 'PENDING', description: 'Synthetic contract milestone awaiting verification',
    document_id: 'document-002', submitted_at: atDay(-4), verified_at: null, revision: 1,
  },
  {
    id: 'payment-003', customer_id: customers[0].id, property_id: properties[0].id,
    reference: 'DEMO-PAY-0003', due_date: '2026-07-20', amount_minor: 25_000_00,
    currency: 'PHP', status: 'REVERSED', description: 'Correction entry preserving original history',
    submitted_at: atDay(-60), verified_at: atDay(-58), reversed_from_id: 'payment-legacy-001', revision: 2,
  },
];

const documentInputs = [
  ['document-001', 'Demo Reservation Acknowledgement', 'Reservation', 'APPROVED', 1],
  ['document-002', 'Demo Payment Evidence', 'Payment', 'UNDER_REVIEW', 2],
  ['document-003', 'Demo Contract Summary', 'Contract', 'APPROVED', 2],
  ['document-004', 'Demo Identity Review Packet', 'Identity', 'SUBMITTED', 1],
] as const;
const documents: DemoDocument[] = documentInputs.map(([id, title, category, status, version], index) => {
  const content = `DEMO / NOT AN OFFICIAL RECORD\n${title}\nSynthetic fixture version ${version}.`;
  return {
    id,
    customer_id: index === 3 ? customers[1].id : customers[0].id,
    property_id: index === 3 ? undefined : properties[0].id,
    title,
    category,
    status,
    version,
    issued_at: atDay(-20 + index),
    issuer: index === 1 ? 'RHC Finance Demo' : 'Amica Demo Records',
    content,
    sha256: sha256(content),
    review_message: status === 'UNDER_REVIEW' ? 'Awaiting an authorized finance reviewer.' : undefined,
    revision: 1,
  };
});

const certificates: DemoCertificate[] = [
  {
    id: 'certificate-001', customer_id: customers[0].id, reference: 'DEMO-CERT-0001',
    public_reference: 'demo-passport-maya-7d2f0f9a', type: 'RHC Customer Verification Certificate',
    status: 'ACTIVE', issued_at: atDay(-12), linked_record: String(customers[0].profile.rhc_id),
    issuer: 'Rabino Holdings Corporation', source_version: 1, internal_review_status: 'APPROVED',
    blockchain_status: 'NOT_REQUESTED', revision: 1,
  },
  {
    id: 'certificate-002', customer_id: customers[0].id, reference: 'DEMO-CERT-0002',
    public_reference: 'demo-passport-property-a81d44ce', type: 'Demo Property Record Certificate',
    status: 'SUPERSEDED', issued_at: atDay(-30), linked_record: properties[0].property_code,
    issuer: 'Amica Condominium Realty Corporation', source_version: 1, internal_review_status: 'APPROVED',
    blockchain_status: 'NOT_REQUESTED', superseded_by_id: 'certificate-003', revision: 2,
  },
  {
    id: 'certificate-003', customer_id: customers[0].id, reference: 'DEMO-CERT-0003',
    public_reference: 'demo-passport-property-b1e598da', type: 'Demo Property Record Certificate',
    status: 'ACTIVE', issued_at: atDay(-10), linked_record: properties[0].property_code,
    issuer: 'Amica Condominium Realty Corporation', source_version: 2, internal_review_status: 'APPROVED',
    blockchain_status: 'ANCHOR_PENDING', revision: 1,
  },
  {
    id: 'certificate-004', customer_id: customers[0].id, reference: 'DEMO-CERT-0004',
    public_reference: 'demo-passport-revoked-449ad0cb', type: 'Demo Turnover Readiness Certificate',
    status: 'REVOKED', issued_at: atDay(-40), linked_record: 'TURN-DEMO-0001',
    issuer: 'Rabino Holdings Corporation', source_version: 1, internal_review_status: 'APPROVED',
    blockchain_status: 'NOT_REQUESTED', revoked_reason: 'Superseded synthetic checklist evidence.', revision: 2,
  },
  {
    id: 'certificate-005', customer_id: customers[1].id, reference: 'DEMO-CERT-0005',
    public_reference: 'demo-passport-pending-176ab901', type: 'RHC Customer Verification Certificate',
    status: 'PENDING', issued_at: atDay(-2), linked_record: 'IDENTITY-REVIEW-DEMO-002',
    issuer: 'Rabino Holdings Corporation', source_version: 1, internal_review_status: 'PENDING',
    blockchain_status: 'NOT_REQUESTED', revision: 1,
  },
  {
    id: 'certificate-006', customer_id: customers[4].id, reference: 'DEMO-CERT-0006',
    public_reference: 'demo-passport-expired-09a42cb1', type: 'RHC Customer Verification Certificate',
    status: 'EXPIRED', issued_at: atDay(-400), expires_at: atDay(-30), linked_record: String(customers[4].profile.rhc_id),
    issuer: 'Rabino Holdings Corporation', source_version: 1, internal_review_status: 'APPROVED',
    blockchain_status: 'NOT_REQUESTED', revision: 1,
  },
];

const rewardEntries: DemoRewardEntry[] = [
  { id: 'reward-001', customer_id: customers[0].id, date: atDay(-18), source: 'Amica Demo', points: 1000, reason: 'Synthetic qualifying property milestone', reference: 'DEMO-RW-0001', rule_version: 'DEMO-RULE-1.0', status: 'POSTED', idempotency_key: 'milestone-property-001' },
  { id: 'reward-002', customer_id: customers[0].id, date: atDay(-12), source: 'Amica Mart Demo', points: 500, reason: 'Synthetic retail participation event', reference: 'DEMO-RW-0002', rule_version: 'DEMO-RULE-1.0', status: 'POSTED', idempotency_key: 'retail-event-001' },
  { id: 'reward-003', customer_id: customers[0].id, date: atDay(-8), source: 'RHC Benefits Demo', points: -200, reason: 'Synthetic benefit redemption', reference: 'DEMO-RW-0003', rule_version: 'DEMO-RULE-1.0', status: 'POSTED', idempotency_key: 'redemption-legacy-001' },
  { id: 'reward-004', customer_id: customers[0].id, date: atDay(-2), source: 'Amica Demo', points: 250, reason: 'Pending eligibility review', reference: 'DEMO-RW-0004', rule_version: 'DEMO-RULE-1.0', status: 'PENDING', idempotency_key: 'eligibility-pending-001' },
];

function permissionRows() {
  const values = [...new Set(DEMO_PERSONAS.flatMap((persona) => persona.permissions))].sort();
  return values.map((code) => ({ id: `permission-${code.replaceAll('.', '-')}`, code, description: code }));
}

export function createDemoWorld(): DemoWorld {
  const now = CLOCK;
  const reservations = [
    {
      id: 'reservation-001', reservation_number: 'DEMO-RES-0001', customer_id: customers[0].id,
      property_id: properties[0].id, status: 'CONFIRMED' as const, expires_at: atDay(30),
      created_at: atDay(-45), updated_at: atDay(-42), revision: 2,
      events: [
        { id: 'reservation-event-001', type: 'CREATED', at: atDay(-45), actor_id: customers[0].id, note: 'Synthetic reservation submitted.' },
        { id: 'reservation-event-002', type: 'CONFIRMED', at: atDay(-42), actor_id: 'usr-staff-operator', note: 'Confirmed for demo presentation.' },
      ],
    },
    {
      id: 'reservation-002', reservation_number: 'DEMO-RES-0002', customer_id: customers[2].id,
      property_id: properties[1].id, status: 'PENDING' as const, expires_at: atDay(5),
      created_at: atDay(-2), updated_at: atDay(-2), revision: 1,
      events: [{ id: 'reservation-event-003', type: 'CREATED', at: atDay(-2), actor_id: customers[2].id, note: 'Synthetic reservation submitted.' }],
    },
  ];
  const auditLogs = Array.from({ length: 120 }, (_, index) => ({
    id: `audit-${String(index + 1).padStart(4, '0')}`,
    actor_user_id: index % 5 === 0 ? 'usr-staff-compliance' : index % 3 === 0 ? 'usr-staff-operator' : 'usr-staff-system',
    action: ['RECORD_VIEWED', 'RESERVATION_REVIEWED', 'DOCUMENT_REVIEWED', 'CUSTOMER_SCOPED'][index % 4],
    entity_type: ['customer', 'reservation', 'document', 'property'][index % 4],
    entity_id: `demo-entity-${String(index + 1).padStart(3, '0')}`,
    company_id: index % 2 ? 'company-amica-condo' : 'company-rhc',
    project_id: index % 2 ? 'project-amica-t1' : null,
    request_id: `demo-request-${String(index + 1).padStart(4, '0')}`,
    correlation_id: `demo-correlation-${String(Math.floor(index / 3) + 1).padStart(4, '0')}`,
    changes: { demo: true, summary: 'Sanitized synthetic audit event.' },
    created_at: atDay(-index / 4),
  }));

  return structuredClone({
    schema_version: 1,
    provenance: 'DEMO',
    revision: 1,
    seeded_at: now,
    controls: { scenario: 'baseline', latency_ms: 0, fail_next_request: false, empty_state: false, clock: now },
    sessions: [],
    users: [...customers, ...staffUsers],
    companies,
    projects,
    properties,
    saved_properties: [{ id: 'saved-001', customer_id: customers[0].id, property_id: properties[4].id, created_at: atDay(-3) }],
    reservations,
    property_links: [{
      id: 'property-link-001', customer_id: customers[0].id, property_id: properties[0].id,
      relationship_type: 'BUYER', status: 'ACTIVE', effective_from: atDay(-40), effective_to: null,
      created_at: atDay(-40), updated_at: atDay(-40),
    }],
    payments,
    documents,
    certificates,
    reward_entries: rewardEntries,
    benefits: [
      { id: 'benefit-001', title: 'Demo Amica Mart voucher', cost: 300, status: 'Available', detail: 'Synthetic benefit; no merchant settlement occurs.' },
      { id: 'benefit-002', title: 'Demo resident service priority', cost: 500, status: 'Available', detail: 'Local request prioritization demonstration only.' },
      { id: 'benefit-003', title: 'Demo document assistance', cost: 200, status: 'Available', detail: 'Creates a synthetic support request.' },
    ],
    redemptions: [{ id: 'redemption-001', customer_id: customers[0].id, benefit_id: 'benefit-003', points: 200, status: 'FULFILLED_DEMO', created_at: atDay(-8), receipt_id: 'receipt-legacy-redemption' }],
    milestones: [
      { id: 'milestone-001', project_id: 'project-amica-t1', title: 'Foundation works update', description: 'Synthetic reported milestone for presentation; not an official project-control percentage.', status: 'REVIEWED', date: atDay(-50), reviewer: 'Amica Demo Reviewer' },
      { id: 'milestone-002', project_id: 'project-amica-t1', title: 'Structural works update', description: 'Synthetic evidence package is under business review.', status: 'REPORTED', date: atDay(-20), reviewer: 'Property Admin Demo' },
      { id: 'milestone-003', project_id: 'project-amica-t1', title: 'Customer document checkpoint', description: 'Sample customer-facing milestone with required action.', status: 'ACTION_REQUIRED', date: atDay(-2), reviewer: 'Compliance Demo' },
    ],
    turnover_cases: [{
      id: 'turnover-001', customer_id: customers[0].id, property_id: properties[0].id,
      case_number: 'TURN-DEMO-0001', status: 'CHECKLIST_IN_PROGRESS',
      note: 'Synthetic workflow only; not legal transfer or title issuance.',
      checklist: [
        { label: 'Business identity reviewed', complete: true },
        { label: 'Payment records reviewed', complete: true },
        { label: 'Document package acknowledged', complete: true },
        { label: 'Site inspection scheduled', complete: false },
      ],
    }],
    service_requests: [{
      id: 'service-request-001', customer_id: customers[0].id, company_id: 'company-amica-water', service_id: 'service-water',
      reference: 'DEMO-SVC-0001', title: 'Sample meter inspection request', status: 'IN_PROGRESS',
      created_at: atDay(-5), updated_at: atDay(-3),
      events: [
        { status: 'SUBMITTED', at: atDay(-5), note: 'Synthetic request created.' },
        { status: 'IN_PROGRESS', at: atDay(-3), note: 'Assigned to demo operator.' },
      ],
    }],
    consents: [
      { id: 'consent-001', customer_id: customers[0].id, consent_type: 'PRIVACY_POLICY', purpose: 'Account privacy processing', consent_version: 'DEMO-PRIVACY-1.0', company_id: null, granted: true, granted_at: atDay(-90), withdrawn_at: null, created_at: atDay(-90) },
      { id: 'consent-002', customer_id: customers[0].id, consent_type: 'TERMS', purpose: 'Account terms', consent_version: 'DEMO-TERMS-1.0', company_id: null, granted: true, granted_at: atDay(-90), withdrawn_at: null, created_at: atDay(-90) },
      { id: 'consent-003', customer_id: customers[0].id, consent_type: 'MARKETING', purpose: 'Optional marketing communications', consent_version: 'DEMO-MARKETING-1.0', company_id: null, granted: false, granted_at: null, withdrawn_at: atDay(-30), created_at: atDay(-30) },
    ],
    notifications: [
      { id: 'notification-001', customer_id: customers[0].id, subject: 'Document review needs attention', body: 'Your synthetic payment evidence is under review.', channel: 'IN_APP', status: 'Unread', href: '/documents', created_at: atDay(-1) },
      { id: 'notification-002', customer_id: customers[0].id, subject: 'Property milestone recorded', body: 'A reviewed synthetic project milestone is available.', channel: 'IN_APP', status: 'Unread', href: '/project-updates', created_at: atDay(-3) },
      { id: 'notification-003', customer_id: customers[0].id, subject: 'Welcome to RHC', body: 'This environment contains synthetic data and does not process real transactions.', channel: 'IN_APP', status: 'Read', href: '/dashboard', created_at: atDay(-20) },
      { id: 'notification-004', customer_id: customers[1].id, subject: 'Identity review submitted', body: 'Your synthetic review is waiting for an authorized different actor.', channel: 'IN_APP', status: 'Unread', href: '/digital-id', created_at: atDay(-2) },
    ],
    receipts: [{ id: 'receipt-legacy-redemption', customer_id: customers[0].id, actor_id: customers[0].id, type: 'BENEFIT_REDEMPTION', reference: 'DEMO-RCT-0001', status: 'FULFILLED_DEMO', summary: 'Synthetic document assistance benefit redeemed.', related_type: 'redemption', related_id: 'redemption-001', created_at: atDay(-8), demo: true }],
    audit_logs: auditLogs,
    business_services: [
      { id: 'service-property', company_id: 'company-amica-condo', service_code: 'PROPERTY_SERVICES', service_name: 'Property Services', service_type: 'PROPERTY', description: 'Property records and customer service workspace.', status: 'ACTIVE', integration_status: 'ACTIVE', requires_property: false, requires_resident_status: false },
      { id: 'service-water', company_id: 'company-amica-water', service_code: 'WATER_SERVICE', service_name: 'Amica Water Requests', service_type: 'UTILITY', description: 'Synthetic resident-service request tracking.', status: 'PREPARED', integration_status: 'PREPARED', requires_property: true, requires_resident_status: true },
      { id: 'service-market', company_id: 'company-amica-mart', service_code: 'MART_BENEFITS', service_name: 'Amica Mart Benefits', service_type: 'RETAIL', description: 'Demo benefit catalog; no checkout or settlement.', status: 'PREPARED', integration_status: 'PREPARED', requires_property: false, requires_resident_status: false },
      { id: 'service-security', company_id: 'company-rssc', service_code: 'SECURITY_REQUESTS', service_name: 'Security Service Requests', service_type: 'SECURITY', description: 'Prepared directory entry; external dispatch is not integrated.', status: 'COMING_SOON', integration_status: 'NOT_CONFIGURED', requires_property: true, requires_resident_status: true },
    ],
    integrations: companies.map((company) => ({ id: `integration-${company.company_code.toLowerCase()}`, company_id: company.id, integration_key: `${company.company_code}_DIRECTORY`, name: `${company.display_name} directory connector`, status: company.integration_status, updated_at: atDay(-7) })),
    feature_flags: [
      { id: 'flag-properties', key: 'ENABLE_PROPERTIES', enabled: true, scope: 'GLOBAL', description: 'Property discovery and records', updated_at: atDay(-7) },
      { id: 'flag-rewards', key: 'ENABLE_REWARDS', enabled: true, scope: 'DEMO_ONLY', description: 'Synthetic points workflows only', updated_at: atDay(-7) },
      { id: 'flag-wallet', key: 'ENABLE_WALLET', enabled: false, scope: 'GLOBAL', description: 'External wallet is not activated', updated_at: atDay(-7) },
      { id: 'flag-token', key: 'ENABLE_TOKEN', enabled: false, scope: 'GLOBAL', description: 'Public token is not authorized', updated_at: atDay(-7) },
      { id: 'flag-blockchain', key: 'ENABLE_BLOCKCHAIN', enabled: false, scope: 'GLOBAL', description: 'Public blockchain submission is not configured', updated_at: atDay(-7) },
    ],
    system_settings: [
      { id: 'setting-support', key: 'support_contact', value: { email: 'support@example.test' }, description: 'Synthetic support routing', updated_at: atDay(-7) },
      { id: 'setting-maintenance', key: 'maintenance_notice', value: { enabled: false, message: '' }, description: 'Demo presentation notice', updated_at: atDay(-7) },
      { id: 'setting-acceptance', key: 'month_1_acceptance_state', value: { status: 'under_review' }, description: 'Internal review state; not acceptance', updated_at: atDay(-7) },
    ],
    roles: [
      { id: 'role-customer', code: 'CUSTOMER', name: 'Customer', description: 'Customer self-service role', is_system: true, company_id: null, role_permissions: [] },
      { id: 'role-property-admin', code: 'PROPERTY_ADMIN', name: 'Property Administrator', description: 'Amica-scoped operations', is_system: true, company_id: 'company-amica-condo', role_permissions: [] },
      { id: 'role-compliance', code: 'COMPLIANCE_OFFICER', name: 'Compliance Officer', description: 'Identity and evidence review', is_system: true, company_id: 'company-rhc', role_permissions: [] },
      { id: 'role-system', code: 'SYSTEM_ADMIN', name: 'System Administrator', description: 'Global demo administration', is_system: true, company_id: null, role_permissions: [] },
      { id: 'role-auditor', code: 'AUDITOR', name: 'Auditor', description: 'Read-only audit role', is_system: true, company_id: null, role_permissions: [] },
    ],
    permissions: permissionRows(),
    user_roles: DEMO_PERSONAS.filter((persona) => persona.application === 'admin').map((persona) => ({
      id: `assignment-${persona.id}`,
      user_id: persona.userId,
      role_id: `role-${persona.role.toLowerCase().replaceAll('_', '-')}`,
      role: { name: persona.role.replaceAll('_', ' '), code: persona.role },
      company_id: persona.companyIds[0] || null,
      project_id: persona.projectIds[0] || null,
      expires_at: null,
    })),
  } satisfies DemoWorld);
}
