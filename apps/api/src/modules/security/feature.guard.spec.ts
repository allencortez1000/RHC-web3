import { ConflictException, ForbiddenException } from '@nestjs/common';
import { FeatureService, assertFeatureMutationAllowed } from './feature.guard';

const lockedFeatures = [
  'ENABLE_REWARDS',
  'ENABLE_WALLET',
  'ENABLE_MARKETPLACE',
  'ENABLE_BLOCKCHAIN',
  'ENABLE_EXTERNAL_WALLET',
  'ENABLE_TOKEN',
  'ENABLE_TOKEN_TRANSFER',
  'ENABLE_TOKEN_SALE',
  'ENABLE_CRYPTO_PAYMENT',
  'ENABLE_STAKING',
] as const;
const month1Features = ['ENABLE_REGISTRATION', 'ENABLE_RHC_ID', 'ENABLE_PROPERTIES', 'ENABLE_COMPANY_DIRECTORY', 'ENABLE_INTEGRATION_FRAMEWORK'];

describe('Month 1 feature policy', () => {
  it.each(lockedFeatures)('rejects enabling %s through the canonical mutation policy', (key) => {
    expect(() => assertFeatureMutationAllowed(key, true)).toThrow(ConflictException);
    expect(() => assertFeatureMutationAllowed(key, false)).not.toThrow();
  });

  it('does not block a normal Month 1 feature mutation', () => {
    for (const key of month1Features) expect(() => assertFeatureMutationAllowed(key, true)).not.toThrow();
  });

  it.each(lockedFeatures)('denies operational use of %s even when persisted enabled', async (key) => {
    const findUnique = jest.fn().mockResolvedValue({ enabled: true, scope: 'GLOBAL' });
    const service = new FeatureService({ featureFlag: { findUnique } } as any);

    await expect(service.require(key)).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUnique).toHaveBeenCalledWith({ where: { key }, select: { enabled: true, scope: true } });
  });

  it.each(month1Features)('allows operational use of enabled %s when globally scoped', async (key) => {
    const service = new FeatureService({ featureFlag: { findUnique: jest.fn().mockResolvedValue({ enabled: true, scope: 'GLOBAL' }) } } as any);
    await expect(service.require(key)).resolves.toBeUndefined();
  });

  it('fails closed when a feature is missing, disabled, or not global', async () => {
    for (const flag of [null, { enabled: false, scope: 'GLOBAL' }, { enabled: true, scope: 'COMPANY' }]) {
      const service = new FeatureService({ featureFlag: { findUnique: jest.fn().mockResolvedValue(flag) } } as any);
      await expect(service.require('ENABLE_PROPERTIES')).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
});
