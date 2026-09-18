import request from 'supertest';
import { createHarness, Harness } from './api-harness';

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

describe('Month 1 feature locks through authenticated HTTP', () => {
  let h: Harness;

  beforeEach(async () => { h = await createHarness(); h.grant('feature_flag.manage'); });
  afterEach(async () => { await h?.close(); });

  it.each(lockedFeatures)('rejects enabling %s without changing persisted state', async (key) => {
    const flag = h.flags.get(key)!;
    flag.enabled = false;
    const updateCalls = h.prisma.featureFlag.update.mock.calls.length;

    await request(h.app.getHttpServer()).patch(`/api/v1/admin/feature-flags/${flag.id}`).set('Authorization', `Bearer ${h.token}`).send({ enabled: true }).expect(409);

    expect(flag.enabled).toBe(false);
    expect(h.prisma.featureFlag.update.mock.calls.length).toBe(updateCalls);
  });

  it('allows disabling every locked flag as remediation and leaves false flags safely disabled', async () => {
    for (const key of lockedFeatures) {
      const flag = h.flags.get(key)!;
      flag.enabled = true;
      await request(h.app.getHttpServer()).patch(`/api/v1/admin/feature-flags/${flag.id}`).set('Authorization', `Bearer ${h.token}`).send({ enabled: false }).expect(200);
      expect(flag.enabled).toBe(false);

      await request(h.app.getHttpServer()).patch(`/api/v1/admin/feature-flags/${flag.id}`).set('Authorization', `Bearer ${h.token}`).send({ enabled: false }).expect(200);
      expect(flag.enabled).toBe(false);
    }
  });

  it('does not apply the Month 1 lock to an enabled Month 1 feature', async () => {
    const flag = h.flags.get('ENABLE_PROPERTIES')!;
    flag.enabled = false;
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/feature-flags/${flag.id}`).set('Authorization', `Bearer ${h.token}`).send({ enabled: true }).expect(200);
    expect(flag.enabled).toBe(true);
  });
});
