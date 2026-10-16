/**
 * W03-10: synthetic-only L1 / potential-L2 wallet presentation partition.
 *
 * UNMOUNTED. This is NOT a chain selector, approved RHC token contract, bridge,
 * gas model, live API parser, signing adapter, or release authorization.
 *
 * All network keys and assets are deliberately synthetic. No real chain IDs
 * (Ethereum, Sepolia, any L2), addresses, RPC endpoints or wallets occur here.
 * A future accepted backend contract must use a separately reviewed decoder.
 */
import { formatTokenBaseUnits } from "../w03-offline-view/model";

export const PARTITION_FIXTURE = "W03_OFFLINE_NETWORK_PARTITION_ONLY" as const;
export const RECORD_FIXTURE = "W03_OFFLINE_NETWORK_RECORD_ONLY" as const;

export type SyntheticLayer = "synthetic-l1" | "synthetic-l2-a" | "synthetic-l2-b";
export type BalanceState = "unavailable" | "stale" | "observed";
export type MovementState = "none" | "synthetic_in_flight";

export interface OfflineAccountScope {
  readonly fixtureKind: typeof PARTITION_FIXTURE;
  readonly rhcUserId: string;
  readonly sessionEpoch: number;
  readonly linkRevision: string;
  readonly sourceRevision: string;
}

export interface OfflineNetworkRecord {
  readonly fixtureKind: typeof RECORD_FIXTURE;
  readonly scope: OfflineAccountScope;
  readonly layer: SyntheticLayer;
  readonly assetKey: string;
  readonly balanceState: BalanceState;
  readonly rawBaseUnits: string | null;
  readonly decimals: number | null;
  readonly movement: MovementState;
}

export type OfflineNetworkRow = Readonly<{
  key: string;
  layer: SyntheticLayer;
  layerLabel: string;
  assetKey: string;
  amountLabel: string;
  movementLabel: string;
  status: BalanceState;
  syntheticOnly: true;
}>;

export type PartitionOutcome = Readonly<{
  kind: "synthetic-review" | "unavailable";
  notice: string;
  rows: readonly OfflineNetworkRow[];
  combinedTotal: null;
  officialRhcIdentityVerified: false;
  canonicalSupplyVerified: false;
  gasModelApproved: false;
  capabilities: Readonly<{
    canConnect: false;
    canLink: false;
    canTransfer: false;
    canApprove: false;
    canBridge: false;
    canRedeem: false;
    canMint: false;
  }>;
}>;

const LAYERS: readonly SyntheticLayer[] = Object.freeze([
  "synthetic-l1", "synthetic-l2-a", "synthetic-l2-b",
]);
const LAYER_LABELS: Readonly<Record<SyntheticLayer, string>> = Object.freeze({
  "synthetic-l1": "Synthetic L1 slot",
  "synthetic-l2-a": "Synthetic future L2 slot A",
  "synthetic-l2-b": "Synthetic future L2 slot B",
});

const CAPABILITIES = Object.freeze({
  canConnect: false,
  canLink: false,
  canTransfer: false,
  canApprove: false,
  canBridge: false,
  canRedeem: false,
  canMint: false,
} as const);
const SAFE_NOTICE =
  "SYNTHETIC OFFLINE ONLY. No official RHC token, L1/L2 bridge, gas token, balance, or network approval.";
const INVALID_NOTICE =
  "Network data unavailable, NOT zero. Synthetic identity/source/account boundary was not verified.";

type Dict = Record<string, unknown>;

function plain(value: unknown): value is Dict {
  try {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value))
    .every(d => "value" in d && d.enumerable);
  } catch { return false; }
}

function exact(value: Dict, required: readonly string[]): boolean {
  const names = Object.keys(value);
  return names.length === required.length && names.every(name => required.includes(name));
}

function syntheticId(value: unknown, prefix: string): value is string {
  return typeof value === "string" && value.length <= 96 &&
    new RegExp("^synthetic-" + prefix + "-[a-z0-9-]{1,64}$").test(value);
}

export function isOfflineAccountScope(value: unknown): value is OfflineAccountScope {
  if (!plain(value) || !exact(value, [
    "fixtureKind", "rhcUserId", "sessionEpoch", "linkRevision", "sourceRevision",
  ])) return false;
  return value.fixtureKind === PARTITION_FIXTURE &&
    syntheticId(value.rhcUserId, "user") &&
    Number.isSafeInteger(value.sessionEpoch) &&
    (value.sessionEpoch as number) >= 1 &&
    syntheticId(value.linkRevision, "link") &&
    syntheticId(value.sourceRevision, "source");
}

function sameScope(a: OfflineAccountScope, b: OfflineAccountScope): boolean {
  return a.rhcUserId === b.rhcUserId &&
    a.sessionEpoch === b.sessionEpoch &&
    a.linkRevision === b.linkRevision &&
    a.sourceRevision === b.sourceRevision;
}

function validBalance(value: Dict): boolean {
  if (value.balanceState === "observed") {
    return typeof value.rawBaseUnits === "string" &&
      /^(0|[1-9][0-9]{0,79})$/.test(value.rawBaseUnits) &&
      Number.isSafeInteger(value.decimals) &&
      (value.decimals as number) >= 0 && (value.decimals as number) <= 36;
  }
  return (value.balanceState === "stale" || value.balanceState === "unavailable") &&
    value.rawBaseUnits === null && value.decimals === null;
}

function isOfflineNetworkRecord(input: unknown, scope: OfflineAccountScope): input is OfflineNetworkRecord {
  if (!plain(input) || !exact(input, [
    "fixtureKind", "scope", "layer", "assetKey", "balanceState",
    "rawBaseUnits", "decimals", "movement",
  ])) return false;
  if (input.fixtureKind !== RECORD_FIXTURE ||
      !isOfflineAccountScope(input.scope) ||
      !sameScope(input.scope, scope) ||
      typeof input.layer !== "string" ||
      !LAYERS.includes(input.layer as SyntheticLayer) ||
      !syntheticId(input.assetKey, "asset") ||
      (input.movement !== "none" && input.movement !== "synthetic_in_flight")) return false;
  return validBalance(input);
}

function unavailable(): PartitionOutcome {
  return Object.freeze({
    kind: "unavailable",
    notice: INVALID_NOTICE,
    rows: Object.freeze([] as OfflineNetworkRow[]),
    combinedTotal: null,
    officialRhcIdentityVerified: false,
    canonicalSupplyVerified: false,
    gasModelApproved: false,
    capabilities: CAPABILITIES,
  });
}

/**
 * Decode only locally created synthetic records.
 * Fail closed for any invalid, duplicate, cross-account, foreign-network,
 * actual-address, or unapproved-capability field; never display partial data.
 */
function deriveValidatedOfflineNetworkPartition(
  scopeInput: unknown, recordsInput: unknown,
): PartitionOutcome {
  if (!isOfflineAccountScope(scopeInput) ||
      !Array.isArray(recordsInput) ||
      recordsInput.length < 1 || recordsInput.length > 9) return unavailable();

  const seen = new Set<string>();
  const rows: OfflineNetworkRow[] = [];
  for (const candidate of recordsInput) {
    if (!isOfflineNetworkRecord(candidate, scopeInput)) return unavailable();
    const key = candidate.layer + "::" + candidate.assetKey;
    if (seen.has(key)) return unavailable();
    seen.add(key);

    const formatted = candidate.balanceState === "observed"
      ? formatTokenBaseUnits(candidate.rawBaseUnits, candidate.decimals) : null;
    if (candidate.balanceState === "observed" && formatted === null) return unavailable();

    rows.push(Object.freeze({
      key,
      layer: candidate.layer,
      layerLabel: LAYER_LABELS[candidate.layer],
      assetKey: candidate.assetKey,
      status: candidate.balanceState,
      amountLabel: candidate.balanceState === "observed"
        ? "SIMULATED " + formatted + " (NOT an official RHC balance)"
        : candidate.balanceState === "stale"
          ? "Stale synthetic snapshot — no current amount"
          : "Unavailable — NOT zero",
      movementLabel: candidate.movement === "synthetic_in_flight"
        ? "Synthetic in-flight only — NOT a confirmed bridge or transferable balance"
        : "No approved bridge or settlement",
      syntheticOnly: true,
    }));
  }

  return Object.freeze({
    kind: "synthetic-review",
    notice: SAFE_NOTICE,
    rows: Object.freeze(rows),
    combinedTotal: null,  // Never add an L1 balance to a potential L2 representation.
    officialRhcIdentityVerified: false,
    canonicalSupplyVerified: false,
    gasModelApproved: false,
    capabilities: CAPABILITIES,
  });
}

/** Hostile runtime objects, proxies and iterators must also fail closed. */
export function deriveOfflineNetworkPartition(
  scopeInput: unknown, recordsInput: unknown,
): PartitionOutcome {
  try { return deriveValidatedOfflineNetworkPartition(scopeInput, recordsInput); }
  catch { return unavailable(); }
}
