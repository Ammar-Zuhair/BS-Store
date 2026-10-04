import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';

type NotificationsModule = typeof import('expo-notifications');
type NotificationSubscription = { remove: () => void };

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function loadNotificationsModule(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return Promise.resolve(null);
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications').then(Notifications => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
      });
      return Notifications;
    });
  }
  return notificationsModulePromise;
}

const PUSH_TOKEN_KEY = '@bs_admin_push_token';

export async function registerPushDevice(api: { post: (path: string, data: any) => Promise<any> }, appType: 'admin' | 'courier' | 'customer') {
  // Android Expo Go does not support remote notifications. Avoid importing the
  // native notifications module there; production and development builds keep
  // the normal push-token registration flow.
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) {
    console.warn('Push registration skipped: set extra.eas.projectId for the EAS project.');
    return null;
  }
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return null;
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

export function usePushNotifications(
  enabled: boolean,
  appType: 'admin' | 'courier' | 'customer',
  api: { post: (path: string, data: any) => Promise<any> },
  onOpen: (type: string, data: any) => void,
) {
  const openRef = useRef(onOpen);
  const apiRef = useRef(api);
  openRef.current = onOpen;
  apiRef.current = api;
  useEffect(() => {
    let mounted = true;
    let lastResponseId: string | null = null;
    let subscription: NotificationSubscription | null = null;
    void loadNotificationsModule().then(Notifications => {
      if (!Notifications || !mounted) return;
      if (enabled) registerPushDevice(apiRef.current, appType).catch(error => console.warn('تعذر تسجيل الإشعارات:', error));
      const open = (response: import('expo-notifications').NotificationResponse | null) => {
        if (!response || !mounted) return;
        const responseId = response.notification.request.identifier;
        if (responseId === lastResponseId) return;
        lastResponseId = responseId;
        const content = response.notification.request.content.data as any;
        openRef.current(String(content?.type || ''), content?.data || {});
      };
      void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
      subscription = Notifications.addNotificationResponseReceivedListener(response => {
        open(response);
      });
    });
    return () => { mounted = false; subscription?.remove(); };
  }, [enabled, appType]);
}
