import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { pickImageFromGallery, uploadImageToSupabase } from '../services/supabaseStorage';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (url: string) => void;
  title?: string;
  folder?: 'stores' | 'products' | 'offers';
  presetSamples?: { label: string; url: string }[];
  initialUrl?: string;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onImageSelected,
  title = 'تحديد صورة',
  folder = 'products',
  presetSamples,
  initialUrl = '',
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'url'>('gallery');
  const [customUrl, setCustomUrl] = useState(initialUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handlePickFromGallery = async () => {
    try {
      const picked = await pickImageFromGallery();
      if (!picked) return;

      setIsUploading(true);
      setUploadStatus('جاري رفع الصورة إلى Supabase...');

      try {
        const publicUrl = await uploadImageToSupabase(picked, folder);
        setIsUploading(false);
        setUploadStatus('');
        onImageSelected(publicUrl);
        onClose();
        Alert.alert('نجاح ✓', 'تم رفع الصورة وحفظها في Supabase بنجاح');
      } catch (uploadError: any) {
        setIsUploading(false);
        setUploadStatus('');
        // If Supabase upload fails (e.g. policy/network), offer to use the local URI or direct URL
        Alert.alert(
          'تنبيه Supabase',
          `تعذر استكمال الرفع إلى Supabase (${uploadError?.message || 'خطأ في الاتصال'}). هل تود استخدام الصورة المحلية مؤقتاً؟`,
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'استخدام الصورة',
              onPress: () => {
                onImageSelected(picked.uri);
                onClose();
              },
            },
          ]
        );
      }
    } catch (err: any) {
      setIsUploading(false);
      setUploadStatus('');
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الصورة');
    }
  };

  const handleApplyUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) {
      Alert.alert('تنبيه', 'يرجى إدخال رابط الصورة أولاً');
      return;
    }
    onImageSelected(trimmed);
    setCustomUrl('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            يمكنك رفع صورة مباشرة من معرض جهازك إلى Supabase أو إضافة رابط صورة
          </Text>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'gallery' && styles.tabBtnActive]}
              onPress={() => setActiveTab('gallery')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === 'gallery' && styles.tabBtnTextActive]}>
                📁 معرض الصور (Supabase)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'url' && styles.tabBtnActive]}
              onPress={() => setActiveTab('url')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === 'url' && styles.tabBtnTextActive]}>
                🔗 رابط مباشر (URL)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Gallery Upload */}
          {activeTab === 'gallery' && (
            <View style={styles.tabContent}>
              {isUploading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>{uploadStatus}</Text>
                  <Text style={styles.loadingSub}>يتم الآن التخزين في سحابة Supabase Storage</Text>
                </View>
              ) : (
                <View style={styles.gallerySection}>
                  <TouchableOpacity
                    style={styles.uploadCardBtn}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.85}
                  >
                    <View style={styles.uploadIconCircle}>
                      <Text style={styles.uploadIconText}>☁️</Text>
                    </View>
                    <Text style={styles.uploadCardTitle}>اختر صورة من جهازك</Text>
                    <Text style={styles.uploadCardSub}>
                      اضغط هنا لتحديد صورة من المعرض وسيتم رفعها وتخزينها تلقائياً على Supabase
                    </Text>
                    <View style={styles.uploadActionBadge}>
                      <Text style={styles.uploadActionText}>+ فتح المعرض والرفع</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Tab 2: Direct URL */}
          {activeTab === 'url' && (
            <View style={styles.tabContent}>
              <Text style={styles.inputLabel}>أدخل رابط الصورة (URL):</Text>
              <TextInput
                style={styles.urlInput}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={colors.outline}
                value={customUrl}
                onChangeText={setCustomUrl}
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="left"
              />

              {customUrl.trim().length > 0 && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>معاينة:</Text>
                  <Image source={{ uri: customUrl.trim() }} style={styles.previewImg} />
                </View>
              )}

              <TouchableOpacity
                style={[styles.applyUrlBtn, !customUrl.trim() && styles.applyUrlBtnDisabled]}
                disabled={!customUrl.trim()}
                onPress={handleApplyUrl}
                activeOpacity={0.85}
              >
                <Text style={styles.applyUrlBtnText}>اعتماد الرابط ✓</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Presets (if provided) */}
          {presetSamples && presetSamples.length > 0 && (
            <View style={styles.presetsSection}>
              <Text style={styles.presetsTitle}>أو اختر نموذجاً جاهزاً سريعاً:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {presetSamples.map((sample, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.sampleItem}
                    onPress={() => {
                      onImageSelected(sample.url);
                      onClose();
                    }}
                  >
                    <Image source={{ uri: sample.url }} style={styles.sampleImg} />
                    <Text style={styles.sampleText}>{sample.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '88%',
    ...shadows.floating,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.outline,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.card,
  },
  tabBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  tabBtnTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    fontWeight: '700',
  },
  tabContent: {
    marginBottom: 12,
  },
  gallerySection: {
    alignItems: 'center',
  },
  uploadCardBtn: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.primary + '35',
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadIconText: {
    fontSize: 26,
  },
  uploadCardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  uploadCardSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  uploadActionBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
  },
  uploadActionText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 12,
  },
  loadingSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.outline,
    marginTop: 4,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 6,
  },
  urlInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
  },
  previewBox: {
    alignItems: 'center',
    marginTop: 10,
  },
  previewLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.outline,
    marginBottom: 4,
  },
  previewImg: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  applyUrlBtn: {
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  applyUrlBtnDisabled: {
    opacity: 0.5,
  },
  applyUrlBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  presetsSection: {
    marginVertical: 10,
  },
  presetsTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.outline,
    textAlign: 'right',
    marginBottom: 6,
  },
  sampleItem: {
    marginRight: 8,
    alignItems: 'center',
    width: 64,
  },
  sampleImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sampleText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurface,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: 10,
  },
  closeBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.onSurface,
  },
});
