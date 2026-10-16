import { LOCAL_THIRDWEB_QA_CHAIN_ID, type LocalThirdwebQaMode } from "./gate";

export type QaLastAction = "idle" | "connecting" | "canceled" | "disconnect_requested" | "disconnect_failed";

export interface QaProviderSnapshot {
  /** The independently server-gated QA method; never a caller-selected fallback. */
  readonly mode: LocalThirdwebQaMode;
  readonly connectionStatus: string;
  readonly isConnecting: boolean;
  readonly walletId?: string;
  readonly address?: string;
  readonly chainId?: number;
  readonly lastAction: QaLastAction;
}

/**
 * Cosmetic provider-method eligibility only. It must never authorize RHC
 * authentication, wallet linking, transactions or switching a blockchain.
 * The real server route gate owns QA activation.
 */
export function isQaWalletMethodPermitted(
  mode: LocalThirdwebQaMode,
  walletId: unknown,
): boolean {
  return walletId === "inApp"
    ? mode === "embedded-email" || mode === "both"
    : walletId === "io.metamask"
      ? mode === "external-metamask" || mode === "both"
      : false;
}

/** Presentation only. SDK hooks, not previous operation strings, own status. */
export function getQaProviderView(snapshot: QaProviderSnapshot) {
  const busy = snapshot.isConnecting || snapshot.connectionStatus === "connecting"
    || snapshot.lastAction === "connecting";
  const hasWallet = typeof snapshot.walletId === "string" && snapshot.walletId.length > 0;
  const validAddress = typeof snapshot.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(snapshot.address);
  const connected = !busy && snapshot.connectionStatus === "connected" && hasWallet && validAddress;
  const methodPermitted = isQaWalletMethodPermitted(snapshot.mode, snapshot.walletId);
  const correctChain = snapshot.chainId === LOCAL_THIRDWEB_QA_CHAIN_ID;

  // Recognized SDK wallet IDs are safe to show as diagnostics, but an unknown
  // wallet must not supply untrusted display text or appear QA-approved.
  const providerIdLabel = !hasWallet ? "None"
    : snapshot.walletId === "inApp" || snapshot.walletId === "io.metamask"
      ? snapshot.walletId
      : "Unapproved provider (disconnect only)";
  const maskedAddress = connected && methodPermitted
    ? snapshot.address!.slice(0, 6) + "..." + snapshot.address!.slice(-4)
    : connected ? "Unapproved wallet" : "Not connected";
  const networkLabel = !connected ? "not connected"
    : !methodPermitted ? "wallet method not permitted in this QA mode"
    : correctChain ? "selected testnet"
    : "unsupported network - no RHC actions enabled";
  const qaEligible = connected && methodPermitted && correctChain &&
    snapshot.lastAction !== "disconnect_requested" && snapshot.lastAction !== "disconnect_failed";

  let notice: string;
  if (busy) {
    notice = "Waiting for your wallet's connection confirmation. No RHC account is linked.";
  } else if (!connected) {
    notice = snapshot.lastAction === "canceled"
      ? "Connection canceled or unavailable. No RHC account was linked."
      : snapshot.lastAction === "disconnect_failed" && hasWallet
        ? "Disconnect request could not be completed. Check the provider status and retry."
        : hasWallet && snapshot.connectionStatus !== "disconnected"
          ? "Provider state is incomplete; no verified connection or RHC account link."
          : "No wallet connected. A provider connection does not authenticate an RHC user.";
  } else if (!methodPermitted) {
    notice = "Connected wallet method is not permitted in this QA mode. Disconnect this wallet. No RHC account is linked or approved.";
  } else if (snapshot.lastAction === "disconnect_requested") {
    notice = "Disconnect requested; waiting for provider state. No RHC session was changed.";
  } else if (snapshot.lastAction === "disconnect_failed") {
    notice = "Disconnect request could not be completed. The provider still reports a connection.";
  } else if (!correctChain) {
    notice = "Wallet is on an unsupported network. No RHC actions or account linking are enabled.";
  } else {
    notice = "Wallet provider reports a connection for QA only; RHC link remains UNVERIFIED.";
  }

  return Object.freeze({
    maskedAddress,
    providerIdLabel,
    networkLabel,
    notice,
    connected,
    qaEligible,
    busy,
    canConnect: !busy && !hasWallet && !snapshot.address,
    // Even an unapproved/leftover provider must remain disconnectable.
    canDisconnect: !busy && hasWallet,
  });
}
