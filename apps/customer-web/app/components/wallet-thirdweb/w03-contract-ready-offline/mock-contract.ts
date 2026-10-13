/** Invented response producer for an UNAPPROVED W03 proposal. No real network or provider. */
import { DRAFT_VERSION, OFFLINE_SOURCE, type MockScope } from "./draft-contract";
export type DraftScenario = "unknown"|"points"|"zero"|"stale"|"unlinked"|"linked_simulation"|"points_empty";
export function makeMockScope(rhcUserId="synthetic-customer-A",sessionEpoch=1):MockScope {
  return {rhcUserId,sessionEpoch,linkRevision:"synthetic-link-r1",sourceRevision:"synthetic-source-r1",
    chainId:null,contractAddress:null};
}
export function buildMockEnvelope(scope:MockScope,scenario:DraftScenario="unknown"):unknown {
  const pointsVisible=["points","zero","points_empty","linked_simulation"].includes(scenario);
  const points=pointsVisible?{
    source:"rhc_synthetic_points_view",status:"synthetic_read_only",
    balance_decimal:scenario==="zero"?"0.00":"125.00",unit:"RHC_POINTS",
    history:scenario==="points_empty"?{status:"empty",items:[],coverage_complete:true}:
      {status:"observed",items:["synthetic-ref-1","synthetic-ref-2"],coverage_complete:true},
  }:{
    source:"rhc_synthetic_points_view",
    status:scenario==="stale"?"stale":"unavailable",
    balance_decimal:null,unit:"RHC_POINTS",
    history:{status:scenario==="stale"?"stale":"unavailable",items:null,coverage_complete:false},
  };
  const linked=scenario==="linked_simulation";
  const walletLink={
    state:linked?"linked":scenario==="unlinked"?"unlinked":"unknown",
    verification:linked?"server_verified":"not_verified",
    link_id:linked?"synthetic-linkproof-A":null,
    chain_id:null,
    address_display:linked?"synthetic-wallet-A":null,
    revision:scope.linkRevision,
  };
  return {
    success:true,
    data:{
      contract_version:DRAFT_VERSION, wallet_view_mode:"READ_ONLY_INTERNAL_PILOT",
      as_of:"2026-10-13T00:00:00.000Z",rhc_user_id:scope.rhcUserId,
      scope_revision:scope.sourceRevision,
      source:OFFLINE_SOURCE,
      wallet_link:walletLink,points,
      token:{
        source:"none", status:"not_approved",chain_id:null,contract_address:null,
        official_identity:"not_verified",
        balance:{status:"unavailable",raw_base_units:null,decimals:null},
        history:{status:"unsupported",items:null,coverage_complete:false},
      },
      capabilities:{
        can_connect:false,can_link:false,can_transfer:false,
        can_approve:false,can_trade:false,can_redeem:false,
      },
    },
    meta:{request_id:"synthetic-request-0001"},
  };
}
