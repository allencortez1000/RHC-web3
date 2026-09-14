# API proxy and environment hardening handoff

## Proxy topology is not yet verified

The exact production proxy chain, API socket peer addresses/CIDRs, forwarding-header
rewrite behavior, and direct-ingress restrictions were not available for this review.
**Do not treat this change as confirmation that production client IP attribution is
correct. No Render IP range, private-network alias, or arbitrary hop count was chosen.**

`TRUSTED_PROXY_CIDRS` is an optional comma-separated allowlist of IPv4/IPv6 addresses
or CIDRs. Omitted/blank means Express `trust proxy = false`. `true`, `false` as text,
`*`, numeric hop counts, named networks, hostnames, malformed addresses, zero-prefix
catch-alls, and IPv4-mapped catch-alls are rejected. Limits: 64 entries / 8192 characters.
The validated list is passed directly to `app.set('trust proxy', ...)` before listening.
The loopback/documentation addresses in tests are fixtures, not deployment values.

The global guard still runs **before authentication** and keys only on Express `req.ip`
(with the socket fallback), never on raw forwarding headers or bearer-token contents.
It retains the existing cross-route 300/minute and route-specific/default 120/minute
IP ceilings. Without the correct allowlist, users behind a gateway still share its
bucket. Subject limiting does not fix that gateway bottleneck.

### Required infrastructure follow-up

1. Establish the actual socket peer and every trusted intermediary for each ingress
   path, including IPv4/IPv6 and any alternate/internal paths. Obtain authoritative
   ranges from the infrastructure owner; outbound service IPs are not necessarily
   inbound proxy peer ranges.
2. Verify that the edge overwrites/removes caller-controlled forwarding headers, and
   that direct connections cannot impersonate a trusted proxy. Restrict API ingress
   accordingly. Trust only the narrow necessary proxy addresses/ranges, not client
   networks or a broad private address space.
3. Configure `TRUSTED_PROXY_CIDRS` only after that verification. Express walks the
   forwarding chain from the socket toward the first untrusted address; trusting a
   client-controlled intermediary can make the reported client IP spoofable.
4. Through the real deployed ingress, prove that two distinct client addresses get
   distinct buckets, that an untrusted socket's forged XFF is ignored, and that a
   forged leftmost XFF cannot bypass the nearest untrusted hop. These deployment
   checks remain outstanding; local fixture tests alone cannot establish topology.

## Authenticated limits are now wired

`AuthGuard` calls `RateLimitStore.consumeAuthenticated(context, { kind: 'user', id: user.id })`
after JWT verification, application-user provisioning/synchronization, and the linked-identity
check. `CompanyApiGuard` calls the same helper with `{ kind: 'client', id: req.companyPrincipal.client_id }`
after successful key authentication. The earlier owner-integration TODO is resolved in source.

The store uses a separate hashed stable-subject namespace, a cross-route 300/minute ceiling,
and the method/class `@RateLimit` policy (default 120/minute). Redis failures remain
503/fail-closed; excess returns 429 with `Retry-After`. `X-RateLimit-Subject-*` headers
avoid overwriting the earlier IP headers. IDs come from authenticated application/client
records, not email, raw tokens, query parameters, or unverified JWT claims.

The pre-auth global IP guard remains in place; subject limits do not repair an incorrectly
attributed gateway IP or cover direct Supabase password/signup calls. Fixture coverage is
not proof of live Redis behavior or proxy topology. Verify invalid-credential isolation,
stable subjects across IP/token changes, separate users/clients, multi-instance sharing,
and store failure behavior in the approved live acceptance plan.

## Environment and startup behavior

- Node's `process.loadEnvFile` API (available in Node 22) loads the optional repository
  `.env`, then `apps/api/.env`, before validation and provider import/creation.
  Paths resolve from `packages/config`, not the working directory, in source and dist.
- Precedence is **runtime injection > repository `.env` > API `.env`**, including
  already-injected empty values. Loading fills missing values; it does not override
  injected values. Only `ENOENT` is ignored. Other loader failures abort with a fixed
  message, without the original exception, file contents, or filesystem path.
- `loadEnv(source)` remains pure: passing a source never reads files or falls back to
  real environment values. Validation failures expose field names, not values or
  Zod's raw exception payload.
- Staging/production require database/direct URLs, Supabase URL/secret/JWKS/issuer,
  Redis REST URL/token, **`CUSTOMER_WEB_URL`, `ADMIN_WEB_URL`, and `CORS_ORIGINS`**.
  Set both frontend URLs to their root HTTPS URLs and include their exact origins
  in the explicit comma-separated CORS list. No production localhost or wildcard
  fallback is applied. Development retains its existing localhost allowances.
- Supabase, issuer/JWKS, Redis, frontend, and configured API/R2/Sentry endpoints must
  use HTTPS outside development/test. Supabase must be an origin/root URL;
  `JWT_ISSUER` must equal its origin plus `/auth/v1`, and JWKS must equal that issuer
  plus `/.well-known/jwks.json`. Secret-bearing endpoints reject URL credentials,
  queries, and fragments; Sentry retains its DSN credential syntax.
- `DATABASE_URL` and `DIRECT_URL`, when present, must be syntactically valid
  `postgres://` or `postgresql://` URLs with host, database name, valid escapes, and
  valid optional port. This is syntax validation only, not a database connectivity
  or TLS verification. `PORT` is restricted to 1–65535.
- CLI startup has a 30-second watchdog and exits nonzero on failure/timeout with a
  generic message. Nest's logger is disabled to prevent its startup exception path
  from dumping credentials. This also suppresses ordinary Nest framework logs;
  safe structured operational logging can be added separately. The watchdog is
  cleared once listening succeeds, not a request timeout or a readiness guarantee.

## Validation scope

The prior configuration check reported invalid database URL syntax. No URL value is
reproduced, and no connectivity, target, role, or grant verification is implied. Four
migrations remain pending; staging migration is NO GO until the gates in the
[targeted completion report](targeted-completion-report.md) are satisfied.

Focused tests: `env-config.spec.ts`, `env-startup.spec.ts`, `proxy-rate-limit.spec.ts`, and
`authenticated-rate-limit.spec.ts` in `apps/api/test`. They use synthetic environment
values, an isolated Node child/temp directory for real env-file loading, real local
Express forwarding resolution, and stubbed provider/Redis boundaries. No repository
secret files, live database, deployment, or live service credentials are needed.

Build config first because workspace TypeScript consumers resolve its dist declarations:

```sh
npm run build --workspace @rhc/config
npm exec --workspace @rhc/api -- jest --runInBand test/env-config.spec.ts test/env-startup.spec.ts test/proxy-rate-limit.spec.ts test/authenticated-rate-limit.spec.ts
npm run typecheck --workspace @rhc/api
```

The preparation host ran Node 24.21.0. Node 22 is the design/CI/Docker runtime; its
runtime-specific check remains for CI/the runtime owner. The focused commands above are
a validation recipe, not a new execution claim. Current main-reported fixture counts
and pending browser reruns are recorded in [testing](testing.md). This documentation
refresh made no code/configuration changes or database, bootstrap, or deployment calls.
