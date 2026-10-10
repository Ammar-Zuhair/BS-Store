#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  exec sudo /bin/bash "$0" "$@"
fi

for required in /workspace/.tools/dotnet/dotnet /workspace/.tools/ngrok/ngrok /workspace/backend/publish/BSStore.API.dll; do
  if [ ! -f "$required" ]; then
    echo "Missing $required. Run bash /workspace/setup.sh and publish the backend first." >&2
    exit 1
  fi
done

# Replace the old transient units once. Leave existing permanent units running
# until both replacements have passed systemd validation.
for unit in bsstore-backend.service bsstore-tunnel.service; do
  install -m 644 "/workspace/scripts/systemd/$unit" "/etc/systemd/system/$unit"
done
systemd-analyze verify /etc/systemd/system/bsstore-backend.service /etc/systemd/system/bsstore-tunnel.service
for unit in bsstore-tunnel.service bsstore-backend.service; do
  if [ "$(systemctl show "$unit" -p Transient --value)" = yes ]; then
    systemctl stop "$unit"
  fi
done
systemctl daemon-reload
systemctl enable bsstore-backend.service bsstore-tunnel.service
systemctl restart bsstore-backend.service

ready=false
for attempt in $(seq 1 45); do
  if curl -fsS --max-time 2 http://127.0.0.1:5295/health >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [ "$ready" != true ]; then
  echo "Backend failed its local health check. Inspect journalctl -u bsstore-backend.service." >&2
  exit 1
fi
systemctl restart bsstore-tunnel.service
echo "Installed and enabled BS Store services. Verify the public /api/health endpoint separately."
