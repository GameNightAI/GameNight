import React, { useMemo } from 'react';
import { TextInput, TextInputProps, Text, View, StyleSheet } from 'react-native';
import { accessibilityConfigs, AccessibilityConfig } from '@/hooks/useAccessibility';
import { useTheme } from '@/hooks/useTheme';

interface AccessibleTextInputProps extends TextInputProps {
  label: string;
  accessibilityConfig?: AccessibilityConfig;
  error?: string;
  required?: boolean;
}

export const AccessibleTextInput: React.FC<AccessibleTextInputProps> = ({
  label,
  accessibilityConfig,
  error,
  required = false,
  ...props
}) => {
  const { colors, typography } = useTheme();
  const config = accessibilityConfig || accessibilityConfigs.textInput(
    label,
    props.placeholder
  );

  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        accessibilityLabel={config.label}
        accessibilityHint={config.hint}
        {...props}
      />
      {error && (
        <Text style={styles.errorText} accessibilityRole="text">
          {error}
        </Text>
      )}
    </View>
  );
};

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: typography.fontSize.body,
    fontFamily: typography.getFontFamily('semibold'),
    marginBottom: 8,
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.fontSize.body,
    fontFamily: typography.getFontFamily('normal'),
    backgroundColor: colors.card,
    color: colors.text,
    minHeight: 44, // HIG touch target requirement
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.caption1,
    fontFamily: typography.getFontFamily('normal'),
    marginTop: 4,
  },
});
