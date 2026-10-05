'use client';

import { useMemo, useState } from 'react';
import { AppShell, Badge, Card, EmptyState, Web3Button } from '@rhc/ui';
import { navFor } from '../../web3-nav';
import {
  HELP_ARTICLES,
  HELP_DESTINATIONS,
  HELP_TOPICS,
  type HelpTopicKey,
} from './data';
import { MeridianIcon } from './meridian-icon';

export function MeridianHelpCenter() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<HelpTopicKey>('all');

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return HELP_ARTICLES.filter((article) => {
      const topicMatches = topic === 'all' || article.topic === topic;
      const searchable = [article.question, article.answer, ...article.keywords].join(' ').toLowerCase();
      return topicMatches && (!needle || searchable.includes(needle));
    });
  }, [query, topic]);

  const clearFilters = () => {
    setQuery('');
    setTopic('all');
  };

  return (
    <AppShell title="Help" navItems={navFor('Help')}>
      <section className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,.28)] bg-[linear-gradient(135deg,var(--rhc-surface),var(--rhc-surface-secondary))] p-6 shadow-sm md:p-8">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-[var(--rhc-accent-soft)] blur-3xl" />
        <div className="relative grid gap-7 xl:grid-cols-[1fr_330px] xl:items-end">
          <div>
            <Badge tone="gold">RHC guide</Badge>
            <h2 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-[-0.045em] text-[var(--rhc-heading)] md:text-5xl">What can we help you understand?</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--rhc-secondary-text)]">
              Search plain-language answers about your account, property journey, demonstration records, rewards, verification, and access boundaries.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
            <MeridianIcon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rhc-primary)]" />
            <p className="text-sm leading-6 text-[var(--rhc-muted)]">RHC support should never ask for your password, one-time code, private key, or seed phrase.</p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {HELP_DESTINATIONS.map((destination) => (
          <Card key={destination.title} className="flex h-full flex-col p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]">
              <MeridianIcon name={destination.icon} className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-[var(--rhc-heading)]">{destination.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[var(--rhc-muted)]">{destination.description}</p>
            <div className="mt-5">
              <Web3Button href={destination.href} variant="secondary" className="w-full">{destination.action}</Web3Button>
            </div>
          </Card>
        ))}
      </section>

      <Card className="mt-5 p-5 md:p-6" title="Search help articles">
        <label className="block text-sm font-bold text-[var(--rhc-heading)]">
          What do you need help with?
          <span className="relative mt-2 block">
            <MeridianIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--rhc-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try payment, reservation, verification, points…"
              className="w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] py-3 pl-11 pr-4 text-[var(--rhc-input-text)] outline-none"
            />
          </span>
        </label>

        <fieldset className="mt-5">
          <legend className="sr-only">Filter help articles by topic</legend>
          <div className="flex flex-wrap gap-2">
            {HELP_TOPICS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={topic === item.key}
                onClick={() => setTopic(item.key)}
                className={`rounded-full border px-3.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--rhc-primary)] ${
                  topic === item.key
                    ? 'border-[rgba(212,175,55,.5)] bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]'
                    : 'border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] text-[var(--rhc-secondary-text)] hover:text-[var(--rhc-heading)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
      </Card>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_330px]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p role="status" aria-live="polite" className="text-sm text-[var(--rhc-muted)]">
              <span className="font-bold text-[var(--rhc-heading)]">{results.length}</span> {results.length === 1 ? 'answer' : 'answers'} found
            </p>
            {(query || topic !== 'all') && (
              <button type="button" onClick={clearFilters} className="text-sm font-bold text-[var(--rhc-primary)] hover:text-[var(--rhc-primary-hover)]">Clear filters</button>
            )}
          </div>

          {results.length ? (
            <div className="grid gap-3">
              {results.map((article) => {
                const topicLabel = HELP_TOPICS.find((item) => item.key === article.topic)?.label || article.topic;
                return (
                  <details key={article.id} className="group rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] shadow-sm open:border-[rgba(212,175,55,.38)]">
                    <summary className="flex cursor-pointer list-none items-center gap-4 p-5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--rhc-primary)] [&::-webkit-details-marker]:hidden">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]">
                        <MeridianIcon name="help" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">{topicLabel}</span>
                        <span className="mt-1 block font-bold text-[var(--rhc-heading)]">{article.question}</span>
                      </span>
                      <span aria-hidden="true" className="text-xl text-[var(--rhc-primary)] transition group-open:rotate-45">+</span>
                    </summary>
                    <div className="border-t border-[var(--rhc-border)] px-5 pb-5 pt-4 sm:pl-[5.75rem]">
                      <p className="text-sm leading-7 text-[var(--rhc-secondary-text)]">{article.answer}</p>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No help article found" description="Try a broader term or clear the topic filter." />
          )}
        </div>

        <aside className="grid content-start gap-5">
          <Card className="rhc-card-token p-5" title="Demo support boundary">
            <Badge tone="warning">Not connected</Badge>
            <p className="mt-4 text-sm leading-6 text-[var(--rhc-muted)]">
              In-app support submissions are unavailable because no support endpoint or case-management integration is connected in this demonstration.
            </p>
            <p className="mt-4 text-sm leading-6 text-[var(--rhc-secondary-text)]">
              For a real account concern, use an existing verified RHC contact channel. Do not include credentials or sensitive identity documents in an unverified message.
            </p>
          </Card>

          <Card className="p-5" title="Before reporting an issue">
            <ol className="grid gap-3 text-sm text-[var(--rhc-muted)]">
              <li className="flex gap-3"><span className="font-mono font-bold text-[var(--rhc-primary)]">01</span><span>Note the page and action that produced the issue.</span></li>
              <li className="flex gap-3"><span className="font-mono font-bold text-[var(--rhc-primary)]">02</span><span>Record the non-sensitive reference shown on screen.</span></li>
              <li className="flex gap-3"><span className="font-mono font-bold text-[var(--rhc-primary)]">03</span><span>Never send a password, code, private key, or seed phrase.</span></li>
            </ol>
          </Card>
        </aside>
      </section>
    </AppShell>
  );
}
