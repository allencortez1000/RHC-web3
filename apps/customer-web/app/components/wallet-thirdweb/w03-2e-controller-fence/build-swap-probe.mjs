/**
 * W03-2E local-only browser bundler, before/after privacy-regression checkpoints.
 * Refuses to overwrite evidence, import backend/provider SDKs, or create routes.
 */
import fs from "node:fs";
import path from "node:path";
import cp from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const stage=process.argv[2];
if(stage!=="before"&&stage!=="after")throw Error("Stage must be before or after");
const sourceDir=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(sourceDir,"../../../../../..");
const cwd=path.dirname(repo);
const expectedHead="5fe08964a44f47f5be238ac5f2f14ef35b2a5513";
const r=cp.spawnSync("git",["rev-parse","HEAD"],{cwd:repo,encoding:"utf8",windowsHide:true});
if(r.status!==0||r.stdout.trim()!==expectedHead)throw Error("Unrecognized Git base");
const evidence=path.join(cwd,"RHC-web3-allen-wallet-w2a-20261009-evidence/w03-2e-controller-fence-20261013");
const out=path.join(evidence,stage==="before"?"repro-before":"verified-after");
if(!fs.existsSync(out)||fs.readdirSync(out).length!==0)
 throw Error("Target evidence folder missing or not empty");
const output=path.join(out,"app.js");
const built=await build({
 entryPoints:[path.join(sourceDir,"controller-swap-probe.tsx")],outfile:output,
 bundle:true,format:"iife",platform:"browser",jsx:"automatic",target:["es2022"],
 define:{"process.env.NODE_ENV":JSON.stringify("development")},
 minify:false,sourcemap:false,metafile:true,logLevel:"silent",
});
const inputs=Object.keys(built.metafile.inputs);
const forbidden=inputs.filter(x=>
 /(?:node_modules[\\/]+thirdweb[\\/]|node_modules[\\/]+@supabase[\\/]|apps[\\/]+api[\\/]|packages[\\/]+database|node_modules[\\/]+viem)/i.test(x));
if(forbidden.length){
 fs.rmSync(output,{force:true});
 throw Error("Forbidden live/network/provider dependency: "+forbidden.join(","));
}
const html=[
 '<!doctype html><html lang="en"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1">',
 '<meta name="robots" content="noindex,nofollow,noarchive">',
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;self&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; object-src &#39;none&#39;; form-action &#39;none&#39;; frame-src &#39;none&#39;">',
 '<title>RHC W03-2E offline controller-swap regression</title></head>',
 '<body style="margin:0;background:#edf7fb"><div id="w03-2e-root"></div>',
 '<script src="./app.js" defer></script></body></html>',
].join("");
fs.writeFileSync(path.join(out,"index.html"),html,{flag:"wx",encoding:"utf8"});
fs.writeFileSync(path.join(out,"bundle-graph.json"),
 JSON.stringify({stage,base:expectedHead,sdkImports:0,networkCalls:0,forbidden,
  sourceInputs:inputs.sort(),bundleBytes:fs.statSync(output).size},null,2)+"\n",
 {flag:"wx",encoding:"utf8"});
console.log("STAGE="+stage);
console.log("HTML="+path.join(out,"index.html"));
console.log("SOURCE_FILES="+inputs.length);
console.log("FORBIDDEN_DEPENDENCIES="+forbidden.length);
console.log("RESULT=TEST_ONLY_STANDALONE_NO_NETWORK_BUNDLE");
