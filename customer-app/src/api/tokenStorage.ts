import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { createTokenStorage, type SecureTokenStore } from './tokenStorageCore';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const secure: SecureTokenStore | null = isNative && requireOptionalNativeModule('ExpoSecureStore')
  ? require('expo-secure-store')
  : null;
// Existing binaries without SecureStore retain their previous token storage.
// Binaries with SecureStore keep encrypted storage and automatic migration.
export const tokenStorage = createTokenStorage(secure !== null, secure!, AsyncStorage);
