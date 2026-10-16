import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { PointsReadOnlyPanel } from './PointsReadOnlyPanel.tsx';

const panelSource = fs.readFileSync(new URL('./PointsReadOnlyPanel.tsx', import.meta.url), 'utf8');
const pageSource = fs.readFileSync(new URL('../../rhc-points/page.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('PointsReadOnlyPanel.tsx', panelSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const html = () => renderToStaticMarkup(React.createElement(PointsReadOnlyPanel));
function nodes(root, predicate) {
  const found = [];
  function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(root);
  return found;
}

test('shows unavailable balance rather than a fabricated numeric balance', () => {
  assert.match(html(), /data-points-balance[^>]*>Unavailable</);
  assert.match(html(), /Unavailable does not mean zero/);
  assert.doesNotMatch(html(), /12,850|125\.00|0\.00/);
});
test('history explicitly distinguishes unavailable from confirmed empty', () => {
  assert.match(html(), /History unavailable/);
  assert.match(html(), /not a confirmed empty history/);
});
test('all three action controls are native disabled buttons', () => {
  const buttons = html().match(/<button\b[^>]*>/g) || [];
  assert.equal(buttons.length, 3);
  for (const button of buttons) { assert.match(button, /disabled=""/); assert.match(button, /type="button"/); }
});
test('explains read-only restrictions to assistive technology', () => {
  assert.match(html(), /role="status"/);
  assert.equal((html().match(/aria-describedby="points-action-restriction"/g) || []).length, 3);
  assert.match(html(), /id="points-action-restriction"/);
});
test('keeps Points separate from RHC identity and Thirdweb connection', () => {
  assert.match(html(), /does not authenticate an RHC account/);
  assert.match(html(), /Wallet connection is not required/);
  assert.match(html(), /not cryptocurrency/);
});
test('component accepts no data, identity, capability or flag arguments', () => {
  const fn = nodes(tree, n => ts.isFunctionDeclaration(n) && n.name?.text === 'PointsReadOnlyPanel')[0];
  assert.ok(fn);
  assert.equal(fn.parameters.length, 0);
  const hostile = { balance: 999999, capabilities: { can_redeem: true }, enabled: true, children: 'INJECTED_BALANCE' };
  assert.equal(renderToStaticMarkup(React.createElement(PointsReadOnlyPanel, hostile)), html());
});
test('panel imports only React, not a provider, runtime, storage or API adapter', () => {
  const imports = nodes(tree, ts.isImportDeclaration).map(n => n.moduleSpecifier.text);
  assert.deepEqual(imports, ['react']);
});
test('panel has no event handler, HTML injection, form or link surface', () => {
  const attrs = nodes(tree, ts.isJsxAttribute).map(n => n.name.getText(tree));
  assert.deepEqual(attrs.filter(n => /^on[A-Z]/.test(n) || ['dangerouslySetInnerHTML', 'href', 'action', 'formAction'].includes(n)), []);
  assert.doesNotMatch(html(), /<(?:form|input|iframe|script|a)\b/);
});
test('panel has no network, storage, effect, time or browser calls', () => {
  assert.equal(nodes(tree, ts.isCallExpression).length, 0);
  const ids = nodes(tree, ts.isIdentifier).map(n => n.text);
  for (const forbidden of ['fetch','XMLHttpRequest','useEffect','useRuntime','useResource','localStorage','sessionStorage','window','navigator','process']) assert.equal(ids.includes(forbidden), false);
});
test('route retains the existing AppShell and navigation, but no demo or mutation client', () => {
  assert.match(pageSource, /<AppShell/);
  assert.match(pageSource, /navFor\('RHC Points'\)/);
  assert.match(pageSource, /<PointsReadOnlyPanel\s*\/>/);
  assert.doesNotMatch(pageSource, /['"]use client['"]|useState|useRuntime|useResource|\/me\/demo-records|\/me\/rewards\/|window\.confirm|crypto\.randomUUID|method\s*:/);
});
test('no browser-facing endpoint is invented by the passive panel', () => {
  assert.doesNotMatch(panelSource, /\/api\/v1\/|\/me\/rewards\/|\/me\/wallet\/|thirdweb\/|https?:\/\//);
});
test('render remains identical when caller-side feature environment values change', () => {
  const original = process.env.NEXT_PUBLIC_ENABLE_REWARDS;
  const before = html();
  try { process.env.NEXT_PUBLIC_ENABLE_REWARDS = 'true'; assert.equal(html(), before); }
  finally { if (original === undefined) delete process.env.NEXT_PUBLIC_ENABLE_REWARDS; else process.env.NEXT_PUBLIC_ENABLE_REWARDS = original; }
  assert.equal(fileURLToPath(new URL('./PointsReadOnlyPanel.tsx', import.meta.url)).endsWith('PointsReadOnlyPanel.tsx'), true);
});