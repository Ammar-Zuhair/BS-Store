import React, { useEffect } from 'react';
import { holdUpdates } from '../system/updateSafety';
import { Modal, View, Text, Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { typography } from '../theme';
import { AppIcon } from './AppIcon';

export function ExitDialog({ visible, onStay, onExit }: { visible: boolean; onStay: () => void; onExit: () => void }) {
  const { colors: c } = useApp();
  useEffect(() => { if (visible) return holdUpdates(); }, [visible]);
  return <Modal visible={visible} transparent animationType="none" onRequestClose={onStay} statusBarTranslucent>
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onStay} accessibilityLabel="إغلاق رسالة الخروج" />
      <ScrollView contentContainerStyle={s.center} style={{ width: '100%' }}>
        <View style={[s.card, { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant }]} accessibilityViewIsModal>
          <View style={[s.brand, { backgroundColor: c.surfaceContainerLow }]}>
            <Image source={require('../../assets/icon.png')} style={s.logo} />
            <View style={[s.spark, { backgroundColor: c.primary }]}><AppIcon name="sparkles" color={c.onPrimary} size={21} /></View>
          </View>
          <Text style={[s.eyebrow, { color: c.primary }]}>BS STORE</Text>
          <Text accessibilityRole="header" style={[s.title, { color: c.onSurface }]}>إلى لقاء قريب</Text>
          <Text style={[s.copy, { color: c.onSurfaceVariant }]}>يسعدنا وجودك معنا. هل ترغب في الخروج الآن؟</Text>
          <Pressable onPress={onStay} accessibilityRole="button" style={({ pressed }) => [s.button, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[s.label, { color: c.onPrimary }]}>البقاء في التطبيق</Text>
          </Pressable>
          <Pressable onPress={onExit} accessibilityRole="button" style={({ pressed }) => [s.button, s.secondary, { borderColor: c.outlineVariant, backgroundColor: pressed ? c.surfaceContainerLow : 'transparent' }]}>
            <AppIcon name="logout" color={c.onSurfaceVariant} /><Text style={[s.label, { color: c.onSurfaceVariant }]}>خروج</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  card: { width: '100%', maxWidth: 400, borderRadius: 30, padding: 24, alignItems: 'center', borderWidth: 1 },
  brand: { width: 100, height: 100, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logo: { width: 72, height: 72, borderRadius: 20 },
  spark: { position: 'absolute', right: -8, bottom: -4, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: typography.fontFamily.bold, fontSize: 13, letterSpacing: 2 },
  title: { fontFamily: typography.fontFamily.extraBold, fontSize: 28, marginTop: 8, textAlign: 'center' },
  copy: { fontFamily: typography.fontFamily.regular, fontSize: 16, lineHeight: 26, textAlign: 'center', marginVertical: 16, writingDirection: 'rtl' },
  button: { minHeight: 52, padding: 12, width: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 8 },
  secondary: { borderWidth: 1, marginTop: 10 },
  label: { fontFamily: typography.fontFamily.bold, fontSize: 16, textAlign: 'center' },
});
