import { Platform } from 'react-native';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';

export const useTheme = () => {
  const { colorScheme, fontScale, getScaledFontSize } = useAccessibilityContext();

  const isDark = colorScheme === 'dark';

  // GameNyte color palette
  const colors = {
    primary: isDark ? '#3b82f6' : '#1a2b5f',
    accent: '#ff9654',
    background: isDark ? '#0f172a' : '#f7f9fc',
    card: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#f1f5f9' : '#1a2b5f',
    textMuted: isDark ? '#94a3b8' : '#666666',
    border: isDark ? '#334155' : '#e1e5ea',
    success: isDark ? '#22c55e' : '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    tints: {
      // Subtle translucent backgrounds derived from brand colors
      accent: isDark ? 'rgba(255,150,84,0.18)' : 'rgba(255,150,84,0.12)',
      primary: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(26,43,95,0.10)',
      success: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)',
      error: isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.10)',
      neutral: isDark ? 'rgba(75,85,99,0.22)' : 'rgba(26,43,95,0.18)',
      warningBg: isDark ? 'rgba(255,243,205,0.15)' : '#fffbe6',
      warningBorder: isDark ? 'rgba(255,229,143,0.25)' : '#ffe58f',
    },
  };

  // Helper function to get the correct font family based on weight
  const getFontFamily = (weight: string) => {
    switch (weight) {
      case '400':
      case 'normal':
        return 'Poppins-Regular';
      case '600':
      case 'semibold':
        return 'Poppins-SemiBold';
      case '700':
      case 'bold':
        return 'Poppins-Bold';
      default:
        return 'Poppins-Regular';
    }
  };

  // Typography system
  const typography = {
    fontFamily: {
      primary: 'Poppins-Regular', // Base font name
      mono: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    },
    getFontFamily, // Export the helper function
    fontSize: {
      // HIG-compliant font sizes
      caption2: getScaledFontSize(11),  // Smallest
      caption1: getScaledFontSize(12),  // Small
      footnote: getScaledFontSize(13),  // Footnote
      subheadline: getScaledFontSize(15), // Subheadline
      callout: getScaledFontSize(16),   // Callout
      body: getScaledFontSize(17),      // Body
      headline: getScaledFontSize(17),  // Headline
      title3: getScaledFontSize(20),    // Title 3
      title2: getScaledFontSize(22),    // Title 2
      title1: getScaledFontSize(28),    // Title 1 (largest)

      // Legacy sizes for backward compatibility
      xs: getScaledFontSize(12),
      sm: getScaledFontSize(14),
      base: getScaledFontSize(16),
      lg: getScaledFontSize(18),
      xl: getScaledFontSize(20),
      '2xl': getScaledFontSize(24),
      '3xl': getScaledFontSize(28),     // Updated to HIG title1
      '4xl': getScaledFontSize(36),
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
    letterSpacing: {
      tight: -0.025,
      normal: 0,
      wide: 0.025,
    },
  };

  // Touch target constants for HIG compliance
  const touchTargets = {
    // Standard 44pt minimum touch targets
    standard: { top: 0, right: 0, bottom: 0, left: 0 }, // For 44x44 buttons
    vote: { top: 4, right: 4, bottom: 4, left: 4 }, // For 40x40 buttons
    sizeTwenty: { top: 12, right: 12, bottom: 12, left: 12 }, // For 20x20 buttons
    small: { top: 16, right: 16, bottom: 16, left: 16 }, // For 32x32 buttons
    tiny: { top: 20, right: 20, bottom: 20, left: 20 }, // For 24x24 buttons
    // Helper function to calculate hitSlop for any size
    getHitSlop: (visualSize: number) => {
      const extension = Math.max(0, (44 - visualSize) / 2);
      return {
        top: extension,
        right: extension,
        bottom: extension,
        left: extension
      };
    },
  };

  return {
    isDark,
    colors,
    typography,
    touchTargets,
    fontScale,
    getScaledFontSize,
  };
};
