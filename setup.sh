#!/usr/bin/env bash
set -euo pipefail

# Keep the SDK under the persistent workspace so container reprovisioning
# does not remove the backend's build/runtime tooling.
if [ ! -x /workspace/.tools/dotnet/dotnet ]; then
  mkdir -p /workspace/.tools
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /workspace/.tools/dotnet-install.sh
  bash /workspace/.tools/dotnet-install.sh --channel 10.0 --install-dir /workspace/.tools/dotnet --no-path
fi
export PATH="/workspace/.tools/dotnet:/workspace/.tools/dotnet-tools:$PATH"
export DOTNET_ROOT=/workspace/.tools/dotnet
export DOTNET_CLI_HOME=/workspace/.tools/dotnet-home
if [ ! -x /workspace/.tools/dotnet-tools/dotnet-ef ]; then
  dotnet tool install dotnet-ef --version 10.0.0 --tool-path /workspace/.tools/dotnet-tools
fi

if [ ! -x /workspace/.tools/ngrok/ngrok ]; then
  mkdir -p /workspace/.tools/ngrok
  curl -fsSL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -o /workspace/.tools/ngrok.tgz
  tar -xzf /workspace/.tools/ngrok.tgz -C /workspace/.tools/ngrok
  rm /workspace/.tools/ngrok.tgz
fi

# Systemd's /etc configuration does not survive container replacement. Restore
# the enabled backend/tunnel units from their persistent workspace templates.
if [ -f /workspace/backend/publish/BSStore.API.dll ] && systemctl show-environment >/dev/null 2>&1; then
  bash /workspace/scripts/install-backend-services.sh
fi

# Browser QA tooling and Chromium system packages, reproducible after reprovisioning.
npm install --prefix /workspace/.browser --no-audit --no-fund playwright
/workspace/.browser/node_modules/.bin/playwright install --with-deps chromium

# Local Android release validation also needs Java after container replacement.
if [ -d /workspace/.tools/android-sdk ] && ! command -v javac >/dev/null 2>&1; then
  apt-get update
  apt-get install -y openjdk-17-jdk-headless
fi

# Isolated PostgreSQL for courier concurrency checks and checkout capacity measurements.
if ! command -v psql >/dev/null 2>&1; then
  apt-get update
  apt-get install -y postgresql
fi

# Ammar Profile: restore website dependencies and browser verification tooling.
if [ -f /workspace/Ammar_Profile/package-lock.json ]; then
  (cd /workspace/Ammar_Profile && npm ci && npx playwright install chromium)
fi

# Inspect startup video metadata and extract fallback frames for customer UI QA.
if ! command -v ffmpeg >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ffmpeg
fi

# PostgreSQL 17 production backups require the matching client (the base image has 16).
if [ ! -x /usr/lib/postgresql/17/bin/pg_dump ]; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  . /etc/os-release
  printf 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt %s-pgdg main\n' "$VERSION_CODENAME" > /etc/apt/sources.list.d/pgdg.list
  apt-get update
  apt-get install -y postgresql-client-17
fi

# Keep the release CLI in persistent project tooling.
if [ ! -x /workspace/.tools/eas-cli/node_modules/.bin/eas ]; then
  npm install --prefix /workspace/.tools/eas-cli --no-audit --no-fund eas-cli@27.11.0
fi
