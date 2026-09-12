import { Badge, Card, ThemeToggle, Web3Shell } from '@rhc/ui';

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
            <Badge tone="warning">Mock Mode Ready</Badge>
            <h2 className="mt-5 text-3xl font-black text-white md:text-4xl">Login to continue</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use any email and password locally. The API runs with mock data when no database credentials are configured.
            </p>

            <form action="/dashboard" className="mt-8 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-slate-200">Email address</span>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue="customer@rhc.local"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-4"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-200">Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  defaultValue="mock-password"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-4"
                  placeholder="Enter your password"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-slate-300">
                  <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-white/10 accent-cyan-300" />
                  Remember this device
                </label>
                <a href="/forgot-password" className="font-semibold text-cyan-200 hover:text-cyan-100">Forgot password?</a>
              </div>

              <button type="submit" className="w-full rounded-2xl bg-cyan-300 px-6 py-3 font-black text-slate-950 shadow-xl shadow-cyan-950/40 hover:bg-cyan-200">
                Sign in
              </button>
            </form>

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
