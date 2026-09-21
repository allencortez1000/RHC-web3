const base = process.env.RHC_DEMO_HUB_URL || 'http://127.0.0.1:3002/api/demo';
const hub = new URL(base);
if (hub.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(hub.hostname) || hub.username || hub.password || hub.search || hub.hash) {
  throw new Error('Demo smoke accepts only a plain HTTP loopback fixture hub; no external service is permitted.');
}
const customerOrigin = 'http://127.0.0.1:3002';
const adminOrigin = 'http://127.0.0.1:3003';

async function call(path, { method = 'GET', token, body, origin = customerOrigin, expected = 200, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    cache: 'no-store',
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(token ? { Authorization: `Demo ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (response.status !== expected) {
    throw new Error(`${method} ${path}: expected ${expected}, received ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload?.success === true ? payload.data : payload;
}

async function statusCall(path, { token, body, origin = customerOrigin }) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Origin: origin,
      Authorization: `Demo ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return response.status;
}

async function session(personaId, origin = customerOrigin) {
  const result = await call('/session', { method: 'POST', body: { persona_id: personaId }, origin });
  return result.session.access_token;
}

async function credentialSession(email, password, origin = customerOrigin) {
  return call('/session/credentials', { method: 'POST', body: { email, password }, origin });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('RHC demo smoke: rejecting untrusted cross-origin writes');
await call('/session', {
  method: 'POST',
  body: { persona_id: 'customer-maya' },
  origin: 'https://untrusted.example',
  expected: 403,
});

console.log('RHC demo smoke: credential shortcuts');
const customerCredential = await credentialSession('demo@rhc.local', 'Demo123456!');
assert(customerCredential.target === 'customer', 'Customer credential did not resolve to the customer portal.');
const credentialProfile = await call('/me', { token: customerCredential.session.access_token });
assert(credentialProfile.user.id === 'usr-customer-001', 'Customer credential did not create the Maya demo session.');
const adminCredential = await credentialSession('superadmin@example.com', 'Demo123456!', adminOrigin);
assert(adminCredential.target === 'admin', 'Admin credential did not resolve to the admin command center.');
await call('/admin/dashboard', { token: adminCredential.session.access_token, origin: adminOrigin });
await credentialSession('demo@rhc.local', 'wrong-password', customerOrigin).then(
  () => {
    throw new Error('Invalid demo credentials were accepted.');
  },
  (error) => {
    if (!String(error.message).includes('received 401')) throw error;
  },
);

console.log('RHC demo smoke: preparing deterministic baseline');
let system = await session('system-admin', adminOrigin);
await call('/reset', {
  method: 'POST',
  token: system,
  origin: adminOrigin,
  body: { confirmation: 'RESET RHC DEMO' },
});

const maya = await session('customer-maya');
const noah = await session('customer-noah');
const compliance = await session('compliance-admin', adminOrigin);
system = await session('system-admin', adminOrigin);
const operator = await session('operator-amica', adminOrigin);
const auditor = await session('auditor', adminOrigin);

console.log('RHC demo smoke: profile persistence');
await call('/me', { method: 'PATCH', token: maya, body: { mobile_number: '+639179999999' } });
const updatedProfile = await call('/me', { token: maya });
assert(updatedProfile.profile.mobile_number === '+639179999999', 'Profile change did not persist.');

console.log('RHC demo smoke: reservation conflict, cancellation, and release');
const inventory = await call('/properties?status=AVAILABLE&take=200', { token: maya });
const property = inventory[0];
assert(property?.id, 'No available property fixture exists.');
const reservation = await call('/me/reservations', {
  method: 'POST',
  token: maya,
  body: { property_id: property.id, idempotency_key: 'smoke-reservation-maya' },
});
await call('/me/reservations', {
  method: 'POST',
  token: noah,
  body: { property_id: property.id, idempotency_key: 'smoke-reservation-noah-conflict' },
  expected: 409,
});
const adminReservations = await call('/admin/reservations', { token: operator, origin: adminOrigin });
assert(adminReservations.some((item) => item.id === reservation.id), 'Admin did not observe the customer reservation.');
await call(`/admin/reservations/${reservation.id}/confirm`, { method: 'POST', token: operator, origin: adminOrigin, body: {} });
await call(`/me/reservations/${reservation.id}/cancel`, { method: 'POST', token: maya, body: { reason: 'Smoke cancellation' } });
const releasedReservation = await call('/me/reservations', {
  method: 'POST',
  token: noah,
  body: { property_id: property.id, idempotency_key: 'smoke-reservation-noah-after-release' },
});
assert(releasedReservation.status === 'PENDING', 'Released inventory could not be reserved.');

const simultaneousProperty = inventory.find((item) => item.id !== property.id);
assert(simultaneousProperty?.id, 'No second available property exists for the simultaneous reservation test.');
const simultaneousStatuses = await Promise.all([
  statusCall('/me/reservations', {
    token: maya,
    body: { property_id: simultaneousProperty.id, idempotency_key: 'smoke-simultaneous-maya' },
  }),
  statusCall('/me/reservations', {
    token: noah,
    body: { property_id: simultaneousProperty.id, idempotency_key: 'smoke-simultaneous-noah' },
  }),
]);
assert(
  simultaneousStatuses.sort((left, right) => left - right).join(',') === '200,409',
  `Simultaneous reservations did not serialize to one success and one conflict: ${simultaneousStatuses.join(',')}`,
);

console.log('RHC demo smoke: maker-checker identity review and customer issuance');
await call('/me/identity-review', {
  method: 'POST',
  token: noah,
  body: { idempotency_key: 'smoke-identity-noah' },
});
await call('/admin/users/usr-customer-002/verification/approve', {
  method: 'POST',
  token: compliance,
  origin: adminOrigin,
  body: { expected_status: 'PENDING', review_reference: 'SMOKE-ID-REVIEW-001' },
});
const approvedNoah = await call('/me', { token: noah });
assert(approvedNoah.user.verification_status === 'VERIFIED', 'Customer did not observe approved business verification.');
const issuedId = await call('/me/rhc-id', { method: 'POST', token: noah, body: {} });
assert(issuedId.rhc_id && issuedId.public_reference, 'Eligible customer could not issue the demo RHC ID.');
const reissuedId = await call('/me/rhc-id', { method: 'POST', token: noah, body: {} });
assert(reissuedId.rhc_id === issuedId.rhc_id && reissuedId.public_reference === issuedId.public_reference, 'Identity issuance retry changed its credential projection.');
const customerIds = (await call('/admin/customers', { token: system, origin: adminOrigin })).map((customer) => customer.profile?.rhc_id).filter(Boolean);
assert(new Set(customerIds).size === customerIds.length, 'RHC Digital ID issuance duplicated an existing identity.');

console.log('RHC demo smoke: document version review');
const submittedDocument = await call('/me/documents', {
  method: 'POST',
  token: maya,
  body: {
    title: 'Smoke Synthetic Evidence',
    category: 'Customer submission',
    content: 'Synthetic text only.',
    idempotency_key: 'smoke-document-001',
  },
});
await call(`/admin/documents/${submittedDocument.document.id}/approve`, {
  method: 'POST',
  token: compliance,
  origin: adminOrigin,
  body: { reason: 'Synthetic evidence reviewed for smoke test.' },
});
const submittedVersion = await call(`/me/documents/${submittedDocument.document.id}/versions`, {
  method: 'POST',
  token: maya,
  body: {
    content: 'Synthetic version two text only.',
    idempotency_key: 'smoke-document-version-002',
  },
});
const repeatedVersion = await call(`/me/documents/${submittedDocument.document.id}/versions`, {
  method: 'POST',
  token: maya,
  body: {
    content: 'Synthetic version two text only.',
    idempotency_key: 'smoke-document-version-002',
  },
});
assert(submittedVersion.document.id === repeatedVersion.document.id && repeatedVersion.duplicate === true, 'Repeated document-version command created a duplicate.');
await call(`/admin/documents/${submittedVersion.document.id}/approve`, {
  method: 'POST',
  token: compliance,
  origin: adminOrigin,
  body: { reason: 'Synthetic second version reviewed for smoke test.' },
});
const documentRecords = await call('/me/demo-records', { token: maya });
assert(documentRecords.documents.some((item) => item.id === submittedDocument.document.id && item.status === 'Approved'), 'Approved original document state did not remain in customer history.');
assert(documentRecords.documents.some((item) => item.id === submittedVersion.document.id && item.status === 'Approved' && item.version === '2.0'), 'Approved second document version did not reach the customer.');

console.log('RHC demo smoke: payment submission and separate verification');
const submittedPayment = await call('/me/payments', {
  method: 'POST',
  token: maya,
  body: {
    property_id: 'property-001',
    amount_minor: 1500000,
    due_date: '2026-09-19',
    description: 'Synthetic payment evidence smoke test',
    idempotency_key: 'smoke-payment-001',
  },
});
await call(`/admin/payments/${submittedPayment.payment.id}/verify`, {
  method: 'POST',
  token: system,
  origin: adminOrigin,
  body: { reason: 'Synthetic finance evidence reviewed.' },
});
const paymentRecords = await call('/me/demo-records', { token: maya });
assert(paymentRecords.payments.some((item) => item.id === submittedPayment.payment.id && item.status === 'POSTED'), 'Verified payment record did not reach the customer.');

console.log('RHC demo smoke: idempotent points credit and benefit redemption');
const creditBody = {
  customer_id: 'usr-customer-001',
  points: 400,
  source: 'Smoke qualifying event',
  reason: 'Synthetic qualifying activity',
  rule_version: 'DEMO-RULE-1.0',
  idempotency_key: 'smoke-credit-001',
};
const firstCredit = await call('/admin/rewards-ledger/credit', { method: 'POST', token: system, origin: adminOrigin, body: creditBody });
const repeatedCredit = await call('/admin/rewards-ledger/credit', { method: 'POST', token: system, origin: adminOrigin, body: creditBody });
assert(firstCredit.entry.id === repeatedCredit.entry.id && repeatedCredit.duplicate === true, 'Repeated reward event created a duplicate credit.');
await call('/admin/rewards-ledger/credit', { method: 'POST', token: system, origin: adminOrigin, body: { ...creditBody, points: 401 }, expected: 409 });
const beforeRedemption = await call('/me/demo-records', { token: maya });
const redemption = await call('/me/rewards/redeem', {
  method: 'POST',
  token: maya,
  body: { benefit_id: 'benefit-001', idempotency_key: 'smoke-redemption-001' },
});
assert(redemption.balance === beforeRedemption.rewards.balance - 300, 'Points balance did not reflect redemption.');
const repeatedRedemption = await call('/me/rewards/redeem', { method: 'POST', token: maya, body: { benefit_id: 'benefit-001', idempotency_key: 'smoke-redemption-001' } });
assert(repeatedRedemption.entry.id === redemption.entry.id && repeatedRedemption.duplicate === true, 'Redemption retry created another debit.');
await call('/me/rewards/redeem', { method: 'POST', token: maya, body: { benefit_id: 'benefit-002', idempotency_key: 'smoke-redemption-001' }, expected: 409 });
await call('/me/rewards/redeem', { method: 'POST', token: noah, body: { benefit_id: 'benefit-001', idempotency_key: 'smoke-redemption-001' }, expected: 409 });
await call('/me/rewards/redeem', {
  method: 'POST',
  token: noah,
  body: { benefit_id: 'benefit-001', idempotency_key: 'smoke-insufficient-points' },
  expected: 409,
});

console.log('RHC demo smoke: certificate verification and revocation');
const certificate = await call('/admin/certificates', {
  method: 'POST',
  token: compliance,
  origin: adminOrigin,
  body: { customer_id: 'usr-customer-001', type: 'Demo Property Record Certificate', linked_record: 'SMOKE-SOURCE-001', source_version: 1 },
});
const validResult = await call(`/verify/rhc-id/${certificate.public_reference}`);
assert(validResult.status === 'VALID', 'New certificate was not publicly valid.');
await call(`/admin/certificates/${certificate.id}/revoke`, {
  method: 'POST',
  token: compliance,
  origin: adminOrigin,
  body: { reason: 'Synthetic revocation smoke test.' },
});
const revokedResult = await call(`/verify/rhc-id/${certificate.public_reference}`);
assert(revokedResult.status === 'REVOKED', 'Revoked certificate still appeared valid.');

console.log('RHC demo smoke: shared resident-service request');
const serviceRequest = await call('/me/service-requests', {
  method: 'POST',
  token: maya,
  body: { service_id: 'service-water', title: 'Synthetic service request smoke test' },
});
await call(`/admin/service-requests/${serviceRequest.request.id}/progress`, {
  method: 'POST',
  token: operator,
  origin: adminOrigin,
  body: { status: 'IN_PROGRESS', note: 'Scoped operator accepted the synthetic request.' },
});
const customerRequests = await call('/me/service-requests', { token: maya });
assert(customerRequests.some((item) => item.id === serviceRequest.request.id && item.status === 'IN_PROGRESS'), 'Customer did not observe service progress.');

console.log('RHC demo smoke: scope isolation, stale revisions, auditor denial, and failure recovery');
const operatorCompanies = await call('/admin/companies', { token: operator, origin: adminOrigin });
assert(
  operatorCompanies.every((company) => ['company-amica-condo', 'company-amica-water', 'company-amica-mart'].includes(company.id)),
  'Scoped operator received a company outside the permitted catalog subset.',
);
const operatorProjects = await call('/admin/projects', { token: operator, origin: adminOrigin });
assert(operatorProjects.every((project) => project.id === 'project-amica-t1'), 'Scoped operator received a project outside the permitted project scope.');
const operatorDocuments = await call('/admin/documents', { token: operator, origin: adminOrigin });
assert(!operatorDocuments.some((document) => document.id === 'document-004'), 'Scoped operator received an RHC identity document outside the Amica scope.');
const alternateProjects = await call('/projects', { token: operator, origin: adminOrigin });
assert(alternateProjects.every((project) => project.id === 'project-amica-t1'), 'Staff bypassed project scope using the customer catalog route.');
await call('/me/payments', {
  method: 'POST',
  token: noah,
  body: {
    property_id: 'property-001',
    amount_minor: 1000,
    due_date: '2026-09-19',
    description: 'Cross-property synthetic evidence must be rejected',
    idempotency_key: 'scope-negative-payment-001',
  },
  expected: 403,
});
await call('/admin/rewards-ledger/credit', {
  method: 'POST',
  token: compliance,
  origin: adminOrigin,
  body: {
    customer_id: 'usr-customer-030',
    points: 25,
    source: 'Unauthorized synthetic source',
    reason: 'Cross-scope credit must be rejected',
    rule_version: 'DEMO-RULE-1.0',
    idempotency_key: 'scope-negative-reward-001',
  },
  expected: 403,
});
await call('/admin/certificates', {
  method: 'POST',
  token: compliance,
  origin: adminOrigin,
  body: { customer_id: 'usr-customer-030', type: 'Unauthorized demo certificate', linked_record: 'SMOKE-CROSS-SCOPE-001', source_version: 1 },
  expected: 403,
});
await call('/admin/companies', {
  method: 'POST',
  token: auditor,
  origin: adminOrigin,
  body: { company_code: 'DENIED', display_name: 'Denied', legal_name: 'Denied' },
  expected: 403,
});
await call('/me', {
  method: 'PATCH',
  token: maya,
  body: { city: 'Stale write must not persist' },
  headers: { 'If-Match': '1' },
  expected: 409,
});
await call('/unsupported-fixture-route', { token: maya, expected: 404 });
await call('/control', { method: 'PATCH', token: maya, body: { fail_next_request: true } });
await call('/me', { token: maya, expected: 503 });
const recovered = await call('/me', { token: maya });
assert(recovered.user.id === 'usr-customer-001', 'Demo did not recover after explicit one-request failure.');

console.log('RHC demo smoke: final deterministic reset');
await call('/reset', {
  method: 'POST',
  token: system,
  origin: adminOrigin,
  body: { confirmation: 'RESET RHC DEMO' },
});
console.log('RHC demo smoke passed');
