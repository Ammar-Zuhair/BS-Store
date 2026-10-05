import React, { useCallback, useEffect } from 'react';
import { StatusBar, StyleSheet, View, ActivityIndicator, BackHandler, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  Tajawal_900Black,
} from '@expo-google-fonts/tajawal';
import { AdminProvider, useAdmin, type AdminScreenName } from './src/context/AdminContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { AddEditProductScreen } from './src/screens/AddEditProductScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { FinancialsScreen } from './src/screens/FinancialsScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { AdminPriceChangesScreen } from './src/screens/AdminPriceChangesScreen';
import { AdminSystemManagementScreen } from './src/screens/AdminSystemManagementScreen';
import { AdminBroadcastScreen } from './src/screens/AdminBroadcastScreen';
import { AdminBottomNav } from './src/components/AdminBottomNav';
import { colors } from './src/theme';
import { usePushNotifications } from './src/notifications';
import { api } from './src/api';
import { SystemGate } from './src/system/SystemGate';
import { BoosthisRuntime, BoosthisScreenTracker } from './src/monitoring/BoosthisRuntime';

const BOOSTHIS_SCREEN_NAMES: Record<AdminScreenName, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  payments: 'Payments',
  inventory: 'Inventory',
  add_product: 'ProductEditor',
  categories: 'Categories',
  financials: 'Financials',
  price_changes: 'PriceChanges',
  system_management: 'SystemManagement',
  broadcasts: 'Notifications',
  auth: 'Authentication',
};

const AdminNavigator: React.FC = () => {
  const { currentScreen, navigateTo, isSessionRestoring, currentUser, refreshData } = useAdmin();
  const insets = useSafeAreaInsets();
  const onNotificationOpen = useCallback((type: string) => {
    navigateTo(type === 'new_order' ? 'orders' : 'dashboard');
    void refreshData();
  }, [navigateTo, refreshData]);
  usePushNotifications(Boolean(currentUser), 'admin', api, onNotificationOpen);

  useEffect(() => {
    const handleBackPress = () => {
      if (currentScreen === 'dashboard' || currentScreen === 'auth') {
        Alert.alert(
          'تأكيد الخروج',
          'هل أنت متأكد من الخروج من التطبيق؟',
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'موافق',
              style: 'destructive',
              onPress: () => BackHandler.exitApp(),
            },
          ],
          { cancelable: true }
        );
        return true;
      } else {
        navigateTo('dashboard');
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [currentScreen, navigateTo]);

  const renderScreen = () => {
    if (isSessionRestoring) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'orders':
        return <OrdersScreen />;
      case 'payments':
        return <PaymentsScreen />;
      case 'inventory':
        return <InventoryScreen />;
      case 'add_product':
        return <AddEditProductScreen />;
      case 'categories':
        return <CategoriesScreen />;
      case 'financials':
        return <FinancialsScreen />;
      case 'price_changes':
        return <AdminPriceChangesScreen />;
      case 'system_management':
        return <AdminSystemManagementScreen />;
      case 'broadcasts':
        return <AdminBroadcastScreen />;
      case 'auth':
        return <AuthScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <SystemGate palette={colors} appType="admin" safeToReload={currentScreen === 'dashboard' || currentScreen === 'auth'} showMaintenance={false}>
      <View style={[styles.appContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceContainerLowest} translucent={true} />
        {renderScreen()}
        <BoosthisScreenTracker key={currentScreen} screen={BOOSTHIS_SCREEN_NAMES[currentScreen]} />
        {currentScreen !== 'auth' && <AdminBottomNav />}
      </View>
    </SystemGate>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
    Tajawal_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.safeArea}>
        <AdminProvider>
          <BoosthisRuntime>
            <AdminNavigator />
          </BoosthisRuntime>
        </AdminProvider>
      </View>
    </SafeAreaProvider>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
