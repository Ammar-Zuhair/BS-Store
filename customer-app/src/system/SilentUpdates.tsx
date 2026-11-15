import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { useApp } from '../context/AppContext';
import { canApplyUpdate } from './updateSafety';
import { createReturnPolicy } from './silentUpdatePolicy';

// Mounted once, independently of authentication/loading branches.
export function SilentUpdates() {
  const { currentScreen, isAuthenticated, isAuthLoading, needsProfileCompletion, productOptionsRequest, bundleOptionsRequest } = useApp();
  const { isUpdatePending } = Updates.useUpdates();
  const safe = useRef(false);
  const pending = useRef(false);
  pending.current = pending.current || isUpdatePending;
  safe.current = isAuthenticated && !isAuthLoading && !needsProfileCompletion &&
    !productOptionsRequest && !bundleOptionsRequest &&
    ['home', 'category', 'category_stores', 'store_detail', 'cart', 'notifications'].includes(currentScreen);

  useEffect(() => {
    if (Platform.OS === 'web' || !Updates.isEnabled) return;
    let mounted = true;
    let checking = false;
    let reloading = false;
    let lastCheck = 0;
    let state = AppState.currentState;
    const policy = createReturnPolicy();
    const isSafe = () => safe.current && canApplyUpdate();
    const check = async () => {
      if (checking || reloading || pending.current || Date.now() - lastCheck < 60_000) return;
      checking = true;
      lastCheck = Date.now();
      try {
        const update = await Updates.checkForUpdateAsync();
        if (mounted && update.isAvailable) {
          const fetched = await Updates.fetchUpdateAsync();
          if (mounted && fetched.isNew) pending.current = true;
        }
      } catch { /* Offline: continue using the currently running update. */ }
      finally { checking = false; }
    };
    const timer = setTimeout(() => { void check(); }, 1500);
    const listener = AppState.addEventListener('change', next => {
      if (next === 'background' && state !== 'background') policy.background(isSafe());
      if (next === 'active' && state !== 'active') {
        if (policy.resume(isSafe(), pending.current) && !reloading) {
          reloading = true;
          void Updates.reloadAsync().catch(() => { reloading = false; });
        } else void check();
      }
      state = next;
    });
    return () => { mounted = false; clearTimeout(timer); listener.remove(); };
  }, []);
  return null;
}
