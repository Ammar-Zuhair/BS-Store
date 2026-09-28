#!/bin/bash
set -e
echo "Building BS Store Backend in Release mode..."
dotnet publish /workspace/backend/src/BSStore.API/BSStore.API.csproj -c Release -o /workspace/backend/publish /p:UseAppHost=false
echo "Restarting backend systemd service..."
if [ "$(id -u)" -eq 0 ]; then
  systemctl restart bsstore-backend.service
  systemctl status bsstore-backend.service --no-pager
elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  sudo systemctl restart bsstore-backend.service
  sudo systemctl status bsstore-backend.service --no-pager
else
  systemctl restart bsstore-backend.service || pkill -f 'BSStore.API.dll' || true
fi
echo "Backend restarted successfully!"
