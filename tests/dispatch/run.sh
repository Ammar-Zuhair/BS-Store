#!/usr/bin/env bash
set -euo pipefail
export DOTNET_ROOT=/workspace/.tools/dotnet
export PATH="$DOTNET_ROOT:$PATH"
export DOTNET_CLI_HOME=/workspace/.tools/dotnet-home
PG_BIN=$(dirname "$(find /usr/lib/postgresql -name initdb -type f | sort -V | tail -1)")
TEST_ROOT=$(mktemp -d /tmp/bsstore-dispatch-XXXXXX)
chown postgres:postgres "$TEST_ROOT"
STARTED=false
cleanup() {
  if [ "$STARTED" = true ]; then systemctl stop bsstore-dispatch-test-db 2>/dev/null || true; fi
  rm -rf "$TEST_ROOT"
}
trap cleanup EXIT
if ss -ltn '( sport = :55432 )' | tail -n +2 | rg -q .; then
  echo 'Test port 55432 is already in use; refusing to touch its listener.' >&2
  exit 1
fi
runuser -u postgres -- "$PG_BIN/initdb" -D "$TEST_ROOT/data" -A trust > "$TEST_ROOT/init.log"
systemd-run --unit=bsstore-dispatch-test-db --collect --service-type=exec --uid=postgres \
  --working-directory="$TEST_ROOT" "$PG_BIN/postgres" -D "$TEST_ROOT/data" -h 127.0.0.1 -p 55432 -k "$TEST_ROOT"
STARTED=true
for attempt in $(seq 1 30); do
  if "$PG_BIN/pg_isready" -h 127.0.0.1 -p 55432 >/dev/null; then break; fi
  sleep 1
done
"$PG_BIN/createdb" -h 127.0.0.1 -p 55432 -U postgres bsstore_dispatch_test
dotnet run --project /workspace/tests/dispatch/DispatchChecks.csproj -c Release -- "$@"
