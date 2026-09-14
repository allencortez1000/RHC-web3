'use client';
import { useState } from 'react';
import {
  AppShell,
  Badge,
  Card,
  ResourceStatus,
  WalletAddress,
  Web3Button,
  useResource,
} from '@rhc/ui';
import { navFor } from '../web3-nav';
import { fullName, ProfileEditor, VerificationSummary, type Me } from '../components/customer-data';
export default function Page() {
  const resource = useResource<Me>('/me');
  const [saved, setSaved] = useState(false);
  return (
    <AppShell title="User Profile" navItems={navFor('Users')}>
      <ResourceStatus {...resource} />
      {saved && (
        <p role="status" className="mb-4">
          Profile saved.
        </p>
      )}
      {resource.data && (
        <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <Card className="rhc-card-token">
            <div className="rhc-token-mini grid h-24 w-24 place-items-center rounded-full text-3xl font-extrabold">
              {fullName(resource.data).slice(0, 1)}
            </div>
            <h2 className="mt-5 text-2xl font-bold text-[var(--rhc-heading)]">
              {fullName(resource.data)}
            </h2>
            <p className="mt-2 text-[var(--rhc-muted)]">
              {resource.data.profile?.rhc_id || 'RHC ID not issued'}
            </p>
            <p className="mt-2">{resource.data.user.email}</p>
            <div className="my-4">
              <Badge>{resource.data.user.account_status || 'Not available'}</Badge>
            </div>
            <VerificationSummary account={resource.data.user} />
            <div className="mt-4">
              <WalletAddress />
            </div>
          </Card>
          <Card title="Profile Information">
            <ProfileEditor
              me={resource.data}
              saved={() => {
                setSaved(true);
                resource.reload();
              }}
            />
          </Card>
        </section>
      )}
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          ['Digital Identity', '/digital-id'],
          ['Wallet', '/wallet'],
          ['Security', '/security'],
        ].map(([item, href]) => (
          <Card key={item}>
            <Badge tone="gold">Profile</Badge>
            <h3 className="my-4 font-bold text-[var(--rhc-heading)]">{item}</h3>
            <Web3Button href={href} variant="secondary">
              Open {item}
            </Web3Button>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
