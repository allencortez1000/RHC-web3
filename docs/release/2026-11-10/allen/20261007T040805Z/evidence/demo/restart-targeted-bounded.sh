#!/bin/sh
# Explicit future restart only; not executed during the completed continuation.
# Run from the worktree root. This unused label is exclusive and cannot overwrite prior logs.
# Fresh store each time; same two cells and original limits; foreign fixed listener => BLOCKED.
exec 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/tools/node-v22.20.0-win-x64/node.exe' \
  'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/run.cjs' \
  demo-targeted-delayed503-j4-j5-02 offline 900000 \
  'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/demo/supervisor.cjs' \
  --execute --parent-builds-complete --parent-intercepted-suites-complete \
  --selection delayed503-j4-j5 \
  --runner 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/run.cjs'
