import type { Metadata } from 'next';
import { MeridianHomePage } from './components/meridian-public/home-page';

export const metadata: Metadata = {
  title: 'RHC Digital Ecosystem | One identity, one ecosystem',
  description: 'Explore RHC properties, services, rewards, and verified records through one connected digital ecosystem.',
};

export default function Page() {
  return <MeridianHomePage />;
}
