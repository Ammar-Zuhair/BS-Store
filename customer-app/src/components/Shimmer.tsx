import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  ScrollView,
  Platform,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, spacing, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';

interface ShimmerPlaceholderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * YouTube-style Shimmer Placeholder
 * Creates an animated highlight wave sweeping across a skeleton block
 */
export const ShimmerPlaceholder: React.FC<ShimmerPlaceholderProps> = ({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
  children,
}) => {
  const { isDarkMode, colors: themeColors } = useApp();
  const [layoutWidth, setLayoutWidth] = useState<number>(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== layoutWidth) {
      setLayoutWidth(w);
    }
  };

  const currentWidth = layoutWidth || (typeof width === 'number' ? width : 300);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-currentWidth, currentWidth * 1.4],
  });

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.base,
        {
          width: width as any,
          height: height as any,
          borderRadius: radius,
          backgroundColor: themeColors.surfaceContainer,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
            width: currentWidth,
          },
        ]}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? [
                  'rgba(255, 255, 255, 0)',
                  'rgba(255, 255, 255, 0.05)',
                  'rgba(255, 255, 255, 0.15)',
                  'rgba(255, 255, 255, 0.05)',
                  'rgba(255, 255, 255, 0)',
                ]
              : [
                  'rgba(255, 255, 255, 0)',
                  'rgba(255, 255, 255, 0.4)',
                  'rgba(255, 255, 255, 0.8)',
                  'rgba(255, 255, 255, 0.4)',
                  'rgba(255, 255, 255, 0)',
                ]
          }
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </View>
  );
};

export const SkeletonBox: React.FC<ShimmerPlaceholderProps> = (props) => (
  <ShimmerPlaceholder {...props} />
);

export const SkeletonCircle: React.FC<{ size: number; style?: StyleProp<ViewStyle> }> = ({
  size,
  style,
}) => (
  <ShimmerPlaceholder
    width={size}
    height={size}
    borderRadius={size / 2}
    style={style}
  />
);

export const SkeletonLine: React.FC<{
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ width = '100%', height = 14, style }) => (
  <ShimmerPlaceholder
    width={width}
    height={height}
    borderRadius={borderRadius.full}
    style={style}
  />
);

/**
 * YouTube-style Home Shimmer Skeleton Loader
 * Renders shimmering animated placeholders matching HomeScreen layout
 */
export const HomeSkeleton: React.FC<{ includeHeader?: boolean }> = ({
  includeHeader = false,
}) => {
  const { colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.skeletonContainer}
    >
      {/* Optional Header Placeholder */}
      {includeHeader && (
        <View style={styles.headerPlaceholder}>
          <View style={styles.headerTopRow}>
            <SkeletonCircle size={44} />
            <View style={styles.headerInfoCol}>
              <SkeletonLine width="65%" height={16} style={{ alignSelf: 'flex-end', marginBottom: 6 }} />
              <SkeletonLine width="40%" height={12} style={{ alignSelf: 'flex-end' }} />
            </View>
            <SkeletonCircle size={44} />
          </View>
          <SkeletonBox
            height={48}
            borderRadius={borderRadius.xl}
            style={{ marginTop: 14 }}
          />
        </View>
      )}

      {/* 1. Hero Special Offers / Deals Section Placeholder */}
      <View style={styles.sectionPlaceholder}>
        <View style={styles.sectionHeaderRow}>
          <SkeletonLine width={75} height={18} />
          <SkeletonLine width={150} height={22} />
        </View>

        <View style={styles.heroCardPlaceholder}>
          <SkeletonBox height={165} borderRadius={borderRadius.lg} />
          <View style={styles.heroCardContent}>
            <SkeletonLine width="80%" height={18} style={{ marginBottom: 8, alignSelf: 'flex-end' }} />
            <SkeletonLine width="55%" height={13} style={{ marginBottom: 14, alignSelf: 'flex-end' }} />
            <View style={styles.heroBottomRow}>
              <SkeletonBox width={100} height={34} borderRadius={borderRadius.full} />
              <SkeletonLine width={90} height={20} />
            </View>
          </View>
        </View>
      </View>

      {/* 2. Categories 2-Column Grid Placeholder (Matching CategoryGrid) */}
      <View style={styles.sectionPlaceholder}>
        <View style={styles.sectionHeaderRow}>
          <SkeletonBox width={65} height={22} borderRadius={borderRadius.full} />
          <SkeletonLine width={160} height={22} />
        </View>

        <View style={styles.gridRow}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.gridItemPlaceholder}>
              <SkeletonCircle size={54} style={{ marginBottom: 12 }} />
              <SkeletonLine width="75%" height={16} style={{ marginBottom: 8 }} />
              <SkeletonBox width="55%" height={20} borderRadius={borderRadius.full} />
            </View>
          ))}
        </View>
      </View>

      {/* 3. Products / Recommended Row Placeholder */}
      <View style={styles.sectionPlaceholder}>
        <View style={styles.sectionHeaderRow}>
          <SkeletonLine width={60} height={18} />
          <SkeletonLine width={130} height={22} />
        </View>
        <View style={styles.horizontalRow}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.miniCardPlaceholder}>
              <SkeletonBox height={100} borderRadius={borderRadius.md} style={{ marginBottom: 8 }} />
              <SkeletonLine width="85%" height={14} style={{ marginBottom: 6, alignSelf: 'flex-end' }} />
              <SkeletonLine width="50%" height={14} style={{ alignSelf: 'flex-end' }} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

/**
 * Category & Stores Shimmer Skeleton
 */
export const CategoryStoresSkeleton: React.FC = () => {
  const { colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.skeletonContainer}
    >
      <View style={{ paddingHorizontal: spacing.screenGutter, marginTop: 14 }}>
        <SkeletonBox height={46} borderRadius={borderRadius.lg} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row-reverse', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBox key={i} width={75} height={34} borderRadius={borderRadius.full} />
          ))}
        </View>
      </View>

      {[1, 2, 3].map((card) => (
        <View key={card} style={styles.storeCardPlaceholder}>
          <SkeletonBox height={130} borderRadius={borderRadius.lg} style={{ marginBottom: 10 }} />
          <View style={{ paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 }}>
              <SkeletonLine width="55%" height={18} />
              <SkeletonBox width={45} height={22} borderRadius={borderRadius.sm} />
            </View>
            <SkeletonLine width="80%" height={13} style={{ marginBottom: 10, alignSelf: 'flex-end' }} />
            <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
              <SkeletonLine width={70} height={14} />
              <SkeletonLine width={80} height={14} />
              <SkeletonLine width={60} height={14} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    position: 'relative',
  },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    skeletonContainer: {
      paddingBottom: 110,
    },
    headerPlaceholder: {
      backgroundColor: colors.surfaceContainerLowest,
      paddingHorizontal: spacing.screenGutter,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + '35',
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerInfoCol: {
      flex: 1,
      marginHorizontal: 12,
    },
    sectionPlaceholder: {
      marginTop: spacing.baseMd,
      paddingHorizontal: spacing.screenGutter,
    },
    sectionHeaderRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.baseMd,
    },
    heroCardPlaceholder: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: borderRadius.xl,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '35',
    },
    heroCardContent: {
      paddingTop: 12,
      paddingHorizontal: 4,
    },
    heroBottomRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    gridRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    gridItemPlaceholder: {
      width: '48%',
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: borderRadius.xl,
      paddingVertical: 20,
      paddingHorizontal: 12,
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '35',
    },
    horizontalRow: {
      flexDirection: 'row-reverse',
      gap: 12,
    },
    miniCardPlaceholder: {
      width: 140,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: borderRadius.lg,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '35',
    },
    storeCardPlaceholder: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: borderRadius.xl,
      padding: 12,
      marginHorizontal: spacing.screenGutter,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '35',
    },
  });
