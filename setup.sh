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
