import React from 'react';
import { Text, View } from 'react-native';
import { CachedImage } from './CachedImage';
import { WalletMethod } from '../types/wallet';
import { typography } from '../theme';

export const PaymentMethodChoice: React.FC<{ method: WalletMethod; selected: boolean; color: string }> = ({ method, selected, color }) => <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', minHeight: 44 }}>
  <Text style={{ flex: 1, textAlign: 'right', color, fontFamily: typography.fontFamily.bold, fontSize: 17 }}>{method.name}{selected ? '  ✓' : ''}</Text>
  {!!method.imageUrl && <CachedImage source={{ uri: method.imageUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} resizeMode="contain" accessibilityLabel={`صورة ${method.name}`} />}
</View>;
