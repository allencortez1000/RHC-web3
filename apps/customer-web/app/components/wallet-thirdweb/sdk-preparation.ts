/**
 * Thirdweb 5.121.6 offline SDK-preparation boundary.
 *
 * In this release evaluation is ALWAYS disabled: no dynamic SDK module import,
 * client creation, embedded wallet creation, wallet.connect, auth, RPC or signing
 * can be triggered by a caller, query string or public env flag.
 *
 * This file intentionally does NOT export a connect/sign/transaction API.
 * A future live adapter requires a separate, approved design and source review.
 */
import { evaluateW2AReadiness, type W2AReadinessInput } from './policy';

export interface ThirdwebSDKPreparationBlocked {
  readonly status: 'blocked';
  readonly loadedSdkModules: false;
  readonly createdClient: false;
  readonly enrolledWallet: false;
  readonly reasons: readonly string[];
}

export interface ThirdwebSDKPreparationPrepared {
  readonly status: 'prepared';
  readonly loadedSdkModules: true;
  readonly createdClient: true;
  readonly enrolledWallet: false;
  readonly client: import('thirdweb').ThirdwebClient;
  readonly embeddedWallet: ReturnType<typeof import('thirdweb/wallets').inAppWallet>;
  readonly externalWallet: ReturnType<typeof import('thirdweb/wallets').createWallet>;
}

/** Injectable for offline guards; production default imports the pinned installed SDK. */
export type SDKModulesLoader = () => Promise<{
  readonly sdk: Pick<typeof import('thirdweb'), 'createThirdwebClient'>;
  readonly wallets: Pick<typeof import('thirdweb/wallets'), 'inAppWallet' | 'createWallet'>;
}>;

const loadPinnedSDK: SDKModulesLoader = async () => {
  const [sdk, wallets] = await Promise.all([
    import('thirdweb'),
    import('thirdweb/wallets'),
  ]);
  return { sdk, wallets };
};

/**
 * Preparation is unreachable in W2A. Keep explicit typed intended calls for
 * compiler/SDK compatibility evidence, but NEVER call connect or autoConnect.
 * The same lock is independently re-evaluated inside this function.
 */
export async function prepareThirdwebFrontend(
  options: W2AReadinessInput,
  load: SDKModulesLoader = loadPinnedSDK,
): Promise<ThirdwebSDKPreparationBlocked | ThirdwebSDKPreparationPrepared> {
  const gate = evaluateW2AReadiness(options);
  if (!gate.sdkMayLoad) return {
    status: 'blocked',
    loadedSdkModules: false,
    createdClient: false,
    enrolledWallet: false,
    reasons: gate.reasons,
  };

  // Requires an explicit source-change review to make reachable in W2B.
  const { sdk, wallets } = await load();
  const publicClientId = options.publicClientId?.trim();
  if (!publicClientId) throw new Error('Public client ID missing');
  const client = sdk.createThirdwebClient({ clientId: publicClientId });
  const embeddedWallet = wallets.inAppWallet({ auth: { options: ['email'] } });
  const externalWallet = wallets.createWallet('io.metamask');
  return { status: 'prepared', loadedSdkModules: true, createdClient: true,
    enrolledWallet: false, client, embeddedWallet, externalWallet };
}
