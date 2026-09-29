import React from 'react';
import { useFonts, Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold } from '@expo-google-fonts/tajawal';
import { StatusBar, StyleSheet, View, Platform, SafeAreaView, Text } from 'react-native';
import { DriverProvider, useDriver } from './src/context/DriverContext';
import { DriverDashboardScreen } from './src/screens/DriverDashboardScreen';
import { ActiveTaskRouteScreen } from './src/screens/ActiveTaskRouteScreen';
import { PurchaseReceiptScreen } from './src/screens/PurchaseReceiptScreen';
import { InvoicesScreen } from './src/screens/InvoicesScreen';
import { DriverWalletScreen } from './src/screens/DriverWalletScreen';
import { CourierAuthScreen } from './src/screens/CourierAuthScreen';
import { DriverBottomNav } from './src/components/DriverBottomNav';
import { colors } from './src/theme';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;
(Text as any).defaultProps = { ...(Text as any).defaultProps, style: [{ fontFamily: 'Tajawal_400Regular', fontSize: 16 }, (Text as any).defaultProps?.style] };

const DriverNavigator: React.FC = () => {
  const { currentScreen, authenticated } = useDriver();
  const [fontsLoaded] = useFonts({ Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold });

  if (!fontsLoaded) return <View style={styles.appContainer} />;

  if (!authenticated) return <CourierAuthScreen />;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DriverDashboardScreen />;
      case 'route':
        return <ActiveTaskRouteScreen />;
      case 'invoices':
        return <InvoicesScreen />;
      case 'purchase_receipt':
        return <PurchaseReceiptScreen />;
      case 'wallet':
        return <DriverWalletScreen />;
      default:
        return <DriverDashboardScreen />;
    }
  };

  return (
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
});
