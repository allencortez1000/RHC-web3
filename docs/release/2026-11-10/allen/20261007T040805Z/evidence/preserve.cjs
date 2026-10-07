// Read-only Git/source inventories; never reads dotenv or ignored runtime stores.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../../..');
const own = 'docs/release/2026-11-10/allen/20261007T040805Z/';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function git(cwd, ...args) { return cp.execFileSync('git', ['--no-pager', '--no-optional-locks', ...args], { cwd, encoding: 'utf8', timeout: 10000 }); }
function inventory(cwd) {
  const tracked = git(cwd, 'ls-files', '-z').split('\0').filter(Boolean);
  const untracked = git(cwd, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(x => x && !x.startsWith(own));
  const gitDir = git(cwd, 'rev-parse', '--absolute-git-dir').trim();
  const files = [...new Set([...tracked, ...untracked])].sort().map(file => {
    if (/(^|\/)\.env($|\.)/.test(file)) return {path: file, excluded: 'dotenv contents not read'};
    const full = path.join(cwd, file);
    return {path: file, sha256: fs.existsSync(full) ? hash(fs.readFileSync(full)) : null};
  });
  return {cwd, head: git(cwd, 'rev-parse', 'HEAD').trim(), branch: git(cwd, 'branch', '--show-current').trim(), indexSha256: hash(fs.readFileSync(path.join(gitDir, 'index'))), staged: git(cwd, 'diff', '--cached', '--name-status'), tracked, untracked, files, activeOperations: ['MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','rebase-merge','rebase-apply','sequencer','index.lock'].filter(x => fs.existsSync(path.join(gitDir,x)))};
}
function source() {
  const prior = JSON.parse(fs.readFileSync(path.join(root,'docs/release/2026-11-10/allen/20261007T014758Z/run-context.json')));
  const manifest = prior.finalModifiedSource.manifest.map(x => ({...x, sha256: hash(fs.readFileSync(path.join(root,x.path)))}));
  return {manifest, sourceManifestSha256: hash(JSON.stringify(manifest))};
}
const phase = process.argv[2];
if (!['before','after'].includes(phase)) throw Error('Use before or after');
const output = path.join(__dirname, 'preservation-' + phase + '.json');
if (fs.existsSync(output)) throw Error('Refuse evidence overwrite');
const record = {utc: new Date().toISOString(), local: new Date().toString(), scope: 'Tracked/nonignored untracked bytes, index and HEAD; excludes own new follow-up folder, dotenv contents, ignored artifacts and unsaved editor buffers', task: inventory(root), original: inventory(path.resolve(root,'../RHC-web3-combined-1.0')), source: source()};
fs.writeFileSync(output, JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({phase,utc:record.utc,source:record.source.sourceManifestSha256,taskIndex:record.task.indexSha256,active:record.task.activeOperations,originalActive:record.original.activeOperations}));
if (phase === 'after') {
 const before=JSON.parse(fs.readFileSync(path.join(__dirname,'preservation-before.json')));
 const comparisons = Object.fromEntries(['task','original'].map(k=>[k,Object.fromEntries(['head','branch','indexSha256','staged','tracked','untracked','files','activeOperations'].map(f=>[f,JSON.stringify(before[k][f])===JSON.stringify(record[k][f])]))]));
 fs.writeFileSync(path.join(__dirname,'preservation-comparison.json'),JSON.stringify({utc:record.utc,comparisons,sourceUnchanged:before.source.sourceManifestSha256===record.source.sourceManifestSha256},null,2)+'\n');
 console.log(JSON.stringify(comparisons));
}
