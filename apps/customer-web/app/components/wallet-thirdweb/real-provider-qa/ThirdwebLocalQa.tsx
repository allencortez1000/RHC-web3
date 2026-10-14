"use client";

import * as React from "react";
import { createThirdwebClient } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import {
  ThirdwebProvider,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useConnectModal,
  useDisconnect,
} from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import type { LocalThirdwebQaMode } from "./gate";
import { getQaProviderView, type QaLastAction } from "./provider-view";
import { getQaWalletChoice, assertQaWalletPath, type QaWalletPath } from "./wallet-choice";

type Props = Readonly<{
  clientId: string;
  chainId: 11155111;
  mode: LocalThirdwebQaMode;
}>;

function QaWalletControls({ clientId, mode }: Pick<Props, "clientId" | "mode">) {
  const client = React.useMemo(() => createThirdwebClient({ clientId }), [clientId]);
  const choice = getQaWalletChoice(mode);

  const { connect, isConnecting } = useConnectModal();
  const { disconnect } = useDisconnect();
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const connectionStatus = useActiveWalletConnectionStatus();
  const [lastAction, setLastAction] = React.useState<QaLastAction>("idle");
  const connectLock = React.useRef(false);
  const [clientReady, setClientReady] = React.useState(false);
  React.useEffect(() => { setClientReady(true); }, []);
  const view = getQaProviderView({
    connectionStatus,
    isConnecting,
    walletId: activeWallet?.id,
    address: account?.address,
    chainId: activeChain?.id,
    lastAction,
  });

  async function connectForQa(requested: QaWalletPath) {
    if (!clientReady || connectLock.current || !view.canConnect) return;
    const selected = assertQaWalletPath(mode, requested);
    connectLock.current = true;
    setLastAction("connecting");
    try {
      // Only instantiate the method selected by the user. Email never requires MetaMask.
      const wallet = selected === "embedded-email"
        ? inAppWallet({ auth: { options: ["email"] } })
        : createWallet("io.metamask");
      await connect({
        client,
        wallets: [wallet],
        chain: sepolia,
        showAllWallets: false,
        setActive: true,
        size: "compact",
        title: selected === "embedded-email" ? "RHC in-app wallet - email verification" : "Optional external wallet - QA",
        theme: "light",
      });
      // Never treat a wallet address, Thirdweb auth session or email as RHC identity.
      setLastAction("idle");
    } catch {
      setLastAction("canceled");
    } finally {
      connectLock.current = false;
    }
  }

  function disconnectForQa() {
    if (!clientReady || !activeWallet || !view.canDisconnect) return;
    try {
      disconnect(activeWallet);
      // A void SDK call is a request, not proof that the wallet disconnected.
      setLastAction("disconnect_requested");
    } catch {
      setLastAction("disconnect_failed");
    }
  }

  return (
    <section
      data-rhc-thirdweb-qa="local-real-sdk"
      data-qa-hydrated={clientReady ? "true" : "false"}
      aria-label="RHC local Thirdweb provider QA"
      className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 text-[var(--rhc-heading)] sm:p-8"
    >
      <p className="text-xs font-black uppercase tracking-widest text-[var(--rhc-primary)]">
        Development-only / RHC QA — not a customer product feature
      </p>
      <h1 className="mt-3 text-2xl font-black">
        Thirdweb wallet connection test
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]" data-qa-primary-method={choice.primary}>
        {choice.primary === "embedded-email"
          ? "Use an in-app wallet with email verification. MetaMask and browser extensions are not required."
          : "External-wallet-only QA mode. Use your approved dedicated test wallet."}
        {choice.optional && " An existing external wallet is available as an optional advanced choice."}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]" data-qa-auth-boundary>
        This is provider-only QA, not RHC account login. Email verification is
        handled by Thirdweb; use an approved test mailbox. No automatic RHC
        wallet link, Points lookup, token action or transaction is performed.
      </p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border p-3">
          <dt className="font-semibold">Connection status</dt>
          <dd data-qa-connection-status className="mt-1">{connectionStatus}</dd>
        </div>
        <div className="rounded-xl border p-3">
          <dt className="font-semibold">Wallet provider</dt>
          <dd data-qa-provider-id className="mt-1 break-all">{activeWallet?.id ?? "None"}</dd>
        </div>
        <div className="rounded-xl border p-3">
          <dt className="font-semibold">Test wallet address (masked)</dt>
          <dd data-qa-wallet-address className="mt-1 font-mono">{view.maskedAddress}</dd>
        </div>
        <div className="rounded-xl border p-3">
          <dt className="font-semibold">Network eligibility</dt>
          <dd data-qa-chain-status className="mt-1">{view.networkLabel}</dd>
        </div>
      </dl>
      <p role="status" aria-live="polite" data-qa-message className="mt-5 rounded-xl border p-3 text-sm">
        {view.notice}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          data-qa-connect-primary={choice.primary}
          type="button" onClick={() => void connectForQa(choice.primary)}
          disabled={!clientReady || !view.canConnect}
          className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {view.busy ? "Connecting test wallet..." : choice.primaryLabel}
        </button>
        <button
          type="button" onClick={disconnectForQa}
          disabled={!clientReady || !view.canDisconnect}
          className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Disconnect test wallet
        </button>
      </div>
      {choice.optional && (
        <details className="mt-4 rounded-xl border p-3" data-qa-advanced-wallet>
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
            Advanced: use an existing wallet (optional)
          </summary>
          <p className="mt-2 text-sm text-[var(--rhc-muted)]">
            This option is only for users who already have MetaMask. It is not
            required for the email-based in-app wallet. Disconnect the current
            wallet before choosing a different method; wallets are not merged or linked.
          </p>
          <button type="button" data-qa-connect-external
            onClick={() => { if (choice.optional) void connectForQa(choice.optional); }}
            disabled={!clientReady || !view.canConnect}
            className="mt-3 min-h-11 rounded-xl border border-[var(--rhc-border)] px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">
            Connect MetaMask (optional)
          </button>
        </details>
      )}
      <p className="mt-5 text-xs leading-5 text-[var(--rhc-muted)]">
        Connected wallet is not an authenticated RHC user. RHC wallet link,
        custody, spending, balances, RHC Points, and Mainnet tokens are unavailable.
        The selected chain is Sepolia testnet; connecting does not authorize
        testnet transactions. Do not use a production wallet or real customer data.
      </p>
    </section>
  );
}

export function ThirdwebLocalQa({ clientId, chainId, mode }: Props) {
  // Must be independently validated by the server's local-only route gate.
  if (chainId !== sepolia.id) return null;
  return (
    <main className="min-h-screen w-full bg-[var(--rhc-background)] px-4 py-10">
      <ThirdwebProvider>
        <QaWalletControls clientId={clientId} mode={mode} />
      </ThirdwebProvider>
    </main>
  );
}
