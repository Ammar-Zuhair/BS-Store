import React, { useCallback, useEffect } from 'react';
import { useFonts, Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold } from '@expo-google-fonts/tajawal';
import { ActivityIndicator, Alert, BackHandler, StatusBar, StyleSheet, View, Platform, SafeAreaView, Text, TextInput } from 'react-native';
import { DriverProvider, useDriver } from './src/context/DriverContext';
import { DriverDashboardScreen } from './src/screens/DriverDashboardScreen';
import { ActiveTaskRouteScreen } from './src/screens/ActiveTaskRouteScreen';
import { StorePurchaseScreen } from './src/screens/StorePurchaseScreen';
import { DriverWalletScreen } from './src/screens/DriverWalletScreen';
import { CourierAuthScreen } from './src/screens/CourierAuthScreen';
import { DriverBottomNav } from './src/components/DriverBottomNav';
import { colors } from './src/theme';
import { usePushNotifications } from './src/notifications';
import { api } from './src/api';
import { SystemGate } from './src/system/SystemGate';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;
(Text as any).defaultProps = { ...(Text as any).defaultProps, style: [{ fontFamily: 'Tajawal_400Regular', fontSize: 16 }, (Text as any).defaultProps?.style] };
(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, style: [{ fontFamily: 'Tajawal_400Regular', fontSize: 16 }, (TextInput as any).defaultProps?.style] };

const DriverNavigator: React.FC = () => {
  const { currentScreen, authenticated, isSessionRestoring, refreshData, navigateTo, navigateBack, activeTask } = useDriver();
  const onNotificationOpen = useCallback((type: string) => {
    navigateTo(type === 'order_assigned' ? 'dashboard' : currentScreen);
    void refreshData();
  }, [currentScreen, navigateTo, refreshData]);
  usePushNotifications(authenticated, 'courier', api, onNotificationOpen);
  const [fontsLoaded] = useFonts({ Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSessionRestoring || !authenticated) return false;

      if (currentScreen !== 'dashboard') {
        navigateBack();
        return true;
      }

      Alert.alert('تأكيد الخروج', 'هل تريد إغلاق تطبيق الموصل؟', [
        { text: 'البقاء في التطبيق', style: 'cancel' },
        { text: 'خروج', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });

    return () => subscription.remove();
  }, [authenticated, currentScreen, isSessionRestoring, navigateBack]);

  if (!fontsLoaded) return <View style={styles.appContainer} />;

  if (isSessionRestoring) return <SystemGate palette={colors} appType="courier" safeToReload={false}><View style={[styles.appContainer, styles.loading]}><ActivityIndicator size="large" color={colors.primary} /></View></SystemGate>;

  if (!authenticated) return <SystemGate palette={colors} appType="courier" safeToReload><CourierAuthScreen /></SystemGate>;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DriverDashboardScreen />;
      case 'route':
        return <ActiveTaskRouteScreen />;
      case 'purchase':
        return <StorePurchaseScreen />;
      case 'wallet':
        return <DriverWalletScreen />;
      default:
        return <DriverDashboardScreen />;
    }
  };

  return (
    <SystemGate palette={colors} appType="courier" safeToReload={currentScreen === 'dashboard' && !activeTask}>
      <View style={[styles.appContainer, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent={true}
          hidden={false}
        />
        {renderScreen()}
        <DriverBottomNav />
      </View>
    </SystemGate>
  );
};

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <DriverProvider>
        <DriverNavigator />
      </DriverProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  loading: { alignItems: 'center', justifyContent: 'center' },
});
