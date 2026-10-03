import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { typography, borderRadius, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { AppIcon } from './AppIcon';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  visible,
  onClose,
  onAccept,
}) => {
  const { colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const handleAccept = () => {
    if (onAccept) onAccept();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="إغلاق الشروط والأحكام"
            >
              <AppIcon name="close" size={18} color={themeColors.onSurface} />
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>الشروط والأحكام وسياسة الخصوصية</Text>
              <Text style={styles.subtitle}>منصة BS Store للتسوق والتوصيل</Text>
            </View>
          </View>

          {/* Scrollable Terms Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. مقدمة وترحيب</Text>
              <Text style={styles.sectionText}>
                أهلاً بك في منصة BS Store. يُعد استخدامك لهذا التطبيق أو إنشاء حساب
                جديد موافقة صريحة وكاملة على كافة الشروط والأحكام المنصوص عليها أدناه
                وسياسة الخصوصية المعتمدة لحماية حقوقك وحقوق المنصة.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. شروط الحساب والأمان</Text>
              <Text style={styles.sectionText}>
                • يلتزم المستخدم بتقديم رقم هاتف حقيقي وبيانات عنوان صحيحة لضمان دقة التوصيل.
                {'\n'}• تقع على عاتق العميل مسؤولية الحفاظ على سرية كلمة المرور وعدم مشاركتها مع أي طرف ثالث.
                {'\n'}• للمنصة الحق في تعليق أي حساب في حال وجود نشاط احتيالي أو طلبات وهمية.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. سياسة الطلبات والتوصيل</Text>
              <Text style={styles.sectionText}>
                • تتيح المنصة تسوق المنتجات من عدة متاجر في طلب واحد، ويتم احتساب رسوم التوصيل وفقاً للمسافة الجغرافية بين موقع المتاجر وموقع العميل المحدد عبر الخريطة (GPS).
                {'\n'}• يلتزم العميل بالتواجد في موقع التوصيل المحدد واستلام الطلب فور وصول السائق.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. سياسة الدفع وتأكيد الحوالات</Text>
              <Text style={styles.sectionText}>
                • نوفر الدفع عند الاستلام نقداً، أو عبر التحويل البنكي وحسابات الصرافة المحلية.
                {'\n'}• في حال اختيار الدفع بالحوالة، يجب إرفاق سند التحويل بوضوح لتأكيد الطلب وتجهيزه لدى المتاجر.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. الإلغاء والاسترجاع</Text>
              <Text style={styles.sectionText}>
                • يمكن إلغاء الطلب مجاناً قبل بدء التجهيز في المتجر أو قبول السائق للطلب.
                {'\n'}• المنتجات الغذائية والوجبات الطازجة لا تقبل الاسترجاع بعد خروجها للتوصيل حرصاً على الصحة العامة، إلا في حال وجود خطأ في الطلب من قبل المتجر.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. حماية الخصوصية وسرية البيانات</Text>
              <Text style={styles.sectionText}>
                • نلتزم بحماية كافة بياناتك الشخصية وتشفير كلمات المرور وفق أعلى المعايير الأمنية.
                {'\n'}• يتم استخدام الموقع الجغرافي فقط لتسهيل عمليات التوصيل واحتساب المسافات، ولا يتم بيع أو مشاركة بياناتك مع أي جهات خارجية غير مفوضة.
              </Text>
            </View>

            <View style={styles.updateBadge}>
              <Text style={styles.updateText}>آخر تحديث: سبتمبر 2026 - الإصدار 2.0</Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <SafeAreaView style={styles.footer}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={handleAccept}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="أوافق على الشروط والأحكام"
            >
              <Text style={styles.acceptBtnText}>أوافق على الشروط والأحكام ✓</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'flex-end',
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.onSurface,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  scrollArea: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 18,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.tertiary,
    textAlign: 'right',
    marginBottom: 6,
  },
  sectionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'right',
    lineHeight: 22,
  },
  updateBadge: {
    alignItems: 'center',
    marginVertical: 10,
  },
  updateText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.outline,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    minHeight: 50,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: colors.onPrimary,
  },
});
