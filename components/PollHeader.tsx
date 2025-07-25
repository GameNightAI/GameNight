// components/PollHeader.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Poll } from '@/types/poll';

interface PollHeaderProps {
  poll: Poll;
  isCreator: boolean;
}

export function PollHeader({ poll, isCreator }: PollHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{poll.title}</Text>

      {poll.description ? (
        <Text style={styles.description}>{poll.description}</Text>
      ) : null}

      <Text style={styles.subtitle}>
        {isCreator
          ? 'View results below'
          : 'Vote for as many games as you like or none at all'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: '#1a2b5f',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
});
