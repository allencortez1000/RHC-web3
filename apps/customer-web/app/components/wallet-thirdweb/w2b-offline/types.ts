/**
 * W2B-P1 mock-only design contract.
 * All fields are local, synthetic fixtures; no type below proves RHC identity,
 * wallet ownership, provider enrollment, authorization, or a backend link.
 */
export type SimulatedMode = 'synthetic-embedded' | 'synthetic-external';
export type SyntheticSession =
  | { readonly kind: 'absent' | 'pending' | 'denied' }
  | {
      readonly kind: 'active';
      readonly rhcUserId: string;
      readonly sessionEpoch: string;
      readonly accountStatus: 'ACTIVE' | 'PENDING' | 'DISABLED' | 'LOCKED';
      readonly actor: 'customer' | 'staff' | 'admin';
      readonly invited: boolean;
      readonly privacyConsent: boolean;
      /** Fixture tag only; not a JWT, provider auth or actual subject mapping. */
      readonly fixtureSubject: string;
    };

export type ProviderTicketFixture = 'test-accepted' | 'missing' | 'expired' | 'forged';

export interface SyntheticWalletPolicy {
  /** Only the deterministic fake adapter may use this policy. */
  readonly kind: 'w2b-p1-offline-fixture';
  readonly revision: string;
  readonly simulatedEnabled: boolean;
  readonly environment: string;
  readonly expectedProject: string;
  readonly presentedProject: string;
  readonly selectedChain: number | null;
  readonly allowedChains: readonly number[];
  readonly approvedOrigin: string;
  readonly browserOrigin: string;
  readonly publicClientId: string | null;
  readonly mode: SimulatedMode | string;
  readonly allowedModes: readonly SimulatedMode[];
  readonly simulatedBillingReady: boolean;
  readonly simulatedAuthContractReady: boolean;
  readonly consentVersion: string;
  readonly ticket: ProviderTicketFixture;
}

export interface SyntheticWalletContext {
  readonly session: SyntheticSession;
  readonly policy: SyntheticWalletPolicy;
}

export type OfflineBlockReason =
  | 'SIMULATION_DISABLED' | 'MISSING_RHC_SESSION' | 'RHC_ACCOUNT_INELIGIBLE'
  | 'RHC_ACTOR_DENIED' | 'UNTRUSTED_FIXTURE_IDENTITY'
  | 'MISSING_CONSENT' | 'CHAIN_NOT_ALLOWED'
  | 'INVALID_PUBLIC_CLIENT' | 'PROJECT_MISMATCH'
  | 'ORIGIN_MISMATCH' | 'WALLET_MODE_DENIED'
  | 'BILLING_FIXTURE_UNAVAILABLE' | 'AUTH_FIXTURE_UNAVAILABLE'
  | 'TICKET_FIXTURE_REJECTED' | 'INVALID_FIXTURE_POLICY';

export interface SyntheticReadiness {
  readonly releaseLock: 'OFFLINE_REVIEW_ONLY';
  readonly sdkMayLoad: false;
  readonly mayEnrollRealWallet: false;
  readonly maySign: false;
  readonly mayTransact: false;
  readonly mayWriteBackendLink: false;
  readonly canRunSyntheticFixture: boolean;
  readonly reasons: readonly OfflineBlockReason[];
}
export interface MockHandle {
  /** Per-operation-owned handle. Never a Thirdweb Wallet or Account. */
  readonly handleId: string;
  readonly address: string;
  readonly chainId: number;
  readonly mode: SimulatedMode;
}

export interface MockOnlyWalletDriver {
  readonly kind: 'rhc-w2b-p1-mock-driver';
  /** Fake operation; NOT thirdweb wallet.connect(). */
  openFixture(input: {
    readonly chainId: number;
    readonly mode: SimulatedMode;
    readonly signal: AbortSignal;
  }): Promise<MockHandle>;
  /** Must release only the given opaque synthetic handle, never a global wallet. */
  releaseFixture(input: {
    readonly handleId: string;
    readonly signal: AbortSignal;
  }): Promise<void>;
}

export type MockWalletStatus =
  | 'unavailable' | 'disconnected' | 'connecting' | 'connected'
  | 'disconnecting' | 'failed';
export type SyntheticLinkObservation =
  | 'unknown' | 'unlinked' | 'pending' | 'linked' | 'revoked' | 'conflict';
export type MockWalletFailure =
  | 'MOCK_CONNECT_REJECTED' | 'MOCK_CONNECT_TIMEOUT'
  | 'MOCK_HANDLE_INVALID' | 'MOCK_DISCONNECT_REJECTED'
  | 'MOCK_DISCONNECT_TIMEOUT' | null;

export interface OfflineWalletSnapshot {
  readonly mode: 'w2b-p1-synthetic-only';
  readonly scope: string;
  readonly session: SyntheticSession['kind'];
  readonly rhcUserId: string | null;
  readonly walletStatus: MockWalletStatus;
  readonly walletAddress: string | null;
  readonly chain: number | null;
  readonly syntheticMode: SimulatedMode | null;
  readonly mockLinkObservation: SyntheticLinkObservation;
  readonly failure: MockWalletFailure;
  readonly reasons: readonly OfflineBlockReason[];
  readonly revision: number;
  readonly releaseLock: 'OFFLINE_REVIEW_ONLY';
  readonly sdkLoaded: false;
  readonly walletEnrollmentExecuted: false;
  readonly rhcIdentityVerified: false;
  readonly backendLinkVerified: false;
  readonly pointsBalance: 'not_configured';
  readonly blockchainToken: 'not_configured';
  readonly signingEnabled: false;
  readonly transactionsEnabled: false;
}
