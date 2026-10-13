/**
 * W03-2C DRAFT decoder. Simulated envelopes ONLY, not the approved RHC API.
 * BG-01..BG-12 are pending; never feed a live API response into this decoder.
 * This decoder does not fetch, sign, persist, authorize or select a real customer.
 */
import { FIXTURE_MARKER, type OfflineFixture, type HistoryFixture, type Scope } from "../w03-offline-view/model";

export const DRAFT_VERSION = "w03.proposal.v0.1" as const;
export const OFFLINE_SOURCE = "w03-2c-synthetic-in-memory" as const;
export type MockScope = Scope;
export type DecodeFailure =
  | "invalid_scope" | "invalid_envelope" | "contract_mismatch"
  | "account_mismatch" | "unapproved_capability" | "untrusted_source";
export type DecodeResult =
  | Readonly<{ ok: true; fixture: OfflineFixture }>
  | Readonly<{ ok: false; code: DecodeFailure }>;
type Dict = Record<string, unknown>;
const FLAGS = ["can_connect", "can_link", "can_transfer", "can_approve", "can_trade", "can_redeem"] as const;
const STATES = ["unknown", "unlinked", "pending", "linked", "revoked", "conflict"] as const;
const HISTORY = ["disabled", "unavailable", "stale", "unsupported", "observed", "empty"] as const;
const EMPTY = Object.freeze({status:"unavailable", itemCount:null, coverageComplete:false} as const);

function obj(x:unknown): x is Dict {
  return x!==null && typeof x==="object" && !Array.isArray(x) &&
    (Object.getPrototypeOf(x)===Object.prototype || Object.getPrototypeOf(x)===null);
}
function hasOnlyKeys(o:Dict,keys:readonly string[]): boolean {
  return Object.keys(o).every(k=>keys.includes(k));
}
function text(x:unknown,n=128):x is string{return typeof x==="string"&&x.length>0&&x.length<=n;}
function eq<T extends string>(x:unknown,allowed:readonly T[]):x is T{return typeof x==="string"&&(allowed as readonly string[]).includes(x);}
function isSyntheticId(s:unknown):s is string {return typeof s==="string"&&/^synthetic-[a-z0-9-]{1,72}$/i.test(s);}
function revision(x:unknown):x is string{return typeof x==="string"&&/^synthetic-[a-z0-9-]{1,80}$/i.test(x);}
function isPoints(x:unknown):x is string {return typeof x==="string"&&/^(0|[1-9]\d{0,15})\.\d{2}$/.test(x);}
function isUtcTimestamp(x:unknown):x is string {
  return typeof x==="string"&&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)&&
    Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
}
function fail(code:DecodeFailure):DecodeResult{return Object.freeze({ok:false,code});}
export function isMockScope(s:unknown):s is MockScope {
  if(!obj(s))return false;
  return hasOnlyKeys(s,["rhcUserId","sessionEpoch","linkRevision","chainId","contractAddress","sourceRevision"]) &&
    isSyntheticId(s.rhcUserId)&&Number.isSafeInteger(s.sessionEpoch)&&
    (s.sessionEpoch as number)>=0&&revision(s.linkRevision)&&
    s.chainId===null&&s.contractAddress===null&&revision(s.sourceRevision);
}
function history(input:unknown):HistoryFixture|null {
  if(!obj(input)||!hasOnlyKeys(input,["status","items","coverage_complete"]))return null;
  if(!eq(input.status,HISTORY)||typeof input.coverage_complete!=="boolean")return null;
  const supported=input.status==="observed"||input.status==="empty";
  if(!supported){
    if(input.items!==null||input.coverage_complete!==false)return null;
    return {status:input.status,itemCount:null,coverageComplete:false};
  }
  if(!Array.isArray(input.items)||!input.coverage_complete||input.items.length>25)return null;
  // Records are opaque here: no personal data, real customer IDs or line items accepted.
  if(!input.items.every(x=>typeof x==="string"&&/^synthetic-ref-[0-9]{1,4}$/.test(x)))return null;
  if(input.status==="empty"&&input.items.length!==0)return null;
  if(input.status==="observed"&&input.items.length===0)return null;
  return {status:input.status,itemCount:input.items.length,coverageComplete:true};
}
/** No live provider source can pass this parser, even if fields mimic the draft. */
export function decodeSyntheticDraft(input:unknown,scope:MockScope):DecodeResult {
  if(!isMockScope(scope))return fail("invalid_scope");
  if(!obj(input)||!hasOnlyKeys(input,["success","data","meta"])||input.success!==true||
      !obj(input.meta)||!hasOnlyKeys(input.meta,["request_id"])||
      !text(input.meta.request_id)||!/^[a-z0-9-]{1,80}$/i.test(input.meta.request_id as string)||
      !obj(input.data))return fail("invalid_envelope");
  const d=input.data;
  if(!hasOnlyKeys(d,["contract_version","wallet_view_mode","as_of","rhc_user_id","scope_revision","wallet_link","points","token","capabilities","source"]))return fail("invalid_envelope");
  if(d.contract_version!==DRAFT_VERSION||d.wallet_view_mode!=="READ_ONLY_INTERNAL_PILOT")return fail("contract_mismatch");
  if(d.source!==OFFLINE_SOURCE)return fail("untrusted_source");
  if(d.rhc_user_id!==scope.rhcUserId||d.scope_revision!==scope.sourceRevision)return fail("account_mismatch");
  if(!isUtcTimestamp(d.as_of))return fail("invalid_envelope");
  if(!obj(d.capabilities)||!hasOnlyKeys(d.capabilities,FLAGS)||
      !FLAGS.every(k=>d.capabilities && (d.capabilities as Dict)[k]===false))return fail("unapproved_capability");
  if(!obj(d.wallet_link)||!hasOnlyKeys(d.wallet_link,["state","verification","link_id","chain_id","address_display","revision"])||
      !eq(d.wallet_link.state,STATES))return fail("invalid_envelope");
  const link=d.wallet_link;
  const linked=link.state==="linked";
  if(link.chain_id!==null||link.revision!==scope.linkRevision ||
    !eq(link.verification,["not_verified","server_verified"] as const))return fail("invalid_envelope");
  if(linked){
    if(link.verification!=="server_verified"||!revision(link.link_id)||
      !isSyntheticId(link.address_display))return fail("invalid_envelope");
  }else if(link.verification!=="not_verified"||link.link_id!==null||link.address_display!==null){
    return fail("invalid_envelope");
  }
  if(!obj(d.points)||!hasOnlyKeys(d.points,["source","status","balance_decimal","unit","history"])||
      d.points.source!=="rhc_synthetic_points_view"||d.points.unit!=="RHC_POINTS"||
      !eq(d.points.status,["synthetic_read_only","disabled","unavailable","stale","unsupported"] as const))
    return fail("invalid_envelope");
  const ps=d.points;
  const pointsHistory=history(ps.history);
  if(pointsHistory===null)return fail("invalid_envelope");
  if(ps.status==="synthetic_read_only"){
    if(!isPoints(ps.balance_decimal))return fail("invalid_envelope");
  }else if(ps.balance_decimal!==null)return fail("invalid_envelope");
  if(!obj(d.token)||!hasOnlyKeys(d.token,["source","status","chain_id","contract_address","official_identity","balance","history"]))return fail("invalid_envelope");
  const token=d.token;
  if(token.source!=="none"||token.status!=="not_approved"||token.chain_id!==null||
    token.contract_address!==null||token.official_identity!=="not_verified"||
    !obj(token.balance)||!hasOnlyKeys(token.balance,["status","raw_base_units","decimals"])||
    token.balance.status!=="unavailable"||token.balance.raw_base_units!==null||token.balance.decimals!==null)
    return fail("untrusted_source");
  const tokenHistory=history(token.history);
  if(tokenHistory===null||tokenHistory.status!=="unsupported")return fail("untrusted_source");
  const fixture:OfflineFixture={
    fixtureKind:FIXTURE_MARKER,
    scope:{rhcUserId:scope.rhcUserId,sessionEpoch:scope.sessionEpoch,
      linkRevision:scope.linkRevision,chainId:null,contractAddress:null,sourceRevision:scope.sourceRevision},
    link:{state:link.state as OfflineFixture["link"]["state"],verification:linked?"server_verified_simulation":"not_verified",durableProofSimulation:linked},
    points:{status:(ps.status==="synthetic_read_only"?"observed":ps.status) as OfflineFixture["points"]["status"],
      balanceDecimal:ps.status==="synthetic_read_only"?(ps.balance_decimal as string):null,
      history:pointsHistory},
    token:{status:"not_approved",balanceStatus:"unavailable",rawBaseUnits:null,decimals:null,
      history:tokenHistory},
  };
  return Object.freeze({ok:true,fixture:Object.freeze(fixture)});
}
export const EMPTY_HISTORY = EMPTY;
