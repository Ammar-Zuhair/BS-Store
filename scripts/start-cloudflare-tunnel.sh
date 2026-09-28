#!/bin/bash
set -e

LOG_FILE="/var/log/bsstore-cloudflare.log"
URL_FILE="/workspace/backend/tunnel_url.txt"

rm -f "$LOG_FILE"
/usr/local/bin/cloudflared tunnel --url http://localhost:5295 > "$LOG_FILE" 2>&1 &
CF_PID=$!

URL=""
for i in $(seq 1 30); do
  sleep 1
  if [ -f "$LOG_FILE" ]; then
    URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$LOG_FILE" | head -n 1 || true)
    if [ -n "$URL" ]; then
      break
    fi
  fi
done

if [ -z "$URL" ]; then
  echo "Failed to obtain Cloudflare Tunnel URL within 30 seconds."
  kill $CF_PID 2>/dev/null || true
  exit 1
fi

echo "Cloudflare Tunnel URL: $URL"
echo "$URL" > "$URL_FILE"

API_URL="${URL}/api"

sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${API_URL}|g" /workspace/admin-app/.env
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${API_URL}|g" /workspace/customer-app/.env
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${API_URL}|g" /workspace/courier-app/.env

echo "Successfully updated all .env files with: $API_URL"

wait $CF_PID
