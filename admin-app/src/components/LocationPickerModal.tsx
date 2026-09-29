import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
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

const SANAA_PRESETS = [
  { name: 'شارع الزبيري', lat: 15.3500, lng: 44.2050 },
  { name: 'شارع حدة', lat: 15.3280, lng: 44.1950 },
  { name: 'شارع هايل', lat: 15.3620, lng: 44.1920 },
  { name: 'حي الصافية', lat: 15.3410, lng: 44.2200 },
  { name: 'منطقة شميلة', lat: 15.3150, lng: 44.2250 },
  { name: 'منطقة الحصبة', lat: 15.3850, lng: 44.2000 },
  { name: 'شارع تعز', lat: 15.3200, lng: 44.2150 },
  { name: 'حي مذبح', lat: 15.3720, lng: 44.1680 },
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const webViewRef = useRef<WebView>(null);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setCurrentDistrict(initialDistrict);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [visible, initialLat, initialLng, initialDistrict]);

  const panMapTo = (lat: number, lng: number) => {
    const js = `
      if (window.map) {
        window.map.setView([${lat}, ${lng}], 16, { animate: true });
      }
      true;
    `;
    if (Platform.OS === 'web') {
      try {
        const iframe = document.getElementById('admin-leaflet-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ action: 'panTo', lat, lng }), '*');
        }
      } catch (err) {
        console.warn('Web panMapTo err:', err);
      }
    } else {
      webViewRef.current?.injectJavaScript(js);
    }
  };

  const handleSelectPreset = (preset: typeof SANAA_PRESETS[0]) => {
    setCurrentLat(preset.lat);
    setCurrentLng(preset.lng);
    setCurrentDistrict(preset.name);
    panMapTo(preset.lat, preset.lng);
  };

  const handleDetectGPS = async () => {
    setIsLocating(true);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'صلاحية الموقع مطلوبة',
            'يرجى السماح بالوصول إلى الموقع الجغرافي (GPS) لتحديد موقع المتجر بدقة.'
          );
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);
        panMapTo(lat, lng);

        try {
          const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (rev && rev.length > 0) {
            const addr = rev[0];
            const detected = [addr.district, addr.street, addr.city].filter(Boolean).join('، ');
            if (detected) setCurrentDistrict(detected);
          }
        } catch {
          // ignore geocode error
        }

        Alert.alert('تم بنجاح ✓', 'تم تحديد موقع المتجر عبر GPS بنجاح.');
      } else {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = parseFloat(pos.coords.latitude.toFixed(6));
              const lng = parseFloat(pos.coords.longitude.toFixed(6));
              setCurrentLat(lat);
              setCurrentLng(lng);
              panMapTo(lat, lng);
              Alert.alert('تم بنجاح ✓', 'تم تحديد الموقع بنجاح.');
            },
            () => {
              Alert.alert('تنبيه GPS', 'تعذر جلب موقع GPS تلقائياً. يمكنك تحريك الخريطة لتحديد الموقع.');
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }
      }
    } catch (error: any) {
      Alert.alert('تعذر تحديد الموقع', error?.message || 'تحقق من صلاحيات الموقع وحاول مجدداً.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text.trim() || text.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = encodeURIComponent(text.trim());
        const headers: Record<string, string> =
          Platform.OS !== 'web' ? { 'User-Agent': 'BSStore-Admin/1.0' } : {};
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&accept-language=ar`,
          { headers }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(
            data.map((item: any) => ({
              name: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            }))
          );
        }
      } catch (err) {
        console.warn('Geocoding search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectSearchResult = (item: { name: string; lat: number; lng: number }) => {
    setCurrentLat(item.lat);
    setCurrentLng(item.lng);
    setCurrentDistrict(item.name.split(',')[0] || item.name);
    setSearchQuery('');
    setSearchResults([]);
    panMapTo(item.lat, item.lng);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = typeof event.nativeEvent.data === 'string'
        ? JSON.parse(event.nativeEvent.data)
        : event.nativeEvent.data;
      if (data.latitude && data.longitude) {
        setCurrentLat(parseFloat(Number(data.latitude).toFixed(6)));
        setCurrentLng(parseFloat(Number(data.longitude).toFixed(6)));
      }
    } catch {
      // ignore
    }
  };

  // Listen to web iframe postMessage
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (evt: MessageEvent) => {
        try {
          const data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
          if (data && data.latitude && data.longitude) {
            setCurrentLat(parseFloat(Number(data.latitude).toFixed(6)));
            setCurrentLng(parseFloat(Number(data.longitude).toFixed(6)));
          }
        } catch {
          // ignore
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, []);

  const handleConfirm = () => {
    onConfirm({
      latitude: currentLat,
      longitude: currentLng,
      district: currentDistrict || 'موقع محدد على الخريطة',
      city: 'صنعاء',
    });
    onClose();
  };

  const leafletHtml = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #E8EBEF; }
    .center-pin-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      pointer-events: none;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .pin-head {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #181A1E;
      border: 3px solid #F59E0B;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      color: #FFFFFF;
      font-size: 16px;
    }
    .pin-tip {
      width: 0;
      height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 11px solid #181A1E;
      margin-top: -2px;
    }
    .gps-shadow {
      width: 18px;
      height: 6px;
      background: rgba(0,0,0,0.28);
      border-radius: 50%;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin-container">
    <div class="pin-head">🏪</div>
    <div class="pin-tip"></div>
    <div class="gps-shadow"></div>
  </div>
  <script>
    var initialLat = ${currentLat};
    var initialLng = ${currentLng};

    var map = L.map('map', {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    window.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    function reportCenter() {
      var center = map.getCenter();
      var payload = JSON.stringify({
        latitude: center.lat,
        longitude: center.lng
      });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(payload);
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    }

    map.on('moveend', reportCenter);

    window.addEventListener('message', function(event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.action === 'panTo') {
          map.setView([data.lat, data.lng], 16, { animate: true });
        }
      } catch(e){}
    });
  </script>
</body>
</html>`;

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
              <Text style={styles.headerSubtitle}>حرّك الخريطة أو استخدم GPS لتحديد موقع المتجر بدقة</Text>
            </View>
          </View>

          {/* Interactive Map Frame */}
          <View style={styles.mapFrame}>
            {Platform.OS === 'web' ? (
              React.createElement('iframe', {
                id: 'admin-leaflet-iframe',
                srcDoc: leafletHtml,
                style: { width: '100%', height: '100%', border: 'none' },
              })
            ) : (
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: leafletHtml }}
                onMessage={handleWebViewMessage}
                style={styles.mapAbsolute}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            )}

            {/* Search Bar on Map */}
            <View style={styles.searchFloatingWrap}>
              <View style={styles.searchBar}>
                {isSearching ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.searchIcon}>🔍</Text>
                )}
                <TextInput
                  style={styles.searchInput}
                  placeholder="ابحث عن اسم الشارع أو المنطقة أو المعلم..."
                  placeholderTextColor={colors.outline}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  textAlign="right"
                />
              </View>

              {searchResults.length > 0 && (
                <View style={styles.searchResultsDropdown}>
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectSearchResult(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.searchResultText} numberOfLines={1}>
                        📍 {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* GPS Floating Action Button */}
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

            {/* Coordinates Badge */}
            <View style={styles.coordinatesPill}>
              <Text style={styles.coordinatesPillText}>
                {currentLat.toFixed(5)} , {currentLng.toFixed(5)}
              </Text>
            </View>
          </View>

          {/* Quick Presets & Confirmation Bottom Sheet */}
          <View style={styles.bottomCard}>
            <View style={styles.addressInputRow}>
              <TextInput
                style={styles.addressInput}
                value={currentDistrict}
                onChangeText={setCurrentDistrict}
                placeholder="اسم الحي أو الشارع للمتجر..."
                placeholderTextColor={colors.outline}
                textAlign="right"
              />
              <Text style={styles.addressLabel}>عنوان المتجر:</Text>
            </View>

            {/* Quick Sanaa Presets */}
            <Text style={styles.presetsLabel}>مناطق سريعة في أمانة العاصمة:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
              {SANAA_PRESETS.map((p) => {
                const isSelected = Math.abs(currentLat - p.lat) < 0.005 && Math.abs(currentLng - p.lng) < 0.005;
                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => handleSelectPreset(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Confirm Button */}
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>✓ تأكيد موقع المتجر وحفظ الإحداثيات</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    height: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.baseMd,
    paddingVertical: spacing.baseSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
    fontWeight: typography.fontWeight.bold,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    fontFamily: typography.fontFamily.bold,
  },
  mapFrame: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E8EBEF',
  },
  mapAbsolute: {
    ...StyleSheet.absoluteFill,
  },
  searchFloatingWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    ...shadows.card,
  },
  searchIcon: {
    fontSize: 15,
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    paddingVertical: 2,
  },
  searchResultsDropdown: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    maxHeight: 180,
    ...shadows.card,
  },
  searchResultItem: {
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '20',
  },
  searchResultText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'right',
  },
  gpsFloatingBtn: {
    position: 'absolute',
    bottom: 46,
    right: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    ...shadows.floating,
    zIndex: 90,
  },
  gpsFloatingIcon: {
    fontSize: 15,
  },
  gpsFloatingText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  coordinatesPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(24, 26, 30, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    zIndex: 90,
  },
  coordinatesPillText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: '#FFFFFF',
    direction: 'ltr',
  },
  bottomCard: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.baseMd,
    paddingTop: spacing.baseSm,
    paddingBottom: spacing.baseMd,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '25',
  },
  addressInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addressLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
  },
  addressInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
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
    marginBottom: 12,
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
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: 13,
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
