import type {
  OfflineBlockReason, SyntheticWalletContext, SyntheticReadiness,
  SyntheticSession, SyntheticWalletPolicy, SimulatedMode,
} from './types';

/**
 * The W2A production release lock is never changed by this module.
 * This gate ONLY admits a synthetic driver in a test harness. It authorizes
 * no Thirdweb client, wallet, token, API, signing or other real I/O.
 */
export const W2B_P1_RELEASE_LOCK = 'OFFLINE_REVIEW_ONLY' as const;

function canonicalPolicy(input: SyntheticWalletPolicy): SyntheticWalletPolicy {
  return {
    kind: input.kind,
    revision: String(input.revision ?? ''),
    simulatedEnabled: input.simulatedEnabled === true,
    environment: String(input.environment ?? ''),
    expectedProject: String(input.expectedProject ?? ''),
    presentedProject: String(input.presentedProject ?? ''),
    selectedChain: input.selectedChain,
    allowedChains: [...input.allowedChains],
    approvedOrigin: String(input.approvedOrigin ?? ''),
    browserOrigin: String(input.browserOrigin ?? ''),
    publicClientId: input.publicClientId,
    mode: input.mode,
    allowedModes: [...input.allowedModes],
    simulatedBillingReady: input.simulatedBillingReady === true,
    simulatedAuthContractReady: input.simulatedAuthContractReady === true,
    consentVersion: String(input.consentVersion ?? ''),
    ticket: input.ticket,
  };
}

export function copySyntheticContext(c: SyntheticWalletContext): SyntheticWalletContext {
  const session: SyntheticSession = c.session.kind === 'active'
    ? { ...c.session }
    : { kind: c.session.kind };
  return { session, policy: canonicalPolicy(c.policy) };
}

export function mockScope(c: SyntheticWalletContext): string {
  const k = copySyntheticContext(c);
  return JSON.stringify([
    k.session.kind,
    k.session.kind === 'active' ? [
      k.session.rhcUserId, k.session.sessionEpoch, k.session.accountStatus,
      k.session.actor, k.session.invited, k.session.privacyConsent,
      k.session.fixtureSubject,
    ] : null,
    k.policy.kind, k.policy.revision, k.policy.simulatedEnabled,
    k.policy.environment, k.policy.expectedProject, k.policy.presentedProject,
    k.policy.selectedChain, [...new Set(k.policy.allowedChains)].sort((a,b)=>a-b),
    k.policy.approvedOrigin, k.policy.browserOrigin, k.policy.publicClientId,
    k.policy.mode, [...new Set(k.policy.allowedModes)].sort(),
    k.policy.simulatedBillingReady, k.policy.simulatedAuthContractReady,
    k.policy.consentVersion, k.policy.ticket,
  ]);
}

export function evaluateSyntheticReadiness(raw: SyntheticWalletContext): SyntheticReadiness {
  const { session, policy } = copySyntheticContext(raw);
  const reasons: OfflineBlockReason[] = [];
  if (policy.kind !== 'w2b-p1-offline-fixture' || !policy.revision.trim() ||
      !/^[a-zA-Z0-9_-]{3,64}$/.test(policy.environment) ||
      !/^[a-zA-Z0-9_-]{3,64}$/.test(policy.expectedProject)) {
    reasons.push('INVALID_FIXTURE_POLICY');
  }
  if (!policy.simulatedEnabled) reasons.push('SIMULATION_DISABLED');
  if (session.kind !== 'active') reasons.push('MISSING_RHC_SESSION');
  else {
    if (session.accountStatus !== 'ACTIVE' || !session.invited)
      reasons.push('RHC_ACCOUNT_INELIGIBLE');
    if (session.actor !== 'customer') reasons.push('RHC_ACTOR_DENIED');
    const looksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.rhcUserId);
    const expectedSubject = `fixture:${policy.environment}:${session.rhcUserId}`;
    if (!looksUuid || !/^[a-zA-Z0-9:_-]{4,100}$/.test(session.sessionEpoch) ||
        session.fixtureSubject !== expectedSubject) reasons.push('UNTRUSTED_FIXTURE_IDENTITY');
    if (!session.privacyConsent) reasons.push('MISSING_CONSENT');
  }
  if (!policy.consentVersion.trim()) reasons.push('MISSING_CONSENT');
  if (policy.selectedChain === null || !Number.isSafeInteger(policy.selectedChain) ||
      policy.selectedChain <= 0 || !policy.allowedChains.includes(policy.selectedChain))
    reasons.push('CHAIN_NOT_ALLOWED');
  if (policy.publicClientId === null ||
      !/^[a-zA-Z0-9_-]{8,70}$/.test(policy.publicClientId) ||
      /^(?:sk_|secret|sb_secret|token_)/i.test(policy.publicClientId))
    reasons.push('INVALID_PUBLIC_CLIENT');
  if (policy.expectedProject !== policy.presentedProject)
    reasons.push('PROJECT_MISMATCH');
  if (!policy.approvedOrigin || !policy.browserOrigin ||
      policy.approvedOrigin !== policy.browserOrigin ||
      !/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(policy.approvedOrigin))
    reasons.push('ORIGIN_MISMATCH');
  const allowed: readonly SimulatedMode[] = ['synthetic-embedded', 'synthetic-external'];
  if (!allowed.includes(policy.mode as SimulatedMode) ||
      !policy.allowedModes.includes(policy.mode as SimulatedMode)) reasons.push('WALLET_MODE_DENIED');
  if (!policy.simulatedBillingReady) reasons.push('BILLING_FIXTURE_UNAVAILABLE');
  if (!policy.simulatedAuthContractReady) reasons.push('AUTH_FIXTURE_UNAVAILABLE');
  if (policy.ticket !== 'test-accepted') reasons.push('TICKET_FIXTURE_REJECTED');

  return Object.freeze({
    releaseLock: W2B_P1_RELEASE_LOCK,
    sdkMayLoad: false, mayEnrollRealWallet: false,
    maySign: false, mayTransact: false, mayWriteBackendLink: false,
    canRunSyntheticFixture: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}

export const MOCK_BLOCK_LABELS: Record<OfflineBlockReason, string> = {
  SIMULATION_DISABLED: 'Synthetic test mode is disabled.',
  MISSING_RHC_SESSION: 'No eligible synthetic RHC customer session is present.',
  RHC_ACCOUNT_INELIGIBLE: 'The fixture account is not eligible.',
  RHC_ACTOR_DENIED: 'Only a synthetic customer actor is allowed.',
  UNTRUSTED_FIXTURE_IDENTITY: 'The fixture identity scope is invalid.',
  MISSING_CONSENT: 'A synthetic consent prerequisite is missing.',
  CHAIN_NOT_ALLOWED: 'No synthetic test chain is approved.',
  INVALID_PUBLIC_CLIENT: 'No valid synthetic public client identifier.',
  PROJECT_MISMATCH: 'Synthetic provider project is outside the approved fixture.',
  ORIGIN_MISMATCH: 'Synthetic browser origin differs from the approved fixture origin.',
  WALLET_MODE_DENIED: 'This synthetic wallet method is not allowed.',
  BILLING_FIXTURE_UNAVAILABLE: 'Mock provider billing readiness is not confirmed.',
  AUTH_FIXTURE_UNAVAILABLE: 'Mock authentication contract is not confirmed.',
  TICKET_FIXTURE_REJECTED: 'Mock provider identity ticket was rejected.',
  INVALID_FIXTURE_POLICY: 'The synthetic fixture configuration is invalid.',
};
