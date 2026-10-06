import { BackHandler, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export async function exitApplication(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const exitModule = requireOptionalNativeModule<{ exit: () => Promise<void> }>('BSStoreAppExit');
  if (exitModule) {
    try { await exitModule.exit(); return; } catch { /* Compatibility with a closing activity. */ }
  }
  BackHandler.exitApp();
}
