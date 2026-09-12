import { Badge, Card, ThemeToggle, Web3Button, Web3Shell } from '@rhc/ui';
import { LoginForm } from '../components/login-form';

const futureModules = ['RHC Token', 'RHC Wallet', 'Digital Properties', 'RHC Marketplace'];

export default function CustomerLoginStart() {
  return (
    <Web3Shell>
      <section className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1fr_480px] lg:items-center">
        <div className="hidden lg:block">
          <Badge tone="gold">RHC Web3 Platform</Badge>
          <h1 className="rhc-page-title mt-6 max-w-3xl">Powering the RHC Web3 ecosystem.</h1>
          <p className="rhc-body-copy mt-6 max-w-2xl">Real assets. Digital possibilities. Sign in to access your RHC Digital ID, wallet interface, RHC Points, property records, marketplace services, and future Web3 assets.</p>
          <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
            {futureModules.map((item) => (
              <Card key={item} className="rhc-card-token">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-[var(--rhc-heading)]">{item}</p>
                  <Badge tone="gold">Prepared</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-xl rhc-card-token p-0">
          <div className="flex items-center justify-between border-b border-[var(--rhc-border)] p-6">
            <a href="/" className="flex items-center gap-3">
              <div className="rhc-token-mini grid h-11 w-11 place-items-center rounded-full font-extrabold">R</div>
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--rhc-heading)]">RHC Digital</p>
                <p className="text-xs text-[var(--rhc-muted)]">Secure customer sign in</p>
              </div>
            </a>
            <ThemeToggle />
          </div>

          <div className="p-6 md:p-8">
            <Badge tone="info">Supabase Auth</Badge>
            <h2 className="mt-5 text-3xl font-bold text-[var(--rhc-heading)] md:text-4xl">Login to continue</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">
              Sign in with your confirmed RHC Digital account. Your password is processed only by Supabase Auth.
            </p>

            <LoginForm />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Web3Button href="/register" variant="secondary">Create account</Web3Button>
              <Web3Button href="/verification" variant="secondary">Verify account</Web3Button>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-[var(--rhc-muted)]">Month 1 foundation only. Token, marketplace, wallet, and blockchain functionality remain disabled until production integrations are implemented.</p>
          </div>
        </Card>
      </section>
    </Web3Shell>
  );
}
