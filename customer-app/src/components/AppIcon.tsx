import React from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type AppIconName =
  | 'home' | 'package' | 'user' | 'search' | 'bell' | 'map-pin'
  | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'arrow-left'
  | 'arrow-right' | 'store' | 'shopping-bag' | 'shopping-cart' | 'trash'
  | 'plus' | 'minus' | 'refresh' | 'check' | 'check-circle' | 'info'
  | 'map' | 'house' | 'building' | 'sun' | 'moon' | 'settings' | 'logout'
  | 'phone' | 'bike' | 'star' | 'clock' | 'gift' | 'credit-card'
  | 'cash' | 'bank' | 'tag' | 'filter' | 'sparkles' | 'message'
  | 'eye' | 'eye-off' | 'lock' | 'shirt' | 'soup' | 'smartphone'
  | 'notebook' | 'truck' | 'navigation' | 'edit' | 'close' | 'grid'
  | 'shield' | 'list' | 'alert';

export const categoryIconForName = (name: string): AppIconName => {
  const label = name.toLocaleLowerCase();
  if (/مطعم|وجبات|طعام|مأكولات|مخبز|قهوة|مشروبات/.test(label)) return 'soup';
  if (/بقال|سوبر|تموين|خضار|فواكه|تسوق|مستلزمات/.test(label)) return 'shopping-bag';
  if (/صيدل|طبي|دواء|صحة/.test(label)) return 'shield';
  if (/ملابس|أزياء|أحذية|موضة/.test(label)) return 'shirt';
  if (/إلكترون|الكترون|جوال|هاتف|تقنية/.test(label)) return 'smartphone';
  return 'store';
};

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  accessibilityLabel?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = '#53615A',
  strokeWidth = 1.8,
  accessibilityLabel,
}) => {
  const stroke = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const glyph = (() => {
    switch (name) {
      case 'home':
        return <><Path d="m3 10 9-7 9 7" {...stroke} /><Path d="M5 9v11h14V9M9 20v-7h6v7" {...stroke} /></>;
      case 'package':
        return <><Path d="m12 3 9 5-9 5-9-5 9-5Z" {...stroke} /><Path d="m3 8 9 5 9-5M12 13v8M7 5.8l9 5" {...stroke} /></>;
      case 'user':
        return <><Circle cx="12" cy="8" r="4" {...stroke} /><Path d="M4 21a8 8 0 0 1 16 0" {...stroke} /></>;
      case 'search':
        return <><Circle cx="10.8" cy="10.8" r="6.8" {...stroke} /><Path d="m16 16 5 5" {...stroke} /></>;
      case 'bell':
        return <><Path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" {...stroke} /></>;
      case 'map-pin':
        return <><Path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" {...stroke} /><Circle cx="12" cy="10" r="2.5" {...stroke} /></>;
      case 'chevron-down': return <Path d="m6 9 6 6 6-6" {...stroke} />;
      case 'chevron-left': return <Path d="m15 18-6-6 6-6" {...stroke} />;
      case 'chevron-right': return <Path d="m9 18 6-6-6-6" {...stroke} />;
      case 'arrow-left': return <><Path d="M19 12H5" {...stroke} /><Path d="m12 19-7-7 7-7" {...stroke} /></>;
      case 'arrow-right': return <><Path d="M5 12h14" {...stroke} /><Path d="m12 5 7 7-7 7" {...stroke} /></>;
      case 'store':
        return <><Path d="M4 10v10h16V10M3 10l2-6h14l2 6" {...stroke} /><Path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" {...stroke} /></>;
      case 'shopping-bag':
        return <><Path d="M5 8h14l1 13H4L5 8Z" {...stroke} /><Path d="M9 8a3 3 0 0 1 6 0" {...stroke} /></>;
      case 'shopping-cart':
        return <><Path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.9-1.4L22 8H6" {...stroke} /><Circle cx="10" cy="20" r="1" {...stroke} /><Circle cx="18" cy="20" r="1" {...stroke} /></>;
      case 'trash':
        return <><Path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" {...stroke} /></>;
      case 'plus': return <><Path d="M12 5v14M5 12h14" {...stroke} /></>;
      case 'minus': return <Path d="M5 12h14" {...stroke} />;
      case 'refresh':
        return <><Path d="M20 7v5h-5M4 17v-5h5" {...stroke} /><Path d="M5.5 9A7 7 0 0 1 17 6l3 6M4 12l3 6a7 7 0 0 0 11.5-3" {...stroke} /></>;
      case 'check': return <Path d="m5 12 4 4L19 6" {...stroke} />;
      case 'check-circle':
        return <><Circle cx="12" cy="12" r="9" {...stroke} /><Path d="m8 12 2.5 2.5L16.5 9" {...stroke} /></>;
      case 'info':
        return <><Circle cx="12" cy="12" r="9" {...stroke} /><Path d="M12 11v5M12 8h.01" {...stroke} /></>;
      case 'map':
        return <><Path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" {...stroke} /><Path d="M9 3v15M15 6v15" {...stroke} /></>;
      case 'house':
        return <><Path d="m3 10 9-7 9 7v10H3V10Z" {...stroke} /><Path d="M9 20v-7h6v7" {...stroke} /></>;
      case 'building':
        return <><Rect x="5" y="3" width="14" height="18" rx="2" {...stroke} /><Path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-5h4v5" {...stroke} /></>;
      case 'sun':
        return <><Circle cx="12" cy="12" r="4" {...stroke} /><Path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" {...stroke} /></>;
      case 'moon': return <Path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" {...stroke} />;
      case 'settings':
        return <><Circle cx="12" cy="12" r="3" {...stroke} /><Path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .8v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.8l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.8-3H4a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .8-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.8V2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .8l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .8 3h.2a1.8 1.8 0 1 1 0 3.6H21a1.8 1.8 0 0 0-1.6 2.9Z" {...stroke} /></>;
      case 'logout':
        return <><Path d="M10 17l5-5-5-5M15 12H3" {...stroke} /><Path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" {...stroke} /></>;
      case 'phone':
        return <><Path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" {...stroke} /><Path d="M9 17h6" {...stroke} /></>;
      case 'smartphone':
        return <><Rect x="6" y="2" width="12" height="20" rx="2" {...stroke} /><Path d="M11 18h2" {...stroke} /></>;
      case 'bike':
        return <><Circle cx="6" cy="17" r="3" {...stroke} /><Circle cx="18" cy="17" r="3" {...stroke} /><Path d="m6 17 4-7 4 7H6ZM14 10h3M10 8h2" {...stroke} /></>;
      case 'star': return <Path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" {...stroke} />;
      case 'clock':
        return <><Circle cx="12" cy="12" r="9" {...stroke} /><Path d="M12 7v5l3 2" {...stroke} /></>;
      case 'gift':
        return <><Rect x="3" y="8" width="18" height="4" rx="1" {...stroke} /><Path d="M5 12v9h14v-9M12 8v13M12 8H8a2 2 0 1 1 2-2c0 1 2 2 2 2Zm0 0h4a2 2 0 1 0-2-2c0 1-2 2-2 2Z" {...stroke} /></>;
      case 'credit-card':
        return <><Rect x="3" y="5" width="18" height="14" rx="2" {...stroke} /><Path d="M3 10h18M7 15h3" {...stroke} /></>;
      case 'cash':
        return <><Rect x="2" y="6" width="20" height="12" rx="2" {...stroke} /><Circle cx="12" cy="12" r="3" {...stroke} /><Path d="M6 10a2 2 0 0 1-2 2m14 2a2 2 0 0 1 2-2" {...stroke} /></>;
      case 'bank':
        return <><Path d="m3 9 9-6 9 6M4 10h16M5 10v8m5-8v8m4-8v8m5-8v8M3 21h18M2 18h20" {...stroke} /></>;
      case 'tag':
        return <><Path d="m20 13-7 7L3 10V3h7l10 10Z" {...stroke} /><Circle cx="7.5" cy="7.5" r="1" {...stroke} /></>;
      case 'filter':
        return <><Path d="M4 6h16M7 12h10m-7 6h4" {...stroke} /><Circle cx="9" cy="6" r="1.5" {...stroke} /><Circle cx="14" cy="12" r="1.5" {...stroke} /><Circle cx="11" cy="18" r="1.5" {...stroke} /></>;
      case 'sparkles':
        return <><Path d="m12 3 1.2 5.8L19 11l-5.8 1.2L12 18l-1.2-5.8L5 11l5.8-2.2L12 3Z" {...stroke} /><Path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15ZM5 3l.5 2L7.5 5.5l-2 .5L5 8l-.5-2-2-.5 2-.5L5 3Z" {...stroke} /></>;
      case 'message':
        return <><Path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" {...stroke} /></>;
      case 'eye':
        return <><Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" {...stroke} /><Circle cx="12" cy="12" r="3" {...stroke} /></>;
      case 'eye-off':
        return <><Path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" {...stroke} /><Path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.8 15.8 0 0 1-3 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3.1-.5" {...stroke} /></>;
      case 'lock':
        return <><Rect x="4" y="10" width="16" height="11" rx="2" {...stroke} /><Path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" {...stroke} /></>;
      case 'shirt':
        return <Path d="m8 4 4 2 4-2 5 3-2 4-3-1v11H8V10l-3 1-2-4 5-3Z" {...stroke} />;
      case 'soup':
        return <><Path d="M3 12h18M5 12a7 7 0 0 0 14 0M7 19h10M8 5c-1 1 1 2 0 3m4-4c-1 1 1 2 0 3m4-2c-1 1 1 2 0 3" {...stroke} /></>;
      case 'notebook':
        return <><Path d="M6 3h14v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM3 7h3m-3 5h3m-3 5h3M10 8h6m-6 4h6" {...stroke} /></>;
      case 'truck':
        return <><Path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" {...stroke} /><Circle cx="7" cy="19" r="2" {...stroke} /><Circle cx="18" cy="19" r="2" {...stroke} /></>;
      case 'navigation':
        return <Path d="m12 22 7-19-7 4-7-4 7 19Z" {...stroke} />;
      case 'edit':
        return <><Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" {...stroke} /></>;
      case 'close': return <><Path d="m18 6-12 12M6 6l12 12" {...stroke} /></>;
      case 'grid':
        return <><Rect x="3" y="3" width="8" height="8" rx="1.5" {...stroke} /><Rect x="13" y="3" width="8" height="8" rx="1.5" {...stroke} /><Rect x="3" y="13" width="8" height="8" rx="1.5" {...stroke} /><Rect x="13" y="13" width="8" height="8" rx="1.5" {...stroke} /></>;
      case 'shield':
        return <><Path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" {...stroke} /><Path d="m9 12 2 2 4-4" {...stroke} /></>;
      case 'list':
        return <><Path d="M9 6h12M9 12h12M9 18h12" {...stroke} /><Path d="M4 6h.01M4 12h.01M4 18h.01" {...stroke} /></>;
      case 'alert':
        return <><Path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" {...stroke} /><Path d="M12 9v4m0 4h.01" {...stroke} /></>;
      default:
        return <><Rect x="4" y="4" width="7" height="7" rx="1" {...stroke} /><Rect x="13" y="4" width="7" height="7" rx="1" {...stroke} /><Rect x="4" y="13" width="7" height="7" rx="1" {...stroke} /><Rect x="13" y="13" width="7" height="7" rx="1" {...stroke} /></>;
    }
  })();

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      {...(Platform.OS === 'web'
        ? {}
        : {
            accessible: Boolean(accessibilityLabel),
            accessibilityElementsHidden: !accessibilityLabel,
            importantForAccessibility: accessibilityLabel ? 'auto' : 'no-hide-descendants',
          })}
    >
      {glyph}
    </Svg>
  );
};
