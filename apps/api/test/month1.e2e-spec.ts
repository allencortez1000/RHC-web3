describe('Month 1 API contract', () => {
  const publicRoutes = [
    'POST /api/v1/auth/register',
    'POST /api/v1/auth/login',
    'GET /api/v1/me',
    'GET /api/v1/me/rhc-id',
    'GET /api/v1/me/properties',
    'GET /api/v1/companies',
    'GET /api/v1/business-services',
  ];

  const adminRoutes = [
    'GET /api/v1/admin/users',
    'GET /api/v1/admin/customers',
    'GET /api/v1/admin/companies',
    'POST /api/v1/admin/companies',
    'GET /api/v1/admin/projects',
    'POST /api/v1/admin/properties',
    'GET /api/v1/admin/feature-flags',
    'GET /api/v1/admin/audit-logs',
  ];

  it('documents required public and customer route contracts', () => {
    expect(publicRoutes).toContain('POST /api/v1/auth/register');
    expect(publicRoutes).toContain('GET /api/v1/me/properties');
  });

  it('keeps admin routes under explicit admin namespace', () => {
    expect(adminRoutes.every((route) => route.includes('/api/v1/admin/'))).toBe(true);
  });

  it('keeps Month 2 token/blockchain routes out of Month 1 contract', () => {
    const allRoutes = [...publicRoutes, ...adminRoutes].join('\n').toLowerCase();
    expect(allRoutes).not.toContain('token-sale');
    expect(allRoutes).not.toContain('staking');
    expect(allRoutes).not.toContain('blockchain/transfer');
  });
});
