import React, { useEffect } from 'react';
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
import { AppProvider, useApp } from './src/context/AppContext';
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

const MainNavigator: React.FC = () => {
  const {
    currentScreen,
    navigateTo,
    isAuthenticated,
    isAuthLoading,
    isDarkMode,
    colors: themeColors,
  } = useApp();

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
              onPress: () => BackHandler.exitApp(),
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
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
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

  const showNav = currentScreen !== 'auth' && currentScreen !== 'checkout';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            currentScreen === 'auth' ? '#0A0B0D' : themeColors.surfaceContainerLowest,
        },
      ]}
      edges={['top', 'left', 'right']}
    >
      <View
        key={isDarkMode ? 'dark' : 'light'}
        style={[
          styles.appContainer,
          {
            backgroundColor:
              currentScreen === 'auth' ? '#0A0B0D' : themeColors.background,
          },
        ]}
      >
        <StatusBar
          barStyle={isDarkMode || currentScreen === 'auth' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
          hidden={false}
        />
        {renderScreen()}
        {currentScreen !== 'auth' && <FloatingCartBar />}
        {showNav && <BottomNav />}
      </View>
    </SafeAreaView>
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
        <MainNavigator />
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

