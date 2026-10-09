/**
 * W2A is an OFFLINE preparation checkpoint. Enabling Thirdweb is a separate,
 * reviewed release decision and cannot be done with a public environment flag.
 * No JWT, signing key, address, chain or provider credential is loaded here.
 */
export const W2A_RELEASE_LOCK = 'OFFLINE_REVIEW_ONLY' as const;

export type W2ASession = 'absent' | 'denied' | 'current';
export type W2ABlockReason =
  | 'RELEASE_LOCKED'
  | 'SESSION_NOT_CURRENT'
  | 'CHAIN_NOT_APPROVED'
  | 'THIRDWEB_BILLING_UNVERIFIED'
  | 'AUTH_BRIDGE_NOT_APPROVED'
  | 'WALLET_LINK_CONTRACT_NOT_APPROVED'
  | 'PUBLIC_CLIENT_ID_NOT_CONFIGURED';

export interface W2AReadinessInput {
  readonly session: W2ASession;
  /** Public client ID only; never secretKey or a service token. */
  readonly publicClientId?: string;
  readonly selectedChainId?: number | null;
  readonly approvedChainIds?: readonly number[];
  readonly billingVerified?: boolean;
  readonly authBridgeApproved?: boolean;
  readonly walletLinkContractApproved?: boolean;
}

export interface W2AReadiness {
  readonly mode: 'offline-preparation';
  readonly stage: typeof W2A_RELEASE_LOCK;
  readonly enabled: false;
  readonly sdkMayLoad: false;
  readonly walletMayConnect: false;
  readonly embeddedWalletMayEnroll: false;
  readonly backendLinkVerified: false;
  readonly tokenIntegrationEnabled: false;
  readonly reasons: readonly W2ABlockReason[];
}

/**
 * Evaluates provider prerequisites but never authorizes startup. An approved
 * future release must replace the locked architecture after a separate review,
 * not just set NEXT_PUBLIC flags or pass a forged options object.
 */
export function evaluateW2AReadiness(input: W2AReadinessInput): W2AReadiness {
  const reasons: W2ABlockReason[] = ['RELEASE_LOCKED'];
  if (input.session !== 'current') reasons.push('SESSION_NOT_CURRENT');
  if (!Number.isSafeInteger(input.selectedChainId)
    || Number(input.selectedChainId) <= 0
    || !input.approvedChainIds?.includes(Number(input.selectedChainId))) {
    reasons.push('CHAIN_NOT_APPROVED');
  }
  if (input.billingVerified !== true) reasons.push('THIRDWEB_BILLING_UNVERIFIED');
  if (input.authBridgeApproved !== true) reasons.push('AUTH_BRIDGE_NOT_APPROVED');
  if (input.walletLinkContractApproved !== true) reasons.push('WALLET_LINK_CONTRACT_NOT_APPROVED');
  if (!input.publicClientId?.trim()) reasons.push('PUBLIC_CLIENT_ID_NOT_CONFIGURED');
  return Object.freeze({
    mode: 'offline-preparation',
    stage: W2A_RELEASE_LOCK,
    enabled: false,
    sdkMayLoad: false,
    walletMayConnect: false,
    embeddedWalletMayEnroll: false,
    backendLinkVerified: false,
    tokenIntegrationEnabled: false,
    reasons: Object.freeze(reasons),
  });
}

export const W2A_BLOCK_LABELS: Record<W2ABlockReason, string> = {
  RELEASE_LOCKED: 'Offline review only — provider activation has not been approved.',
  SESSION_NOT_CURRENT: 'An authenticated RHC customer session is required.',
  CHAIN_NOT_APPROVED: 'No blockchain network has been approved for wallet onboarding.',
  THIRDWEB_BILLING_UNVERIFIED: 'Thirdweb account/service readiness has not been confirmed.',
  AUTH_BRIDGE_NOT_APPROVED: 'Thirdweb authentication trust and recovery must be approved.',
  WALLET_LINK_CONTRACT_NOT_APPROVED: 'Backend wallet ownership and linking require joint approval.',
  PUBLIC_CLIENT_ID_NOT_CONFIGURED: 'A reviewed public Thirdweb client identifier is not configured.',
};
