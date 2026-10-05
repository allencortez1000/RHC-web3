import type { Metadata } from 'next';
import { MeridianHelpCenter } from '../components/meridian-public/help-center';

export const metadata: Metadata = {
  title: 'Help | RHC',
  description: 'Search plain-language help for RHC customer accounts, properties, records, rewards, and security.',
};

export default function Page() {
  return <MeridianHelpCenter />;
}
