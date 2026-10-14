import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { ThirdwebLocalQa } from './ThirdwebLocalQa.tsx';

const placeholderClientId = 'static_test_client_id_never_network';
for (const mode of ['external-metamask', 'embedded-email', 'both']) {
  test('real SDK SSR preserves allowed wallet choice in ' + mode + ' without a provider call', () => {
    const priorFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error('Test forbids external provider requests'); };
    try {
      const html = renderToString(createElement(ThirdwebLocalQa, { clientId: placeholderClientId, chainId: 11155111, mode }));
      assert.match(html, /data-rhc-thirdweb-qa="local-real-sdk"/);
      assert.match(html, /RHC wallet link/);
      assert.match(html, /Disconnect test wallet/);
      assert.doesNotMatch(html, new RegExp(placeholderClientId));
      assert.doesNotMatch(html, /Send transaction|Mint token|Approve token|Redeem points/);
      if (mode === 'external-metamask') {
        assert.match(html, /data-qa-connect-primary="external-metamask"/);
        assert.match(html, /Connect approved test wallet/);
        assert.doesNotMatch(html, /Continue with email/);
      } else {
        assert.match(html, /data-qa-connect-primary="embedded-email"/);
        assert.match(html, /Continue with email/);
        assert.match(html, /MetaMask and browser extensions are not required/);
      }
      if (mode === 'both') {
        assert.match(html, /<details[^>]*data-qa-advanced-wallet/);
        assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|[ >])/);
        assert.match(html, /Connect MetaMask \(optional\)/);
        assert.ok(html.indexOf('Continue with email') < html.indexOf('Connect MetaMask (optional)'));
      } else {
        assert.doesNotMatch(html, /data-qa-connect-external/);
      }
      assert.equal(calls, 0);
    } finally { globalThis.fetch = priorFetch; }
  });
}
test('unapproved chain renders no SDK wallet controls', () => {
  assert.equal(renderToString(createElement(ThirdwebLocalQa, { clientId: placeholderClientId, chainId: 1, mode: 'both' })), '');
});
