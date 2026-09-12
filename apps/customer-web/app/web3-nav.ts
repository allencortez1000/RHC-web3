export const customerNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '' },
  { label: 'RHC Digital ID', href: '/digital-id', icon: '' },
  { label: 'RHC Wallet', href: '/wallet', icon: '' },
  { label: 'RHC Points', href: '/rhc-points', icon: '' },
  { label: 'Properties', href: '/properties', icon: '' },
  { label: 'Marketplace', href: '/marketplace', icon: '' },
  { label: 'Transactions', href: '/transactions', icon: '' },
  { label: 'Blockchain Activity', href: '/blockchain', icon: '' },
  { label: 'Notifications', href: '/notifications', icon: '' },
  { label: 'Settings', href: '/settings', icon: '' },
  { label: 'Administration', href: '/administration', icon: '' },
];

export function navFor(activeLabel: string) {
  return customerNavItems.map((item) => ({ ...item, active: item.label === activeLabel }));
}
