import { ProductDetailsModal } from './src/components/ProductDetailsModal';
import { BundleOptionsModal } from './src/components/BundleOptionsModal';
import { exitApplication } from './src/utils/exitApplication';
import React, { useCallback, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  BackHandler,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  Tajawal_900Black,
} from '@expo-google-fonts/tajawal';
import { AppProvider, useApp, type ScreenName } from './src/context/AppContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { CategoryStoresScreen } from './src/screens/CategoryStoresScreen';
import { StoreDetailScreen } from './src/screens/StoreDetailScreen';
import { CartScreen } from './src/screens/CartScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { CategoryScreen } from './src/screens/CategoryScreen';
import { FloatingCartBar } from './src/components/FloatingCartBar';
import { BottomNav } from './src/components/BottomNav';
import { colors } from './src/theme';
import { usePushNotifications } from './src/notifications';
import { api } from './src/api';
import { SystemGate } from './src/system/SystemGate';
import { BoosthisRuntime, BoosthisScreenTracker } from './src/monitoring/BoosthisRuntime';

const BOOSTHIS_SCREEN_NAMES: Record<ScreenName, string> = {
  home: 'Home',
  category: 'Categories',
  category_stores: 'Stores',
  store_detail: 'StoreDetails',
  cart: 'Cart',
  checkout: 'Checkout',
  tracking: 'Orders',
  profile: 'Profile',
  auth: 'Authentication',
};

const MainNavigator: React.FC = () => {
  const {
    currentScreen,
    navigateTo,
    isAuthenticated,
    isAuthLoading,
    isDarkMode,
    colors: themeColors,
    refreshOrders,
    currentOrder,
    productOptionsRequest, closeProductOptions, bundleOptionsRequest, closeBundleOptions,
  } = useApp();
  const onNotificationOpen = useCallback((type: string) => {
    navigateTo(type === 'order_status' ? 'tracking' : 'home');
    void refreshOrders();
  }, [navigateTo, refreshOrders]);
  usePushNotifications(isAuthenticated, 'customer', api, onNotificationOpen);

  useEffect(() => {
    const handleBackPress = () => {
      if (currentScreen === 'home' || (!isAuthenticated && currentScreen === 'auth')) {
        Alert.alert(
          'تأكيد الخروج',
          'هل أنت متأكد من الخروج من التطبيق؟',
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'موافق',
              style: 'destructive',
              onPress: () => { void exitApplication(); },
            },
          ],
          { cancelable: true }
        );
        return true;
      } else if (currentScreen === 'store_detail') {
        navigateTo('category_stores');
        return true;
      } else if (currentScreen === 'category_stores' || currentScreen === 'category') {
        navigateTo('home');
        return true;
      } else {
        navigateTo('home');
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [currentScreen, navigateTo, isAuthenticated]);

  if (isAuthLoading) {
    return (
      <SystemGate palette={themeColors} appType="customer" safeToReload={false}>
        <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </SystemGate>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'category':
        return <CategoryScreen />;
      case 'category_stores':
        return <CategoryStoresScreen />;
      case 'store_detail':
        return <StoreDetailScreen />;
      case 'cart':
        return <CartScreen />;
      case 'checkout':
        return isAuthenticated ? <CheckoutScreen /> : <AuthScreen />;
      case 'tracking':
        return <TrackingScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'auth':
        return <AuthScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const showNav = isAuthenticated && currentScreen !== 'auth' && currentScreen !== 'checkout';

  const resolvedScreen = !isAuthenticated && currentScreen !== 'auth' ? <AuthScreen /> : renderScreen();

  return (
    <SystemGate
      palette={themeColors}
      appType="customer"
      safeToReload={!currentOrder && (currentScreen === 'home' || currentScreen === 'auth' || currentScreen === 'profile')}
    >
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: themeColors.surfaceContainerLowest,
          },
        ]}
        edges={['top', 'left', 'right']}
      >
        <View
          key={isDarkMode ? 'dark' : 'light'}
          style={[
            styles.appContainer,
            {
              backgroundColor: themeColors.background,
            },
          ]}
        >
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent={true}
            hidden={false}
          />
          {resolvedScreen}
          {productOptionsRequest && <ProductDetailsModal product={productOptionsRequest} onClose={closeProductOptions} />}
          {bundleOptionsRequest && <BundleOptionsModal product={bundleOptionsRequest} onClose={closeBundleOptions} />}
          <BoosthisScreenTracker key={currentScreen} screen={BOOSTHIS_SCREEN_NAMES[currentScreen]} />
          {isAuthenticated && currentScreen !== 'auth' && <FloatingCartBar />}
          {showNav && <BottomNav />}
        </View>
      </SafeAreaView>
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
      <AppProvider>
        <BoosthisRuntime>
          <MainNavigator />
        </BoosthisRuntime>
      </AppProvider>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
