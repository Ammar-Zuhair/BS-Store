import React, { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type FocusCaptureEvent = { nativeEvent?: { target?: number } };

type KeyboardAwareScrollViewProps = Omit<ScrollViewProps, 'onFocusCapture'> & {
  avoidKeyboard?: boolean;
  avoidingViewStyle?: StyleProp<ViewStyle>;
  behavior?: KeyboardAvoidingViewProps['behavior'];
  keyboardVerticalOffset?: number;
  onFocusCapture?: (event: FocusCaptureEvent) => void;
};

export const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  avoidKeyboard = true,
  avoidingViewStyle,
  behavior,
  keyboardVerticalOffset = 0,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'none',
  automaticallyAdjustKeyboardInsets = Platform.OS === 'ios',
  scrollsChildToFocus = Platform.OS === 'android',
  onFocusCapture,
  ...scrollViewProps
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const focusedInputTargetRef = useRef<number | null>(null);
  const focusScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollFocusedInputIntoView = useCallback(() => {
    const target = focusedInputTargetRef.current;
    if (target === null) return;
    scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(target, 56, true);
  }, []);

  useEffect(() => {
    const keyboardSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (focusScrollTimerRef.current) {
        clearTimeout(focusScrollTimerRef.current);
        focusScrollTimerRef.current = null;
      }
      requestAnimationFrame(scrollFocusedInputIntoView);
    });

    return () => {
      keyboardSubscription.remove();
      if (focusScrollTimerRef.current) clearTimeout(focusScrollTimerRef.current);
    };
  }, [scrollFocusedInputIntoView]);

  const handleFocusCapture = useCallback<NonNullable<KeyboardAwareScrollViewProps['onFocusCapture']>>(
    (event) => {
      onFocusCapture?.(event);
      const target = event.nativeEvent?.target;
      if (typeof target !== 'number') return;
      focusedInputTargetRef.current = target;

      // Fallback for devices that do not deliver keyboardDidShow consistently.
      if (focusScrollTimerRef.current) clearTimeout(focusScrollTimerRef.current);
      focusScrollTimerRef.current = setTimeout(() => {
        focusScrollTimerRef.current = null;
        scrollFocusedInputIntoView();
      }, Platform.OS === 'ios' ? 350 : 450);
    },
    [onFocusCapture, scrollFocusedInputIntoView]
  );

  const scrollView = (
    <View {...({ onFocusCapture: handleFocusCapture } as any)} style={styles.flex}>
      <ScrollView
        {...scrollViewProps}
        ref={scrollViewRef}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        scrollsChildToFocus={scrollsChildToFocus}
      >
        {children}
      </ScrollView>
    </View>
  );

  if (!avoidKeyboard) return scrollView;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, avoidingViewStyle]}
      behavior={behavior ?? (Platform.OS === 'ios' ? 'padding' : 'height')}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {scrollView}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({ flex: { flex: 1 } });
