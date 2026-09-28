import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

export interface LocationResult {
  latitude: number;
  longitude: number;
  district: string;
  city: string;
}

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  initialDistrict?: string;
  onConfirm: (location: LocationResult) => void;
  title?: string;
}

const COMMERCIAL_DISTRICTS = [
  { name: 'حدة (البرج التجاري)', lat: 15.3340, lng: 44.1850 },
  { name: 'الستين الغربي', lat: 15.3520, lng: 44.1780 },
  { name: 'شارع الزبيري', lat: 15.3500, lng: 44.2050 },
  { name: 'ميدان التحرير', lat: 15.3550, lng: 44.2080 },
  { name: 'شميلة سنتر', lat: 15.3180, lng: 44.2250 },
  { name: 'مذبح التجاري', lat: 15.3720, lng: 44.1680 },
  { name: 'جولة عصر', lat: 15.3400, lng: 44.1650 },
  { name: 'الحصبة', lat: 15.3850, lng: 44.2020 },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  initialLat = 15.3500,
  initialLng = 44.2050,
  initialDistrict = 'شارع الزبيري',
  onConfirm,
  title = 'تحديد موقع المتجر على الخريطة',
}) => {
  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [currentDistrict, setCurrentDistrict] = useState<string>(initialDistrict);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setCurrentDistrict(initialDistrict);
    }
  }, [visible, initialLat, initialLng, initialDistrict]);

  const handleDetectGPS = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLat(lat);
          setCurrentLng(lng);
          setCurrentDistrict('موقع المتجر الحالي');
          setIsLocating(false);
        },
        (error) => {
          setIsLocating(false);
          Alert.alert(
            'تنبيه الموقع',
            'تعذر الحصول على إشارة GPS تلقائياً. يمكنك اختيار المنطقة أو الشارع التجاري من القائمة أدناه.'
          );
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      Alert.alert('تنبيه', 'خاصية تحديد الموقع الجغرافي غير مدعومة على هذا الجهاز');
    }
  };

  const handleSelectPreset = (preset: typeof COMMERCIAL_DISTRICTS[0]) => {
    setCurrentLat(preset.lat);
    setCurrentLng(preset.lng);
    setCurrentDistrict(preset.name);
  };

  const adjustCoords = (dLat: number, dLng: number) => {
    setCurrentLat((prev) => parseFloat((prev + dLat).toFixed(5)));
    setCurrentLng((prev) => parseFloat((prev + dLng).toFixed(5)));
  };

  const handleConfirm = () => {
    onConfirm({
      latitude: currentLat,
      longitude: currentLng,
      district: currentDistrict,
      city: 'صنعاء',
    });
    onClose();
  };

  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${currentLng - 0.015}%2C${currentLat - 0.015}%2C${currentLng + 0.015}%2C${currentLat + 0.015}&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>حدد نقطة استلام الطلبات وحساب المسافات بدقة</Text>
            </View>
          </View>

          {/* Map Viewer Container */}
          <View style={styles.mapFrame}>
            {Platform.OS === 'web' ? (
              <iframe
                title="Store Location Map"
                src={mapEmbedUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 16,
                }}
              />
            ) : (
              <View style={styles.mapFallbackPlaceholder}>
                <Text style={{ fontSize: 42 }}>🏪</Text>
                <Text style={styles.mapFallbackText}>خريطة موقع المتجر</Text>
              </View>
            )}

            {/* Central Floating Pin Marker */}
            <View style={styles.floatingPinBox} pointerEvents="none">
              <View style={styles.pinBubble}>
                <Text style={styles.pinBubbleText}>🏪 {currentDistrict}</Text>
              </View>
              <Text style={styles.pinIcon}>📍</Text>
              <View style={styles.pinShadow} />
            </View>

            {/* GPS Detection Button Floating */}
            <TouchableOpacity
              style={styles.gpsFloatingBtn}
              onPress={handleDetectGPS}
              activeOpacity={0.85}
              disabled={isLocating}
            >
              <Text style={styles.gpsFloatingIcon}>{isLocating ? '⏳' : '🎯'}</Text>
              <Text style={styles.gpsFloatingText}>
                {isLocating ? 'جاري التحديد...' : 'موقع المتجر الحالي (GPS)'}
              </Text>
            </TouchableOpacity>

            {/* Fine Tuning D-Pad */}
            <View style={styles.dPadContainer}>
              <TouchableOpacity
                style={styles.dPadBtn}
                onPress={() => adjustCoords(0.003, 0)}
                activeOpacity={0.7}
              >
                <Text style={styles.dPadText}>▲</Text>
              </TouchableOpacity>
              <View style={styles.dPadRow}>
                <TouchableOpacity
                  style={styles.dPadBtn}
                  onPress={() => adjustCoords(0, 0.003)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dPadText}>◀</Text>
                </TouchableOpacity>
                <View style={styles.dPadCenter} />
                <TouchableOpacity
                  style={styles.dPadBtn}
                  onPress={() => adjustCoords(0, -0.003)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dPadText}>▶</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.dPadBtn}
                onPress={() => adjustCoords(-0.003, 0)}
                activeOpacity={0.7}
              >
                <Text style={styles.dPadText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Commercial Area Selector */}
          <View style={styles.presetsSection}>
            <Text style={styles.presetsLabel}>أو اختر من المناطق والشوارع التجارية الرئيسية:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsScroll}
            >
              {COMMERCIAL_DISTRICTS.map((p) => {
                const isSelected = currentDistrict === p.name;
                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => handleSelectPreset(p)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      🏪 {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Location Summary Card */}
          <View style={styles.locationSummaryBox}>
            <View style={styles.locationSummaryRight}>
              <Text style={styles.summaryDistrict}>
                {currentDistrict} - صنعاء
              </Text>
              <Text style={styles.summaryCoords}>
                خط العرض: {currentLat.toFixed(5)} • خط الطول: {currentLng.toFixed(5)}
              </Text>
            </View>
            <View style={styles.verifiedIconBox}>
              <Text style={{ fontSize: 20 }}>✅</Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            activeOpacity={0.88}
          >
            <Text style={styles.confirmBtnText}>تأكيد واعتماد موقع المتجر ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.baseMd,
    maxHeight: '92%',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.onSurface,
    fontWeight: typography.fontWeight.bold,
  },
  headerTitleWrap: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
    color: colors.primary,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.outline,
    marginTop: 2,
  },
  mapFrame: {
    height: 290,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant + '40',
    marginBottom: spacing.baseSm,
  },
  mapFallbackPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFallbackText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.onSurfaceVariant,
    fontSize: 13,
    marginTop: 8,
  },
  floatingPinBox: {
    position: 'absolute',
    top: '38%',
    left: '40%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinBubble: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginBottom: 2,
    ...shadows.card,
  },
  pinBubbleText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
  },
  pinIcon: {
    fontSize: 32,
    lineHeight: 34,
  },
  pinShadow: {
    width: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -2,
  },
  gpsFloatingBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    ...shadows.card,
    zIndex: 12,
  },
  gpsFloatingIcon: {
    fontSize: 15,
  },
  gpsFloatingText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  dPadContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.md,
    padding: 4,
    alignItems: 'center',
    ...shadows.card,
    zIndex: 12,
  },
  dPadRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dPadBtn: {
    width: 26,
    height: 26,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dPadCenter: {
    width: 26,
    height: 26,
  },
  dPadText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: 'bold',
  },
  presetsSection: {
    marginBottom: spacing.baseSm,
  },
  presetsLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 6,
  },
  presetsScroll: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurface,
  },
  presetChipTextActive: {
    color: colors.onPrimary,
    fontFamily: typography.fontFamily.bold,
  },
  locationSummaryBox: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    marginBottom: spacing.baseMd,
  },
  locationSummaryRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  summaryDistrict: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  summaryCoords: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.outline,
    marginTop: 2,
  },
  verifiedIconBox: {
    marginLeft: 8,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  confirmBtnText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});
