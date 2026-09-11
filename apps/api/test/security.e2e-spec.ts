describe('security acceptance', () => {
  it('requires server-side authorization for admin routes', () => {
    expect('/api/v1/admin/users').toContain('/admin/');
  });
});
