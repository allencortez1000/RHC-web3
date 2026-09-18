import { ConflictException } from '@nestjs/common';
import { getControlledErrorLogMetadata } from '../../platform/controlled-errors';
import { CONSENT_POLICY_DEFINITIONS, ConsentPolicyService, ConsentPolicyUnavailableException, type PublishedConsentPolicy } from './consent-policy.service';

const syntheticPolicies: readonly PublishedConsentPolicy[] = CONSENT_POLICY_DEFINITIONS.map((definition) => ({
  consent_type: definition.consent_type,
  version: 'synthetic-v1',
  publication_reference: `synthetic-test/${definition.consent_type.toLowerCase()}`,
}));

describe('ConsentPolicyService', () => {
  it('does not expose a runtime policy/version when approved inputs are absent', () => {
    const service = new ConsentPolicyService();

    expect(service.list()).toEqual(CONSENT_POLICY_DEFINITIONS.map((definition) => ({
      ...definition,
      configured: false,
      consent_version: null,
      publication_reference: null,
    })));
    expect(() => service.assertGrant('TERMS', 'ACCOUNT_TERMS', 'synthetic-v1', null)).toThrow(ConsentPolicyUnavailableException);
    expect(getControlledErrorLogMetadata(new ConsentPolicyUnavailableException())).toEqual({ category: 'business_rule', internal_code: 'CONSENT_POLICY_NOT_CONFIGURED' });
  });

  it('accepts only the exact configured synthetic version for the matching type and scope', () => {
    const service = new ConsentPolicyService(syntheticPolicies);

    expect(service.list().every((policy) => policy.configured && policy.consent_version === 'synthetic-v1')).toBe(true);
    expect(() => service.assertGrant('DATA_SHARING', 'COMPANY_DATA_SHARING', 'synthetic-v1', '20000000-0000-4000-8000-000000000001')).not.toThrow();
    expect(() => service.assertGrant('DATA_SHARING', 'COMPANY_DATA_SHARING', 'tampered-v2', '20000000-0000-4000-8000-000000000001')).toThrow(ConflictException);
    expect(() => service.assertGrant('DATA_SHARING', 'ACCOUNT_PRIVACY', 'synthetic-v1', '20000000-0000-4000-8000-000000000001')).toThrow(ConflictException);
    expect(() => service.assertGrant('DATA_SHARING', 'COMPANY_DATA_SHARING', 'synthetic-v1', null)).toThrow(ConflictException);
  });

  it('ignores malformed or unsupported policy configuration rather than authorizing it', () => {
    const service = new ConsentPolicyService([
      { consent_type: 'DATA_SHARING', version: 'not valid', publication_reference: 'synthetic-test/bad' },
      { consent_type: 'TERMS', version: 'synthetic-v1', publication_reference: 'synthetic-test/terms' },
    ] as unknown as readonly PublishedConsentPolicy[]);

    expect(service.list().find((policy) => policy.consent_type === 'DATA_SHARING')).toMatchObject({ configured: false, consent_version: null });
    expect(service.list().find((policy) => policy.consent_type === 'TERMS')).toMatchObject({ configured: true, consent_version: 'synthetic-v1' });
  });
});
