import React from 'react';
import { Image, ImageProps, View, StyleSheet } from 'react-native';
import { accessibilityConfigs, AccessibilityConfig } from '@/hooks/useAccessibility';

interface AccessibleImageProps extends ImageProps {
  gameName?: string;
  accessibilityConfig?: AccessibilityConfig;
  fallbackText?: string;
}

export const AccessibleImage: React.FC<AccessibleImageProps> = ({
  gameName,
  accessibilityConfig,
  fallbackText = 'Game image',
  ...props
}) => {
  const config = accessibilityConfig || accessibilityConfigs.gameImage(
    gameName || fallbackText
  );

  return (
    <View style={styles.container}>
      <Image
        style={[styles.image, props.style]}
        accessibilityLabel={config.label}
        accessibilityRole={config.role}
        accessibilityHint={config.hint}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles if needed
  },
  image: {
    // Default image styles
  },
});
