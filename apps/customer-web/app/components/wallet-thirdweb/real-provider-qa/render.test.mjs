import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ThirdwebLocalQa } from "./ThirdwebLocalQa.tsx";

const placeholderClientId = "static_test_client_id_never_network";

for (const mode of ["external-metamask", "embedded-email", "both"]) {
  test("real thirdweb SDK React component server-renders in "+mode+" without any provider call", () => {
    const priorFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error("Test forbids external provider requests");
    };
    try {
      const html = renderToString(createElement(ThirdwebLocalQa, {
        clientId: placeholderClientId,
        chainId: 11155111,
        mode,
      }));
      assert.match(html, /data-rhc-thirdweb-qa="local-real-sdk"/);
      assert.match(html, /Connect approved test wallet/);
      assert.match(html, /RHC wallet link/);
      assert.match(html, /Disconnect test wallet/);
      assert.doesNotMatch(html, new RegExp(placeholderClientId));
      assert.doesNotMatch(html, /Send transaction|Mint token|Approve token|Redeem points/);
      assert.equal(calls, 0);
    } finally {
      globalThis.fetch = priorFetch;
    }
  });
}
test("unapproved chain cannot render any SDK wallet controls", () => {
  const html = renderToString(createElement(ThirdwebLocalQa, {
    clientId: placeholderClientId,
    chainId: 1,
    mode: "external-metamask",
  }));
  assert.equal(html, "");
});
