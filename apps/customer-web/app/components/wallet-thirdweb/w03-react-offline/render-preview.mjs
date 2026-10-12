/**
 * Explicitly offline fixture-only HTML renderer. Creates standalone local files
 * with strict CSP. Not imported by any Next.js production route.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OfflineWalletOverview } from "./OfflineWalletOverview.tsx";
import { makeSyntheticWalletFixture } from "./fixtures.ts";

const folder = path.dirname(fileURLToPath(import.meta.url));
const header = [
  "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">",
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
  "<meta name=\"robots\" content=\"noindex,nofollow\">",
  "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; ",
  "style-src 'unsafe-inline'; img-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'\">",
  "<title>RHC W03 React Offline Wallet Rehearsal</title></head>",
  "<body style=\"background:#edf7fb;margin:0;padding:16px;min-width:0\">",
  "<main style=\"max-width:1100px;margin:0 auto\"><h1 style=\"font-family:system-ui,sans-serif;color:#133047;font-size:21px\">RHC Offline Wallet Review</h1>",
].join("");

const footer = "</main></body></html>";
const outputs = [
  {
    name: "preview.html",
    state: { kind: "fixture", fixture: makeSyntheticWalletFixture("points") },
  },
  {
    name: "preview-unavailable.html",
    state: { kind: "unavailable", reason: "unauthenticated" },
  },
];

for (const output of outputs) {
  const pathname = path.join(folder, output.name);
  const markup = renderToStaticMarkup(React.createElement(OfflineWalletOverview, { state: output.state }));
  if (markup.includes("<script") || markup.includes("<form") || markup.includes("<button")) {
    throw new Error("Unsafe markup in W03 offline preview");
  }
  fs.writeFileSync(pathname, header + markup + footer, { encoding: "utf8", flag: "w" });
  process.stdout.write("LOCAL_OFFLINE_PREVIEW=" + pathname + "\n");
}
