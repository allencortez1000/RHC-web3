/**
 * W03-2C in-memory mock adapter only. A live API implementation is intentionally
 * absent; no cookie, bearer token, endpoint, RPC, Thirdweb SDK or browser cache.
 */
import type { OfflinePanelState, OfflineUnavailableReason } from "../w03-react-offline/OfflineWalletOverview";
import { decodeSyntheticDraft, isMockScope, type MockScope } from "./draft-contract";
import { buildMockEnvelope, type DraftScenario } from "./mock-contract";

const trusted = new WeakSet<object>();
type MockTransport = Readonly<{ kind:"in_memory_synthetic"; read(scope:MockScope):Promise<unknown> }>;
export type DeferredMock = Readonly<{
  transport:MockTransport;
  pending():number;
  resolve(index:number,payload:unknown):void;
  reject(index:number,reason:unknown):void;
}>;
export class MockReadFailure extends Error {
  readonly reason:OfflineUnavailableReason;
  constructor(reason:OfflineUnavailableReason) {super("Synthetic read unavailable");this.name="MockReadFailure";this.reason=reason;}
}
function mark(read:(scope:MockScope)=>Promise<unknown>):MockTransport {
  const t:object=Object.freeze({kind:"in_memory_synthetic",read});
  trusted.add(t);return t as MockTransport;
}
function cloneScope(s:MockScope):MockScope {
  return Object.freeze({...s});
}
function fingerprint(s:MockScope):string {
  return JSON.stringify([s.rhcUserId,s.sessionEpoch,s.linkRevision,
    s.chainId,s.contractAddress,s.sourceRevision]);
}
export function makeScenarioTransport(scenario:DraftScenario):MockTransport {
  return mark(async scope=>buildMockEnvelope(scope,scenario));
}
/** Manual deferred responses for deterministic race/timeout simulations (no timers). */
export function makeDeferredTransport():DeferredMock {
  const pending:Array<{done:boolean;resolve:(value:unknown)=>void;reject:(reason:unknown)=>void}>=[];
  const transport=mark(async()=>new Promise((resolve,reject)=>{
    pending.push({done:false,resolve,reject});
  }));
  return Object.freeze({
    transport,
    pending:()=>pending.length,
    resolve:(index:number,payload:unknown)=>{
      const entry=pending[index];
      if(!entry||entry.done)throw new Error("Missing or already settled synthetic request");
      entry.done=true;entry.resolve(payload);
    },
    reject:(index:number,reason:unknown)=>{
      const entry=pending[index];
      if(!entry||entry.done)throw new Error("Missing or already settled synthetic request");
      entry.done=true;entry.reject(reason);
    },
  });
}
function normalizeFailure(error:unknown):OfflineUnavailableReason {
  if(error instanceof MockReadFailure)return error.reason;
  return "service_unavailable";
}
const INITIAL:OfflinePanelState=Object.freeze({kind:"unavailable",reason:"unknown"});
export class OfflineContractController {
  private generation=0;
  private lastKey:string|null=null;
  private state:OfflinePanelState=INITIAL;
  private readonly transport:MockTransport;

  constructor(transport:MockTransport){
    if(!transport || !trusted.has(transport))throw new Error("Unapproved transport refused: synthetic-only adapter");
    this.transport=transport;
  }
  snapshot():OfflinePanelState {return this.state;}
  clear(reason:OfflineUnavailableReason="account_switched"):OfflinePanelState {
    this.generation++;this.lastKey=null;
    this.state=Object.freeze({kind:"unavailable",reason});
    return this.state;
  }
  async load(input:MockScope):Promise<OfflinePanelState> {
    const ticket=++this.generation;
    if(!isMockScope(input)){
      this.lastKey=null;
      this.state=Object.freeze({kind:"unavailable",reason:"conflict"});
      return this.state;
    }
    const scope=cloneScope(input);
    const key=fingerprint(scope);
    this.lastKey=key;
    this.state=Object.freeze({kind:"loading"});
    try{
      const envelope=await this.transport.read(scope);
      if(this.generation!==ticket||this.lastKey!==key)
        return Object.freeze({kind:"unavailable",reason:"account_switched"});
      const decoded=decodeSyntheticDraft(envelope,scope);
      this.state=decoded.ok
        ? Object.freeze({kind:"fixture",fixture:decoded.fixture})
        : Object.freeze({kind:"unavailable",reason:decoded.code==="account_mismatch"?"conflict":"unknown"});
      return this.state;
    }catch(error){
      if(this.generation!==ticket||this.lastKey!==key)
        return Object.freeze({kind:"unavailable",reason:"account_switched"});
      this.state=Object.freeze({kind:"unavailable",reason:normalizeFailure(error)});
      return this.state;
    }
  }
}
export function refuseConnectedBackend():OfflinePanelState {
  // This is a guard, NOT a dormant live fetch path. Owners must accept BG-01..12
  // before a separately reviewed transport is added in a later checkpoint.
  return Object.freeze({kind:"unavailable",reason:"service_unavailable"});
}
