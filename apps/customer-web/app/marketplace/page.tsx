'use client';
import { useState } from 'react';
import { AppShell, Badge, Card } from '@rhc/ui';
import { navFor } from '../web3-nav';
import { DirectoryCards } from '../components/customer-data';
export default function Page() {
  const [path, setPath] = useState('/business-services');
  return <AppShell title="RHC Marketplace" navItems={navFor('RHC Marketplace')}><Card title="Marketplace Categories" className="rhc-card-token"><div className="flex flex-wrap gap-2">{[['/business-services', 'Services'], ['/companies', 'RHC Businesses'], ['/projects', 'Projects']].map(([value, label]) => <button key={value} aria-pressed={value === path} onClick={() => setPath(value)}><Badge tone={value === path ? 'gold' : 'neutral'}>{label}</Badge></button>)}</div><p className="rhc-body-copy mt-4">Explore the RHC business directory. Marketplace purchases, payments, and rewards are coming soon — Month 2.</p></Card><section id="services" className="mt-5"><DirectoryCards key={path} path={path} /></section></AppShell>;
}
