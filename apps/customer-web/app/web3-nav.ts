export const customerNavItems = [
  { section: 'Overview', label: 'Dashboard', href: '/dashboard', icon: '▦' },

  { section: 'Web3', label: 'RHC Token', href: '/token', icon: '◎' },
  { section: 'Web3', label: 'RHC Wallet', href: '/wallet', icon: '◇' },
  { section: 'Web3', label: 'Transactions', href: '/transactions', icon: '⇄' },
  { section: 'Web3', label: 'Digital Assets', href: '/blockchain', icon: '▧' },
  { section: 'Web3', label: 'Properties', href: '/properties', icon: '⌂' },

  { section: 'Marketplace', label: 'RHC Marketplace', href: '/marketplace', icon: '□' },
  { section: 'Marketplace', label: 'Amica', href: '/marketplace#amica', icon: 'A' },
  { section: 'Marketplace', label: 'RHC Businesses', href: '/marketplace#businesses', icon: 'B' },
  { section: 'Marketplace', label: 'Partners', href: '/marketplace#partners', icon: 'P' },

  { section: 'Ecosystem', label: 'RHC Digital ID', href: '/digital-id', icon: 'ID' },
  { section: 'Ecosystem', label: 'Resident Services', href: '/marketplace#services', icon: 'RS' },
  { section: 'Ecosystem', label: 'Rewards', href: '/rhc-points', icon: '★' },
  { section: 'Ecosystem', label: 'RHC Points', href: '/rhc-points', icon: 'PT' },
  { section: 'Ecosystem', label: 'Future Web3 Assets', href: '/blockchain', icon: 'FX' },

  { section: 'Management', label: 'Users', href: '/profile', icon: 'U' },
  { section: 'Management', label: 'Analytics', href: '/blockchain-activity', icon: '⌁' },
  { section: 'Management', label: 'Reports', href: '/transactions', icon: 'R' },

  { section: 'System', label: 'Notifications', href: '/notifications', icon: '!' },
  { section: 'System', label: 'Security', href: '/security', icon: 'S' },
  { section: 'System', label: 'Settings', href: '/settings', icon: '⚙' },
];

const activeAliases: Record<string, string[]> = {
  Dashboard: ['Dashboard'],
  'RHC Token': ['RHC Token', 'RHC Points'],
  'RHC Wallet': ['RHC Wallet'],
  Transactions: ['Transactions'],
  'Digital Assets': ['Digital Assets', 'Blockchain Activity'],
  Properties: ['Properties'],
  'RHC Marketplace': ['RHC Marketplace', 'Marketplace'],
  'RHC Digital ID': ['RHC Digital ID'],
  Rewards: ['Rewards', 'RHC Points'],
  'RHC Points': ['RHC Points'],
  Notifications: ['Notifications'],
  Security: ['Security'],
  Settings: ['Settings'],
};

export function navFor(activeLabel: string) {
  return customerNavItems.map((item) => ({
    ...item,
    active: item.label === activeLabel || activeAliases[item.label]?.includes(activeLabel) || false,
  }));
}
