#!/bin/bash
set -e
echo "Building BS Store Backend in Release mode..."
dotnet publish /workspace/backend/src/BSStore.API/BSStore.API.csproj -c Release -o /workspace/backend/publish /p:UseAppHost=false
echo "Restarting backend systemd service..."
systemctl restart bsstore-backend.service
echo "Backend restarted successfully! Service status:"
systemctl status bsstore-backend.service --no-pager
