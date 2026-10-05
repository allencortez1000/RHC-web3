import type { DemoCompany, DemoProject, DemoProperty } from '@rhc/types';

// The API returns company codes in nested references; demo records also include IDs.
// Names are display text, never join keys. No service-to-property assignment is inferred.
type CompanyReference = { id?: string; company_code?: string; display_name?: string };
export type DirectoryCompany = Pick<DemoCompany, 'id' | 'company_code' | 'display_name' | 'status' | 'integration_status'> &
  Partial<Pick<DemoCompany, 'legal_name' | 'description' | 'business_type'>>;
export type DirectoryProject = Pick<DemoProject, 'id' | 'project_code' | 'project_name' | 'status'> &
  Partial<Pick<DemoProject, 'company_id' | 'description' | 'location'>> & { company?: CompanyReference };
export type DirectoryProperty = Pick<DemoProperty, 'id' | 'property_code' | 'status' | 'asset_type'> &
  Partial<Pick<DemoProperty, 'project_id' | 'tower' | 'floor' | 'unit_number' | 'area'>> & {
    project?: { id?: string; project_code?: string; project_name?: string; company?: CompanyReference };
  };
export type DirectoryService = {
  id: string;
  company_id?: string;
  company?: CompanyReference;
  service_code?: string;
  service_name: string;
  service_type?: string;
  description?: string;
  status: string;
  integration_status?: string;
  requires_property?: boolean;
  requires_resident_status?: boolean;
};
export type EntryKind = 'company' | 'project' | 'property' | 'service';
export type DirectoryEntry = {
  id: string;
  sourceId: string;
  kind: EntryKind;
  name: string;
  code: string;
  description: string;
  companyId?: string;
  parentId?: string;
  status: string;
  preparedness?: string;
  facts: Array<{ label: string; value: string }>;
  href: string;
  action: string;
};
export type DirectoryEdge = { from: string; to: string; label: string };
export type DirectoryGraph = { entries: DirectoryEntry[]; edges: DirectoryEdge[] };
export type DirectoryFilters = { query: string; kind: 'all' | EntryKind; companyId: string; availability: string };

export const entryKindLabels: Record<EntryKind, string> = {
  company: 'Company', project: 'Property project', property: 'Property record', service: 'Service',
};
export function statusLabel(value?: string) {
  return value ? value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : 'Not reported';
}
export function entryStatus(entry: DirectoryEntry, demo: boolean) {
  if (entry.kind === 'company') return `Company preparedness: ${statusLabel(entry.preparedness)}`;
  if (entry.kind === 'service') {
    const availability = entry.status === 'ACTIVE'
      ? demo ? 'Demo preview only' : 'Listed active · access not confirmed'
      : entry.status === 'PREPARED' ? 'Prepared · not available'
        : entry.status === 'COMING_SOON' ? 'Coming soon · not available' : `${statusLabel(entry.status)} · access not confirmed`;
    return `Service availability: ${availability}`;
  }
  return demo ? 'Synthetic property context · not real inventory' : 'Directory property context · not an offer';
}

export function buildDirectoryGraph(
  companies: DirectoryCompany[], projects: DirectoryProject[], properties: DirectoryProperty[], services: DirectoryService[],
): DirectoryGraph {
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const companyByCode = new Map(companies.map((company) => [company.company_code, company]));
  function resolveCompany(id?: string, reference?: CompanyReference) {
    // An explicit foreign key takes precedence, even when its record is not loaded.
    if (id || reference?.id) return companyById.get(id || reference?.id || '');
    return reference?.company_code ? companyByCode.get(reference.company_code) : undefined;
  }
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const projectByCode = new Map(projects.map((project) => [project.project_code, project]));
  const entries: DirectoryEntry[] = companies.map((company) => ({
    id: `company:${company.id}`, sourceId: company.id, kind: 'company', name: company.display_name,
    code: company.company_code, description: company.description || 'No company description has been published.',
    companyId: company.id, status: company.status, preparedness: company.integration_status,
    facts: [
      { label: 'Company record status', value: statusLabel(company.status) },
      { label: 'Business type', value: statusLabel(company.business_type) },
      ...(company.legal_name ? [{ label: 'Legal name', value: company.legal_name }] : []),
    ],
    href: '/marketplace', action: 'Explore service concepts',
  }));
  for (const project of projects) {
    const company = resolveCompany(project.company_id, project.company);
    entries.push({
      id: `project:${project.id}`, sourceId: project.id, kind: 'project', name: project.project_name,
      code: project.project_code, description: project.description || 'Property project listed in the directory.',
      companyId: company?.id, parentId: company ? `company:${company.id}` : undefined, status: project.status,
      facts: [
        { label: 'Project record status', value: statusLabel(project.status) },
        { label: 'Location', value: project.location || 'Not reported' },
      ],
      href: '/properties', action: 'Browse property records',
    });
  }
  for (const property of properties) {
    const projectId = property.project_id || property.project?.id;
    const project = projectId ? projectById.get(projectId)
      : property.project?.project_code ? projectByCode.get(property.project.project_code) : undefined;
    const company = project ? resolveCompany(project.company_id, project.company)
      : resolveCompany(undefined, property.project?.company);
    entries.push({
      id: `property:${property.id}`, sourceId: property.id, kind: 'property', name: property.property_code,
      code: property.property_code, description: 'A property record provides project context, not proof of ownership or service eligibility.',
      companyId: company?.id, parentId: project ? `project:${project.id}` : undefined, status: property.status,
      facts: [
        { label: 'Property type', value: statusLabel(property.asset_type) },
        { label: 'Project', value: project?.project_name || property.project?.project_name || 'Not reported' },
        { label: 'Tower / floor / unit', value: [property.tower, property.floor, property.unit_number].filter(Boolean).join(' / ') || 'Not reported' },
        ...(property.area ? [{ label: 'Recorded area (m²)', value: property.area }] : []),
      ],
      // The public detail endpoint only guarantees access to AVAILABLE records.
      href: property.status === 'AVAILABLE' ? `/properties/${encodeURIComponent(property.id)}` : '/properties',
      action: property.status === 'AVAILABLE' ? 'View property record' : 'Browse property records',
    });
  }
  for (const service of services) {
    const company = resolveCompany(service.company_id, service.company);
    const requirement = (value?: boolean) => value === undefined ? 'Not reported; confirm with the company' : value ? 'Required; authorization still needed' : 'Not required by this directory record';
    entries.push({
      id: `service:${service.id}`, sourceId: service.id, kind: 'service', name: service.service_name,
      code: service.service_code || service.id, description: service.description || 'No service description has been published.',
      companyId: company?.id, parentId: company ? `company:${company.id}` : undefined, status: service.status,
      facts: [
        { label: 'Service type', value: statusLabel(service.service_type) },
        { label: 'Service integration record', value: statusLabel(service.integration_status) },
        { label: 'Property context', value: requirement(service.requires_property) },
        { label: 'Resident context', value: requirement(service.requires_resident_status) },
      ],
      href: '/marketplace', action: 'Read service concepts and boundaries',
    });
  }
  const edges = entries.flatMap((entry) => entry.parentId ? [{
    from: entry.parentId, to: entry.id,
    label: entry.kind === 'project' ? 'Company lists project' : entry.kind === 'property' ? 'Project contains property record' : 'Company lists service',
  }] : []);
  return { entries, edges };
}

export function filterDirectory(graph: DirectoryGraph, filters: DirectoryFilters) {
  const needle = filters.query.trim().toLowerCase();
  const byId = new Map(graph.entries.map((entry) => [entry.id, entry]));
  return graph.entries.filter((entry) => {
    if (filters.kind !== 'all' && entry.kind !== filters.kind) return false;
    if (filters.companyId && entry.companyId !== filters.companyId) return false;
    if (filters.availability !== 'all' && (entry.kind !== 'service' || entry.status !== filters.availability)) return false;
    const ancestors: string[] = [];
    let parent = entry.parentId ? byId.get(entry.parentId) : undefined;
    while (parent) {
      ancestors.push(parent.name, parent.code);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return !needle || [entry.name, entry.code, entry.description, entryKindLabels[entry.kind], ...ancestors, ...entry.facts.map((fact) => fact.value)]
      .join(' ').toLowerCase().includes(needle);
  });
}

export function graphWithContext(graph: DirectoryGraph, matches: DirectoryEntry[]): DirectoryGraph {
  const byId = new Map(graph.entries.map((entry) => [entry.id, entry]));
  const included = new Set(matches.map((entry) => entry.id));
  for (const entry of matches) {
    let parent = entry.parentId ? byId.get(entry.parentId) : undefined;
    while (parent) {
      included.add(parent.id);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
  }
  return {
    entries: graph.entries.filter((entry) => included.has(entry.id)),
    edges: graph.edges.filter((edge) => included.has(edge.from) && included.has(edge.to)),
  };
}
