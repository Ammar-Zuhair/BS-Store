import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { api, driverApi } from '../api';

const TASK = 'bsstore-courier-location';
const ENABLED = '@bs_courier_location_enabled';
const LAST_SENT = '@bs_courier_location_last_sent';
export const LOCATION_INTERVAL = 60_000;
let sending = false;

async function sendLocation(location: Location.LocationObject) {
  if (sending || Date.now() - location.timestamp > 120_000) return;
  sending = true;
  try {
    if (await AsyncStorage.getItem(ENABLED) !== 'true') return;
    if (Date.now() - Number(await AsyncStorage.getItem(LAST_SENT) || 0) < LOCATION_INTERVAL) return;
    if (!await api.initSession()) return;
    // Persist before sending so failures never cause a burst of retries.
    await AsyncStorage.setItem(LAST_SENT, String(Date.now()));
    await driverApi.updateLocation(location.coords.latitude, location.coords.longitude, new Date(location.timestamp).toISOString());
  } finally {
    sending = false;
  }
}

// Defined at module scope so the native task can execute with the React UI suspended.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  try {
    await sendLocation(data.locations[data.locations.length - 1]);
  } catch {
    // No coordinate/token logging; the next scheduled fix retries after a minute.
  }
});

export async function prepareLocationTracking(): Promise<void> {
  if (!await Location.hasServicesEnabledAsync()) throw new Error('فعّل خدمة الموقع GPS لبدء الوردية.');
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') throw new Error('اسمح بالوصول إلى الموقع لاختيار الطلبات القريبة منك.');
  if (Platform.OS !== 'web') {
    if (!await TaskManager.isAvailableAsync()) throw new Error('تتبع الموقع يحتاج نسخة تطبيق الموصل المثبتة، ولا يعمل في Expo Go.');
    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') throw new Error('اسمح بالموقع دائماً من إعدادات التطبيق ليستمر التتبع أثناء الوردية والشاشة مغلقة.');
  }
}

export async function startLocationTracking(): Promise<void> {
  await AsyncStorage.setItem(ENABLED, 'true');
  try {
    if (Platform.OS !== 'web' && !await Location.hasStartedLocationUpdatesAsync(TASK)) {
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_INTERVAL,
        distanceInterval: 0,
        deferredUpdatesInterval: LOCATION_INTERVAL,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'وردية BS Store نشطة',
          notificationBody: 'يتم تحديث موقعك كل دقيقة لاختيار الطلبات القريبة منك.',
          killServiceOnDestroy: false,
        },
      });
    }
  } catch (error) {
    await stopLocationTracking();
    throw error;
  }
  // Keep the native task registered if the first network request fails.
  await publishCurrentLocation();
}

export async function publishCurrentLocation(): Promise<void> {
  if (sending || await AsyncStorage.getItem(ENABLED) !== 'true') return;
  if (Date.now() - Number(await AsyncStorage.getItem(LAST_SENT) || 0) < LOCATION_INTERVAL) return;
  const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  await sendLocation(fix);
}

export async function stopLocationTracking(): Promise<void> {
  await AsyncStorage.removeItem(ENABLED);
  if (Platform.OS !== 'web' && await Location.hasStartedLocationUpdatesAsync(TASK)) {
    await Location.stopLocationUpdatesAsync(TASK);
  }
  await AsyncStorage.removeItem(LAST_SENT);
}
