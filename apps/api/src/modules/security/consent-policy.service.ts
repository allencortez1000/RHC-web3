import { ConflictException, Inject, Injectable, Optional } from '@nestjs/common';
import { ControlledServiceUnavailableException } from '../../platform/controlled-errors';

export type ConsentType = 'PRIVACY_POLICY' | 'TERMS' | 'MARKETING' | 'DATA_SHARING' | 'COMPANY_SERVICE';
export type ConsentPurpose = 'ACCOUNT_PRIVACY' | 'ACCOUNT_TERMS' | 'MARKETING_COMMUNICATIONS' | 'COMPANY_DATA_SHARING' | 'COMPANY_SERVICE_DELIVERY';

export type ConsentPolicyDefinition = {
  consent_type: ConsentType;
  purpose: ConsentPurpose;
  required: boolean;
  company_required: boolean;
};

export type PublishedConsentPolicy = {
  consent_type: ConsentType;
  version: string;
  publication_reference: string;
};

export type ConsentPolicyView = ConsentPolicyDefinition & {
  configured: boolean;
  consent_version: string | null;
  publication_reference: string | null;
};

export const CONSENT_POLICY_CONFIG = Symbol('rhc.consent-policy-config');

export const CONSENT_POLICY_DEFINITIONS: readonly ConsentPolicyDefinition[] = Object.freeze([
  { consent_type: 'PRIVACY_POLICY', purpose: 'ACCOUNT_PRIVACY', required: true, company_required: false },
  { consent_type: 'TERMS', purpose: 'ACCOUNT_TERMS', required: true, company_required: false },
  { consent_type: 'MARKETING', purpose: 'MARKETING_COMMUNICATIONS', required: false, company_required: false },
  { consent_type: 'DATA_SHARING', purpose: 'COMPANY_DATA_SHARING', required: false, company_required: true },
  { consent_type: 'COMPANY_SERVICE', purpose: 'COMPANY_SERVICE_DELIVERY', required: false, company_required: true },
]);

const versionPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const publicationReferencePattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;

export class ConsentPolicyUnavailableException extends ControlledServiceUnavailableException {
  constructor() {
    super({ category: 'business_rule', internal_code: 'CONSENT_POLICY_NOT_CONFIGURED' });
  }
}

function matchingDefinition(consentType: unknown): ConsentPolicyDefinition | undefined {
  return CONSENT_POLICY_DEFINITIONS.find((definition) => definition.consent_type === consentType);
}

function isPublishedPolicy(value: unknown): value is PublishedConsentPolicy {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return matchingDefinition(candidate.consent_type) !== undefined
    && typeof candidate.version === 'string'
    && versionPattern.test(candidate.version)
    && typeof candidate.publication_reference === 'string'
    && publicationReferencePattern.test(candidate.publication_reference);
}

@Injectable()
export class ConsentPolicyService {
  private readonly published = new Map<ConsentType, PublishedConsentPolicy>();

  constructor(@Optional() @Inject(CONSENT_POLICY_CONFIG) configured: readonly PublishedConsentPolicy[] = []) {
    for (const candidate of configured) {
      if (isPublishedPolicy(candidate) && !this.published.has(candidate.consent_type)) {
        this.published.set(candidate.consent_type, Object.freeze({ ...candidate }));
      }
    }
  }

  list(): readonly ConsentPolicyView[] {
    return CONSENT_POLICY_DEFINITIONS.map((definition) => {
      const published = this.published.get(definition.consent_type);
      return {
        ...definition,
        configured: Boolean(published),
        consent_version: published?.version ?? null,
        publication_reference: published?.publication_reference ?? null,
      };
    });
  }

  definition(consentType: ConsentType): ConsentPolicyDefinition {
    const definition = matchingDefinition(consentType);
    if (!definition) throw new ConflictException('Unsupported consent type');
    return definition;
  }

  assertGrant(consentType: ConsentType, purpose: ConsentPurpose, version: string, companyId: string | null): void {
    const definition = this.definition(consentType);
    if (definition.purpose !== purpose || definition.company_required !== Boolean(companyId)) throw new ConflictException('Consent scope does not match policy');
    const published = this.published.get(consentType);
    if (!published) throw new ConsentPolicyUnavailableException();
    if (published.version !== version) throw new ConflictException('Consent policy version is not configured');
  }
}
