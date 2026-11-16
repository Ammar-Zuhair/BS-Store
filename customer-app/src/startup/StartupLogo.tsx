import React from 'react';
import { Image, StatusBar, StyleSheet, View } from 'react-native';

export function StartupLogo({ dark, background }: { dark: boolean; background: string }) {
  return <View testID="startup-logo" style={[styles.screen, { backgroundColor: background }]}>
    <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={background} />
    <Image source={require('../../assets/icon.png')} accessibilityLabel="متجر بي إس" resizeMode="contain" style={styles.logo} />
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 168, height: 168, borderRadius: 36 },
});
