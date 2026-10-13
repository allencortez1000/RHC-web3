/** W03-2C standalone static offline SSR fixture previews. No client JS or network. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OfflineWalletOverview } from "../w03-react-offline/OfflineWalletOverview.tsx";
import { makeMockScope } from "./mock-contract.ts";
import { makeScenarioTransport, OfflineContractController } from "./offline-adapter.ts";

const dir=path.dirname(fileURLToPath(import.meta.url));
const scope=makeMockScope();
const plans=[
  {name:"preview-points.html",scenario:"points"},
  {name:"preview-zero-points.html",scenario:"zero"},
  {name:"preview-stale.html",scenario:"stale"},
  {name:"preview-linked-simulation.html",scenario:"linked_simulation"},
  {name:"preview-denied.html",scenario:"points",reason:"forbidden"},
  {name:"preview-switched.html",scenario:"points",reason:"account_switched"},
];
const HEAD=[
 '<!doctype html><html lang="en"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1">',
 '<meta name="robots" content="noindex,nofollow">',
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; form-action &#39;none&#39;; object-src &#39;none&#39;; base-uri &#39;none&#39;">',
 '<title>RHC W03-2C Contract Rehearsal - Offline</title></head>',
 '<body style="background:#edf7fb;margin:0;padding:16px;min-width:0">',
 '<main style="max-width:1100px;margin:0 auto">',
 '<h1 style="font:750 22px system-ui,sans-serif;color:#133047">W03-2C: Draft Contract Read-Only Rehearsal</h1>',
 '<p style="font:600 14px system-ui,sans-serif;color:#365268">SIMULATED API CONTRACT ONLY. No live RHC API, Thirdweb, RPC, identity or provider connection.</p>',
].join("");
for(const plan of plans){
  const controller=new OfflineContractController(makeScenarioTransport(plan.scenario));
  await controller.load(scope);
  if(plan.reason)controller.clear(plan.reason);
  const state=controller.snapshot();
  const markup=renderToStaticMarkup(React.createElement(OfflineWalletOverview,{state}));
  if(/<script\b|<button\b|<form\b|<input\b|<a\s+href/i.test(markup))
    throw new Error("Unexpected interactive or executable markup");
  const filename=path.join(dir,plan.name);
  if(fs.existsSync(filename))throw new Error("Output exists; refusing overwrite: "+plan.name);
  fs.writeFileSync(filename,HEAD+markup+"</main></body></html>",{encoding:"utf8",flag:"wx"});
  process.stdout.write("OFFLINE_PREVIEW="+filename+"\n");
}
