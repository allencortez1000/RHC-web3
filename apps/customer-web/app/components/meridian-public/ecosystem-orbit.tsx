'use client';

import { useState } from 'react';
import { Badge, RHCLogoMark } from '@rhc/ui';

type OrbitNode = {
  id: string;
  label: string;
  detail: string;
  status: 'Core' | 'Pilot' | 'Planned';
  position: 'top' | 'right-top' | 'right-bottom' | 'bottom' | 'left-bottom' | 'left-top';
};

const nodes: OrbitNode[] = [
  { id: 'identity', label: 'Digital ID', detail: 'One company-issued identity anchors authorized customer access.', status: 'Core', position: 'top' },
  { id: 'properties', label: 'Properties', detail: 'Explore property records, reservations, milestones, and documents.', status: 'Pilot', position: 'right-top' },
  { id: 'rewards', label: 'RHC Rewards', detail: 'Centralized demo rewards connect qualifying activity to useful benefits.', status: 'Pilot', position: 'right-bottom' },
  { id: 'verify', label: 'RHC Verify', detail: 'Check an approved record without exposing a customer directory.', status: 'Core', position: 'bottom' },
  { id: 'amica', label: 'Amica', detail: 'Property and resident-service context for the current demonstration.', status: 'Pilot', position: 'left-bottom' },
  { id: 'services', label: 'RHC Services', detail: 'Participating businesses and partner services remain governed by eligibility.', status: 'Planned', position: 'left-top' },
];

const lines = [
  ['50', '16', '75', '31'],
  ['75', '31', '75', '69'],
  ['75', '69', '50', '84'],
  ['50', '84', '25', '69'],
  ['25', '69', '25', '31'],
  ['25', '31', '50', '16'],
];

export function EcosystemOrbit() {
  const [selectedId, setSelectedId] = useState('identity');
  const selected = nodes.find((node) => node.id === selectedId) || nodes[0];

  return (
    <div className="rhc-orbit-card" aria-label="RHC ecosystem overview">
      <div className="rhc-orbit-grid" aria-hidden="true" />
      <svg className="rhc-orbit-lines" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        {lines.map(([x1, y1, x2, y2], index) => <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </svg>
      <div className="rhc-orbit-ring rhc-orbit-ring-one" aria-hidden="true" />
      <div className="rhc-orbit-ring rhc-orbit-ring-two" aria-hidden="true" />
      <div className="rhc-orbit-center">
        <RHCLogoMark size="lg" />
        <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[var(--rhc-primary)]">RHC</span>
        <span className="mt-1 block text-[10px] text-[var(--rhc-muted)]">Connected ecosystem</span>
      </div>
      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          aria-pressed={selected.id === node.id}
          onClick={() => setSelectedId(node.id)}
          className={`rhc-orbit-node rhc-orbit-node--${node.position} ${selected.id === node.id ? 'is-selected' : ''}`}
        >
          <span className="rhc-orbit-node-dot" aria-hidden="true" />
          <span className="min-w-0 text-left">
            <span className="block text-[11px] font-black uppercase tracking-[0.1em] text-[var(--rhc-heading)]">{node.label}</span>
            <span className="mt-1 block text-[10px] text-[var(--rhc-muted)]">{node.status}</span>
          </span>
        </button>
      ))}
      <div className="rhc-orbit-caption">
        <Badge tone={selected.status === 'Core' ? 'success' : selected.status === 'Pilot' ? 'gold' : 'neutral'}>{selected.status}</Badge>
        <p className="mt-2 text-sm leading-6 text-[var(--rhc-secondary-text)]">{selected.detail}</p>
      </div>
    </div>
  );
}
