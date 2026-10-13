"use client";
import * as React from "react";
import { useEffect, useState, type ReactElement } from "react";
import { OfflineWalletOverview, type OfflinePanelState } from "../w03-react-offline/OfflineWalletOverview";
import { isMockScope, type MockScope } from "./draft-contract";
import { OfflineContractController, refuseConnectedBackend } from "./offline-adapter";

/**
 * Isolated W03 draft-contract client harness; no page mounts this.
 * Connected backend mode is a hard unavailable state, not a hidden fetch path.
 */
export type ContractReadyWalletLabProps=Readonly<{
  mode:"synthetic"|"backend_pending";
  scope:MockScope;
  controller:OfflineContractController;
}>;
const UNAVAILABLE:OfflinePanelState=Object.freeze({kind:"unavailable",reason:"account_switched"});
const LOADING:OfflinePanelState=Object.freeze({kind:"loading"});
function keyOf(scope:MockScope):string {
  if(!isMockScope(scope))return "invalid_scope";
  return JSON.stringify([scope.rhcUserId,scope.sessionEpoch,scope.linkRevision,
    scope.sourceRevision,scope.chainId,scope.contractAddress]);
}
export function ContractReadyWalletLab({
  mode,scope,controller,
}:ContractReadyWalletLabProps):ReactElement {
  const {rhcUserId,sessionEpoch,linkRevision,chainId,contractAddress,sourceRevision}=scope;
  const stableScope=React.useMemo<MockScope>(()=>({
    rhcUserId,sessionEpoch,linkRevision,chainId,contractAddress,sourceRevision,
  }),[rhcUserId,sessionEpoch,linkRevision,chainId,contractAddress,sourceRevision]);
  const key=keyOf(stableScope);
  const signature=mode+"|"+key;
  const [presentation,setPresentation]=useState<Readonly<{signature:string;controller:OfflineContractController;view:OfflinePanelState}>>({
    signature,controller,view:LOADING,
  });
  // Account/session fingerprints can match while the data source changes.
  // Fence the previous source synchronously DURING render, before useEffect runs.
  const view=presentation.signature===signature && presentation.controller===controller
    ? presentation.view : UNAVAILABLE;
  useEffect(()=>{
    let active=true;
    controller.clear("account_switched"); // clear prior-user value before new read
    if(mode!=="synthetic"||key==="invalid_scope"){
      setPresentation({signature,controller,view:mode==="backend_pending"?refuseConnectedBackend():UNAVAILABLE});
      return ()=>{active=false;controller.clear("account_switched")};
    }
    setPresentation({signature,controller,view:LOADING});
    void controller.load(stableScope).then(result=>{
      if(active)setPresentation({signature,controller,view:result});
    }).catch(()=>{
      if(active)setPresentation({signature,controller,view:{kind:"unavailable",reason:"service_unavailable"}});
    });
    return ()=>{active=false;controller.clear("account_switched")};
  },[controller,key,mode,signature,stableScope]);
  return (
    <div data-w03-2c-lab="synthetic-only" data-w03-2c-mode={mode}
      style={{width:"100%",boxSizing:"border-box",maxWidth:1100,margin:"0 auto"}}>
      <p role="note" style={{color:"#365268",fontSize:14,margin:"12px 0"}}>
        W03-2C contract rehearsal — mock memory transport only.
        Backend integration is pending BG-01 through BG-12 approval.
      </p>
      <OfflineWalletOverview state={view}/>
    </div>
  );
}
