import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, BarChart, Search, CheckSquare, Share2 } from 'lucide-react-native';

interface PollsEmptyStateProps {
  onCreate: () => void;
}

export const PollsEmptyState: React.FC<PollsEmptyStateProps> = ({ onCreate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <BarChart size={48} color="#ff9654" style={styles.icon} />
      </View>
      <Text style={styles.title}>No Polls Yet</Text>
      <Text style={styles.subtitle}>
        Create a poll to help your group decide what board game to play!
      </Text>

      <View style={styles.stepsContainer}>
        <View style={styles.stepRow}>
          <Search size={20} color="#ff9654" style={styles.stepIcon} />
          <Text style={styles.stepText}>Filter – View your collection or find something new </Text>
        </View>
        <View style={styles.stepRow}>
          <CheckSquare size={20} color="#ff9654" style={styles.stepIcon} />
          <Text style={styles.stepText}>Select – Add games to your poll</Text>
        </View>
        <View style={styles.stepRow}>
          <Share2 size={20} color="#ff9654" style={styles.stepIcon} />
          <Text style={styles.stepText}>Share – Send the poll via link or vote together on one device!</Text>
        </View>
      </View>

      <Text style={styles.note}>
        Note: Registered users can change their votes anytime. Anonymous voters can revote until they close their browser.
      </Text>

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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#fff5ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 14,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
    lineHeight: 24,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    maxWidth: 300,
  },
  stepIcon: {
    marginRight: 12,
  },
  stepText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#444',
    flex: 1,
  },
  note: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#8d8d8d',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
    marginTop: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
}); 