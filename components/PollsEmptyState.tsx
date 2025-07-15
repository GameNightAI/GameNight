import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';

interface PollsEmptyStateProps {
  onCreate: () => void;
}

export const PollsEmptyState: React.FC<PollsEmptyStateProps> = ({ onCreate }) => {
  return (
    <View style={styles.container}>
      <Plus size={48} color="#ff9654" style={styles.icon} />
      <Text style={styles.title}>No Polls Yet</Text>
      <Text style={styles.subtitle}>
        Create a poll to help your group decide what to play! Here’s how:
      </Text>
      <View style={styles.stepsContainer}>
        <Text style={styles.step}><Text style={styles.stepNumber}>1.</Text> Tap <Text style={styles.highlight}>"Create Poll"</Text> above.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>2.</Text> Enter a title and description.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>3.</Text> Add games from your collection.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>4.</Text> Share the poll link with friends.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>5.</Text> Watch the votes come in!</Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={onCreate}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Create Poll</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepsContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  step: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
  },
  stepNumber: {
    color: '#ff9654',
    fontWeight: 'bold',
  },
  highlight: {
    color: '#ff9654',
    fontWeight: 'bold',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
}); 