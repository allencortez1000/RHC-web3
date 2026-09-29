import { Badge, Card, Web3Button } from '@rhc/ui';
import { MeridianIcon } from './meridian-icon';
import { PublicShell } from './public-shell';

export function MeridianNotFoundPage() {
  return (
    <PublicShell>
      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div className="relative mx-auto grid h-64 w-64 place-items-center md:h-80 md:w-80">
            <div aria-hidden="true" className="absolute inset-0 rounded-full border border-[var(--rhc-border)]" />
            <div aria-hidden="true" className="absolute inset-8 rounded-full border border-dashed border-[rgba(212,175,55,.4)]" />
            <div aria-hidden="true" className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[linear-gradient(transparent,var(--rhc-border),transparent)]" />
            <div aria-hidden="true" className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--rhc-border),transparent)]" />
            <span className="relative grid h-28 w-28 place-items-center rounded-full border border-[rgba(212,175,55,.45)] bg-[var(--rhc-surface)] text-[var(--rhc-primary)] shadow-[var(--rhc-shadow-md)]">
              <MeridianIcon name="compass" className="h-14 w-14" />
            </span>
            <span className="absolute bottom-5 right-5 rounded-full border border-[var(--rhc-border)] bg-[var(--rhc-bg)] px-3 py-1 font-mono text-xs font-bold text-[var(--rhc-muted)]">404</span>
          </div>

          <Card className="rhc-card-token p-7 md:p-10">
            <Badge tone="gold">Off the map</Badge>
            <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.045em] text-[var(--rhc-heading)] md:text-5xl">This path does not lead to an RHC page.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--rhc-secondary-text)]">
              The address may have changed, the page may be unavailable, or the resource may require a different authorized route.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Web3Button href="/">Return home</Web3Button>
              <Web3Button href="/marketplace" variant="secondary">Explore services</Web3Button>
              <Web3Button href="/login" variant="tertiary">Get account help</Web3Button>
            </div>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}
