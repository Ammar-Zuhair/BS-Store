import React, { useEffect } from 'react';
import { InteractionManager, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { fetch as expoFetch } from 'expo/fetch';
import {
  enableTelemetry,
  markBoot,
  setControlCensusEnabled,
  setRouteListEnabled,
  useFidSampler,
  useLongSessionDiagnostic,
  useBoosthis,
} from '@workspace/boosthis-runtime-rn';

const INSTALL_ID_KEY = '@bs-store/courier/boosthis-install-id-v1';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECT_KEY = process.env.EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY?.trim();
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
    if (!PROJECT_KEY) return;
    try {
      const installId = await getInstallId();
      setRouteListEnabled(false);
      setControlCensusEnabled(false);
      enableTelemetry({
        installId,
        appName: 'BS Store Courier',
        endpoint: 'https://www.boosthis.com/api',
        inviteKey: PROJECT_KEY,
        fetchOptions: { fetchImpl: expoFetch },
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

  return <View {...(PROJECT_KEY ? panHandlers : undefined)} style={styles.root}>{children}</View>;
};

export const BoosthisScreenTracker: React.FC<{ screen: string }> = ({ screen }) => {
  useBoosthis(screen);
  return null;
};

const styles = StyleSheet.create({ root: { flex: 1 } });
