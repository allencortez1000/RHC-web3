import type { Metadata } from 'next';
import { MeridianHomePage } from './components/meridian-public/home-page';

export const metadata: Metadata = {
  title: 'RHC | A place to belong',
  description: 'Discover RHC places, customer journeys, verifiable records, and participating services through RHC.',
};

export default function Page() {
  return <MeridianHomePage />;
}
