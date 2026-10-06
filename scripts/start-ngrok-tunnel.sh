#!/usr/bin/env bash
set -euo pipefail

: "${NGROK_AUTHTOKEN:?Add NGROK_AUTHTOKEN in project Containers → Secrets}"

curl -fsS --max-time 10 http://127.0.0.1:5295/health >/dev/null
ENDPOINT_ARGS=()
# Pass a reserved URL as the first argument only when the supplied token owns it.
# Without an argument, ngrok assigns an available URL for the current account.
if [ -n "${1:-}" ]; then
  ENDPOINT_ARGS=(--url="$1")
fi
if systemctl is-active --quiet bsstore-tunnel.service || systemctl is-failed --quiet bsstore-tunnel.service; then
  systemctl stop bsstore-tunnel.service
fi
# Recreate the unit so it receives the current token after a Secrets change.
systemd-run --unit=bsstore-tunnel --description="BS Store ngrok API tunnel" --collect \
  --service-type=exec --working-directory=/workspace \
  --property=Restart=on-failure --property=RestartSec=5s \
  --setenv=NGROK_AUTHTOKEN \
  /workspace/.tools/ngrok/ngrok http http://127.0.0.1:5295 \
  "${ENDPOINT_ARGS[@]}" --config=/workspace/scripts/ngrok.yml --log=stdout --log-format=json
