import { Badge, Card, Web3Button } from '@rhc/ui';
import {
  CUSTOMER_JOURNEY,
  DEMO_VERIFICATION_HREF,
  DISCOVERY_PILLARS,
  GOLDEN_THREAD,
  HOME_PRINCIPLES,
  PROPERTY_PREVIEW,
  VERIFICATION_STEPS,
} from './data';
import { MeridianIcon } from './meridian-icon';
import { DemoNotice, PublicShell, SectionHeading } from './public-shell';

export function MeridianHomePage() {
  return (
    <PublicShell current="home">
      <section className="relative overflow-hidden border-b border-[var(--rhc-border)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_75%_18%,rgba(212,175,55,.18),transparent_25%),radial-gradient(circle_at_15%_80%,rgba(212,175,55,.08),transparent_24%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-20 [background-image:linear-gradient(var(--rhc-border)_1px,transparent_1px),linear-gradient(90deg,var(--rhc-border)_1px,transparent_1px)] [background-size:56px_56px] lg:block"
        />

        <div className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1.08fr_.92fr] lg:py-28">
          <div>
            <Badge tone="gold">RHC · Public preview</Badge>
            <h1 className="mt-7 max-w-4xl text-[clamp(2.75rem,7vw,6.4rem)] font-extrabold leading-[.94] tracking-[-0.065em] text-[var(--rhc-heading)]">
              A place to belong.{' '}
              <span className="text-[var(--rhc-primary)]">An ecosystem to grow with.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--rhc-secondary-text)] md:text-xl">
              RHC brings places, customer records, and participating services into one understandable journey—connected by identity and designed around trust.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Web3Button href="#discover" className="sm:min-w-40">
                Explore RHC
                <MeridianIcon name="arrow" className="h-4 w-4" />
              </Web3Button>
              <Web3Button href="/login" variant="secondary" className="sm:min-w-40">
                Get started
              </Web3Button>
            </div>
            <p className="mt-5 flex max-w-xl items-start gap-2 text-sm leading-6 text-[var(--rhc-muted)]">
              <MeridianIcon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rhc-primary)]" />
              Public discovery needs no account. Identity, property, and customer records remain behind secure portal access.
            </p>
          </div>

          <Card className="rhc-card-token relative p-6 md:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--rhc-accent-soft)] blur-3xl"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="rhc-eyebrow">The RHC map</p>
                  <h2 className="mt-2 text-2xl font-extrabold text-[var(--rhc-heading)]">One thread. Useful context.</h2>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[rgba(212,175,55,.42)] bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]">
                  <MeridianIcon name="compass" className="h-6 w-6" />
                </span>
              </div>

              <div className="relative mt-7 grid gap-3" aria-label="Identity, property, and receipt connection preview">
                <div aria-hidden="true" className="absolute bottom-6 left-6 top-6 w-px bg-[linear-gradient(var(--rhc-primary),var(--rhc-border),var(--rhc-primary))]" />
                {GOLDEN_THREAD.map((item) => (
                  <div
                    key={`hero-${item.id}`}
                    className="relative flex items-center gap-4 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4"
                  >
                    <span className="z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[rgba(212,175,55,.38)] bg-[var(--rhc-bg-secondary)] text-[var(--rhc-primary)]">
                      <MeridianIcon name={item.icon} className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--rhc-muted)]">{item.step}</span>
                      <span className="mt-1 block font-bold text-[var(--rhc-heading)]">{item.title}</span>
                    </span>
                    <span className="ml-auto hidden font-mono text-[11px] text-[var(--rhc-muted)] sm:block">{item.sample}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-dashed border-[rgba(212,175,55,.38)] bg-[var(--rhc-accent-soft)] p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-primary)]">Result</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--rhc-heading)]">Relevant services, grounded in a real relationship</p>
                </div>
                <MeridianIcon name="spark" className="h-6 w-6 shrink-0 text-[var(--rhc-primary)]" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section aria-label="RHC principles" className="border-b border-[var(--rhc-border)] bg-[var(--rhc-bg-secondary)]">
        <div className="mx-auto grid max-w-7xl divide-y divide-[var(--rhc-border)] px-5 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">
          {HOME_PRINCIPLES.map((principle) => (
            <div key={principle.number} className="py-6 md:px-6 md:first:pl-0 md:last:pr-0">
              <div className="flex gap-4">
                <span className="font-mono text-xs font-bold text-[var(--rhc-primary)]">{principle.number}</span>
                <div>
                  <h2 className="font-bold text-[var(--rhc-heading)]">{principle.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">{principle.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="discover" className="scroll-mt-28 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Discover RHC"
            title="A connected view of life across RHC"
            description="Start with what matters to you. RHC makes the relationship between a place, a record, and a service visible before asking you to enter the portal."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {DISCOVERY_PILLARS.map((pillar, index) => (
              <article
                key={pillar.title}
                className="group relative overflow-hidden rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[rgba(212,175,55,.45)]"
              >
                <span className="absolute right-5 top-4 font-mono text-5xl font-bold text-[var(--rhc-accent-soft)]">0{index + 1}</span>
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-[rgba(212,175,55,.3)] bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]">
                  <MeridianIcon name={pillar.icon} className="h-6 w-6" />
                </span>
                <p className="rhc-eyebrow mt-6">{pillar.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-extrabold text-[var(--rhc-heading)]">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--rhc-secondary-text)]">{pillar.description}</p>
                <p className="mt-6 border-t border-[var(--rhc-border)] pt-4 font-mono text-xs leading-5 text-[var(--rhc-primary)]">{pillar.connection}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="golden-thread" className="scroll-mt-28 border-y border-[var(--rhc-border)] bg-[var(--rhc-bg-secondary)] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <SectionHeading
              eyebrow="The Golden Thread"
              title="Every record knows what it belongs to"
              description="RHC’s architecture links identity, property context, and recorded evidence without collapsing them into one record—or placing private customer data on a public ledger."
            />
            <DemoNotice>
              The references below are fictional demonstration data. A property record or receipt in RHC is not a deed, official title, proof of payment, or tokenized asset.
            </DemoNotice>
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {GOLDEN_THREAD.map((item, index) => (
              <li key={item.id} className="relative">
                <Card className="h-full p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-full border border-[rgba(212,175,55,.42)] bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]">
                      <MeridianIcon name={item.icon} className="h-6 w-6" />
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--rhc-muted)]">{item.step}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold text-[var(--rhc-heading)]">{item.title}</h3>
                  <p className="mt-2 break-all font-mono text-xs text-[var(--rhc-primary)]">{item.sample}</p>
                  <p className="mt-4 text-sm leading-6 text-[var(--rhc-muted)]">{item.description}</p>
                </Card>
                {index < GOLDEN_THREAD.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-4 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[rgba(212,175,55,.4)] bg-[var(--rhc-bg-secondary)] text-[var(--rhc-primary)] md:grid"
                  >
                    <MeridianIcon name="arrow" className="h-4 w-4" />
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch">
          <div className="relative min-h-[430px] overflow-hidden rounded-2xl border border-[var(--rhc-border)] bg-[linear-gradient(145deg,var(--rhc-surface-secondary),var(--rhc-bg-secondary))] p-6 shadow-sm md:p-8">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--rhc-border)_1px,transparent_1px),linear-gradient(90deg,var(--rhc-border)_1px,transparent_1px)] [background-size:34px_34px]"
            />
            <div aria-hidden="true" className="absolute bottom-0 right-[8%] h-[78%] w-[62%] border-x border-t border-[rgba(212,175,55,.45)] bg-[linear-gradient(180deg,rgba(212,175,55,.12),rgba(212,175,55,.02))]">
              <div className="absolute inset-4 [background-image:repeating-linear-gradient(0deg,transparent_0,transparent_48px,rgba(212,175,55,.25)_49px,rgba(212,175,55,.25)_50px),repeating-linear-gradient(90deg,transparent_0,transparent_54px,rgba(212,175,55,.18)_55px,rgba(212,175,55,.18)_56px)]" />
            </div>
            <div aria-hidden="true" className="absolute bottom-0 left-[8%] h-[52%] w-[28%] border-x border-t border-[var(--rhc-border-secondary)] bg-[var(--rhc-surface)]" />

            <div className="relative flex h-full min-h-[370px] flex-col justify-between">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Badge tone="gold">Fictional property preview</Badge>
                <span className="rounded-full border border-[var(--rhc-border)] bg-[var(--rhc-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">Not actual project imagery</span>
              </div>
              <div className="max-w-lg rounded-2xl border border-[rgba(212,175,55,.3)] bg-[var(--rhc-surface)] p-5 shadow-[var(--rhc-shadow-md)]">
                <p className="rhc-eyebrow">Preview record</p>
                <p className="mt-2 text-2xl font-extrabold text-[var(--rhc-heading)]">{PROPERTY_PREVIEW.project}</p>
                <p className="mt-1 font-mono text-xs text-[var(--rhc-primary)]">{PROPERTY_PREVIEW.code}</p>
              </div>
            </div>
          </div>

          <Card className="rhc-card-token p-6 md:p-8">
            <p className="rhc-eyebrow">Property in context</p>
            <h2 className="mt-3 text-3xl font-extrabold text-[var(--rhc-heading)] md:text-4xl">More than a listing</h2>
            <p className="mt-4 text-base leading-7 text-[var(--rhc-secondary-text)]">{PROPERTY_PREVIEW.description}</p>
            <p className="mt-3 text-sm font-semibold text-[var(--rhc-primary)]">{PROPERTY_PREVIEW.type}</p>

            <dl className="mt-7 grid grid-cols-2 gap-3">
              {PROPERTY_PREVIEW.facts.map((fact) => (
                <div key={fact.label} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
                  <dt className="text-xs text-[var(--rhc-muted)]">{fact.label}</dt>
                  <dd className="mt-1 text-sm font-bold text-[var(--rhc-heading)]">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 text-xs leading-5 text-[var(--rhc-muted)]">No reservation, purchase, or payment is performed on this public page.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Web3Button href="/login">View property records</Web3Button>
              <Web3Button href="/marketplace" variant="secondary">Discover services</Web3Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-[var(--rhc-border)] bg-[var(--rhc-bg-secondary)] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Identity to service"
            title="A journey that earns its next step"
            description="The experience begins with an identity, then adds context and utility only when an authorized relationship supports it."
            align="center"
          />

          <ol className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CUSTOMER_JOURNEY.map((step) => (
              <li key={step.number} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]">
                    <MeridianIcon name={step.icon} className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--rhc-muted)]">{step.number}</span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-[var(--rhc-heading)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">{step.description}</p>
                <p className="mt-5 border-t border-[var(--rhc-border)] pt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--rhc-primary)]">{step.outcome}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="verification" className="scroll-mt-28 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Verification, explained"
              title="Check the proof without exposing the record"
              description="A digital fingerprint can help show whether an approved record still matches its source. RHC separates that technical check from the legal meaning of the underlying record."
            />
            <div className="mt-7 flex flex-wrap gap-3">
              <Web3Button href={DEMO_VERIFICATION_HREF}>
                Open demo verifier
                <MeridianIcon name="arrow" className="h-4 w-4" />
              </Web3Button>
              <Web3Button href="/login" variant="secondary">Review my records</Web3Button>
            </div>
          </div>

          <Card className="rhc-card-token p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge tone="info">Illustrative verification</Badge>
                <p className="mt-4 text-sm text-[var(--rhc-muted)]">Sample digital fingerprint</p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-[var(--rhc-heading)]">7a9c••••••••••••••••••••••••e21f</p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-full border border-[rgba(34,197,94,.35)] bg-[rgba(34,197,94,.1)] text-[var(--rhc-success)]">
                <MeridianIcon name="check" className="h-6 w-6" />
              </span>
            </div>

            <ol className="mt-7 grid gap-3">
              {VERIFICATION_STEPS.map((step) => (
                <li key={step.number} className="flex gap-4 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--rhc-accent-soft)] font-mono text-xs font-bold text-[var(--rhc-primary)]">{step.number}</span>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--rhc-heading)]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-5 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4 text-xs leading-5 text-[var(--rhc-muted)]">
              Current demo status: internal RHC reference checks are illustrated. Production public-blockchain anchoring is not connected.
            </div>
          </Card>
        </div>
      </section>

      <section className="px-5 pb-4 md:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-[rgba(212,175,55,.35)] bg-[linear-gradient(120deg,var(--rhc-surface),var(--rhc-surface-secondary))] p-7 shadow-sm md:p-10">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="rhc-eyebrow">Find your place</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-extrabold text-[var(--rhc-heading)] md:text-4xl">Explore openly. Continue securely.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--rhc-secondary-text)]">Discover the shape of the ecosystem here, then enter the customer portal when you are ready to view authorized demo records.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Web3Button href="/marketplace">Explore RHC services</Web3Button>
              <Web3Button href="/login" variant="secondary">Ask RHC for help</Web3Button>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
