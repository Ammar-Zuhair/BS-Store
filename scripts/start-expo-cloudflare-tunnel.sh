#!/usr/bin/env bash
set -Eeuo pipefail

PORT="${EXPO_PORT:-8085}"
CLOUDFLARED="${CLOUDFLARED_BIN:-/usr/local/bin/cloudflared}"
LOG_FILE="$(mktemp "${TMPDIR:-/tmp}/bsstore-expo-cloudflare.XXXXXX.log")"

if [[ ! -x "$CLOUDFLARED" ]]; then
  echo "cloudflared was not found at $CLOUDFLARED" >&2
  exit 1
fi

cleanup() {
  if [[ -n "${CF_PID:-}" ]]; then
    kill "$CF_PID" 2>/dev/null || true
    wait "$CF_PID" 2>/dev/null || true
  fi
  rm -f "$LOG_FILE"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$CLOUDFLARED" tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate >"$LOG_FILE" 2>&1 &
CF_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 45); do
  TUNNEL_URL="$(grep -Eo 'https://[A-Za-z0-9.-]+\.trycloudflare\.com' "$LOG_FILE" | head -n 1 || true)"
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
  if ! kill -0 "$CF_PID" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "Could not create a Cloudflare Quick Tunnel for Metro on port $PORT." >&2
  tail -n 20 "$LOG_FILE" >&2 || true
  exit 1
fi

TUNNEL_HOST="${TUNNEL_URL#https://}"
echo "Cloudflare Metro URL: $TUNNEL_URL"
echo "Expo Go URL: exp://${TUNNEL_HOST}:80"

# Expo's URL creator uses this proxy URL for the QR / deep link. Port 80 is
# intentional: Expo Go's exp:// scheme uses cleartext HTTP and Quick Tunnels
# accept HTTP on the Cloudflare edge while cloudflared forwards it to Metro.
export EXPO_PACKAGER_PROXY_URL="http://${TUNNEL_HOST}:80"

npx expo start --port "$PORT" --host lan "$@"
