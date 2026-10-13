"use client";
/**
 * Test-only hydrated probe for W03-2C controller-identity replacement.
 * No app route, RHC user session, Thirdweb SDK, API or network.
 */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { ContractReadyWalletLab } from "../w03-contract-ready-offline/ContractReadyWalletLab";
import {
  OfflineContractController, makeScenarioTransport, makeDeferredTransport,
} from "../w03-contract-ready-offline/offline-adapter";
import { makeMockScope } from "../w03-contract-ready-offline/mock-contract";

type ProbeRecord={
  readonly sequence:number;
  readonly prePassiveHadOldPoints:boolean;
  readonly snapshotText:string;
};
declare global {
  interface Window { __RHC_W03_2E_PROBE__?: ProbeRecord; }
}
const scope=makeMockScope("synthetic-customer-A",1);
function IdentityProbe(){
  const [source,setSource]=React.useState(
    ()=>new OfflineContractController(makeScenarioTransport("points")),
  );
  const [replacements,setReplacements]=React.useState(0);
  React.useLayoutEffect(()=>{
    if(replacements===0)return;
    const text=document.querySelector("[data-w03-2c-lab]")?.textContent??"";
    window.__RHC_W03_2E_PROBE__=Object.freeze({
      sequence:replacements,
      prePassiveHadOldPoints:text.includes("SIMULATED RHC Points: 125.00"),
      snapshotText:text.slice(0,180),
    });
  },[source,replacements]);
  function replace(){
    const next=makeDeferredTransport();
    setSource(new OfflineContractController(next.transport));
    setReplacements(n=>n+1);
  }
  return (
    <main style={{fontFamily:"system-ui,sans-serif",padding:16}}>
      <h1>RHC W03-2E — Synthetic controller swap privacy regression</h1>
      <p data-qa-disclaimer>
        SYNTHETIC OFFLINE SECURITY QA. No real user, Thirdweb SDK, RHC API, RPC, signing, transactions, or wallet enrollment.
      </p>
      <button data-qa-swap-controller type="button" onClick={replace}
        style={{minHeight:44,padding:12,border:"1px solid #888",borderRadius:10}}>
        Replace in-memory data controller (same account and session)
      </button>
      <p data-qa-replacements>Controller replacements: {replacements}</p>
      <ContractReadyWalletLab controller={source} scope={scope} mode="synthetic"/>
    </main>
  );
}
const root=document.getElementById("w03-2e-root");
if(!root)throw Error("QA root missing");
createRoot(root).render(<IdentityProbe/>);
