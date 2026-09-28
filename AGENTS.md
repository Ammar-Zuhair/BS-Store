# BS Store Project Rules & Agent Instructions

## 1. Environment & Permissions
The system runs Linux with dual user contexts:
- If running as `root`: commands execute directly.
- If running as `ubuntu` (or non-root, e.g. Codex agent): use `sudo` for system service commands (passwordless sudo is configured).
- Git safe directory is configured globally (`*`). All repository permissions are shared.

---

## 2. Backend Service & Build Lifecycle
Whenever any modification, bugfix, or feature change is made to the backend code (`/workspace/backend/` or `backend/src/`):

### Standard Method (One-Command Script):
Run the provided script which automatically builds, publishes, and restarts the service (supporting both root and non-root/sudo):
```bash
/workspace/scripts/restart-backend.sh
```

### Manual Method (if script cannot be executed):
1. **Publish the backend:**
   ```bash
   dotnet publish /workspace/backend/src/BSStore.API/BSStore.API.csproj -c Release -o /workspace/backend/publish /p:UseAppHost=false
   ```
2. **Restart the systemd service:**
   ```bash
   # If root:
   systemctl restart bsstore-backend.service
   # If non-root (e.g. Codex):
   sudo systemctl restart bsstore-backend.service
   ```
3. **Verify service status is active (running):**
   ```bash
   # If root:
   systemctl status bsstore-backend.service --no-pager
   # If non-root:
   sudo systemctl status bsstore-backend.service --no-pager
   ```

---

## 3. GitHub Synchronization Lifecycle
Whenever any modification, bugfix, or feature change is completed, **all changes must be staged, committed, and pushed**:

### 1) Root Workspace (`/workspace`):
```bash
cd /workspace
git add .
git commit -m "Descriptive commit message"
git push origin main
```

### 2) Backend Sub-Repository (`/workspace/backend`):
If any files inside `backend/` were changed:
```bash
git -C /workspace/backend add .
git -C /workspace/backend commit -m "Descriptive commit message"
git -C /workspace/backend push origin main
```

*Note: GitHub Personal Access Token is already configured in the git remote origin URLs for seamless push without credential prompts.*

---

## 4. Key Paths & URLs
- **Backend Source**: `/workspace/backend/src/`
- **Backend Publish Target**: `/workspace/backend/publish/`
- **Customer App**: `/workspace/customer-app/`
- **Admin App**: `/workspace/admin-app/`
- **Restart Script**: `/workspace/scripts/restart-backend.sh`
- **Public API Tunnel URL**: `https://cdt-enlargement-fighting-ide.trycloudflare.com/api`
- **Tunnel Service**: `bsstore-tunnel.service`
- **Backend Service**: `bsstore-backend.service` (listening on port `5295`)
