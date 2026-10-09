// Execute the actual pure spec without loading Playwright config, fixtures or servers.
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const { expect } = require('@playwright/test');

const root = path.resolve(__dirname, '../../../..');
const modules = new Map();
const files = new Map([
  ['../app/capability-scopes', 'apps/admin-web/app/capability-scopes.ts'],
  ['../app/capability-request-coordinator', 'apps/admin-web/app/capability-request-coordinator.ts'],
  ['spec', 'apps/admin-web/tests/capability-request-coordinator.spec.ts'],
]);
function load(name) {
  if (name === './offline-test') return {
    expect,
    test(title, callback) {
      if (callback.length !== 0) throw new Error('Only fixture-free test callbacks are allowed');
      return test(title, () => callback());
    },
  };
  if (name === 'react') return require('react');
  if (!files.has(name)) throw new Error('Unexpected spec dependency: ' + name);
  if (modules.has(name)) return modules.get(name).exports;
  const filename = path.join(root, files.get(name));
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  modules.set(name, module);
  new Function('require', 'module', 'exports', compiled)(load, module, module.exports);
  return module.exports;
}
load('spec');
