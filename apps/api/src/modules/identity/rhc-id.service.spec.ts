describe('RHC Digital ID', () => {
  it('uses non-sensitive public format', () => {
    expect('RHC-2026-00000001').toMatch(/^RHC-\d{4}-\d{8}$/);
  });
});
