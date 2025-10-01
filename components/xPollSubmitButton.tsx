//not in use, can be activated later if we want to unify the submit button function
// poll/components/SubmitButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMemo } from 'react';

interface Props {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  style?: ViewStyle;
}

export const SubmitButton = ({
  onPress,
  disabled = false,
  loading = false,
  label = 'Submit',
  style,
}: Props) => {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, style, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={disabled ? "Button is disabled" : "Tap to submit"}
    >
      {loading ? (
        <ActivityIndicator color={colors.card} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.card,
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.body,
  },
});