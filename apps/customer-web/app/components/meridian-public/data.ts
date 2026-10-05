export type MeridianIconName =
  | 'arrow'
  | 'broadcast'
  | 'building'
  | 'check'
  | 'compass'
  | 'construction'
  | 'document'
  | 'droplet'
  | 'help'
  | 'home'
  | 'identity'
  | 'lock'
  | 'market'
  | 'nodes'
  | 'receipt'
  | 'search'
  | 'shield'
  | 'spark'
  | 'store';

export type PublicNavKey = 'home' | 'discover' | 'marketplace';

export const PUBLIC_NAV_ITEMS: ReadonlyArray<{
  key: PublicNavKey;
  label: string;
  href: string;
}> = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'discover', label: 'Discover', href: '/#discover' },
  { key: 'marketplace', label: 'Marketplace', href: '/marketplace' },
];

export const HOME_PRINCIPLES: ReadonlyArray<{
  number: string;
  title: string;
  detail: string;
}> = [
  {
    number: '01',
    title: 'Identity first',
    detail: 'One customer reference can connect approved RHC experiences without making private records public.',
  },
  {
    number: '02',
    title: 'Utility in context',
    detail: 'Property, documents, and services stay connected to the real relationship that created them.',
  },
  {
    number: '03',
    title: 'Proof, not promises',
    detail: 'Verification communicates record status and provenance—not ownership, investment value, or legal title.',
  },
];

export const DISCOVERY_PILLARS: ReadonlyArray<{
  icon: MeridianIconName;
  eyebrow: string;
  title: string;
  description: string;
  connection: string;
}> = [
  {
    icon: 'home',
    eyebrow: 'Places',
    title: 'A property journey that stays together',
    description: 'Explore how a home profile can connect reservations, records, milestones, and resident services.',
    connection: 'Property profile → authorized records → resident context',
  },
  {
    icon: 'nodes',
    eyebrow: 'Ecosystem',
    title: 'Many businesses, one clear way in',
    description: 'Discover where RHC companies can meet a customer need while remaining distinct legal entities.',
    connection: 'One identity → permissioned links → participating business',
  },
  {
    icon: 'shield',
    eyebrow: 'Trust',
    title: 'Records designed to be checked',
    description: 'Understand whether an RHC-issued reference matches its source without exposing the source document.',
    connection: 'Source record → digital fingerprint → verification result',
  },
];

export const GOLDEN_THREAD: ReadonlyArray<{
  id: 'identity' | 'property' | 'receipt';
  icon: MeridianIconName;
  step: string;
  title: string;
  sample: string;
  description: string;
}> = [
  {
    id: 'identity',
    icon: 'identity',
    step: '01 · Identity',
    title: 'RHC Digital ID',
    sample: 'RHC-DEMO-0001',
    description: 'The customer reference that establishes who may see and use an authorized record.',
  },
  {
    id: 'property',
    icon: 'building',
    step: '02 · Context',
    title: 'Property record',
    sample: 'AMICA-R1-A-01-01',
    description: 'The property context that organizes a customer journey without representing legal title.',
  },
  {
    id: 'receipt',
    icon: 'receipt',
    step: '03 · Evidence',
    title: 'Recorded receipt',
    sample: 'DEMO-PAY-0001',
    description: 'A traceable business record linked back to its customer and property context.',
  },
];

export const PROPERTY_PREVIEW = {
  project: 'Amica Residences 1',
  code: 'AMICA-R1-A-01-01',
  type: '1 bedroom residence',
  description:
    'A fictional sample showing how a property profile can become the anchor for authorized records and services.',
  facts: [
    { label: 'Building', value: 'Building A' },
    { label: 'Floor / unit', value: '01 / 101' },
    { label: 'Sample area', value: '32.50 sq m' },
    { label: 'Record mode', value: 'Demo only' },
  ],
} as const;

export const CUSTOMER_JOURNEY: ReadonlyArray<{
  number: string;
  icon: MeridianIconName;
  title: string;
  description: string;
  outcome: string;
}> = [
  {
    number: '01',
    icon: 'identity',
    title: 'Establish identity',
    description: 'Create an RHC account and complete the checks required for an RHC-issued customer reference.',
    outcome: 'A consistent identity layer',
  },
  {
    number: '02',
    icon: 'building',
    title: 'Link a real relationship',
    description: 'Authorized property and service records are connected only after the relevant business relationship exists.',
    outcome: 'Context without public exposure',
  },
  {
    number: '03',
    icon: 'document',
    title: 'Receive organized records',
    description: 'Documents, receipts, certificates, and milestones can be presented around the same customer context.',
    outcome: 'A clearer customer history',
  },
  {
    number: '04',
    icon: 'spark',
    title: 'Discover relevant services',
    description: 'The ecosystem can surface useful next steps based on permission and eligibility—not speculative ownership.',
    outcome: 'Service discovery with boundaries',
  },
];

export const VERIFICATION_STEPS: ReadonlyArray<{
  number: string;
  title: string;
  description: string;
}> = [
  {
    number: '1',
    title: 'Keep the source private',
    description: 'The underlying customer document remains in the authorized RHC system.',
  },
  {
    number: '2',
    title: 'Create a fingerprint',
    description: 'A one-way hash can identify the exact approved version without revealing its contents.',
  },
  {
    number: '3',
    title: 'Compare and report',
    description: 'A verifier can report a match, mismatch, inactive, or revoked state with limited public data.',
  },
];

export const DEMO_VERIFICATION_HREF = '/verify/rhc-id/UkhDLTIwMjYtMDAwMDAwMDE';

export type EcosystemCategoryKey =
  | 'all'
  | 'foundation'
  | 'property'
  | 'everyday'
  | 'community'
  | 'communications';

export const ECOSYSTEM_CATEGORIES: ReadonlyArray<{
  key: EcosystemCategoryKey;
  label: string;
}> = [
  { key: 'all', label: 'All connections' },
  { key: 'foundation', label: 'Ecosystem foundation' },
  { key: 'property', label: 'Homes & building' },
  { key: 'everyday', label: 'Everyday services' },
  { key: 'community', label: 'Safety & community' },
  { key: 'communications', label: 'Communications' },
];

export type EcosystemStage = 'demo' | 'prepared';

export type EcosystemMember = {
  id: string;
  initials: string;
  name: string;
  category: Exclude<EcosystemCategoryKey, 'all'>;
  categoryLabel: string;
  icon: MeridianIconName;
  stage: EcosystemStage;
  stageLabel: string;
  description: string;
  connection: string;
  capabilities: ReadonlyArray<string>;
};

export const ECOSYSTEM_MEMBERS: ReadonlyArray<EcosystemMember> = [
  {
    id: 'rhc',
    initials: 'RHC',
    name: 'Rabino Holdings Corporation',
    category: 'foundation',
    categoryLabel: 'Ecosystem steward',
    icon: 'compass',
    stage: 'demo',
    stageLabel: 'Demo foundation',
    description: 'Provides the shared identity, governance, and discovery layer for RHC experiences.',
    connection: 'One RHC account → shared standards → permissioned company experiences',
    capabilities: ['Digital identity', 'Platform governance', 'Service discovery'],
  },
  {
    id: 'amica',
    initials: 'AM',
    name: 'Amica Condominium Realty Corporation',
    category: 'property',
    categoryLabel: 'Real estate',
    icon: 'building',
    stage: 'demo',
    stageLabel: 'Demo records',
    description: 'Demonstrates property discovery and the customer journey from a unit profile to linked records.',
    connection: 'RHC Digital ID → authorized Amica property record → buyer journey',
    capabilities: ['Property profiles', 'Reservations', 'Buyer records'],
  },
  {
    id: 'rhbc',
    initials: 'RHBC',
    name: 'Rabino Home Builders Corporation',
    category: 'property',
    categoryLabel: 'Construction',
    icon: 'construction',
    stage: 'prepared',
    stageLabel: 'Planned connection',
    description: 'A future connection for approved construction milestones and project information.',
    connection: 'Linked property → approved project milestone → customer update',
    capabilities: ['Milestone updates', 'Project context', 'Record provenance'],
  },
  {
    id: 'amica-water',
    initials: 'AW',
    name: 'Amica Water Co. Ltd.',
    category: 'everyday',
    categoryLabel: 'Utilities',
    icon: 'droplet',
    stage: 'prepared',
    stageLabel: 'Planned connection',
    description: 'A future utility account link for eligible customers and properties.',
    connection: 'Customer identity + eligible property → utility account context',
    capabilities: ['Account linking', 'Service status', 'Eligible activity'],
  },
  {
    id: 'amica-mart',
    initials: 'AMT',
    name: 'Amica Mart Trading Corporation',
    category: 'everyday',
    categoryLabel: 'Retail',
    icon: 'store',
    stage: 'prepared',
    stageLabel: 'Planned connection',
    description: 'A future retail participation point for approved loyalty and customer experiences.',
    connection: 'RHC Digital ID → eligible retail activity → governed rewards record',
    capabilities: ['Retail discovery', 'Loyalty eligibility', 'Offer context'],
  },
  {
    id: 'rssc',
    initials: 'RSSC',
    name: 'Rabino Security Services Corporation',
    category: 'community',
    categoryLabel: 'Security services',
    icon: 'shield',
    stage: 'prepared',
    stageLabel: 'Planned connection',
    description: 'A future connection for authorized resident and visitor service credentials.',
    connection: 'Verified resident context → scoped credential → approved access use',
    capabilities: ['Resident context', 'Visitor credentials', 'Scoped access'],
  },
  {
    id: 'rbac',
    initials: 'RBAC',
    name: 'Rabino Broadcasting and Advertising Corporation',
    category: 'communications',
    categoryLabel: 'Media & communications',
    icon: 'broadcast',
    stage: 'prepared',
    stageLabel: 'Planned connection',
    description: 'A future channel for consent-aware customer communications and approved campaigns.',
    connection: 'Customer preferences → approved message → communication history',
    capabilities: ['Customer updates', 'Campaign context', 'Consent boundaries'],
  },
  {
    id: 'coastline',
    initials: 'CFC',
    name: 'Coastline Food Corporation',
    category: 'everyday',
    categoryLabel: 'Food & commerce',
    icon: 'market',
    stage: 'prepared',
    stageLabel: 'Planned connection',
    description: 'A future commerce participant for discovery and approved loyalty use cases.',
    connection: 'RHC customer context → participating experience → eligible activity record',
    capabilities: ['Experience discovery', 'Loyalty participation', 'Customer context'],
  },
];

export const ECOSYSTEM_CONNECTIONS: ReadonlyArray<{
  from: string;
  through: string;
  to: string;
  detail: string;
}> = [
  {
    from: 'RHC Digital ID',
    through: 'Permission',
    to: 'Participating company',
    detail: 'The customer controls a single entry point while each company keeps its own responsibilities.',
  },
  {
    from: 'Property context',
    through: 'Eligibility',
    to: 'Resident service',
    detail: 'A relevant service can be shown when an authorized property relationship supports it.',
  },
  {
    from: 'Business event',
    through: 'Recorded evidence',
    to: 'Verification',
    detail: 'Approved records can carry provenance without turning them into financial or ownership tokens.',
  },
];

export type MarketplaceCategoryKey =
  | 'all'
  | 'property'
  | 'verification'
  | 'resident'
  | 'everyday';

export const MARKETPLACE_CATEGORIES: ReadonlyArray<{
  key: MarketplaceCategoryKey;
  label: string;
}> = [
  { key: 'all', label: 'All services' },
  { key: 'property', label: 'Property' },
  { key: 'verification', label: 'Verification' },
  { key: 'resident', label: 'Resident services' },
  { key: 'everyday', label: 'Everyday life' },
];

export type MarketplaceService = {
  id: string;
  title: string;
  provider: string;
  category: Exclude<MarketplaceCategoryKey, 'all'>;
  categoryLabel: string;
  icon: MeridianIconName;
  stage: 'demo' | 'planned';
  stageLabel: string;
  description: string;
  connection: string;
  access: string;
  href?: string;
  actionLabel?: string;
};

export const MARKETPLACE_SERVICES: ReadonlyArray<MarketplaceService> = [
  {
    id: 'property-discovery',
    title: 'Property discovery',
    provider: 'Amica',
    category: 'property',
    categoryLabel: 'Property',
    icon: 'home',
    stage: 'demo',
    stageLabel: 'Portal demo',
    description: 'Browse fictional property profiles and see how an authorized customer journey could be organized.',
    connection: 'Identity → property profile → authorized records',
    access: 'Customer portal sign-in required',
    href: '/login',
    actionLabel: 'View property demo',
  },
  {
    id: 'rhc-verification',
    title: 'RHC ID verification',
    provider: 'Rabino Holdings Corporation',
    category: 'verification',
    categoryLabel: 'Verification',
    icon: 'shield',
    stage: 'demo',
    stageLabel: 'Public demo',
    description: 'Check a masked demonstration reference and see the limited result a public verifier can return.',
    connection: 'RHC-issued reference → status check → masked result',
    access: 'Public demonstration',
    href: DEMO_VERIFICATION_HREF,
    actionLabel: 'Open demo verification',
  },
  {
    id: 'document-provenance',
    title: 'Document provenance',
    provider: 'RHC Digital',
    category: 'verification',
    categoryLabel: 'Verification',
    icon: 'document',
    stage: 'demo',
    stageLabel: 'Portal demo',
    description: 'See how issued records, versions, and verification status can be kept in one customer context.',
    connection: 'Source record → version history → verification state',
    access: 'Customer portal sign-in required',
    href: '/login',
    actionLabel: 'View records demo',
  },
  {
    id: 'construction-updates',
    title: 'Construction updates',
    provider: 'RHBC',
    category: 'property',
    categoryLabel: 'Property',
    icon: 'construction',
    stage: 'planned',
    stageLabel: 'Planned',
    description: 'A proposed connection for approved project milestones and customer-facing progress context.',
    connection: 'Linked property → approved milestone → customer update',
    access: 'No live company integration',
  },
  {
    id: 'water-account',
    title: 'Water account connection',
    provider: 'Amica Water',
    category: 'resident',
    categoryLabel: 'Resident services',
    icon: 'droplet',
    stage: 'planned',
    stageLabel: 'Planned',
    description: 'A proposed utility account link for eligible customers and properties.',
    connection: 'Eligible property → utility context → service status',
    access: 'No live utility integration',
  },
  {
    id: 'resident-credentials',
    title: 'Resident access credentials',
    provider: 'RSSC',
    category: 'resident',
    categoryLabel: 'Resident services',
    icon: 'lock',
    stage: 'planned',
    stageLabel: 'Planned',
    description: 'A proposed way to issue tightly scoped resident or visitor credentials after authorization.',
    connection: 'Resident context → scoped credential → approved access',
    access: 'No live access-control integration',
  },
  {
    id: 'retail-loyalty',
    title: 'Retail loyalty participation',
    provider: 'Amica Mart',
    category: 'everyday',
    categoryLabel: 'Everyday life',
    icon: 'store',
    stage: 'planned',
    stageLabel: 'Planned',
    description: 'A proposed connection for approved loyalty activity. No purchase or redemption is available here.',
    connection: 'Eligible activity → governed points record → customer history',
    access: 'No checkout, payment, or redemption',
  },
  {
    id: 'customer-communications',
    title: 'Customer communications',
    provider: 'RBAC',
    category: 'everyday',
    categoryLabel: 'Everyday life',
    icon: 'broadcast',
    stage: 'planned',
    stageLabel: 'Planned',
    description: 'A proposed consent-aware channel for relevant service and community updates.',
    connection: 'Preferences → approved communication → delivery record',
    access: 'No live messaging integration',
  },
];

export type HelpTopicKey =
  | 'all'
  | 'account'
  | 'property'
  | 'records'
  | 'rewards'
  | 'security';

export const HELP_TOPICS: ReadonlyArray<{
  key: HelpTopicKey;
  label: string;
}> = [
  { key: 'all', label: 'All topics' },
  { key: 'account', label: 'Account & ID' },
  { key: 'property', label: 'Property journey' },
  { key: 'records', label: 'Records & verification' },
  { key: 'rewards', label: 'Rewards & marketplace' },
  { key: 'security', label: 'Security & access' },
];

export type HelpArticle = {
  id: string;
  topic: Exclude<HelpTopicKey, 'all'>;
  question: string;
  answer: string;
  keywords: ReadonlyArray<string>;
};

export const HELP_ARTICLES: ReadonlyArray<HelpArticle> = [
  {
    id: 'digital-id',
    topic: 'account',
    question: 'What is an RHC Digital ID?',
    answer: 'It is an RHC-issued customer reference used inside the ecosystem. It is not a government ID, a wallet address, or proof of property ownership.',
    keywords: ['identity', 'reference', 'government id', 'wallet'],
  },
  {
    id: 'account-verification',
    topic: 'account',
    question: 'Why does my account need verification?',
    answer: 'Verification helps RHC apply the right access and record-linking rules. The checks shown in this environment are demonstrations and do not complete a production identity review.',
    keywords: ['account', 'verify', 'email', 'profile'],
  },
  {
    id: 'reservation',
    topic: 'property',
    question: 'Does a demo reservation mean I own the property?',
    answer: 'No. A demo reservation is a fictional workflow record. A hold, reservation, customer profile, or digital certificate is not legal ownership or a government-issued title.',
    keywords: ['hold', 'reserve', 'ownership', 'title'],
  },
  {
    id: 'payments',
    topic: 'property',
    question: 'Can I pay for a property in RHC?',
    answer: 'No payment action is available in this demo. Payment screens show fictional business records only; they do not charge, transfer, or settle money.',
    keywords: ['payment', 'pay now', 'money', 'settlement'],
  },
  {
    id: 'documents',
    topic: 'records',
    question: 'Are the documents and receipts official?',
    answer: 'Demo documents and receipts are clearly marked fictional samples. Production records would require issuance by the authorized RHC business and the applicable legal process.',
    keywords: ['document', 'receipt', 'official', 'sample'],
  },
  {
    id: 'verification',
    topic: 'records',
    question: 'What does a verification result prove?',
    answer: 'It can report whether a limited RHC-issued reference matches an internal status. It does not by itself prove identity to third parties, legal title, payment, or blockchain ownership.',
    keywords: ['verify', 'hash', 'certificate', 'blockchain'],
  },
  {
    id: 'rewards',
    topic: 'rewards',
    question: 'Are RHC Rewards cryptocurrency or cash?',
    answer: 'No. The displayed points are centrally managed fictional demo records. They are not cash, cryptocurrency, an investment, or a promise of future token conversion.',
    keywords: ['points', 'cash', 'crypto', 'token', 'rewards'],
  },
  {
    id: 'marketplace',
    topic: 'rewards',
    question: 'Can I buy services in the marketplace?',
    answer: 'No. The marketplace is a discovery directory in this release. Checkout, payments, redemptions, transfers, and blockchain settlement are not active.',
    keywords: ['marketplace', 'buy', 'checkout', 'redeem'],
  },
  {
    id: 'access',
    topic: 'security',
    question: 'Why can I only see some records?',
    answer: 'Customer access is scoped to authenticated and authorized relationships. A signed-in account should not reveal another customer’s private profile, property, or document data.',
    keywords: ['permission', 'private', 'access', 'authorized'],
  },
  {
    id: 'support',
    topic: 'security',
    question: 'How do I submit a support request?',
    answer: 'A support-request endpoint is not connected in this demo. Use an existing verified RHC contact channel for real account concerns, and never share a password, one-time code, or seed phrase.',
    keywords: ['support', 'contact', 'password', 'otp'],
  },
];

export const HELP_DESTINATIONS: ReadonlyArray<{
  icon: MeridianIconName;
  title: string;
  description: string;
  href: string;
  action: string;
}> = [
  {
    icon: 'identity',
    title: 'Review my Digital ID',
    description: 'See the customer reference and current demonstration status attached to your account.',
    href: '/digital-id',
    action: 'Open Digital ID',
  },
  {
    icon: 'home',
    title: 'Review property records',
    description: 'Return to your linked property context, reservations, and sample records.',
    href: '/my-properties',
    action: 'Open my properties',
  },
  {
    icon: 'shield',
    title: 'Understand verification',
    description: 'See how an RHC-issued reference is checked and what the result does not prove.',
    href: '/login',
    action: 'Sign in for RHC Verify',
  },
];

export type TechnologyPhase = {
  id: 'foundation' | 'verification' | 'ecosystem' | 'decision';
  number: string;
  horizon: string;
  title: string;
  status: string;
  description: string;
  delivers: ReadonlyArray<string>;
  gates: ReadonlyArray<string>;
};

export const TECHNOLOGY_PHASES: ReadonlyArray<TechnologyPhase> = [
  {
    id: 'foundation',
    number: '01',
    horizon: 'Now',
    title: 'Customer foundation',
    status: 'Demonstration available',
    description: 'Build useful customer identity, property, record, and rewards workflows before introducing blockchain complexity.',
    delivers: ['RHC Digital ID', 'Customer account', 'Property and document context', 'Centralized demo rewards ledger'],
    gates: ['Production security review', 'Data-governance approval', 'Business-owner acceptance'],
  },
  {
    id: 'verification',
    number: '02',
    horizon: 'Next',
    title: 'Verification layer',
    status: 'Not connected',
    description: 'Add approved document fingerprints and status proofs only where independent verification provides measurable value.',
    delivers: ['Document hashes', 'Certificate status', 'Approved milestone evidence', 'Publicly masked verification'],
    gates: ['Approved network decision', 'Privacy impact review', 'Smart-contract audit', 'Revocation design'],
  },
  {
    id: 'ecosystem',
    number: '03',
    horizon: 'Later',
    title: 'Company connections',
    status: 'Prepared concepts',
    description: 'Connect participating RHC businesses through governed interfaces, explicit permissions, and service-specific eligibility.',
    delivers: ['Utility account links', 'Resident-service context', 'Retail participation', 'Consent-aware communications'],
    gates: ['Company agreements', 'API security review', 'Customer consent design', 'Operational support model'],
  },
  {
    id: 'decision',
    number: '04',
    horizon: 'Separate decision',
    title: 'Digital-asset decision',
    status: 'Not authorized',
    description: 'Consider any token or external-wallet capability only through a separate business, legal, regulatory, and security decision.',
    delivers: ['No committed token deliverables', 'No assumed conversion path', 'No speculative roadmap promise'],
    gates: ['Demonstrated business need', 'Board approval', 'Regulatory analysis', 'Independent security assurance'],
  },
];

export const TECHNOLOGY_RESTRICTIONS: ReadonlyArray<{
  icon: MeridianIconName;
  title: string;
  state: string;
  detail: string;
}> = [
  {
    icon: 'lock',
    title: 'Customer crypto custody',
    state: 'Not available',
    detail: 'RHC does not hold customer private keys or seed phrases.',
  },
  {
    icon: 'nodes',
    title: 'Public blockchain',
    state: 'Not connected',
    detail: 'No production network or customer transaction is active.',
  },
  {
    icon: 'spark',
    title: 'RHC token',
    state: 'Not deployed',
    detail: 'There is no public sale, balance, transfer, staking, or conversion.',
  },
  {
    icon: 'receipt',
    title: 'Crypto payments',
    state: 'Disabled',
    detail: 'No checkout, exchange, settlement, or financial action is provided.',
  },
];

export const TECHNOLOGY_PRINCIPLES: ReadonlyArray<{
  title: string;
  description: string;
}> = [
  {
    title: 'Selective, not default',
    description: 'Use blockchain only when an approved record benefits from independent, tamper-evident proof.',
  },
  {
    title: 'Private by design',
    description: 'Keep personal data and source documents off public ledgers; expose only the minimum result needed.',
  },
  {
    title: 'Reversible operations',
    description: 'Design status, revocation, support, and governance before presenting a verification feature to customers.',
  },
];
