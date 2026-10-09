/**
 * W1 is a synthetic OFFLINE wallet lifecycle contract, not a Thirdweb integration.
 * No authentication, authorization, signing, wallet enrollment or chain RPC lives here.
 */
export type RHCSession =
  | { readonly kind: 'absent' | 'denied' }
  | { readonly kind: 'current'; readonly rhcUserId: string };

export interface WalletChainPolicy {
  readonly enabled: boolean;
  readonly policyRevision: string;
  readonly selectedChainId: number | null;
  readonly approvedChainIds: readonly number[];
}
export interface WalletContext {
  readonly session: RHCSession;
  readonly policy: WalletChainPolicy;
}

export interface SyntheticWalletHandle {
  /** Opaque, operation-unique synthetic handle. Never use this as an RHC identity. */
  readonly handleId: string;
  readonly address: string;
  readonly chainId: number;
}

/** A test double only; releaseOwned MUST affect the specified handle, never a global wallet. */
export interface SyntheticOfflineWalletAdapter {
  readonly kind: 'synthetic-offline';
  connect(input: { readonly chainId: number; readonly signal: AbortSignal }): Promise<SyntheticWalletHandle>;
  releaseOwned(input: { readonly handleId: string; readonly signal: AbortSignal }): Promise<void>;
}

export type WalletConnectionStatus =
  | 'unavailable' | 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'failed';
export type ChainEligibility = 'not_selected' | 'unsupported' | 'approved';
export type SyntheticBackendLink = 'unknown' | 'unlinked' | 'pending' | 'linked' | 'revoked' | 'conflict';
export type WalletFailure = 'CONNECT_FAILED' | 'CONNECT_TIMEOUT' | 'INVALID_HANDLE'
  | 'DISCONNECT_FAILED' | 'DISCONNECT_TIMEOUT' | null;

export interface WalletFoundationSnapshot {
  readonly mode: 'synthetic-offline';
  readonly scopeFingerprint: string;
  readonly sessionStatus: RHCSession['kind'];
  readonly rhcUserId: string | null;
  readonly chainEligibility: ChainEligibility;
  readonly selectedChainId: number | null;
  readonly connectionStatus: WalletConnectionStatus;
  readonly walletAddress: string | null;
  /** Not authoritative. W1 never writes or reads backend wallet links. */
  readonly syntheticLinkObservation: SyntheticBackendLink;
  readonly failure: WalletFailure;
  /** Always false: a connected wallet is not an authenticated/linked RHC wallet. */
  readonly backendLinkVerified: false;
  readonly tokenObservation: 'not_configured';
  readonly revision: number;
}
