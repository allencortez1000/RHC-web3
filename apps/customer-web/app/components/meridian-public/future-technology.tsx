'use client';

import Image from 'next/image';
import { useState } from 'react';
import { AppShell, Badge, Card, Web3Button } from '@rhc/ui';
import { navFor } from '../../web3-nav';
import {
  TECHNOLOGY_PHASES,
  TECHNOLOGY_PRINCIPLES,
  TECHNOLOGY_RESTRICTIONS,
  type TechnologyPhase,
} from './data';
import { MeridianIcon } from './meridian-icon';
import { CustomerWeb3Preview } from '../web3-preview';

export function MeridianFutureTechnology() {
  const [activePhaseId, setActivePhaseId] = useState<TechnologyPhase['id']>('foundation');
  const activePhase = TECHNOLOGY_PHASES.find((phase) => phase.id === activePhaseId) || TECHNOLOGY_PHASES[0];

  return (
    <AppShell title="Future Technology" navItems={navFor('Future Technology')}>
      <section className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,.28)] bg-[linear-gradient(135deg,var(--rhc-surface),var(--rhc-surface-secondary))] p-6 shadow-sm md:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 [background-image:linear-gradient(var(--rhc-border)_1px,transparent_1px),linear-gradient(90deg,var(--rhc-border)_1px,transparent_1px)] [background-size:46px_46px]"
        />
        <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--rhc-accent-soft)] blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_390px] xl:items-end">
          <div>
            <Badge tone="gold">Governed technology path</Badge>
            <h2 className="mt-5 max-w-5xl text-4xl font-extrabold tracking-[-0.05em] text-[var(--rhc-heading)] md:text-5xl">Build trust first. Add technology only where it earns its place.</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--rhc-secondary-text)]">
              RHC starts with useful customer infrastructure. Verification, company integrations, and any digital-asset decision remain separate stages with their own approval gates.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Web3Button href="/white-paper">Read the white paper</Web3Button>
              <Web3Button href="/dashboard" variant="secondary">Return to dashboard</Web3Button>
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(245,158,11,.35)] bg-[rgba(245,158,11,.08)] p-5">
            <div className="flex items-center gap-3">
              <MeridianIcon name="lock" className="h-5 w-5 shrink-0 text-[var(--rhc-warning)]" />
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-warning)]">Current restriction</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--rhc-secondary-text)]">
              Wallet custody, token issuance, public blockchain transactions, crypto payments, exchange, staking, and tokenized ownership are not active or authorized in this demo.
            </p>
          </div>
        </div>
      </section>

      <CustomerWeb3Preview />

      <section aria-labelledby="technology-state-title" className="mt-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="rhc-eyebrow">Current system state</p>
            <h2 id="technology-state-title" className="mt-1 text-2xl font-extrabold text-[var(--rhc-heading)]">Explicitly inactive means inactive</h2>
          </div>
          <p className="text-xs text-[var(--rhc-muted)]">No financial or blockchain action is available on this page</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {TECHNOLOGY_RESTRICTIONS.map((restriction) => (
            <Card key={restriction.title} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--rhc-surface-secondary)] text-[var(--rhc-primary)]">
                  <MeridianIcon name={restriction.icon} className="h-5 w-5" />
                </span>
                <Badge tone="warning">{restriction.state}</Badge>
              </div>
              <h3 className="mt-4 font-extrabold text-[var(--rhc-heading)]">{restriction.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{restriction.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="roadmap-title" className="mt-7 grid gap-5 xl:grid-cols-[390px_1fr]">
        <Card className="p-5 md:p-6">
          <p className="rhc-eyebrow">Explore the staged roadmap</p>
          <h2 id="roadmap-title" className="mt-2 text-2xl font-extrabold text-[var(--rhc-heading)]">Choose a decision stage</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">This roadmap communicates sequencing and gates. It is not a launch promise.</p>

          <div className="mt-6 grid gap-2" role="tablist" aria-label="Technology roadmap phases" aria-orientation="vertical">
            {TECHNOLOGY_PHASES.map((phase, index) => {
              const selected = phase.id === activePhase.id;
              return (
                <button
                  key={phase.id}
                  id={`phase-tab-${phase.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="technology-phase-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActivePhaseId(phase.id)}
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === 'ArrowDown') next = (index + 1) % TECHNOLOGY_PHASES.length;
                    else if (event.key === 'ArrowUp') next = (index - 1 + TECHNOLOGY_PHASES.length) % TECHNOLOGY_PHASES.length;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = TECHNOLOGY_PHASES.length - 1;
                    else return;
                    event.preventDefault();
                    const nextPhase = TECHNOLOGY_PHASES[next];
                    setActivePhaseId(nextPhase.id);
                    document.getElementById(`phase-tab-${nextPhase.id}`)?.focus();
                  }}
                  className={`flex items-center gap-4 rounded-xl border p-3 text-left focus:outline-none focus:ring-2 focus:ring-[var(--rhc-primary)] ${
                    selected
                      ? 'border-[rgba(212,175,55,.45)] bg-[var(--rhc-accent-soft)]'
                      : 'border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] hover:border-[var(--rhc-border-secondary)]'
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-xs font-bold ${selected ? 'bg-[var(--rhc-primary)] text-[#07111f]' : 'bg-[var(--rhc-surface)] text-[var(--rhc-muted)]'}`}>{phase.number}</span>
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">{phase.horizon}</span>
                    <span className="mt-0.5 block text-sm font-bold text-[var(--rhc-heading)]">{phase.title}</span>
                  </span>
                  <MeridianIcon name="arrow" className={`ml-auto h-4 w-4 shrink-0 ${selected ? 'text-[var(--rhc-primary)]' : 'text-[var(--rhc-muted)]'}`} />
                </button>
              );
            })}
          </div>
        </Card>

        <article
          id="technology-phase-panel"
          role="tabpanel"
          aria-labelledby={`phase-tab-${activePhase.id}`}
          tabIndex={0}
          className="rounded-2xl border border-[rgba(212,175,55,.32)] bg-[linear-gradient(135deg,var(--rhc-surface),var(--rhc-surface-secondary))] p-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--rhc-primary)] md:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="rhc-eyebrow">Phase {activePhase.number} · {activePhase.horizon}</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[var(--rhc-heading)] md:text-4xl">{activePhase.title}</h2>
            </div>
            <Badge tone={activePhase.id === 'foundation' ? 'gold' : 'neutral'}>{activePhase.status}</Badge>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--rhc-secondary-text)]">{activePhase.description}</p>

          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5">
              <h3 className="flex items-center gap-2 font-bold text-[var(--rhc-heading)]">
                <MeridianIcon name="spark" className="h-5 w-5 text-[var(--rhc-primary)]" />
                Intended outcomes
              </h3>
              <ul className="mt-4 grid gap-3">
                {activePhase.delivers.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--rhc-muted)]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rhc-primary)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5">
              <h3 className="flex items-center gap-2 font-bold text-[var(--rhc-heading)]">
                <MeridianIcon name="shield" className="h-5 w-5 text-[var(--rhc-primary)]" />
                Required gates
              </h3>
              <ul className="mt-4 grid gap-3">
                {activePhase.gates.map((gate) => (
                  <li key={gate} className="flex gap-3 text-sm leading-6 text-[var(--rhc-muted)]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rhc-muted)]" />
                    <span>{gate}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </section>

      <section id="future-token" aria-labelledby="future-token-title" className="mt-7 scroll-mt-24 overflow-hidden rounded-2xl border border-[rgba(212,175,55,.32)] bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,.16),transparent_34%),linear-gradient(135deg,var(--rhc-surface),var(--rhc-surface-secondary))] p-6 shadow-sm md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_460px] xl:items-center">
          <div>
            <Badge tone="warning">Concept artwork · Not activated</Badge>
            <p className="rhc-eyebrow mt-5">Future token design</p>
            <h2 id="future-token-title" className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--rhc-heading)] md:text-4xl">RHC token design belongs in the governed roadmap.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--rhc-secondary-text)]">
              The visual design is preserved here as future-facing brand and product exploration. It does not represent an issued asset, wallet balance, investment offer, ownership claim, exchange listing, or payment capability.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {['No public issuance', 'No wallet custody', 'No exchange or staking'].map((item) => (
                <div key={item} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--rhc-muted)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[320px] rounded-2xl border border-[rgba(212,175,55,.28)] bg-[rgba(7,17,31,.72)] p-6 shadow-inner">
            <div aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:linear-gradient(var(--rhc-border)_1px,transparent_1px),linear-gradient(90deg,var(--rhc-border)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative grid min-h-[268px] place-items-center">
              <Image src="/images/rhc-token-back.png" alt="Back side of the inactive RHC token concept artwork" width={270} height={270} className="absolute right-1 top-2 w-48 rotate-6 opacity-80 drop-shadow-2xl sm:w-56" />
              <Image src="/images/rhc-token-front.png" alt="Front side of the inactive RHC token concept artwork" width={310} height={310} priority className="relative z-10 w-60 -rotate-6 drop-shadow-2xl sm:w-72" />
            </div>
            <p className="relative mt-3 rounded-xl border border-[rgba(245,158,11,.35)] bg-[rgba(245,158,11,.10)] p-3 text-xs leading-5 text-[var(--rhc-secondary-text)]">
              Displayed for design continuity only. Activation would require separate legal, compliance, security, treasury, custody, provider, and launch approvals.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-3">
        {TECHNOLOGY_PRINCIPLES.map((principle, index) => (
          <Card key={principle.title} className="p-5 md:p-6">
            <span className="font-mono text-xs font-bold text-[var(--rhc-primary)]">0{index + 1}</span>
            <h2 className="mt-4 text-xl font-extrabold text-[var(--rhc-heading)]">{principle.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">{principle.description}</p>
          </Card>
        ))}
      </section>

      <Card className="rhc-card-token mt-7 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="rhc-eyebrow">The governing test</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[var(--rhc-heading)]">Does this technology make the customer journey more trustworthy or useful?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--rhc-muted)]">If the answer is unclear—or if a centralized, reversible system solves the need more safely—the feature should not advance merely because it can be called Web3.</p>
          </div>
          <Web3Button href="/white-paper" variant="secondary">Review governance detail</Web3Button>
        </div>
      </Card>
    </AppShell>
  );
}
