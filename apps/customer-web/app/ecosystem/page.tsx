import type { Metadata } from 'next';
import { EcosystemDiscovery } from '../components/meridian-public/ecosystem-discovery';

export const metadata: Metadata = {
  title: 'RHC Ecosystem | Meridian',
  description: 'Search the categorized RHC ecosystem directory and understand how participating services connect.',
};

export default function Page() {
  return <EcosystemDiscovery />;
}
