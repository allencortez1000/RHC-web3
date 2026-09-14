'use client';
import { useParams } from 'next/navigation';
import { AppShell, Badge, Card, EmptyState, ResourceStatus, Web3Button, useResource } from '@rhc/ui';
import { navFor } from '../../web3-nav';
import type { PropertyLink } from '../../components/customer-data';
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const resource = useResource<PropertyLink[]>('/me/properties');
  const property = resource.data?.find((link) => link.property.id === id)?.property;
  return <AppShell title="Property Overview" navItems={navFor('Properties')}><ResourceStatus {...resource} />{property ? <Card className="p-0"><div className="rhc-property-strip h-28" /><div className="p-6"><Badge>{property.status}</Badge><h2 className="mt-4 text-2xl font-bold">{property.property_code}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{[['Asset type', property.asset_type], ['Project', property.project?.project_name], ['Company', property.project?.company?.display_name], ['Tower', property.tower], ['Floor', property.floor], ['Unit', property.unit_number], ['Area', property.area], ['List price', property.list_price == null ? undefined : `${property.list_price} ${property.currency || ''}`]].map(([label, value]) => <div key={label} className="rounded-lg border p-4"><p className="text-sm text-[var(--rhc-muted)]">{label}</p><p className="mt-1 font-bold">{value ?? 'Not provided'}</p></div>)}</div><div className="mt-5 flex gap-3"><Web3Button href="/properties" variant="secondary">Back to properties</Web3Button><Web3Button variant="secondary">Blockchain record</Web3Button></div></div></Card> : !resource.loading && !resource.error && <EmptyState title="Property not found" description="This property is unavailable or you do not have access." />}</AppShell>;
}
