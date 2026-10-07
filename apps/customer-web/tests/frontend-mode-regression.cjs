const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const app = path.resolve(__dirname, '../app');

// Execute actual TSX in a no-network component tree, preserving demo branches
// without changing the API-mode production build or starting a fixture hub.
function render(file, mode) {
  const resource = { loading: false, data: { payments: [], documents: [], certificates: [], milestones: [], rewards: { balance: 0, entries: [] } } };
  const ui = new Proxy({
    useRuntime: () => ({ dataMode: mode }),
    useResource: (url) => url === '/me/demo-records' ? resource : { loading: true },
  }, { get: (target, name) => target[name] || name });
  function load(filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const code = ts.transpileModule(source, { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const exports = {};
    const element = (type, props, key) => ({ type, props, key });
    const imports = (name) => {
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'fragment' };
      if (name === 'react') return { useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}] };
      if (name === '@rhc/ui') return ui;
      if (name === 'next/link') return { default: 'Link' };
      if (name === 'next/navigation') return { useRouter: () => ({}) };
      if (name.endsWith('/web3-nav')) return { navFor: () => [] };
      if (name.endsWith('/customer-data')) return { IdentityCard: 'IdentityCard', DirectoryCards: 'DirectoryCards', Notifications: 'Notifications' };
      if (name.endsWith('/public-shell')) return { PublicShell: 'PublicShell' };
      if (name === './data') return { PUBLIC_NAV_ITEMS: [] };
      if (name === './meridian-icon') return { MeridianIcon: 'MeridianIcon' };
      if (name.endsWith('/resource-metric')) return load(path.resolve(path.dirname(filename), name + '.ts'));
      throw new Error('Unexpected dependency: ' + name);
    };
    vm.runInNewContext(code, { exports, require: imports });
    return exports;
  }
  const module = load(path.join(app, file));
  return (module.default || module.PublicShell)({ children: null });
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ');
  if (tree && typeof tree === 'object') return text(tree.props?.children);
  return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
}

test('demo public shell retains explicit synthetic provenance', () => {
  const tree = render('components/meridian-public/public-shell.tsx', 'demo');
  assert.match(text(tree), /Demonstration environment/);
  assert.match(text(tree), /All records and service states are illustrative/);
  assert.match(text(tree), /No live purchase/);
});

test('demo entry retains all six synthetic reference links and demo input hint', () => {
  const tree = render('rhc-verify/page.tsx', 'demo');
  assert.equal(nodes(tree).filter((node) => node.type === 'a' && node.props.href.includes('/demo-passport')).length, 6);
  assert.match(nodes(tree).find((node) => node.type === 'input').props.placeholder, /demo-passport/);
});

test('demo dashboard keeps fictional provenance and a genuine zero reward balance', () => {
  const tree = render('dashboard/page.tsx', 'demo');
  assert.match(text(tree), /Demo environment. Records are fictional/);
  assert.equal(nodes(tree).find((node) => node.type === 'MetricCard' && node.props.label === 'RHC Rewards').props.value, '0');
});
