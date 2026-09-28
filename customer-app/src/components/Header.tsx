import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useApp } from '../context/AppContext';
import { LocationPickerModal, LocationResult } from './LocationPickerModal';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false, onBack, rightAction }) => {
  const { selectedAddress, setSelectedAddress, addresses, navigateTo } = useApp();
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
          <TouchableOpacity style={styles.backBtn} onPress={onBack || (() => navigateTo('home'))}>
            <Text style={styles.iconText}>➔</Text>
          </TouchableOpacity>
          <View style={styles.titleWrapper}>
            <Text style={styles.titleText}>{title}</Text>
          </View>
          <View style={styles.actions}>
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
              {rightAction !== undefined ? (
                rightAction
              ) : (
                <TouchableOpacity style={styles.iconButton} onPress={() => navigateTo('tracking')}>
                  <Text style={styles.actionIcon}>🔔</Text>
                  <View style={styles.notificationDot} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Delivery Address Bar */}
          <TouchableOpacity
            style={styles.deliveryBar}
            onPress={() => setAddressModalVisible(true)}
            activeOpacity={0.82}
          >
            <View style={styles.deliveryBarRight}>
              <View style={styles.locationIconWrap}>
                <Text style={styles.locationIconText}>📍</Text>
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
              <Text style={styles.changeAddressText}>تغيير ▾</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Address Selection Modal */}
      <Modal visible={addressModalVisible} transparent animationType="fade">
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
                  onPress={() => {
                    setSelectedAddress(addr);
                    setAddressModalVisible(false);
                  }}
                >
                  <View style={styles.addressIconWrap}>
                    <Text style={styles.addressTypeIcon}>
                      {addr.label === 'المنزل' ? '🏠' : '🏢'}
                    </Text>
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
            >
              <Text style={styles.pickOnMapBtnText}>🗺️ تحديد موقعي على الخريطة التفاعلية</Text>
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

const styles = StyleSheet.create({
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
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFixed + '25',
    borderWidth: 1,
    borderColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIconText: {
    fontSize: 16,
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
  actionIcon: {
    fontSize: 18,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondaryContainer,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    color: colors.onSurface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.55)',
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
  addressTypeIcon: {
    fontSize: 20,
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
