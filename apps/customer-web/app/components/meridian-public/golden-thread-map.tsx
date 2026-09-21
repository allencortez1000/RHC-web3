'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Badge, EmptyState, Web3Button } from '@rhc/ui';
import { MeridianIcon } from './meridian-icon';
import type { MeridianIconName } from './data';
import {
  entryKindLabels, entryStatus, filterDirectory, graphWithContext,
  type DirectoryEntry, type DirectoryFilters, type DirectoryGraph, type EntryKind,
} from './ecosystem-directory';

const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rhc-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rhc-surface)]';
const inputClass = `mt-2 w-full min-w-0 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)] ${focusClass}`;
const icons: Record<EntryKind, MeridianIconName> = { company: 'building', project: 'construction', property: 'home', service: 'nodes' };
const initialFilters: DirectoryFilters = { query: '', kind: 'all', companyId: '', availability: 'all' };

export function GoldenThreadDirectory({ graph, demo }: { graph: DirectoryGraph; demo: boolean }) {
  const [filters, setFilters] = useState(initialFilters);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selectedId, setSelectedId] = useState<string>();
  const detailsRef = useRef<HTMLElement>(null);
  const results = useMemo(() => filterDirectory(graph, filters), [graph, filters]);
  const visibleGraph = useMemo(() => graphWithContext(graph, results), [graph, results]);
  const matchIds = useMemo(() => new Set(results.map((entry) => entry.id)), [results]);
  const selected = results.find((entry) => entry.id === selectedId) || results[0];
  // Keep the next selection inside the filtered results without moving keyboard focus.
  useEffect(() => { setSelectedId(selected?.id); }, [selected?.id]);
  const companies = graph.entries.filter((entry) => entry.kind === 'company');
  const byId = new Map(graph.entries.map((entry) => [entry.id, entry]));
  const relatedEdges = selected ? graph.edges.filter((edge) => edge.from === selected.id || edge.to === selected.id) : [];
  const company = selected?.companyId ? byId.get(`company:${selected.companyId}`) : undefined;
  const update = (patch: Partial<DirectoryFilters>) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <section aria-label="Golden Thread directory" className="mt-6 min-w-0">
      <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 md:p-6">
        <h2 className="text-xl font-extrabold text-[var(--rhc-heading)]">Find a connection</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-bold text-[var(--rhc-heading)] sm:col-span-2 xl:col-span-4">
            Search company, property, or service
            <input type="search" value={filters.query} onChange={(event) => update({ query: event.target.value })}
              placeholder="Try a company name, project, water, or a property code" className={inputClass} />
          </label>
          <label className="min-w-0 text-sm font-bold text-[var(--rhc-heading)]">
            Entry type
            <select value={filters.kind} onChange={(event) => update({ kind: event.target.value as DirectoryFilters['kind'] })} className={inputClass}>
              <option value="all">All entry types</option>
              {Object.entries(entryKindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm font-bold text-[var(--rhc-heading)]">
            Company
            <select value={filters.companyId} onChange={(event) => update({ companyId: event.target.value })} className={inputClass}>
              <option value="">All companies</option>
              {companies.map((entry) => <option key={entry.id} value={entry.sourceId}>{entry.name}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm font-bold text-[var(--rhc-heading)]">
            Service availability
            <select value={filters.availability} onChange={(event) => update({ availability: event.target.value })} className={inputClass} aria-describedby="availability-help">
              <option value="all">All entries / stages</option>
              <option value="ACTIVE">{demo ? 'Active demo previews only' : 'Listed active services only'}</option>
              <option value="PREPARED">Prepared services only</option>
              <option value="COMING_SOON">Coming-soon services only</option>
            </select>
          </label>
          <div className="flex items-end"><Web3Button variant="secondary" onClick={() => setFilters(initialFilters)}>Clear filters</Web3Button></div>
        </div>
        <p id="availability-help" className="mt-3 text-xs leading-5 text-[var(--rhc-muted)]">Choosing a service stage narrows results to services. Company preparedness is a separate integration record, not customer access or partner activation.</p>
      </div>

      <div className="my-5 flex flex-wrap items-center justify-between gap-4">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-[var(--rhc-secondary-text)]">
          {results.length} matching {results.length === 1 ? 'entry' : 'entries'} in loaded records.
          {selected ? ` Selected: ${selected.name}.` : ' No entry selected.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Directory view" className="inline-flex rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-1">
            {(['map', 'list'] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)}
                className={`min-h-11 rounded-lg px-4 text-sm font-bold ${focusClass} ${view === mode ? 'bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]' : 'text-[var(--rhc-secondary-text)]'}`}>
                {mode === 'map' ? 'Connected map' : 'List view'}
              </button>
            ))}
          </div>
          {selected ? <button type="button" onClick={() => detailsRef.current?.focus()} className={`min-h-11 rounded-lg px-2 text-sm font-bold text-[var(--rhc-primary)] underline underline-offset-4 ${focusClass}`}>Jump to selected details</button> : null}
        </div>
      </div>

      {!results.length ? <EmptyState title="No matching directory entries" description="Try a different search, company, entry type, or service stage. Clear filters to return to the loaded directory." /> : (
        <>
          {view === 'map' ? (
            <section aria-labelledby="connected-map-title" aria-describedby="map-instructions" className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4 md:p-6">
              <h2 id="connected-map-title" className="text-xl font-extrabold text-[var(--rhc-heading)]">Golden Thread connected map</h2>
              <p id="map-instructions" className="mt-2 max-w-4xl text-sm leading-6 text-[var(--rhc-muted)]">Follow the labeled gold branches. Tab to an entry, then press Enter or Space to select it. Context-only ancestors explain a filtered connection and are not additional matches. This map does not require dragging, zooming, or motion.</p>
              <a href="#relationship-text" className={`mt-3 inline-block rounded text-sm font-bold text-[var(--rhc-primary)] underline underline-offset-4 ${focusClass}`}>Read relationships as text</a>
              <div className="mt-5 grid gap-6">
                {visibleGraph.entries.filter((entry) => !entry.parentId).map((entry) => (
                  <MapBranch key={entry.id} entry={entry} graph={visibleGraph} matchIds={matchIds} selectedId={selected?.id} onSelect={setSelectedId} demo={demo} />
                ))}
              </div>
            </section>
          ) : (
            <section aria-label="Directory list" className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 md:p-6">
              <h2 className="text-xl font-extrabold text-[var(--rhc-heading)]">Directory list</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {results.map((entry) => (
                  <li key={entry.id} className="min-w-0"><EntryButton entry={entry} selected={selected?.id === entry.id} onSelect={setSelectedId} demo={demo} />
                    <p className="mt-2 px-2 text-xs leading-5 text-[var(--rhc-muted)]">{entry.parentId ? `Linked from ${byId.get(entry.parentId)?.name}.` : entry.kind === 'company' ? 'Company directory entry.' : 'Parent relationship not present in loaded records.'}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selected ? (
            <section id="selected-entry-details" ref={detailsRef} tabIndex={-1} aria-labelledby="selected-entry-title" className={`mt-5 scroll-mt-24 rounded-2xl border border-[var(--rhc-primary)] bg-[var(--rhc-surface)] p-5 md:p-6 ${focusClass}`}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="min-w-0">
                  <Badge tone={demo ? 'gold' : 'neutral'}>{demo ? 'Demo preview · synthetic records' : 'Directory record · information only'}</Badge>
                  <p className="rhc-eyebrow mt-4">Selected {entryKindLabels[selected.kind].toLowerCase()}</p>
                  <h2 id="selected-entry-title" className="mt-2 break-words text-2xl font-extrabold text-[var(--rhc-heading)]">{selected.name}</h2>
                  <p className="mt-2 break-all font-mono text-xs text-[var(--rhc-muted)]">{selected.code}</p>
                  <p className="mt-4 text-sm leading-6 text-[var(--rhc-secondary-text)]">{selected.description}</p>
                  <p className="mt-4 text-sm font-bold text-[var(--rhc-heading)]">{entryStatus(selected, demo)}</p>
                  {company && selected.kind !== 'company' ? <p className="mt-2 text-sm text-[var(--rhc-secondary-text)]">{company.name} — {entryStatus(company, demo)}</p> : null}
                  <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">{demo ? 'All statuses are synthetic. No external company integration, provider dispatch, purchase, or real inventory is activated here.' : 'A directory status is not confirmation of service access, available inventory, or a live provider connection.'} Company membership does not establish property eligibility.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Web3Button href={selected.href} variant="secondary">{selected.action}</Web3Button>
                    {demo && selected.kind === 'service' ? <Web3Button href="#demo-service-requests" variant="tertiary">Preview local request workflow</Web3Button> : null}
                    <Web3Button href="/help" variant="tertiary">Help and access boundaries</Web3Button>
                  </div>
                </div>
                <div className="min-w-0">
                  <dl className="grid gap-3">
                    {selected.facts.map((fact) => <div key={fact.label} className="rounded-xl bg-[var(--rhc-surface-secondary)] p-3"><dt className="text-xs font-bold text-[var(--rhc-muted)]">{fact.label}</dt><dd className="mt-1 break-words text-sm text-[var(--rhc-heading)]">{fact.value}</dd></div>)}
                    {selected.kind === 'service' ? <div className="rounded-xl bg-[var(--rhc-surface-secondary)] p-3"><dt className="text-xs font-bold text-[var(--rhc-muted)]">Specific property assignment</dt><dd className="mt-1 text-sm text-[var(--rhc-heading)]">Not supplied by this directory. Property or residency requirements are not an eligibility decision.</dd></div> : null}
                  </dl>
                  <h3 className="mt-5 font-bold text-[var(--rhc-heading)]">Recorded relationships</h3>
                  {relatedEdges.length ? <ul className="mt-2 grid gap-2 text-sm leading-6 text-[var(--rhc-secondary-text)]">{relatedEdges.map((edge) => {
                    const other = byId.get(edge.from === selected.id ? edge.to : edge.from)!;
                    return <li key={`${edge.from}-${edge.to}`}>{byId.get(edge.from)?.name} → {edge.label.toLowerCase()} → {byId.get(edge.to)?.name}.
                      {matchIds.has(other.id) ? <button type="button" onClick={() => setSelectedId(other.id)} className={`ml-2 rounded font-bold text-[var(--rhc-primary)] underline ${focusClass}`}>Select {other.name}</button> : <span className="ml-1 text-[var(--rhc-muted)]">Outside current filters.</span>}
                    </li>;
                  })}</ul> : <p className="mt-2 text-sm text-[var(--rhc-muted)]">No relationship is present in the loaded records. This is not proof that none exists.</p>}
                </div>
              </div>
            </section>
          ) : null}

          <section id="relationship-text" tabIndex={-1} aria-labelledby="relationship-text-title" className={`mt-5 scroll-mt-24 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 md:p-6 ${focusClass}`}>
            <h2 id="relationship-text-title" className="text-lg font-extrabold text-[var(--rhc-heading)]">Textual alternative: current relationships</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">The same connections as the filtered map, including context-only ancestors. Lines mean directory relationships, not ownership, consent, service entitlement, or live integrations.</p>
            {visibleGraph.edges.length ? <ul className="mt-4 grid gap-2 text-sm leading-6 text-[var(--rhc-secondary-text)]">{visibleGraph.edges.map((edge) => <li key={`${edge.from}-${edge.to}`}><strong>{byId.get(edge.from)?.name}</strong> — {edge.label.toLowerCase()} — <strong>{byId.get(edge.to)?.name}</strong>.</li>)}</ul> : <p className="mt-3 text-sm text-[var(--rhc-muted)]">No connections are present for the current results in loaded records.</p>}
            {visibleGraph.entries.filter((entry) => !visibleGraph.edges.some((edge) => edge.from === entry.id || edge.to === entry.id)).map((entry) => <p key={entry.id} className="mt-2 text-sm text-[var(--rhc-muted)]">{entry.name}: standalone entry; no relationship in loaded records.</p>)}
          </section>
        </>
      )}
    </section>
  );
}

function EntryButton({ entry, selected, onSelect, demo }: { entry: DirectoryEntry; selected: boolean; onSelect: (id: string) => void; demo: boolean }) {
  return (
    <button type="button" aria-label={`Select ${entryKindLabels[entry.kind].toLowerCase()}: ${entry.name}`} aria-pressed={selected} aria-controls="selected-entry-details" onClick={() => onSelect(entry.id)}
      className={`block w-full min-w-0 rounded-xl border p-4 text-left ${focusClass} ${selected ? 'border-[var(--rhc-primary)] bg-[var(--rhc-accent-soft)]' : 'border-[var(--rhc-border)] bg-[var(--rhc-surface)] hover:border-[var(--rhc-primary)]'}`}>
      <span className="flex items-start gap-3">
        <MeridianIcon name={icons[entry.kind]} className="mt-1 h-5 w-5 shrink-0 text-[var(--rhc-primary)]" />
        <span className="min-w-0">
          <span className="block text-xs font-bold text-[var(--rhc-muted)]">{entryKindLabels[entry.kind]}{selected ? ' · Selected' : ''}</span>
          <span className="mt-1 block break-words font-bold text-[var(--rhc-heading)]">{entry.name}</span>
          <span className="mt-2 block text-xs leading-5 text-[var(--rhc-secondary-text)]">{entryStatus(entry, demo)}</span>
        </span>
      </span>
    </button>
  );
}

function MapBranch({ entry, graph, matchIds, selectedId, onSelect, demo }: {
  entry: DirectoryEntry; graph: DirectoryGraph; matchIds: Set<string>; selectedId?: string; onSelect: (id: string) => void; demo: boolean;
}) {
  const children = graph.edges.filter((edge) => edge.from === entry.id);
  const node: ReactNode = matchIds.has(entry.id)
    ? <EntryButton entry={entry} selected={selectedId === entry.id} onSelect={onSelect} demo={demo} />
    : <div className="rounded-xl border border-dashed border-[var(--rhc-border-secondary)] bg-[var(--rhc-surface)] p-4"><p className="text-xs font-bold text-[var(--rhc-muted)]">{entryKindLabels[entry.kind]} · Context only</p><p className="mt-1 break-words font-bold text-[var(--rhc-heading)]">{entry.name}</p></div>;
  return (
    <div className={`min-w-0 ${entry.kind === 'company' && children.length ? 'grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : ''}`}>
      <div className="min-w-0">{node}{!entry.parentId && entry.kind !== 'company' ? <p className="mt-2 text-xs text-[var(--rhc-muted)]">Parent record not loaded; no connection inferred.</p> : null}</div>
      {children.length ? <ul className="ml-3 mt-3 grid min-w-0 gap-3 border-l-2 border-[var(--rhc-primary)] pl-4 lg:mt-0">{children.map((edge) => {
        const child = graph.entries.find((candidate) => candidate.id === edge.to)!;
        return <li key={edge.to} className="relative min-w-0"><span aria-hidden="true" className="absolute -left-4 top-3 w-4 border-t-2 border-[var(--rhc-primary)]" /><p className="mb-2 text-xs font-bold text-[var(--rhc-primary)]">{edge.label}</p><MapBranch entry={child} graph={graph} matchIds={matchIds} selectedId={selectedId} onSelect={onSelect} demo={demo} /></li>;
      })}</ul> : null}
    </div>
  );
}
