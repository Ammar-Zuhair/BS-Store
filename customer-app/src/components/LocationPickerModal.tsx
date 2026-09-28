import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors, typography, borderRadius, shadows, spacing } from '../theme';

export interface LocationResult {
  latitude: number;
  longitude: number;
  district: string;
  city: string;
  street?: string;
  building?: string;
  apartment?: string;
  contactPhone?: string;
  addressTitle?: string;
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

const SANA_A_AREAS = [
  { name: 'شارع حدة - تقاطع الرويشان', district: 'حدة', city: 'صنعاء', lat: 15.3340, lng: 44.1850 },
  { name: 'شارع صخر', district: 'حدة', city: 'صنعاء', lat: 15.3385, lng: 44.1925 },
  { name: 'شارع زايد', district: 'السبعين', city: 'صنعاء', lat: 15.3265, lng: 44.2185 },
  { name: 'شارع إيران', district: 'حدة', city: 'صنعاء', lat: 15.3290, lng: 44.1880 },
  { name: 'شارع صفر', district: 'حدة', city: 'صنعاء', lat: 15.3320, lng: 44.1960 },
  { name: 'شارع بغداد', district: 'الوحدة', city: 'صنعاء', lat: 15.3470, lng: 44.1990 },
  { name: 'شارع الجزائر', district: 'الوحدة', city: 'صنعاء', lat: 15.3430, lng: 44.1950 },
  { name: 'شارع عمان', district: 'حدة', city: 'صنعاء', lat: 15.3300, lng: 44.1900 },
  { name: 'شارع الزبيري', district: 'التحرير', city: 'صنعاء', lat: 15.3500, lng: 44.2050 },
  { name: 'ميدان التحرير', district: 'التحرير', city: 'صنعاء', lat: 15.3550, lng: 44.2080 },
  { name: 'شارع الستين الغربي', district: 'معين', city: 'صنعاء', lat: 15.3520, lng: 44.1780 },
  { name: 'شارع الستين الجنوبي', district: 'السبعين', city: 'صنعاء', lat: 15.3210, lng: 44.1950 },
  { name: 'شارع الستين الشمالي', district: 'الثورة', city: 'صنعاء', lat: 15.3880, lng: 44.1850 },
  { name: 'شميلة سنتر', district: 'السبعين', city: 'صنعاء', lat: 15.3180, lng: 44.2250 },
  { name: 'شارع تعز', district: 'الصافية', city: 'صنعاء', lat: 15.3360, lng: 44.2200 },
  { name: 'شارع هايل', district: 'معين', city: 'صنعاء', lat: 15.3600, lng: 44.1900 },
  { name: 'شارع النصر', district: 'شعوب', city: 'صنعاء', lat: 15.3780, lng: 44.2380 },
  { name: 'مذبح', district: 'معين', city: 'صنعاء', lat: 15.3720, lng: 44.1680 },
  { name: 'عصر', district: 'معين', city: 'صنعاء', lat: 15.3400, lng: 44.1650 },
  { name: 'الحصبة', district: 'الثورة', city: 'صنعاء', lat: 15.3850, lng: 44.2020 },
  { name: 'شارع تونس', district: 'الثورة', city: 'صنعاء', lat: 15.3690, lng: 44.2120 },
  { name: 'شارع 14 أكتوبر', district: 'حدة', city: 'صنعاء', lat: 15.3315, lng: 44.1820 },
  { name: 'شيراتون وفندق نوفمبيك', district: 'أزال', city: 'صنعاء', lat: 15.3580, lng: 44.2350 },
];

const findNearestArea = (lat: number, lng: number) => {
  let nearest = SANA_A_AREAS[0];
  let minDistance = Infinity;
  for (const item of SANA_A_AREAS) {
    const d = Math.hypot(item.lat - lat, item.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = item;
    }
  }
  return nearest;
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  initialLat = 15.3340,
  initialLng = 44.1850,
  initialDistrict = 'شارع حدة',
  onConfirm,
  title = 'تحديد موقع التوصيل',
}) => {
  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [currentDistrict, setCurrentDistrict] = useState<string>(initialDistrict);
  const [currentCity] = useState<string>('صنعاء');
  const [streetInput, setStreetInput] = useState<string>(initialDistrict);
  const [buildingInput, setBuildingInput] = useState<string>('');
  const [apartmentInput, setApartmentInput] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<typeof SANA_A_AREAS>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (visible) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setCurrentDistrict(initialDistrict);
      setStreetInput(initialDistrict);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [visible, initialLat, initialLng, initialDistrict]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = SANA_A_AREAS.filter(
      (a) => a.name.includes(text) || a.district.includes(text)
    ).slice(0, 5);
    setSearchResults(filtered);
  };

  const handleSelectSearchResult = (area: typeof SANA_A_AREAS[0]) => {
    setCurrentLat(area.lat);
    setCurrentLng(area.lng);
    setCurrentDistrict(area.district);
    setStreetInput(area.name);
    setSearchQuery('');
    setSearchResults([]);

    panMapTo(area.lat, area.lng);
  };

  const panMapTo = (lat: number, lng: number) => {
    const js = `
      if (window.map) {
        window.map.setView([${lat}, ${lng}], 16, { animate: true });
      }
      true;
    `;
    if (Platform.OS === 'web') {
      window.postMessage({ action: 'panTo', lat, lng }, '*');
    } else {
      webViewRef.current?.injectJavaScript(js);
    }
  };

  const handleDetectGPS = async () => {
    setIsLocating(true);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'صلاحية الموقع الجغرافي',
            'يرجى تفعيل صلاحية الوصول للموقع الجغرافي (GPS) لتحديد عنوانك تلقائياً.'
          );
          setIsLocating(false);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        const nearest = findNearestArea(lat, lng);
        setCurrentDistrict(nearest.district);
        setStreetInput(nearest.name);
        panMapTo(lat, lng);
      } else {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setCurrentLat(lat);
              setCurrentLng(lng);
              const nearest = findNearestArea(lat, lng);
              setCurrentDistrict(nearest.district);
              setStreetInput(nearest.name);
              panMapTo(lat, lng);
            },
            () => {
              Alert.alert('تنبيه GPS', 'تعذر جلب موقع الهاتف، يمكنك تحريك الخريطة لتثبيت المؤشر.');
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }
      }
    } catch (err) {
      console.warn('GPS detection err:', err);
      Alert.alert('تنبيه GPS', 'يرجى تحريك الخريطة لوضع المؤشر على موقعك بدقة.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.latitude && data.longitude) {
        const lat = parseFloat(Number(data.latitude).toFixed(6));
        const lng = parseFloat(Number(data.longitude).toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);
        const nearest = findNearestArea(lat, lng);
        setCurrentDistrict(nearest.district);
        if (!streetInput || SANA_A_AREAS.some((a) => a.name === streetInput)) {
          setStreetInput(nearest.name);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleConfirm = () => {
    const finalStreet = streetInput.trim() || currentDistrict;
    const details = [
      currentCity,
      currentDistrict,
      finalStreet,
      buildingInput.trim() ? `عمارة ${buildingInput.trim()}` : '',
      apartmentInput.trim() ? `شقة/طابق ${apartmentInput.trim()}` : '',
    ].filter(Boolean).join('، ');

    onConfirm({
      latitude: currentLat,
      longitude: currentLng,
      district: currentDistrict,
      city: currentCity,
      street: finalStreet,
      building: buildingInput.trim() || undefined,
      apartment: apartmentInput.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      addressTitle: details,
    });
    onClose();
  };

  const leafletHtml = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; }
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F4F5F7; overflow: hidden; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${initialLat}, ${initialLng}], 16);
    window.map = map;

    // Use standard, natural colored OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    function reportCenter() {
      var center = map.getCenter();
      var payload = JSON.stringify({
        source: 'bs-map',
        latitude: center.lat,
        longitude: center.lng
      });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.parent) {
        window.parent.postMessage(payload, '*');
      }
    }

    map.on('moveend', reportCenter);

    window.addEventListener('message', function(e) {
      if (e.data && e.data.action === 'panTo') {
        map.setView([e.data.lat, e.data.lng], 16, { animate: true });
      }
    });
  </script>
</body>
</html>`;

  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#181A1E" translucent />

        {/* 1. Top Safe Header Bar (Charcoal Theme) */}
        <View style={[styles.topBar, { paddingTop: topInset }]}>
          <TouchableOpacity
            style={styles.topBarActionBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'تحديد الموقع بدقة',
                'اسحب الخريطة لضبط المؤشر على موقع منزلك أو عملك بدقة، ثم اضغط حفظ وتأكيد الموقع.'
              )
            }
          >
            <View style={styles.helpIconCircle}>
              <Text style={styles.helpIconText}>؟</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.topBarTitleWrap}>
            <Text style={styles.topBarTitle}>{title}</Text>
            <Text style={styles.topBarSubtitle}>متجر بي إس • دقة الموقع وسرعة التوصيل</Text>
          </View>

          <TouchableOpacity style={styles.topBarActionBtn} activeOpacity={0.7} onPress={onClose}>
            <Text style={styles.topBarBackArrow}>➔</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Interactive Map Container (Natural colored Leaflet Map) */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              title="Interactive Map"
              srcDoc={leafletHtml}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <WebView
              ref={webViewRef}
              source={{ html: leafletHtml }}
              style={styles.mapAbsolute}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.mapLoader}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.mapLoaderText}>جاري تحميل الخريطة الطبيعية...</Text>
                </View>
              )}
            />
          )}

          {/* Central Precise Pin & Marker Bubble (Charcoal & Amber Palette) */}
          <View style={styles.centerMarkerWrapper} pointerEvents="none">
            <View style={styles.markerHintBubble}>
              <Text style={styles.markerHintText}>📍 موقع التوصيل المحدد</Text>
            </View>
            <View style={styles.pinHead}>
              <View style={styles.pinDot} />
            </View>
            <View style={styles.pinTip} />
            <View style={styles.gpsPulseRing}>
              <View style={styles.gpsCenterDot} />
            </View>
          </View>

          {/* Live Coordinates Pill */}
          <View style={styles.coordinatesPill}>
            <Text style={styles.coordinatesPillText}>
              📍 {currentLat.toFixed(5)}, {currentLng.toFixed(5)} ({currentDistrict})
            </Text>
          </View>

          {/* Floating Search Bar */}
          <View style={styles.searchFloatingWrap}>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="ابحث عن شارع أو حي في صنعاء..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={searchQuery}
                onChangeText={handleSearchChange}
                textAlign="right"
              />
              <Text style={styles.searchIcon}>🔍</Text>
            </View>

            {/* Live Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <View style={styles.searchResultsDropdown}>
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectSearchResult(item)}
                  >
                    <Text style={styles.searchResultText}>
                      📍 {item.name} - {item.district}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Floating "موقعي الحالي" GPS Button */}
          <TouchableOpacity
            style={styles.currentLocationFloatingBtn}
            onPress={handleDetectGPS}
            activeOpacity={0.88}
            disabled={isLocating}
          >
            <Text style={styles.currentLocationText}>
              {isLocating ? 'جاري تحديد GPS...' : 'موقعي الحالي'}
            </Text>
            <View style={styles.gpsIconCircle}>
              <Text style={styles.gpsIcon}>🎯</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Bottom Sheet Card (Clean Project Styling) */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.bottomCard}
            contentContainerStyle={styles.bottomCardScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sheetHeaderRow}>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>عنوان دقيق</Text>
              </View>
              <Text style={styles.sheetSectionTitle}>بيانات التوصيل والتواصل</Text>
            </View>

            {/* Input 1: Street / Area */}
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="اسم الشارع والحي (مثال: شارع حدة - أمام مركز الكميم)"
                placeholderTextColor="#8891A0"
                value={streetInput}
                onChangeText={setStreetInput}
                textAlign="right"
              />
              <View style={styles.inputIconBox}>
                <Text style={styles.inputIcon}>🛣️</Text>
              </View>
            </View>

            {/* Input 2: Building & Apartment Row */}
            <View style={styles.inputsRow2}>
              <View style={[styles.inputBox, { flex: 1 }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="رقم الشقة / الطابق"
                  placeholderTextColor="#8891A0"
                  value={apartmentInput}
                  onChangeText={setApartmentInput}
                  textAlign="right"
                />
                <View style={styles.inputIconBox}>
                  <Text style={styles.inputIcon}>🚪</Text>
                </View>
              </View>

              <View style={[styles.inputBox, { flex: 1 }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="رقم العمارة / المنزل"
                  placeholderTextColor="#8891A0"
                  value={buildingInput}
                  onChangeText={setBuildingInput}
                  textAlign="right"
                />
                <View style={styles.inputIconBox}>
                  <Text style={styles.inputIcon}>🏢</Text>
                </View>
              </View>
            </View>

            {/* Input 3: Contact Phone */}
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="رقم هاتف الاتصال للتسليم (مثال: 777123456)"
                placeholderTextColor="#8891A0"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
              <View style={styles.inputIconBox}>
                <Text style={styles.inputIcon}>📞</Text>
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.saveLocationBtn}
              onPress={handleConfirm}
              activeOpacity={0.9}
            >
              <Text style={styles.saveLocationBtnText}>تأكيد وحفظ موقع التوصيل ✓</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 30,
  },
  topBarTitleWrap: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  topBarSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.primaryFixedDim,
    marginTop: 2,
  },
  topBarActionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
  },
  topBarBackArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  helpIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E8EBEF',
  },
  mapAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  mapLoaderText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  searchFloatingWrap: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurface,
    paddingVertical: 4,
    textAlign: 'right',
  },
  searchIcon: {
    fontSize: 16,
    color: colors.outline,
    marginLeft: 8,
  },
  searchResultsDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
    overflow: 'hidden',
  },
  searchResultItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  searchResultText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'right',
  },
  centerMarkerWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -16 }, { translateY: -44 }],
    zIndex: 10,
  },
  markerHintBubble: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  markerHintText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  pinTip: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    marginTop: -2,
  },
  gpsPulseRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(24, 26, 30, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  gpsCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  coordinatesPill: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(24, 26, 30, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 12,
  },
  coordinatesPillText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: '#FFFFFF',
  },
  currentLocationFloatingBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
    zIndex: 12,
  },
  currentLocationText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 6,
  },
  gpsIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsIcon: {
    fontSize: 15,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  bottomCardScroll: {
    paddingBottom: 24,
  },
  sheetHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetSectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  pillBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  pillBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.secondary,
  },
  inputsRow2: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.2,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    height: 48,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'right',
    paddingVertical: 4,
  },
  inputIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  inputIcon: {
    fontSize: 15,
  },
  saveLocationBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.button,
  },
  saveLocationBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
