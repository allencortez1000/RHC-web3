/** Static synthetic HTML preview generator. Only writes preview.html beside this file. */
import {writeFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {FIXTURE_MARKER,deriveOfflineView} from "./model.ts";
import {renderStandaloneOfflineHtml} from "./render.ts";
const synthetic = {
 fixtureKind:FIXTURE_MARKER,
 scope:{rhcUserId:"synthetic-customer-0001",sessionEpoch:1,linkRevision:"not-proven",chainId:null,contractAddress:null,sourceRevision:"synthetic-v0"},
 link:{state:"unknown",verification:"not_verified",durableProofSimulation:false},
 points:{status:"observed",balanceDecimal:"125.00",history:{status:"observed",itemCount:2,coverageComplete:true}},
 token:{status:"not_approved",balanceStatus:"unavailable",rawBaseUnits:null,decimals:null,history:{status:"unsupported",itemCount:null,coverageComplete:false}},
};
const path=join(dirname(fileURLToPath(import.meta.url)),"preview.html");
writeFileSync(path,renderStandaloneOfflineHtml(deriveOfflineView(synthetic)),{encoding:"utf8",flag:"wx"});
console.log("Created synthetic-only local preview:",path);
