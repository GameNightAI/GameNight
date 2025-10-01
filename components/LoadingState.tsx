import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';

export const LoadingState: React.FC = () => {
  const { colors, typography } = useTheme();
  const { isReduceMotionEnabled, announceForAccessibility } = useAccessibility();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  useEffect(() => {
    announceForAccessibility('Loading your collection and polls');
  }, [announceForAccessibility]);

  return (
    <Animated.View
      entering={isReduceMotionEnabled ? undefined : FadeIn.duration(300)}
      style={styles.container}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.loadingText}>Loading your collection and polls...</Text>
      <Text style={styles.subText}>
        This may take a moment as we connect to BoardGameGeek
      </Text>
    </Animated.View>
  );
};

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.headline,
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  subText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.callout,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
});