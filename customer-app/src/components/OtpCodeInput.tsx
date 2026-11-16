import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeColors, typography } from '../theme';
import { otpDigits } from '../utils/otp';
import { AppIcon } from './AppIcon';

export type OtpStatus = 'idle' | 'verifying' | 'error' | 'success';

export function OtpCodeInput({ colors, status, disabled, onChange, onComplete }: {
  colors: ThemeColors; status: OtpStatus; disabled: boolean;
  onChange: (code: string) => void; onComplete: (code: string) => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [focused, setFocused] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);
  const reduceMotion = useRef(true);
  const shake = useRef(new Animated.Value(0)).current;
  const success = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) reduceMotion.current = value; }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduceMotion.current = value; });
    inputs.current[0]?.focus();
    return () => { mounted = false; subscription.remove(); shake.stopAnimation(); success.stopAnimation(); };
  }, [shake, success]);

  useEffect(() => {
    shake.stopAnimation(); shake.setValue(0);
    if (status === 'error' && !reduceMotion.current) {
      const animation = Animated.sequence([6, -6, 4, -4, 0].map(toValue => Animated.timing(shake, { toValue, duration: 60, useNativeDriver: true })));
      animation.start();
      return () => animation.stop();
    }
    if (status === 'success') {
      Keyboard.dismiss();
      success.setValue(reduceMotion.current ? 1 : 0);
      const animation = Animated.spring(success, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true });
      if (!reduceMotion.current) animation.start();
      return () => animation.stop();
    }
  }, [status, shake, success]);

  const change = (index: number, text: string) => {
    if (disabled) return;
    const clean = otpDigits(text).replace(/[^0-9]/g, '').slice(0, 6);
    if (text && !clean) return;
    const next = [...digits];
    // OS autofill and pasted six-digit codes work from any box.
    const start = clean.length === 6 ? 0 : index;
    if (!clean) next[index] = '';
    else for (let offset = 0; offset < clean.length && start + offset < 6; offset++) next[start + offset] = clean[offset];
    setDigits(next);
    const code = next.join('');
    onChange(code);
    const target = clean ? Math.min(start + clean.length, 5) : index;
    inputs.current[target]?.focus();
    if (next.every(digit => digit !== '')) onComplete(code);
  };

  return <View>
    <Animated.View style={[styles.row, { transform: [{ translateX: shake }] }]}>
      {digits.map((digit, index) => <TextInput key={index} ref={input => { inputs.current[index] = input; }}
        testID={`otp-digit-${index}`} accessibilityLabel={`رقم التحقق ${index + 1} من 6`}
        accessibilityHint="ينتقل المؤشر تلقائياً، ويُتحقق من الرمز بعد إدخال الأرقام الستة"
        value={digit} onChangeText={text => change(index, text)} onFocus={() => setFocused(index)}
        onKeyPress={({ nativeEvent }) => {
          if (!disabled && nativeEvent.key === 'Backspace' && !digit && index > 0) {
            change(index - 1, ''); inputs.current[index - 1]?.focus();
          }
        }}
        selectTextOnFocus autoFocus={index === 0} editable={!disabled} keyboardType="number-pad"
        textContentType="oneTimeCode" autoComplete="one-time-code" importantForAutofill="yes"
        autoCorrect={false} maxLength={6} caretHidden={false}
        style={[styles.box, { color: colors.onSurface, backgroundColor: colors.surfaceContainerLow,
          borderColor: status === 'error' ? colors.error : status === 'success' ? colors.success : focused === index ? colors.primary : colors.outlineVariant,
          borderWidth: status !== 'idle' || focused === index ? 2 : 1 }]} />)}
    </Animated.View>
    {status === 'success' && <Animated.View testID="otp-success" accessibilityLiveRegion="polite" style={[styles.success, {
      opacity: success, transform: [{ scale: success.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
    }]}>
      <View style={[styles.check, { borderColor: colors.success }]}><AppIcon name="check" size={28} color={colors.success} strokeWidth={3} /></View>
      <Text style={[styles.successText, { color: colors.onSurface }]}>تم التحقق بنجاح</Text>
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center', direction: 'ltr' },
  box: { flex: 1, minWidth: 0, maxWidth: 54, height: 56, borderRadius: 14, textAlign: 'center', writingDirection: 'ltr',
    outlineWidth: 0, paddingHorizontal: 0, paddingVertical: 8, fontSize: 25, fontFamily: typography.fontFamily.bold },
  success: { alignItems: 'center', paddingTop: 20, gap: 8 },
  check: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  successText: { fontSize: 16, fontFamily: typography.fontFamily.bold },
});
