// components/VoterNameInput.tsx
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useMemo, useEffect } from 'react';

interface VoterNameInputProps {
  value: string;
  onChange: (text: string) => void;
  hasError: boolean;
}

export function VoterNameInput({ value, onChange, hasError }: VoterNameInputProps) {
  const { colors, typography } = useTheme();
  const { announceForAccessibility } = useAccessibility();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  // Announce validation errors
  useEffect(() => {
    if (hasError) {
      announceForAccessibility('Please enter your name to vote');
    }
  }, [hasError, announceForAccessibility]);

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Enter your name"
        style={[styles.input, hasError && styles.errorInput]}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        accessibilityLabel="Enter your name for voting"
        accessibilityHint="Required field to participate in voting"
      />
      {hasError && <Text style={styles.errorText}>Name is required</Text>}
    </View>
  );
}

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.fontSize.callout,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.text,
    backgroundColor: colors.card,
    minHeight: 44, // HIG minimum touch target
  },
  errorInput: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    marginTop: 4,
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('normal'),
  },
});