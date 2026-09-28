# BS Store Project Rules

## Backend Service & Build Lifecycle
Whenever any modification, bugfix, or feature change is made to the backend code (`/workspace/backend/` or `backend/src/`):
1. **Always rebuild and upgrade the service immediately:**
   ```bash
   /workspace/scripts/restart-backend.sh
   ```
2. **Verify that the backend service is active and running cleanly:**
   ```bash
   systemctl status bsstore-backend.service --no-pager
   ```
3. Never leave backend code modifications unbuilt.

## GitHub Synchronization Lifecycle
Whenever any modification, bugfix, or feature change is completed:
1. **Stage and commit all changes** with a clear, descriptive commit message.
2. **Push all commits to GitHub:**
   ```bash
   git push origin main
   ```
3. If changes were made inside `backend/`, ensure changes are also committed and pushed in `backend/`:
   ```bash
   git -C /workspace/backend push origin main
   ```
