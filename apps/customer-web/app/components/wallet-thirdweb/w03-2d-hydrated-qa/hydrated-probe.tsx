"use client";

/**
 * W03-2D local browser-only React hydration probe.
 *
 * This is an internal test harness, not an application route or wallet UI.
 * It imports only the verified mock controller, dummy scenarios and lifecycle.
 * QA buttons trigger fictional test events; no real provider or signer exists.
 */
import * as React from "react";
import { useMemo, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { ContractReadyWalletLab } from "../w03-contract-ready-offline/ContractReadyWalletLab";
import { makeMockScope, buildMockEnvelope, type DraftScenario } from "../w03-contract-ready-offline/mock-contract";
import { OfflineContractController, makeDeferredTransport, MockReadFailure } from "../w03-contract-ready-offline/offline-adapter";
import { SyntheticThirdwebLifecycle } from "../w03-contract-ready-offline/thirdweb-simulator";

const deferred = makeDeferredTransport();
const controller = new OfflineContractController(deferred.transport);
const lifecycle = new SyntheticThirdwebLifecycle();

type HarnessAPI = Readonly<{
  pending(): number;
  resolve(index: number, scenario: DraftScenario, customer: "A" | "B", sessionEpoch?: number): void;
  reject(index: number, reason: "unauthenticated" | "forbidden" | "rate_limited" | "service_unavailable"): void;
  wrongCustomer(index: number): void;
  malformedToken(index: number): void;
  status(): { pending: number; currentScope: string; epoch: number; mode: "synthetic" | "backend_pending" };
}>;
declare global {
  interface Window {
    __RHC_W03_2D_QA__?: HarnessAPI;
  }
}

const A="synthetic-customer-A";
const B="synthetic-customer-B";
const buttonStyle:React.CSSProperties={
  minHeight:44,padding:"10px 12px",borderRadius:9,
  border:"1px solid #a9c7d8",background:"#fff",color:"#133047",
  fontFamily:"system-ui,sans-serif",fontSize:14,fontWeight:650,cursor:"pointer",
};
const controlsStyle:React.CSSProperties={
  display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,170px),1fr))",
  gap:10,padding:14,background:"#eff6fa",border:"1px solid #c8e6f1",borderRadius:14,
};
const NOTE="SIMULATED LOCAL QA ONLY. NO LIVE WALLET, REAL RHC API, RPC, SIGNATURES, OR TRANSACTIONS.";

function MockProbe():ReactElement {
  const [customer,setCustomer]=useState<"A"|"B">("A");
  const [epoch,setEpoch]=useState(1);
  const [mode,setMode]=useState<"synthetic"|"backend_pending">("synthetic");
  const [notice,setNotice]=useState("Ready for invented test responses.");
  const [wallet,setWallet]=useState(lifecycle.snapshot());
  const scope=useMemo(()=>makeMockScope(customer==="A"?A:B,epoch),[customer,epoch]);

  const api=useMemo<HarnessAPI>(()=>Object.freeze({
    pending:()=>deferred.pending(),
    resolve:(index,scenario,id,sessionEpoch=epoch)=>{
      deferred.resolve(index,buildMockEnvelope(makeMockScope(id==="A"?A:B,sessionEpoch),scenario));
    },
    reject:(index,reason)=>deferred.reject(index,new MockReadFailure(reason)),
    wrongCustomer:(index)=>{
      deferred.resolve(index,buildMockEnvelope(makeMockScope(customer==="A"?B:A,epoch),"points"));
    },
    malformedToken:(index)=>{
      const response=buildMockEnvelope(scope,"points") as { data:{ token:{source:string} } };
      response.data.token.source="thirdweb";
      deferred.resolve(index,response);
    },
    status:()=>({pending:deferred.pending(),currentScope:scope.rhcUserId,epoch,mode}),
  }),[customer,epoch,mode,scope]);
  // Expose only invented controls in this unmounted/compiled test entry.
  React.useEffect(()=>{
    window.__RHC_W03_2D_QA__=api;
    return ()=>{delete window.__RHC_W03_2D_QA__};
  },[api]);
  function switchCustomer(to:"A"|"B"){
    setCustomer(to);
    setEpoch(prev=>prev+1);
    setMode("synthetic");
    lifecycle.switchScope();
    setWallet(lifecycle.snapshot());
    setNotice("Synthetic customer changed; previous results must be erased.");
  }
  function mockResolve(scenario:DraftScenario){
    try {
      api.resolve(api.pending()-1,scenario,customer,epoch);
      setNotice("Synthetic response resolved: "+scenario);
    }catch{setNotice("No synthetic request awaiting response.");}
  }
  function mockReject(reason:"unauthenticated"|"forbidden"|"rate_limited"|"service_unavailable"){
    try {
      api.reject(api.pending()-1,reason);
      setNotice("Synthetic response rejected: "+reason);
    }catch{setNotice("No synthetic request awaiting rejection.");}
  }
  function simulateConnect(){
    const ticket=lifecycle.begin(scope);
    if(ticket)lifecycle.complete(ticket,"synthetic-wallet-"+customer);
    setWallet(lifecycle.snapshot());
    setNotice("Synthetic wallet-only lifecycle; RHC link remains NOT verified.");
  }
  function simulateWrongNetwork(){
    const ticket=lifecycle.begin(scope);
    if(ticket)lifecycle.wrongNetwork(ticket);
    setWallet(lifecycle.snapshot());
    setNotice("Synthetic wrong-network state. No RPC request.");
  }
  function simulateDisconnect(){
    lifecycle.disconnect();
    setWallet(lifecycle.snapshot());
    setNotice("Synthetic wallet disconnected; no provider was used.");
  }
  return (
    <main data-w03-2d-synthetic-probe="true" style={{maxWidth:1150,margin:"auto",padding:16,fontFamily:"system-ui,sans-serif",color:"#133047"}}>
      <header>
        <h1 style={{fontSize:25,lineHeight:1.25}}>RHC W03-2D — Hydrated Wallet QA</h1>
        <p style={{color:"#075d7b",fontWeight:750}}>{NOTE}</p>
      </header>
      <section aria-label="Synthetic test controls" style={controlsStyle}>
        <button style={buttonStyle} onClick={()=>switchCustomer("A")} data-action="switch-A">Switch to mock A</button>
        <button style={buttonStyle} onClick={()=>switchCustomer("B")} data-action="switch-B">Switch to mock B</button>
        <button style={buttonStyle} onClick={()=>setEpoch(n=>n+1)} data-action="new-session">New synthetic session</button>
        <button style={buttonStyle} onClick={()=>mockResolve("points")} data-action="resolve-points">Respond: 125 demo points</button>
        <button style={buttonStyle} onClick={()=>mockResolve("zero")} data-action="resolve-zero">Respond: zero demo points</button>
        <button style={buttonStyle} onClick={()=>mockResolve("stale")} data-action="resolve-stale">Respond: stale data</button>
        <button style={buttonStyle} onClick={()=>mockReject("unauthenticated")} data-action="reject-401">Respond: expired session</button>
        <button style={buttonStyle} onClick={()=>mockReject("forbidden")} data-action="reject-403">Respond: forbidden</button>
        <button style={buttonStyle} onClick={()=>mockReject("rate_limited")} data-action="reject-429">Respond: rate limit</button>
        <button style={buttonStyle} onClick={()=>mockReject("service_unavailable")} data-action="reject-503">Respond: service unavailable</button>
        <button style={buttonStyle} onClick={()=>{
          try{api.wrongCustomer(api.pending()-1);setNotice("Wrong-customer fixture rejected by adapter.");}
          catch{setNotice("No pending synthetic request.");}
        }} data-action="wrong-customer">Respond: wrong customer</button>
        <button style={buttonStyle} onClick={()=>{
          try{api.malformedToken(api.pending()-1);setNotice("Unapproved mock token source rejected.");}
          catch{setNotice("No pending synthetic request.");}
        }} data-action="bad-token">Respond: invalid token source</button>
        <button style={buttonStyle} onClick={()=>{setMode("backend_pending");setNotice("Backend pending: hard-disabled, no API call.");}} data-action="backend-pending">Block connected backend</button>
        <button style={buttonStyle} onClick={()=>{setMode("synthetic");setEpoch(n=>n+1);}} data-action="mock-only">Return to mock mode</button>
        <button style={buttonStyle} onClick={simulateConnect} data-action="mock-connect">Simulate wallet connection</button>
        <button style={buttonStyle} onClick={simulateWrongNetwork} data-action="mock-wrong-chain">Simulate wrong network</button>
        <button style={buttonStyle} onClick={simulateDisconnect} data-action="mock-disconnect">Simulate disconnect</button>
      </section>
      <section aria-label="Synthetic current state" style={{padding:"12px 4px",fontSize:14}}>
        <p data-qa-user>Mock user: {scope.rhcUserId}</p>
        <p data-qa-epoch>Mock session generation: {epoch}</p>
        <p data-qa-provider>Simulated Thirdweb lifecycle: <strong>{wallet.phase}</strong></p>
        <p data-qa-capabilities>
          No wallet signing: {String(wallet.canSign)}. No transactions: {String(wallet.canTransact)}.
          No verified RHC link: {String(wallet.verifiedRhcLink)}.
        </p>
        <p role="status" data-qa-notice>{notice}</p>
      </section>
      <ContractReadyWalletLab mode={mode} scope={scope} controller={controller}/>
    </main>
  );
}
const container=document.getElementById("w03-2d-root");
if(!container)throw Error("Missing synthetic QA-only root element");
createRoot(container).render(<MockProbe/>);
