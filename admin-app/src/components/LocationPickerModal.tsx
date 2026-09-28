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
  Image,
  TextInput,
  PanResponder,
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

const ZOOM = 15;
const TILE_SIZE = 256;
const toTile = (latitude: number, longitude: number) => {
  const scale = 2 ** ZOOM;
  const lat = Math.max(-85, Math.min(85, latitude)) * Math.PI / 180;
  return {
    x: (longitude + 180) / 360 * scale,
    y: (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * scale,
  };
};
const fromTile = (x: number, y: number) => {
  const scale = 2 ** ZOOM;
  const wrappedX = ((x % scale) + scale) % scale;
  return {
    longitude: wrappedX / scale * 360 - 180,
    latitude: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale))) * 180 / Math.PI,
  };
};

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
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const panOrigin = React.useRef({ latitude: initialLat, longitude: initialLng });

  useEffect(() => {
    if (visible) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setCurrentDistrict(initialDistrict);
      setSearchQuery('');
      setSearchResults([]);
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

  const adjustCoords = (dLat: number, dLng: number) => {
    setCurrentLat((prev) => parseFloat((prev + dLat).toFixed(5)));
    setCurrentLng((prev) => parseFloat((prev + dLng).toFixed(5)));
  };

  const mapPanResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { panOrigin.current = { latitude: currentLat, longitude: currentLng }; },
    onPanResponderMove: (_event, gesture) => {
      const origin = toTile(panOrigin.current.latitude, panOrigin.current.longitude);
      const selected = fromTile(origin.x - gesture.dx / TILE_SIZE, origin.y - gesture.dy / TILE_SIZE);
      setCurrentLat(selected.latitude);
      setCurrentLng(selected.longitude);
      setCurrentDistrict('الموقع المحدد على الخريطة');
    },
  }), []);

  const searchAddress = async () => {
    if (searchQuery.trim().length < 3) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=5&accept-language=ar`, {
        headers: { 'User-Agent': 'BSStore-Admin/1.0' },
      });
      const rows = await response.json();
      setSearchResults(Array.isArray(rows) ? rows.map((row: any) => ({ name: row.display_name, lat: Number(row.lat), lng: Number(row.lon) })) : []);
    } catch {
      Alert.alert('تعذر البحث', 'تحقق من الاتصال بالإنترنت ثم حاول مجدداً.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      latitude: currentLat,
      longitude: currentLng,
      district: currentDistrict,
      city: '',
    });
    onClose();
  };

  const centerTile = toTile(currentLat, currentLng);
  const centerTileX = Math.floor(centerTile.x);
  const centerTileY = Math.floor(centerTile.y);
  const mapTiles = [];
  // Request only tiles intersecting the visible map (plus a one-tile margin).
  // The OSM standard tile service explicitly disallows broad prefetching.
  const visibleColumns = Math.ceil(mapSize.width / TILE_SIZE / 2) + 1;
  const visibleRows = Math.ceil(mapSize.height / TILE_SIZE / 2) + 1;
  for (let y = -visibleRows; y <= visibleRows; y++) {
    for (let x = -visibleColumns; x <= visibleColumns; x++) {
      const tileX = centerTileX + x;
      const tileY = centerTileY + y;
      const tileCount = 2 ** ZOOM;
      if (tileY < 0 || tileY >= tileCount) continue;
      mapTiles.push({
        key: `${tileX}-${tileY}`,
        uri: `https://tile.openstreetmap.org/${ZOOM}/${((tileX % tileCount) + tileCount) % tileCount}/${tileY}.png`,
        left: mapSize.width / 2 + (x - (centerTile.x - centerTileX)) * TILE_SIZE,
        top: mapSize.height / 2 + (y - (centerTile.y - centerTileY)) * TILE_SIZE,
      });
    }
  }

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
          <View style={styles.mapFrame} onLayout={(event) => setMapSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
            <View style={StyleSheet.absoluteFill} {...mapPanResponder.panHandlers}>
              {mapTiles.map((tile) => <Image key={tile.key} source={{ uri: tile.uri, headers: { 'User-Agent': 'BSStore-Admin/1.0 (store location picker)' } }} style={{ position: 'absolute', left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }} resizeMode="cover" />)}
            </View>
            <View style={styles.mapAttribution} pointerEvents="none"><Text style={styles.mapAttributionText}>© OpenStreetMap contributors</Text></View>

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

          <View style={styles.searchRow}>
            <TouchableOpacity style={styles.searchButton} onPress={searchAddress} disabled={isSearching}>
              <Text style={styles.searchButtonText}>{isSearching ? '...' : 'بحث'}</Text>
            </TouchableOpacity>
            <TextInput style={styles.searchInput} placeholder="ابحث عن مدينة أو شارع" placeholderTextColor={colors.outline} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={searchAddress} returnKeyType="search" textAlign="right" />
          </View>

          {/* Search results */}
          {searchResults.length > 0 ? <View style={styles.presetsSection}>
            <Text style={styles.presetsLabel}>نتائج البحث — اختر موقع المتجر:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsScroll}
            >
              {searchResults.map((p) => {
                const isSelected = currentDistrict === p.name;
                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => { setCurrentLat(p.lat); setCurrentLng(p.lng); setCurrentDistrict(p.name); setSearchResults([]); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      🏪 {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View> : null}

          {/* Selected Location Summary Card */}
          <View style={styles.locationSummaryBox}>
            <View style={styles.locationSummaryRight}>
              <Text style={styles.summaryDistrict}>
                {currentDistrict || 'الموقع المحدد'}
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
  mapAttribution: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    zIndex: 11,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  mapAttributionText: { color: '#333', fontSize: 9 },
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
  searchRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: spacing.baseSm },
  searchInput: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
  },
  searchButton: { minWidth: 58, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary, paddingHorizontal: 10 },
  searchButtonText: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold },
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
