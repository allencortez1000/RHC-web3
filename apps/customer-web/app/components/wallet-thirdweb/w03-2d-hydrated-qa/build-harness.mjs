/**
 * Local-only esbuild packager for the W03-2D hydrated browser test harness.
 * Output is external QA evidence; never an application route or tracked bundle.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cp from "node:child_process";
import { build } from "esbuild";

const sourceDir=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(sourceDir,"../../../../../..");
const workspace=path.dirname(repo);
const evidence=path.join(workspace,"RHC-web3-allen-wallet-w2a-20261009-evidence/w03-2d-hydrated-qa-20261013");
const preview=path.join(evidence,"interactive-preview");
const commit="a5bb6d3163695d9158d9b6ac7bdec2f63c915cfd";
const git=cp.spawnSync("git",["rev-parse","HEAD"],{cwd:repo,encoding:"utf8",windowsHide:true});
if(git.status!==0||git.stdout.trim()!==commit)throw Error("Unknown Git base: refuse local build");
if(!fs.existsSync(preview)||fs.readdirSync(preview).length!==0)throw Error("Preview output not empty");
const entry=path.join(sourceDir,"hydrated-probe.tsx");
const outfile=path.join(preview,"app.js");
const result=await build({
  entryPoints:[entry],outfile,
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",target:["es2022"],
  minify:false,sourcemap:false,metafile:true,write:true,logLevel:"silent",
  define:{"process.env.NODE_ENV":JSON.stringify("development")},
});
const inputs=Object.keys(result.metafile.inputs).sort();
const suspicious=inputs.filter(x=>
 /(?:apps[\\/]+api|packages[\\/]+database|node_modules[\\/]+thirdweb|node_modules[\\/]+@supabase)/i.test(x));
if(suspicious.length){
  fs.rmSync(outfile,{force:true});
  throw Error("Unsafe backend/provider imports: "+suspicious.join(", "));
}
if(inputs.some(x=>/wallet-thirdweb[\\/]+w03-2d-hydrated-qa[\\/]+hydrated-probe/.test(x))===false)
  throw Error("Expected test entry absent from source graph");
const html=[
 '<!doctype html><html lang="en"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1">',
 '<meta name="robots" content="noindex,nofollow,noarchive">',
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;self&#39;; style-src &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; frame-src &#39;none&#39;; object-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">',
 '<title>RHC W03-2D — Hydrated synthetic wallet QA</title></head>',
 '<body style="background:#edf7fb;margin:0;min-width:0">',
 '<div id="w03-2d-root"></div>',
 '<script src="./app.js" defer></script>',
 '</body></html>',
].join("");
fs.writeFileSync(path.join(preview,"index.html"),html,{flag:"wx",encoding:"utf8"});
fs.writeFileSync(path.join(evidence,"BROWSER-BUNDLE-GRAPH.json"),
 JSON.stringify({base:commit,sourceInputs:inputs,inputCount:inputs.length,
   outputBytes:fs.statSync(outfile).size,
   forbiddenDependencies:[],sourceFolder:sourceDir,
   scriptExternalOnly:true,standaloneFilePreview:true},null,2)+"\n",
 {flag:"wx",encoding:"utf8"});
process.stdout.write("LOCAL_QA_HTML="+path.join(preview,"index.html")+"\n");
process.stdout.write("BUNDLE_BYTES="+fs.statSync(outfile).size+"\n");
process.stdout.write("BUNDLE_IMPORT_COUNT="+inputs.length+"\n");
process.stdout.write("RESULT=LOCAL_ONLY_HYDRATED_QA_BUNDLE_CREATED\n");
