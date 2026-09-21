import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Offline heuristic audit. Never output file contents, matched values, or environment values.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set(['node_modules', '.git', '.next', 'dist', '.rhc-demo', 'test-results', 'playwright-report']);
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink() || excluded.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const files = walk(root);
const tracked = new Set(execFileSync('git', ['--no-pager', 'ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0'));
const nameOf = (path) => relative(root, path).replaceAll('\\', '/');
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['supabase-secret', /\bsb_secret_[A-Za-z0-9_-]{16,}/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['stripe-live-secret', /\bsk_live_[A-Za-z0-9]{16,}\b/g],
  ['credential-url', /\b(?:postgres(?:ql)?|mysql|redis|rediss):\/\/[^\s/:]+:[^\s@]+@[^\s'"`]+/g],
];
function findings(content) {
  const found = [];
  for (const [rule, pattern] of rules) {
    for (const match of content.matchAll(pattern)) {
      // Explicit documentation/test credentials are not deployment secrets.
      if (rule === 'credential-url' && /localhost|127\.0\.0\.1|example|USER:|user:password|<|\$\{/i.test(match[0])) continue;
      found.push({ rule, line: content.slice(0, match.index).split('\n').length });
    }
  }
  for (const match of content.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      if (payload.role !== 'anon') found.push({ rule: 'non-anon-jwt', line: content.slice(0, match.index).split('\n').length });
    } catch { /* Not a parseable JWT; no token bytes are logged. */ }
  }
  return found;
}

test('working-tree credential audit reports metadata only', (t) => {
  const exposures = [];
  let sourceCount = 0;
  let envCount = 0;
  for (const path of files) {
    const name = nameOf(path);
    const envFile = /(?:^|\/)\.env(?:\.|$)/.test(name);
    if (!envFile && !/\.(?:[cm]?[jt]sx?|json|ya?ml|md|sql|prisma|toml|ini|conf|pem|key)$/.test(name)) continue;
    const content = readFileSync(path, 'utf8');
    if (envFile) {
      envCount++;
      const template = /\.(?:example|sample|template)$/.test(name);
      const ignoreCheck = spawnSync('git', ['--no-pager', 'check-ignore', '--stdin'], {
        cwd: root, input: `${name}\n`, encoding: 'utf8', timeout: 5000,
      });
      assert.ok(ignoreCheck.status === 0 || ignoreCheck.status === 1, 'Unable to verify environment ignore rules');
      const ignored = !tracked.has(name) && ignoreCheck.status === 0;
      if (!template && !ignored) exposures.push({ file: name, line: 1, rule: 'unprotected-environment-file' });
      t.diagnostic(`Environment file ${name}: tracked=${tracked.has(name)}, ignored=${ignored}, template=${template}; values withheld`);
      for (const [index, line] of content.split('\n').entries()) {
        const assignment = /^(?:export\s+)?(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
        if (assignment) {
          if (/SECRET|SERVICE_ROLE|PRIVATE_KEY|DATABASE|REDIS.*TOKEN/.test(assignment[1]) && assignment[2].trim()) {
            exposures.push({ file: name, line: index + 1, rule: 'privileged-public-environment-variable' });
          }
          exposures.push(...findings(assignment[2]).map(({ rule }) => ({ file: name, line: index + 1, rule: `public-value-${rule}` })));
        }
      }
      if (!template && ignored) continue;
    } else sourceCount++;
    exposures.push(...findings(content).map((finding) => ({ file: name, ...finding })));
  }
  t.diagnostic(`Scanned ${sourceCount} source/config/document files and ${envCount} environment files; generated output, dependencies, Git history, and local demo state excluded`);
  for (const exposure of exposures) t.diagnostic(`${exposure.file}:${exposure.line} [${exposure.rule}] value withheld`);
  assert.equal(exposures.length, 0, 'Potential credential exposures require private owner review; only metadata is reported');
});

test('browser source does not reference privileged server environment variables', () => {
  const hits = [];
  for (const path of files) {
    const name = nameOf(path);
    if (!/^(apps\/(?:admin|customer)-web|packages\/ui)\//.test(name) || !/\.[jt]sx?$/.test(name)) continue;
    if (/\/api\/|\/lib\/demo\/|\/tests\//.test(name)) continue;
    const content = readFileSync(path, 'utf8');
    if (/process\.env\.(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|DIRECT_URL|UPSTASH_REDIS_REST_TOKEN)\b/.test(content)) hits.push(name);
  }
  assert.equal(hits.length, 0, `Privileged environment references in browser source: ${hits.join(', ')}`);
});
