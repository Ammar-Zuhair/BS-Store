import React, { useEffect } from 'react';
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
import { AdminProvider, useAdmin } from './src/context/AdminContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { AddEditProductScreen } from './src/screens/AddEditProductScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { FinancialsScreen } from './src/screens/FinancialsScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { AdminBottomNav } from './src/components/AdminBottomNav';
import { colors } from './src/theme';

const AdminNavigator: React.FC = () => {
  const { currentScreen, navigateTo } = useAdmin();
  const insets = useSafeAreaInsets();

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
      case 'auth':
        return <AuthScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <View style={[styles.appContainer, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceContainerLowest} translucent={true} />
      {renderScreen()}
      {currentScreen !== 'auth' && <AdminBottomNav />}
    </View>
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
          <AdminNavigator />
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
});
