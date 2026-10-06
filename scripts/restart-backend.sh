#!/bin/bash
set -e

if ! command -v dotnet >/dev/null 2>&1 && [ -x /workspace/.tools/dotnet/dotnet ]; then
  export PATH="/workspace/.tools/dotnet:$PATH"
  export DOTNET_ROOT=/workspace/.tools/dotnet
fi
export DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-${TMPDIR:-/tmp}/bsstore-dotnet-cli}"
export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

echo "Building BS Store Backend in Release mode..."
BUILD_TEMP_ROOT="${TMPDIR:-/tmp}/bsstore-backend-build"
PUBLISH_ARGS=(-c Release -o /workspace/backend/publish -m:1 /p:UseAppHost=false "/p:IntermediateOutputPath=$BUILD_TEMP_ROOT/obj/" "/p:OutputPath=$BUILD_TEMP_ROOT/bin/")
if [ -n "${BSSTORE_NUGET_CONFIG:-}" ]; then
  PUBLISH_ARGS+=("/p:RestoreConfigFile=$BSSTORE_NUGET_CONFIG")
fi
dotnet publish /workspace/backend/src/BSStore.API/BSStore.API.csproj "${PUBLISH_ARGS[@]}"

echo "Triggering backend restart..."
# 1. Update the restart trigger file (systemd watcher will automatically restart if active)
touch /workspace/backend/.restart-trigger

# 2. Attempt systemctl restart if D-Bus is permitted. Otherwise the host-level
#    path watcher handles the trigger file; this script does not expose a restart API.
RESTARTED=false
if systemctl restart bsstore-backend.service 2>/dev/null; then
  echo "Restarted via systemctl (root)."
  RESTARTED=true
elif command -v sudo >/dev/null 2>&1 && sudo systemctl restart bsstore-backend.service 2>/dev/null; then
  echo "Restarted via sudo systemctl."
  RESTARTED=true
fi

if [ "$RESTARTED" = false ]; then
  # Fresh containers may have systemd available but no backend unit yet.
  # Start a durable service there; restricted environments still use the watcher.
  if systemctl show-environment >/dev/null 2>&1 && ! systemctl cat bsstore-backend.service >/dev/null 2>&1; then
    systemd-run --unit=bsstore-backend --description="BS Store API" --collect \
      --service-type=exec --working-directory=/workspace/backend/publish \
      --property=Restart=on-failure --property=RestartSec=2s \
      "$(command -v dotnet)" /workspace/backend/publish/BSStore.API.dll
  else
    echo "systemctl unavailable or D-Bus access restricted. Waiting for the host-level path watcher."
  fi
fi

echo "Verifying backend health..."
READY=false
for i in $(seq 1 15); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5295/health 2>/dev/null || true)
  if [ "$HTTP_CODE" = "200" ]; then
    READY=true
    break
  fi
  sleep 1
done

if [ "$READY" = true ]; then
  echo "✓ BS Store Backend is active, healthy, and running on port 5295!"
  HEALTH_JSON=$(curl -s http://localhost:5295/health 2>/dev/null || true)
  echo "Health status: $HEALTH_JSON"
else
  echo "⚠️ Backend is not healthy yet. Check the host-level path watcher and systemd service."
  exit 1
fi
