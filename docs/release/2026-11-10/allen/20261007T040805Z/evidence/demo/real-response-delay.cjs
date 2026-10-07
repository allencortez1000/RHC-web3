'use strict';
const { createHash } = require('node:crypto');
const boundary = require('./boundary.cjs');
const delayPaths = new Set([
  '/api/demo/verify/rhc-id/demo-passport-maya-7d2f0f9a',
  '/api/demo/me', '/api/demo/me/rhc-id',
]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function eligible(url, method) {
  try { const u = new URL(url); return u.origin === 'http://127.0.0.1:3002' && !u.search && !u.username && !u.password && method === 'GET' && delayPaths.has(u.pathname); }
  catch { return false; }
}
function makeDelay({ page, paths, token, name, log, onError, assertOwned = boundary.assertOwned, holdMs = 8000 }) {
  if (!page || !paths.length || paths.some(p => !delayPaths.has(p))) throw Error('BLOCKED: delay must name a page and exact permitted fixture read paths');
  if (paths.some(p => !p.includes('/verify/')) && !/^rhc_demo_[a-f0-9]{32}$/.test(token || '')) throw Error('BLOCKED: private read delay requires the actual selected session');
  if (!(holdMs > 0 && holdMs <= 8000)) throw Error('BLOCKED: response hold is bounded at 8000ms');
  const entries = [];
  let released = false;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const releaseAll = () => { released = true; release(); };
  function matches(request) {
    if (released || !eligible(request.url(), request.method()) || !paths.includes(new URL(request.url()).pathname)) return false;
    try { if (request.frame().page() !== page) return false; } catch { return false; }
    const auth = request.headers().authorization;
    return token ? auth === 'Demo ' + token || auth === 'Bearer ' + token : !auth;
  }
  async function handle(route) {
    const request = route.request();
    if (!matches(request)) return false;
    if (entries.length >= 6) throw Error('BLOCKED: excess duplicate requests for one narrow delay');
    const entry = { name, path: new URL(request.url()).pathname, receivedAt: Date.now(), status: 'FETCHING' };
    entries.push(entry);
    let response, timer;
    try {
      assertOwned(3002);
      // No APIRequestContext or direct fetch bypass: this is only the already-matched
      // browser GET, with its actual headers. Never follow redirects or retry.
      response = await route.fetch({ maxRedirects: 0, maxRetries: 0, timeout: 7000 });
      const body = await response.body();
      const data = JSON.parse(body.toString('utf8'));
      if (response.status() !== 200 || data.success !== true || data.meta?.provenance !== 'DEMO') throw Error('Real hub response is not a successful DEMO fixture; do not substitute data');
      entry.httpStatus = response.status(); entry.sha256 = hash(body); entry.status = 'HELD'; entry.heldAt = Date.now();
      log('real-response-held', { ...entry });
      timer = setTimeout(() => {
        entry.expired = true;
        onError(Error('TIMEOUT: real-response hold exceeded 8000ms: ' + name));
        releaseAll();
      }, holdMs);
      await gate;
      clearTimeout(timer);
      // The public bytes are not reconstructed. A second body read proves that the
      // same immutable upstream response is still being forwarded, not a new lookup.
      if (hash(await response.body()) !== entry.sha256) throw Error('Real response bytes changed while held');
      entry.releasedAt = Date.now();
      try {
        await route.fulfill({ response });
        const cancelled = request.failure()?.errorText || '';
        entry.status = /ERR_ABORTED|NS_BINDING_ABORTED/.test(cancelled) ? 'BROWSER_CANCELLED' : 'RELEASED_UNCHANGED';
        if (entry.status === 'BROWSER_CANCELLED') entry.cancellation = cancelled;
      } catch (error) {
        const failure = request.failure()?.errorText || '';
        if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(failure)) {
          entry.status = 'BROWSER_CANCELLED'; entry.cancellation = failure;
        } else throw error;
      }
      log('real-response-released', { ...entry });
    } catch (error) {
      entry.status = 'FAILED'; entry.error = error.message;
      log('real-response-delay-failed', { ...entry }); onError(error);
      // No fallback lookup, abort injection or fabricated business response. The
      // failed supplemental check closes its context; the supervisor is the backstop.
    } finally {
      clearTimeout(timer);
      if (response) await response.dispose().catch(error => onError(error));
    }
    return true;
  }
  return { name, entries, matches, handle, release: releaseAll };
}
module.exports = { delayPaths, eligible, makeDelay };
