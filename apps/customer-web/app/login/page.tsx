import Link from 'next/link';
import { Badge, Card, RHCLogoMark, ThemeToggle, Web3Button, Web3Shell } from '@rhc/ui';
import { LoginForm } from '../components/login-form';

const foundations = ['RHC Digital ID', 'Property Records', 'RHC Rewards', 'RHC Verify'];

export default function CustomerLoginStart() {
  const demoMode = process.env.NEXT_PUBLIC_RHC_DATA_MODE === 'demo';
  return (
    <Web3Shell>
      <section className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1fr_480px] lg:items-center">
        <div className="hidden lg:block">
          <Badge tone="gold">RHC Digital</Badge>
          <h1 className="rhc-page-title mt-6 max-w-3xl">Welcome to RHC Digital.</h1>
          <p className="rhc-body-copy mt-6 max-w-2xl">Access your identity, property records, rewards, and RHC services in one place. Real business. Real utility. Verifiable records.</p>
          <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
            {foundations.map((item) => (
              <Card key={item} className="rhc-card-token">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-[var(--rhc-heading)]">{item}</p>
                  <Badge tone="gold">Demo</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-xl rhc-card-token p-0">
          <div className="flex items-center justify-between border-b border-[var(--rhc-border)] p-6">
            <Link href="/" className="flex items-center gap-3">
              <RHCLogoMark size="md" />
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--rhc-heading)]">RHC Digital</p>
                <p className="text-xs text-[var(--rhc-muted)]">Secure customer sign in</p>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          <div className="p-6 md:p-8">
            <Badge tone={demoMode ? 'info' : 'gold'}>{demoMode ? 'Local demo profile' : 'Secure account access'}</Badge>
            <h2 className="mt-5 text-3xl font-bold text-[var(--rhc-heading)] md:text-4xl">{demoMode ? 'Choose your workspace' : 'Sign in'}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">
              {demoMode
                ? 'Select a named synthetic customer or staff persona. Customer and admin workspaces share one durable local demo world without production credentials.'
                : 'Use your authorized RHC Digital account to continue. Authentication and application authorization remain separate checks.'}
            </p>

            <LoginForm />

            {!demoMode ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Web3Button href="/register" variant="secondary">Create account</Web3Button>
                <Web3Button href="/verification" variant="secondary">Verify account</Web3Button>
              </div>
            ) : null}

            <p className="mt-6 text-center text-xs leading-5 text-[var(--rhc-muted)]">Wallet, token, public blockchain, crypto payments, and tokenized ownership remain inactive until approved production integrations are implemented.</p>
          </div>
        </Card>
      </section>
    </Web3Shell>
  );
}
