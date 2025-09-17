import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, StyleSheet } from 'react-native';
import { accessibilityConfigs, AccessibilityConfig } from '@/hooks/useAccessibility';

interface AccessibleButtonProps extends TouchableOpacityProps {
  accessibilityConfig: AccessibilityConfig;
  children: React.ReactNode;
  style?: any;
  textStyle?: any;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  accessibilityConfig,
  children,
  style,
  textStyle,
  ...props
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      accessibilityLabel={accessibilityConfig.label}
      accessibilityHint={accessibilityConfig.hint}
      accessibilityRole={accessibilityConfig.role}
      accessibilityState={accessibilityConfig.state}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    // Default button styles
  },
  text: {
    // Default text styles
  },
});
