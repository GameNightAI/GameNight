import React from 'react';
import { TextInput, TextInputProps, Text, View, StyleSheet } from 'react-native';
import { accessibilityConfigs, AccessibilityConfig } from '@/hooks/useAccessibility';

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
  const config = accessibilityConfig || accessibilityConfigs.textInput(
    label,
    props.placeholder
  );

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
        accessibilityRole={config.role}
        accessibilityState={config.state}
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a2b5f',
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
});
