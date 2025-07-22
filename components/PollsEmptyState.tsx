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
        Create a poll to help your group decide what board game to play!{"\n"}
        Here's how:
      </Text>
      <View style={styles.stepsContainer}>
        <Text style={styles.step}><Text style={styles.stepNumber}>1.</Text> Start Your Poll - Click <Text style={styles.highlight}>"Create Poll"</Text> to begin.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>2.</Text> Add Details (Optional) - Enter a title and description for your poll.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>3.</Text> Find Games - Filter or search your collection or browse BoardGameGeek's database.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>4.</Text> Select Games - Click on games to add them as voting options.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>5.</Text> Create Poll - Click <Text style={styles.highlight}>"Create Poll"</Text> when you're finished adding games.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>6.</Text> Share & Vote - Send the link to your group or vote in-person on one device.</Text>
        <Text style={styles.step}><Text style={styles.stepNumber}>7.</Text> View Results - Check results from the Poll Homepage or Voting Screen.</Text>
      </View>
      <Text style={[styles.subtitle, { fontSize: 13, color: '#888', marginBottom: 16 }]}>Note: Registered users can change their votes anytime; anonymous voters can revote until they close their browser.</Text>
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