import type { Metadata } from 'next';
import { MeridianFutureTechnology } from '../components/meridian-public/future-technology';

export const metadata: Metadata = {
  title: 'Future Technology | RHC',
  description: 'Review the governed RHC technology roadmap, approval gates, and inactive digital-asset boundaries.',
};

export default function Page() {
  return <MeridianFutureTechnology />;
}
