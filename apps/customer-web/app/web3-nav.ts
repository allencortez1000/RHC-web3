export const customerNavItems = [
  { section: 'Overview', label: 'Dashboard', href: '/dashboard', icon: '▦' },
  { section: 'Overview', label: 'My RHC Account', href: '/account', icon: 'ID' },

  { section: 'My Property', label: 'Explore Properties', href: '/properties', icon: '⌂' },
  { section: 'My Property', label: 'My Properties', href: '/my-properties', icon: 'MP' },
  { section: 'My Property', label: 'Reservations', href: '/reservations', icon: 'RS' },
  { section: 'My Property', label: 'Payment Records', href: '/payment-records', icon: '₱' },
  { section: 'My Property', label: 'Documents', href: '/documents', icon: 'DOC' },
  { section: 'My Property', label: 'Certificates', href: '/certificates', icon: 'CRT' },
  { section: 'My Property', label: 'Project Updates', href: '/project-updates', icon: 'UP' },

  { section: 'Rewards & Services', label: 'RHC Rewards', href: '/rhc-points', icon: '★' },
  { section: 'Rewards & Services', label: 'RHC Ecosystem', href: '/ecosystem', icon: 'RHC' },
  { section: 'Rewards & Services', label: 'Marketplace', href: '/marketplace', icon: '□' },

  { section: 'Verification', label: 'RHC Digital ID', href: '/digital-id', icon: 'ID' },
  { section: 'Verification', label: 'RHC Verify', href: '/rhc-verify', icon: '✓' },

  { section: 'Account', label: 'Notifications', href: '/notifications', icon: '!' },
  { section: 'Account', label: 'Profile', href: '/profile', icon: 'P' },
  { section: 'Account', label: 'Security', href: '/security', icon: 'S' },
  { section: 'Account', label: 'Settings', href: '/settings', icon: '⚙' },
  { section: 'Account', label: 'Help', href: '/help', icon: '?' },

  { section: 'Future Technology', label: 'Blockchain & Token', href: '/future-technology', icon: '◇' },
  { section: 'Future Technology', label: 'White Paper', href: '/white-paper', icon: 'WP' },
];

const activeAliases: Record<string, string[]> = {
  Dashboard: ['Dashboard'],
  'My RHC Account': ['My RHC Account', 'RHC Digital ID'],
  'Explore Properties': ['Properties', 'Property Details'],
  'My Properties': ['My Properties'],
  Reservations: ['Reservations'],
  'Payment Records': ['Payment Records'],
  Documents: ['Documents'],
  Certificates: ['Certificates'],
  'Project Updates': ['Project Updates'],
  'RHC Rewards': ['Rewards', 'RHC Points'],
  'RHC Ecosystem': ['RHC Ecosystem'],
  Marketplace: ['Marketplace', 'RHC Marketplace'],
  'RHC Digital ID': ['RHC Digital ID'],
  'RHC Verify': ['RHC Verify'],
  Notifications: ['Notifications'],
  Profile: ['Profile'],
  Security: ['Security'],
  Settings: ['Settings'],
  Help: ['Help'],
  'Blockchain & Token': ['Blockchain', 'RHC Wallet', 'RHC Token', 'Transactions', 'Future Technology'],
  'White Paper': ['White Paper'],
};

export function navFor(activeLabel: string) {
  return customerNavItems.map((item) => ({
    ...item,
    active: item.label === activeLabel || activeAliases[item.label]?.includes(activeLabel) || false,
  }));
}
