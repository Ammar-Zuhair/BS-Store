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

const buildLeafletHtml = (lat: number, lng: number) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" onerror="this.onerror=null;this.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #E8EBEF; overflow: hidden; }
    .leaflet-control-attribution { display: none !important; }
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
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #181A1E;
      border: 3px solid #F59E0B;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      color: #FFFFFF;
      font-size: 18px;
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

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    function startLeaflet() {
      if (typeof L === 'undefined') {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        s.onload = initMap;
        document.head.appendChild(s);
      } else {
        initMap();
      }
    }

    function initMap() {
      if (typeof L === 'undefined') return;
      var map = L.map('map', {
        center: [${lat}, ${lng}],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true
      });
      window.map = map;

      // CartoDB Voyager tiles (Fast, worldwide CDN, high-contrast Arabic labels)
      var cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c', 'd'],
        attribution: '© OpenStreetMap, © CartoDB'
      });

      // OSM standard fallback
      var osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '© OpenStreetMap'
      });

      cartoVoyager.on('tileerror', function() {
        if (!map.hasLayer(osmStandard)) {
          osmStandard.addTo(map);
        }
      });

      cartoVoyager.addTo(map);

      var reportTimer = null;
      function reportCenter() {
        if (reportTimer) clearTimeout(reportTimer);
        reportTimer = setTimeout(function() {
          try {
            var center = map.getCenter();
            var payload = JSON.stringify({
              latitude: center.lat,
              longitude: center.lng
            });
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(payload);
            }
            if (window.parent && window.parent !== window) {
              window.parent.postMessage(payload, '*');
            }
          } catch(e){}
        }, 80);
      }

      map.on('moveend', reportCenter);
      map.on('zoomend', reportCenter);

      window.addEventListener('message', function(event) {
        try {
          var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.action === 'panTo') {
            map.setView([data.lat, data.lng], 16, { animate: true });
          }
        } catch(e){}
      });

      function triggerResize() {
        try { map.invalidateSize(); } catch(e){}
      }

      setTimeout(triggerResize, 150);
      setTimeout(triggerResize, 400);
      setTimeout(triggerResize, 900);
      window.addEventListener('resize', triggerResize);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startLeaflet);
    } else {
      startLeaflet();
    }
  </script>
</body>
</html>`;

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  initialLat = 15.35,
  initialLng = 44.20,
  initialDistrict = '',
  onConfirm,
  title = 'تحديد موقع المتجر على الخريطة',
}) => {
  const [sessionKey, setSessionKey] = useState<number>(0);
  const initialCoordsRef = useRef({ lat: initialLat, lng: initialLng });
  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [currentDistrict, setCurrentDistrict] = useState<string>(initialDistrict);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [fullAddress, setFullAddress] = useState<string>(initialDistrict);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const iframeRef = useRef<any>(null);
  const webViewRef = useRef<WebView>(null);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      initialCoordsRef.current = { lat: initialLat, lng: initialLng };
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setCurrentDistrict(initialDistrict);
      setFullAddress(initialDistrict);
      setSearchQuery('');
      setSearchResults([]);
      setSessionKey((prev) => prev + 1);
    }
  }, [visible, initialLat, initialLng, initialDistrict]);

  // Listen to web iframe postMessage
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (evt: MessageEvent) => {
        try {
          const data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
          if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            setCurrentLat(parseFloat(data.latitude.toFixed(6)));
            setCurrentLng(parseFloat(data.longitude.toFixed(6)));
          }
        } catch {
          // ignore
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, []);

  // Dynamic OpenStreetMap Geocoding Search
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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&accept-language=ar`,
          {
            headers: {
              'User-Agent': 'BSStore-Admin/1.0',
            },
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((item: any) => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }));
          setSearchResults(mapped);
        }
      } catch (err) {
        console.warn('Search geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  };

  const handleSelectSearchResult = (item: { name: string; lat: number; lng: number }) => {
    setCurrentLat(item.lat);
    setCurrentLng(item.lng);
    setFullAddress(item.name);
    setSearchQuery('');
    setSearchResults([]);
    panMapTo(item.lat, item.lng);
  };

  const panMapTo = (lat: number, lng: number) => {
    if (Platform.OS === 'web') {
      try {
        const iframe = iframeRef.current || (document.getElementById('admin-leaflet-iframe') as HTMLIFrameElement);
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ action: 'panTo', lat, lng }), '*');
        }
      } catch (err) {
        console.warn('Web panMapTo err:', err);
      }
    } else {
      const js = `
        if (window.map) {
          window.map.setView([${lat}, ${lng}], 16, { animate: true });
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(js);
    }
  };

  // ─── Native GPS Detection with 100% Arabic Alerts & Reverse Geocoding ───
  const handleDetectGPS = async () => {
    setIsLocating(true);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'صلاحية الموقع الجغرافي مطلوبة',
            'يرجى السماح للتطبيق بالوصول إلى موقعك الحالي (GPS) لتحديد موقع المتجر تلقائياً وبدقة.',
            [{ text: 'حسناً' }]
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
        panMapTo(lat, lng);

        // Reverse geocode to get actual city / district / street
        try {
          const reverseResults = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (reverseResults && reverseResults.length > 0) {
            const addr = reverseResults[0];
            const city = addr.city || addr.subregion || addr.region || '';
            const district = addr.district || addr.subregion || '';
            const street = addr.street || addr.name || '';

            if (city) setCurrentCity(city);
            if (district) setCurrentDistrict(district);

            const detectedParts = [city, district, street].filter(Boolean);
            if (detectedParts.length > 0) {
              setFullAddress(detectedParts.join(' - '));
            }
          }
        } catch {
          // If reverse geocode fails, let user type freely
        }

        Alert.alert('تم بنجاح ✓', 'تم تحديد موقع المتجر الجغرافي الحالي بنجاح.');
      } else {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setCurrentLat(lat);
              setCurrentLng(lng);
              panMapTo(lat, lng);
              Alert.alert('تم بنجاح ✓', 'تم تحديد موقع المتجر الجغرافي بنجاح.');
            },
            () => {
              Alert.alert(
                'تنبيه GPS',
                'تعذر تحديد موقع الجهاز تلقائياً، يمكنك تحريك الخريطة لتثبيت المؤشر على موقعك بدقة.'
              );
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }
      }
    } catch (err) {
      console.warn('GPS detection err:', err);
      Alert.alert(
        'تنبيه GPS',
        'تعذر تحديد الموقع تلقائياً. يرجى تحريك الخريطة لتثبيت المؤشر على موقع المتجر بدقة.'
      );
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
      }
    } catch {
      // ignore
    }
  };

  const handleConfirm = () => {
    const finalAddress = fullAddress.trim() || currentDistrict || 'موقع محدد عبر الخريطة';

    onConfirm({
      latitude: currentLat,
      longitude: currentLng,
      district: finalAddress,
      city: currentCity || 'صنعاء',
    });
    onClose();
  };

  const leafletHtml = React.useMemo(() => {
    const lat = initialCoordsRef.current.lat || 15.35;
    const lng = initialCoordsRef.current.lng || 44.20;
    return buildLeafletHtml(lat, lng);
  }, [sessionKey]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.surfaceContainerLowest} />

        {/* 1. Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarActionBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.topBarBackArrow}>✕</Text>
          </TouchableOpacity>

          <View style={styles.topBarTitleWrap}>
            <Text style={styles.topBarTitle}>{title}</Text>
            <Text style={styles.topBarSubtitle}>حرّك الخريطة أو استخدم GPS لتحديد موقع المتجر</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* 2. Interactive Map View */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            React.createElement('iframe', {
              key: `admin-leaflet-iframe-${sessionKey}`,
              ref: iframeRef,
              id: 'admin-leaflet-iframe',
              srcDoc: leafletHtml,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              },
            })
          ) : (
            <WebView
              key={`admin-leaflet-webview-${sessionKey}`}
              ref={webViewRef}
              originWhitelist={['*']}
              source={{
                html: leafletHtml,
                baseUrl: 'https://unpkg.com',
              }}
              onMessage={handleWebViewMessage}
              style={[styles.mapAbsolute, { width: '100%', height: '100%', flex: 1 }]}
              containerStyle={{ width: '100%', height: '100%', flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scalesPageToFit={false}
              scrollEnabled={false}
              overScrollMode="never"
              mixedContentMode="always"
              allowFileAccess={true}
              allowUniversalAccessFromFileURLs={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.mapLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.mapLoaderText}>جاري تحميل الخريطة...</Text>
                </View>
              )}
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
                placeholder="ابحث عن اسم الحي، الشارع، أو المنطقة..."
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

          {/* Coordinates indicator badge */}
          <View style={styles.coordinatesPill}>
            <Text style={styles.coordinatesPillText}>
              {currentLat.toFixed(5)} , {currentLng.toFixed(5)}
            </Text>
          </View>

          {/* GPS Floating Action Button */}
          <TouchableOpacity
            style={styles.currentLocationFloatingBtn}
            onPress={handleDetectGPS}
            disabled={isLocating}
            activeOpacity={0.85}
          >
            <Text style={styles.currentLocationText}>
              {isLocating ? 'جاري تحديد GPS...' : 'موقع المتجر الحالي (GPS)'}
            </Text>
            <View style={styles.gpsIconCircle}>
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.gpsIcon}>🎯</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Bottom Sheet Card with Detailed Address Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.bottomCard}
            contentContainerStyle={styles.bottomCardScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sheetHeaderRow}>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>موقع المتجر</Text>
              </View>
              <Text style={styles.sheetSectionTitle}>عنوان المتجر بشكل كامل</Text>
            </View>

            <Text style={styles.sheetSubtitle}>
              حدد عنوان المتجر بالتفصيل لتسهيل وصول المناديب وحساب مسافة التوصيل للعملاء بدقة
            </Text>

            {/* Single Full Address Input */}
            <View style={styles.fullAddressBox}>
              <TextInput
                style={styles.fullAddressInput}
                placeholder="أدخل عنوان المتجر بالتفصيل (مثل: المدينة، اسم الحي، الشارع، رقم المبنى، وأي علامة مميزة قريبة)"
                placeholderTextColor={colors.outline}
                value={fullAddress}
                onChangeText={setFullAddress}
                multiline={true}
                numberOfLines={3}
                textAlign="right"
                textAlignVertical="top"
              />
              <View style={styles.fullAddressIconBox}>
                <Text style={styles.inputIcon}>🏪</Text>
              </View>
            </View>

            {/* Save Location CTA Button */}
            <TouchableOpacity
              style={styles.saveLocationBtn}
              onPress={handleConfirm}
              activeOpacity={0.9}
            >
              <Text style={styles.saveLocationBtnText}>تأكيد وحفظ موقع المتجر ✓</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '35',
    ...shadows.header,
    zIndex: 30,
  },
  topBarTitleWrap: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.onSurface,
    textAlign: 'center',
  },
  topBarSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  topBarActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
  },
  topBarBackArrow: {
    fontSize: 16,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  mapAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  mapLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceContainer,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '50',
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
    fontSize: 15,
    marginRight: 6,
  },
  searchResultsDropdown: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '50',
    ...shadows.floating,
    overflow: 'hidden',
    maxHeight: 180,
  },
  searchResultItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '25',
  },
  searchResultText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'right',
  },
  coordinatesPill: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(24, 26, 30, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '60',
    ...shadows.floating,
    zIndex: 12,
  },
  currentLocationText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    ...shadows.floating,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  bottomCardScroll: {
    paddingBottom: 24,
  },
  sheetHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetSectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: colors.onSurface,
  },
  sheetSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 12,
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
    color: colors.primary,
  },
  fullAddressBox: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.2,
    borderColor: colors.outlineVariant + '50',
    borderRadius: borderRadius.lg,
    padding: 10,
    minHeight: 82,
    marginBottom: 14,
  },
  fullAddressInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'right',
    lineHeight: 20,
    paddingVertical: 2,
  },
  fullAddressIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputIcon: {
    fontSize: 16,
  },
  saveLocationBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  saveLocationBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.onPrimary,
  },
});
