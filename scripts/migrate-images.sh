#!/usr/bin/env bash
set -euo pipefail
if [[ $# -gt 1 || ($# -eq 1 && "$1" != "--apply" && "$1" != "--dry-run") ]]; then
  echo "Usage: $0 [--dry-run|--apply]"
  exit 2
fi
if ! command -v dotnet >/dev/null 2>&1; then
  export PATH="/workspace/.tools/dotnet:$PATH"
  export DOTNET_ROOT=/workspace/.tools/dotnet
fi
cd /workspace/backend/publish
args=(BSStore.API.dll --migrate-images)
if [[ "${1:---dry-run}" == "--apply" ]]; then args+=(--apply); fi
exec dotnet "${args[@]}"
