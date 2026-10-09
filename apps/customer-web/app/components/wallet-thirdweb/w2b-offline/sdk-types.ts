/**
 * Compile-time compatibility boundary for the existing pinned thirdweb@5.121.6.
 * Type imports are ERASED at runtime. This module exports no SDK client,
 * wallet factory, provider constructor, connector, signer or network action.
 * W2B-P1 mock-only controller intentionally does not consume these types yet.
 */
import type { ThirdwebClient } from 'thirdweb';
import type { Account, Wallet } from 'thirdweb/wallets';

/** For a future separately approved adapter design review ONLY. */
export interface FutureThirdwebWalletTypeShape {
  readonly clientId: ThirdwebClient['clientId'];
  readonly walletAddress: Account['address'] | null;
  readonly getAccount: Wallet['getAccount'];
  readonly getChain: Wallet['getChain'];
  readonly disconnect: Wallet['disconnect'];
}
export type FutureThirdwebConnectSignature = Wallet['connect'];
export type FutureThirdwebAccountSignature = ReturnType<Wallet['getAccount']>;
