import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Alert, ActivityIndicator } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { LocationPickerModal, LocationResult } from './LocationPickerModal';
import { AppIcon } from './AppIcon';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false, onBack, rightAction, onRefresh }) => {
  const { selectedAddress, setSelectedAddress, addresses, navigateTo, colors: themeColors, refreshData } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await (onRefresh || refreshData)(); } catch (e: any) { Alert.alert('تعذر التحديث', e?.message || 'تحقق من الاتصال وحاول مجدداً.'); }
    finally { setRefreshing(false); }
  };
  const refreshButton = <TouchableOpacity onPress={() => void refresh()} disabled={refreshing} accessibilityRole="button" accessibilityLabel="تحديث البيانات" hitSlop={6} style={{ width: 36, height: 38, justifyContent: 'center', alignItems: 'center' }}>
    {refreshing ? <ActivityIndicator size="small" color={themeColors.primary} /> : <Text style={{ fontFamily: 'Tajawal_700Bold', color: themeColors.primary, fontSize: 26 }}>↻</Text>}
  </TouchableOpacity>;
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleMapLocationPicked = (loc: LocationResult) => {
    setSelectedAddress({
      id: 'custom-' + Date.now(),
      label: 'أخرى',
      description: loc.addressTitle || 'موقع محدد عبر الخريطة',
      city: loc.city,
      district: loc.district,
      street: loc.street || loc.district,
      latitude: loc.latitude,
      longitude: loc.longitude,
      isDefault: false,
    });
    setShowMapPicker(false);
  };

  return (
    <View style={styles.container}>
      {showBack ? (
        <View style={styles.inner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack || (() => navigateTo('home'))}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            hitSlop={8}
          >
            <AppIcon name="arrow-right" size={20} color={themeColors.onSurface} />
          </TouchableOpacity>
          <View style={styles.titleWrapper}>
            <Text style={styles.titleText}>{title}</Text>
          </View>
          <View style={styles.actions}>
            {refreshButton}
            {rightAction !== undefined ? rightAction : <View style={{ width: 38 }} />}
          </View>
        </View>
      ) : title ? (
        <View style={styles.inner}>
          <View style={{ width: 38 }} />
          <View style={styles.titleWrapper}>
            <Text style={styles.titleText}>{title}</Text>
          </View>
          <View style={styles.actions}>
            {refreshButton}
            {rightAction !== undefined ? rightAction : <View style={{ width: 38 }} />}
          </View>
        </View>
      ) : (
        <View style={styles.homeHeaderWrap}>
          {/* Top Brand Bar */}
          <View style={styles.topBrandRow}>
            <View style={styles.brandWrapper}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.brandTitle} numberOfLines={1}>
               BS Store
              </Text>
              
            </View>

            <View style={styles.actions}>
            {refreshButton}
              {rightAction !== undefined ? (
                rightAction
              ) : (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => navigateTo('notifications')}
                  accessibilityRole="button"
                  accessibilityLabel="الانتقال إلى الإشعارات"
                  hitSlop={4}
                >
                  <AppIcon name="bell" size={20} color={themeColors.onSurface} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Delivery Address Bar */}
          <TouchableOpacity
            style={styles.deliveryBar}
            onPress={() => setAddressModalVisible(true)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={'عنوان التوصيل: ' + (selectedAddress
              ? selectedAddress.city + '، ' + selectedAddress.district
              : 'لم يتم تحديد عنوان')}
          >
            <View style={styles.deliveryBarRight}>
              <View style={styles.locationIconWrap}>
                <AppIcon name="map-pin" size={19} color={themeColors.primary} />
              </View>
              <View style={styles.deliveryBarInfo}>
                <Text style={styles.deliverToLabel}>التوصيل إلى موقعك</Text>
                <Text style={styles.deliveryBarAddress} numberOfLines={1}>
                  {selectedAddress
                    ? `${selectedAddress.city} - ${selectedAddress.district}${selectedAddress.street ? `، ${selectedAddress.street}` : ''}`
                    : 'حدد موقع التوصيل على الخريطة'}
                </Text>
              </View>
            </View>
            <View style={styles.changeAddressTag}>
              <Text style={styles.changeAddressText}>تغيير</Text>
              <AppIcon name="chevron-down" size={14} color={themeColors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Address Selection Modal */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر عنوان التوصيل</Text>
            <Text style={styles.modalSubtitle}>حدد موقعك الحالي لتسريع وصول طلباتك</Text>

            {addresses.map((addr) => {
              const isSelected = selectedAddress ? addr.id === selectedAddress.id : false;
              return (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addressItem, isSelected && styles.addressItemSelected]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedAddress(addr);
                    setAddressModalVisible(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={addr.label + ': ' + addr.city + '، ' + addr.district + '، ' + addr.street}
                  accessibilityState={{ checked: isSelected }}
                >
                  <View style={styles.addressIconWrap}>
                    <AppIcon
                      name={addr.label === 'المنزل' ? 'house' : 'building'}
                      size={20}
                      color={themeColors.primary}
                    />
                  </View>
                  <View style={styles.addressItemContent}>
                    <View style={styles.addressItemHeader}>
                      <Text style={styles.addressItemLabel}>{addr.label}</Text>
                      {isSelected && <Text style={styles.selectedBadge}>المحدد</Text>}
                    </View>
                    <Text style={styles.addressItemStreet}>
                      {addr.city}، {addr.district}، {addr.street}
                    </Text>
                    {addr.description && (
                      <Text style={styles.addressItemDesc}>{addr.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.pickOnMapBtn}
              onPress={() => {
                setAddressModalVisible(false);
                setShowMapPicker(true);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="تحديد موقع التوصيل على الخريطة"
            >
              <AppIcon name="map" size={18} color={themeColors.primary} />
              <Text style={styles.pickOnMapBtnText}>تحديد موقعي على الخريطة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setAddressModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Interactive Google Maps Picker Modal */}
      <LocationPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleMapLocationPicked}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
    paddingTop: 4,
    ...shadows.header,
    zIndex: 50,
  },
  inner: {
    height: 52,
    paddingHorizontal: spacing.screenGutter,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseXs,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFixed + '25',
    borderWidth: 1,
    borderColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    alignItems: 'flex-end',
  },
  deliverToLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.regular,
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  addressName: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    maxWidth: 130,
  },
  dropdownIcon: {
    fontSize: 14,
    color: colors.primary,
  },
  homeHeaderWrap: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: 6,
    gap: 8,
  },
  topBrandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  deliveryBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  deliveryBarRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deliveryBarInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  deliveryBarAddress: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    textAlign: 'right',
    marginTop: 1,
  },
  changeAddressTag: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  changeAddressText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  brandWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  brandTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSecondary,
  },
  titleWrapper: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseXs,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 24, 17, 0.48)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.screenGutter,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: spacing.baseMd,
  },
  addressItem: {
    minHeight: 64,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.baseSm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.baseSm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  addressItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixedDim + '20',
  },
  addressIconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.baseSm,
  },
  addressItemContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  addressItemHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  addressItemLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  selectedBadge: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    fontWeight: typography.fontWeight.bold,
  },
  addressItemStreet: {
    fontSize: typography.fontSize.sm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'right',
  },
  addressItemDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.outline,
    marginTop: 2,
    textAlign: 'right',
  },
  pickOnMapBtn: {
    marginTop: spacing.baseSm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    paddingVertical: spacing.baseSm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: spacing.baseSm,
    minHeight: 50,
  },
  pickOnMapBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  closeBtn: {
    marginTop: spacing.baseSm,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: spacing.baseSm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
});
