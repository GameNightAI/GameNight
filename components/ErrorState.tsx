import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CircleAlert as AlertCircle, RefreshCw } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={styles.container}
    >
      <AlertCircle size={48} color="#e74c3c" />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <RefreshCw size={18} color="#ffffff" />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
      
      <Text style={styles.helpText}>
        Make sure your BGG username is correct and your collection is public.
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 20,
  },
  errorTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginTop: 20,
    marginBottom: 8,
  },
  errorMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  retryText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft:
    8,
  },
  helpText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#8d8d8d',
    textAlign: 'center',
    maxWidth: 280,
  },
});