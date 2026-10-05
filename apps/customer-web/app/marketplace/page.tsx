import type { Metadata } from 'next';
import { MarketplaceDiscovery } from '../components/meridian-public/marketplace-discovery';

export const metadata: Metadata = {
  title: 'Service Directory | RHC',
  description: 'Explore available demonstrations and planned RHC service connections without financial transactions.',
};

export default function Page() {
  return <MarketplaceDiscovery />;
}
