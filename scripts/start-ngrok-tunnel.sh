#!/usr/bin/env bash
set -euo pipefail

# Permanent units load the current token from the project dotenv on every start.
# Retain the optional endpoint argument only for the legacy transient mode.
if [ "$(systemctl show bsstore-tunnel.service -p FragmentPath --value)" = /etc/systemd/system/bsstore-tunnel.service ]; then
  if [ -n "${1:-}" ] && [ "$1" != https://implosive-exchange-compacter.ngrok-free.dev ]; then
    echo "The permanent tunnel uses the installed apps' fixed endpoint." >&2
    exit 1
  fi
  curl -fsS --max-time 10 http://127.0.0.1:5295/health >/dev/null
  systemctl restart bsstore-tunnel.service
  exit 0
fi

: "${NGROK_AUTHTOKEN:?Add NGROK_AUTHTOKEN in project Containers → Secrets}"

curl -fsS --max-time 10 http://127.0.0.1:5295/health >/dev/null
# Keep the API URL used by the installed apps stable on subsequent launches.
# An alternative reserved URL can be supplied as the first argument.
ENDPOINT_ARGS=(--url="${1:-https://implosive-exchange-compacter.ngrok-free.dev}")
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
