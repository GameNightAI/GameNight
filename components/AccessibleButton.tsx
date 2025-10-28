import React, { useMemo } from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, StyleSheet, Platform } from 'react-native';
import { accessibilityConfigs, AccessibilityConfig, useAccessibility } from '@/hooks/useAccessibility';
import { getAccessibleTouchTarget, getPlatformAccessibilityProps } from '@/utils/accessibilityHelpers';
import { useTheme } from '@/hooks/useTheme';

interface AccessibleButtonProps extends TouchableOpacityProps {
  accessibilityConfig: AccessibilityConfig;
  children: React.ReactNode;
  style?: any;
  textStyle?: any;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  accessibilityConfig,
  children,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  ...props
}) => {
  const { colors, typography } = useTheme();
  const {
    getAccessibilityStyles,
    getAccessibleTouchTarget,
    isReduceMotionEnabled,
    getReducedMotionStyle
  } = useAccessibility();

  // Calculate touch target size
  const baseSize = size === 'small' ? 32 : size === 'large' ? 56 : 44;
  const touchTargetSize = getAccessibleTouchTarget(baseSize);

  // Get variant styles with theme colors
  const variantStyles = useMemo(() => getVariantStyles(variant, colors), [variant, colors]);
  const sizeStyles = useMemo(() => getSizeStyles(size, typography), [size, typography]);
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  // Apply accessibility styles (font scaling, bold text, etc.)
  const accessibleStyles = getAccessibilityStyles({
    ...variantStyles,
    ...sizeStyles,
    ...(fullWidth && { width: '100%' }),
  });

  // Apply touch targets directly (not handled by getAccessibilityStyles)
  const touchTargetStyles = {
    minHeight: touchTargetSize,
    minWidth: touchTargetSize,
  };

  // Apply reduced motion if enabled
  const finalStyles = getReducedMotionStyle(
    accessibleStyles,
    { ...accessibleStyles, transform: [] }
  );

  // Platform-specific accessibility props
  const platformProps = getPlatformAccessibilityProps({
    accessibilityLabel: accessibilityConfig.label,
    accessibilityHint: accessibilityConfig.hint,
    accessibilityRole: accessibilityConfig.role,
    accessibilityState: accessibilityConfig.state,
    accessibilityValue: accessibilityConfig.value,
    accessibilityActions: accessibilityConfig.actions,
  });

  return (
    <TouchableOpacity
      style={[finalStyles, touchTargetStyles, styles.button, style]}
      activeOpacity={0.7}
      {...platformProps}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, variantStyles.text, sizeStyles.text, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

// Variant styles with theme colors
const getVariantStyles = (variant: string, colors: any) => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
        text: { color: colors.card },
      };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        borderColor: colors.accent,
        borderWidth: 1,
        text: { color: colors.accent },
      };
    case 'destructive':
      return {
        backgroundColor: colors.error,
        borderColor: colors.error,
        text: { color: colors.card },
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        text: { color: colors.textMuted },
      };
    default:
      return {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
        text: { color: colors.card },
      };
  }
};

// Size styles with theme typography
const getSizeStyles = (size: string, typography: any) => {
  switch (size) {
    case 'small':
      return {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        text: {
          fontSize: typography.fontSize.caption1,
          fontFamily: typography.getFontFamily('semibold')
        },
      };
    case 'large':
      return {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 12,
        text: {
          fontSize: typography.fontSize.title3,
          fontFamily: typography.getFontFamily('semibold')
        },
      };
    default: // medium
      return {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        text: {
          fontSize: typography.fontSize.body,
          fontFamily: typography.getFontFamily('semibold')
        },
      };
  }
};

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    // minHeight and minWidth are handled by accessibility system
  },
  text: {
    textAlign: 'center',
    // fontFamily is handled by sizeStyles
  },
});
