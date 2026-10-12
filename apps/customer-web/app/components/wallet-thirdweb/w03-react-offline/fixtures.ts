import { FIXTURE_MARKER, type OfflineFixture } from "../w03-offline-view/model";

/**
 * Invented demonstration data. Not imported into customer routes or authenticated
 * services; never used as a fallback for provider or API failures.
 */
export type SyntheticScenario = "unknown" | "points" | "unlinked" | "simulated_link" | "zero" | "stale";

export function makeSyntheticWalletFixture(scenario: SyntheticScenario = "unknown"): OfflineFixture {
  const base: OfflineFixture = {
    fixtureKind: FIXTURE_MARKER,
    scope: {
      rhcUserId: "synthetic-customer-0001", sessionEpoch: 1, linkRevision: "synthetic-not-verified",
      chainId: null, contractAddress: null, sourceRevision: "offline-review-v1",
    },
    link: { state: "unknown", verification: "not_verified", durableProofSimulation: false },
    points: { status: "unavailable", balanceDecimal: null, history: { status: "unavailable", itemCount: null, coverageComplete: false } },
    token: {
      status: "not_approved", balanceStatus: "unavailable", rawBaseUnits: null, decimals: null,
      history: { status: "unsupported", itemCount: null, coverageComplete: false },
    },
  };
  switch (scenario) {
    case "points":
      return {
        ...base,
        points: {
          status: "observed", balanceDecimal: "125.00",
          history: { status: "observed", itemCount: 2, coverageComplete: true },
        },
      };
    case "unlinked":
      return { ...base, link: { ...base.link, state: "unlinked" } };
    case "simulated_link":
      return {
        ...base,
        link: { state: "linked", verification: "server_verified_simulation", durableProofSimulation: true },
      };
    case "zero":
      return {
        ...base,
        token: {
          status: "observed", balanceStatus: "observed", rawBaseUnits: "0", decimals: 18,
          history: { status: "empty", itemCount: 0, coverageComplete: true },
        },
      };
    case "stale":
      return {
        ...base,
        points: {
          status: "stale", balanceDecimal: "999999.99",
          history: { status: "stale", itemCount: 4, coverageComplete: false },
        },
        token: {
          status: "stale", balanceStatus: "stale", rawBaseUnits: "10000000", decimals: 18,
          history: { status: "stale", itemCount: null, coverageComplete: false },
        },
      };
    default:
      return base;
  }
}
