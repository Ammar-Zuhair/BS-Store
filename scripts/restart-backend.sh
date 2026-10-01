#!/bin/bash
set -e

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

# 2. Attempt systemctl restart if D-Bus is permitted, otherwise trigger HTTP restart or process signal
RESTARTED=false
if systemctl restart bsstore-backend.service 2>/dev/null; then
  echo "Restarted via systemctl (root)."
  RESTARTED=true
elif command -v sudo >/dev/null 2>&1 && sudo systemctl restart bsstore-backend.service 2>/dev/null; then
  echo "Restarted via sudo systemctl."
  RESTARTED=true
fi

if [ "$RESTARTED" = false ]; then
  echo "systemctl unavailable or D-Bus access restricted. Using programmatic / file watcher restart..."
  # Call graceful shutdown API if running
  curl -s -X POST http://localhost:5295/api/system/restart >/dev/null 2>&1 || true
  # Fallback signal if PID namespace is shared
  pkill -f 'BSStore.API.dll' 2>/dev/null || true
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
  echo "⚠️ Backend restart initiated; service is starting up..."
fi
