import type { ResourceState } from '@rhc/ui';

export function resourceMetric<T>(resource: ResourceState<T>, format: (data: T) => string): string {
  if (resource.unavailable || resource.error) return 'Unavailable';
  if (resource.loading) return 'Loading…';
  if (resource.data == null) return 'Unavailable';
  return format(resource.data);
}
