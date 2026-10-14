import test from 'node:test';
import assert from 'node:assert/strict';
import { getQaWalletChoice, assertQaWalletPath } from './wallet-choice.ts';

test('both mode defaults to email with MetaMask strictly optional', () => {
  const c = getQaWalletChoice('both');
  assert.deepEqual(c, { primary: 'embedded-email', optional: 'external-metamask', primaryLabel: 'Continue with email' });
  assert.equal(Object.isFrozen(c), true);
});
test('email-only mode exposes no external wallet', () => {
  const c = getQaWalletChoice('embedded-email');
  assert.equal(c.primary, 'embedded-email');
  assert.equal(c.optional, null);
});
test('explicit external-only authorization is preserved', () => {
  const c = getQaWalletChoice('external-metamask');
  assert.equal(c.primary, 'external-metamask');
  assert.equal(c.optional, null);
});
for (const mode of ['embedded-email', 'both']) {
  test('email choice is permitted in ' + mode, () => assert.equal(assertQaWalletPath(mode, 'embedded-email'), 'embedded-email'));
}
for (const mode of ['external-metamask', 'both']) {
  test('external choice is permitted only when enabled: ' + mode, () => assert.equal(assertQaWalletPath(mode, 'external-metamask'), 'external-metamask'));
}
test('email-only configuration rejects a requested MetaMask fallback', () => assert.throws(() => assertQaWalletPath('embedded-email', 'external-metamask')));
test('external-only configuration cannot silently enable email enrollment', () => assert.throws(() => assertQaWalletPath('external-metamask', 'embedded-email')));
for (const unknown of [undefined, null, '', 'all', 'guest', 'wallet', 'jwt']) {
  test('unapproved mode rejected: ' + String(unknown), () => assert.throws(() => getQaWalletChoice(unknown)));
}
for (const request of [undefined, null, '', 'guest', 'wallet', 'google', 'jwt', 'personal_sign']) {
  test('unknown requested method rejected: ' + String(request), () => assert.throws(() => assertQaWalletPath('both', request)));
}
test('null cannot match the absent optional method in email-only mode', () => assert.throws(() => assertQaWalletPath('embedded-email', null)));
