import { test, expect } from './offline-test';
import { CapabilityRequestCoordinator, MutationIntentCoordinator } from '../app/capability-request-coordinator';
import {
  globalScope,
  grantCoversTarget,
  hasRequiredMutationGrants,
  requiredMutationPermissions,
  targetForResource,
  type AdminCapabilities,
} from '../app/capability-scopes';

test('older success cannot restore authority after newer denial', () => {
  const coordinator = new CapabilityRequestCoordinator<{ role: string }>();
  const oldRequest = coordinator.begin();
  const newRequest = coordinator.begin();

  coordinator.commitError(newRequest, 'denied');
  expect(coordinator.commitSuccess(oldRequest, { role: 'old-authority' })).toBeNull();
  expect(coordinator.snapshot()).toMatchObject({ error: 'denied', loading: false });
});

test('older success cannot restore authority after newer error', () => {
  const coordinator = new CapabilityRequestCoordinator<{ role: string }>();
  const oldRequest = coordinator.begin();
  const newRequest = coordinator.begin();

  coordinator.commitError(newRequest, 'capability service unavailable');
  expect(coordinator.commitSuccess(oldRequest, { role: 'old-authority' })).toBeNull();
  expect(coordinator.snapshot()).toMatchObject({ error: 'capability service unavailable', loading: false });
});

test('an explicit refresh supersedes a pending effect request', () => {
  const coordinator = new CapabilityRequestCoordinator<{ role: string }>();
  const effectRequest = coordinator.begin();
  const refreshRequest = coordinator.begin();

  expect(coordinator.isCurrent(effectRequest)).toBe(false);
  expect(coordinator.isCurrent(refreshRequest)).toBe(true);
  expect(coordinator.commitSuccess(refreshRequest, { role: 'current-authority' })).toMatchObject({
    data: { role: 'current-authority' },
    loading: false,
  });
  expect(coordinator.commitSuccess(effectRequest, { role: 'stale-authority' })).toBeNull();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

for (const newer of ['pending', 'denial', 'error', 'invalidation'] as const) {
  test(`delayed preflight cannot return stale authority after newer ${newer}`, async () => {
    const coordinator = new CapabilityRequestCoordinator<{ allowed: boolean }>();
    const response = deferred<{ allowed: boolean }>();
    const requestId = coordinator.begin();
    const authority = response.promise.then((data) =>
      coordinator.commitSuccess(requestId, data) ? data : null,
    );
    if (newer === 'invalidation') coordinator.invalidate();
    else {
      const next = coordinator.begin();
      if (newer === 'denial') coordinator.commitSuccess(next, { allowed: false });
      if (newer === 'error') coordinator.commitError(next, 'unavailable');
    }
    response.resolve({ allowed: true });
    expect(await authority).toBeNull();
    expect(coordinator.isCurrent(requestId)).toBe(false);
  });
}

test('an older error cannot poison newer capability authority', () => {
  const coordinator = new CapabilityRequestCoordinator<{ allowed: boolean }>();
  const oldRequest = coordinator.begin();
  const current = coordinator.begin();
  coordinator.commitSuccess(current, { allowed: true });
  expect(coordinator.commitError(oldRequest, 'obsolete denial')).toBeNull();
  expect(coordinator.snapshot()).toEqual({ data: { allowed: true }, loading: false });
});

test('mutation intent locks synchronously before delayed preflight', async () => {
  const intents = new MutationIntentCoordinator();
  const response = deferred<boolean>();
  const intent = intents.begin();
  expect(intent).not.toBeNull();
  expect(intents.begin()).toBeNull();
  let writes = 0;
  const continuation = response.promise.then((allowed) => {
    if (allowed && intents.isCurrent(intent!)) writes++;
    intents.finish(intent!);
  });
  expect(writes).toBe(0);
  response.resolve(true);
  await continuation;
  expect(writes).toBe(1);
  expect(intents.begin()).not.toBeNull();
});

for (const reason of ['cancel', 'back to edit', 'unmount', 'replacement'] as const) {
  test(`${reason} invalidates delayed intent without unlocking its replacement`, async () => {
    const intents = new MutationIntentCoordinator();
    const response = deferred<boolean>();
    const obsolete = intents.begin()!;
    let writes = 0;
    const continuation = response.promise.then((allowed) => {
      if (allowed && intents.isCurrent(obsolete)) writes++;
      expect(intents.finish(obsolete)).toBe(false);
    });
    intents.invalidate();
    const current = intents.begin()!;
    response.resolve(true);
    await continuation;
    expect(writes).toBe(0);
    expect(intents.isCurrent(current)).toBe(true);
    expect(intents.begin()).toBeNull();
    expect(intents.finish(current)).toBe(true);
  });
}

test('property.create alone permits omitted or supplied AVAILABLE status, not nondefault status', () => {
  const target = { company_id: 'company-a', project_id: 'project-a' };
  const capabilities: AdminCapabilities = {
    permissions: [], grants: {}, mutation_grants: { 'property.create': [target] },
  };
  for (const body of [{}, { status: 'AVAILABLE' }]) {
    const permissions = requiredMutationPermissions('properties', 'create', body);
    expect(permissions).toEqual(['property.create']);
    expect(hasRequiredMutationGrants(capabilities, permissions, target)).toBe(true);
  }
  for (const status of ['HELD', 'RESERVED', 'BLOCKED', null]) {
    const permissions = requiredMutationPermissions('properties', 'create', { status });
    expect(permissions).toEqual(['property.create', 'property.change_status']);
    expect(hasRequiredMutationGrants(capabilities, permissions, target)).toBe(false);
  }
});

test('nondefault property creation requires a status grant covering the same project', () => {
  const target = { company_id: 'company-a', project_id: 'project-a' };
  const capabilities: AdminCapabilities = {
    permissions: [], grants: {}, mutation_grants: {
      'property.create': [target],
      'property.change_status': [{ ...target, project_id: 'project-b' }],
    },
  };
  const permissions = requiredMutationPermissions('properties', 'create', { status: 'HELD' });
  expect(hasRequiredMutationGrants(capabilities, permissions, target)).toBe(false);
  capabilities.mutation_grants!['property.change_status'] = [{ company_id: 'company-a', project_id: null }];
  expect(hasRequiredMutationGrants(capabilities, permissions, target)).toBe(true);
});

test('property edits still require status permission for every supplied changed status', () => {
  expect(requiredMutationPermissions('properties', 'edit', { area: 54 })).toEqual(['property.edit']);
  for (const status of ['AVAILABLE', 'HELD', 'SOLD']) {
    expect(requiredMutationPermissions('properties', 'edit', { status })).toEqual([
      'property.edit', 'property.change_status',
    ]);
  }
});

test('global, company and project grants remain distinct for mutation targets', () => {
  const company = { company_id: 'company-a', project_id: null };
  const project = { company_id: 'company-a', project_id: 'project-a' };
  expect(grantCoversTarget(globalScope(), project)).toBe(true);
  expect(grantCoversTarget(company, project)).toBe(true);
  expect(grantCoversTarget(project, company)).toBe(false);
  expect(grantCoversTarget(company, globalScope())).toBe(false);
  expect(grantCoversTarget(project, globalScope())).toBe(false);
  expect(grantCoversTarget(project, { ...project, company_id: 'company-b' })).toBe(false);
  expect(grantCoversTarget(project, { ...project, project_id: 'project-b' })).toBe(false);
  expect(grantCoversTarget(globalScope(), null)).toBe(false);
});

test('relationship scalars and nested reservation properties resolve the same scoped target', () => {
  const target = { company_id: 'company-a', project_id: 'project-a' };
  expect(targetForResource('customer-properties', {
    property_company_id: target.company_id, property_project_id: target.project_id,
  })).toEqual(target);
  expect(targetForResource('reservations', {
    property: { project: { id: target.project_id, company_id: target.company_id } },
  })).toEqual(target);
  expect(targetForResource('customer-properties', { property_id: 'property-a' })).toBeNull();
});
