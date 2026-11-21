import React from 'react';
import { Text, View } from 'react-native';
import { WalletMethod } from '../types/wallet';
import { typography } from '../theme';

export const PaymentMethodDetails: React.FC<{ method: WalletMethod; color: string }> = ({ method, color }) => {
  const rows = [
    ['المستفيد', method.accountName], ['رقم الحساب', method.accountNumber], ['نوع الحساب', method.accountType],
    ['تفاصيل إضافية', method.accountDetails], ['تعليمات التحويل', method.instructions],
  ].filter(([, value]) => value?.trim());
  return <View style={{ gap: 10 }}>
    {rows.map(([label, value]) => <Text key={label} selectable style={{ color, fontFamily: typography.fontFamily.regular, fontSize: 16, textAlign: 'right', lineHeight: 25 }}>{label}: {value?.trim()}</Text>)}
    <Text style={{ color, fontFamily: typography.fontFamily.regular, fontSize: 14, textAlign: 'right' }}>اضغط مطولاً على البيانات لنسخها.</Text>
  </View>;
};
