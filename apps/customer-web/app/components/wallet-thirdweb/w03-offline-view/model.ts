/** W03-2 isolated, unmounted, SYNTHETIC-only UI model. Contract v0.1 is DRAFT.
 * NO API, SDK, network, wallet operations, signatures or persistence. */
export const FIXTURE_MARKER = "W03_OFFLINE_SYNTHETIC_ONLY" as const;
export type LinkState = "unknown"|"unlinked"|"pending"|"linked"|"revoked"|"conflict";
export type DataStatus = "not_approved"|"disabled"|"unavailable"|"stale"|"unsupported"|"observed";
export type HistoryStatus = "disabled"|"unavailable"|"stale"|"unsupported"|"observed"|"empty";
export type Scope = Readonly<{
  rhcUserId:string; sessionEpoch:number; linkRevision:string;
  chainId:string|null; contractAddress:string|null; sourceRevision:string;
}>;
export type HistoryFixture = Readonly<{status:HistoryStatus; itemCount:number|null; coverageComplete:boolean}>;
export type OfflineFixture = Readonly<{
  fixtureKind:typeof FIXTURE_MARKER;
  scope:Scope;
  link:Readonly<{state:LinkState; verification:"not_verified"|"server_verified_simulation"; durableProofSimulation:boolean}>;
  points:Readonly<{status:DataStatus; balanceDecimal:string|null; history:HistoryFixture}>;
  token:Readonly<{status:DataStatus; balanceStatus:DataStatus; rawBaseUnits:string|null; decimals:number|null; history:HistoryFixture}>;
}>;
export type ViewModel = Readonly<{
  fixtureNotice:string; accountKey:string; linkLabel:string; pointsLabel:string;
  pointsHistoryLabel:string; tokenLabel:string; tokenHistoryLabel:string;
  warnings:readonly string[];
  capabilities:Readonly<{canConnect:false;canLink:false;canTransfer:false;canApprove:false;canTrade:false;canRedeem:false}>;
}>;
const CAPABILITIES = Object.freeze({canConnect:false,canLink:false,canTransfer:false,canApprove:false,canTrade:false,canRedeem:false} as const);
const NOTICE = "SYNTHETIC OFFLINE FIXTURE — NOT LIVE WALLET, RHC API, OR BLOCKCHAIN DATA";

export function formatTokenBaseUnits(raw:string|null, decimals:number|null):string|null {
  if(raw === null || !/^[0-9]+$/.test(raw) || decimals === null ||
    !Number.isInteger(decimals) || decimals < 0 || decimals > 255) return null;
  const digits=raw.replace(/^0+(?=\d)/,"");
  if(decimals === 0) return digits;
  const padded=digits.padStart(decimals+1,"0");
  const fractional=padded.slice(-decimals).replace(/0+$/,"");
  return padded.slice(0,-decimals)+(fractional ? "."+fractional : "");
}
export function validPointsDecimal(value:string|null):value is string {
  return value !== null && /^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(value);
}
export function historyLabel(h:HistoryFixture, noun:string):string {
  switch(h.status){
    case "disabled":return noun+" history disabled (synthetic)";
    case "unsupported":return noun+" history unsupported (synthetic)";
    case "unavailable":return noun+" history unavailable, not empty";
    case "stale":return noun+" history stale; no fresh claim";
    case "observed":
    case "empty":
      if(!h.coverageComplete || h.itemCount===null || !Number.isSafeInteger(h.itemCount) || h.itemCount<0 ||
        (h.status==="empty" && h.itemCount!==0)) return noun+" history unavailable — incomplete coverage";
      return h.itemCount===0
        ? noun+" history: simulated covered empty page"
        : noun+" history: "+h.itemCount+" synthetic entries";
  }
}
export function deriveOfflineView(f:OfflineFixture):ViewModel {
  if(!f || f.fixtureKind!==FIXTURE_MARKER) throw new Error("W03 fixture-only view rejected non-synthetic input");
  let linkLabel="Wallet link unknown — no verified backend state";
  if(f.link.state==="linked"){
    linkLabel=f.link.verification==="server_verified_simulation" && f.link.durableProofSimulation
      ? "Linked in synthetic proof simulation — NOT live verified"
      : "Wallet linked claim rejected — no server proof";
  } else if(f.link.state!=="unknown") linkLabel="Wallet "+f.link.state+" — synthetic only";
  let pointsLabel="RHC Points unavailable — not zero";
  if(f.points.status==="observed"){
    pointsLabel=validPointsDecimal(f.points.balanceDecimal)
      ? "SIMULATED RHC Points: "+f.points.balanceDecimal+" points"
      : "RHC Points unavailable — invalid synthetic value";
  } else if(f.points.status==="stale") pointsLabel="RHC Points stale — no cached total";
  else if(f.points.status==="disabled") pointsLabel="RHC Points disabled";
  else if(f.points.status==="unsupported") pointsLabel="RHC Points unsupported";
  let tokenLabel="RHC token not approved / unavailable — NOT zero";
  if(f.token.status==="observed" && f.token.balanceStatus==="observed"){
    const amount=formatTokenBaseUnits(f.token.rawBaseUnits,f.token.decimals);
    tokenLabel=amount===null?"Token amount unavailable — invalid synthetic precision"
      :"SIMULATED token amount: "+amount+" (NOT an official RHC balance)";
  } else if(f.token.status==="stale" || f.token.balanceStatus==="stale") tokenLabel="Token source stale — no live balance claim";
  else if(f.token.status==="disabled") tokenLabel="Token reads disabled";
  else if(f.token.status==="unsupported") tokenLabel="Token reads unsupported";
  return Object.freeze({
    fixtureNotice:NOTICE, accountKey:f.scope.rhcUserId,linkLabel,pointsLabel,tokenLabel,
    pointsHistoryLabel:historyLabel(f.points.history,"Points"),
    tokenHistoryLabel:historyLabel(f.token.history,"Token"),
    warnings:Object.freeze(["No approved backend wallet-link proof","OFF-25 official token identity FAIL/BLOCKED"]),
    capabilities:CAPABILITIES,
  });
}
/** Stale async completions never cross user / session / chain / source boundaries. */
export class OfflineGenerationGuard<T> {
  private generation=0;
  private fingerprint:string|null=null;
  private result:T|null=null;
  begin(s:Scope):Readonly<{generation:number;fingerprint:string}> {
    this.generation++;this.result=null;
    this.fingerprint=JSON.stringify([s.rhcUserId,s.sessionEpoch,s.linkRevision,s.chainId,s.contractAddress,s.sourceRevision]);
    return Object.freeze({generation:this.generation,fingerprint:this.fingerprint});
  }
  accept(t:Readonly<{generation:number;fingerprint:string}>,data:T):boolean {
    if(this.fingerprint===null || t.generation!==this.generation || t.fingerprint!==this.fingerprint) return false;
    this.result=data;return true;
  }
  invalidate():void{this.generation++;this.fingerprint=null;this.result=null;}
  current():T|null{return this.result;}
}
