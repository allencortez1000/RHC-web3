import { LOCAL_THIRDWEB_QA_CHAIN_ID } from "./gate";

export type QaLastAction = "idle" | "connecting" | "canceled" | "disconnect_requested" | "disconnect_failed";

export interface QaProviderSnapshot {
  readonly connectionStatus: string;
  readonly isConnecting: boolean;
  readonly walletId?: string;
  readonly address?: string;
  readonly chainId?: number;
  readonly lastAction: QaLastAction;
}

/** Presentation only. SDK hooks, not an old operation-success message, own status. */
export function getQaProviderView(snapshot: QaProviderSnapshot) {
  const busy = snapshot.isConnecting || snapshot.connectionStatus === "connecting"
    || snapshot.lastAction === "connecting";
  const hasWallet = typeof snapshot.walletId === "string" && snapshot.walletId.length > 0;
  const validAddress = typeof snapshot.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(snapshot.address);
  const connected = !busy && snapshot.connectionStatus === "connected" && hasWallet && validAddress;
  const maskedAddress = connected
    ? snapshot.address!.slice(0, 6) + "..." + snapshot.address!.slice(-4)
    : "Not connected";
  const networkLabel = !connected ? "not connected"
    : snapshot.chainId === LOCAL_THIRDWEB_QA_CHAIN_ID ? "selected testnet"
    : "unsupported network - no RHC actions enabled";

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
  } else if (snapshot.lastAction === "disconnect_requested") {
    notice = "Disconnect requested; waiting for provider state. No RHC session was changed.";
  } else if (snapshot.lastAction === "disconnect_failed") {
    notice = "Disconnect request could not be completed. The provider still reports a connection.";
  } else if (snapshot.chainId !== LOCAL_THIRDWEB_QA_CHAIN_ID) {
    notice = "Wallet is on an unsupported network. No RHC actions or account linking are enabled.";
  } else {
    notice = "Wallet provider reports a connection for QA only; RHC link remains UNVERIFIED.";
  }

  return Object.freeze({
    maskedAddress,
    networkLabel,
    notice,
    connected,
    busy,
    canConnect: !busy && !hasWallet && !snapshot.address,
    canDisconnect: !busy && hasWallet,
  });
}
