/**
 * RHC W03-3P — local-development-only thirdweb QA activation policy.
 *
 * Pure, server-evaluated function. No public NEXT_PUBLIC env override,
 * no remote hosts, no production environment and no token/network writes.
 * A syntactically valid reference is NOT proof that RHC actually approved it;
 * the operator must retain the separately signed authorization record.
 */
export const LOCAL_THIRDWEB_QA_CHAIN_ID = 11155111 as const; // Sepolia, TEST ONLY

export type LocalThirdwebQaMode =
  | "external-metamask"
  | "embedded-email"
  | "both";

export type QaDeniedReason =
  | "NOT_LOCAL_DEVELOPMENT"
  | "HOST_NOT_LOOPBACK"
  | "NO_APPROVAL_REFERENCE"
  | "CLIENT_ID_MISSING_OR_INVALID"
  | "CHAIN_NOT_EXPLICITLY_SELECTED"
  | "WALLET_METHOD_NOT_APPROVED";

export interface LocalThirdwebQaInputs {
  readonly nodeEnv?: string;
  readonly vercel?: string;
  readonly vercelEnv?: string;
  readonly host?: string;
  readonly approvalReference?: string;
  readonly clientId?: string;
  readonly chainId?: string;
  readonly mode?: string;
}

export type LocalThirdwebQaDecision =
  | Readonly<{ allowed: false; reason: QaDeniedReason }>
  | Readonly<{
      allowed: true;
      clientId: string;
      chainId: typeof LOCAL_THIRDWEB_QA_CHAIN_ID;
      mode: LocalThirdwebQaMode;
      approvalReference: string;
    }>;

export function isLoopbackQaHost(host: unknown): boolean {
  if (typeof host !== "string" || host.length > 100) return false;
  const match = /^(localhost|127\.0\.0\.1|\[::1\])(?::([0-9]{1,5}))?$/.exec(host);
  if (!match) return false;
  if (match[2] === undefined) return true;
  const port = Number(match[2]);
  return Number.isSafeInteger(port) && port >= 1 && port <= 65535;
}

export function evaluateLocalThirdwebQa(
  config: LocalThirdwebQaInputs,
): LocalThirdwebQaDecision {
  if (config.nodeEnv !== "development" || !!config.vercel
      || !!config.vercelEnv) {
    return { allowed: false, reason: "NOT_LOCAL_DEVELOPMENT" };
  }
  if (!isLoopbackQaHost(config.host)) {
    return { allowed: false, reason: "HOST_NOT_LOOPBACK" };
  }
  const ref = config.approvalReference;
  // An actual externally signed approval must exist. This syntax alone is no authority.
  if (!ref || !/^RHC-QA-[A-Z0-9-]{8,72}$/.test(ref)) {
    return { allowed: false, reason: "NO_APPROVAL_REFERENCE" };
  }
  const id = config.clientId;
  // thirdweb Client ID is public, but secret or server keys must never enter this prop.
  if (!id || !/^[A-Za-z0-9_-]{8,96}$/.test(id)
      || /^(sk_|secret|sb_secret|token_|tw_secret)/i.test(id)) {
    return { allowed: false, reason: "CLIENT_ID_MISSING_OR_INVALID" };
  }
  if (config.chainId !== String(LOCAL_THIRDWEB_QA_CHAIN_ID)) {
    return { allowed: false, reason: "CHAIN_NOT_EXPLICITLY_SELECTED" };
  }
  const mode = config.mode;
  if (mode !== "external-metamask" && mode !== "embedded-email"
      && mode !== "both") {
    return { allowed: false, reason: "WALLET_METHOD_NOT_APPROVED" };
  }
  return Object.freeze({
    allowed: true,
    clientId: id,
    chainId: LOCAL_THIRDWEB_QA_CHAIN_ID,
    mode,
    approvalReference: ref,
  });
}
