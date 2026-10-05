export type DataMode = 'api' | 'demo';

const demoCapabilities = {
  'demo-records': 'Account records and property journey',
  'identity-review': 'Identity review submission',
  'saved-properties': 'Saved properties',
  payments: 'Payment records',
  documents: 'Document workflows',
  certificates: 'Company certificates',
  'service-requests': 'Resident service requests',
  rewards: 'Rewards and points',
  activity: 'Activity history and receipts',
  'notification-read': 'Notification read status',
  'demo-controls': 'Local demo controls',
} as const;

export type DemoCapability = keyof typeof demoCapabilities;
export type FeatureUnavailable = {
  available: false;
  code: 'FEATURE_UNAVAILABLE';
  reason: 'backend-unimplemented';
  capability: DemoCapability;
  feature: string;
  message: string;
  retryable: false;
};
export type CapabilityAvailability = { available: true } | FeatureUnavailable;

export function getCapabilityAvailability(
  mode: DataMode,
  capability: DemoCapability,
): CapabilityAvailability {
  if (mode === 'demo') return { available: true };
  const feature = demoCapabilities[capability];
  return {
    available: false,
    code: 'FEATURE_UNAVAILABLE',
    reason: 'backend-unimplemented',
    capability,
    feature,
    message: `${feature} is unavailable in API mode. This backend does not implement this feature yet. No request was sent and no records were changed. It is available only in the isolated local demo with synthetic data.`,
    retryable: false,
  };
}

// This is a known-gap registry, not an authorization or endpoint allowlist.
// Controllers in apps/api and docs/api/api-overview.md remain authoritative.
// In particular, business-services, ID issuance, and admin verification approval
// must still reach the server and its feature, permission, and tenant checks.
const unavailableRoutes: ReadonlyArray<readonly [RegExp, DemoCapability]> = [
  [/^\/me\/demo-records(?:\/|$)/, 'demo-records'],
  [/^\/me\/identity-review(?:\/|$)/, 'identity-review'],
  [/^\/me\/saved-properties(?:\/|$)/, 'saved-properties'],
  [/^\/(?:me|admin)\/payments(?:\/|$)/, 'payments'],
  [/^\/(?:me|admin)\/documents(?:\/|$)/, 'documents'],
  [/^\/(?:me|admin)\/certificates(?:\/|$)/, 'certificates'],
  [/^\/(?:me|admin)\/service-requests(?:\/|$)/, 'service-requests'],
  [/^\/me\/rewards(?:\/|$)/, 'rewards'],
  [/^\/admin\/rewards-ledger(?:\/|$)/, 'rewards'],
  [/^\/me\/(?:activity|receipts)(?:\/|$)/, 'activity'],
  [/^\/(?:control|reset|personas|session)(?:\/|$)/, 'demo-controls'],
];

export function getRequestAvailability(
  mode: DataMode,
  path: string,
  method = 'GET',
): CapabilityAvailability {
  // Ignore query/fragment for classification, without rewriting the transport URL.
  const pathname = path.split(/[?#]/, 1)[0];
  if (method.toUpperCase() === 'POST' && /^\/me\/notifications\/(?:read-all|[^/]+\/read)\/?$/.test(pathname)) {
    return getCapabilityAvailability(mode, 'notification-read');
  }
  const match = unavailableRoutes.find(([pattern]) => pattern.test(pathname));
  return match ? getCapabilityAvailability(mode, match[1]) : { available: true };
}

export class FeatureUnavailableError extends Error {
  readonly code = 'FEATURE_UNAVAILABLE';
  readonly retryable = false;

  constructor(public readonly unavailable: FeatureUnavailable) {
    super(unavailable.message);
    this.name = 'FeatureUnavailableError';
  }
}

export function assertRequestAvailable(mode: DataMode, path: string, method?: string): void {
  const availability = getRequestAvailability(mode, path, method);
  if (!availability.available) throw new FeatureUnavailableError(availability);
}
