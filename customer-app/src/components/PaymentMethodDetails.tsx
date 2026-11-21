import React from 'react';
import { Image, Text, View } from 'react-native';
import { WalletMethod } from '../types/wallet';
import { typography } from '../theme';

export const PaymentMethodDetails: React.FC<{ method: WalletMethod; color: string }> = ({ method, color }) => <View style={{ gap: 10 }}>
  {!!method.imageUrl && <Image source={{ uri: method.imageUrl }} resizeMode="contain" style={{ width: 100, height: 80, alignSelf: 'center' }} accessibilityLabel={method.name} />}
  {[`الطريقة: ${method.name}`, `المستفيد: ${method.accountName}`, `رقم الحساب: ${method.accountNumber}`, method.accountType && `نوع الحساب: ${method.accountType}`, method.accountDetails, method.instructions].filter(Boolean).map((value, index) => <Text key={index} selectable style={{ color, fontFamily: typography.fontFamily.regular, fontSize: 16, textAlign: 'right', lineHeight: 25 }}>{value}</Text>)}
  <Text style={{ color, fontFamily: typography.fontFamily.regular, fontSize: 14, textAlign: 'right' }}>اضغط مطولاً على البيانات لنسخها.</Text>
</View>;
