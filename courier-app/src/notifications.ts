import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
});
const PUSH_TOKEN_KEY = '@bs_courier_push_token';

export async function registerPushDevice(api: { post: (path: string, data: any) => Promise<any> }, appType: 'admin' | 'courier' | 'customer') {
  if (Platform.OS === 'web') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) { console.warn('Push registration skipped: set extra.eas.projectId for the EAS project.'); return null; }
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'الإشعارات', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250] });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;
  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.post('/notifications/devices', { expoPushToken, platform: Platform.OS, appType });
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoPushToken);
  return expoPushToken;
}

export async function unregisterPushDevice(api: { post: (path: string, data: any) => Promise<any> }) {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;
  await api.post('/notifications/devices/unregister', { expoPushToken: token });
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

export function usePushNotifications(enabled: boolean, appType: 'admin' | 'courier' | 'customer', api: { post: (path: string, data: any) => Promise<any> }, onOpen: (type: string, data: any) => void) {
  const openRef = useRef(onOpen);
  const apiRef = useRef(api);
  openRef.current = onOpen;
  apiRef.current = api;
  useEffect(() => {
    let mounted = true;
    let lastResponseId: string | null = null;
    if (enabled) registerPushDevice(apiRef.current, appType).catch(error => console.warn('تعذر تسجيل الإشعارات:', error));
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response || !mounted) return;
      const responseId = response.notification.request.identifier;
      if (responseId === lastResponseId) return;
      lastResponseId = responseId;
      const content = response.notification.request.content.data as any;
      openRef.current(String(content?.type || ''), content?.data || {});
    };
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      open(response);
    });
    return () => { mounted = false; subscription.remove(); };
  }, [enabled, appType]);
}
