import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createTokenStorage } from './tokenStorageCore';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
export const tokenStorage = createTokenStorage(isNative, SecureStore, AsyncStorage);
