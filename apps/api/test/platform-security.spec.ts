import { Prisma } from '@prisma/client';
import { safeData } from '../src/platform/safe-data';
import { PrismaService } from '../src/platform/prisma.service';

describe('platform security', () => {
  it('redacts credentials and profile data recursively, preserving dates and decimals', () => {
    expect(safeData({ credential_ref: 'hash', api_key: 'secret', nested: { email: 'private@example.test', password_hash: 'hash' }, at: new Date('2026-01-01'), price: new Prisma.Decimal('2.50') })).toEqual({ credential_ref: '[REDACTED]', api_key: '[REDACTED]', nested: { email: '[REDACTED]', password_hash: '[REDACTED]' }, at: '2026-01-01T00:00:00.000Z', price: '2.5' });
  });

  it('never enables mock-mode authorization and refuses mock startup', async () => {
    const previous = process.env.USE_MOCK_DATA;
    process.env.USE_MOCK_DATA = 'true';
    const prisma = new PrismaService();
    const connect = jest.spyOn(prisma, '$connect');
    try {
      expect(prisma.mockMode).toBe(false);
      await expect(prisma.onModuleInit()).rejects.toThrow('mock mode is not supported');
      expect(connect).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.USE_MOCK_DATA; else process.env.USE_MOCK_DATA = previous;
      await prisma.$disconnect();
    }
  });
});
