import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';

// Only download. Expo launches the cached update on the next native cold start.
// Backgrounding/resuming is not a full exit and must never reload a running app.
export function SilentUpdates() {
  const { isUpdatePending } = Updates.useUpdates();
  const pending = useRef(false);
  pending.current = pending.current || isUpdatePending;

  useEffect(() => {
    if (Platform.OS === 'web' || !Updates.isEnabled) return;
    let mounted = true;
    let checking = false;
    let lastCheck = Number.NEGATIVE_INFINITY;
    let state = AppState.currentState;
    const check = async () => {
      if (!mounted || checking || pending.current || Date.now() - lastCheck < 60_000) return;
      checking = true;
      lastCheck = Date.now();
      try {
        const update = await Updates.checkForUpdateAsync();
        if (mounted && update.isAvailable) {
          const fetched = await Updates.fetchUpdateAsync();
          if (mounted && fetched.isNew) pending.current = true;
        }
      } catch { /* Offline: retain the running version and retry on a later return. */ }
      finally { checking = false; }
    };
    const timer = setTimeout(() => { void check(); }, 1500);
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active' && state !== 'active') void check();
      state = next;
    });
    return () => { mounted = false; clearTimeout(timer); listener.remove(); };
  }, []);
  return null;
}
