import type { LocalThirdwebQaMode } from "./gate";

export type QaWalletPath = "embedded-email" | "external-metamask";
export type QaWalletChoice = Readonly<{
  primary: QaWalletPath;
  optional: QaWalletPath | null;
  primaryLabel: string;
}>;

/** Business-approved preference; not permission to bypass the server QA gate. */
export function getQaWalletChoice(mode: LocalThirdwebQaMode): QaWalletChoice {
  if (mode === "embedded-email" || mode === "both") {
    return Object.freeze({
      primary: "embedded-email",
      optional: mode === "both" ? "external-metamask" : null,
      primaryLabel: "Continue with email",
    });
  }
  if (mode === "external-metamask") {
    return Object.freeze({
      primary: "external-metamask",
      optional: null,
      primaryLabel: "Connect approved test wallet",
    });
  }
  throw new Error("Unapproved QA wallet mode");
}

/** Resolve only explicitly permitted choices; do not silently open another wallet. */
export function assertQaWalletPath(mode: LocalThirdwebQaMode, requested: QaWalletPath): QaWalletPath {
  const choice = getQaWalletChoice(mode);
  if (requested !== "embedded-email" && requested !== "external-metamask") {
    throw new Error("Unknown wallet method");
  }
  if (requested !== choice.primary && requested !== choice.optional) {
    throw new Error("Wallet method is not enabled in this QA mode");
  }
  return requested;
}
