import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layout, calculateLayout } from './ResponsiveLayout';

export function ResponsiveLayoutProvider({ children }: { children: React.ReactNode }) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <Layout.Provider value={calculateLayout(Math.max(0, window.width - insets.left - insets.right), Math.max(0, window.height - insets.top - insets.bottom))}>
    {children}
  </Layout.Provider>;
}
