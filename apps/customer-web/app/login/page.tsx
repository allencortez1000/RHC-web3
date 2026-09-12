import { Badge, Card, ThemeToggle, Web3Shell } from '@rhc/ui';
import { LoginForm } from '../components/login-form';

const futureModules = ['RHC Wallet', 'RHC Points', 'Marketplace', 'Blockchain Verification'];

export default function CustomerLoginStart() {
  return (
    <Web3Shell>
      <section className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1fr_480px] lg:items-center">
        <div className="hidden lg:block">
          <Badge tone="info">RHC Digital Customer Portal</Badge>
          <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-tight text-white md:text-7xl">
            Secure access to your Web3-ready RHC identity.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Sign in to view your RHC Digital ID, authorized Amica Tower property relationships, privacy controls, notifications, and future feature-flagged ecosystem modules.
          </p>
          <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
            {futureModules.map((item) => (
              <Card key={item}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{item}</p>
                  <Badge>Coming Soon</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-xl border-cyan-300/20 bg-slate-950/80 p-0">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <a href="/" className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 font-black text-cyan-100 shadow-lg shadow-cyan-950/40">R</div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">RHC Digital</p>
                <p className="text-xs text-slate-400">Secure customer login</p>
              </div>
            </a>
            <ThemeToggle />
          </div>

          <div className="p-6 md:p-8">
            <Badge tone="info">Supabase Auth</Badge>
            <h2 className="mt-5 text-3xl font-black text-white md:text-4xl">Login to continue</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Sign in with your confirmed RHC Digital account. Your password is processed only by Supabase Auth.
            </p>

            <LoginForm />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a href="/register" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center font-bold text-white hover:border-cyan-300/50">Create account</a>
              <a href="/verification" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center font-bold text-white hover:border-cyan-300/50">Verify account</a>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Month 1 foundation only. Wallet, token, marketplace, and blockchain functionality remain disabled by feature flags.
            </p>
          </div>
        </Card>
      </section>
    </Web3Shell>
  );
}
