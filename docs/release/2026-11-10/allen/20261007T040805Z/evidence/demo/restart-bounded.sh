#!/bin/sh
# Manual follow-up only; not executed by the completed task.
# Require exclusive frontend .next use and parent coordination before invoking.
# Fixed ports and dotenv filenames are rechecked by the supervisor; foreign => BLOCKED.
# Unique label refuses overwrite. Earlier stores/evidence are never reset or reused.
exec 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/tools/node-v22.20.0-win-x64/node.exe' \
  'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/run.cjs' \
  demo-owned-exercise-04 offline 900000 \
  'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/demo/supervisor.cjs' \
  --execute --parent-builds-complete --parent-intercepted-suites-complete \
  --runner 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3/docs/release/2026-11-10/allen/20261007T040805Z/evidence/run.cjs'
