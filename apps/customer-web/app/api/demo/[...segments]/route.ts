import { NextRequest, NextResponse } from 'next/server';
import type { DemoApiError, DemoApiResponse } from '@rhc/types';
import { dispatchDemoRequest } from '../../../lib/demo/router';
import { DemoStoreError, assertDemoServer } from '../../../lib/demo/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedHosts = new Set(
  (process.env.RHC_DEMO_ALLOWED_HOSTS || 'localhost:3002,127.0.0.1:3002')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const allowedOrigins = new Set(
  (process.env.RHC_DEMO_ALLOWED_ORIGINS || 'http://localhost:3002,http://localhost:3003,http://127.0.0.1:3002,http://127.0.0.1:3003')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

function corsOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')?.toLowerCase();
  return origin && allowedOrigins.has(origin) ? origin : null;
}

function responseHeaders(request: NextRequest, revision?: number) {
  const headers = new Headers({
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  });
  const origin = corsOrigin(request);
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization,Content-Type,If-Match,X-RHC-Demo-Request');
    headers.set('Access-Control-Max-Age', '600');
  }
  if (revision !== undefined) headers.set('X-RHC-Demo-Revision', String(revision));
  return headers;
}

function validateBoundary(request: NextRequest, write: boolean) {
  const host = request.headers.get('host')?.toLowerCase();
  if (!host || !allowedHosts.has(host)) {
    throw new DemoStoreError(403, 'DEMO_HOST_REJECTED', 'The fixture hub accepts only its configured loopback host.');
  }
  const origin = request.headers.get('origin')?.toLowerCase();
  if (origin && !allowedOrigins.has(origin)) {
    throw new DemoStoreError(403, 'DEMO_ORIGIN_REJECTED', 'This origin cannot access the local fixture hub.');
  }
  if (write && (!origin || !allowedOrigins.has(origin))) {
    throw new DemoStoreError(403, 'DEMO_WRITE_ORIGIN_REQUIRED', 'Local demo writes require an exact approved Origin header.');
  }
}

function tokenFrom(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const match = /^(?:Demo|Bearer)\s+([A-Za-z0-9_]+)$/.exec(authorization);
  return match?.[1] || null;
}

function expectedRevision(request: NextRequest) {
  const value = request.headers.get('if-match');
  if (!value) return undefined;
  const number = Number(value.replaceAll('"', ''));
  if (!/^(?:[1-9]\d*|"[1-9]\d*")$/.test(value) || !Number.isSafeInteger(number)) {
    throw new DemoStoreError(400, 'INVALID_REVISION', 'If-Match must contain the current numeric demo revision.');
  }
  return number;
}

async function bodyFrom(request: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return undefined;
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new DemoStoreError(400, 'INVALID_JSON', 'The request body must be valid JSON.');
  }
}

async function handle(request: NextRequest, context: { params: Promise<{ segments: string[] }> }) {
  const requestId = crypto.randomUUID();
  try {
    assertDemoServer();
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    validateBoundary(request, write);
    const { segments } = await context.params;
    const result = await dispatchDemoRequest({
      segments,
      requestId,
      method: request.method,
      token: tokenFrom(request),
      url: request.nextUrl,
      body: await bodyFrom(request),
      expectedRevision: expectedRevision(request),
    });
    const payload: DemoApiResponse<unknown> = {
      success: true,
      data: result.data,
      meta: {
        provenance: 'DEMO',
        revision: result.world.revision,
        request_id: requestId,
        demo_clock: result.world.controls.clock,
      },
    };
    return NextResponse.json(payload, { status: 200, headers: responseHeaders(request, result.world.revision) });
  } catch (error) {
    const known = error instanceof DemoStoreError;
    const status = known ? error.status : 500;
    if (known && status === 404 && ['DEMO_DISABLED', 'DEMO_FORBIDDEN'].includes(error.code)) {
      return new NextResponse(null, { status: 404, headers: responseHeaders(request) });
    }
    const payload: DemoApiError = {
      success: false,
      error: {
        code: known ? error.code : 'DEMO_INTERNAL_ERROR',
        message: known ? error.message : 'The local demo request could not be completed.',
        details: known ? error.details : undefined,
      },
      meta: {
        provenance: 'DEMO',
        revision: 0,
        request_id: requestId,
        demo_clock: new Date().toISOString(),
      },
    };
    if (!known) console.error('[rhc-demo]', error);
    return NextResponse.json(payload, { status, headers: responseHeaders(request) });
  }
}

export async function OPTIONS(request: NextRequest) {
  try {
    assertDemoServer();
    validateBoundary(request, false);
    const origin = corsOrigin(request);
    if (!origin) throw new DemoStoreError(403, 'DEMO_ORIGIN_REJECTED', 'This origin cannot access the local fixture hub.');
    return new NextResponse(null, { status: 204, headers: responseHeaders(request) });
  } catch (error) {
    const status = error instanceof DemoStoreError ? error.status : 500;
    if (error instanceof DemoStoreError && status === 404 && ['DEMO_DISABLED', 'DEMO_FORBIDDEN'].includes(error.code)) {
      return new NextResponse(null, { status: 404, headers: responseHeaders(request) });
    }
    return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : 'Request rejected.' } }, { status, headers: responseHeaders(request) });
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
