import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Image, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { typography } from '../theme';
import { clampReceiptTransform, INITIAL_RECEIPT_TRANSFORM, MAX_RECEIPT_ZOOM, Point, ReceiptTransform, Size, zoomReceiptAround } from '../utils/receiptZoom';

type Gesture = { count: number; centre: Point; distance: number; transform: ReceiptTransform };

export const ReceiptImageViewer: React.FC<{ uri: string; onClose: () => void; onError: () => void }> = ({ uri, onClose, onError }) => {
  const [transform, setTransform] = useState(INITIAL_RECEIPT_TRANSFORM);
  const current = useRef({
    transform: INITIAL_RECEIPT_TRANSFORM,
    viewport: { width: 0, height: 0 } as Size,
    image: { width: 0, height: 0 } as Size,
    gesture: null as Gesture | null,
  });
  const apply = useCallback((value: ReceiptTransform) => {
    const next = clampReceiptTransform(value, current.current.viewport, current.current.image);
    current.current.transform = next;
    setTransform(next);
  }, []);

  const responder = useMemo(() => {
    const readTouches = (event: GestureResponderEvent) => {
      const touches = event.nativeEvent.touches;
      if (!touches.length) return null;
      const first = touches[0];
      const second = touches[1];
      const { width, height } = current.current.viewport;
      return {
        count: second ? 2 : 1,
        centre: {
          x: (second ? (first.locationX + second.locationX) / 2 : first.locationX) - width / 2,
          y: (second ? (first.locationY + second.locationY) / 2 : first.locationY) - height / 2,
        },
        distance: second ? Math.hypot(first.locationX - second.locationX, first.locationY - second.locationY) : 0,
      };
    };
    const begin = (event: GestureResponderEvent) => {
      const touches = readTouches(event);
      current.current.gesture = touches ? { ...touches, transform: current.current.transform } : null;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: begin,
      onPanResponderStart: begin,
      onPanResponderEnd: begin,
      onPanResponderMove: event => {
        const touches = readTouches(event);
        const gesture = current.current.gesture;
        if (!touches) return;
        if (!gesture || touches.count !== gesture.count) { begin(event); return; }
        const scale = gesture.count === 2 && gesture.distance > 0
          ? gesture.transform.scale * touches.distance / gesture.distance : gesture.transform.scale;
        apply(zoomReceiptAround(gesture.transform, scale, gesture.centre, touches.centre));
      },
      onPanResponderRelease: () => { current.current.gesture = null; },
      onPanResponderTerminate: () => { current.current.gesture = null; },
      onPanResponderTerminationRequest: () => false,
    });
  }, [apply]);

  const changeZoom = (factor: number) => {
    current.current.gesture = null;
    apply(zoomReceiptAround(current.current.transform, current.current.transform.scale * factor, { x: 0, y: 0 }));
  };
  const reset = () => { current.current.gesture = null; apply(INITIAL_RECEIPT_TRANSFORM); };

  return <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>استعراض الإيصال</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق استعراض الإيصال" onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
        <View testID="receipt-viewport" style={styles.viewport} {...responder.panHandlers} onLayout={({ nativeEvent: { layout } }) => {
          if (layout.width !== current.current.viewport.width || layout.height !== current.current.viewport.height) {
            current.current.viewport = { width: layout.width, height: layout.height };
            reset();
          }
        }}>
          {/* Make the viewport the touch target so touch coordinates stay
              independent of the image's current translation and scale. */}
          <View pointerEvents="none" style={[styles.imageFrame, { transform: [{ translateX: transform.x }, { translateY: transform.y }, { scale: transform.scale }] }]}>
            <Image source={{ uri }} style={styles.image} resizeMode="contain" resizeMethod="scale" onError={onError}
              onLoad={({ nativeEvent: { source } }) => {
                current.current.image = { width: source.width, height: source.height };
                apply(current.current.transform);
              }} />
          </View>
        </View>
        <Text style={styles.zoomLabel}>{Math.round(transform.scale * 100)}%</Text>
        <View style={styles.controls}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="تكبير الإيصال" disabled={transform.scale >= MAX_RECEIPT_ZOOM}
            onPress={() => changeZoom(1.5)} style={[styles.control, transform.scale >= MAX_RECEIPT_ZOOM && styles.disabled]}>
            <Text style={styles.buttonText}>＋ تكبير</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="تصغير الإيصال" disabled={transform.scale <= 1}
            onPress={() => changeZoom(1 / 1.5)} style={[styles.control, transform.scale <= 1 && styles.disabled]}>
            <Text style={styles.buttonText}>− تصغير</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="ملاءمة الإيصال للشاشة" onPress={reset} style={styles.control}>
            <Text style={styles.buttonText}>ملاءمة الشاشة</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>باعد بين إصبعين للتكبير، واسحب الصورة لاستعراض التفاصيل.</Text>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111317' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12 },
  title: { color: '#FFFFFF', fontFamily: typography.fontFamily.bold, fontSize: 18, flex: 1, textAlign: 'right' },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#363D47' },
  buttonText: { color: '#FFFFFF', fontFamily: typography.fontFamily.medium, fontSize: 14, textAlign: 'center' },
  viewport: { flex: 1, overflow: 'hidden' },
  imageFrame: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  image: { width: '100%', height: '100%' },
  controls: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 12 },
  control: { flex: 1, minHeight: 48, padding: 8, justifyContent: 'center', backgroundColor: '#363D47', borderRadius: 8 },
  disabled: { opacity: 0.4 },
  zoomLabel: { color: '#FFFFFF', fontFamily: typography.fontFamily.medium, fontSize: 14, textAlign: 'center', padding: 8 },
  hint: { color: '#DDE1E7', fontFamily: typography.fontFamily.regular, fontSize: 13, textAlign: 'center', padding: 12 },
});
