import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { workspaces: string[] };
const dockerfile = readFileSync(resolve(root, 'infrastructure/docker/Dockerfile.api'), 'utf8');

function workspaceManifests(): string[] {
  return manifest.workspaces.flatMap((pattern) => {
    // Keep discovery aligned with this repository's one-level workspace layout.
    if (!/^[\w-]+\/\*$/.test(pattern)) throw new Error(`Unsupported workspace pattern: ${pattern}`);
    const parent = pattern.slice(0, -2);
    return readdirSync(resolve(root, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${parent}/${entry.name}/package.json`)
      .filter((file) => existsSync(resolve(root, file)));
  });
}

describe('API Docker dependency graph (static, no container)', () => {
  it('copies every workspace manifest before the locked dependency installation', () => {
    const dependencyStage = dockerfile.split(/^FROM /m).find((stage) => /^[^\r\n]+ AS deps\r?\n/.test(stage));
    expect(dependencyStage).toBeDefined();
    const install = dependencyStage!.indexOf('RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci');
    expect(install).toBeGreaterThan(0);
    const copies = dependencyStage!.slice(0, install);
    const missing = workspaceManifests().filter((file) => !copies.includes(`COPY ${file} ${file}`));
    expect(missing).toEqual([]);
    expect(copies).toContain('COPY package.json package-lock.json ./');
  });
});
