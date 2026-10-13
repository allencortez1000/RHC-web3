/**
 * Thirdweb lifecycle rehearsal with NO Thirdweb import, provider instance,
 * wallet address, signatures, transaction permissions, chain/RPC calls or storage.
 */
import { isMockScope, type MockScope } from "./draft-contract";
export type LifecyclePhase="disconnected"|"connecting"|"connected_simulation"|"unsupported_network"|"unavailable";
export type LifecycleSnapshot=Readonly<{
  phase:LifecyclePhase;
  syntheticAccount:string|null;
  network:"synthetic-only"|null;
  verifiedRhcLink:false;
  canSign:false;
  canTransact:false;
}>;
export type LifecycleTicket=Readonly<{generation:number;key:string}>;
const EMPTY:LifecycleSnapshot=Object.freeze({
  phase:"disconnected",syntheticAccount:null,network:null,
  verifiedRhcLink:false,canSign:false,canTransact:false,
});
function keyOf(scope:MockScope):string{
  return JSON.stringify([scope.rhcUserId,scope.sessionEpoch,scope.linkRevision,
    scope.sourceRevision,scope.chainId,scope.contractAddress]);
}
function syntheticWallet(x:unknown):x is string {
  return typeof x==="string"&&/^synthetic-wallet-[a-z0-9-]{1,64}$/i.test(x);
}
export class SyntheticThirdwebLifecycle {
  private generation=0;
  private key:string|null=null;
  private snapshotValue:LifecycleSnapshot=EMPTY;
  snapshot():LifecycleSnapshot{return this.snapshotValue;}
  begin(scope:MockScope):LifecycleTicket|null {
    this.generation++;
    this.snapshotValue=EMPTY;
    if(!isMockScope(scope)){this.key=null;return null;}
    this.key=keyOf(scope);
    this.snapshotValue=Object.freeze({...EMPTY,phase:"connecting"});
    return Object.freeze({generation:this.generation,key:this.key});
  }
  complete(ticket:LifecycleTicket,account:unknown):boolean {
    if(!this.key||ticket.generation!==this.generation||ticket.key!==this.key)return false;
    if(!syntheticWallet(account)){
      this.snapshotValue=Object.freeze({...EMPTY,phase:"unavailable"});
      return false;
    }
    this.snapshotValue=Object.freeze({
      phase:"connected_simulation",syntheticAccount:account,
      network:"synthetic-only",verifiedRhcLink:false,canSign:false,canTransact:false,
    });
    return true;
  }
  wrongNetwork(ticket:LifecycleTicket):boolean {
    if(!this.key||ticket.generation!==this.generation||ticket.key!==this.key)return false;
    this.snapshotValue=Object.freeze({...EMPTY,phase:"unsupported_network"});
    return true;
  }
  fail(ticket:LifecycleTicket):boolean {
    if(!this.key||ticket.generation!==this.generation||ticket.key!==this.key)return false;
    this.snapshotValue=Object.freeze({...EMPTY,phase:"unavailable"});
    return true;
  }
  switchScope():void{this.reset();}
  disconnect():void{this.reset();}
  private reset():void{
    this.generation++;this.key=null;this.snapshotValue=EMPTY;
  }
}
