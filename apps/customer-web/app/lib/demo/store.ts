import { copyFile, link, lstat, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DEMO_PERSONAS, type DemoApplication, type DemoPersona, type DemoSession, type DemoWorld } from '@rhc/types';
import { createDemoWorld } from './seed';

export class DemoStoreError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function projectRoot() {
  const cwd = process.cwd();
  return path.basename(cwd) === 'customer-web' ? path.resolve(cwd, '../..') : cwd;
}

const storeDirectory = process.env.RHC_DEMO_STORE_DIR
  ? path.resolve(process.env.RHC_DEMO_STORE_DIR)
  : path.join(projectRoot(), '.rhc-demo');
const storeFile = path.join(storeDirectory, 'world.json');
type StoreState = {
  queue: Promise<unknown>;
  cache: { text: string; world: DemoWorld } | null;
};

// Next may evaluate this module more than once. All instances in this process
// must share the same queue, including initial reads, resets, and control claims.
// This is not a lock across processes, workers, or filesystem path aliases.
const registryKey = Symbol.for('rhc.demo.store.v1');
const storeProcess = process as typeof process & { [registryKey]?: Map<string, StoreState> };
const registry = storeProcess[registryKey] ??= new Map<string, StoreState>();
const storeKey = process.platform === 'win32' ? storeFile.toLowerCase() : storeFile;
const state: StoreState = registry.get(storeKey) ?? { queue: Promise.resolve(), cache: null };
registry.set(storeKey, state);

const requestContext = new AsyncLocalStorage<{ token: string | null; requestId: string }>();
export const demoRequestContext = () => requestContext.getStore();
export function withDemoRequestContext<T>(context: { token: string | null; requestId: string }, operation: () => Promise<T>) {
  return requestContext.run(context, operation);
}

const recovery = 'Stop the demo servers, inspect the store and its permissions, then retry or run npm run demo:reset -- "RESET RHC DEMO" from the repository root with the same RHC_DEMO_STORE_DIR. Confirmed reset preserves a backup; restart the demo servers afterward.';

function filesystemCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}

function storeError(code: string, message: string, error?: unknown): DemoStoreError {
  return new DemoStoreError(503, code, `${message} ${recovery}`, {
    store_file: storeFile,
    filesystem_code: filesystemCode(error),
  });
}

// Validate the persisted contract, not merely the version tag. Flexible catalog
// records retain their extra fields; domain authorization remains in the router.
type Check = (value: unknown) => boolean;
const text: Check = (value) => typeof value === 'string';
const boolean: Check = (value) => typeof value === 'boolean';
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer: Check = (value) => typeof value === 'number' && Number.isSafeInteger(value);
const revision: Check = (value) => integer(value) && (value as number) >= 1;
const timestamp: Check = (value) => text(value) && Number.isFinite(Date.parse(value as string));
const optional = (check: Check): Check => (value) => value === undefined || check(value);
const nullable = (check: Check): Check => (value) => value === null || check(value);
const choices = (...values: unknown[]): Check => (value) => values.includes(value);
const array = (check: Check): Check => (value) => Array.isArray(value) && value.every(check);
const fields = (names: string, check: Check = text): Record<string, Check> => Object.fromEntries(names.split(' ').map((name) => [name, check]));
const shape = (checks: Record<string, Check>): Check => (value) => record(value) && Object.entries(checks).every(([key, check]) => check(value[key]));
const rows = (names: string, checks: Record<string, Check> = {}): Check => array(shape({ ...fields(names), ...checks }));
const verification = choices('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
const worldShape = {
  schema_version: choices(1),
  provenance: choices('DEMO'),
  revision,
  seeded_at: timestamp,
  controls: shape({
    scenario: choices('baseline', 'empty', 'exceptions'),
    latency_ms: (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5000,
    fail_next_request: boolean,
    empty_state: boolean,
    clock: timestamp,
  }),
  sessions: array((value) => shape({
    token: (token) => typeof token === 'string' && /^rhc_demo_[a-f0-9]{32}$/.test(token),
    persona_id: text,
    application: choices('customer', 'admin'),
    created_at: timestamp,
    expires_at: timestamp,
  })(value) && record(value) && DEMO_PERSONAS.some((persona) => persona.id === value.persona_id && persona.application === value.application)),
  users: rows('id email role', {
    account_status: choices('PENDING', 'ACTIVE', 'DISABLED', 'LOCKED'),
    verification_status: verification,
    auth_email_confirmed_at: nullable(timestamp),
    ...fields('roles permissions company_ids project_ids', array(text)),
    is_admin: boolean,
    ...fields('created_at updated_at', timestamp),
    profile: shape({
      ...fields('first_name last_name'),
      ...fields('middle_name suffix birth_date nationality address_line barangay city province postal_code country mobile_number rhc_id rhc_id_issued_at', optional(nullable(text))),
      verification_status: optional(text),
    }),
  }),
  companies: rows('id company_code legal_name display_name description business_type', {
    status: choices('ACTIVE', 'INACTIVE', 'PREPARED', 'SUSPENDED'),
    integration_status: choices('NOT_CONFIGURED', 'PREPARED', 'ACTIVE', 'SUSPENDED', 'ERROR'),
  }),
  projects: rows('id company_id project_code project_name description location', {
    status: choices('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'),
    ...fields('start_date target_completion', nullable(text)),
  }),
  properties: rows('id project_id property_code tower floor unit_number area list_price', {
    asset_type: choices('RESIDENTIAL', 'COMMERCIAL', 'PARKING'),
    status: choices('AVAILABLE', 'HELD', 'RESERVED', 'CONTRACTED', 'SOLD', 'FOR_TURNOVER', 'TURNED_OVER', 'BLOCKED'),
    list_price_minor: integer,
    currency: choices('PHP'),
    metadata: record,
    revision,
  }),
  saved_properties: rows('id customer_id property_id created_at'),
  reservations: rows('id reservation_number customer_id property_id expires_at created_at updated_at', {
    status: choices('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'CONVERTED'),
    revision,
    events: rows('id type at actor_id note'),
  }),
  property_links: rows('id customer_id property_id relationship_type status effective_from created_at updated_at', { effective_to: nullable(text) }),
  payments: rows('id customer_id property_id reference due_date description submitted_at', {
    amount_minor: integer,
    currency: choices('PHP'),
    status: choices('SUBMITTED', 'PENDING', 'POSTED', 'REVERSED'),
    document_id: optional(text),
    ...fields('verified_at reversed_from_id', optional(nullable(text))),
    revision,
  }),
  documents: rows('id customer_id title category issued_at issuer content sha256', {
    ...fields('property_id review_message supersedes_id', optional(text)),
    status: choices('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'),
    version: revision,
    revision,
  }),
  certificates: rows('id customer_id reference public_reference type issued_at linked_record issuer internal_review_status', {
    status: choices('ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED', 'SUPERSEDED'),
    expires_at: optional(nullable(text)),
    source_version: revision,
    blockchain_status: choices('NOT_REQUESTED', 'QUEUED', 'ANCHOR_PENDING', 'CONFIRMED', 'FAILED'),
    ...fields('superseded_by_id revoked_reason', optional(text)),
    revision,
  }),
  reward_entries: rows('id customer_id date source reason reference rule_version idempotency_key', {
    points: integer,
    status: choices('POSTED', 'PENDING', 'REVERSED', 'EXPIRED'),
  }),
  benefits: rows('id title status detail', { cost: integer }),
  redemptions: rows('id customer_id benefit_id status created_at receipt_id', { points: integer }),
  milestones: rows('id project_id title description status date reviewer'),
  turnover_cases: rows('id customer_id property_id case_number status note', { checklist: array(shape({ label: text, complete: boolean })) }),
  service_requests: rows('id customer_id company_id service_id reference title status created_at updated_at', { events: rows('status at note') }),
  consents: rows('id customer_id consent_type purpose consent_version created_at', {
    ...fields('company_id granted_at withdrawn_at', nullable(text)),
    granted: boolean,
  }),
  notifications: rows('id customer_id subject body created_at', { channel: choices('IN_APP'), status: choices('Unread', 'Read'), href: optional(text) }),
  receipts: rows('id actor_id type reference status summary related_type related_id created_at', { customer_id: optional(text), demo: choices(true) }),
  audit_logs: rows('id actor_user_id action entity_type entity_id request_id correlation_id created_at', {
    ...fields('company_id project_id', optional(nullable(text))),
    changes: record,
  }),
  business_services: rows('id company_id'),
  integrations: rows('id company_id'),
  feature_flags: rows('id key', { enabled: boolean }),
  system_settings: rows('id key'),
  roles: rows('id code'),
  permissions: rows('id code'),
  user_roles: rows('id user_id role_id'),
} satisfies Record<keyof DemoWorld, Check>;

function parseWorld(contents: string): DemoWorld {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw storeError('STORE_INVALID_JSON', 'The demo store is not valid JSON. Existing bytes were not changed.');
  }
  if (!record(value)) {
    throw storeError('STORE_UNSUPPORTED', 'The demo store must be a schema-version-1 DEMO object. Existing bytes were not changed.');
  }
  for (const [field, check] of Object.entries(worldShape)) {
    if (!check(value[field])) {
      throw storeError('STORE_UNSUPPORTED', `The demo store has an unsupported ${field} shape. Existing bytes were not changed.`);
    }
  }
  return value as DemoWorld;
}

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  assertDemoServer();
  const pending = state.queue.then(() => {
    assertDemoServer();
    return operation();
  });
  state.queue = pending.catch(() => undefined);
  return pending;
}

export function assertDemoServer() {
  const profile = process.env.RHC_APP_PROFILE;
  const enabled = process.env.RHC_DEMO_MODE === '1';
  const deployments = [process.env.NODE_ENV, process.env.VERCEL_ENV, process.env.RHC_ENVIRONMENT, process.env.APP_ENV];
  if (!enabled || profile !== 'demo') {
    throw new DemoStoreError(404, 'DEMO_DISABLED', 'The local demo fixture hub is not enabled.');
  }
  if (deployments.some((value) => ['production', 'staging', 'preview'].includes((value || '').toLowerCase()))) {
    throw new DemoStoreError(404, 'DEMO_FORBIDDEN', 'Demo mode is unavailable outside the local development profile.');
  }
}

async function readExistingBytes(): Promise<Buffer | null> {
  let entry;
  try {
    entry = await lstat(storeFile);
  } catch (error) {
    if (filesystemCode(error) === 'ENOENT') return null;
    throw storeError('STORE_READ_FAILED', 'The demo store could not be inspected. Nothing was replaced.', error);
  }
  if (!entry.isFile()) {
    throw storeError('STORE_READ_FAILED', 'The demo store path must be a regular file, not a directory or symbolic link. Nothing was replaced.');
  }
  try {
    return await readFile(storeFile);
  } catch (error) {
    // ENOENT after lstat is a failed read, not permission to seed over a race.
    throw storeError('STORE_READ_FAILED', 'The existing demo store could not be read. Nothing was replaced.', error);
  }
}

function decodeWorld(bytes: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw storeError('STORE_INVALID_JSON', 'The demo store is not valid UTF-8 JSON. Existing bytes were not changed.');
  }
}

async function loadWorldUnsafe(): Promise<DemoWorld> {
  const bytes = await readExistingBytes();
  if (bytes === null) {
    if (state.cache) {
      throw storeError('STORE_MISSING', 'The initialized demo store disappeared. Automatic reseeding is disabled.');
    }
    const initialized = await persistUnsafe(createDemoWorld(), true);
    // Exclusive publication lost to an existing file. Validate it, never replace it.
    return initialized ?? loadWorldUnsafe();
  }
  const contents = decodeWorld(bytes);
  if (state.cache?.text === contents) return state.cache.world;
  const world = parseWorld(contents);
  state.cache = { text: contents, world };
  return world;
}

function persistUnsafe(world: DemoWorld, initialize?: false): Promise<DemoWorld>;
function persistUnsafe(world: DemoWorld, initialize: boolean): Promise<DemoWorld | null>;
async function persistUnsafe(world: DemoWorld, initialize = false): Promise<DemoWorld | null> {
  // Snapshot before any I/O so callers cannot retain a mutable cache reference.
  let contents: string;
  try {
    contents = `${JSON.stringify(world, null, 2)}\n`;
  } catch (error) {
    throw storeError('STORE_WRITE_FAILED', 'The proposed demo world could not be serialized. Nothing was replaced.', error);
  }
  const committed = parseWorld(contents);
  const temporary = path.join(storeDirectory, `world.${process.pid}.${randomUUID()}.tmp`);
  let created = false;
  try {
    await mkdir(storeDirectory, { recursive: true });
    const handle = await open(temporary, 'wx');
    created = true;
    try {
      await handle.writeFile(contents, { encoding: 'utf8' });
    } finally {
      await handle.close();
    }
    if (initialize) {
      // Unlike rename, link atomically refuses an existing destination. This
      // protects first publication only; normal writes remain single-process.
      try {
        await link(temporary, storeFile);
      } catch (error) {
        if (filesystemCode(error) === 'EEXIST') return null;
        throw error;
      }
    } else {
      await rename(temporary, storeFile);
    }
    state.cache = { text: contents, world: committed };
    return committed;
  } catch (error) {
    throw storeError('STORE_WRITE_FAILED', 'The demo store write failed; no in-memory changes were committed.', error);
  } finally {
    // Cleanup is best-effort and must not turn a completed disk commit into an
    // apparent rollback. An interrupted write may leave an unused .tmp file.
    if (created) await unlink(temporary).catch(() => undefined);
  }
}

export async function readDemoWorld(): Promise<DemoWorld> {
  return serialized(async () => structuredClone(await loadWorldUnsafe()));
}

export async function mutateDemoWorld<T>(
  operation: (world: DemoWorld) => T | Promise<T>,
  expectedRevision?: number,
): Promise<{ result: T; world: DemoWorld }> {
  return serialized(async () => {
    const current = await loadWorldUnsafe();
    const token = demoRequestContext()?.token;
    if (token) authenticateWorldSession(current, token);
    if (expectedRevision !== undefined && current.revision !== expectedRevision) {
      throw new DemoStoreError(409, 'REVISION_CONFLICT', 'The demo world changed. Refresh and try again.', {
        expected_revision: expectedRevision,
        current_revision: current.revision,
      });
    }
    const next = structuredClone(current);
    const result = await operation(next);
    next.revision = current.revision + 1;
    const committed = await persistUnsafe(next);
    return { result, world: structuredClone(committed) };
  });
}

export async function resetDemoWorld(confirmation: string): Promise<DemoWorld> {
  assertDemoServer();
  if (confirmation !== 'RESET RHC DEMO') {
    throw new DemoStoreError(400, 'RESET_CONFIRMATION_REQUIRED', 'Type RESET RHC DEMO to restore the deterministic baseline.');
  }
  return serialized(async () => {
    const token = demoRequestContext()?.token;
    if (token) authenticateWorldSession(await loadWorldUnsafe(), token);
    const bytes = await readExistingBytes();
    const seeded = createDemoWorld();
    let previousRevision = state.cache?.world.revision ?? 0;
    if (bytes !== null) {
      try {
        previousRevision = Math.max(previousRevision, parseWorld(decodeWorld(bytes)).revision);
      } catch (error) {
        if (!(error instanceof DemoStoreError) || !['STORE_INVALID_JSON', 'STORE_UNSUPPORTED'].includes(error.code)) throw error;
        // Only explicit confirmation allows recovery without a valid old world.
      }
      const backup = path.join(storeDirectory, `world.backup-${Date.now()}-${randomUUID()}.json`);
      try {
        await copyFile(storeFile, backup, constants.COPYFILE_EXCL);
      } catch (error) {
        throw storeError('STORE_BACKUP_FAILED', 'Reset was cancelled because the existing demo store could not be backed up. Nothing was replaced.', error);
      }
    }
    if (previousRevision === Number.MAX_SAFE_INTEGER) {
      throw storeError('STORE_REVISION_EXHAUSTED', 'The demo revision cannot advance safely. Use the offline confirmed reset to start a new baseline.');
    }
    seeded.revision = previousRevision + 1;
    const committed = await persistUnsafe(seeded, bytes === null);
    if (!committed) throw storeError('STORE_RESET_CONFLICT', 'A demo store appeared during reset. It was not replaced; inspect it before confirming another reset.');
    return structuredClone(committed);
  });
}

export function personaById(personaId: string, application?: DemoApplication): DemoPersona {
  const persona = DEMO_PERSONAS.find(
    (candidate) => candidate.id === personaId && (!application || candidate.application === application),
  );
  if (!persona) throw new DemoStoreError(404, 'PERSONA_NOT_FOUND', 'That local demo persona is unavailable.');
  return persona;
}

export async function createDemoSession(personaId: string): Promise<{ token: string; persona: DemoPersona; world: DemoWorld }> {
  const persona = personaById(personaId);
  const token = `rhc_demo_${randomUUID().replaceAll('-', '')}`;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  const { world } = await mutateDemoWorld((draft) => {
    assertActiveAccount(draft, persona);
    draft.sessions = draft.sessions.filter(
      (session) => Date.parse(session.expires_at) > Date.now() && !(session.persona_id === persona.id && session.application === persona.application),
    );
    draft.sessions.push({
      token,
      persona_id: persona.id,
      application: persona.application,
      created_at: createdAt,
      expires_at: expiresAt,
    });
    return null;
  });
  return { token, persona, world };
}

export async function revokeDemoSession(token: string): Promise<void> {
  await mutateDemoWorld((draft) => {
    draft.sessions = draft.sessions.filter((session) => session.token !== token);
    return null;
  });
}

function assertActiveAccount(world: DemoWorld, persona: DemoPersona) {
  const user = world.users.find((candidate) => candidate.id === persona.userId);
  if (!user || user.account_status !== 'ACTIVE') {
    throw new DemoStoreError(401, 'ACCOUNT_INACTIVE', 'This demo account is not active. An authorized administrator must restore it.');
  }
}

export async function authenticateDemoSession(token: string | null): Promise<{ session: DemoSession; persona: DemoPersona; world: DemoWorld }> {
  if (!token) throw new DemoStoreError(401, 'SESSION_REQUIRED', 'Choose a demo persona to continue.');
  const world = await readDemoWorld();
  return authenticateWorldSession(world, token);
}

function authenticateWorldSession(world: DemoWorld, token: string) {
  const session = world.sessions.find((candidate) => candidate.token === token);
  if (!session || Date.parse(session.expires_at) <= Date.now()) {
    throw new DemoStoreError(401, 'SESSION_EXPIRED', 'This demo session has expired. Choose a persona again.');
  }
  const persona = personaById(session.persona_id, session.application);
  assertActiveAccount(world, persona);
  return { session, persona, world };
}

export async function applyDemoRequestControls(): Promise<void> {
  const controls = await serialized(async () => {
    const current = await loadWorldUnsafe();
    const claimed = structuredClone(current.controls);
    if (claimed.fail_next_request) {
      const next = structuredClone(current);
      next.controls.fail_next_request = false;
      next.revision += 1;
      await persistUnsafe(next);
    }
    return claimed;
  });
  // Claim the one-shot failure before latency and release the queue while waiting.
  // Ordinary reads neither write the file nor advance its revision.
  if (controls.latency_ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, controls.latency_ms));
  }
  if (controls.fail_next_request) {
    throw new DemoStoreError(503, 'INJECTED_DEMO_FAILURE', 'The explicit next-request failure was triggered. Retry to recover.');
  }
}
