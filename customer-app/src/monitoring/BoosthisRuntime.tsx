import React, { useEffect } from 'react';
import { InteractionManager, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE_URL } from '../api/client';
import {
  enableTelemetry,
  markBoot,
  setControlCensusEnabled,
  setRouteListEnabled,
  useFidSampler,
  useLongSessionDiagnostic,
  useBoosthis,
} from '@workspace/boosthis-runtime-rn';

const INSTALL_ID_KEY = '@bs-store/customer/boosthis-install-id-v1';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// This marker is not a credential. Only the backend adds the project key to
// the registration request; installation-specific session tokens stay local.
const GATEWAY_MARKER = 'bsstore_backend_gateway';
const telemetryFetch: typeof expoFetch = (input, options) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url === 'https://www.boosthis.com/api/installs/consent') {
    const headers = new Headers(options?.headers);
    headers.delete('Authorization');
    headers.set('ngrok-skip-browser-warning', 'true');
    return expoFetch(`${API_BASE_URL}/telemetry/customer/consent`, { ...options, headers });
  }
  return expoFetch(input, options);
};
let initialization: Promise<void> | undefined;

async function getInstallId(): Promise<string> {
  const savedId = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (savedId && UUID_V4.test(savedId)) return savedId;

  const installId = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALL_ID_KEY, installId);
  return installId;
}

function initializeBoosthis(): Promise<void> {
  if (initialization) return initialization;
  initialization = (async () => {
    try {
      const installId = await getInstallId();
      setRouteListEnabled(false);
      setControlCensusEnabled(false);
      enableTelemetry({
        installId,
        appName: 'BS Store Customer',
        endpoint: 'https://www.boosthis.com/api',
        inviteKey: GATEWAY_MARKER,
        fetchOptions: { fetchImpl: telemetryFetch },
        autoWrapNetwork: true,
        trackUnhandledErrors: true,
        trackImageWeight: true,
        traceScreens: false,
        sendPageMap: false,
        crashDetails: false,
      });
    } catch {
      // Monitoring is optional; storage or telemetry failures must not affect the app.
    }
  })();
  return initialization;
}

export const BoosthisRuntime: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { panHandlers } = useFidSampler();
  useLongSessionDiagnostic();

  useEffect(() => {
    markBoot('rootRendered');
    const handle = InteractionManager.runAfterInteractions(() => markBoot('interactive'));
    return () => handle.cancel();
  }, []);

  useEffect(() => {
    void initializeBoosthis();
  }, []);

  return <View {...panHandlers} style={styles.root}>{children}</View>;
};

export const BoosthisScreenTracker: React.FC<{ screen: string }> = ({ screen }) => {
  useBoosthis(screen);
  return null;
};

const styles = StyleSheet.create({ root: { flex: 1 } });
