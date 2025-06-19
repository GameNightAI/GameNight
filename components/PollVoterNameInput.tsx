// components/VoterNameInput.tsx
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

interface VoterNameInputProps {
  value: string;
  onChange: (text: string) => void;
  hasError: boolean;
}

export function VoterNameInput({ value, onChange, hasError }: VoterNameInputProps) {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Enter your name"
        style={[styles.input, hasError && styles.errorInput]}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
      />
      {hasError && <Text style={styles.errorText}>Name is required</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorInput: {
    borderColor: '#d9534f', // red border for error
  },
  errorText: {
    color: '#d9534f',
    marginTop: 4,
    fontSize: 14,
  },
});