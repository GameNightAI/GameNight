import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export const LoadingState: React.FC = () => {
  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={styles.container}
    >
      <ActivityIndicator size="large" color="#ff9654" />
      <Text style={styles.loadingText}>Loading your collection and polls...</Text>
      <Text style={styles.subText}>
        This may take a moment as we connect to BoardGameGeek
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
  loadingText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginTop: 20,
    marginBottom: 8,
  },
  subText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    maxWidth: 300,
  },
});