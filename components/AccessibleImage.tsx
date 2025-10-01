import React, { useMemo } from 'react';
import { Image, ImageProps, View, StyleSheet } from 'react-native';
import { accessibilityConfigs, AccessibilityConfig } from '@/hooks/useAccessibility';
import { useTheme } from '@/hooks/useTheme';

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
  const { colors, typography } = useTheme();
  const config = accessibilityConfig || accessibilityConfigs.gameImage(
    gameName || fallbackText
  );

  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

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

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  container: {
    // Container styles if needed
  },
  image: {
    // Default image styles
  },
});
