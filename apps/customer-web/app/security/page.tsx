import { AppShell, Badge, Card, SecurityStatus, SignOutButton, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';
import { ConsentPreferences } from '../components/consent-preferences';

export default function Page() {
  return (
    <AppShell title="Security & Consent" navItems={navFor('Security')}>
      <SecurityStatus />
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Password">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">Password changes begin with a same-browser PKCE recovery link. Direct reset pages reject missing or expired codes.</p>
          <div className="mt-4"><Web3Button href="/forgot-password" variant="secondary">Request secure change link</Web3Button></div>
        </Card>
        <Card title="Current Browser Session">
          <p className="mb-4 text-sm text-[var(--rhc-muted)]">Sign out clears this application session and sensitive client state.</p>
          <SignOutButton />
        </Card>
        <Card title="Authentication Factors">
          <Badge tone="warning">Not configured</Badge>
          <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">The demonstration does not claim that MFA, passkeys, or device trust has been configured for a real account.</p>
        </Card>
        <Card title="Connected Devices">
          <Badge tone="warning">Backend required</Badge>
          <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">Production session inventory and remote revocation require an approved authentication-provider integration.</p>
        </Card>
        <Card title="External Wallet Security">
          <Badge tone="neutral">Not activated</Badge>
          <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">RHC does not hold customer crypto keys or provide custodial wallet functions.</p>
        </Card>
      </section>
      <ConsentPreferences />
    </AppShell>
  );
}
