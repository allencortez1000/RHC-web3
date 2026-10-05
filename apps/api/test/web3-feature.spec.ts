import { AuthController } from '../src/modules/auth/auth.controller';
import { RbacService } from '../src/modules/security/rbac.service';
import { FeatureService } from '../src/modules/security/feature.guard';
import { PrismaService } from '../src/platform/prisma.service';

describe('environment-backed Web3 read-preview flag (offline)', () => {
  const key = 'ENABLE_WEB3_READ_PREVIEW';
  let previous: string | undefined;
  let findUnique: jest.Mock;
  let features: FeatureService;

  beforeEach(() => {
    previous = process.env[key];
    findUnique = jest.fn().mockResolvedValue(null);
    features = new FeatureService({ featureFlag: { findUnique } } as unknown as PrismaService);
  });
  afterEach(() => {
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
  });

  it.each([undefined, '', 'false', 'TRUE', '1'])('fails closed for preview value %s without querying or creating a DB flag', async (value) => {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
    await expect(features.isEnabled(key)).resolves.toBe(false);
    await expect(features.require(key)).rejects.toMatchObject({ status: 403 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('maps explicit preview opt-in without treating it as token/blockchain/rewards activation', async () => {
    process.env[key] = 'true';
    await expect(features.isEnabled(key)).resolves.toBe(true);
    await expect(features.require(key)).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
    findUnique.mockResolvedValue({ enabled: true, scope: 'GLOBAL' });
    for (const feature of ['ENABLE_TOKEN', 'ENABLE_BLOCKCHAIN', 'ENABLE_REWARDS']) {
      await expect(features.isEnabled(feature)).resolves.toBe(false);
      await expect(features.require(feature)).rejects.toMatchObject({ status: 403 });
      expect(findUnique).toHaveBeenLastCalledWith({ where: { key: feature }, select: { enabled: true, scope: true } });
    }
  });

  it.each([null, { enabled: false, scope: 'GLOBAL' }, { enabled: true, scope: 'COMPANY' }])('preserves DB feature fail-closed behavior for %j', async (flag) => {
    findUnique.mockResolvedValue(flag);
    await expect(features.require('ENABLE_PROPERTIES')).rejects.toMatchObject({ status: 403 });
  });

  it.each([
    [undefined, true, false],
    ['false', true, false],
    ['true', false, true],
    ['TRUE', true, false],
  ] as const)('reports preview env %s rather than stale DB value %s in auth config', async (value, staleDbValue, expected) => {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
    findUnique.mockImplementation(async ({ where }) => ({
      enabled: where.key === 'ENABLE_REGISTRATION' ? true : staleDbValue, scope: 'GLOBAL',
    }));
    const prisma = { featureFlag: { findUnique } } as unknown as PrismaService;
    const controller = new AuthController(prisma, new RbacService(prisma), features);
    await expect(controller.config()).resolves.toEqual({ registration_enabled: true, web3_read_preview_enabled: expected });
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({ where: { key: 'ENABLE_REGISTRATION' }, select: { enabled: true } });
  });

  it('preserves enabled global DB features', async () => {
    findUnique.mockResolvedValue({ enabled: true, scope: 'GLOBAL' });
    await expect(features.require('ENABLE_PROPERTIES')).resolves.toBeUndefined();
  });
});
