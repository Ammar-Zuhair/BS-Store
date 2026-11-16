import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { holdUpdates } from '../system/updateSafety';
import { typography } from '../theme';
import { IntroPlayer } from './IntroPlayer';
import { introMedia } from './media';

export function StartupIntro({ dark, themeReady, finished, onFinished }: {
  dark: boolean; themeReady: boolean; finished: boolean; onFinished: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState<boolean>();
  const completed = useRef(false);
  const finish = useCallback(() => { if (!completed.current) { completed.current = true; onFinished(); } }, [onFinished]);
  const media = dark ? introMedia.dark : introMedia.light;
  useEffect(() => holdUpdates(), []);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) { setReduceMotion(value); if (value) finish(); } })
      .catch(() => { if (mounted) setReduceMotion(false); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { setReduceMotion(value); if (value) finish(); });
    return () => { mounted = false; subscription.remove(); };
  }, [finish]);
  useEffect(() => {
    // Both supplied movies are five seconds. A broken player/asset cannot trap startup.
    const watchdog = setTimeout(finish, 12_000);
    return () => clearTimeout(watchdog);
  }, [finish]);
  return <View testID="startup-intro" style={[s.screen, { backgroundColor: media.background }]} accessibilityLabel="مرحباً بك في متجر بي إس">
    <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={media.background} />
    {themeReady && <>
      <Image source={media.poster} resizeMode="contain" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} accessible={false} />
      {!finished && reduceMotion === false && <IntroPlayer source={media.video} background={media.background} onFinished={finish} />}
    </>}
    {!finished && <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="تخطي المقدمة"
      style={({ pressed }) => [s.skip, { bottom: Math.max(insets.bottom, 16), backgroundColor: dark ? '#262626' : '#FFFFFF', opacity: pressed ? 0.75 : 1 }]}>
      <Text style={[s.skipText, { color: dark ? '#F8FAFC' : '#0F172A' }]}>تخطي المقدمة</Text>
    </Pressable>}
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1 },
  skip: { position: 'absolute', alignSelf: 'center', minHeight: 48, minWidth: 120, padding: 12, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  skipText: { fontFamily: typography.fontFamily.medium, fontSize: 14 },
});
