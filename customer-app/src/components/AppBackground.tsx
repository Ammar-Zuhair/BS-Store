import React, { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  Path,
  Circle,
  Rect,
  G,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

interface AppBackgroundProps {
  isDark?: boolean;
}

export const AppBackground: React.FC<AppBackgroundProps> = memo(({ isDark = true }) => {
  // Silver & Black luxury gradient color palette
  const darkGradColors = ['#080A0E', '#0D1117', '#121620', '#090C10'] as const;
  const lightGradColors = ['#F8FAFC', '#EEF2F6', '#E2E8F0', '#EDF2F7'] as const;

  return (
    <View style={styles.container} pointerEvents="none" aria-hidden={true}>
      {/* Base Foundation Gradient */}
      <LinearGradient
        colors={isDark ? darkGradColors : lightGradColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Vector Wave Canvas */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 900"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Radial ambient glow orbs */}
          <SvgRadialGradient
            id="silverAuraTop"
            cx="75%"
            cy="12%"
            rx="60%"
            ry="35%"
            fx="75%"
            fy="12%"
          >
            <Stop
              offset="0%"
              stopColor={isDark ? '#C4CBD5' : '#94A3B8'}
              stopOpacity={isDark ? 0.22 : 0.25}
            />
            <Stop
              offset="45%"
              stopColor={isDark ? '#64748B' : '#CBD5E1'}
              stopOpacity={isDark ? 0.08 : 0.1}
            />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </SvgRadialGradient>

          <SvgRadialGradient
            id="silverAuraMid"
            cx="15%"
            cy="52%"
            rx="55%"
            ry="30%"
            fx="15%"
            fy="52%"
          >
            <Stop
              offset="0%"
              stopColor={isDark ? '#DDE3EA' : '#64748B'}
              stopOpacity={isDark ? 0.18 : 0.16}
            />
            <Stop
              offset="50%"
              stopColor={isDark ? '#475569' : '#94A3B8'}
              stopOpacity={isDark ? 0.06 : 0.08}
            />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </SvgRadialGradient>

          <SvgRadialGradient
            id="silverAuraBottom"
            cx="85%"
            cy="88%"
            rx="65%"
            ry="35%"
            fx="85%"
            fy="88%"
          >
            <Stop
              offset="0%"
              stopColor={isDark ? '#B0BAC7' : '#475569'}
              stopOpacity={isDark ? 0.20 : 0.15}
            />
            <Stop
              offset="60%"
              stopColor={isDark ? '#334155' : '#94A3B8'}
              stopOpacity={isDark ? 0.05 : 0.06}
            />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </SvgRadialGradient>

          {/* Liquid metallic silver gradients for the waves */}
          <SvgLinearGradient id="silverWaveGrad1" x1="0%" y1="0%" x2="100%" y2="80%">
            <Stop offset="0%" stopColor={isDark ? '#E2E8F0' : '#475569'} stopOpacity={isDark ? 0.25 : 0.18} />
            <Stop offset="35%" stopColor={isDark ? '#94A3B8' : '#64748B'} stopOpacity={isDark ? 0.15 : 0.12} />
            <Stop offset="70%" stopColor={isDark ? '#475569' : '#94A3B8'} stopOpacity={isDark ? 0.08 : 0.06} />
            <Stop offset="100%" stopColor={isDark ? '#0F172A' : '#CBD5E1'} stopOpacity={isDark ? 0.02 : 0.02} />
          </SvgLinearGradient>

          <SvgLinearGradient id="silverWaveGrad2" x1="100%" y1="10%" x2="0%" y2="90%">
            <Stop offset="0%" stopColor={isDark ? '#FFFFFF' : '#334155'} stopOpacity={isDark ? 0.22 : 0.16} />
            <Stop offset="30%" stopColor={isDark ? '#CBD5E1' : '#64748B'} stopOpacity={isDark ? 0.14 : 0.10} />
            <Stop offset="65%" stopColor={isDark ? '#64748B' : '#94A3B8'} stopOpacity={isDark ? 0.08 : 0.05} />
            <Stop offset="100%" stopColor={isDark ? '#1E293B' : '#E2E8F0'} stopOpacity={0} />
          </SvgLinearGradient>

          <SvgLinearGradient id="silverWaveGrad3" x1="0%" y1="20%" x2="100%" y2="80%">
            <Stop offset="0%" stopColor={isDark ? '#94A3B8' : '#1E293B'} stopOpacity={isDark ? 0.20 : 0.14} />
            <Stop offset="45%" stopColor={isDark ? '#475569' : '#475569'} stopOpacity={isDark ? 0.12 : 0.08} />
            <Stop offset="80%" stopColor={isDark ? '#1E293B' : '#94A3B8'} stopOpacity={isDark ? 0.05 : 0.04} />
            <Stop offset="100%" stopColor={isDark ? '#090C10' : '#F1F5F9'} stopOpacity={0} />
          </SvgLinearGradient>

          <SvgLinearGradient id="silverWaveGrad4" x1="10%" y1="0%" x2="90%" y2="100%">
            <Stop offset="0%" stopColor={isDark ? '#E2E8F0' : '#334155'} stopOpacity={isDark ? 0.24 : 0.16} />
            <Stop offset="40%" stopColor={isDark ? '#94A3B8' : '#64748B'} stopOpacity={isDark ? 0.15 : 0.10} />
            <Stop offset="75%" stopColor={isDark ? '#334155' : '#94A3B8'} stopOpacity={isDark ? 0.08 : 0.05} />
            <Stop offset="100%" stopColor={isDark ? '#0B0F17' : '#E2E8F0'} stopOpacity={0} />
          </SvgLinearGradient>

          {/* Sleek metallic contour stroke gradient */}
          <SvgLinearGradient id="silverStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isDark ? '#F8FAFC' : '#0F172A'} stopOpacity={isDark ? 0.45 : 0.25} />
            <Stop offset="30%" stopColor={isDark ? '#CBD5E1' : '#475569'} stopOpacity={isDark ? 0.30 : 0.18} />
            <Stop offset="70%" stopColor={isDark ? '#64748B' : '#94A3B8'} stopOpacity={isDark ? 0.15 : 0.10} />
            <Stop offset="100%" stopColor={isDark ? '#334155' : '#CBD5E1'} stopOpacity={isDark ? 0.05 : 0.03} />
          </SvgLinearGradient>
        </Defs>

        {/* Ambient atmospheric light orbs */}
        <Circle cx="300" cy="110" r="240" fill="url(#silverAuraTop)" />
        <Circle cx="60" cy="470" r="210" fill="url(#silverAuraMid)" />
        <Circle cx="340" cy="800" r="260" fill="url(#silverAuraBottom)" />

        {/* --- Wave Layer 1: Top flowing silver crest --- */}
        <Path
          d="M -30,-10 L 430,-10 L 430,170 C 320,245 230,105 125,175 C 55,220 -5,185 -30,155 Z"
          fill="url(#silverWaveGrad1)"
        />

        {/* Hairline contour on Wave 1 */}
        <Path
          d="M -30,155 C -5,185 55,220 125,175 C 230,105 320,245 430,170"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="1.4"
          fill="none"
        />

        {/* Secondary parallel wave contour 1 */}
        <Path
          d="M -30,178 C 0,210 65,242 138,198 C 242,130 328,268 430,195"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="0.8"
          strokeOpacity={isDark ? 0.28 : 0.15}
          fill="none"
        />

        {/* --- Wave Layer 2: Dynamic Mid-body S-Wave Ribbon --- */}
        <Path
          d="M -40,290 C 70,240 170,370 270,305 C 345,260 385,295 440,350 L 440,490 C 360,425 280,520 170,470 C 70,420 5,480 -40,455 Z"
          fill="url(#silverWaveGrad2)"
        />

        {/* Crest contour on Wave 2 */}
        <Path
          d="M -40,290 C 70,240 170,370 270,305 C 345,260 385,295 440,350"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="1.6"
          fill="none"
        />

        {/* Trough contour on Wave 2 */}
        <Path
          d="M -40,455 C 5,480 70,420 170,470 C 280,520 360,425 440,490"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="1.1"
          strokeOpacity={isDark ? 0.35 : 0.2}
          fill="none"
        />

        {/* Parallel accent line within Wave 2 */}
        <Path
          d="M -40,370 C 60,320 170,440 270,380 C 350,335 390,375 440,415"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="0.8"
          strokeOpacity={isDark ? 0.22 : 0.12}
          fill="none"
        />

        {/* --- Wave Layer 3: Deep Obsidian & Silver Lower Wave --- */}
        <Path
          d="M -30,530 C 85,475 195,605 310,545 C 375,510 415,535 440,570 L 440,760 C 340,695 240,805 130,735 C 50,685 5,725 -30,705 Z"
          fill="url(#silverWaveGrad3)"
        />

        {/* Crest contour on Wave 3 */}
        <Path
          d="M -30,530 C 85,475 195,605 310,545 C 375,510 415,535 440,570"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Parallel rhythm line */}
        <Path
          d="M -30,555 C 85,500 200,630 315,570 C 380,535 418,560 440,595"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="0.9"
          strokeOpacity={isDark ? 0.3 : 0.15}
          fill="none"
        />

        {/* --- Wave Layer 4: Elegant Base Undulating Wave --- */}
        <Path
          d="M -30,735 C 80,680 185,785 295,735 C 360,705 405,725 435,750 L 435,930 L -30,930 Z"
          fill="url(#silverWaveGrad4)"
        />

        {/* Crest contour on Wave 4 */}
        <Path
          d="M -30,735 C 80,680 185,785 295,735 C 360,705 405,725 435,750"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Sub-line on Wave 4 */}
        <Path
          d="M -30,760 C 80,705 185,810 295,760 C 360,730 405,750 435,775"
          stroke="url(#silverStrokeGrad)"
          strokeWidth="0.8"
          strokeOpacity={isDark ? 0.25 : 0.12}
          fill="none"
        />

        {/* Subtle decorative silver micro-glints for extra luxury */}
        <G opacity={isDark ? 0.4 : 0.25}>
          {/* Top glint */}
          <Circle cx="85" cy="85" r="1.5" fill={isDark ? '#FFFFFF' : '#334155'} />
          <Circle cx="85" cy="85" r="3.5" fill={isDark ? '#C4CBD5' : '#94A3B8'} opacity={0.3} />
          {/* Mid glint */}
          <Circle cx="330" cy="420" r="1.8" fill={isDark ? '#FFFFFF' : '#334155'} />
          <Circle cx="330" cy="420" r="4" fill={isDark ? '#E2E8F0' : '#64748B'} opacity={0.25} />
          {/* Lower glint */}
          <Circle cx="70" cy="650" r="1.5" fill={isDark ? '#FFFFFF' : '#334155'} />
          <Circle cx="70" cy="650" r="3.2" fill={isDark ? '#CBD5E1' : '#94A3B8'} opacity={0.3} />
        </G>
      </Svg>
    </View>
  );
});

AppBackground.displayName = 'AppBackground';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: -1,
  },
});
